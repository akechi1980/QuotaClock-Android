import { DashboardResponse, SubscriptionItem, ProgressResponse } from '../types';

const STORAGE_KEY = 'aidesk_dashboard_cache';

const PROGRESS_ORIGIN = 'http://192.168.0.100:8766';

/**
 * 开发服务器把 /api/progress 反代到进度服务。
 * 进度服务本身不返回 CORS 头，浏览器不能直接跨域访问。
 */
export function resolveDashboardUrl(serverUrl: string): string {
  if (import.meta.env.DEV && serverUrl.startsWith(PROGRESS_ORIGIN)) {
    try {
      const target = new URL(serverUrl);
      return `${target.pathname}${target.search}`;
    } catch {
      return serverUrl;
    }
  }
  return serverUrl;
}

/**
 * 默认三项配额演示数据，严格对应用户的 progress_service [OpenAI 5h, OpenAI 每周, Cursor 月度]
 */
export const DEMO_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: 'openai_5h',
    name: 'OpenAI 5h',
    plan: '5小时重置窗口 (18,000s)',
    remaining: 75,
    total: 100,
    used: 25,
    unit: '%',
    resetAt: '滚动5小时窗口',
    updatedAt: '刚刚',
    status: 'sim',
    type: 'progress',
    note: '已用 25% · Codex / ChatGPT 访问配额'
  },
  {
    id: 'openai_7d',
    name: 'OpenAI 7d',
    plan: '每周重置窗口 (604,800s)',
    remaining: 50,
    total: 100,
    used: 50,
    unit: '%',
    resetAt: '滚动7天窗口',
    updatedAt: '刚刚',
    status: 'sim',
    type: 'progress',
    note: '已用 50% · 周期配额消耗正常'
  },
  {
    id: 'cursor_plan',
    name: 'Cursor',
    plan: '月度计划配额 (autoPercentUsed)',
    remaining: 25,
    total: 100,
    used: 75,
    unit: '%',
    resetAt: '月末重置',
    updatedAt: '刚刚',
    status: 'sim',
    type: 'progress',
    note: '已用 75% · individualUsage.plan'
  }
];

export const DISCONNECTED_SUBSCRIPTIONS: SubscriptionItem[] = [
  {
    id: 'openai_5h',
    name: 'OpenAI 5h',
    plan: '5小时窗口 (18,000s)',
    remaining: null,
    total: 100,
    used: null,
    unit: '%',
    resetAt: null,
    updatedAt: null,
    status: 'disconnected',
    type: 'progress',
    note: '等待配额服务端 (如 progress_service 端口 8766) 连接...'
  },
  {
    id: 'openai_7d',
    name: 'OpenAI 7d',
    plan: '周度窗口 (604,800s)',
    remaining: null,
    total: 100,
    used: null,
    unit: '%',
    resetAt: null,
    updatedAt: null,
    status: 'disconnected',
    type: 'progress',
    note: '等待配额服务端 (如 progress_service 端口 8766) 连接...'
  },
  {
    id: 'cursor_plan',
    name: 'Cursor',
    plan: '月度计划 (autoPercentUsed)',
    remaining: null,
    total: 100,
    used: null,
    unit: '%',
    resetAt: null,
    updatedAt: null,
    status: 'disconnected',
    type: 'progress',
    note: '等待配额服务端 (如 progress_service 端口 8766) 连接...'
  }
];

export function getCachedDashboard(): DashboardResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCachedDashboard(data: DashboardResponse) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota
  }
}

/**
 * 将 progress_service 的 [p0, p1, p2] 三项整数数组转换为标准的 SubscriptionItem 列表
 */
export function mapProgressToSubscriptions(
  progress: number[],
  simulation?: boolean,
  updatedAtTime?: string
): SubscriptionItem[] {
  const p0 = Math.min(100, Math.max(0, Math.round(progress[0] ?? 0)));
  const p1 = Math.min(100, Math.max(0, Math.round(progress[1] ?? 0)));
  const p2 = Math.min(100, Math.max(0, Math.round(progress[2] ?? 0)));

  const status = simulation ? 'sim' : 'active';
  const timeStr = updatedAtTime || new Date().toLocaleTimeString('zh-CN', { hour12: false });

  return [
    {
      id: 'openai_5h',
      name: 'OpenAI 5h',
      plan: '5小时重置窗口 (18,000s)',
      remaining: 100 - p0,
      total: 100,
      used: p0,
      unit: '%',
      resetAt: '滚动5小时',
      updatedAt: timeStr,
      status: status,
      type: 'progress',
      note: `已用 ${p0}% · 剩余 ${100 - p0}% · Codex / ChatGPT`
    },
    {
      id: 'openai_7d',
      name: 'OpenAI 7d',
      plan: '每周重置窗口 (604,800s)',
      remaining: 100 - p1,
      total: 100,
      used: p1,
      unit: '%',
      resetAt: '滚动7天',
      updatedAt: timeStr,
      status: status,
      type: 'progress',
      note: `已用 ${p1}% · 剩余 ${100 - p1}% · 7天滚动额度`
    },
    {
      id: 'cursor_plan',
      name: 'Cursor',
      plan: '月度计划 (autoPercentUsed)',
      remaining: 100 - p2,
      total: 100,
      used: p2,
      unit: '%',
      resetAt: '月末重置',
      updatedAt: timeStr,
      status: status,
      type: 'progress',
      note: `已用 ${p2}% · 剩余 ${100 - p2}% · individualUsage`
    }
  ];
}

