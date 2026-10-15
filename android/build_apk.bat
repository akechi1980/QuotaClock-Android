@echo off
chcp 65001 >nul
echo ========================================================
echo    AI Desk — Amazon Fire HD 8 (API 22) APK 一键构建脚本
echo ========================================================
echo.

if not defined ANDROID_HOME (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
        echo [自动定位] 已检测到 Android SDK 路径: %ANDROID_HOME%
    ) else (
        echo [提示] 未检测到 ANDROID_HOME 环境变量。
        echo 请确保电脑已安装 Android Studio 或 Android SDK。
    )
)

echo [1/2] 正在清理与准备依赖 (兼容 API 22 / Fire OS 5.7.1.0)...
call gradlew.bat assembleDebug --no-daemon

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  [成功] APK 编译完成！
    echo  APK 输出路径:
    echo  app\build\outputs\apk\debug\app-debug.apk
    echo ========================================================
    echo.
    echo [2/2] 是否立即通过 ADB 安装到已连接的 Fire HD 8 平板?
    set /p INSTALL_CHOICE="输入 Y 立即安装，或直接按回车退出: "
    if /i "%INSTALL_CHOICE%"=="Y" (
        adb devices
        echo 正在推送安装至平板...
        adb install -r app\build\outputs\apk\debug\app-debug.apk
        echo 安装指令已执行完成。
    )
) else (
    echo.
    echo [错误] 构建过程中出现异常，请检查 JDK 11/17 与 Android SDK 环境变量。
)

pause
