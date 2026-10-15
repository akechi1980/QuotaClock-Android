import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Server,
  Activity,
  Bot
} from 'lucide-react';
import { AgentStatusType } from '../types';

interface SystemStatusBarProps {
  isServerOnline: boolean;
  isDemoMode: boolean;
  lastSyncTime: string;
  agentStatus: AgentStatusType;
  onCycleAgentStatus: () => void;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  isServerOnline,
  isDemoMode,
  lastSyncTime,
  agentStatus,
  onCycleAgentStatus,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number>(100);
  const [isCharging, setIsCharging] = useState<boolean>(true);

  // Monitor Web Network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Battery status (Battery Status API where supported)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((battery: any) => {
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
        };
        updateBattery();

        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {
        // Fallback default
        setBatteryLevel(95);
        setIsCharging(true);
      });
    }
  }, []);

  const agentLabel = agentStatus === 'listening'
    ? '倾听中'
    : agentStatus === 'thinking'
    ? '推理中'
    : agentStatus === 'responding'
    ? '播报中'
    : '待命';

  return (
    <footer className="w-full bg-[#0e0e11] border-t border-zinc-800 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-zinc-300 select-none shadow-md">
      {/* Left: Device & Network Hardware Indicators (Pure Grayscale) */}
      <div className="flex items-center space-x-4 sm:space-x-5 font-mono">
        {/* Wi-Fi Status */}
        <div className="flex items-center space-x-1.5" title={isOnline ? 'Wi-Fi 局域网正常' : 'Wi-Fi 断开'}>
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-white" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-zinc-600" />
          )}
          <span className="hidden sm:inline text-zinc-200">
            {isOnline ? 'WIFI: ON' : 'WIFI: OFF'}
          </span>
        </div>

        {/* Battery Level */}
        <div className="flex items-center space-x-1.5" title={isCharging ? '外部电源供电 (常亮桌面模式)' : '电池放电中'}>
          {isCharging ? (
            <BatteryCharging className="w-3.5 h-3.5 text-white" />
          ) : (
            <Battery className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span className="text-zinc-200">BAT: {batteryLevel}%</span>
          {isCharging && <span className="text-[10px] text-zinc-400 font-semibold hidden md:inline">(AC)</span>}
        </div>

        {/* Windows PC Service Status */}
        <div className="flex items-center space-x-1.5" title="配额服务端连接状态">
          <Server className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline text-zinc-500">HOST:</span>
          <span className={`font-mono font-bold ${
            isServerOnline
              ? 'text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.4)]'
              : isDemoMode
              ? 'text-zinc-400'
              : 'text-zinc-600'
          }`}>
            {isServerOnline ? 'ONLINE' : isDemoMode ? 'DEMO' : 'OFFLINE'}
          </span>
        </div>

        {/* Sync Time */}
        <div className="hidden lg:flex items-center space-x-1 text-zinc-500">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span>SYNC: <span className="text-zinc-300">{lastSyncTime}</span></span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={onCycleAgentStatus}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-[11px] font-mono text-zinc-300 cursor-pointer"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{agentLabel}</span>
        </button>
      </div>
    </footer>
  );
};
