package com.aidesk.dashboard.network

import android.os.Build
import com.aidesk.dashboard.data.DashboardResponse
import com.aidesk.dashboard.data.SubscriptionItem
import com.google.gson.Gson
import com.google.gson.JsonObject
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

/**
 * Robust HTTP client tailored specifically for Android 5.1.1 (API 22)
 *
 * CRITICAL TECHNICAL DETAIL FOR ANDROID 5.1:
 * On Android 5.1.1 (API 22), TLS 1.2 is present in the platform but NOT enabled
 * by default on SSLEngine/SSLSockets. Connecting to modern HTTPS servers (like Open-Meteo)
 * will fail with SSLHandshakeException unless TLS 1.2 is explicitly enabled!
 */
object ApiClient {
    private val gson = Gson()

    val httpClient: OkHttpClient by lazy {
        val builder = OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .writeTimeout(5, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)

        enableTls12OnPreLollipop(builder)
        builder.build()
    }

    /**
     * Enables TLS 1.2 on Android 5.0 / 5.1 (API 21 / 22)
     */
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

    /**
     * Fetch subscription & agent data from local Windows PC
     */
    suspend fun fetchDashboard(serverUrl: String): Result<DashboardResponse> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder()
                .url(serverUrl)
                .header("User-Agent", "AIDesk-Tablet/1.0 (FireHD8-API22)")
                .get()
                .build()

            httpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(IOException("HTTP Error: ${response.code()}"))
                }
                val body = response.body()?.string() ?: return@withContext Result.failure(IOException("Empty response"))
                Result.success(parseDashboard(body))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun parseDashboard(body: String): DashboardResponse {
        val root = gson.fromJson(body, JsonObject::class.java)
        val progress = root.getAsJsonArray("progress")
        if (progress != null) {
            val simulation = root.get("simulation")?.asBoolean == true
            return DashboardResponse(
                subscriptions = mapProgress(progress.map { it.asDouble }, simulation),
                timestamp = System.currentTimeMillis()
            )
        }
        return gson.fromJson(body, DashboardResponse::class.java)
    }

    private fun mapProgress(values: List<Double>, simulation: Boolean): List<SubscriptionItem> {
        val specs = listOf(
            Triple("openai_5h", "OpenAI 5h", "5小时重置窗口"),
            Triple("openai_7d", "OpenAI 7d", "每周重置窗口"),
            Triple("cursor_plan", "Cursor", "月度计划")
        )
        val resets = listOf("滚动5小时", "滚动7天", "月末重置")
        return specs.mapIndexed { index, spec ->
            val used = (values.getOrNull(index) ?: 0.0).coerceIn(0.0, 100.0)
            SubscriptionItem(
                id = spec.first,
                name = spec.second,
                plan = spec.third,
                remaining = 100.0 - used,
                total = 100.0,
                unit = "%",
                resetAt = resets[index],
                status = if (simulation) "sim" else "active",
                type = "progress"
            )
        }
    }
}

/**
 * SocketFactory wrapper that enables TLS 1.2 protocols on Android API 22
 */
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
