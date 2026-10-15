package com.aidesk.dashboard

import android.Manifest
import android.app.Dialog
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.ConnectivityManager
import android.os.BatteryManager
import android.os.Bundle
import android.view.View
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import android.view.WindowManager
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.res.ResourcesCompat
import androidx.lifecycle.lifecycleScope
import com.aidesk.dashboard.data.DashboardResponse
import com.aidesk.dashboard.data.DeskWeather
import com.aidesk.dashboard.data.LocalCache
import com.aidesk.dashboard.data.SubscriptionItem
import com.aidesk.dashboard.network.ApiClient
import com.aidesk.dashboard.network.WeatherCnClient
import com.aidesk.dashboard.network.XiaozhiClient
import com.aidesk.dashboard.ui.WaveformView
import com.aidesk.dashboard.ui.WeatherGlyphView
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.roundToInt

class MainActivity : AppCompatActivity() {

    private lateinit var cache: LocalCache
    private lateinit var xiaozhi: XiaozhiClient
    private var clockJob: Job? = null
    private var weatherJob: Job? = null
    private var dashboardJob: Job? = null
    private var speakJob: Job? = null

    private val dateFormat = SimpleDateFormat("yyyy.MM.dd", Locale.US)
    private val syncFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    private val days = arrayOf("SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT")
    private var isPowerConnected = false
    private var agentStatus = "idle"
    private var serverOnline = false

    private val batteryReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            intent ?: return
            val status = intent.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
            isPowerConnected = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL
            val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            val batteryPct = if (level >= 0 && scale > 0) level * 100 / scale else 100
            updateScreenWakeLock()
            onBatteryStatusChanged(batteryPct, isPowerConnected)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        cache = LocalCache(this)
        xiaozhi = XiaozhiClient(cache, this)
        xiaozhi.listener = xiaozhiListener
        enableImmersiveSticky()
        applyCustomBrightness()
        updateScreenWakeLock()
        setContentView(R.layout.activity_main)
        bindChrome()
        updateWifiStatus()
        registerReceiver(batteryReceiver, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        startClockTicker()
        startWeatherCycle()
        startDashboardCycle()
        refreshXiaozhi()
    }

    override fun onResume() {
        super.onResume()
        enableImmersiveSticky()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enableImmersiveSticky()
    }

