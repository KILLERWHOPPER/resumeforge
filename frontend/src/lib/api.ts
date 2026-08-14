/**
 * ResumeForge API 客户端
 * 基于 axios，带 Token 自动刷新和同源代理支持
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// 同源代理：通过 Next.js API route 代理到后端，所有流量走 3000 端口
const API_BASE = '';

// Token 持久化：刷新/后退后仍保持登录态
const ACCESS_TOKEN_KEY = 'rf_access_token';
const REFRESH_TOKEN_KEY = 'rf_refresh_token';

function readStoredToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

function storeToken(key: string, value: string | null) {
  if (typeof window === 'undefined') return;
  if (value === null) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, value);
}

// Token 存储（内存 + localStorage）
let accessToken: string | null = readStoredToken(ACCESS_TOKEN_KEY);
let refreshToken: string | null = readStoredToken(REFRESH_TOKEN_KEY);
let isRefreshing = false;
let globalErrorHandler: ((error: AxiosError) => void) | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

export function setGlobalErrorHandler(handler: ((error: AxiosError) => void) | null) {
  globalErrorHandler = handler;
}

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token);
    else prom.reject(error);
  });
  failedQueue = [];
}

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动附加 access token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 响应拦截：401 时自动刷新 token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        window.location.href = `/${getLocale()}/auth/login`;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });
        setTokens(data.access_token, data.refresh_token);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = `/${getLocale()}/auth/login`;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    if (globalErrorHandler && error.response?.status !== 401) {
      globalErrorHandler(error);
    }
    return Promise.reject(error);
  }
);

// 从 URL 获取当前 locale
function getLocale(): string {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const match = path.match(/^\/(zh-CN|en-US)/);
    return match ? match[1] : 'zh-CN';
  }
  return 'zh-CN';
}

// Token 管理
export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  storeToken(ACCESS_TOKEN_KEY, access);
  storeToken(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  storeToken(ACCESS_TOKEN_KEY, null);
  storeToken(REFRESH_TOKEN_KEY, null);
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ---- SSE 流式请求（简历生成进度） ----

export type SSEHandler = (event: string, data: Record<string, unknown>) => void;

export async function streamSSE(
  url: string,
  handlers: {
    onEvent: SSEHandler;
    onError?: (err: Error) => void;
  }
): Promise<void> {
  const token = getAccessToken();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`SSE 请求失败: ${res.status} ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        let event = 'message';
        let data = '';
        for (const line of raw.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data = line.slice(5).trim();
        }
        if (data) {
          try {
            handlers.onEvent(event, JSON.parse(data));
          } catch {
            handlers.onEvent(event, { raw: data });
          }
        }
      }
    }
  } catch (err) {
    handlers.onError?.(err as Error);
    throw err;
  }
}

export default api;
