package com.aidesk.dashboard.network

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.aidesk.dashboard.data.LocalCache
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.OutputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLSocket
import javax.net.ssl.SSLSocketFactory
import kotlin.concurrent.thread

/**
 * 小智客户端。身份只用本机已经生成并保存在设备上的 MAC / UUID，
 * 这组识别码对应 xiaozhi.me 里已登录的 firehd-desk。
 *
 * 官方 OTA 同时返回 WebSocket 和 MQTT。公开的 wss 地址在握手后会被关掉，
 * 同一套设备凭证走 MQTT 才能完成 hello 并收到回复。没有 MQTT 参数时才退回 WebSocket。
 */
class XiaozhiClient(private val cache: LocalCache, context: Context) {
    interface Listener {
        fun onPhase(phase: String, detail: String)
        fun onActivation(code: String, message: String)
        fun onUserText(text: String)
        fun onAssistantDelta(text: String)
        fun onAssistantReset()
        fun onTool(name: String)
    }

    var listener: Listener? = null
    private val voice = XiaozhiVoice(context.applicationContext)

    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    private val socketHttp = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()

    private val mainHandler = Handler(Looper.getMainLooper())
    private val writeLock = Any()
    private val mqttWriter = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "xiaozhi-mqtt-write").apply { isDaemon = true }
    }

    private var socket: WebSocket? = null
    private var mqttSocket: Socket? = null
    private var mqttOut: OutputStream? = null
    private var sessionId: String? = null
    private var handshakeDone = false
    private var pendingText: String? = null
    private var lastOutbound: String? = null
    @Volatile private var helloInFlight = false
    @Volatile private var awaitingReply = false
    private var replyTicket = 0
    @Volatile private var connectionGen = 0

    fun disconnect() {
        connectionGen += 1
        conversationOpen = false
        handshakeDone = false
        helloInFlight = false
        awaitingReply = false
        sessionId = null
        socket?.close(1000, "bye")
        socket = null
        voice.close()
        closeMqtt()
    }

    fun setPlaybackMuted(muted: Boolean) {
        voice.setPlaybackMuted(muted)
    }

    fun startVoice() {
        if (!handshakeDone) {
            listener?.onPhase("idle", "还没连上，不能录音")
            return
        }
        val payload = JSONObject()
            .put("type", "listen")
            .put("state", "start")
            .put("mode", "manual")
        sessionId?.let { payload.put("session_id", it) }
        sendJson(payload)
        try {
            voice.startCapture()
        } catch (error: Exception) {
            Log.e(TAG, "mic", error)
            listener?.onPhase("idle", error.message ?: "录音失败")
            return
        }
        if (discardUntilStop) expectNewTurn = true
        conversationOpen = true
        listener?.onPhase("listening", "正在听")
    }

    private var conversationOpen = false
    private var discardUntilStop = false
    private var expectNewTurn = false

    fun stopVoice() {
        conversationOpen = false
        voice.stopCapture()
        sendListenStop()
        listener?.onPhase("idle", "已连接，可以发送")
    }

    fun resetConversation() {
        conversationOpen = false
        discardUntilStop = true
        expectNewTurn = false
        awaitingReply = false
        replyTicket += 1
        pendingText = null
        lastOutbound = null
        voice.stopCapture()
        voice.interruptPlayback()
        sendAbort()
        listener?.onPhase("idle", "已清空")
    }

    private fun sendListenStop() {
        if (!handshakeDone) return
        val payload = JSONObject()
            .put("type", "listen")
            .put("state", "stop")
        sessionId?.let { payload.put("session_id", it) }
        sendJson(payload)
    }

    fun requestOta(): OtaOutcome {
        val url = cache.xzOtaUrl.trim().ifEmpty { LocalCache.DEFAULT_XZ_OTA }
        val deviceId = cache.xzMac
        val clientId = cache.xzUuid
        Log.i(TAG, "ota device=$deviceId client=$clientId")
        val bodyJson = JSONObject()
            .put(
                "application",
                JSONObject()
                    .put("version", "1.8.2")
                    .put("elf_sha256", "c8a8ecb6d6fbcda682494d9675cd1ead240ecf38bdde75282a42365a0e396033")
            )
            .put(
                "board",
                JSONObject()
                    .put("type", "bread-compact-wifi")
                    .put("name", "firehd-desk")
                    .put("ssid", "FireHD")
                    .put("rssi", -55)
                    .put("channel", 1)
                    .put("ip", localIpv4())
                    .put("mac", deviceId)
            )
        val request = Request.Builder()
            .url(url)
            .post(RequestBody.create(JSON_TYPE, bodyJson.toString()))
            .header("Client-Id", clientId)
            .header("Device-Id", deviceId)
            .header("Content-Type", "application/json")
            .header("User-Agent", "firehd-desk/1.8.2")
            .header("Activation-Version", "1")
            .build()
        http.newCall(request).execute().use { response ->
            val raw = response.body()?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IllegalStateException("OTA ${response.code()} ${raw.take(180)}")
            }
            val json = JSONObject(raw)
            val activation = json.optJSONObject("activation")
            val socketInfo = json.optJSONObject("websocket")
            val ws = socketInfo?.optString("url").orEmpty()
            val token = socketInfo?.optString("token").orEmpty()
            if (ws.isNotBlank()) cache.xzWsUrl = ws
            if (token.isNotBlank()) cache.xzToken = token
            val mqtt = json.optJSONObject("mqtt")
            if (mqtt != null) {
                cache.xzMqttEndpoint = mqtt.optString("endpoint")
                cache.xzMqttClientId = mqtt.optString("client_id")
                cache.xzMqttUsername = mqtt.optString("username")
                cache.xzMqttPassword = mqtt.optString("password")
                val publish = mqtt.optString("publish_topic")
                cache.xzMqttPublish = if (publish.isBlank() || publish == "null") "device-server" else publish
            }
            if (activation != null) {
                val code = activation.optString("code")
                val message = activation.optString("message")
                return OtaOutcome(code, message, ws)
            }
            return OtaOutcome(null, null, ws)
        }
    }

    /** 200 已激活，202 用户还没在站点确认。 */
    fun confirmActivation(): Boolean {
        val base = cache.xzOtaUrl.trim().ifEmpty { LocalCache.DEFAULT_XZ_OTA }.trimEnd('/')
        val request = Request.Builder()
            .url("$base/activate")
            .post(RequestBody.create(JSON_TYPE, "{}"))
            .header("Client-Id", cache.xzUuid)
            .header("Device-Id", cache.xzMac)
            .header("Content-Type", "application/json")
            .header("User-Agent", "firehd-desk/1.8.2")
            .header("Activation-Version", "1")
            .build()
        http.newCall(request).execute().use { response ->
            val raw = response.body()?.string().orEmpty()
            Log.i(TAG, "activate ${response.code()} device=${cache.xzMac} ${raw.take(80)}")
            if (response.code() == 200) return true
            if (response.code() == 202) return false
            throw IllegalStateException("activate ${response.code()} ${raw.take(120)}")
        }
    }

    fun connect() {
        disconnect()
        val gen = connectionGen
        listener?.onPhase("connecting", "正在连接")
        mainHandler.postDelayed({
            if (gen == connectionGen && !handshakeDone) {
                listener?.onPhase("idle", "握手超时")
            }
        }, 12_000)
        if (cache.xzMqttEndpoint.isNotBlank() && cache.xzMqttClientId.isNotBlank()) {
            startMqtt(gen)
        } else if (cache.xzWsUrl.isNotBlank()) {
            connectWebSocket(gen, cache.xzWsUrl)
        } else {
            listener?.onPhase("idle", "没有对话地址")
        }
    }

    fun sendText(text: String): Boolean {
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return false
        if (!handshakeDone) {
            pendingText = trimmed
            if (mqttOut != null || socket != null) requestSession()
            else if (cache.xzMqttEndpoint.isNotBlank() || cache.xzWsUrl.isNotBlank()) connect()
            return false
        }
        dispatchText(trimmed)
        return true
    }

    private fun requestSession() {
        if (helloInFlight) return
        if (mqttOut == null && socket == null) {
            connect()
            return
        }
        helloInFlight = true
        val udp = mqttOut != null
        Log.i(TAG, "rehello device=${cache.xzMac}")
        sendJson(helloJson(if (udp) 3 else 1, if (udp) "udp" else "websocket"))
        listener?.onPhase("connecting", "正在重新连接")
        val gen = connectionGen
        mainHandler.postDelayed({
            if (gen == connectionGen && helloInFlight && !handshakeDone) {
                helloInFlight = false
                listener?.onPhase("idle", "握手超时")
            }
        }, 12_000)
    }

    fun abort() {
        discardUntilStop = true
        expectNewTurn = false
        awaitingReply = false
        replyTicket += 1
        voice.stopCapture()
        voice.interruptPlayback()
        sendAbort()
        if (conversationOpen) {
            listener?.onPhase("listening", "正在听")
        } else {
            listener?.onPhase("idle", "已打断")
        }
    }

    private fun sendAbort() {
        if (!handshakeDone) return
        val payload = JSONObject().put("type", "abort").put("reason", "user_interrupt")
        sessionId?.let { payload.put("session_id", it) }
        sendJson(payload)
    }

    private fun startMqtt(gen: Int) {
        thread(name = "xiaozhi-mqtt", isDaemon = true) {
            var opened: Socket? = null
            try {
                val endpoint = parseEndpoint(cache.xzMqttEndpoint)
                Log.i(TAG, "mqtt device=${cache.xzMac} ${endpoint.first}:${endpoint.second}")
                val ssl = SSLSocketFactory.getDefault().createSocket() as SSLSocket
                opened = ssl
                ssl.connect(InetSocketAddress(endpoint.first, endpoint.second), 15_000)
                ssl.startHandshake()
                if (gen != connectionGen) {
                    ssl.close()
                    return@thread
                }
                synchronized(writeLock) {
                    mqttSocket = ssl
                    mqttOut = ssl.outputStream
                }
                writeMqtt(
                    connectPacket(
                        cache.xzMqttClientId,
                        cache.xzMqttUsername,
                        cache.xzMqttPassword
                    )
                )
                schedulePing(gen)
                val input = DataInputStream(ssl.inputStream)
                while (gen == connectionGen) {
                    val packet = readPacket(input) ?: break
                    handleMqttPacket(gen, packet)
                }
                if (gen == connectionGen) {
                    listener?.onPhase("idle", "连接已断开")
                }
            } catch (error: Exception) {
                if (gen == connectionGen) {
                    Log.e(TAG, "mqtt", error)
                    listener?.onPhase("idle", error.message ?: "连接失败")
                }
            } finally {
                if (gen == connectionGen) closeMqtt() else opened?.close()
            }
        }
    }

    private fun handleMqttPacket(gen: Int, packet: MqttPacket) {
        if (gen != connectionGen) return
        when (packet.type) {
            2 -> {
                val code = packet.body.getOrNull(1)?.toInt()?.and(0xFF) ?: -1
                if (code != 0) {
                    listener?.onPhase("idle", "连接被拒绝 $code")
                    return
                }
                writeMqtt(subscribePacket(deviceTopic()))
                helloInFlight = true
                sendJson(helloJson(3, "udp"))
            }
            3 -> {
                val text = decodePublish(packet) ?: return
                Log.i(TAG, "recv ${text.take(160)}")
                handleIncoming(text)
            }
            9, 13 -> Unit
            else -> Log.i(TAG, "mqtt type=${packet.type}")
        }
    }

    private fun connectWebSocket(gen: Int, wsUrl: String) {
        Log.i(TAG, "websocket device=${cache.xzMac}")
        val request = Request.Builder()
            .url(wsUrl.trim())
            .header("Device-Id", cache.xzMac)
            .header("Client-Id", cache.xzUuid)
            .header("Protocol-Version", "1")
            .header("Authorization", "Bearer ${cache.xzToken.ifBlank { "test-token" }}")
            .build()
        socket = socketHttp.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                if (gen != connectionGen) return
                webSocket.send(helloJson(1, "websocket").toString())
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                if (gen != connectionGen) return
                handleIncoming(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                if (gen != connectionGen) return
                Log.e(TAG, "websocket", t)
                handshakeDone = false
                listener?.onPhase("idle", t.message ?: "连接失败")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                if (gen != connectionGen || socket != webSocket) return
                handshakeDone = false
                val detail = reason.ifBlank { "连接被服务端关闭" }
                listener?.onPhase("idle", detail)
            }
        })
    }

    private fun handleIncoming(text: String) {
        val json = try {
            JSONObject(text)
        } catch (_: Exception) {
            return
        }
        if (json.optString("type") == "mcp") {
            replyMcp(json.optJSONObject("payload"))
            return
        }
        handleText(json)
    }

    private fun replyMcp(payload: JSONObject?) {
        if (payload == null) return
        val method = payload.optString("method")
        if (!payload.has("id")) return
        val id = payload.get("id")
        val result = when (method) {
            "initialize" -> JSONObject()
                .put("protocolVersion", "2024-11-05")
                .put("capabilities", JSONObject().put("tools", JSONObject()))
                .put("serverInfo", JSONObject().put("name", "firehd-desk").put("version", "1.8.2"))
            "tools/list" -> JSONObject().put("tools", org.json.JSONArray())
            else -> null
        }
        val body = JSONObject().put("jsonrpc", "2.0").put("id", id)
        if (result != null) {
            body.put("result", result)
        } else {
            body.put("error", JSONObject().put("code", -32601).put("message", "unsupported"))
        }
        sendJson(JSONObject().put("type", "mcp").put("payload", body))
    }

    private fun dispatchText(trimmed: String) {
        val payload = JSONObject()
            .put("type", "listen")
            .put("state", "detect")
            .put("text", trimmed)
            .put("source", "text")
        sessionId?.let { payload.put("session_id", it) }
        voice.interruptPlayback()
        discardUntilStop = true
        expectNewTurn = true
        listener?.onAssistantReset()
        listener?.onUserText(trimmed)
        listener?.onPhase("thinking", "已发送")
        lastOutbound = trimmed
        Log.i(TAG, "send session=$sessionId text=${trimmed.take(40)}")
        voice.primeReturnPath()
        sendJson(payload)
        awaitingReply = true
        val ticket = ++replyTicket
        val gen = connectionGen
        mainHandler.postDelayed({
            if (gen != connectionGen || ticket != replyTicket || !awaitingReply) return@postDelayed
            awaitingReply = false
            handshakeDone = false
            sessionId = null
            pendingText = trimmed
            helloInFlight = false
            Log.i(TAG, "no reply, reopen session")
            listener?.onPhase("connecting", "没有回复，正在重开会话")
            requestSession()
        }, 12_000)
    }

    private fun handleText(json: JSONObject) {
        when (json.optString("type")) {
            "hello" -> {
                sessionId = json.optString("session_id").ifBlank { null }
                handshakeDone = true
                helloInFlight = false
                Log.i(TAG, "hello session=$sessionId device=${cache.xzMac}")
                openVoice(json)
                listener?.onPhase("idle", "已连接，可以发送")
                pendingText?.let { queued ->
                    pendingText = null
                    dispatchText(queued)
                }
            }
            "goodbye" -> {
                val sid = json.optString("session_id")
                if (sid.isNotBlank() && sid != sessionId) return
                Log.i(TAG, "goodbye session=$sessionId")
                voice.stopCapture()
                voice.close()
                if (awaitingReply && !lastOutbound.isNullOrBlank()) pendingText = lastOutbound
                sessionId = null
                handshakeDone = false
                helloInFlight = false
                if (awaitingReply) {
                    awaitingReply = false
                    replyTicket += 1
                }
                listener?.onPhase("connecting", "正在重新连接")
                requestSession()
            }
            "stt" -> {
                if (discardUntilStop && !expectNewTurn) return
                awaitingReply = false
                replyTicket += 1
                val spoken = json.optString("text")
                if (spoken.isNotBlank()) listener?.onUserText(spoken)
                listener?.onPhase("thinking", "识别完成")
            }
            "tts" -> when (json.optString("state")) {
                "start" -> {
                    if (discardUntilStop && !expectNewTurn) return
                    discardUntilStop = false
                    expectNewTurn = false
                    awaitingReply = false
                    replyTicket += 1
                    voice.allowPlayback()
                    voice.stopCapture()
                    listener?.onPhase("responding", "回复中")
                }
                "sentence_start" -> {
                    if (discardUntilStop) return
                    val line = json.optString("text")
                    val tool = toolName(line)
                    if (tool != null) {
                        Log.i(TAG, "tool $tool")
                        listener?.onTool(tool)
                    } else if (line.isNotBlank()) {
                        listener?.onAssistantDelta(line)
                    }
                    listener?.onPhase("responding", "回复中")
                }
                "stop" -> {
                    if (expectNewTurn) return
                    discardUntilStop = false
                    if (conversationOpen) startVoice() else listener?.onPhase("idle", "已连接，可以发送")
                }
            }
            "llm" -> {
                if (discardUntilStop) return
                val line = json.optString("text")
                if (line.isNotBlank() && line.length > 2) listener?.onAssistantDelta(line)
            }
        }
    }

    private fun openVoice(json: JSONObject) {
        val udp = json.optJSONObject("udp") ?: return
        val server = udp.optString("server")
        val port = udp.optInt("port")
        val key = udp.optString("key")
        val nonce = udp.optString("nonce")
        val audio = json.optJSONObject("audio_params")
        val rate = audio?.optInt("sample_rate", 24000) ?: 24000
        val frame = audio?.optInt("frame_duration", 60) ?: 60
        if (server.isBlank() || port <= 0) return
        try {
            voice.open(server, port, key, nonce, rate, frame)
        } catch (error: Exception) {
            Log.e(TAG, "voice", error)
        }
    }

    private fun toolName(text: String): String? {
        val trimmed = text.trim()
        if (!trimmed.startsWith("%")) return null
        val body = trimmed.removePrefix("%").trim()
        val name = body.takeWhile { it.isLetterOrDigit() || it == '_' }
        return name.ifBlank { null }
    }

    private fun helloJson(version: Int, transport: String): JSONObject {
        return JSONObject()
            .put("type", "hello")
            .put("version", version)
            .put("features", JSONObject().put("mcp", false))
            .put("transport", transport)
            .put(
                "audio_params",
                JSONObject()
                    .put("format", "opus")
                    .put("sample_rate", 16000)
                    .put("channels", 1)
                    .put("frame_duration", 60)
            )
    }

    private fun sendJson(json: JSONObject) {
        val text = json.toString()
        if (mqttOut != null) {
            writeMqtt(publishPacket(cache.xzMqttPublish.ifBlank { "device-server" }, text))
        } else {
            socket?.send(text)
        }
    }

    private fun deviceTopic(): String {
        val mac = cache.xzMac.lowercase().replace(":", "_")
        return "devices/p2p/$mac"
    }

    private fun schedulePing(gen: Int) {
        mainHandler.postDelayed({
            if (gen != connectionGen || mqttOut == null) return@postDelayed
            try {
                writeMqtt(byteArrayOf(0xC0.toByte(), 0x00))
            } catch (error: Exception) {
                Log.e(TAG, "ping", error)
            }
            schedulePing(gen)
        }, 40_000)
    }

    private fun writeMqtt(packet: ByteArray) {
        val task = Runnable {
            synchronized(writeLock) {
                val out = mqttOut ?: return@Runnable
                out.write(packet)
                out.flush()
            }
        }
        if (Looper.myLooper() == Looper.getMainLooper()) {
            mqttWriter.execute(task)
        } else {
            task.run()
        }
    }

    private fun closeMqtt() {
        synchronized(writeLock) {
            try {
                mqttSocket?.close()
            } catch (_: Exception) {
            }
            mqttSocket = null
            mqttOut = null
        }
    }

    private fun connectPacket(clientId: String, username: String, password: String): ByteArray {
        val body = ByteArrayOutputStream()
        body.write(mqttString("MQTT"))
        body.write(4)
        body.write(0xC2)
        body.write(0)
        body.write(240)
        body.write(mqttString(clientId))
        body.write(mqttString(username))
        body.write(mqttString(password))
        return mqttPacket(0x10, body.toByteArray())
    }

    private fun subscribePacket(topic: String): ByteArray {
        val body = ByteArrayOutputStream()
        body.write(0)
        body.write(1)
        body.write(mqttString(topic))
        body.write(0)
        return mqttPacket(0x82, body.toByteArray())
    }

    private fun publishPacket(topic: String, payload: String): ByteArray {
        val body = ByteArrayOutputStream()
        body.write(mqttString(topic))
        body.write(payload.toByteArray(Charsets.UTF_8))
        return mqttPacket(0x30, body.toByteArray())
    }

    private fun mqttPacket(header: Int, body: ByteArray): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(header)
        var remaining = body.size
        do {
            var digit = remaining % 128
            remaining /= 128
            if (remaining > 0) digit = digit or 0x80
            out.write(digit)
        } while (remaining > 0)
        out.write(body)
        return out.toByteArray()
    }

    private fun mqttString(value: String): ByteArray {
        val bytes = value.toByteArray(Charsets.UTF_8)
        val out = ByteArrayOutputStream()
        out.write(bytes.size shr 8)
        out.write(bytes.size and 0xFF)
        out.write(bytes)
        return out.toByteArray()
    }

    private fun readPacket(input: DataInputStream): MqttPacket? {
        val header = try {
            input.readUnsignedByte()
        } catch (_: Exception) {
            return null
        }
        var multiplier = 1
        var value = 0
        repeat(4) {
            val digit = input.readUnsignedByte()
            value += (digit and 0x7F) * multiplier
            multiplier *= 128
            if (digit and 0x80 == 0) return MqttPacket(header shr 4, readExact(input, value))
        }
        throw IllegalStateException("MQTT 长度无效")
    }

    private fun readExact(input: DataInputStream, size: Int): ByteArray {
        val buf = ByteArray(size)
        input.readFully(buf)
        return buf
    }

    private fun decodePublish(packet: MqttPacket): String? {
        val body = packet.body
        if (body.size < 2) return null
        val topicLen = ((body[0].toInt() and 0xFF) shl 8) or (body[1].toInt() and 0xFF)
        var offset = 2 + topicLen
        val qos = 0
        if (qos > 0) offset += 2
        if (offset > body.size) return null
        return body.copyOfRange(offset, body.size).toString(Charsets.UTF_8)
    }

    private fun parseEndpoint(endpoint: String): Pair<String, Int> {
        val trimmed = endpoint.trim()
        val colon = trimmed.lastIndexOf(':')
        if (colon > 0 && trimmed.substring(colon + 1).all { it.isDigit() }) {
            return trimmed.substring(0, colon) to trimmed.substring(colon + 1).toInt()
        }
        return trimmed to 8883
    }

    private fun localIpv4(): String {
        return try {
            NetworkInterface.getNetworkInterfaces().toList()
                .flatMap { it.inetAddresses.toList() }
                .firstOrNull { !it.isLoopbackAddress && it is Inet4Address }
                ?.hostAddress ?: "127.0.0.1"
        } catch (_: Exception) {
            "127.0.0.1"
        }
    }

    private data class MqttPacket(val type: Int, val body: ByteArray)

    data class OtaOutcome(val code: String?, val message: String?, val websocketUrl: String)

    companion object {
        private const val TAG = "XiaozhiClient"
        private val JSON_TYPE = MediaType.parse("application/json; charset=utf-8")
            ?: throw IllegalStateException("json media type")
    }
}
