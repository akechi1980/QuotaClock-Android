package com.aidesk.dashboard.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View

class WeatherGlyphView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private var kind = "cloud"
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    private val path = Path()

    fun setWeatherCode(code: String) {
        val n = code.replace(Regex("^[dDnN]"), "").toIntOrNull() ?: 1
        kind = when {
            n == 0 -> "sun"
            n == 1 -> "partly"
            n == 4 || n == 5 -> "storm"
            n == 3 || (n in 6..12) || (n in 19..25) -> "rain"
            (n in 13..17) || (n in 26..28) -> "snow"
            n == 18 || n == 53 || n >= 29 -> "fog"
            else -> "cloud"
        }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        paint.strokeWidth = w * 0.08f
        when (kind) {
            "sun" -> drawSun(canvas, w / 2f, h / 2f, w * 0.22f)
            "partly" -> {
                drawCloud(canvas, w * 0.55f, h * 0.58f, w * 0.28f)
                drawSun(canvas, w * 0.34f, h * 0.36f, w * 0.12f)
            }
            "rain" -> {
                drawCloud(canvas, w / 2f, h * 0.40f, w * 0.30f)
                drawDrops(canvas, w, h)
            }
            "snow" -> {
                drawCloud(canvas, w / 2f, h * 0.40f, w * 0.30f)
                fill.color = Color.WHITE
                canvas.drawCircle(w * 0.35f, h * 0.78f, w * 0.04f, fill)
                canvas.drawCircle(w * 0.55f, h * 0.84f, w * 0.04f, fill)
                canvas.drawCircle(w * 0.72f, h * 0.74f, w * 0.04f, fill)
            }
            "storm" -> {
                drawCloud(canvas, w / 2f, h * 0.36f, w * 0.30f)
                path.reset()
                path.moveTo(w * 0.55f, h * 0.52f)
                path.lineTo(w * 0.42f, h * 0.72f)
                path.lineTo(w * 0.54f, h * 0.72f)
                path.lineTo(w * 0.44f, h * 0.92f)
                paint.style = Paint.Style.STROKE
                canvas.drawPath(path, paint)
            }
            "fog" -> {
                paint.style = Paint.Style.STROKE
                canvas.drawLine(w * 0.18f, h * 0.35f, w * 0.82f, h * 0.35f, paint)
                canvas.drawLine(w * 0.28f, h * 0.52f, w * 0.78f, h * 0.52f, paint)
                canvas.drawLine(w * 0.18f, h * 0.70f, w * 0.70f, h * 0.70f, paint)
            }
            else -> drawCloud(canvas, w / 2f, h / 2f, w * 0.32f)
        }
    }

    private fun drawSun(canvas: Canvas, cx: Float, cy: Float, r: Float) {
        paint.style = Paint.Style.STROKE
        canvas.drawCircle(cx, cy, r, paint)
        for (i in 0 until 8) {
            val angle = Math.toRadians((i * 45).toDouble())
            val x1 = cx + Math.cos(angle).toFloat() * (r + 3f)
            val y1 = cy + Math.sin(angle).toFloat() * (r + 3f)
            val x2 = cx + Math.cos(angle).toFloat() * (r + 8f)
            val y2 = cy + Math.sin(angle).toFloat() * (r + 8f)
            canvas.drawLine(x1, y1, x2, y2, paint)
        }
    }

    private fun drawCloud(canvas: Canvas, cx: Float, cy: Float, r: Float) {
        fill.color = Color.WHITE
        canvas.drawCircle(cx - r * 0.45f, cy, r * 0.55f, fill)
        canvas.drawCircle(cx + r * 0.15f, cy - r * 0.25f, r * 0.7f, fill)
        canvas.drawCircle(cx + r * 0.55f, cy + r * 0.05f, r * 0.48f, fill)
    }

    private fun drawDrops(canvas: Canvas, w: Float, h: Float) {
        paint.style = Paint.Style.STROKE
        canvas.drawLine(w * 0.32f, h * 0.68f, w * 0.28f, h * 0.86f, paint)
        canvas.drawLine(w * 0.52f, h * 0.66f, w * 0.48f, h * 0.88f, paint)
        canvas.drawLine(w * 0.70f, h * 0.68f, w * 0.66f, h * 0.84f, paint)
    }
}
