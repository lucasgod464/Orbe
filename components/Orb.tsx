import React from 'react';
import { AppState } from '../types';

interface OrbProps {
  state: AppState;
  onClick: () => void;
}

const getStateStyles = (state: AppState) => {
  switch (state) {
    case AppState.CONNECTING:
      return {
        glow: 'bg-cyan-400/20 blur-3xl',
        core: 'bg-cyan-400 animate-pulse',
        ring1: 'border-cyan-400/80 animate-spin-slow',
        ring2: 'border-cyan-400/50',
        text: 'Connecting...',
      };
    case AppState.LISTENING:
      return {
        glow: 'bg-purple-500/20 blur-3xl scale-110',
        core: 'bg-gradient-to-br from-purple-400 to-fuchsia-500',
        ring1: 'border-purple-400/70 animate-pulse-ring',
        ring2: 'border-purple-400/50 animate-pulse-ring-delay',
        text: 'Listening...',
      };
    case AppState.ERROR:
      return {
        glow: 'bg-red-500/30 blur-2xl',
        core: 'bg-red-500 animate-flicker',
        ring1: 'border-red-500/70',
        ring2: 'border-red-500/50',
        text: 'Error',
      };
    case AppState.IDLE:
    default:
      return {
        glow: 'bg-blue-600/20 blur-3xl',
        core: 'bg-gradient-to-br from-cyan-300 to-blue-500',
        ring1: 'border-blue-400/50 animate-pulse',
        ring2: 'border-blue-400/30',
        text: 'Click to Activate',
      };
  }
};

export const Orb: React.FC<OrbProps> = ({ state, onClick }) => {
  const styles = getStateStyles(state);

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <button
        onClick={onClick}
        className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center rounded-full transition-all duration-500 ease-in-out focus:outline-none focus:ring-4 focus:ring-blue-500/50"
        aria-label={styles.text}
        disabled={state === AppState.CONNECTING}
      >
        {/* Glow Effect */}
        <div className={`absolute w-[150%] h-[150%] rounded-full transition-all duration-500 ease-in-out ${styles.glow}`} />
        
        {/* Outer Ring */}
        <div className={`absolute w-[95%] h-[95%] rounded-full border transition-colors duration-500 ${styles.ring2}`} />

        {/* Inner Ring */}
        <div className={`absolute w-[75%] h-[75%] rounded-full border-2 transition-colors duration-500 ${styles.ring1}`} />
        
        {/* Core */}
        <div className={`absolute w-[55%] h-[55%] rounded-full transition-colors duration-500 ${styles.core}`} />
      </button>
      <p className="text-gray-400 text-lg font-medium tracking-wider min-h-[28px]">
        {styles.text}
      </p>
    </div>
  );
};