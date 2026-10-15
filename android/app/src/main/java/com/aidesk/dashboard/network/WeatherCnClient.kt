package com.aidesk.dashboard.network

import com.aidesk.dashboard.data.DeskWeather
import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.IOException

object WeatherCnClient {
    private val gson = Gson()
    private const val USER_AGENT =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    suspend fun fetchWeather(cityCode: String): Result<DeskWeather> = withContext(Dispatchers.IO) {
        try {
            val code = cityCode.trim().ifEmpty { "101190401" }
            val url = "http://d1.weather.com.cn/weather_index/$code.html?_=${System.currentTimeMillis()}"
            val request = Request.Builder()
                .url(url)
                .header("Referer", "http://www.weather.com.cn/")
                .header("User-Agent", USER_AGENT)
                .get()
                .build()

            ApiClient.httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("Weather HTTP ${response.code()}"))
                }
                val body = response.body()?.string()
                    ?: return@withContext Result.failure(IOException("Empty weather body"))
                Result.success(parse(body, code))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun parse(source: String, cityCode: String): DeskWeather {
        val cityDz = extractObject(source, "cityDZ")
        val alarmDz = extractObject(source, "alarmDZ")
        val dataSk = extractObject(source, "dataSK")
        val forecast = extractObject(source, "fc")
        val todayInfo = cityDz.getAsJsonObject("weatherinfo")
        val days = forecast.getAsJsonArray("f")
        val today = if (days != null && days.size() > 0) days[0].asJsonObject else null

        val current = dataSk.str("weather").ifEmpty { todayInfo?.str("weather") ?: "多云" }
        val summary = todayInfo?.str("weather").orEmpty()
        val high = today?.str("fc")?.toIntOrNull() ?: todayInfo?.str("temp")?.toIntOrNull() ?: 0
        val low = today?.str("fd")?.toIntOrNull() ?: todayInfo?.str("tempn")?.toIntOrNull() ?: 0

        return DeskWeather(
            temperature = dataSk.str("temp").toDoubleOrNull() ?: 0.0,
            tempMax = high,
            tempMin = low,
            humidity = dataSk.str("SD").ifEmpty { dataSk.str("sd") }.removeSuffix("%").toIntOrNull() ?: 0,
            weather = current,
            todaySummary = summary.takeIf { it.isNotEmpty() && it != current },
            weatherCode = dataSk.str("weathercode").ifEmpty { todayInfo?.str("weathercode") ?: "d01" },
            cityName = dataSk.str("cityname").ifEmpty { todayInfo?.str("city") ?: cityCode },
            cityCode = dataSk.str("city").ifEmpty { cityCode },
            wind = listOf(dataSk.str("WD"), dataSk.str("WS")).filter { it.isNotEmpty() }.joinToString(" "),
            aqi = dataSk.str("aqi"),
            alarm = alarmTitle(alarmDz)
        )
    }

    private fun extractObject(source: String, varName: String): JsonObject {
        val marker = "var $varName"
        val idx = source.indexOf(marker)
        if (idx < 0) return JsonObject()
        val start = source.indexOf('{', idx)
        if (start < 0) return JsonObject()
        var depth = 0
        var inString = false
        var escaped = false
        for (i in start until source.length) {
            val ch = source[i]
            if (inString) {
                if (escaped) escaped = false
                else if (ch == '\\') escaped = true
                else if (ch == '"') inString = false
                continue
            }
            when (ch) {
                '"' -> inString = true
                '{' -> depth += 1
                '}' -> {
                    depth -= 1
                    if (depth == 0) {
                        return gson.fromJson(source.substring(start, i + 1), JsonObject::class.java)
                    }
                }
            }
        }
        return JsonObject()
    }

    private fun alarmTitle(alarm: JsonObject): String? {
        val items = alarm.getAsJsonArray("w") ?: return null
        if (items.size() == 0) return null
        val first = items[0]
        if (first.isJsonPrimitive) return first.asString
        if (!first.isJsonObject) return null
        val row = first.asJsonObject
        return listOf("w4", "w9", "w6", "w5")
            .mapNotNull { key -> row.str(key).takeIf { it.isNotEmpty() } }
            .firstOrNull()
            ?.take(36)
    }

    private fun JsonObject.str(key: String): String {
        val value = get(key) ?: return ""
        return if (value.isJsonNull) "" else value.asString.trim()
    }
}
