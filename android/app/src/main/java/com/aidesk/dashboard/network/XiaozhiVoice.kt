package com.aidesk.dashboard.network

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Build
import android.os.Process
import android.util.Log
import io.github.jaredmdobson.concentus.OpusApplication
import io.github.jaredmdobson.concentus.OpusDecoder
import io.github.jaredmdobson.concentus.OpusEncoder
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec
import kotlin.concurrent.thread

/**
 * 官方 MQTT+UDP 音频通道。控制消息走 MQTT，声音走 UDP。
 * 包格式对齐 xiaozhi-esp32 mqtt_protocol：16 字节头 + AES-128-CTR Opus。
 * 上行 16 kHz，下行按服务器 hello 的采样率（通常 24 kHz），帧长 60 ms。
 */
class XiaozhiVoice(private val context: Context) {
    @Volatile private var muted: Boolean = false

    private val lock = Any()
    private var socket: DatagramSocket? = null
    private var key: ByteArray? = null
    private var baseNonce: ByteArray? = null
    private var localSequence = 0
    private var remoteSequence = 0L
    private var timestampMs = 0
    private var frameMs = 60
    private var downlinkRate = 24000
    private var decoder: OpusDecoder? = null
    private var encoder: OpusEncoder? = null
    private var downCipher: Cipher? = null
    private var upCipher: Cipher? = null
    private var ctrCipher: Cipher? = null
    private var aesKeySpec: SecretKeySpec? = null
    private var ctrMatches: Boolean? = null
    private val ctrLock = Any()
    private val pcmScratch = ShortArray(MAX_FRAME)
    private var track: AudioTrack? = null
    private var recorder: AudioRecord? = null
    @Volatile private var running = false
    @Volatile private var capturing = false
    @Volatile private var flushRequested = false
    @Volatile private var suppressPlayback = false
    private val playQueue = ArrayDeque<ByteArray>()
    private val playLock = Object()
    private var playedFrames = 0
    private var sentFrames = 0
    private var audioFocus = false

    fun open(server: String, port: Int, keyHex: String, nonceHex: String, sampleRate: Int, frameDurationMs: Int) {
        close()
        val aesKey = decodeHex(keyHex)
        val nonce = decodeHex(nonceHex)
        if (aesKey.size != 16 || nonce.size != 16) {
            Log.e(TAG, "udp key/nonce length ${aesKey.size}/${nonce.size}")
            return
        }
        val udp = DatagramSocket()
        udp.soTimeout = 1000
        udp.receiveBufferSize = 256 * 1024
        udp.connect(InetAddress.getByName(server), port)
        val downRate = if (sampleRate > 0) sampleRate else 24000
        val frame = if (frameDurationMs > 0) frameDurationMs else 60
        synchronized(lock) {
            socket = udp
            key = aesKey
            baseNonce = nonce
            localSequence = 0
            remoteSequence = 0L
            timestampMs = 0
            frameMs = frame
            downlinkRate = downRate
            decoder = OpusDecoder(downRate, 1)
            encoder = OpusEncoder(UPLINK_RATE, 1, OpusApplication.OPUS_APPLICATION_VOIP).also {
                it.setBitrate(24000)
                it.setComplexity(5)
            }
            downCipher = newCipher(aesKey)
            upCipher = newCipher(aesKey)
            aesKeySpec = SecretKeySpec(aesKey, "AES")
            ctrCipher = Cipher.getInstance("AES/CTR/NoPadding")
            ctrMatches = null
            track = newTrack(downRate)
            running = true
        }
        val player = track
        Log.i(TAG, "udp open $server:$port rate=$downRate frame=${frame}ms")
        thread(name = "xiaozhi-udp", isDaemon = true) { receiveLoop(udp) }
        if (player != null) thread(name = "xiaozhi-play", isDaemon = true) { playLoop(player) }
        // 只登记回传地址，不把静音送进语音解码器，避免服务端当成用户插话。
        primeReturnPath()
    }

    fun primeReturnPath() {
        if (socket == null) return
        try {
            sendProbe()
            Log.i(TAG, "udp prime")
        } catch (error: Exception) {
            Log.e(TAG, "prime", error)
            sendHolePunch()
        }
    }

    fun close() {
        running = false
        capturing = false
        val udp: DatagramSocket?
        val rec: AudioRecord?
        val player: AudioTrack?
        synchronized(lock) {
            udp = socket
            socket = null
            rec = recorder
            recorder = null
            player = track
            track = null
            decoder = null
            encoder = null
            downCipher = null
            upCipher = null
            ctrCipher = null
            aesKeySpec = null
            ctrMatches = null
            key = null
            baseNonce = null
        }
        try {
            rec?.stop()
        } catch (_: Exception) {
        }
        rec?.release()
        try {
            player?.pause()
            player?.flush()
            player?.stop()
        } catch (_: Exception) {
        }
        player?.release()
        udp?.close()
        synchronized(playLock) {
            playQueue.clear()
            playLock.notifyAll()
        }
        abandonFocus()
    }

