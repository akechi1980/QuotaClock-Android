package com.aidesk.dashboard.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.view.View
import java.util.Calendar

class SegmentClockView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val path = Path()
    private val handler = Handler(Looper.getMainLooper())
    private val tick = object : Runnable {
        override fun run() {
            invalidate()
            handler.postDelayed(this, 1000)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        handler.post(tick)
    }

    override fun onDetachedFromWindow() {
        handler.removeCallbacks(tick)
        super.onDetachedFromWindow()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val density = resources.displayMetrics.density
        setMeasuredDimension(
            resolve(widthMeasureSpec, (236 * density).toInt()),
            resolve(heightMeasureSpec, (64 * density).toInt())
        )
    }

    override fun onDraw(canvas: Canvas) {
        val cal = Calendar.getInstance()
        val hour = "%02d".format(cal.get(Calendar.HOUR_OF_DAY))
        val minute = "%02d".format(cal.get(Calendar.MINUTE))
        val second = "%02d".format(cal.get(Calendar.SECOND))
        val pad = 2f
        val availW = (width - pad * 2).coerceAtLeast(1f)
        val availH = (height - pad * 2).coerceAtLeast(1f)
        val gap = availH * 0.04f
        val naturalW = availH * (4f * 44f / 72f + 0.22f + 2f * 0.58f * 44f / 72f) + gap * 6f
        val scale = if (naturalW > availW) availW / naturalW else 1f
        val digitH = availH * scale
        val digitW = digitH * 44f / 72f
        val smallH = digitH * 0.58f
        val smallW = smallH * 44f / 72f
        val contentW = digitW * 4 + smallW * 2 + digitH * 0.22f + gap * 6f
        var x = pad + (availW - contentW) / 2f
        val y = pad + (availH - digitH) / 2f
        x = drawDigit(canvas, hour[0], x, y, digitW, digitH) + gap
        x = drawDigit(canvas, hour[1], x, y, digitW, digitH) + gap
        x = drawColon(canvas, x, y, digitH) + gap
        x = drawDigit(canvas, minute[0], x, y, digitW, digitH) + gap
        x = drawDigit(canvas, minute[1], x, y, digitW, digitH) + gap * 2
        val sy = y + digitH - smallH
        x = drawDigit(canvas, second[0], x, sy, smallW, smallH) + gap
        drawDigit(canvas, second[1], x, sy, smallW, smallH)
    }

    private fun resolve(spec: Int, want: Int): Int {
        val size = MeasureSpec.getSize(spec)
        return when (MeasureSpec.getMode(spec)) {
            MeasureSpec.EXACTLY -> size
            MeasureSpec.AT_MOST -> size.coerceAtMost(want)
            else -> want
        }
    }

    private fun drawDigit(canvas: Canvas, char: Char, x: Float, y: Float, w: Float, h: Float): Float {
        val segs = SEGMENTS[char] ?: SEGMENTS.getValue(' ')
        poly(canvas, A, x, y, w, h, segs[0])
        poly(canvas, B, x, y, w, h, segs[1])
        poly(canvas, C, x, y, w, h, segs[2])
        poly(canvas, D, x, y, w, h, segs[3])
        poly(canvas, E, x, y, w, h, segs[4])
        poly(canvas, F, x, y, w, h, segs[5])
        poly(canvas, G, x, y, w, h, segs[6])
        return x + w
    }

    private fun drawColon(canvas: Canvas, x: Float, y: Float, h: Float): Float {
        paint.color = Color.WHITE
        val r = (h * 0.045f).coerceAtLeast(1.5f)
        val w = h * 0.22f
        canvas.drawCircle(x + w / 2f, y + h * 0.32f, r, paint)
        canvas.drawCircle(x + w / 2f, y + h * 0.68f, r, paint)
        return x + w
    }

    private fun poly(canvas: Canvas, points: FloatArray, x: Float, y: Float, w: Float, h: Float, on: Boolean) {
        path.reset()
        path.moveTo(x + points[0] / 44f * w, y + points[1] / 72f * h)
        var i = 2
        while (i < points.size) {
            path.lineTo(x + points[i] / 44f * w, y + points[i + 1] / 72f * h)
            i += 2
        }
        path.close()
        paint.color = if (on) Color.WHITE else Color.argb(16, 255, 255, 255)
        canvas.drawPath(path, paint)
    }

    companion object {
        private val A = floatArrayOf(6f, 4f, 38f, 4f, 33f, 10f, 11f, 10f)
        private val B = floatArrayOf(39f, 5f, 39f, 34f, 34f, 30f, 34f, 11f)
        private val C = floatArrayOf(39f, 38f, 39f, 67f, 34f, 61f, 34f, 42f)
        private val D = floatArrayOf(6f, 68f, 38f, 68f, 33f, 62f, 11f, 62f)
        private val E = floatArrayOf(5f, 38f, 10f, 42f, 10f, 61f, 5f, 67f)
        private val F = floatArrayOf(5f, 5f, 10f, 11f, 10f, 30f, 5f, 34f)
        private val G = floatArrayOf(7f, 36f, 11f, 32f, 33f, 32f, 37f, 36f, 33f, 40f, 11f, 40f)
        private val SEGMENTS = mapOf(
            '0' to booleanArrayOf(true, true, true, true, true, true, false),
            '1' to booleanArrayOf(false, true, true, false, false, false, false),
            '2' to booleanArrayOf(true, true, false, true, true, false, true),
            '3' to booleanArrayOf(true, true, true, true, false, false, true),
            '4' to booleanArrayOf(false, true, true, false, false, true, true),
            '5' to booleanArrayOf(true, false, true, true, false, true, true),
            '6' to booleanArrayOf(true, false, true, true, true, true, true),
            '7' to booleanArrayOf(true, true, true, false, false, false, false),
            '8' to booleanArrayOf(true, true, true, true, true, true, true),
            '9' to booleanArrayOf(true, true, true, true, false, true, true),
            ' ' to booleanArrayOf(false, false, false, false, false, false, false)
        )
    }
}
