import React, { useState, useEffect, memo } from 'react';

interface SegmentDigitProps {
  char: string;
  size?: 'lg' | 'sm';
}

/**
 * 经典电子表 7 段数码管 (7-Segment LCD) 真实渲染组件
 * 支持未点亮笔画的微弱液晶残影 (Ghost Segments)，呈现最地道的 Casio / 电子钟表质感
 */
const SegmentDigit: React.FC<SegmentDigitProps> = ({ char, size = 'lg' }) => {
  // [a (顶), b (右上), c (右下), d (底), e (左下), f (左上), g (中)]
  const SEG_MAP: Record<string, [boolean, boolean, boolean, boolean, boolean, boolean, boolean]> = {
    '0': [true,  true,  true,  true,  true,  true,  false],
    '1': [false, true,  true,  false, false, false, false],
    '2': [true,  true,  false, true,  true,  false, true],
    '3': [true,  true,  true,  true,  false, false, true],
    '4': [false, true,  true,  false, false, true,  true],
    '5': [true,  false, true,  true,  false, true,  true],
    '6': [true,  false, true,  true,  true,  true,  true],
    '7': [true,  true,  true,  false, false, false, false],
    '8': [true,  true,  true,  true,  true,  true,  true],
    '9': [true,  true,  true,  true,  false, true,  true],
    '-': [false, false, false, false, false, false, true],
    ' ': [false, false, false, false, false, false, false],
  };

  const segs = SEG_MAP[char] || SEG_MAP[' '];

  // 灰阶配色: 点亮为纯白高对比，未点亮为极微弱的深灰底纹 (真实电子表液晶透光特征)
  const litColor = '#ffffff';
  const ghostColor = 'rgba(255, 255, 255, 0.055)';

  const isLg = size === 'lg';
  const width = isLg ? 42 : 24;
  const height = isLg ? 68 : 40;

  return (
    <svg
      viewBox="0 0 44 72"
      width={width}
      height={height}
      className="inline-block transform -skew-x-[6deg] transition-all"
    >
      {/* a: 顶水平 */}
      <polygon
        points="6,4 38,4 33,10 11,10"
        fill={segs[0] ? litColor : ghostColor}
        className={segs[0] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
      {/* b: 右上竖 */}
      <polygon
        points="39,5 39,34 34,30 34,11"
        fill={segs[1] ? litColor : ghostColor}
        className={segs[1] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
      {/* c: 右下竖 */}
      <polygon
        points="39,38 39,67 34,61 34,42"
        fill={segs[2] ? litColor : ghostColor}
        className={segs[2] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
      {/* d: 底水平 */}
      <polygon
        points="6,68 38,68 33,62 11,62"
        fill={segs[3] ? litColor : ghostColor}
        className={segs[3] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
      {/* e: 左下竖 */}
      <polygon
        points="5,38 10,42 10,61 5,67"
        fill={segs[4] ? litColor : ghostColor}
        className={segs[4] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
      {/* f: 左上竖 */}
      <polygon
        points="5,5 10,11 10,30 5,34"
        fill={segs[5] ? litColor : ghostColor}
        className={segs[5] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
      {/* g: 中水平 */}
      <polygon
        points="7,36 11,32 33,32 37,36 33,40 11,40"
        fill={segs[6] ? litColor : ghostColor}
        className={segs[6] ? 'drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]' : ''}
      />
    </svg>
  );
};

const SegmentColon: React.FC<{ size?: 'lg' | 'sm'; blink?: boolean }> = ({ size = 'lg', blink = true }) => {
  const isLg = size === 'lg';
  const width = isLg ? 16 : 10;
  const height = isLg ? 68 : 40;

  return (
    <svg
      viewBox="0 0 16 72"
      width={width}
      height={height}
      className={`inline-block transform -skew-x-[6deg] mx-0.5 ${blink ? 'animate-pulse' : ''}`}
    >
      <circle cx="8" cy="22" r="3.5" fill="#ffffff" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]" />
      <circle cx="8" cy="50" r="3.5" fill="#ffffff" className="drop-shadow-[0_0_4px_rgba(255,255,255,0.7)]" />
    </svg>
  );
};

export const ClockWidget: React.FC = memo(() => {
  const [time, setTime] = useState({
    h1: '0',
    h2: '0',
    m1: '0',
    m2: '0',
    s1: '0',
    s2: '0',
    year: '2026',
    month: '10',
    date: '15',
    dayIndex: 0,
    tzStr: 'ASIA/SHANGHAI',
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hStr = String(now.getHours()).padStart(2, '0');
      const mStr = String(now.getMinutes()).padStart(2, '0');
      const sStr = String(now.getSeconds()).padStart(2, '0');

      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');

      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

      setTime({
        h1: hStr[0],
        h2: hStr[1],
        m1: mStr[0],
        m2: mStr[1],
        s1: sStr[0],
        s2: sStr[1],
        year,
        month,
        date,
        dayIndex: now.getDay(),
        tzStr: tz.toUpperCase(),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="flex flex-col h-full select-none">
      <div className="h-full p-2.5 sm:p-3 rounded-2xl bg-[#141417] border border-zinc-800 shadow-md flex flex-col justify-between">
        {/* Top Header: Electronic Watch Weekday LCD Indicators & 24H Tag */}
        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-zinc-800/80">
          {/* Weekday Segments */}
          <div className="flex items-center space-x-1 font-print text-[9px] sm:text-[10px]">
            {DAYS.map((d, idx) => {
              const isActive = idx === time.dayIndex;
              return (
                <span
                  key={d}
                  className={`px-1.5 py-0.2 rounded transition-colors ${
                    isActive
                      ? 'bg-white text-zinc-950 font-bold shadow-[0_0_6px_rgba(255,255,255,0.6)]'
                      : 'text-zinc-600 bg-zinc-900/60 border border-zinc-800/60'
                  }`}
                >
                  {d}
                </span>
              );
            })}
          </div>

          {/* 24H & Date LCD Tag */}
          <div className="flex items-center space-x-2 font-print text-[10px] text-zinc-400">
            <span className="px-1 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold">
              24H
            </span>
            <span className="text-zinc-200 tracking-wider">
              {time.year}.{time.month}.{time.date}
            </span>
          </div>
        </div>

        {/* Center: 7-Segment Digital Clock Numerals (HH:MM :SS) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 sm:space-x-1.5 py-0.5">
            {/* Hours */}
            <div className="flex items-center space-x-1">
              <SegmentDigit char={time.h1} size="lg" />
              <SegmentDigit char={time.h2} size="lg" />
            </div>

            {/* Blinking Colon */}
            <SegmentColon size="lg" blink={true} />

            {/* Minutes */}
            <div className="flex items-center space-x-1">
              <SegmentDigit char={time.m1} size="lg" />
              <SegmentDigit char={time.m2} size="lg" />
            </div>

            {/* Seconds (Smaller 7-Segment Digits) */}
            <div className="flex items-end pl-2 sm:pl-3 pb-1 space-x-0.5">
              <span className="text-[10px] font-print text-zinc-500 mr-1 self-start pt-1">SEC</span>
              <SegmentDigit char={time.s1} size="sm" />
              <SegmentDigit char={time.s2} size="sm" />
            </div>
          </div>
        </div>

        {/* Bottom Sub-tag */}
        <div className="pt-1.5 mt-1 border-t border-zinc-800/70 flex items-center justify-between text-[10px] font-print text-zinc-500">
          <span className="tracking-widest uppercase text-zinc-400">DIGITAL TELEMETRY WATCH</span>
          <span className="text-zinc-500">{time.tzStr}</span>
        </div>
      </div>
    </div>
  );
});

ClockWidget.displayName = 'ClockWidget';