export interface ServerProbeResult {
  ok: boolean;
  status: number;
  latencyMs: number;
  format: 'progress_array' | 'subscriptions_payload' | 'unknown';
  isSimulation?: boolean;
  subscriptions?: SubscriptionItem[];
  rawSummary?: string;
  message: string;
}

/**
 * 专门用于在设置画面中测试用户服务端的连通性并实时解析返回的配额数据
 */
export async function testServerConnection(
  serverUrl: string,
  authToken?: string
): Promise<ServerProbeResult> {
  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (authToken && authToken.trim()) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const res = await fetch(resolveDashboardUrl(serverUrl), {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const latencyMs = Math.round(performance.now() - startTime);

    if (res.status === 503) {
      return {
        ok: false,
        status: 503,
        latencyMs,
        format: 'unknown',
        message: '服务端响应 503 (上游缓存刷新中或配额源不可用)，可在设置中开启容错保留'
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        latencyMs,
        format: 'unknown',
        message: `HTTP ${res.status}: 服务端返回了错误状态码`
      };
    }

    const json = await res.json();
    const nowTimeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });

    // 格式 1: 用户自建 progress_service {"progress": [25, 50, 75], "simulation": false}
    if (json && Array.isArray(json.progress)) {
      const subs = mapProgressToSubscriptions(json.progress, json.simulation, nowTimeStr);
      return {
        ok: true,
        status: 200,
        latencyMs,
        format: 'progress_array',
        isSimulation: json.simulation,
        subscriptions: subs,
        rawSummary: JSON.stringify(json),
        message: `成功连通 (${latencyMs}ms): 识别到用户 progress_service 配额数组，共 ${subs.length} 项指标`
      };
    }

    // 格式 2: 完整 subscriptions 对象数组
    if (json && Array.isArray(json.subscriptions)) {
      return {
        ok: true,
        status: 200,
        latencyMs,
        format: 'subscriptions_payload',
        subscriptions: json.subscriptions,
        rawSummary: `包含 ${json.subscriptions.length} 项平台数据`,
        message: `成功连通 (${latencyMs}ms): 识别到订阅与配额集合，共 ${json.subscriptions.length} 个模型/平台`
      };
    }

    return {
      ok: true,
      status: 200,
      latencyMs,
      format: 'unknown',
      rawSummary: JSON.stringify(json).slice(0, 100),
      message: `连通正常 (${latencyMs}ms)，但返回未包含 progress 或 subscriptions 规范字段`
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      status: 0,
      latencyMs,
      format: 'unknown',
      message: err.name === 'AbortError'
        ? '请求超时 (4.5s)，请检查 IP、端口及防火墙'
        : `连接失败: 无法访问该地址 (${err.message || '网络不通或未放行 CORS'})`
    };
  }
}

export async function fetchRemoteDashboard(
  serverUrl: string,
  authToken?: string,
  retainCacheOn503: boolean = true
): Promise<{ data: DashboardResponse; isOnline: boolean }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (authToken && authToken.trim()) {
      headers['Authorization'] = `Bearer ${authToken.trim()}`;
    }

    const response = await fetch(resolveDashboardUrl(serverUrl), {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    // 服务端特性处理: 尚无缓存、刷新失败或缓存超过10分钟立即返回503，设备保留旧值并按原规则判过期
    if (response.status === 503 && retainCacheOn503) {
      const cached = getCachedDashboard();
      if (cached && cached.subscriptions) {
        const retainedSubs = cached.subscriptions.map((s) => ({
          ...s,
          status: 'warning' as const,
          note: '服务返回 503 (上游配额刷新中)，已保留上次历史进度'
        }));
        return {
          data: {
            ...cached,
            subscriptions: retainedSubs,
            agent: {
              status: 'idle',
              currentTask: '服务端 503 (保留历史进度)'
            }
          },
          isOnline: true
        };
      }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const nowTimeStr = new Date().toLocaleTimeString('zh-CN', { hour12: false });

    // 情况 A: 用户的 progress_service 返回 {"progress":[25,50,75], "simulation": false/true}
    if (json && Array.isArray(json.progress)) {
      const subscriptions = mapProgressToSubscriptions(json.progress, json.simulation, nowTimeStr);
      const dashboardData: DashboardResponse = {
        status: 'ok',
        timestamp: Date.now(),
        simulation: json.simulation,
        progress: json.progress,
        subscriptions,
        agent: {
          status: 'idle',
          currentTask: json.simulation
            ? '已连接 progress_service (SIM 模拟测试模式)'
            : '已连接用户配额服务端 (真实额度同步)'
        }
      };
      saveCachedDashboard(dashboardData);
      return { data: dashboardData, isOnline: true };
    }

    // 情况 B: 包含 subscriptions 字段的扩展 payload
    if (json && Array.isArray(json.subscriptions)) {
      saveCachedDashboard(json);
      return { data: json, isOnline: true };
    }

    throw new Error('未识别的数据格式: 既未包含 progress 数组，也未包含 subscriptions');
  } catch (error) {
    const cached = getCachedDashboard();
    if (cached && retainCacheOn503) {
      return { data: cached, isOnline: false };
    }
    return {
      data: {
        status: 'disconnected',
        xiaozhi: null,
        subscriptions: DISCONNECTED_SUBSCRIPTIONS,
        agent: {
          status: 'idle',
          currentTask: '未连接配额服务端，请在系统设置中配置'
        }
      },
      isOnline: false
    };
  }
}
