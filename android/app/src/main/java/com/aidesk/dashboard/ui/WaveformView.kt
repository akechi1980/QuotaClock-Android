package com.aidesk.dashboard.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.view.View

class WaveformView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    var status: String = "idle"
        set(value) {
            field = value
            invalidate()
        }

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val handler = Handler(Looper.getMainLooper())
    private var phase = 0
    private val tick = object : Runnable {
        override fun run() {
            phase = (phase + 1) % 8
            invalidate()
            handler.postDelayed(this, 140)
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

    override fun onDraw(canvas: Canvas) {
        val bars = 8
        val gap = width / (bars * 2f)
        val barW = gap
        val idle = status == "idle"
        paint.color = if (idle) Color.rgb(63, 63, 70) else Color.WHITE
        for (i in 0 until bars) {
            val level = if (idle) 0.16f else heights[(i + phase) % heights.size]
            val h = height * level
            val left = i * (barW + gap) + gap
            canvas.drawRoundRect(left, (height - h) / 2f, left + barW, (height + h) / 2f, barW, barW, paint)
        }
    }

    companion object {
        private val heights = floatArrayOf(0.28f, 0.55f, 0.9f, 0.7f, 0.4f, 0.82f, 0.5f, 0.3f)
    }
}
