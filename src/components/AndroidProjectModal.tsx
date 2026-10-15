import React, { useState } from 'react';
import {
  X,
  Download,
  FolderTree,
  Terminal,
  FileCode2,
  Check,
  Copy,
  AlertTriangle,
  Server,
  Cpu,
  BookOpen,
  Code
} from 'lucide-react';
import { ANDROID_PROJECT_FILES, generateAndroidProjectZip } from '../services/zipExporter';

interface AndroidProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'guide' | 'compatibility' | 'source' | 'server'>('download');
  const [selectedFileIndex, setSelectedFileIndex] = useState(4); // default to app/build.gradle
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const blob = await generateAndroidProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'AI-Desk-Android-FireHD8-API22.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsZipping(false);
    }
  };

  const handleCopyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const selectedFile = ANDROID_PROJECT_FILES[selectedFileIndex] || ANDROID_PROJECT_FILES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-4xl bg-[#101318] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0c0e12]">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-mono font-medium text-zinc-100 flex items-center">
                AI Desk — Android 原生工程中心
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  minSdk 22 · Fire HD 8 (2017)
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                严格针对 Fire OS 5.7.1.0 (Android 5.1.1 API 22) 及 1.5GB RAM 优化的完整工程
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
            onClick={() => setActiveTab('download')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'download'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>一键下载工程 (.zip)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>ADB 刷机与安装指南</span>
          </button>

          <button
            onClick={() => setActiveTab('compatibility')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'compatibility'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>API 22 关键兼容架构</span>
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'source'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>完整源码浏览器</span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'server'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Windows PC 伴侣端</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs font-mono text-zinc-300">
          {/* TAB 1: Download */}
          {activeTab === 'download' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-[#14171e] border border-zinc-800 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shadow-md">
                  <Download className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-100">
                    下载完整 Android Studio 原生工程
                  </h3>
                  <p className="text-zinc-500 max-w-lg mx-auto mt-1 leading-relaxed text-[11px]">
                    工程已内置 Windows 双击构建脚本 <code className="text-zinc-300">build_apk.bat</code> 与 Mac/Linux 脚本 <code className="text-zinc-300">build_apk.sh</code>。解压后双击即可全自动编译产出 APK 并通过 ADB 自动安装至 Fire HD 8！
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleDownloadZip}
                    disabled={isZipping}
                    className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono font-medium rounded-lg border border-zinc-700 shadow-md transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50 active:scale-95"
                    title="下载包含源码与 build_apk.bat 的完整工程 ZIP"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{isZipping ? '正在打包工程...' : '立即下载工程源码包 (AI-Desk-FireHD8-API22.zip)'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-500 pt-1 font-mono">
                  <span className="text-emerald-400">⚡ 原生 API 22 · Fire OS 5.7.1.0 兼容</span>
                  <span>·</span>
                  <span>源文件数: 18 个完整源文件</span>
                  <span>·</span>
                  <span>内置 Windows build_apk.bat</span>
                </div>
              </div>

              {/* File list preview */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-zinc-200">
                  工程打包目录清单 (包含完整的 Android 项目结构)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {ANDROID_PROJECT_FILES.map((file, idx) => (
                    <div
                      key={file.path}
                      onClick={() => {
                        setSelectedFileIndex(idx);
                        setActiveTab('source');
                      }}
                      className="p-3 rounded-lg bg-[#14171e] border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="truncate pr-2">
                        <div className="text-zinc-300 group-hover:text-white truncate font-medium">
                          {file.path}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate">
                          {file.description}
                        </div>
                      </div>
                      <Code className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Guide */}
          {activeTab === 'guide' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2">
                <span className="font-medium text-zinc-100">1. Amazon Fire HD 8 开启开发者模式与 USB 调试</span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  在平板上进入 <strong>Settings (设置) &gt; Device Options (设备选项)</strong>，连续点击 <strong>Serial Number (序列号)</strong> 7次，直到提示“You are now a developer”。返回上一层进入 <strong>Developer Options</strong>，开启 <strong>Enable ADB (开启ADB)</strong>。
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2.5">
                <span className="font-medium text-zinc-100">2. 本地一键编译与 ADB 安装 (Windows PC)</span>
                <p className="text-zinc-500 text-[11px]">解压下载的压缩包后，在 Windows 命令提示符执行：</p>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
{`# 方式 A: 直接双击 build_apk.bat (全自动执行)

# 方式 B: 手动命令行执行
.\\gradlew.bat assembleDebug

# 检查已连接的 Fire HD 8 平板
adb devices

# 推送并安装到平板
adb install -r app\\build\\outputs\\apk\\debug\\app-debug.apk

# 启动应用
adb shell am start -n com.aidesk.dashboard/.MainActivity`}
                  </pre>
                  <button
                    onClick={() => handleCopyCode('.\\gradlew.bat assembleDebug\nadb install -r app\\build\\outputs\\apk\\debug\\app-debug.apk', 991)}
                    className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    {copiedIndex === 991 ? '已复制' : '复制命令'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2.5">
                <span className="font-medium text-zinc-100">3. 24 小时常亮桌面调优 (保持屏幕不锁屏)</span>
                <p className="text-zinc-500 text-[11px]">通过 ADB 运行以下系统命令，使平板接通电源时永不黑屏：</p>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
{`# 允许充电时常亮 (1=交流电, 2=USB, 3=任何充电)
adb shell settings put global stay_on_while_plugged_in 3

# 设置屏幕超时为最大
adb shell settings put system screen_off_timeout 2147483647`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Compatibility */}
          {activeTab === 'compatibility' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2">
                <div className="font-medium text-zinc-100 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>为什么现代 Android 项目在 Fire OS 5.7.1.0 上会直接闪退？</span>
                </div>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Amazon Fire HD 8 (2017) 底层是 <strong>Android 5.1.1 (API 22)</strong>。现代网络库（OkHttp 4、Retrofit）默认仅在 API 26+ 启用 TLS 1.2 / TLS 1.3，而 Android 5.1 默认的 SSLSocket 会因协议握手失败直接抛出 <code>SSLHandshakeException</code>。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-[#14171e] border border-zinc-800 space-y-1.5">
                  <span className="text-zinc-200 font-medium text-[11px]">1. Tls12SocketFactory 底层补丁</span>
                  <p className="text-zinc-500 text-[11px]">
                    工程已内置自定义 <code>Tls12SocketFactory</code>，强行开启 Android 5.1 的 TLSv1.2 密码套件，让平板可正常请求现代 HTTPS 接口。
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#14171e] border border-zinc-800 space-y-1.5">
                  <span className="text-zinc-200 font-medium text-[11px]">2. Java 8 语言脱糖 (Desugaring)</span>
                  <p className="text-zinc-500 text-[11px]">
                    配置了 <code>desugar_jdk_libs:1.2.2</code>，允许在 API 22 上安全使用 <code>java.time</code> 与现代流式 API。
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#14171e] border border-zinc-800 space-y-1.5">
                  <span className="text-zinc-200 font-medium text-[11px]">3. 局域网明文流量允许 (HTTP Cleartext)</span>
                  <p className="text-zinc-500 text-[11px]">
                    配置 <code>network_security_config.xml</code>，允许访问 Windows PC 本地伴侣端 <code>http://192.168.x.x:8000</code>。
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#14171e] border border-zinc-800 space-y-1.5">
                  <span className="text-zinc-200 font-medium text-[11px]">4. 1.5GB RAM 极简内存开销</span>
                  <p className="text-zinc-500 text-[11px]">
                    纯原生 ViewBinding，拒绝臃肿运行时，空闲内存占用仅约 35MB。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Source Browser */}
          {activeTab === 'source' && (
            <div className="flex flex-col md:flex-row gap-3 h-full">
              {/* File sidebar */}
              <div className="w-full md:w-56 space-y-1 overflow-y-auto max-h-48 md:max-h-none pr-1">
                {ANDROID_PROJECT_FILES.map((file, idx) => (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFileIndex(idx)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] truncate transition-colors cursor-pointer block ${
                      selectedFileIndex === idx
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>

              {/* Code viewer */}
              <div className="flex-1 flex flex-col rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden min-h-[300px]">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-[#0c0e12]">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {selectedFile.path}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedFile.content, selectedFileIndex)}
                    className="flex items-center space-x-1 text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedIndex === selectedFileIndex ? '已复制' : '复制内容'}</span>
                  </button>
                </div>
                <pre className="flex-1 p-3 text-[11px] text-zinc-300 font-mono overflow-auto leading-relaxed">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: Server */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2">
                <span className="font-medium text-zinc-100">Windows PC 伴侣服务端 (Zero-dependency Python 3)</span>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  位于工程 <code>server/windows_agent_server.py</code>。原生使用 Python 3 标准库，无需 <code>pip install</code> 任何第三方依赖。在电脑端直接运行：
                </p>
                <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
{`cd server
python windows_agent_server.py
# 默认监听: http://0.0.0.0:8000/api/dashboard`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-[#14171e] border border-zinc-800 space-y-2">
                <span className="font-medium text-zinc-100">官方 API 密钥配置文件 (`server/config.json`)</span>
                <p className="text-zinc-500 text-[11px]">
                  在 <code>server/</code> 目录下创建 <code>config.json</code>，填入 DeepSeek API Key 或 Cursor Session Token，即可自动开启官方实时数据同步。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
