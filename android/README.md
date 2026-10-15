# AI Desk 原生工程

给 Fire HD 桌面用的原生壳，包名 `com.aidesk.dashboard`。能在浏览器里看的完整界面在仓库根目录的网页工程里；这个目录目前是骨架。

## 和真机的关系

插在这台电脑上的平板是 **Fire HD 8（2020，第 10 代，KFONWI）**：

- Fire OS 7 / Android 9 / API 28
- 1280×800，USB-C
- USB 已连接，接口只有 MTP，ADB 还没开

`minSdk` 是 22，`compileSdk` / `targetSdk` 是 33。22 是为了还能装上 2017 款（KFDOWI，Fire OS 5）。这台 2020 款不需要 API 22 那套 TLS 1.2 补丁；`ApiClient` 里的补丁只在 API 16–22 上生效。工程不依赖 Google Play 服务，局域网 HTTP 在 `network_security_config.xml` 里放行。

## 代码完成到哪

已经有的：

- 横屏沉浸布局：时钟、天气、四张配额卡的容器、底栏
- OkHttp 拉伴侣服务，Open-Meteo 拉天气，结果写入 `SharedPreferences`
- 充电时常亮、自定义亮度的窗口标志

还没接上的：

- `MainActivity` 里 `updateClockUI`、`renderWeather`、`renderDashboard`、`onBatteryStatusChanged` 是空函数，数据不会画到界面上
- 默认服务地址是 `http://192.168.0.100:8000/api/dashboard`，只解析 `subscriptions`，不认网页用的 `progress` 数组
- 没有 `gradlew`。`build_apk.sh` 会失败
- `local.properties` 指向 `/opt/android-sdk`。本机 SDK 在 `~/Android/Sdk`
- 本机没装 API 33 平台，按现在的 `compileSdk 33` 编不过

## 打开 ADB

1. 设置 → 设备选项。
2. 连点序列号，直到出现开发者选项。
3. 开发者选项里打开「启用 ADB」。
4. 重新插上 USB-C，在平板上允许这台电脑。

```bash
export PATH="$HOME/Android/Sdk/platform-tools:$PATH"
adb devices
```

看到序列号并且状态是 `device` 之后才能安装。现在这一步还没通。

## 以后编译时要先补上

```bash
# local.properties
sdk.dir=$HOME/Android/Sdk
```

另外需要 API 33 平台（或把 `compileSdk` 改成已经安装的 34 及以上），以及 Gradle Wrapper。系统没有独立 JDK，命令行编译要用 Android Studio 自带的 JBR：

```bash
export JAVA_HOME="$HOME/android-studio/jbr"
```

AGP 7.4.2 官方配到 JDK 17。Studio 自带的是 JDK 21，命令行直接编可能会被版本卡住，优先用 Android Studio 打开 `android/` 目录。

安装命令（产物出来、ADB 可用之后）：

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.aidesk.dashboard.debug/.MainActivity
```

Debug 包名带 `.debug` 后缀。常亮相关的系统设置见仓库根目录 `README.md`。
