#!/usr/bin/env bash
set -e

echo "========================================================"
echo "   AI Desk — Amazon Fire HD 8 (API 22) APK 一键构建脚本"
echo "========================================================"

# Auto-detect ANDROID_HOME on macOS / Linux
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        echo "[自动定位] macOS Android SDK: $ANDROID_HOME"
    elif [ -d "$HOME/Android/Sdk" ]; then
        export ANDROID_HOME="$HOME/Android/Sdk"
        echo "[自动定位] Linux Android SDK: $ANDROID_HOME"
    fi
fi

chmod +x gradlew
echo "[1/2] 正在构建 Debug APK (严格适配 API 22)..."
./gradlew assembleDebug --no-daemon

echo ""
echo "========================================================"
echo " [成功] APK 编译完成！"
echo " 输出位置: app/build/outputs/apk/debug/app-debug.apk"
echo "========================================================"

read -p "是否立即通过 ADB 安装至 Fire HD 8 平板? [y/N]: " choice
if [[ "$choice" =~ ^[Yy]$ ]]; then
    adb devices
    echo "正在推送安装..."
    adb install -r app/build/outputs/apk/debug/app-debug.apk
    echo "安装完成！"
fi
