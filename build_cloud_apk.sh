#!/usr/bin/env bash
set -e

echo "=== [1/5] 安装 OpenJDK 17 与依赖工具 ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" --no-install-recommends openjdk-17-jdk-headless wget unzip curl
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
java -version

echo "=== [2/5] 准备 Android SDK 命令行工具 (放置在 /tmp/android-sdk 以防文件监控超时) ==="
export ANDROID_HOME=/tmp/android-sdk
mkdir -p $ANDROID_HOME/cmdline-tools
if [ ! -f /tmp/cmdline-tools.zip ]; then
    wget -q -O /tmp/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
fi
unzip -q -o /tmp/cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools
rm -rf $ANDROID_HOME/cmdline-tools/latest
mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest
rm -f /tmp/cmdline-tools.zip

yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses --sdk_root=$ANDROID_HOME > /dev/null 2>&1 || true
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --sdk_root=$ANDROID_HOME "platforms;android-33" "build-tools;30.0.3" "build-tools;33.0.1"
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

echo "=== [3/5] 准备 Gradle 7.5 (放置在 /tmp/gradle) ==="
if [ ! -f /tmp/gradle/gradle-7.5/bin/gradle ]; then
    mkdir -p /tmp/gradle
    wget -q -O /tmp/gradle-7.5-bin.zip https://services.gradle.org/distributions/gradle-7.5-bin.zip
    unzip -q -o /tmp/gradle-7.5-bin.zip -d /tmp/gradle
    rm -f /tmp/gradle-7.5-bin.zip
fi
export PATH=/tmp/gradle/gradle-7.5/bin:$PATH
gradle -v | head -n 8

echo "=== [4/5] 编译 Fire HD 8 / API 22 原生 APK ==="
echo "sdk.dir=/tmp/android-sdk" > /app/applet/android/local.properties
cd /app/applet/android

# 使用 /tmp/.gradle 隔离构建缓存，避免向 workspace 灌入数万碎片文件
export GRADLE_USER_HOME=/tmp/.gradle
nice -n 10 /tmp/gradle/gradle-7.5/bin/gradle assembleDebug --no-daemon -Dorg.gradle.jvmargs="-Xmx1536m" -Dorg.gradle.workers.max=2

echo "=== [5/5] 输出 APK 并清理工作区碎片文件 ==="
APK_SOURCE="/app/applet/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_SOURCE" ]; then
    mkdir -p /app/applet/public
    cp "$APK_SOURCE" /app/applet/public/aidesk-debug.apk
    cp "$APK_SOURCE" /app/applet/aidesk-debug.apk
    
    # 立即清理 android/app/build 与 .gradle 缓存目录，防止平台监控超时
    rm -rf /app/applet/android/app/build /app/applet/android/.gradle
    
    echo "========================================================"
    echo "SUCCESS: 编译成功！"
    echo "APK 路径: /app/applet/public/aidesk-debug.apk"
    echo "文件大小: $(ls -lh /app/applet/public/aidesk-debug.apk | awk '{print $5}')"
    echo "Web 访问路径: http://localhost:3000/aidesk-debug.apk"
    echo "========================================================"
else
    echo "ERROR: 未找到产物 $APK_SOURCE"
    exit 1
fi
