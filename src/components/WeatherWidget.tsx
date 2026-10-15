import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudFog,
  CloudLightning,
  Droplets,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  isLoading,
  onRefresh
}) => {
  if (!weather) {
    return (
      <div className="flex h-auto w-fit shrink-0 items-center self-stretch gap-2 rounded-2xl border border-zinc-800 bg-[#141417] px-3.5 shadow-sm">
        <RefreshCw className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
        <span className="text-xs text-zinc-400 font-mono">METEO CONNECTING...</span>
      </div>
    );
  }

  // 灰阶风格气象图标 (高亮纯白 / 银灰质感)
  const renderIcon = (code: string) => {
    const n = Number(String(code).replace(/^[dDnN]/, '')) || 0;
    if (n === 0) return <Sun className="w-6 h-6 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" />;
    if (n === 1) return <CloudSun className="w-6 h-6 text-zinc-200" />;
    if (n === 4 || n === 5) return <CloudLightning className="w-6 h-6 text-white" />;
    if ((n >= 6 && n <= 12) || (n >= 19 && n <= 25)) return <CloudRain className="w-6 h-6 text-zinc-100" />;
    if ((n >= 13 && n <= 17) || (n >= 26 && n <= 28)) return <CloudSnow className="w-6 h-6 text-white" />;
    if (n === 18 || n === 53 || n >= 29) return <CloudFog className="w-6 h-6 text-zinc-400" />;
    if (n === 2) return <Cloud className="w-6 h-6 text-zinc-300" />;
    if (n === 3) return <CloudRain className="w-6 h-6 text-zinc-100" />;
    return <CloudSun className="w-6 h-6 text-zinc-200" />;
  };

  const tempText = Number.isFinite(weather.temperature)
    ? String(Math.round(weather.temperature))
    : '--';

  return (
    <div className="flex h-auto w-fit shrink-0 items-stretch gap-3 self-stretch rounded-2xl border border-zinc-800 bg-[#141417] px-3.5 py-2.5 shadow-sm select-none">
      <div className="flex flex-col items-center justify-between self-stretch">
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900 p-1.5 text-white">
          {renderIcon(weather.weatherCode)}
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="刷新气象数据"
          className="rounded-lg p-1 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-white' : ''}`} />
        </button>
      </div>

      <div className="flex min-w-[8.5rem] flex-col justify-between self-stretch">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-light tracking-tight text-white">
            {tempText}°
          </span>
          <span className="text-sm font-medium text-zinc-200">
            {weather.weatherDescription}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-200">
          <span>
            {weather.cityName}
            {weather.todaySummary ? ` · ${weather.todaySummary}` : ''}
          </span>
          {weather.alarm && (
            <span className="text-zinc-300">{weather.alarm}</span>
          )}
          {weather.isCached && (
            <span className="inline-flex items-center rounded border border-zinc-800 bg-zinc-900 px-1 font-mono text-[10px] text-zinc-400">
              <HardDrive className="mr-0.5 h-2.5 w-2.5" />
              缓存
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
          <span>高 {Math.round(weather.tempMax)}°</span>
          <span>低 {Math.round(weather.tempMin)}°</span>
          <span className="inline-flex items-center text-zinc-300">
            <Droplets className="mr-0.5 h-3 w-3 text-zinc-500" />
            {weather.humidity}%
          </span>
        </div>
      </div>
    </div>
  );
};
