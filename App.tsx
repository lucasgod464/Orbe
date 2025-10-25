import React, { useState, useRef, useCallback } from 'react';
import { AppState, TranscriptionEntry } from './types';
// Fix: The `LiveSession` type is not exported from `@google/genai`. Import the local interface instead.
import type { LiveSession } from './services/geminiService';
import { Orb } from './components/Orb';
import { Transcription } from './components/Transcription';
import { connectToGemini, disconnectFromGemini } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transcription, setTranscription] = useState<TranscriptionEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  const handleDisconnect = useCallback(() => {
    disconnectFromGemini(sessionRef.current);
    sessionRef.current = null;
    setAppState(AppState.IDLE);
    setTranscription([]);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
  }, []);

  const handleStart = useCallback(async () => {
    setAppState(AppState.CONNECTING);
    setErrorMessage(null);

    try {
      const session = await connectToGemini({
        onOpen: () => setAppState(AppState.LISTENING),
        onMessage: (message) => {
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
          }

          if (message.serverContent?.turnComplete) {
            const userInput = currentInputTranscriptionRef.current.trim();
            const modelOutput = currentOutputTranscriptionRef.current.trim();
            
            const newEntries: TranscriptionEntry[] = [];
            if (userInput) {
              newEntries.push({ speaker: 'user', text: userInput });
            }
            if (modelOutput) {
              newEntries.push({ speaker: 'model', text: modelOutput });
            }

            if(newEntries.length > 0) {
              setTranscription(prev => [...prev, ...newEntries]);
            }

            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
          }
        },
        onError: (e) => {
          console.error("Gemini session error:", e);
          setErrorMessage("Connection error. Please try again.");
          handleDisconnect();
        },
        onClose: () => {
          console.log("Gemini session closed.");
          handleDisconnect();
        },
      });
      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to start Gemini session:", error);
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      if (message.includes('permission denied')) {
        setErrorMessage("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else {
        setErrorMessage(message);
      }
      setAppState(AppState.ERROR);
    }
  }, [handleDisconnect]);

  const toggleSession = () => {
    if (appState === AppState.IDLE || appState === AppState.ERROR) {
      handleStart();
    } else {
      handleDisconnect();
    }
  };

  return (
    <main className="bg-black text-white w-full h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative font-sans">
      <div className="bg-vortex"></div>
      
      <div className="flex-grow flex items-center justify-center w-full">
        <Orb state={appState} onClick={toggleSession} />
      </div>

      <div className="w-full max-w-4xl h-1/3 flex flex-col justify-end pb-8">
        <Transcription entries={transcription} />
        {errorMessage && (
          <div className="text-center text-red-500 mt-4 text-sm bg-red-900/50 p-2 rounded-md">
            {errorMessage}
          </div>
        )}
      </div>
      
      <footer className="text-gray-500 text-xs text-center py-2 absolute bottom-2 left-1/2 -translate-x-1/2">
        Powered by Gemini
      </footer>
    </main>
  );
};

export default App;
