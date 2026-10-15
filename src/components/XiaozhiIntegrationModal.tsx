import React, { useState } from 'react';
import {
  X,
  Bot,
  Cpu,
  Layers,
  Network,
  Code2,
  KeyRound,
  CheckCircle2,
  Copy,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Radio,
  Zap,
  Activity
} from 'lucide-react';

interface XiaozhiIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const XiaozhiIntegrationModal: React.FC<XiaozhiIntegrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'xiaozhi' | 'apis' | 'config'>('xiaozhi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const DEEPSEEK_CODE = `curl -X GET "https://api.deepseek.com/user/balance" \\
  -H "Authorization: Bearer <YOUR_DEEPSEEK_API_KEY>" \\
  -H "Accept: application/json"

# 返回格式:
# {
#   "is_available": true,
#   "balance_infos": [
#     {
#       "currency": "CNY",
#       "total_balance": "85.20",
#       "granted_balance": "10.00",
#       "topped_up_balance": "75.20"
#     }
#   ]
# }`;

  const CURSOR_CODE = `curl -X GET "https://www.cursor.com/api/usage" \\
  -H "Cookie: WorkosCursorSessionToken=<YOUR_WORKOS_TOKEN>" \\
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"

# 返回格式:
# {
#   "numFastRequests": 88,
#   "maxFastRequests": 500,
#   "startOfMonth": "2026-10-01T00:00:00.000Z"
# }`;

  const SILICONFLOW_CODE = `curl -X GET "https://api.siliconflow.cn/v1/user/info" \\
  -H "Authorization: Bearer <YOUR_SILICONFLOW_API_KEY>"

# 返回格式:
# {
#   "code": 20000,
#   "data": {
#     "id": "...",
#     "name": "...",
#     "totalBalance": "100.00",
#     "balance": "100.00"
#   }
# }`;

  const CONFIG_JSON_TEMPLATE = `{
  "deepseek_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
  "cursor_session_token": "user_xxxxxxxxxxxxxxxxx",
  "openai_api_key": "sk-proj-xxxxxxxxxxxxxxxxxxxx",
  "siliconflow_api_key": "sk-xxxxxxxxxxxxxxxxxxxxxxxx",
  "xiaozhi_server_url": "ws://127.0.0.1:8080/ws",
  "cache_ttl_seconds": 300
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-4xl bg-[#101318] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0c0e12]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-mono font-medium text-zinc-100 flex items-center">
                小智AI 协议集成 & 官方余量查询指南
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  XIAOZHI_CORE_V1
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                基于开源小智AI框架实现语音交互，并通过 Windows 伴侣端对接各大平台官方接口
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 px-6 py-2 border-b border-zinc-800 bg-[#0e1015] text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('xiaozhi')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'xiaozhi'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>小智AI 技术栈与协议</span>
          </button>

          <button
            onClick={() => setActiveTab('apis')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'apis'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>官方 AI 额度查询接口</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>伴侣端 config.json 配置</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-zinc-300 font-mono">
          {/* TAB 1: 小智AI 技术栈 */}
          {activeTab === 'xiaozhi' && (
            <div className="space-y-6">
              {/* Architecture Overview */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-3">
                <div className="flex items-center space-x-2 text-zinc-100 font-medium">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>小智AI (Xiaozhi-ESP32 / py-xiaozhi) 架构分析</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  小智AI 是一个全开源的高实时性 AI 语音助手框架（原仓库 <code>78/xiaozhi-esp32</code> 及 <code>nulllaborg/xiaozhi-esp32-nulllab</code>，扩展至 Python / Go 服务端及多端客户端）。其核心通信与音频管线如下：
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">传输协议</span>
                    <div className="text-zinc-200 font-medium">WebSocket / MQTT+UDP</div>
                    <div className="text-zinc-500 text-[11px]">全双工双向控制指令与流式传输</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">音频编码</span>
                    <div className="text-zinc-200 font-medium">OPUS 16kHz 1-Channel</div>
                    <div className="text-zinc-500 text-[11px]">低延迟 20ms/40ms 帧，极低网络负载</div>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/80 space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">控制与扩展</span>
                    <div className="text-zinc-200 font-medium">MCP 协议与工具调用</div>
                    <div className="text-zinc-500 text-[11px]">大模型可直接反向调取设备功能</div>
                  </div>
                </div>
              </div>

              {/* Protocol Details */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-3">
                <div className="text-zinc-100 font-medium flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>小智AI 核心 WebSocket 通信时序与报文</span>
                </div>

                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <div className="text-[11px] text-zinc-400 font-semibold mb-1">1. 握手连接 (hello)</div>
                    <pre className="text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
{`// 客户端建立 WebSocket 后首先发送握手报文:
{
  "type": "hello",
  "version": 1,
  "transport": "websocket",
  "audio_params": { "format": "opus", "sample_rate": 16000, "channels": 1, "frame_duration": 60 }
}`}
                    </pre>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <div className="text-[11px] text-zinc-400 font-semibold mb-1">2. 状态时序 (Listen -&gt; STT -&gt; LLM -&gt; TTS)</div>
                    <pre className="text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
{`// 监听启动 (VAD 激活或按键)
{"type": "listen", "state": "start", "mode": "auto"}

// 服务端流式返回语音识别 (STT)
{"type": "stt", "text": "帮我看看当前 OpenAI 余额还有多少"}

// 服务端流式返回大模型思考文字 (LLM)
{"type": "llm", "emotion": "happy", "text": "已为您查询到，当前账户余额为 82.40 美元。"}

// 服务端下发语音合成音频并附带控制
{"type": "tts", "state": "start"}
// 二进制 Opus 音频帧随之通过 WebSocket 传输...
{"type": "tts", "state": "stop"}`}
                    </pre>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                    <div className="text-[11px] text-zinc-400 font-semibold mb-1">3. MCP (Model Context Protocol) 桌面控制反向调用</div>
                    <pre className="text-[10px] text-zinc-400 overflow-x-auto leading-relaxed">
{`// 服务端通过小智 MCP 协议控制 AI Desk 屏幕亮度:
{
  "type": "mcp",
  "method": "tools/call",
  "params": {
    "name": "set_desk_brightness",
    "arguments": { "brightness": 40 }
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Integration into AI Desk */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2">
                <div className="text-zinc-100 font-medium flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-sky-400" />
                  <span>与 AI Desk 的最佳集成实践架构</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  在 Amazon Fire HD 8 (API 22) 与桌面控制台架构中，<strong>无需在低配旧平板上强行编译 C++ Opus 动态库</strong>：
                </p>
                <ul className="list-disc list-inside text-zinc-400 space-y-1.5 pl-1">
                  <li><strong>端云协同</strong>：Windows PC 本地运行小智服务端（或 <code>windows_agent_server.py</code> 代理桥接），处理复杂的音频编解码与 LLM 交互。</li>
                  <li><strong>视觉呈现</strong>：AI Desk 平板端通过 WebSocket / HTTP 获取实时 Agent 状态（待命、监听、思考、回答），展示实时波形与字幕。</li>
                  <li><strong>双向控制</strong>：平板底部的麦克风交互入口直接触发小智 <code>{'{ "type": "listen", "state": "start" }'}</code>，大模型亦可通过 MCP 反向控制平板背光与刷新。</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: 官方 AI 额度查询接口 */}
          {activeTab === 'apis' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 leading-relaxed">
                <ShieldCheck className="w-4 h-4 inline mr-1 text-emerald-400" />
                以下整理了各大 AI 平台的<strong>官方接口规范与实践方法</strong>。所有请求逻辑均已内置于 <code>server/windows_agent_server.py</code> 中，由 Windows PC 本地直连官方服务器，<strong>API Key 与 Token 绝不上报外网，平板端只接收统计数值</strong>。
              </div>

              {/* 1. DeepSeek */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-zinc-100">1. DeepSeek 官方原生余额接口 (最高可靠度)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">官方原生</span>
                  </div>
                  <button
                    onClick={() => handleCopy(DEEPSEEK_CODE, 'deepseek')}
                    className="flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'deepseek' ? '已复制' : '复制 Curl'}</span>
                  </button>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  DeepSeek 官方开放了标准用户余额查询 API，可直接查询充值总额与赠送金余额（单位：CNY）。
                </p>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  {DEEPSEEK_CODE}
                </pre>
              </div>

              {/* 2. Cursor */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-zinc-100">2. Cursor 快速请求查询接口 (WorkOS Token)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">社区通用</span>
                  </div>
                  <button
                    onClick={() => handleCopy(CURSOR_CODE, 'cursor')}
                    className="flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'cursor' ? '已复制' : '复制 Curl'}</span>
                  </button>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  在浏览器登录 <code>cursor.com</code>，F12 打开应用存储找到 Cookie 中的 <code>WorkosCursorSessionToken</code>，即可获取精确的 <code>numFastRequests</code> 与 <code>maxFastRequests</code>。
                </p>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  {CURSOR_CODE}
                </pre>
              </div>

              {/* 3. SiliconFlow */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-zinc-100">3. 硅基流动 (SiliconFlow) 官方余额接口</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">官方原生</span>
                  </div>
                  <button
                    onClick={() => handleCopy(SILICONFLOW_CODE, 'siliconflow')}
                    className="flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedKey === 'siliconflow' ? '已复制' : '复制 Curl'}</span>
                  </button>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  国内主流开源大模型托管平台，官方接口直接返回账户人民币总余额。
                </p>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  {SILICONFLOW_CODE}
                </pre>
              </div>

              {/* 4. OpenAI & ChatGPT Plus */}
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2">
                <span className="font-semibold text-zinc-100">4. OpenAI API 与 ChatGPT Plus 订阅说明</span>
                <p className="text-zinc-400 leading-relaxed">
                  <strong>OpenAI API</strong>：2024年全面转为预付费 Credit 体系。官方提供 <code>/v1/organization/costs</code> 与 <code>/v1/dashboard/billing/credit_grants</code>，亦可对接 OneAPI/NewAPI 统一查询。<br/>
                  <strong>ChatGPT Plus</strong>：属于网页端周期订阅，官方无公开开放 API，需通过提取 <code>chatgpt.com</code> 的会话 Session Cookie 请求内部 <code>backend-api/models</code> 查看窗口限制。
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: config.json */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 leading-relaxed">
                只需在运行 <code>windows_agent_server.py</code> 的同级目录下创建一个 <code>config.json</code> 文件，填入你的密钥，服务端就会自动进行真实同步（未填写的项将自动采用安全模拟模式）：
              </div>

              <div className="relative">
                <button
                  onClick={() => handleCopy(CONFIG_JSON_TEMPLATE, 'config_json')}
                  className="absolute top-3 right-3 flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded bg-zinc-900 border border-zinc-800 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'config_json' ? '已复制' : '复制 config.json'}</span>
                </button>
                <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  {CONFIG_JSON_TEMPLATE}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 text-zinc-400 space-y-1.5">
                <div className="text-zinc-200 font-medium">配置生效步骤:</div>
                <div>1. 在电脑端新建 <code>config.json</code> 并粘贴上述内容。</div>
                <div>2. 填入你真实的 DeepSeek API Key 或 Cursor Token。</div>
                <div>3. 终端运行 <code>python windows_agent_server.py</code>。</div>
                <div>4. 平板或当前控制台将在下次刷新时自动展示实时官方余额！</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
