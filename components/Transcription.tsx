
import React, { useRef, useEffect } from 'react';
import { TranscriptionEntry } from '../types';

interface TranscriptionProps {
  entries: TranscriptionEntry[];
}

const UserIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);

const ModelIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h.5a1.5 1.5 0 010 3H14a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H9a1 1 0 001-1v-.5z" />
    <path d="M10 12.5a1.5 1.5 0 013 0V13a1 1 0 001 1h.5a1.5 1.5 0 010 3H14a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0V17a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H9a1 1 0 001-1v-.5z" />
  </svg>
);

export const Transcription: React.FC<TranscriptionProps> = ({ entries }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500 italic">Conversation will appear here...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 overflow-y-auto pr-4 space-y-4 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_90%,transparent)]">
      {entries.map((entry, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 ${
            entry.speaker === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {entry.speaker === 'model' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
              <ModelIcon />
            </div>
          )}
          <div
            className={`max-w-md md:max-w-lg p-3 rounded-lg text-sm md:text-base ${
              entry.speaker === 'user'
                ? 'bg-blue-500/20 text-blue-100 rounded-br-none'
                : 'bg-gray-800/50 text-gray-300 rounded-bl-none'
            }`}
          >
            <p>{entry.text}</p>
          </div>
          {entry.speaker === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
              <UserIcon />
            </div>
          )}
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
