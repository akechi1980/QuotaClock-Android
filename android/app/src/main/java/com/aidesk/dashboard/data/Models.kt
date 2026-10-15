package com.aidesk.dashboard.data

import com.google.gson.annotations.SerializedName

/**
 * Root response from Windows PC Companion service
 */
data class DashboardResponse(
    @SerializedName("subscriptions")
    val subscriptions: List<SubscriptionItem>? = null,

    @SerializedName("agent")
    val agent: AgentInfo? = null,

    @SerializedName("timestamp")
    val timestamp: Long? = null
)

/**
 * Single subscription card data
 * Tolerates null for unknown or unmonitored metrics
 */
data class SubscriptionItem(
    @SerializedName("id")
    val id: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("plan")
    val plan: String? = null,

    @SerializedName("remaining")
    val remaining: Double? = null,

    @SerializedName("total")
    val total: Double? = null,

    @SerializedName("unit")
    val unit: String? = "messages", // e.g. "messages", "tokens", "credits", "USD"

    @SerializedName("resetAt")
    val resetAt: String? = null, // ISO-8601 string or epoch millis

    @SerializedName("updatedAt")
    val updatedAt: String? = null,

    @SerializedName("status")
    val status: String? = "unknown", // "active", "warning", "expired", "demo", "unknown"

    @SerializedName("type")
    val type: String? = null // e.g. "subscription" vs "api_credits"
)

/**
 * AI Agent State on the Windows PC
 */
data class AgentInfo(
    @SerializedName("status")
    val status: String = "idle", // "idle", "listening", "thinking", "responding"

    @SerializedName("currentTask")
    val currentTask: String? = null,

    @SerializedName("audioLevel")
    val audioLevel: Float? = null
)

data class DeskWeather(
    val temperature: Double = 0.0,
    val tempMax: Int = 0,
    val tempMin: Int = 0,
    val humidity: Int = 0,
    val weather: String = "",
    val todaySummary: String? = null,
    val weatherCode: String = "d01",
    val cityName: String = "",
    val cityCode: String = "",
    val wind: String = "",
    val aqi: String = "",
    val alarm: String? = null
)

/**
 * Open-Meteo Current Weather Response Model
 */
data class OpenMeteoResponse(
    @SerializedName("latitude")
    val latitude: Double,

    @SerializedName("longitude")
    val longitude: Double,

    @SerializedName("current")
    val current: CurrentUnitsAndData? = null,

    @SerializedName("daily")
    val daily: DailyUnitsAndData? = null
)

data class CurrentUnitsAndData(
    @SerializedName("time")
    val time: String? = null,

    @SerializedName("temperature_2m")
    val temperature: Double? = null,

    @SerializedName("relative_humidity_2m")
    val humidity: Int? = null,

    @SerializedName("weather_code")
    val weatherCode: Int? = null,

    @SerializedName("apparent_temperature")
    val apparentTemperature: Double? = null,

    @SerializedName("wind_speed_10m")
    val windSpeed: Double? = null
)

data class DailyUnitsAndData(
    @SerializedName("time")
    val time: List<String>? = null,

    @SerializedName("temperature_2m_max")
    val tempMax: List<Double>? = null,

    @SerializedName("temperature_2m_min")
    val tempMin: List<Double>? = null,

    @SerializedName("weather_code")
    val weatherCode: List<Int>? = null
)
