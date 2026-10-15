/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Sun
} from 'lucide-react';
import { AppSettings, WeatherData, DashboardResponse, AgentStatusType, SubscriptionItem } from './types';
import { ClockWidget } from './components/ClockWidget';
import { WeatherWidget } from './components/WeatherWidget';
import { SubscriptionCard } from './components/SubscriptionCard';
import { XiaozhiLivePanel } from './components/XiaozhiLivePanel';
import { SystemStatusBar } from './components/SystemStatusBar';
import { SettingsModal } from './components/SettingsModal';
import { TabletFrame } from './components/TabletFrame';
import { fetchCityWeather, getCachedWeather } from './services/weatherService';
import {
  fetchRemoteDashboard,
  getCachedDashboard,
  DEMO_SUBSCRIPTIONS,
  DISCONNECTED_SUBSCRIPTIONS
} from './services/dashboardService';

const DEFAULT_SETTINGS: AppSettings = {
  serverUrl: 'http://192.168.0.100:8766/api/progress',
  serverType: 'progress_service',
  autoRefreshMinutes: 3,
  retainCacheOn503: true,
  weatherRefreshMinutes: 30,
  demoMode: false, // Default to attempting live connection with user server
  keepAwake: true,
  keepAwakeChargingOnly: false,
  brightness: 100, // 100% standard high brightness
  nightFilter: false,
  cityName: '苏州',
  cityCode: '101190401',
  showTabletBezel: false,
};

const SETTINGS_STORAGE_KEY = 'aidesk_user_settings';

