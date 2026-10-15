import React, { useState, useEffect } from 'react';
import {
  Bot,
  User,
  Mic,
  Square,
  Terminal,
  Volume2,
  VolumeX,
  Cpu,
  Trash2
} from 'lucide-react';
import { AgentStatusType } from '../types';
import { AudioWaveform } from './AudioWaveform';

interface XiaozhiLivePanelProps {
  status: AgentStatusType;
  sttText: string;
  llmText: string;
  mcpAction?: string | null;
  onTriggerListen: () => void;
  onInterrupt: () => void;
  onReset: () => void;
  onSendPresetPrompt: (prompt: string, answer: string, mcp?: string) => void;
}

export const XiaozhiLivePanel: React.FC<XiaozhiLivePanelProps> = ({
  status,
  sttText,
  llmText,
  mcpAction,
  onTriggerListen,
  onInterrupt,
  onReset,
  onSendPresetPrompt,
}) => {
  const [muted, setMuted] = useState(false);
  // Simulated typewriter streaming effect for LLM response
  const [displayedText, setDisplayedText] = useState(llmText);

  useEffect(() => {
    if (status === 'responding') {
      let idx = 0;
      setDisplayedText('');
      const full = llmText;
      const interval = setInterval(() => {
        idx += 2;
        if (idx <= full.length) {
          setDisplayedText(full.slice(0, idx));
        } else {
          setDisplayedText(full);
          clearInterval(interval);
        }
      }, 35);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(llmText);
    }
  }, [llmText, status]);

  const PRESET_PROMPTS = [
    {
      title: 'AI科技简报',
      answer: '好呀，这就帮你找找最新的 AI 科技新闻。',
      mcp: 'search_news'
    },
    {
      title: '最近国际国内新闻汇总',
      answer: '好嘞，给你汇总一下最近的国际国内新闻。',
      mcp: 'search_news'
    }
  ];

  // 纯灰阶状态徽标 (高对比纯白/灰阶分层)
  const getStatusBadge = () => {
    switch (status) {
      case 'listening':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-zinc-800 border border-zinc-500 text-white font-mono text-[11px] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>LISTENING · 倾听录音中</span>
          </span>
        );
      case 'thinking':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-zinc-800 border border-zinc-600 text-zinc-200 font-mono text-[11px]">
            <Cpu className="w-3 h-3 animate-spin text-zinc-200" />
            <span>THINKING · 大模型推理中</span>
          </span>
        );
      case 'responding':
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-white border border-white text-zinc-950 font-bold font-mono text-[11px] shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            <Volume2 className="w-3 h-3 text-zinc-950 animate-pulse" />
            <span>RESPONDING · 语音播报推流</span>
          </span>
        );
      case 'idle':
      default:
        return (
          <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span>IDLE · 小智待命中</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-[220px] max-h-[380px] bg-[#141417] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg select-none">
      {/* Panel Top Sub-header: Status, Waveform & Fast Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#101012] gap-2">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Bot className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-semibold text-white">
              小智AI · 实时对话终端
            </span>
          </div>
          {getStatusBadge()}
        </div>

        {/* Audio Waveform & Action Triggers */}
        <div className="flex items-center space-x-2">
          <AudioWaveform status={status} />

          <button
            type="button"
            onClick={onReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-mono cursor-pointer transition-colors active:scale-95 shadow-sm"
            title="清空对话，并打断正在进行的播报"
          >
            <Trash2 className="w-4 h-4" />
            <span>清空</span>
          </button>

          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-mono cursor-pointer transition-colors active:scale-95 shadow-sm"
            title="只开关回复播报，不停止对话，也不关麦克风"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{muted ? '静音' : '声音'}</span>
          </button>

          {status === 'listening' ? (
            <button
              onClick={onInterrupt}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-white text-xs font-mono cursor-pointer transition-colors active:scale-95 shadow-sm"
              title="停止录音，保留已经说过的内容"
            >
              <Square className="w-4 h-4" />
              <span>停止录音</span>
            </button>
          ) : status === 'responding' || status === 'thinking' ? (
            <button
              onClick={onInterrupt}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600 text-white text-xs font-mono cursor-pointer transition-colors active:scale-95 shadow-sm"
              title="打断当前播报，对话文字保留"
            >
              <Square className="w-4 h-4" />
              <span>打断播报</span>
            </button>
          ) : (
            <button
              onClick={onTriggerListen}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-mono cursor-pointer transition-colors active:scale-95 shadow-sm"
              title="开始交流后才监听"
            >
              <Mic className="w-4 h-4 text-zinc-200" />
              <span>开始交流</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Dialogue Content Area: Ample Vertical Space for Reading Text */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-gradient-to-b from-[#141417] to-[#101012]">
        {/* Dialogue Bubbles */}
        <div className="space-y-3.5">
          {/* User Prompt (STT Transcript) */}
          {sttText && (
            <div className="flex items-start justify-end space-x-3">
              <div className="max-w-[90%] p-2.5 rounded-xl bg-[#1b1b1f] border border-zinc-800 text-[11px] font-sans text-zinc-100 leading-snug tracking-wide select-text shadow-sm">
                {sttText}
              </div>
              <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white flex-shrink-0 mt-0.5 shadow-sm">
                <User className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Xiaozhi LLM Response (Main Text) */}
          <div className="flex items-start space-x-3">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white flex-shrink-0 mt-0.5 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>

            <div className="flex-1">
              {status === 'responding' && (
                <div className="mb-1.5 text-[10px] font-mono text-white animate-pulse font-medium">
                  ● 流式推流中...
                </div>
              )}

              {/* High-legibility text with comfortable line-height and bright pure white color */}
              <div className="p-2.5 rounded-xl bg-[#1b1b1f] border border-zinc-800 text-[11px] font-sans text-zinc-100 leading-snug tracking-wide select-text shadow-sm">
                {displayedText || '小智已就绪。正在保持待命，您可以通过语音唤醒或点击下方预设指令进行对话。'}
                {status === 'responding' && (
                  <span className="inline-block w-2 h-4 ml-1 bg-white animate-pulse align-middle" />
                )}
              </div>

              {/* MCP Tool Trigger Notification */}
              {mcpAction && (
                <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 shadow-sm">
                  <Terminal className="w-3 h-3 text-zinc-300" />
                  <span className="text-zinc-500">MCP 指令已执行:</span>
                  <span className="text-zinc-200 font-semibold">{mcpAction}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Question / Action Chips (Pure Grayscale) */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">快捷模拟</span>
          {PRESET_PROMPTS.map((item) => (
            <button
              key={item.title}
              onClick={() => onSendPresetPrompt(item.title, item.answer, item.mcp)}
              className="text-[11px] font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer active:scale-95 shadow-sm"
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
