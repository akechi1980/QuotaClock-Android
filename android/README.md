# 原生界面

装到 Fire HD 上的横屏应用，包名 `com.aidesk.dashboard`。浏览器里的同一块桌面在仓库根目录。

屏幕是 1280×800。时钟、天气、三张额度卡和小智对话在同一页。额度地址在设置里改，默认请求局域网里的进度服务。

`local.properties` 不进仓库。在本机写成自己的 SDK 路径：

```text
sdk.dir=$HOME/Android/Sdk
```

用 Android Studio 打开 `android/` 编译安装。调试包名是 `com.aidesk.dashboard.debug`。

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.aidesk.dashboard.debug/.MainActivity
```

常亮相关的系统设置见仓库根目录 `README.md`。
