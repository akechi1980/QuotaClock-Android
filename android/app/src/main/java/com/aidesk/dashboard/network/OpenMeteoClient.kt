package com.aidesk.dashboard.network

import com.aidesk.dashboard.data.OpenMeteoResponse
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.IOException

object OpenMeteoClient {
    private val gson = Gson()

    /**
     * Fetch weather from Open-Meteo (No API key required)
     */
    suspend fun fetchWeather(lat: Double, lng: Double): Result<OpenMeteoResponse> = withContext(Dispatchers.IO) {
        try {
            val url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lng" +
                    "&current=temperature_2m,relative_humidity_2m,weather_code,apparent_temperature,wind_speed_10m" +
                    "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"

            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "AIDesk-Tablet/1.0 (FireHD8-API22)")
                .get()
                .build()

            ApiClient.httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("Weather HTTP Error: ${response.code()}"))
                }
                val body = response.body()?.string() ?: return@withContext Result.failure(IOException("Empty weather body"))
                val data = gson.fromJson(body, OpenMeteoResponse::class.java)
                Result.success(data)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Map WMO weather code to description
     */
    fun getWeatherDescription(code: Int?): String = when (code) {
        0 -> "晴朗"
        1 -> "大部分晴朗"
        2 -> "多云"
        3 -> "阴天"
        45, 48 -> "大雾 / 冰雾"
        51, 53, 55 -> "毛毛雨"
        61, 63, 65 -> "阵雨 / 雨"
        71, 73, 75 -> "小雪 / 大雪"
        77 -> "雪粒"
        80, 81, 82 -> "强阵雨"
        85, 86 -> "阵雪"
        95, 96, 99 -> "雷阵雨"
        else -> "多云"
    }
}
