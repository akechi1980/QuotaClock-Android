import React, { ReactNode } from 'react';
import { Tablet, Maximize2 } from 'lucide-react';

interface TabletFrameProps {
  children: ReactNode;
  showBezel: boolean;
  onToggleBezel: () => void;
  brightness: number;
  nightFilter: boolean;
}

export const TabletFrame: React.FC<TabletFrameProps> = ({
  children,
  showBezel,
  onToggleBezel,
  brightness,
  nightFilter,
}) => {
  // Brightness and night-filter style
  // Safe brightness ensures screen is always adequately lit (clamps between 60% and 125%)
  const effectiveBrightness = Math.max(60, Math.min(125, brightness || 100));
  const filterStyle: React.CSSProperties = {
    filter: `brightness(${effectiveBrightness / 100}) ${nightFilter ? 'sepia(0.12) hue-rotate(-10deg)' : ''}`,
  };

  if (!showBezel) {
    return (
      <div className="w-full h-full min-h-screen bg-[#0d0d10] text-zinc-100 flex flex-col" style={filterStyle}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-2 sm:p-6 select-none overflow-x-hidden">
      {/* Device Info Bar */}
      <div className="w-full max-w-6xl mb-2.5 flex items-center justify-between px-3 text-xs font-mono text-zinc-400">
        <div className="flex items-center space-x-2">
          <Tablet className="w-3.5 h-3.5 text-zinc-300" />
          <span className="font-medium text-zinc-100">Amazon Fire HD 8 (2017) 硬件边框模拟</span>
          <span className="text-[11px] text-zinc-500 hidden md:inline">1280×800 (16:10) · MT8163 · 1.5GB RAM · Fire OS 5.7.1.0</span>
        </div>

        <button
          onClick={onToggleBezel}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white transition-all cursor-pointer text-xs font-mono"
        >
          <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>全屏平铺模式</span>
        </button>
      </div>

      {/* Physical Bezel of Fire HD 8 (2017) - Pure Grayscale Casing */}
      <div className="relative w-full max-w-6xl bg-gradient-to-b from-[#1c1c20] to-[#111114] p-3 sm:p-5 rounded-[2rem] border-4 border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] transition-all">
        {/* Front Camera Dot */}
        <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-2 h-2 rounded-full bg-zinc-950 border border-zinc-800 hidden sm:block shadow-inner" />
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-800 shadow-inner flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-zinc-600" />
        </div>

        {/* Screen Area (16:10 Aspect Ratio) */}
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-[#0d0d10] border border-zinc-800 shadow-2xl"
          style={filterStyle}
        >
          {children}
        </div>

        {/* Bottom Amazon Logo subtle imprint */}
        <div className="text-center mt-2">
          <span className="text-[10px] tracking-widest text-zinc-500 font-mono font-medium uppercase select-none opacity-80">
            amazon fire hd 8 · desk telemetry
          </span>
        </div>
      </div>
    </div>
  );
};
