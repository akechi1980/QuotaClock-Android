package com.aidesk.dashboard.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson

class LocalCache(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ai_desk_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_LAST_DASHBOARD_JSON = "last_dashboard_json"
        private const val KEY_LAST_WEATHER_JSON = "last_weather_json"
        private const val KEY_CITY_CODE = "city_code"
        private const val KEY_KEEP_AWAKE = "keep_awake"
        private const val KEY_KEEP_AWAKE_CHARGING_ONLY = "keep_awake_charging_only"
        private const val KEY_BRIGHTNESS_PERCENT = "brightness_percent"
        private const val KEY_REFRESH_MINUTES = "refresh_minutes"
        private const val KEY_DEMO_MODE = "demo_mode"
        private const val KEY_XZ_OTA = "xz_ota_url"
        private const val KEY_XZ_MAC = "xz_mac"
        private const val KEY_XZ_UUID = "xz_uuid"
        private const val KEY_XZ_TOKEN = "xz_token"
        private const val KEY_XZ_WS = "xz_ws_url"
        private const val KEY_XZ_MQTT_ENDPOINT = "xz_mqtt_endpoint"
        private const val KEY_XZ_MQTT_CLIENT = "xz_mqtt_client"
        private const val KEY_XZ_MQTT_USER = "xz_mqtt_user"
        private const val KEY_XZ_MQTT_PASS = "xz_mqtt_pass"
        private const val KEY_XZ_MQTT_PUBLISH = "xz_mqtt_publish"
        private const val KEY_XZ_AUTHORIZED = "xz_authorized"
        private const val KEY_XZ_SHORTCUTS = "xz_shortcuts"

        const val DEFAULT_XZ_SHORTCUT = "AI科技简报\n最近国际国内新闻汇总"
        private const val KEY_XZ_NEWS_SHORTCUT = "xz_news_shortcut_added"

        const val DEFAULT_SERVER_URL = "http://192.168.0.100:8766/api/progress"
        const val DEFAULT_CITY_CODE = "101190401"
        const val DEFAULT_XZ_OTA = "https://api.tenclass.net/xiaozhi/ota/"
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value).apply()

    var cityCode: String
        get() = prefs.getString(KEY_CITY_CODE, DEFAULT_CITY_CODE) ?: DEFAULT_CITY_CODE
        set(value) = prefs.edit().putString(KEY_CITY_CODE, value).apply()

    var keepAwake: Boolean
        get() = prefs.getBoolean(KEY_KEEP_AWAKE, true)
        set(value) = prefs.edit().putBoolean(KEY_KEEP_AWAKE, value).apply()

    var keepAwakeChargingOnly: Boolean
        get() = prefs.getBoolean(KEY_KEEP_AWAKE_CHARGING_ONLY, false)
        set(value) = prefs.edit().putBoolean(KEY_KEEP_AWAKE_CHARGING_ONLY, value).apply()

    var brightnessPercent: Int
        get() = prefs.getInt(KEY_BRIGHTNESS_PERCENT, 100)
        set(value) = prefs.edit().putInt(KEY_BRIGHTNESS_PERCENT, value).apply()

    var autoRefreshMinutes: Float
        get() = prefs.getFloat(KEY_REFRESH_MINUTES, 3f)
        set(value) = prefs.edit().putFloat(KEY_REFRESH_MINUTES, value).apply()

    var demoMode: Boolean
        get() = prefs.getBoolean(KEY_DEMO_MODE, false)
        set(value) = prefs.edit().putBoolean(KEY_DEMO_MODE, value).apply()

    var xzOtaUrl: String
        get() = prefs.getString(KEY_XZ_OTA, DEFAULT_XZ_OTA) ?: DEFAULT_XZ_OTA
        set(value) = prefs.edit().putString(KEY_XZ_OTA, value).apply()

    var xzMac: String
        get() = prefs.getString(KEY_XZ_MAC, null) ?: newMac().also {
            prefs.edit().putString(KEY_XZ_MAC, it).apply()
        }
        set(value) = prefs.edit().putString(KEY_XZ_MAC, value).apply()

    var xzUuid: String
        get() = prefs.getString(KEY_XZ_UUID, null) ?: java.util.UUID.randomUUID().toString().also {
            prefs.edit().putString(KEY_XZ_UUID, it).apply()
        }
        set(value) = prefs.edit().putString(KEY_XZ_UUID, value).apply()

    var xzToken: String
        get() = prefs.getString(KEY_XZ_TOKEN, "test-token") ?: "test-token"
        set(value) = prefs.edit().putString(KEY_XZ_TOKEN, value).apply()

    var xzWsUrl: String
        get() = prefs.getString(KEY_XZ_WS, "") ?: ""
        set(value) = prefs.edit().putString(KEY_XZ_WS, value).apply()

    var xzMqttEndpoint: String
        get() = prefs.getString(KEY_XZ_MQTT_ENDPOINT, "") ?: ""
        set(value) = prefs.edit().putString(KEY_XZ_MQTT_ENDPOINT, value).apply()

    var xzMqttClientId: String
        get() = prefs.getString(KEY_XZ_MQTT_CLIENT, "") ?: ""
        set(value) = prefs.edit().putString(KEY_XZ_MQTT_CLIENT, value).apply()

    var xzMqttUsername: String
        get() = prefs.getString(KEY_XZ_MQTT_USER, "") ?: ""
        set(value) = prefs.edit().putString(KEY_XZ_MQTT_USER, value).apply()

    var xzMqttPassword: String
        get() = prefs.getString(KEY_XZ_MQTT_PASS, "") ?: ""
        set(value) = prefs.edit().putString(KEY_XZ_MQTT_PASS, value).apply()

    var xzMqttPublish: String
        get() = prefs.getString(KEY_XZ_MQTT_PUBLISH, "") ?: ""
        set(value) = prefs.edit().putString(KEY_XZ_MQTT_PUBLISH, value).apply()

    var xzAuthorized: Boolean
        get() = prefs.getBoolean(KEY_XZ_AUTHORIZED, false)
        set(value) = prefs.edit().putBoolean(KEY_XZ_AUTHORIZED, value).apply()

    var xzShortcutsText: String
        get() = prefs.getString(KEY_XZ_SHORTCUTS, null) ?: DEFAULT_XZ_SHORTCUT
        set(value) = prefs.edit().putString(KEY_XZ_SHORTCUTS, value).apply()

    fun xzShortcuts(): List<String> {
        val items = xzShortcutsText.lines().map { it.trim() }.filter { it.isNotEmpty() }
        return if (items.isEmpty()) listOf("AI科技简报", "最近国际国内新闻汇总") else items
    }

    /** 已有设备只补一次，之后用户在设置里删掉就不会再加回来。 */
    fun ensureNewsShortcut() {
        if (prefs.getBoolean(KEY_XZ_NEWS_SHORTCUT, false)) return
        val items = xzShortcuts().toMutableList()
        if (items.none { it == "最近国际国内新闻汇总" }) {
            items.add("最近国际国内新闻汇总")
            xzShortcutsText = items.joinToString("\n")
        }
        prefs.edit().putBoolean(KEY_XZ_NEWS_SHORTCUT, true).apply()
    }

    private fun newMac(): String {
        val bytes = ByteArray(6)
        java.security.SecureRandom().nextBytes(bytes)
        bytes[0] = ((bytes[0].toInt() and 0xFE) or 0x02).toByte()
        return bytes.joinToString(":") { "%02X".format(it) }
    }

    fun saveLastDashboard(response: DashboardResponse) {
        val json = gson.toJson(response)
        prefs.edit().putString(KEY_LAST_DASHBOARD_JSON, json).apply()
    }

    fun getLastDashboard(): DashboardResponse? {
        val json = prefs.getString(KEY_LAST_DASHBOARD_JSON, null) ?: return null
        return try {
            gson.fromJson(json, DashboardResponse::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun saveLastWeather(weather: DeskWeather) {
        prefs.edit().putString(KEY_LAST_WEATHER_JSON, gson.toJson(weather)).apply()
    }

    fun getLastWeather(): DeskWeather? {
        val json = prefs.getString(KEY_LAST_WEATHER_JSON, null) ?: return null
        return try {
            val weather = gson.fromJson(json, DeskWeather::class.java)
            if (weather.cityCode.isBlank() && weather.cityName.isBlank()) null else weather
        } catch (e: Exception) {
            null
        }
    }

    fun reset() {
        val mac = xzMac
        val uuid = xzUuid
        val authorized = xzAuthorized
        val shortcuts = xzShortcutsText
        val newsAdded = prefs.getBoolean(KEY_XZ_NEWS_SHORTCUT, false)
        prefs.edit().clear().apply()
        prefs.edit()
            .putString(KEY_XZ_MAC, mac)
            .putString(KEY_XZ_UUID, uuid)
            .putBoolean(KEY_XZ_AUTHORIZED, authorized)
            .putString(KEY_XZ_SHORTCUTS, shortcuts)
            .putBoolean(KEY_XZ_NEWS_SHORTCUT, newsAdded)
            .apply()
    }
}