export default function App() {
  // Load saved settings or defaults with brightness auto-boost protection
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Brightness protection: if brightness was saved low (< 80), boost to 100% so user is never stuck with a dim page
        if (parsed.brightness !== undefined && parsed.brightness < 80) {
          parsed.brightness = 100;
        }
        if (
          parsed.serverUrl === 'http://localhost:8766/progress' ||
          parsed.serverUrl === 'http://192.168.1.100:8766/progress'
        ) {
          parsed.serverUrl = DEFAULT_SETTINGS.serverUrl;
          parsed.serverType = 'progress_service';
        }
        if (!parsed.cityCode) {
          parsed.cityCode = DEFAULT_SETTINGS.cityCode;
          parsed.cityName = DEFAULT_SETTINGS.cityName;
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  });

  // State
  const [weather, setWeather] = useState<WeatherData | null>(() => getCachedWeather(settings.cityCode));
  const [weatherLoading, setWeatherLoading] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(() => getCachedDashboard());
  const [isServerOnline, setIsServerOnline] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('未同步');
  const [agentStatus, setAgentStatus] = useState<AgentStatusType>('idle');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [sttText, setSttText] = useState<string>('');
  const [llmText, setLlmText] = useState<string>('');
  const [mcpAction, setMcpAction] = useState<string | null>(null);
  const turnRef = useRef(0);
  const voiceSession = useRef(false);

  // Save settings on update
  const handleUpdateSettings = useCallback((newPartial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }, []);

  // Web Screen Wake Lock support
  useEffect(() => {
    let wakeLockSentinel: any = null;
    if (settings.keepAwake && 'wakeLock' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).wakeLock?.request('screen').then((lock: any) => {
        wakeLockSentinel = lock;
      }).catch(() => {});
    }
    return () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [settings.keepAwake]);

  // Weather fetcher
  const refreshWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      const w = await fetchCityWeather(settings.cityCode);
      setWeather(w);
    } catch {
      // 失败时保留缓存；没有缓存则维持空状态
    } finally {
      setWeatherLoading(false);
    }
  }, [settings.cityCode]);

  useEffect(() => {
    refreshWeather();
    const interval = setInterval(refreshWeather, settings.weatherRefreshMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshWeather, settings.weatherRefreshMinutes]);

  // Dashboard remote fetcher
  const refreshDashboard = useCallback(async () => {
    if (settings.demoMode) {
      setIsServerOnline(false);
      setDashboardData({
        status: 'demo',
        subscriptions: DEMO_SUBSCRIPTIONS,
        agent: {
          status: 'idle',
          currentTask: 'DEMO 演示模式 (本地环境未连接)'
        }
      });
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      return;
    }

    try {
      const { data, isOnline } = await fetchRemoteDashboard(
        settings.serverUrl,
        settings.serverAuthToken,
        settings.retainCacheOn503
      );
      setDashboardData(data);
      setIsServerOnline(isOnline);
      if (data.agent?.status) {
        setAgentStatus(data.agent.status as AgentStatusType);
      }
      if (data.xiaozhi?.last_stt) {
        setSttText(data.xiaozhi.last_stt);
      }
      if (data.xiaozhi?.last_llm) {
        setLlmText(data.xiaozhi.last_llm);
      }
      setLastSyncTime(new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    } catch {
      setIsServerOnline(false);
    }
  }, [settings.demoMode, settings.serverUrl, settings.serverAuthToken, settings.retainCacheOn503]);

  useEffect(() => {
    refreshDashboard();
    const interval = setInterval(refreshDashboard, settings.autoRefreshMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshDashboard, settings.autoRefreshMinutes]);

  const handleCycleAgentStatus = () => {
    const cycle: AgentStatusType[] = ['idle', 'listening', 'thinking', 'responding'];
    const nextIdx = (cycle.indexOf(agentStatus) + 1) % cycle.length;
    setAgentStatus(cycle[nextIdx]);
  };

  const handleTriggerListen = useCallback(() => {
    const turn = ++turnRef.current;
    voiceSession.current = true;
    setAgentStatus('listening');
    setSttText('');
    setLlmText('');
    setMcpAction(null);
    setTimeout(() => {
      if (turnRef.current !== turn) return;
      setAgentStatus('thinking');
      setSttText('今天有什么值得听的新闻？');
      setTimeout(() => {
        if (turnRef.current !== turn) return;
        setAgentStatus('responding');
        setLlmText('我先帮你看一下最近的消息。');
        setTimeout(() => {
          if (turnRef.current !== turn) return;
          setAgentStatus('listening');
        }, 4000);
      }, 1200);
    }, 1600);
  }, []);

  const handleInterrupt = useCallback(() => {
    turnRef.current += 1;
    if (agentStatus === 'listening') {
      voiceSession.current = false;
      setAgentStatus('idle');
      return;
    }
    setAgentStatus(voiceSession.current ? 'listening' : 'idle');
  }, [agentStatus]);

  const handleResetChat = useCallback(() => {
    turnRef.current += 1;
    voiceSession.current = false;
    setAgentStatus('idle');
    setSttText('');
    setLlmText('');
    setMcpAction(null);
  }, []);

  const handleSendPresetPrompt = useCallback((prompt: string, answer: string, mcp?: string) => {
    const turn = ++turnRef.current;
    voiceSession.current = false;
    setSttText(prompt);
    setLlmText('');
    setMcpAction(null);
    setAgentStatus('thinking');
    setTimeout(() => {
      if (turnRef.current !== turn) return;
      setAgentStatus('responding');
      setLlmText(answer);
      if (mcp) setMcpAction(mcp);
      setTimeout(() => {
        if (turnRef.current !== turn) return;
        setAgentStatus('idle');
      }, 4000);
    }, 800);
  }, []);

  // Quick brightness cycle toggle: 100% -> 120% -> 85% -> 100%
  const handleCycleBrightness = () => {
    let next = 100;
    if (settings.brightness === 100) next = 120;
    else if (settings.brightness === 120) next = 85;
    else next = 100;
    handleUpdateSettings({ brightness: next });
  };

  // Determine subscriptions list
  const subscriptionsToDisplay: SubscriptionItem[] = useMemo(() => {
    if (settings.demoMode) {
      return DEMO_SUBSCRIPTIONS;
    }
    if (dashboardData?.subscriptions && dashboardData.subscriptions.length > 0) {
      return dashboardData.subscriptions;
    }
    return DISCONNECTED_SUBSCRIPTIONS;
  }, [settings.demoMode, dashboardData]);

  return (
    <TabletFrame
      showBezel={false}
      onToggleBezel={() => {}}
      brightness={settings.brightness}
      nightFilter={settings.nightFilter}
    >
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-4 lg:p-5 h-full max-h-screen overflow-hidden select-none gap-2.5">
        {/* Top Header: Clock on Left, Weather & Action Hub on Right */}
        <header className="flex flex-col sm:flex-row sm:items-stretch gap-2.5 flex-shrink-0">
          <ClockWidget />
          <WeatherWidget
            weather={weather}
            isLoading={weatherLoading}
            onRefresh={refreshWeather}
          />
          <div className="ml-auto flex flex-col justify-center gap-2">
              <button
                onClick={handleCycleBrightness}
                className="flex items-center space-x-1 px-2.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                title={`点击快速切换亮度 (当前: ${settings.brightness}%)`}
              >
                <Sun className="w-4 h-4 text-zinc-300" />
                <span className="text-xs font-mono font-bold">{settings.brightness}%</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 hover:border-zinc-400 text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                title="打开系统与配额服务端配置"
              >
                <SettingsIcon className="w-4 h-4" />
              </button>
          </div>
        </header>

        {/* Upper Half: AI Quota Metrics (Compact Landscape Row) */}
        <section className="flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
              <span className="text-[11px] font-mono text-white font-bold uppercase tracking-wider">
                AI 平台配额遥测 / QUOTA METRICS
              </span>
              <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                ({subscriptionsToDisplay.length} 平台指标)
              </span>
            </div>

            {/* Data Source Status & Quick Setting Shortcut (Pure Grayscale) */}
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1.5 ${
                !settings.demoMode && isServerOnline
                  ? 'bg-white text-zinc-950 border-white font-bold shadow-[0_0_6px_rgba(255,255,255,0.4)]'
                  : settings.demoMode
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 font-medium'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  !settings.demoMode && isServerOnline ? 'bg-zinc-950 animate-ping' : settings.demoMode ? 'bg-zinc-400' : 'bg-zinc-600'
                }`} />
                <span>
                  {!settings.demoMode && isServerOnline
                    ? '用户服务端在线 (LIVE)'
                    : settings.demoMode
                    ? 'DEMO 演示数据'
                    : '服务端未连接'}
                </span>
              </span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="text-[10px] font-mono text-zinc-400 hover:text-white underline cursor-pointer"
              >
                配置服务端
              </button>
            </div>
          </div>
          <div
            className="grid gap-2.5 items-stretch"
            style={{ gridTemplateColumns: `repeat(${Math.max(subscriptionsToDisplay.length, 1)}, minmax(0, 1fr))` }}
          >
            {subscriptionsToDisplay.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                item={sub}
                onEnableDemo={() => handleUpdateSettings({ demoMode: true })}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            ))}
          </div>
        </section>

        <main className="flex-1 flex flex-col min-h-0 overflow-hidden my-0.5">
          <XiaozhiLivePanel
            status={agentStatus}
            sttText={sttText}
            llmText={llmText}
            mcpAction={mcpAction}
            onTriggerListen={handleTriggerListen}
            onInterrupt={handleInterrupt}
            onReset={handleResetChat}
            onSendPresetPrompt={handleSendPresetPrompt}
          />
        </main>

        <div className="flex-shrink-0">
          <SystemStatusBar
            isServerOnline={isServerOnline}
            isDemoMode={settings.demoMode}
            lastSyncTime={lastSyncTime}
            agentStatus={agentStatus}
            onCycleAgentStatus={handleCycleAgentStatus}
          />
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResetSettings={handleResetSettings}
      />

    </TabletFrame>
  );
}