    private fun enableImmersiveSticky() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
    }

    private fun updateScreenWakeLock() {
        val stayOn = cache.keepAwake && (!cache.keepAwakeChargingOnly || isPowerConnected)
        if (stayOn) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun applyCustomBrightness() {
        val lp = window.attributes
        lp.screenBrightness = (cache.brightnessPercent / 100f).coerceIn(0.5f, 1f)
        window.attributes = lp
        findViewById<TextView>(R.id.tv_brightness)?.text = "${cache.brightnessPercent}%"
    }

    private fun bindChrome() {
        val row = findViewById<LinearLayout>(R.id.weekday_row)
        row.removeAllViews()
        val gap = (3 * resources.displayMetrics.density).toInt()
        days.forEach { label ->
            val chip = TextView(this)
            chip.text = label
            chip.textSize = 8f
            chip.typeface = ResourcesCompat.getFont(this, R.font.share_tech_mono)
            chip.setSingleLine(true)
            val pad = (2 * resources.displayMetrics.density).toInt()
            chip.setPadding(pad, 0, pad, 0)
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.marginEnd = gap
            chip.layoutParams = params
            row.addView(chip)
        }
        findViewById<TextView>(R.id.tv_tz).text = TimeZone.getDefault().id.uppercase(Locale.US)
        findViewById<View>(R.id.btn_brightness).setOnClickListener { cycleBrightness() }
        findViewById<View>(R.id.btn_settings).setOnClickListener { showSettings() }
        findViewById<View>(R.id.btn_weather_refresh).setOnClickListener { refreshWeatherNow() }
        findViewById<View>(R.id.btn_xz_action).setOnClickListener { onXiaozhiAction() }
        findViewById<View>(R.id.btn_xz_mute).setOnClickListener { togglePlaybackMute() }
        findViewById<View>(R.id.btn_xz_reset).setOnClickListener { resetConversation() }
        findViewById<View>(R.id.btn_agent).setOnClickListener { onXiaozhiAction() }
        findViewById<View>(R.id.btn_xz_bound).setOnClickListener { refreshXiaozhi() }
        cache.ensureNewsShortcut()
        if (cache.xzAuthorized) {
            findViewById<View>(R.id.panel_xz_auth).visibility = View.GONE
            findViewById<View>(R.id.panel_xz_chat).visibility = View.VISIBLE
        }
        renderShortcuts()
        renderAgent()
        showReadyLine()
    }

    private fun startClockTicker() {
        clockJob?.cancel()
        clockJob = lifecycleScope.launch {
            while (isActive) {
                val now = Date()
                findViewById<TextView>(R.id.tv_date).text = dateFormat.format(now)
                val today = Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1
                val row = findViewById<LinearLayout>(R.id.weekday_row)
                for (i in 0 until row.childCount) {
                    val chip = row.getChildAt(i) as TextView
                    val active = i == today
                    chip.setBackgroundResource(if (active) R.drawable.bg_day_on else R.drawable.bg_day_off)
                    chip.setTextColor(if (active) Color.BLACK else Color.rgb(113, 113, 122))
                }
                delay(1000)
            }
        }
    }

    private fun startWeatherCycle() {
        weatherJob?.cancel()
        weatherJob = lifecycleScope.launch {
            cache.getLastWeather()?.let { renderWeather(it, true) }
            while (isActive) {
                val result = WeatherCnClient.fetchWeather(cache.cityCode)
                result.onSuccess {
                    cache.saveLastWeather(it)
                    renderWeather(it, false)
                }.onFailure {
                    cache.getLastWeather()?.let { cached -> renderWeather(cached, true) }
                }
                delay(30 * 60 * 1000L)
            }
        }
    }

    private fun refreshWeatherNow() {
        lifecycleScope.launch {
            val result = WeatherCnClient.fetchWeather(cache.cityCode)
            result.onSuccess {
                cache.saveLastWeather(it)
                renderWeather(it, false)
            }
        }
    }

    private fun startDashboardCycle() {
        dashboardJob?.cancel()
        dashboardJob = lifecycleScope.launch {
            if (!cache.demoMode) {
                cache.getLastDashboard()?.let { renderDashboard(it, true) }
            }
            while (isActive) {
                if (cache.demoMode) {
                    renderDashboard(demoDashboard(), false)
                } else {
                    val result = ApiClient.fetchDashboard(cache.serverUrl)
                    result.onSuccess { data ->
                        cache.saveLastDashboard(data)
                        renderDashboard(data, true)
                    }.onFailure {
                        val last = cache.getLastDashboard()
                        if (last != null) renderDashboard(last, false)
                        else renderDashboard(disconnectedPlaceholder(), false)
                    }
                }
                val wait = (cache.autoRefreshMinutes * 60f * 1000f).toLong().coerceAtLeast(15_000L)
                delay(wait)
            }
        }
    }

    private fun renderWeather(weather: DeskWeather, isCached: Boolean) {
        findViewById<WeatherGlyphView>(R.id.weather_glyph).setWeatherCode(weather.weatherCode)
        val temp = weather.temperature.roundToInt()
        findViewById<TextView>(R.id.tv_weather_temp).text = "${temp}°"
        findViewById<TextView>(R.id.tv_weather_desc).text = weather.weather
        val cityLine = buildString {
            append(weather.cityName.ifEmpty { "苏州" })
            if (!weather.todaySummary.isNullOrBlank()) append(" · ").append(weather.todaySummary)
            if (isCached) append(" · 缓存")
        }
        findViewById<TextView>(R.id.tv_weather_city).text = cityLine
        findViewById<TextView>(R.id.tv_weather_details).text =
            "高 ${weather.tempMax}°  低 ${weather.tempMin}°  湿度 ${weather.humidity}%"
        val alarm = findViewById<TextView>(R.id.tv_weather_alarm)
        if (weather.alarm.isNullOrBlank()) {
            alarm.visibility = View.GONE
        } else {
            alarm.visibility = View.VISIBLE
            alarm.text = weather.alarm
        }
    }

    private fun renderDashboard(data: DashboardResponse, isServerOnline: Boolean) {
        serverOnline = isServerOnline && !cache.demoMode
        val items = data.subscriptions?.takeIf { it.isNotEmpty() }
            ?: disconnectedPlaceholder().subscriptions.orEmpty()
        val container = findViewById<LinearLayout>(R.id.cards_container)
        if (container.childCount != items.size) {
            container.removeAllViews()
            val gap = (8 * resources.displayMetrics.density).toInt()
            items.forEachIndexed { index, _ ->
                val card = layoutInflater.inflate(R.layout.item_quota_card, container, false)
                val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f)
                if (index < items.lastIndex) params.marginEnd = gap
                card.layoutParams = params
                container.addView(card)
            }
        }
        items.forEachIndexed { index, item ->
            bindQuotaCard(container.getChildAt(index), item)
        }
        findViewById<TextView>(R.id.tv_quota_count).text = "(${items.size} 平台指标)"
        val badge = findViewById<TextView>(R.id.tv_source_badge)
        val host = findViewById<TextView>(R.id.tv_server_status)
        when {
            cache.demoMode -> {
                badge.text = "DEMO"
                badge.setTextColor(Color.rgb(161, 161, 170))
                badge.setBackgroundResource(R.drawable.bg_chip)
                host.text = "HOST: DEMO"
            }
            serverOnline -> {
                badge.text = "LIVE"
                badge.setTextColor(Color.BLACK)
                badge.setBackgroundResource(R.drawable.bg_day_on)
                host.text = "HOST: ONLINE"
                host.setTextColor(Color.WHITE)
            }
            else -> {
                badge.text = "未连接"
                badge.setTextColor(Color.rgb(113, 113, 122))
                badge.setBackgroundResource(R.drawable.bg_chip)
                host.text = "HOST: OFFLINE"
                host.setTextColor(Color.rgb(113, 113, 122))
            }
        }
        if (serverOnline || cache.demoMode) {
            findViewById<TextView>(R.id.tv_sync).text = "SYNC: ${syncFormat.format(Date())}"
        }
    }

    private fun bindQuotaCard(card: View, item: SubscriptionItem) {
        val offline = item.remaining == null || item.status == "disconnected"
        card.findViewById<TextView>(R.id.tv_card_name).text = item.name
        card.findViewById<View>(R.id.group_metrics).visibility = if (offline) View.GONE else View.VISIBLE
        card.findViewById<View>(R.id.group_offline).visibility = if (offline) View.VISIBLE else View.GONE
        card.findViewById<View>(R.id.btn_card_demo).setOnClickListener {
            cache.demoMode = true
            startDashboardCycle()
        }
        card.findViewById<View>(R.id.btn_card_settings).setOnClickListener { showSettings() }
        val total = item.total
        val remaining = item.remaining
        val used = if (total != null && total > 0 && remaining != null) {
            ((total - remaining) / total * 100).roundToInt().coerceIn(0, 100)
        } else 0
        card.findViewById<TextView>(R.id.tv_card_used).text = "$used%"
        card.findViewById<TextView>(R.id.tv_card_remaining).text = "剩余 ${100 - used}%"
        renderBlocks(card.findViewById(R.id.blocks_container), used)
        val badge = card.findViewById<TextView>(R.id.tv_card_badge)
        when {
            offline || !serverOnline && !cache.demoMode -> {
                badge.visibility = View.VISIBLE
                badge.text = "OFF"
                badge.setTextColor(Color.rgb(113, 113, 122))
                badge.setBackgroundResource(R.drawable.bg_chip)
            }
            item.status == "sim" || item.status == "demo" || cache.demoMode -> {
                badge.visibility = View.VISIBLE
                badge.text = if (item.status == "demo") "DEMO" else "SIM"
                badge.setTextColor(Color.WHITE)
                badge.setBackgroundResource(R.drawable.bg_chip)
            }
            else -> badge.visibility = View.GONE
        }
    }

    private fun renderBlocks(container: LinearLayout, used: Int) {
        val filled = (used / 5.0).roundToInt().coerceIn(0, 20)
        if (container.childCount != 20) {
            container.removeAllViews()
            val gap = (2 * resources.displayMetrics.density).toInt()
            repeat(20) { index ->
                val block = View(this)
                val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f)
                if (index < 19) params.marginEnd = gap
                block.layoutParams = params
                container.addView(block)
            }
        }
        for (index in 0 until 20) {
            container.getChildAt(index).setBackgroundColor(
                if (index < filled) Color.WHITE else Color.rgb(39, 39, 42)
            )
        }
    }

    private fun cycleBrightness() {
        cache.brightnessPercent = when (cache.brightnessPercent) {
            100 -> 120
            120 -> 85
            else -> 100
        }
        applyCustomBrightness()
    }

    private val xiaozhiListener = object : XiaozhiClient.Listener {
        override fun onPhase(phase: String, detail: String) {
            runOnUiThread {
                if (!cache.xzAuthorized) return@runOnUiThread
                agentStatus = phase
                findViewById<TextView>(R.id.tv_xz_status).text = detail
                renderAgent()
            }
        }

        override fun onActivation(code: String, message: String) {
            runOnUiThread {
                showAuthGate(code, message.ifBlank { "在 xiaozhi.me 输入这个验证码。授权完成前不能对话。" })
            }
        }

        override fun onUserText(text: String) {
            runOnUiThread {
                if (!cache.xzAuthorized) return@runOnUiThread
                showUserLine(text)
            }
        }

        override fun onAssistantDelta(text: String) {
            runOnUiThread {
                if (!cache.xzAuthorized) return@runOnUiThread
                appendAnswer(text)
            }
        }

        override fun onAssistantReset() {
            runOnUiThread { openAnswerBubble() }
        }

        override fun onTool(name: String) {
            runOnUiThread { showToolLine(name) }
        }
    }

    private fun showAuthGate(code: String?, hint: String) {
        cache.xzAuthorized = false
        xiaozhi.disconnect()
        findViewById<View>(R.id.panel_xz_auth).visibility = View.VISIBLE
        findViewById<View>(R.id.panel_xz_chat).visibility = View.GONE
        findViewById<View>(R.id.wave_panel).visibility = View.INVISIBLE
        findViewById<TextView>(R.id.tv_xz_status).text = "未授权"
        findViewById<TextView>(R.id.tv_xz_code).text = code?.takeIf { it.isNotBlank() } ?: "------"
        findViewById<TextView>(R.id.tv_xz_auth_hint).text = hint
        agentStatus = "idle"
        renderAgent()
    }

    private fun showChat(status: String) {
        cache.xzAuthorized = true
        findViewById<View>(R.id.panel_xz_auth).visibility = View.GONE
        findViewById<View>(R.id.panel_xz_chat).visibility = View.VISIBLE
        findViewById<View>(R.id.wave_panel).visibility = View.VISIBLE
        findViewById<TextView>(R.id.tv_xz_status).text = status
        agentStatus = "connecting"
        renderAgent()
    }

    private fun refreshXiaozhi() {
        if (!cache.xzAuthorized) {
            findViewById<TextView>(R.id.tv_xz_auth_hint).text = "正在向 OTA 确认授权"
            findViewById<TextView>(R.id.tv_xz_status).text = "确认中"
        } else {
            findViewById<TextView>(R.id.tv_xz_status).text = "正在确认授权"
        }
        lifecycleScope.launch {
            val outcome = try {
                withContext(Dispatchers.IO) { xiaozhi.requestOta() }
            } catch (error: Exception) {
                runOnUiThread {
                    if (cache.xzAuthorized) {
                        findViewById<TextView>(R.id.tv_xz_status).text = "确认失败"
                        showUserLine(error.message ?: "OTA 失败")
                    } else {
                        showAuthGate(
                            findViewById<TextView>(R.id.tv_xz_code).text?.toString(),
                            "申请验证码失败：${error.message}"
                        )
                    }
                }
                return@launch
            }
            if (!outcome.code.isNullOrBlank()) {
                runOnUiThread {
                    val hint = if (outcome.message.isNullOrBlank()) {
                        "在 xiaozhi.me 输入这个验证码。授权完成前不能对话。"
                    } else {
                        outcome.message.replace("\n", " ")
                    }
                    showAuthGate(outcome.code, hint)
                }
                return@launch
            }
            val waiting = try {
                withContext(Dispatchers.IO) { xiaozhi.confirmActivation() == false }
            } catch (error: Exception) {
                false
            }
            if (waiting) {
                runOnUiThread {
                    showAuthGate(null, "xiaozhi.me 还没有确认这台设备，授权完成前不能对话。")
                }
                return@launch
            }
            if (outcome.websocketUrl.isBlank() && cache.xzMqttEndpoint.isBlank()) {
                runOnUiThread { showAuthGate(null, "服务器没有返回对话地址，暂时不能使用。") }
                return@launch
            }
            cache.xzAuthorized = true
            showChat("正在连接")
            xiaozhi.connect()
        }
    }

    private fun renderShortcuts() {
        val row = findViewById<LinearLayout>(R.id.xz_shortcuts)
        row.removeAllViews()
        val gap = (8 * resources.displayMetrics.density).toInt()
        cache.xzShortcuts().forEach { phrase ->
            val chip = TextView(this)
            chip.text = phrase
            chip.setBackgroundResource(R.drawable.bg_chip)
            chip.setTextColor(Color.WHITE)
            chip.textSize = 11f
            chip.setPadding(gap, gap / 2, gap, gap / 2)
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.marginStart = gap
            chip.layoutParams = params
            chip.setOnClickListener { sendPhrase(phrase) }
            row.addView(chip)
        }
    }

    private var userView: TextView? = null
    private var answerView: TextView? = null
    private var mcpView: TextView? = null

    private fun messageList(): LinearLayout = findViewById(R.id.xz_messages)

    private fun showReadyLine() {
        if (messageList().childCount > 0) return
        addBotBubble("小智已就绪。正在保持待命，您可以通过语音唤醒或点击下方预设指令进行对话。")
        userView = null
        answerView = null
        mcpView = null
    }

    private fun showUserLine(text: String) {
        if (text.isBlank()) return
        if (userView?.text?.toString() == text) return
        if (messageList().childCount == 1 && userView == null && answerView == null) {
            messageList().removeAllViews()
        }
        userView = addUserBubble(text)
        answerView = null
        mcpView = null
        scrollChat()
    }

    private fun openAnswerBubble() {
        if (answerView == null) {
            answerView = addBotBubble("")
        } else {
            answerView?.text = ""
        }
        mcpView?.text = ""
        mcpView?.visibility = View.GONE
        scrollChat()
    }

    private fun appendAnswer(text: String) {
        if (text.isBlank()) return
        if (answerView == null) answerView = addBotBubble("")
        val current = answerView?.text?.toString().orEmpty()
        answerView?.text = if (current.isBlank() || current == "…") text else "$current\n$text"
        scrollChat()
    }

    private fun showToolLine(name: String) {
        if (mcpView == null) {
            if (answerView == null) answerView = addBotBubble("")
        }
        mcpView?.text = "MCP 指令已执行: $name"
        mcpView?.visibility = View.VISIBLE
        scrollChat()
    }

    private fun addUserBubble(text: String): TextView {
        val row = newRow(android.view.Gravity.END)
        val line = TextView(this)
        line.text = text
        line.setBackgroundResource(R.drawable.bg_chip)
        line.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
        line.textSize = 11f
        line.maxWidth = (420 * resources.displayMetrics.density).toInt()
        val pad = (8 * resources.displayMetrics.density).toInt()
        line.setPadding(pad, pad - 2, pad, pad - 2)
        row.addView(line)
        row.addView(avatar(R.drawable.ic_user, "用户"))
        messageList().addView(row, turnParams())
        return line
    }

    private fun addBotBubble(text: String): TextView {
        val row = newRow(android.view.Gravity.START)
        row.addView(avatar(R.drawable.ic_bot, "小智"))
        val column = LinearLayout(this)
        column.orientation = LinearLayout.VERTICAL
        val columnParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        columnParams.marginStart = (8 * resources.displayMetrics.density).toInt()
        column.layoutParams = columnParams
        val line = TextView(this)
        line.text = text
        line.setBackgroundResource(R.drawable.bg_chip)
        line.setTextColor(ContextCompat.getColor(this, R.color.text_primary))
        line.textSize = 11f
        val pad = (8 * resources.displayMetrics.density).toInt()
        line.setPadding(pad, pad, pad, pad)
        line.setLineSpacing(1f, 1f)
        column.addView(line)
        val mcp = TextView(this)
        mcp.setBackgroundResource(R.drawable.bg_chip)
        mcp.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
        mcp.textSize = 11f
        mcp.typeface = android.graphics.Typeface.MONOSPACE
        mcp.setPadding(pad, pad / 2, pad, pad / 2)
        mcp.visibility = View.GONE
        val mcpParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        mcpParams.topMargin = (6 * resources.displayMetrics.density).toInt()
        mcp.layoutParams = mcpParams
        column.addView(mcp)
        row.addView(column)
        messageList().addView(row, turnParams())
        mcpView = mcp
        return line
    }

    private fun newRow(gravity: Int): LinearLayout {
        val row = LinearLayout(this)
        row.orientation = LinearLayout.HORIZONTAL
        row.gravity = gravity or android.view.Gravity.TOP
        return row
    }

    private fun turnParams(): LinearLayout.LayoutParams {
        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )
        params.topMargin = (8 * resources.displayMetrics.density).toInt()
        return params
    }

    private fun avatar(icon: Int, description: String): ImageView {
        val size = (22 * resources.displayMetrics.density).toInt()
        val view = ImageView(this)
        view.setImageResource(icon)
        view.setBackgroundResource(R.drawable.bg_chip)
        view.contentDescription = description
        val pad = (3 * resources.displayMetrics.density).toInt()
        view.setPadding(pad, pad, pad, pad)
        val params = LinearLayout.LayoutParams(size, size)
        if (icon == R.drawable.ic_user) params.marginStart = (8 * resources.displayMetrics.density).toInt()
        view.layoutParams = params
        return view
    }

    private fun scrollChat() {
        val scroll = findViewById<ScrollView>(R.id.xz_scroll)
        scroll.post { scroll.fullScroll(View.FOCUS_DOWN) }
    }

    private fun sendPhrase(text: String) {
        if (!cache.xzAuthorized) return
        showUserLine(text)
        answerView = addBotBubble("…")
        scrollChat()
        val sent = xiaozhi.sendText(text)
        if (!sent) {
            findViewById<TextView>(R.id.tv_xz_status).text = "已记下，正在连接"
        }
    }

    private var playbackMuted = false

    private fun resetConversation() {
        xiaozhi.resetConversation()
        messageList().removeAllViews()
        userView = null
        answerView = null
        mcpView = null
        showReadyLine()
    }

    private fun togglePlaybackMute() {
        playbackMuted = !playbackMuted
        xiaozhi.setPlaybackMuted(playbackMuted)
        val button = findViewById<TextView>(R.id.btn_xz_mute)
        button.text = if (playbackMuted) "静音" else "声音"
        button.setCompoundDrawablesWithIntrinsicBounds(
            if (playbackMuted) R.drawable.ic_volume_off else R.drawable.ic_volume,
            0,
            0,
            0
        )
    }

    private fun onXiaozhiAction() {
        if (!cache.xzAuthorized) {
            refreshXiaozhi()
            return
        }
        if (agentStatus == "listening") {
            xiaozhi.stopVoice()
            return
        }
        if (agentStatus == "responding" || agentStatus == "thinking") {
            xiaozhi.abort()
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_MIC)
            return
        }
        xiaozhi.startVoice()
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != REQUEST_MIC) return
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            xiaozhi.startVoice()
        } else {
            findViewById<TextView>(R.id.tv_xz_status).text = "没有录音权限"
        }
    }

    private fun renderAgent() {
        val short = when (agentStatus) {
            "listening" -> "倾听中"
            "thinking" -> "推理中"
            "responding" -> "播报中"
            "connecting" -> "连接中"
            else -> "待命"
        }
        val action = when {
            !cache.xzAuthorized -> "刷新验证码"
            agentStatus == "thinking" || agentStatus == "responding" -> "打断播报"
            agentStatus == "listening" -> "停止录音"
            else -> "开始交流"
        }
        findViewById<TextView>(R.id.btn_agent).text = short
        findViewById<TextView>(R.id.btn_xz_action).text = action
        findViewById<WaveformView>(R.id.wave_panel).status = agentStatus
    }

    private fun showSettings() {
        val dialog = Dialog(this)
        dialog.setContentView(R.layout.dialog_settings)
        dialog.window?.setLayout(
            (resources.displayMetrics.widthPixels * 0.46f).toInt(),
            WindowManager.LayoutParams.WRAP_CONTENT
        )
        val server = dialog.findViewById<EditText>(R.id.et_server)
        val city = dialog.findViewById<EditText>(R.id.et_city_code)
        val ota = dialog.findViewById<EditText>(R.id.et_ota)
        val shortcuts = dialog.findViewById<EditText>(R.id.et_shortcuts)
        val probe = dialog.findViewById<TextView>(R.id.tv_probe)
        val demo = dialog.findViewById<CheckBox>(R.id.cb_demo)
        val awake = dialog.findViewById<CheckBox>(R.id.cb_awake)
        val awakeCharge = dialog.findViewById<CheckBox>(R.id.cb_awake_charge)
        val seek = dialog.findViewById<SeekBar>(R.id.seek_brightness)
        val brightLabel = dialog.findViewById<TextView>(R.id.tv_brightness_label)
        server.setText(cache.serverUrl)
        city.setText(cache.cityCode)
        ota.setText(cache.xzOtaUrl)
        shortcuts.setText(cache.xzShortcutsText)
        demo.isChecked = cache.demoMode
        awake.isChecked = cache.keepAwake
        awakeCharge.isChecked = cache.keepAwakeChargingOnly
        seek.progress = (cache.brightnessPercent - 50).coerceIn(0, 70)
        brightLabel.text = "亮度 ${cache.brightnessPercent}%"
        seek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(bar: SeekBar?, progress: Int, fromUser: Boolean) {
                brightLabel.text = "亮度 ${progress + 50}%"
            }
            override fun onStartTrackingTouch(bar: SeekBar?) = Unit
            override fun onStopTrackingTouch(bar: SeekBar?) = Unit
        })
        val refreshValues = floatArrayOf(0.5f, 1f, 3f, 5f)
        val refreshLabels = arrayOf("30秒", "1分钟", "3分钟", "5分钟")
        var selectedRefresh = cache.autoRefreshMinutes
        val refreshRow = dialog.findViewById<LinearLayout>(R.id.refresh_row)
        val chips = mutableListOf<TextView>()
        refreshLabels.forEachIndexed { index, label ->
            val chip = TextView(this)
            chip.text = label
            chip.setPadding(18, 8, 18, 8)
            chip.setTextColor(Color.WHITE)
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            params.marginEnd = 8
            chip.layoutParams = params
            chip.setOnClickListener {
                selectedRefresh = refreshValues[index]
                chips.forEachIndexed { chipIndex, view ->
                    val on = chipIndex == index
                    view.setBackgroundResource(if (on) R.drawable.bg_day_on else R.drawable.bg_chip)
                    view.setTextColor(if (on) Color.BLACK else Color.WHITE)
                }
            }
            chips += chip
            refreshRow.addView(chip)
        }
        val selectedIndex = refreshValues.indexOfFirst { it == selectedRefresh }.let { if (it < 0) 2 else it }
        chips[selectedIndex].performClick()
        dialog.findViewById<View>(R.id.btn_test).setOnClickListener {
            probe.text = "测试中"
            lifecycleScope.launch {
                val result = ApiClient.fetchDashboard(server.text.toString().trim())
                probe.text = if (result.isSuccess) "已连通" else "连不上，检查地址"
            }
        }
        dialog.findViewById<View>(R.id.btn_reset).setOnClickListener {
            cache.reset()
            applyCustomBrightness()
            updateScreenWakeLock()
            dialog.dismiss()
            startWeatherCycle()
            startDashboardCycle()
            refreshXiaozhi()
        }
        dialog.findViewById<View>(R.id.btn_done).setOnClickListener {
            val url = server.text.toString().trim()
            if (url.isNotEmpty()) cache.serverUrl = url
            val code = city.text.toString().filter { it.isDigit() }.take(9)
            cache.cityCode = code.ifEmpty { LocalCache.DEFAULT_CITY_CODE }
            val otaUrl = ota.text.toString().trim()
            cache.xzOtaUrl = otaUrl.ifEmpty { LocalCache.DEFAULT_XZ_OTA }
            cache.xzShortcutsText = shortcuts.text.toString().trim().ifEmpty { LocalCache.DEFAULT_XZ_SHORTCUT }
            renderShortcuts()
            cache.demoMode = demo.isChecked
            cache.keepAwake = awake.isChecked
            cache.keepAwakeChargingOnly = awakeCharge.isChecked
            cache.brightnessPercent = seek.progress + 50
            cache.autoRefreshMinutes = selectedRefresh
            applyCustomBrightness()
            updateScreenWakeLock()
            dialog.dismiss()
            startWeatherCycle()
            startDashboardCycle()
            refreshXiaozhi()
        }
        dialog.show()
    }

    private fun onBatteryStatusChanged(pct: Int, charging: Boolean) {
        val ac = if (charging) " (AC)" else ""
        findViewById<TextView>(R.id.tv_battery_status).text = "BAT: $pct%$ac"
        updateWifiStatus()
    }

    @Suppress("DEPRECATION")
    private fun updateWifiStatus() {
        val manager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val online = manager.activeNetworkInfo?.isConnected == true
        findViewById<TextView>(R.id.tv_wifi_status).text = if (online) "WIFI: ON" else "WIFI: OFF"
    }

    private fun disconnectedPlaceholder(): DashboardResponse {
        return DashboardResponse(
            subscriptions = listOf(
                SubscriptionItem(id = "openai_5h", name = "OpenAI 5h", status = "disconnected"),
                SubscriptionItem(id = "openai_7d", name = "OpenAI 7d", status = "disconnected"),
                SubscriptionItem(id = "cursor_plan", name = "Cursor", status = "disconnected")
            )
        )
    }

    private fun demoDashboard(): DashboardResponse {
        return DashboardResponse(
            subscriptions = listOf(
                SubscriptionItem(id = "openai_5h", name = "OpenAI 5h", remaining = 75.0, total = 100.0, status = "sim", type = "progress"),
                SubscriptionItem(id = "openai_7d", name = "OpenAI 7d", remaining = 50.0, total = 100.0, status = "sim", type = "progress"),
                SubscriptionItem(id = "cursor_plan", name = "Cursor", remaining = 25.0, total = 100.0, status = "sim", type = "progress")
            )
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(batteryReceiver)
        } catch (_: Exception) {
        }
        clockJob?.cancel()
        weatherJob?.cancel()
        dashboardJob?.cancel()
        speakJob?.cancel()
        xiaozhi.disconnect()
    }

    companion object {
        private const val REQUEST_MIC = 41
    }
}
