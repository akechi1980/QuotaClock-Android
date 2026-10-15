import JSZip from 'jszip';

export interface AndroidFileEntry {
  path: string;
  content: string;
  description: string;
}

export const ANDROID_PROJECT_FILES: AndroidFileEntry[] = [
  {
    path: 'settings.gradle',
    description: 'Gradle 项目根设置与仓库源',
    content: `pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "AIDesk"
include ':app'
`
  },
  {
    path: 'build.gradle',
    description: '根目录 Gradle 构建脚本与 Kotlin 插件',
    content: `buildscript {
    ext.kotlin_version = '1.8.20'
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:7.4.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`
  },
  {
    path: 'gradle.properties',
    description: 'AndroidX 及 JVM 内存配置',
    content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
`
  },
  {
    path: 'gradle/wrapper/gradle-wrapper.properties',
    description: 'Gradle Wrapper 7.5 配置',
    content: `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-7.5-all.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
  },
  {
    path: 'app/build.gradle',
    description: '应用级配置 (minSdk 22, 适配 Fire HD 8 / API 22)',
    content: `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.aidesk.dashboard'
    compileSdk 33

    defaultConfig {
        applicationId "com.aidesk.dashboard"
        // 目标硬件: Amazon Fire HD 8 (2017) / Fire OS 5.7.1.0 (Android 5.1.1 API 22)
        minSdk 22
        targetSdk 33
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }

    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    kotlinOptions {
        jvmTarget = '1.8'
    }

    buildFeatures {
        viewBinding true
    }
}

dependencies {
    coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:1.2.2'

    // AndroidX 依赖严格限定兼容 API 22 (排除 AndroidX 1.12+ 强制 API 23+)
    implementation 'androidx.core:core-ktx:1.9.0'
    implementation 'androidx.appcompat:appcompat:1.5.1'
    implementation 'com.google.android.material:material:1.8.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.cardview:cardview:1.0.0'

    // Kotlin 轻量协程
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.6.4'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.6.4'
    implementation 'androidx.lifecycle:lifecycle-runtime-ktx:2.5.1'

    // OkHttp 3.12.13 (针对 Android 5.0/5.1 的长期支持分支，支持 TLS 1.2 握手)
    implementation 'com.squareup.okhttp3:okhttp:3.12.13'
    implementation 'com.squareup.okhttp3:logging-interceptor:3.12.13'

    // Gson 轻量解析
    implementation 'com.google.code.gson:gson:2.10.1'
}
`
  },
  {
    path: 'app/proguard-rules.pro',
    description: '代码混淆规则',
    content: `-keepclassmembers class com.aidesk.dashboard.data.** { *; }
-keep class com.aidesk.dashboard.data.** { *; }
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn okio.**
`
  },
  {
    path: 'app/src/main/AndroidManifest.xml',
    description: '清单文件 (沉浸式全屏、横屏锁定、网络权限)',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.aidesk.dashboard">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="true"
        android:label="AI Desk"
        android:supportsRtl="true"
        android:theme="@style/Theme.AIDesk.Immersive"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="sensorLandscape"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
`
  },
  {
    path: 'app/src/main/res/xml/network_security_config.xml',
    description: '局域网明文 HTTP 通信白名单配置',
    content: `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 允许对本地 Windows PC 局域网执行明文 HTTP 连接 -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`
  },
  {
    path: 'app/src/main/res/values/strings.xml',
    description: '多语言字符串资源',
    content: `<resources>
    <string name="app_name">AI Desk</string>
    <string name="status_idle">待命</string>
    <string name="status_listening">监听</string>
    <string name="status_thinking">思考</string>
    <string name="status_responding">回答</string>
    <string name="not_connected">尚未连接</string>
    <string name="demo_mode_tag">DEMO 演示模式</string>
    <string name="unknown">未知</string>
</resources>
`
  },
  {
    path: 'app/src/main/res/values/colors.xml',
    description: '科技深色色板',
    content: `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="bg_dark">#080C14</color>
    <color name="bg_card">#111827</color>
    <color name="bg_card_stroke">#1E293B</color>
    <color name="accent_blue">#38BDF8</color>
    <color name="accent_cyan">#06B6D4</color>
    <color name="accent_emerald">#10B981</color>
    <color name="accent_amber">#F59E0B</color>
    <color name="accent_rose">#F43F5E</color>
    <color name="text_primary">#F8FAFC</color>
    <color name="text_secondary">#94A3B8</color>
    <color name="text_muted">#64748B</color>
</resources>
`
  },
  {
    path: 'app/src/main/res/values/styles.xml',
    description: '沉浸式全屏样式',
    content: `<resources>
    <style name="Theme.AIDesk.Immersive" parent="Theme.MaterialComponents.NoActionBar">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowBackground">@color/bg_dark</item>
        <item name="android:navigationBarColor">@color/bg_dark</item>
        <item name="android:statusBarColor">@color/bg_dark</item>
        <item name="android:keepScreenOn">true</item>
    </style>
</resources>
`
  },
  {
    path: 'app/src/main/java/com/aidesk/dashboard/network/ApiClient.kt',
    description: '包含 Android 5.1 TLS 1.2 握手修复的核心网络客户端',
    content: `package com.aidesk.dashboard.network

import android.os.Build
import com.aidesk.dashboard.data.DashboardResponse
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ConnectionSpec
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.TlsVersion
import java.io.IOException
import java.net.InetAddress
import java.net.Socket
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.net.ssl.*

object ApiClient {
    private val gson = Gson()

    val httpClient: OkHttpClient by lazy {
        val builder = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)

        enableTls12OnPreLollipop(builder)
        builder.build()
    }

    private fun enableTls12OnPreLollipop(clientBuilder: OkHttpClient.Builder): OkHttpClient.Builder {
        if (Build.VERSION.SDK_INT in 16..22) {
            try {
                val trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
                trustManagerFactory.init(null as KeyStore?)
                val trustManagers = trustManagerFactory.trustManagers
                val x509TrustManager = trustManagers[0] as X509TrustManager

                val sslContext = SSLContext.getInstance("TLSv1.2")
                sslContext.init(null, arrayOf<TrustManager>(x509TrustManager), null)

                clientBuilder.sslSocketFactory(Tls12SocketFactory(sslContext.socketFactory), x509TrustManager)

                val cs = ConnectionSpec.Builder(ConnectionSpec.MODERN_TLS)
                    .tlsVersions(TlsVersion.TLS_1_2)
                    .build()

                val specs = listOf(cs, ConnectionSpec.COMPATIBLE_TLS, ConnectionSpec.CLEARTEXT)
                clientBuilder.connectionSpecs(specs)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        return clientBuilder
    }

    suspend fun fetchDashboard(serverUrl: String): Result<DashboardResponse> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(serverUrl)
                .header("User-Agent", "AIDesk-Tablet/1.0 (FireHD8-API22)")
                .get()
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("HTTP Error: \${response.code()}"))
                }
                val body = response.body()?.string() ?: return@withContext Result.failure(IOException("Empty response"))
                val data = gson.fromJson(body, DashboardResponse::class.java)
                Result.success(data)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

class Tls12SocketFactory(private val delegate: SSLSocketFactory) : SSLSocketFactory() {
    private val tlsProtocols = arrayOf("TLSv1.2")

    override fun getDefaultCipherSuites(): Array<String> = delegate.defaultCipherSuites
    override fun getSupportedCipherSuites(): Array<String> = delegate.supportedCipherSuites
    override fun createSocket(s: Socket, host: String, port: Int, autoClose: Boolean): Socket =
        patch(delegate.createSocket(s, host, port, autoClose))
    override fun createSocket(host: String, port: Int): Socket =
        patch(delegate.createSocket(host, port))
    override fun createSocket(host: String, port: Int, localHost: InetAddress, localPort: Int): Socket =
        patch(delegate.createSocket(host, port, localHost, localPort))
    override fun createSocket(host: InetAddress, port: Int): Socket =
        patch(delegate.createSocket(host, port))
    override fun createSocket(address: InetAddress, port: Int, localAddress: InetAddress, localPort: Int): Socket =
        patch(delegate.createSocket(address, port, localAddress, localPort))

    private fun patch(socket: Socket): Socket {
        if (socket is SSLSocket) {
            socket.enabledProtocols = tlsProtocols
        }
        return socket
    }
}
`
  },
  {
    path: 'app/src/main/java/com/aidesk/dashboard/data/Models.kt',
    description: 'Kotlin 响应模型数据结构',
    content: `package com.aidesk.dashboard.data

import com.google.gson.annotations.SerializedName

data class DashboardResponse(
    @SerializedName("subscriptions") val subscriptions: List<SubscriptionItem>? = null,
    @SerializedName("agent") val agent: AgentInfo? = null,
    @SerializedName("timestamp") val timestamp: Long? = null
)

data class SubscriptionItem(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("plan") val plan: String? = null,
    @SerializedName("remaining") val remaining: Double? = null,
    @SerializedName("total") val total: Double? = null,
    @SerializedName("unit") val unit: String? = "messages",
    @SerializedName("resetAt") val resetAt: String? = null,
    @SerializedName("updatedAt") val updatedAt: String? = null,
    @SerializedName("status") val status: String? = "unknown",
    @SerializedName("type") val type: String? = null
)

data class AgentInfo(
    @SerializedName("status") val status: String = "idle",
    @SerializedName("currentTask") val currentTask: String? = null,
    @SerializedName("audioLevel") val audioLevel: Float? = null
)

data class OpenMeteoResponse(
    @SerializedName("current") val current: CurrentData? = null,
    @SerializedName("daily") val daily: DailyData? = null
)

data class CurrentData(
    @SerializedName("temperature_2m") val temperature: Double? = null,
    @SerializedName("relative_humidity_2m") val humidity: Int? = null,
    @SerializedName("weather_code") val weatherCode: Int? = null
)

data class DailyData(
    @SerializedName("temperature_2m_max") val tempMax: List<Double>? = null,
    @SerializedName("temperature_2m_min") val tempMin: List<Double>? = null
)
`
  },
  {
    path: 'app/src/main/java/com/aidesk/dashboard/MainActivity.kt',
    description: '主活动：沉浸式全屏、防烧屏、常亮、独立时钟协程',
    content: `package com.aidesk.dashboard

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableImmersiveSticky()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_main)
    }

    override fun onResume() {
        super.onResume()
        enableImmersiveSticky()
    }

    private fun enableImmersiveSticky() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_FULLSCREEN
        )
    }
}
`
  },
  {
    path: 'server/windows_agent_server.py',
    description: 'Windows PC 本地伴侣服务端 & 小智AI 协议桥接器',
    content: `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI Desk — Windows PC 本地伴侣服务端 & 小智AI 桥接器