    fun setPlaybackMuted(muted: Boolean) {
        this.muted = muted
        synchronized(playLock) {
            playQueue.clear()
            playLock.notifyAll()
        }
        if (muted) {
            silenceTrack()
        } else if (!suppressPlayback) {
            ensurePlaying()
        }
    }

    fun interruptPlayback() {
        suppressPlayback = true
        flushRequested = true
        synchronized(playLock) {
            playQueue.clear()
            playLock.notifyAll()
        }
        silenceTrack()
    }

    fun allowPlayback() {
        suppressPlayback = false
    }

    private fun silenceTrack() {
        val player = track ?: return
        try {
            player.pause()
            player.flush()
            player.stop()
        } catch (error: Exception) {
            Log.e(TAG, "silence", error)
        }
    }

    fun startCapture() {
        if (capturing || socket == null) return
        val min = AudioRecord.getMinBufferSize(
            UPLINK_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val buffer = maxOf(min, UPLINK_FRAME * 2 * 4)
        val rec = AudioRecord(
            MediaRecorder.AudioSource.MIC,
            UPLINK_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            buffer
        )
        if (rec.state != AudioRecord.STATE_INITIALIZED) {
            rec.release()
            throw IllegalStateException("录音没有就绪")
        }
        recorder = rec
        capturing = true
        rec.startRecording()
        thread(name = "xiaozhi-mic", isDaemon = true) { captureLoop(rec) }
    }

    fun stopCapture() {
        capturing = false
        val rec = recorder
        recorder = null
        try {
            rec?.stop()
        } catch (_: Exception) {
        }
        rec?.release()
    }

    private fun receiveLoop(udp: DatagramSocket) {
        Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
        val buf = ByteArray(4096)
        val packet = DatagramPacket(buf, buf.size)
        var received = 0
        var decryptUs = 0L
        while (running && socket === udp) {
            try {
                udp.receive(packet)
            } catch (_: SocketTimeoutException) {
                continue
            } catch (error: Exception) {
                if (running && socket === udp) Log.e(TAG, "udp recv", error)
                break
            }
            if (packet.length < 16) continue
            val header = buf.copyOfRange(0, 16)
            if ((header[0].toInt() and 0xFF) != 0x01) continue
            val payloadLen = ((header[2].toInt() and 0xFF) shl 8) or (header[3].toInt() and 0xFF)
            if (payloadLen <= 0 || packet.length < 16 + payloadLen) continue
            if (payloadLen == 8) continue
            val sequence = readBe32(header, 12).toLong() and 0xFFFFFFFFL
            if (sequence != 0L && sequence <= remoteSequence) continue
            remoteSequence = sequence
            if (key == null) continue
            val started = System.nanoTime()
            val opus = try {
                crypt(downCipher, header, buf.copyOfRange(16, 16 + payloadLen))
            } catch (error: Exception) {
                Log.e(TAG, "decrypt", error)
                continue
            }
            decryptUs += (System.nanoTime() - started) / 1000
            received += 1
            if (received == 1 || received % 25 == 0) {
                Log.i(TAG, "udp rx=$received bytes=${opus.size} q=${playQueue.size} decUs=$decryptUs")
                decryptUs = 0
            }
            if (muted || suppressPlayback) continue
            synchronized(playLock) {
                playQueue.addLast(opus)
                var dropped = 0
                while (playQueue.size > MAX_QUEUE) {
                    playQueue.removeFirst()
                    dropped += 1
                }
                if (dropped > 0) Log.w(TAG, "play queue overrun dropped=$dropped")
                playLock.notifyAll()
            }
        }
        Log.i(TAG, "udp closed played=$playedFrames")
    }

    private fun captureLoop(rec: AudioRecord) {
        val frame = ShortArray(UPLINK_FRAME)
        while (capturing && rec.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
            var read = 0
            while (read < UPLINK_FRAME && capturing) {
                val n = rec.read(frame, read, UPLINK_FRAME - read)
                if (n <= 0) break
                read += n
            }
            if (read < UPLINK_FRAME) continue
            val opus = encode(frame) ?: continue
            sendOpus(opus)
        }
        Log.i(TAG, "mic stop sent=$sentFrames")
    }

    private fun sendHolePunch() {
        val nonce: ByteArray
        val udp: DatagramSocket
        synchronized(lock) {
            if (key == null) return
            val base = baseNonce ?: return
            udp = socket ?: return
            nonce = base.copyOf()
            nonce[2] = 0
            nonce[3] = 0
            writeBe32(nonce, 8, 0)
            writeBe32(nonce, 12, 0)
        }
        udp.send(DatagramPacket(nonce, nonce.size))
        Log.i(TAG, "udp punch")
    }

    private fun sendProbe() {
        sendPayload(ByteArray(8), advanceTimestamp = false)
    }

    private fun sendOpus(opus: ByteArray) {
        sendPayload(opus, advanceTimestamp = true)
    }

    private fun sendPayload(payload: ByteArray, advanceTimestamp: Boolean) {
        val nonce: ByteArray
        val udp: DatagramSocket
        synchronized(lock) {
            if (key == null) return
            val base = baseNonce ?: return
            udp = socket ?: return
            localSequence += 1
            nonce = base.copyOf()
            nonce[2] = (payload.size ushr 8).toByte()
            nonce[3] = (payload.size and 0xFF).toByte()
            writeBe32(nonce, 8, timestampMs)
            writeBe32(nonce, 12, localSequence)
            if (advanceTimestamp) timestampMs += frameMs
        }
        val encrypted = crypt(upCipher, nonce, payload)
        val body = ByteArray(nonce.size + encrypted.size)
        System.arraycopy(nonce, 0, body, 0, nonce.size)
        System.arraycopy(encrypted, 0, body, nonce.size, encrypted.size)
        udp.send(DatagramPacket(body, body.size))
        sentFrames += 1
        if (sentFrames == 1 || sentFrames % 25 == 0) Log.i(TAG, "udp tx=$sentFrames")
    }

    private fun decodeInto(opus: ByteArray): Int {
        val current = decoder ?: return 0
        return try {
            current.decode(opus, 0, opus.size, pcmScratch, 0, MAX_FRAME, false)
        } catch (error: Exception) {
            Log.e(TAG, "opus decode", error)
            0
        }
    }

    private fun encode(pcm: ShortArray): ByteArray? {
        val current = encoder ?: return null
        val out = ByteArray(400)
        val bytes = try {
            current.encode(pcm, 0, UPLINK_FRAME, out, 0, out.size)
        } catch (error: Exception) {
            Log.e(TAG, "opus encode", error)
            return null
        }
        if (bytes <= 0) return null
        return out.copyOf(bytes)
    }

    private fun playLoop(player: AudioTrack) {
        Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO)
        var priming = true
        while (running && track === player) {
            if (flushRequested || suppressPlayback) {
                flushRequested = false
                priming = true
                silenceTrack()
            }
            val opus = synchronized(playLock) {
                if (priming) {
                    val deadline = System.currentTimeMillis() + 150
                    while (running && playQueue.size < PREBUFFER && System.currentTimeMillis() < deadline) {
                        val left = deadline - System.currentTimeMillis()
                        if (left <= 0) break
                        try {
                            playLock.wait(left)
                        } catch (_: Exception) {
                        }
                    }
                } else if (playQueue.isEmpty() && running) {
                    try {
                        playLock.wait(40)
                    } catch (_: Exception) {
                    }
                }
                if (playQueue.isEmpty()) null else playQueue.removeFirst()
            } ?: continue
            if (muted || suppressPlayback) {
                priming = true
                continue
            }
            val samples = decodeInto(opus)
            if (samples <= 0) continue
            priming = false
            if (!ensurePlaying()) continue
            var offset = 0
            while (offset < samples && running && !muted && !flushRequested && !suppressPlayback) {
                val written = try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        player.write(pcmScratch, offset, samples - offset, AudioTrack.WRITE_BLOCKING)
                    } else {
                        player.write(pcmScratch, offset, samples - offset)
                    }
                } catch (error: Exception) {
                    Log.e(TAG, "write", error)
                    -1
                }
                if (written < 0) {
                    Log.e(TAG, "write failed $written state=${player.playState}")
                    break
                }
                if (written == 0) continue
                offset += written
                if (playedFrames == 0) {
                    Log.i(TAG, "play start state=${player.playState} samples=$samples")
                }
                playedFrames += 1
                if (playedFrames % 100 == 0 && Build.VERSION.SDK_INT >= 24) {
                    Log.i(TAG, "underrun=${player.underrunCount}")
                }
            }
        }
    }

    private fun ensurePlaying(): Boolean {
        val player = track ?: return false
        requestFocus()
        if (player.playState == AudioTrack.PLAYSTATE_PLAYING) return true
        return try {
            player.play()
            val playing = player.playState == AudioTrack.PLAYSTATE_PLAYING
            Log.i(TAG, "track play state=${player.playState}")
            playing
        } catch (error: Exception) {
            Log.e(TAG, "play", error)
            false
        }
    }

    private fun requestFocus() {
        if (audioFocus) return
        val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val request = android.media.AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(speechAttributes())
                .build()
            manager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        } else {
            @Suppress("DEPRECATION")
            manager.requestAudioFocus(
                null,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        }
        audioFocus = granted
        Log.i(TAG, "audio focus=$granted")
    }

    private fun abandonFocus() {
        if (!audioFocus) return
        val manager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Transient focus is released with the next request; nothing to hold.
        }
        @Suppress("DEPRECATION")
        manager.abandonAudioFocus(null)
        audioFocus = false
    }

    private fun speechAttributes(): AudioAttributes {
        return AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
    }

    private fun newTrack(sampleRate: Int): AudioTrack {
        val min = AudioTrack.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val frameBytes = sampleRate * 60 / 1000 * 2
        val size = maxOf(min, frameBytes * 6)
        Log.i(TAG, "track buffer=$size min=$min rate=$sampleRate")
        val format = AudioFormat.Builder()
            .setSampleRate(sampleRate)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .build()
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            AudioTrack.Builder()
                .setAudioAttributes(speechAttributes())
                .setAudioFormat(format)
                .setBufferSizeInBytes(size)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
        } else {
            @Suppress("DEPRECATION")
            AudioTrack(
                AudioManager.STREAM_MUSIC,
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_16BIT,
                size,
                AudioTrack.MODE_STREAM
            )
        }
    }

    private fun newCipher(keyBytes: ByteArray): Cipher {
        return Cipher.getInstance("AES/ECB/NoPadding").also {
            it.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"))
        }
    }

    private fun crypt(cipher: Cipher?, nonce: ByteArray, data: ByteArray): ByteArray {
        synchronized(ctrLock) {
            val fast = cryptCtr(nonce, data)
            if (ctrMatches == null && cipher != null && data.size > 16 && fast != null) {
                val slow = cryptBlock(cipher, nonce, data)
                ctrMatches = fast.contentEquals(slow)
                Log.i(TAG, "ctr matches=$ctrMatches bytes=${data.size}")
                return if (ctrMatches == true) fast else slow
            }
            if (ctrMatches == false || fast == null) {
                return cryptBlock(cipher ?: throw IllegalStateException("cipher"), nonce, data)
            }
            return fast
        }
    }

    private fun cryptCtr(nonce: ByteArray, data: ByteArray): ByteArray? {
        val key = aesKeySpec ?: return null
        return try {
            val cipher = ctrCipher ?: return null
            cipher.init(Cipher.ENCRYPT_MODE, key, IvParameterSpec(nonce))
            cipher.doFinal(data)
        } catch (error: Exception) {
            Log.e(TAG, "ctr", error)
            ctrMatches = false
            null
        }
    }

    private fun cryptBlock(aes: Cipher, nonce: ByteArray, data: ByteArray): ByteArray {
        val counter = nonce.copyOf()
        val out = ByteArray(data.size)
        var offset = 0
        while (offset < data.size) {
            val stream = aes.doFinal(counter)
            val n = minOf(16, data.size - offset)
            for (i in 0 until n) {
                out[offset + i] = (data[offset + i].toInt() xor (stream[i].toInt() and 0xFF)).toByte()
            }
            var carry = 1
            for (i in counter.indices.reversed()) {
                val sum = (counter[i].toInt() and 0xFF) + carry
                counter[i] = (sum and 0xFF).toByte()
                carry = sum ushr 8
                if (carry == 0) break
            }
            offset += n
        }
        return out
    }

    private fun decodeHex(value: String): ByteArray {
        val clean = value.trim()
        val out = ByteArray(clean.length / 2)
        var i = 0
        while (i < out.size) {
            out[i] = clean.substring(i * 2, i * 2 + 2).toInt(16).toByte()
            i += 1
        }
        return out
    }

    private fun writeBe32(target: ByteArray, offset: Int, value: Int) {
        target[offset] = (value ushr 24).toByte()
        target[offset + 1] = (value ushr 16).toByte()
        target[offset + 2] = (value ushr 8).toByte()
        target[offset + 3] = value.toByte()
    }

    private fun readBe32(source: ByteArray, offset: Int): Int {
        return ((source[offset].toInt() and 0xFF) shl 24) or
            ((source[offset + 1].toInt() and 0xFF) shl 16) or
            ((source[offset + 2].toInt() and 0xFF) shl 8) or
            (source[offset + 3].toInt() and 0xFF)
    }

    companion object {
        private const val TAG = "XiaozhiVoice"
        private const val UPLINK_RATE = 16000
        private const val MAX_QUEUE = 40
        private const val PREBUFFER = 2
        private const val UPLINK_FRAME = 960
        private const val MAX_FRAME = 5760
    }
}
