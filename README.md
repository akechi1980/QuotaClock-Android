# AI Desk — Fire HD 桌面信息控制台

给 Amazon Fire HD 做常亮桌面：上半屏是时钟、天气和 AI 配额，下半屏是小智对话状态。密钥留在电脑上，平板只负责显示。

当前对着的真机是 **Fire HD 8（2020，第 10 代，代号 KFONWI）**，不是文档旧稿里的 2017 款。

## 当前设备与本机环境

| 项 | 实际情况 |
|---|---|
| 平板 | KFONWI |
| 系统 | Fire OS 7 / Android 9 / API 28 |
| 屏幕 | 1280×800，16:10 横屏，USB-C |
| USB | 已插入，但只暴露 MTP。`adb devices` 为空，还不能安装应用 |
| 开发机 | Linux。Android Studio 2025.3.2 在 `~/android-studio`，自带 JDK 21 |
| SDK | `~/Android/Sdk`。已有平台 34、35、36、36.1，Build-Tools、NDK、模拟器 |
| 命令行 | 系统没有 `java` / `javac`。`PATH` 里的 `adb` 是 Debian 旧版 28.0.2；SDK 里的是 37.0.0 |
| 环境变量 | `ANDROID_HOME`、`JAVA_HOME` 都未设置 |

代码里的 `minSdk` 仍是 22，这是为了兼容 2017 款（KFDOWI，Fire OS 5 / API 22）。这台 2020 款是 API 28，那个版本的 TLS 1.2 补丁用不上，装包本身没有障碍。

## 工程里实际有什么

| 部分 | 作用 | 现状 |
|---|---|---|
| `src/` | React + Vite 控制台 | 可以在浏览器里跑。时钟、天气、配额、小智面板都有界面 |
| `server/windows_agent_server.py` | Python 3 标准库伴侣服务，默认端口 8000 | 可以在这台 Linux 上直接跑。没配 `config.json` 时返回演示配额 |
| `android/` | 原生 APK，`com.aidesk.dashboard` | 骨架。布局在，网络请求在，界面刷新函数是空的，现在编出来也画不出数据 |

网页默认去连局域网进度服务 `http://192.168.0.100:8766/api/progress`。它返回 `{"progress":[5小时, 7天, Cursor],"simulation":false}`，不带 CORS 头。开发时浏览器走 Vite 反代的同源 `/api/progress`。伴侣服务是另一条路：`http://localhost:8000/api/dashboard`。网页两种格式都能认；原生工程只认 `subscriptions`，而且默认地址写死成 `http://192.168.0.100:8000/api/dashboard`。

小智面板里的聆听、打断、亮度切换是页面内的定时模拟，没有接上真实语音。

## 在这台机器上运行

### 网页控制台

```bash
npm install --legacy-peer-deps
npm run dev
```

`package.json` 里的 `esbuild@^0.25` 和 Vite 8 要求的 `esbuild@^0.27` 冲突，直接 `npm install` 会失败，需要加上 `--legacy-peer-deps`。本机没有 bun。

浏览器打开 `http://localhost:3000`，或改用这台开发机的局域网地址。页面会去拉 `http://192.168.0.100:8766/api/progress`，三张卡分别是 OpenAI 5 小时、OpenAI 7 天、Cursor 月度的已用百分比。这个服务暂时不可达时，设置里可以打开 DEMO，或改成 `http://localhost:8000/api/dashboard` 接下面的伴侣服务。

### 伴侣服务

```bash
python3 server/windows_agent_server.py
```

- 仪表盘：`http://127.0.0.1:8000/api/dashboard`
- 小智状态：`http://127.0.0.1:8000/api/xiaozhi/status`
- 写入状态：`POST /api/xiaozhi/event`

真实密钥放在 `server/config.json`（参考 `server/config.example.json`），不要放进平板。未填写的平台保持演示数据。DeepSeek、Cursor、OpenAI、硅基流动会按配置去拉官方接口，结果缓存约 5 分钟。

### 原生 APK

现在还跑不起来，缺这几样：

- `android/` 里没有 `gradlew`，`build_apk.sh` 无法执行
- `android/local.properties` 写成了 `/opt/android-sdk`，本机 SDK 在 `~/Android/Sdk`
- `compileSdk 33`，已安装的平台从 34 起，没有 `android-33`
- `MainActivity` 的时钟、天气、配额、电量刷新函数仍是空实现
- 平板 ADB 未打开，USB 只有 MTP

要装到真机，先在平板上打开 ADB：设置 → 设备选项 → 连点序列号 → 开发者选项 → 启用 ADB，授权这台电脑。启用后用 SDK 里的 adb，而不是 `/usr/bin/adb`：

```bash
export PATH="$HOME/Android/Sdk/platform-tools:$PATH"
adb devices
```

## 配额数据

网页认两种返回。

进度服务（默认，`http://192.168.0.100:8766/api/progress`，另有 `GET /health`）：

```json
{ "progress": [44, 7, 18], "simulation": false }
```

三个数依次是 OpenAI 5 小时已用百分比、OpenAI 7 天已用百分比、Cursor 月度已用百分比。

伴侣服务（端口 8000）返回 `subscriptions` 数组，每项含 `id`、`name`、`remaining`、`total`、`unit`、`status`。没有密钥时 `status` 为 `demo`。

## 真机常亮

原生界面里已经加了 `FLAG_KEEP_SCREEN_ON`。ADB 可用之后，还可以在系统侧放开休眠：

```bash
adb shell settings put global stay_on_while_plugged_in 3
adb shell settings put system screen_off_timeout 2147483647
```

`dumpsys deviceidle whitelist` 是 Android 6 以后的 Doze 接口。这台是 API 28，命令可以用；2017 款的 Fire OS 5 没有这套 Doze。