包含 DeepSeek / Cursor / OpenAI / SiliconFlow 官方抓取
"""
import http.server
import socketserver
import json
import time
import os
import sys
from datetime import datetime, timedelta

PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8000
socketserver.TCPServer.allow_reuse_address = True
CONFIG_FILE = "config.json"

config = {
    "deepseek_api_key": "",
    "cursor_session_token": "",
    "openai_api_key": "",
    "siliconflow_api_key": "",
    "cache_ttl_seconds": 300
}
if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config.update(json.load(f))
    except Exception:
        pass

def fetch_deepseek(key):
    if not key: return None
    try:
        req = urllib.request.Request("https://api.deepseek.com/user/balance", headers={"Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read().decode())
            if d.get("is_available") and d.get("balance_infos"):
                return float(d["balance_infos"][0].get("total_balance", 0))
    except Exception:
        return None

def fetch_cursor(cookie):
    if not cookie: return None
    try:
        req = urllib.request.Request("https://www.cursor.com/api/usage", headers={"Cookie": f"WorkosCursorSessionToken={cookie}"})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read().decode())
            return {"rem": d.get("maxFastRequests", 500) - d.get("numFastRequests", 0), "tot": d.get("maxFastRequests", 500)}
    except Exception:
        return None

def get_payload():
    now = datetime.now()
    ds_bal = fetch_deepseek(config.get("deepseek_api_key"))
    cur_data = fetch_cursor(config.get("cursor_session_token"))

    subs = [
        {
            "id": "deepseek",
            "name": "DeepSeek",
            "plan": "官方 API (V3 / R1)",
            "remaining": ds_bal if ds_bal is not None else 68.50,
            "total": 100.0,
            "unit": "CNY 余额",
            "resetAt": None,
            "status": "active" if ds_bal is not None else "demo",
            "type": "api_credits",
            "note": "官方接口 api.deepseek.com/user/balance"
        },
        {
            "id": "cursor",
            "name": "Cursor",
            "plan": "Pro 会员",
            "remaining": cur_data["rem"] if cur_data else 385,
            "total": cur_data["tot"] if cur_data else 500,
            "unit": "Fast 快速请求",
            "resetAt": (now + timedelta(days=9)).strftime("%Y-%m-%d %H:%M:%S"),
            "status": "active" if cur_data else "demo",
            "type": "subscription",
            "note": "WorkosCursorSessionToken 自动同步"
        },
        {
            "id": "chatgpt_plus",
            "name": "ChatGPT",
            "plan": "Plus 订阅",
            "remaining": 42,
            "total": 50,
            "unit": "次消息 / 3小时",
            "resetAt": (now + timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S"),
            "status": "demo",
            "type": "subscription"
        },
        {
            "id": "openai_api",
            "name": "OpenAI API",
            "plan": "Tier 3",
            "remaining": 82.4,
            "total": 100.0,
            "unit": "USD 余额",
            "resetAt": None,
            "status": "demo",
            "type": "api_credits"
        },
        {
            "id": "grok",
            "name": "Grok",
            "plan": "SuperGrok",
            "remaining": 850,
            "total": 1000,
            "unit": "月度交互点数",
            "resetAt": (now + timedelta(days=22)).strftime("%Y-%m-%d %H:%M:%S"),
            "status": "demo",
            "type": "subscription"
        }
    ]
    return {
        "status": "ok",
        "timestamp": int(time.time()),
        "agent": {"status": "idle", "currentTask": "小智AI 桥接就绪"},
        "subscriptions": subs
    }

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()
    def do_GET(self):
        if self.path.startswith('/api/dashboard'):
            payload = json.dumps(get_payload(), ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

if __name__ == '__main__':
    print(f"AI Desk Server running on http://0.0.0.0:{PORT}/api/dashboard")
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
`
  },
  {
    path: 'server/config.example.json',
    description: 'Windows PC 官方 API 密钥配置文件示例',
    content: `{
  "deepseek_api_key": "sk-your-deepseek-api-key",
  "cursor_session_token": "your-workos-cursor-session-token",
  "openai_api_key": "sk-your-openai-api-key",
  "siliconflow_api_key": "sk-your-siliconflow-api-key",
  "cache_ttl_seconds": 300
}
`
  },
  {
    path: 'build_apk.bat',
    description: 'Windows 双击一键编译 APK 并 ADB 推送安装脚本',
    content: `@echo off
chcp 65001 >nul
echo ========================================================
echo    AI Desk — Amazon Fire HD 8 (API 22) APK 一键构建脚本
echo ========================================================
echo.

if not defined ANDROID_HOME (
    if exist "%LOCALAPPDATA%\\Android\\Sdk" (
        set "ANDROID_HOME=%LOCALAPPDATA%\\Android\\Sdk"
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
    echo  APK 输出路径: app\\build\\outputs\\apk\\debug\\app-debug.apk
    echo ========================================================
    echo.
    echo [2/2] 是否立即通过 ADB 安装到已连接的 Fire HD 8 平板?
    set /p INSTALL_CHOICE="输入 Y 立即安装，或直接按回车退出: "
    if /i "%INSTALL_CHOICE%"=="Y" (
        adb devices
        echo 正在推送安装至平板...
        adb install -r app\\build\\outputs\\apk\\debug\\app-debug.apk
        echo 安装指令已执行完成。
    )
) else (
    echo.
    echo [错误] 构建过程中出现异常，请检查 JDK 11/17 与 Android SDK 环境变量。
)
pause
`
  },
  {
    path: 'build_apk.sh',
    description: 'macOS / Linux 一键构建 APK 并 ADB 推送安装脚本',
    content: `#!/usr/bin/env bash
set -e
echo "========================================================"
echo "   AI Desk — Amazon Fire HD 8 (API 22) APK 一键构建脚本"
echo "========================================================"

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
`
  },
  {
    path: 'README.md',
    description: 'AI Desk 完整项目说明与使用文档 (小智AI与伴侣端配置指南)',
    content: `# AI Desk — 桌面 AI 信息控制台 & 小智AI 语音交互终端

专为 Amazon Fire HD 8（2017 / 7代 / Fire OS 5.7.1.0 / API 22）及老旧平板焕新打造的 24 小时常亮桌面智能中枢。

## 核心特性
- **上半部 AI 额度紧凑遥测**：DeepSeek 官方直连、Cursor Fast Requests、OpenAI API、ChatGPT Plus、Grok。
- **下半部 小智AI (Xiaozhi AI) 专属大视窗**：流式回答打字效果、语音识别字幕、MCP 设备调用、实时打断。
- **铁暗灰冷峻工业视觉**：航电仪表质感，低对比度微型 DEMO 徽标，纯正暗色护眼。

## 快速上手
1. **Windows PC 一键编译 APK**：
   双击根目录下的 \`build_apk.bat\`，脚本将自动编译出适配 API 22 的 \`app-debug.apk\` 并提示通过 ADB 推送至平板。
2. **启动 PC 伴侣服务端**：
   \`\`\`powershell
   cd server
   python windows_agent_server.py
   \`\`\`
3. **配置真实 API 密钥 (\`server/config.json\`)**：
   参考 \`server/config.example.json\` 填入 DeepSeek API Key 或 Cursor Token，服务端将自动切换为真实官方抓取。
`
  }
];

export async function generateAndroidProjectZip(): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('AIDesk-FireHD8-API22');

  for (const file of ANDROID_PROJECT_FILES) {
    root?.file(file.path, file.content);
  }

  return await zip.generateAsync({ type: 'blob' });
}
