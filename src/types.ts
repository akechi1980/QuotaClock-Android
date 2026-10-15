export type AgentStatusType = 'idle' | 'listening' | 'thinking' | 'responding';

export interface SubscriptionItem {
  id: string;
  name: string;
  plan?: string | null;
  remaining?: number | null;
  total?: number | null;
  used?: number | null; // Direct used percentage (0-100) from progress_service
  unit?: string | null;
  resetAt?: string | null;
  updatedAt?: string | null;
  status: 'active' | 'warning' | 'expired' | 'demo' | 'sim' | 'unknown' | 'disconnected';
  type?: 'subscription' | 'api_credits' | 'progress' | string | null;
  note?: string | null;
}

export interface AgentInfo {
  status: AgentStatusType;
  currentTask?: string | null;
  audioLevel?: number | null;
}

export interface XiaozhiInfo {
  version: string;
  transport: 'websocket' | 'mqtt_udp' | string;
  state: AgentStatusType;
  session_id?: string;
  last_stt?: string;
  last_llm?: string;
}

export interface ProgressResponse {
  progress?: number[]; // [OpenAI 5h %, OpenAI Weekly %, Cursor Monthly %]
  simulation?: boolean;
}

export interface DashboardResponse {
  status?: string;
  timestamp?: number | null;
  simulation?: boolean;
  progress?: number[];
  xiaozhi?: XiaozhiInfo | null;
  subscriptions?: SubscriptionItem[] | null;
  agent?: AgentInfo | null;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  weatherCode: string;
  weatherDescription: string;
  todaySummary?: string;
  tempMax: number;
  tempMin: number;
  wind?: string;
  aqi?: string;
  alarm?: string | null;
  cityName: string;
  cityCode: string;
  lastUpdated: string;
  isCached: boolean;
}

export interface AppSettings {
  serverUrl: string;
  serverType?: 'progress_service' | 'companion_agent' | 'custom';
  serverAuthToken?: string;
  autoRefreshMinutes: number;
  retainCacheOn503: boolean;
  weatherRefreshMinutes: number;
  demoMode: boolean;
  keepAwake: boolean;
  keepAwakeChargingOnly: boolean;
  brightness: number; // 50 to 120 (supports 100% standard high brightness, 120% boost)
  nightFilter: boolean;
  cityName: string;
  cityCode: string;
  showTabletBezel: boolean;
}
