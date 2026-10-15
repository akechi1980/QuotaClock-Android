import React, { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { AppSettings } from '../types';
import { testServerConnection, ServerProbeResult } from '../services/dashboardService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
}

const REFRESH_OPTIONS = [
  { label: '30秒', value: 0.5 },
  { label: '1分钟', value: 1 },
  { label: '3分钟', value: 3 },
  { label: '5分钟', value: 5 },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings,
}) => {
  const [testing, setTesting] = useState(false);
  const [probe, setProbe] = useState<ServerProbeResult | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setProbe(null);
    try {
      setProbe(await testServerConnection(settings.serverUrl, settings.serverAuthToken));
    } catch {
      setProbe({
        ok: false,
        status: 0,
        latencyMs: 0,
        format: 'unknown',
        message: '连不上',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="font-mono text-sm font-bold text-white">设置</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4 text-xs text-zinc-200">
          <section className="space-y-2">
            <div className="font-medium text-white">进度服务</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.serverUrl}
                onChange={(e) => onUpdateSettings({ serverUrl: e.target.value, serverType: 'progress_service' })}
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:border-zinc-400 focus:outline-none"
              />
              <button
                onClick={handleTest}
                disabled={testing}
                className="shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-white disabled:opacity-50"
              >
                {testing ? '测试中' : '测试'}
              </button>
            </div>
            {probe && (
              <p className={probe.ok ? 'text-white' : 'text-zinc-400'}>
                {probe.ok ? `已连通 ${probe.latencyMs}ms` : '连不上，检查地址'}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">刷新</span>
              <div className="flex gap-1">
                {REFRESH_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => onUpdateSettings({ autoRefreshMinutes: option.value })}
                    className={`rounded-md border px-2 py-1 font-mono ${
                      settings.autoRefreshMinutes === option.value
                        ? 'border-white bg-white text-zinc-950'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between">
              <span>演示数据</span>
              <input
                type="checkbox"
                checked={settings.demoMode}
                onChange={(e) => onUpdateSettings({ demoMode: e.target.checked })}
                className="h-4 w-4 accent-zinc-200"
              />
            </label>
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">亮度</span>
              <span className="font-mono text-white">{settings.brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="120"
              value={settings.brightness}
              onChange={(e) => onUpdateSettings({ brightness: parseInt(e.target.value, 10) })}
              className="h-2 w-full cursor-pointer accent-zinc-200"
            />
            <label className="flex items-center justify-between">
              <span>屏幕常亮</span>
              <input
                type="checkbox"
                checked={settings.keepAwake}
                onChange={(e) => onUpdateSettings({ keepAwake: e.target.checked })}
                className="h-4 w-4 accent-zinc-200"
              />
            </label>
            <label className="flex items-center justify-between text-zinc-300">
              <span>仅充电时常亮</span>
              <input
                type="checkbox"
                checked={settings.keepAwakeChargingOnly}
                onChange={(e) => onUpdateSettings({ keepAwakeChargingOnly: e.target.checked })}
                className="h-4 w-4 accent-zinc-200"
              />
            </label>
          </section>

          <section className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="font-medium text-white">城市编号</div>
            <input
              type="text"
              inputMode="numeric"
              value={settings.cityCode}
              onChange={(e) => onUpdateSettings({ cityCode: e.target.value.replace(/\D/g, '').slice(0, 9) })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:border-zinc-400 focus:outline-none"
            />
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
          <button
            onClick={onResetSettings}
            className="flex items-center gap-1 text-zinc-400 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-white px-4 py-2 font-mono text-xs font-bold text-zinc-950"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
