import React from 'react';
import { AgentStatusType } from '../types';

interface AudioWaveformProps {
  status: AgentStatusType;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ status }) => {
  // Height animations depending on agent status - pure grayscale palette
  const getBarClass = () => {
    switch (status) {
      case 'listening':
        return 'animate-pulse bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]';
      case 'thinking':
        return 'animate-bounce bg-zinc-300';
      case 'responding':
        return 'animate-pulse bg-zinc-100 shadow-[0_0_4px_rgba(255,255,255,0.5)]';
      case 'idle':
      default:
        return 'bg-zinc-700';
    }
  };

  const getBarHeight = (index: number) => {
    switch (status) {
      case 'listening': {
        const heights = [8, 16, 24, 18, 12, 22, 14, 8];
        return `${heights[index % heights.length]}px`;
      }
      case 'thinking': {
        const heights = [6, 12, 18, 22, 18, 12, 8, 6];
        return `${heights[index % heights.length]}px`;
      }
      case 'responding': {
        const heights = [10, 20, 28, 24, 16, 26, 18, 12];
        return `${heights[index % heights.length]}px`;
      }
      case 'idle':
      default:
        return '4px';
    }
  };

  return (
    <div className="flex items-center space-x-1 h-7 px-2">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <span
          key={i}
          className={`w-1 rounded-full transition-all duration-300 ${getBarClass()}`}
          style={{
            height: getBarHeight(i),
            animationDelay: `${i * 100}ms`,
            animationDuration: status === 'listening' ? '700ms' : status === 'thinking' ? '1000ms' : '600ms',
          }}
        />
      ))}
    </div>
  );
};
