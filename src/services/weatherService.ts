import { WeatherData } from '../types';

const STORAGE_KEY = 'aidesk_weather_cache';
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function getCachedWeather(cityCode: string): WeatherData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherData;
    if (!parsed.cityCode || parsed.cityCode !== cityCode) return null;
    return { ...parsed, isCached: true };
  } catch {
    return null;
  }
}

function extractObject(source: string, varName: string): Record<string, unknown> {
  const marker = `var ${varName}`;
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`缺少 ${varName}`);
  const start = source.indexOf('{', idx);
  if (start < 0) throw new Error(`缺少 ${varName}`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(source.slice(start, i + 1)) as Record<string, unknown>;
      }
    }
  }
  throw new Error(`无法解析 ${varName}`);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function textOf(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function numberOf(value: unknown, fallback = 0): number {
  const n = Number.parseFloat(textOf(value).replace('%', ''));
  return Number.isFinite(n) ? n : fallback;
}

function alarmTitle(alarm: Record<string, unknown>): string | null {
  const items = Array.isArray(alarm.w) ? alarm.w : [];
  if (items.length === 0) return null;
  const first = items[0];
  if (typeof first === 'string') return first;
  const row = asRecord(first);
  if (!row) return null;
  const title = ['w4', 'w9', 'w6', 'w5']
    .map((key) => textOf(row[key]))
    .find((part) => part.length > 0);
  return title ? title.slice(0, 36) : null;
}

export function parseWeatherIndex(source: string, cityCode: string): WeatherData {
  const cityDz = extractObject(source, 'cityDZ');
  const alarmDz = extractObject(source, 'alarmDZ');
  const dataSk = extractObject(source, 'dataSK');
  const forecast = extractObject(source, 'fc');
  const todayInfo = asRecord(cityDz.weatherinfo);
  const days = Array.isArray(forecast.f) ? forecast.f : [];
  const today = asRecord(days[0]);

  const current = textOf(dataSk.weather) || textOf(todayInfo?.weather) || '多云';
  const summary = textOf(todayInfo?.weather);
  const high = today ? numberOf(today.fc, numberOf(todayInfo?.temp)) : numberOf(todayInfo?.temp);
  const low = today ? numberOf(today.fd, numberOf(todayInfo?.tempn)) : numberOf(todayInfo?.tempn);

  return {
    temperature: numberOf(dataSk.temp),
    humidity: numberOf(dataSk.SD || dataSk.sd),
    weatherCode: textOf(dataSk.weathercode) || textOf(todayInfo?.weathercode) || 'd01',
    weatherDescription: current,
    todaySummary: summary && summary !== current ? summary : undefined,
    tempMax: high,
    tempMin: low,
    wind: [textOf(dataSk.WD), textOf(dataSk.WS)].filter(Boolean).join(' '),
    aqi: textOf(dataSk.aqi),
    alarm: alarmTitle(alarmDz),
    cityName: textOf(dataSk.cityname) || textOf(todayInfo?.city) || cityCode,
    cityCode: textOf(dataSk.city) || cityCode,
    lastUpdated: new Date().toISOString(),
    isCached: false,
  };
}

export async function fetchCityWeather(cityCode: string): Promise<WeatherData> {
  const code = cityCode.trim();
  const url = `/weather_index/${encodeURIComponent(code)}.html?_=${Date.now()}`;
  try {
    const response = await fetch(url, {
      headers: {
        Referer: 'http://www.weather.com.cn/',
        'User-Agent': USER_AGENT,
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const weather = parseWeatherIndex(await response.text(), code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(weather));
    return weather;
  } catch (error) {
    const cached = getCachedWeather(code);
    if (cached) return cached;
    throw error;
  }
}
