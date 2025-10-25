import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
// Fix: The `LiveSession` type is not exported. Remove the import and use a local interface.
import type { Blob } from '@google/genai';

// Fix: Define and export a structural type for LiveSession since it's not exported from @google/genai.
export interface LiveSession {
  close(): void;
  sendRealtimeInput(input: { media: Blob }): void;
}

// --- Audio Helper Functions ---

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] < 0 ? data[i] * 32768 : data[i] * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Gemini Service ---

interface GeminiCallbacks {
  onOpen: () => void;
  onMessage: (message: LiveServerMessage) => void;
  onError: (e: ErrorEvent) => void;
  onClose: () => void;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

let inputAudioContext: AudioContext | null = null;
let outputAudioContext: AudioContext | null = null;
let microphoneStream: MediaStream | null = null;
let scriptProcessor: ScriptProcessorNode | null = null;
let mediaStreamSource: MediaStreamAudioSourceNode | null = null;

let nextStartTime = 0;
const sources = new Set<AudioBufferSourceNode>();

export async function connectToGemini(callbacks: GeminiCallbacks): Promise<LiveSession> {
  const apiKey = (window as any).GEMINI_API_KEY;
  if (!apiKey || apiKey === '%%API_KEY%%') {
    throw new Error("A chave de API do Gemini não foi encontrada. Configure a variável de ambiente API_KEY no seu painel Easypanel.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  if (!outputAudioContext) {
    // Fix: Cast window to any to access webkitAudioContext for older browser compatibility.
    outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
  }

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => {
        setupMicrophone(sessionPromise);
        callbacks.onOpen();
      },
      onmessage: async (message: LiveServerMessage) => {
        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64EncodedAudioString && outputAudioContext) {
          nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
          const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, OUTPUT_SAMPLE_RATE, 1);
          
          const source = outputAudioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(outputAudioContext.destination);
          source.addEventListener('ended', () => {
            sources.delete(source);
          });
          source.start(nextStartTime);
          nextStartTime = nextStartTime + audioBuffer.duration;
          sources.add(source);
        }

        if (message.serverContent?.interrupted) {
          for (const source of sources.values()) {
            source.stop();
          }
          sources.clear();
          nextStartTime = 0;
        }

        callbacks.onMessage(message);
      },
      onerror: callbacks.onError,
      onclose: callbacks.onClose,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      systemInstruction: 'You are a futuristic AI assistant named Orb. Your responses should be helpful, concise, and have a slightly synthesized, yet friendly tone.'
    },
  });

  return sessionPromise;
}


async function setupMicrophone(sessionPromise: Promise<LiveSession>) {
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Fix: Cast window to any to access webkitAudioContext for older browser compatibility.
    inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });

    mediaStreamSource = inputAudioContext.createMediaStreamSource(microphoneStream);
    scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      const pcmBlob = createBlob(inputData);
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    mediaStreamSource.connect(scriptProcessor);
    scriptProcessor.connect(inputAudioContext.destination);
  } catch (err) {
    console.error('Error setting up microphone:', err);
    throw err;
  }
}

export function disconnectFromGemini(session: LiveSession | null) {
  session?.close();
  
  scriptProcessor?.disconnect();
  scriptProcessor = null;

  mediaStreamSource?.disconnect();
  mediaStreamSource = null;

  microphoneStream?.getTracks().forEach(track => track.stop());
  microphoneStream = null;

  inputAudioContext?.close().catch(console.error);
  inputAudioContext = null;

  outputAudioContext?.close().catch(console.error);
  outputAudioContext = null;

  sources.forEach(s => s.stop());
  sources.clear();
  nextStartTime = 0;
}