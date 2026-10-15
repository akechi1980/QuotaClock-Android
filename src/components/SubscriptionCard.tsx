import React from 'react';
import {
  Sparkles,
  Terminal,
  Cpu,
  Activity
} from 'lucide-react';
import { SubscriptionItem } from '../types';

interface SubscriptionCardProps {
  item: SubscriptionItem;
  onEnableDemo?: () => void;
  onOpenSettings?: () => void;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  item,
  onEnableDemo,
  onOpenSettings,
}) => {
  const isDisconnected = item.status === 'disconnected';
  const isDemo = item.status === 'demo';
  const isSim = item.status === 'sim';
  const isWarning = item.status === 'warning';

  // Calculate used & remaining percentages
  let usedPercent: number = 0;
  if (item.used !== null && item.used !== undefined) {
    usedPercent = Math.min(100, Math.max(0, Math.round(item.used)));
  } else if (item.remaining !== null && item.remaining !== undefined && item.total) {
    usedPercent = Math.min(100, Math.max(0, Math.round(((item.total - item.remaining) / item.total) * 100)));
  }

  const remainingPercent = 100 - usedPercent;
  const filledBlocks = Math.round(usedPercent / 5);

  const getPlatformIcon = (id: string) => {
    if (id.includes('openai') || id.includes('chatgpt')) return <Sparkles className="w-3.5 h-3.5 text-zinc-100" />;
    if (id.includes('cursor')) return <Terminal className="w-3.5 h-3.5 text-zinc-100" />;
    if (id.includes('deepseek')) return <Cpu className="w-3.5 h-3.5 text-zinc-100" />;
    return <Activity className="w-3.5 h-3.5 text-zinc-100" />;
  };

  // 灰阶风格高对比度状态徽标
  const renderBadge = () => {
    if (isSim) {
      return (
        <span className="text-[10px] font-mono font-medium text-zinc-200 bg-zinc-800 border border-zinc-600 px-1.5 py-0.5 rounded uppercase" title="用户 progress_service 模拟测试模式 (--demo 或 --values)">
          SIM
        </span>
      );
    }
    if (isDemo) {
      return (
        <span className="text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded uppercase">
          DEMO
        </span>
      );
    }
    if (isDisconnected) {
      return (
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded">
          OFF
        </span>
      );
    }
    if (isWarning) {
      return (
        <span className="text-[10px] font-mono font-medium text-zinc-300 bg-zinc-800 border border-zinc-600 px-1.5 py-0.5 rounded" title="服务返回 503，已保留上次历史进度">
          503
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold text-zinc-950 bg-white border border-white px-1.5 py-0.5 rounded shadow-[0_0_6px_rgba(255,255,255,0.4)]">
        LIVE
      </span>
    );
  };

  return (
    <div className={`relative flex flex-col justify-between h-full p-2.5 rounded-xl border transition-all duration-200 select-none shadow-sm ${
      isDisconnected
        ? 'bg-[#141416]/90 border-zinc-800 opacity-80'
        : 'bg-[#17171a] border-zinc-800 hover:border-zinc-600 hover:shadow-md'
    }`}>
      {/* Top Header: Platform Name & Status Badge */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-200">
            {getPlatformIcon(item.id)}
          </div>
          <div className="min-w-0">
            <span className="text-xs font-mono font-semibold text-white tracking-tight truncate">
              {item.name}
            </span>
          </div>
        </div>

        {/* Minimalist Grayscale Badge */}
        {renderBadge()}
      </div>

      {/* Center: Numeric Metric Display (Pure Grayscale) */}
      <div className="my-1">
        {isDisconnected ? (
          <div className="py-1.5 px-1 rounded bg-zinc-950 border border-zinc-800 text-center">
            <span className="text-[10px] font-mono text-zinc-500">未连接服务端</span>
            <div className="flex items-center justify-center space-x-2 mt-1">
              {onEnableDemo && (
                <button
                  onClick={onEnableDemo}
                  className="text-[10px] font-mono text-zinc-300 hover:text-white underline cursor-pointer"
                >
                  演示预览
                </button>
              )}
              {onOpenSettings && (
                <button
                  onClick={onOpenSettings}
                  className="text-[10px] font-mono text-white underline cursor-pointer"
                >
                  配置服务
                </button>
              )}
            </div>
          </div>
        ) : item.type === 'progress' || item.used !== null ? (
          <div>
            <div className="flex items-baseline justify-between mb-1 font-mono">
              <div className="flex items-baseline space-x-1">
                <span className="text-[10px] text-zinc-400 uppercase font-medium">已用:</span>
                <span className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                  {usedPercent}%
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 font-mono">
                剩余 <span className="text-zinc-200 font-bold">{remainingPercent}%</span>
              </div>
            </div>

            {/* High-Contrast Grayscale Precision Bar */}
            <div className="flex gap-[3px] h-2.5">
              {Array.from({ length: 20 }, (_, index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-[2px] ${
                    index < filledBlocks ? 'bg-white' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline justify-between mb-1 font-mono">
              <div className="flex items-baseline space-x-1">
                <span className="text-[10px] text-zinc-400 uppercase font-medium">余额:</span>
                <span className="text-lg sm:text-xl font-bold text-white tracking-tight drop-shadow-sm">
                  {item.remaining !== null && item.remaining !== undefined
                    ? item.remaining
                    : item.total}
                </span>
                {item.unit && (
                  <span className="text-[10px] text-zinc-400 ml-0.5">{item.unit}</span>
                )}
              </div>
            </div>
            <div className="flex gap-[3px] h-2.5">
              {Array.from({ length: 20 }, (_, index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-[2px] ${
                    index < filledBlocks ? 'bg-white' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
