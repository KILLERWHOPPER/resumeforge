// Playwright test fixtures and utilities
import { test as base, type Page } from '@playwright/test';

const ACCESS_TOKEN_KEY = 'rf_access_token';
const REFRESH_TOKEN_KEY = 'rf_refresh_token';

export interface TestUser {
  email: string;
  password: string;
}

/** 生成唯一的测试邮箱，避免与已有数据冲突 */
export function uniqueEmail(prefix = 'e2e'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.com`;
}

/** 通过 API 注册并登录，返回 token 对 */
export async function registerAndLogin(
  request: Page['request'],
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string }> {
  const reg = await request.post('/api/v1/auth/register', {
    data: { email, password, confirm_password: password },
  });
  if (!reg.ok()) {
    throw new Error(`register failed: ${reg.status()} ${await reg.text()}`);
  }
  const login = await request.post('/api/v1/auth/login', {
    data: { email, password },
  });
  if (!login.ok()) {
    throw new Error(`login failed: ${login.status()} ${await login.text()}`);
  }
  return login.json();
}

/** 通过 API 登录既有用户 */
export async function apiLogin(
  request: Page['request'],
  email: string,
  password: string
): Promise<{ access_token: string; refresh_token: string }> {
  const login = await request.post('/api/v1/auth/login', {
    data: { email, password },
  });
  if (!login.ok()) {
    throw new Error(`login failed: ${login.status()} ${await login.text()}`);
  }
  return login.json();
}

/** 把 token 写入 localStorage（在页面脚本运行前执行） */
export function injectTokens(page: Page, tokens: { access_token: string; refresh_token: string }) {
  return page.addInitScript(
    ([access, refresh]) => {
      window.localStorage.setItem('rf_access_token', access);
      window.localStorage.setItem('rf_refresh_token', refresh);
    },
    [tokens.access_token, tokens.refresh_token] as [string, string]
  );
}

/** 在 UI 上执行登录 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
  locale = 'zh-CN'
) {
  await page.goto(`/${locale}/auth/login`);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

export const test = base.extend<{
  testUser: TestUser;
}>({
  // 每个测试创建一个独立的新用户（无污染、可重复运行）
  testUser: async ({ page, request }, use) => {
    const email = uniqueEmail();
    const password = 'password123';
    await registerAndLogin(request, email, password);
    await use({ email, password });
  },
});

export { expect } from '@playwright/test';