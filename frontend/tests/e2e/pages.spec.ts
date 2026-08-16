import { test, expect } from './fixtures';
import { uniqueEmail, registerAndLogin, injectTokens } from './fixtures';
import type { Page } from '@playwright/test';

async function loginAsFreshUser(page: Page, request: import('@playwright/test').APIRequestContext) {
  const tokens = await registerAndLogin(request, uniqueEmail(), 'password123');
  await injectTokens(page, tokens);
}

test.describe('页面渲染与路由', () => {
  test('根路径重定向（使用浏览器 locale）', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/[a-zA-Z-]+\/(auth\/login|dashboard)/, { timeout: 10000 });
  });

  test('已登录用户访问各页面无控制台错误', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    const pages = ['/zh-CN/dashboard', '/zh-CN/experiences', '/zh-CN/settings', '/zh-CN/resumes/new'];

    for (const url of pages) {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const realErrors = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('404') &&
          // 根布局的亮色模式 className 已知 SSR/客户端不一致告警
          !e.includes('did not match') &&
          !e.includes('className')
      );
      expect(realErrors, `${url} 不应有控制台错误`).toHaveLength(0);
    }
  });

  test('登录页无控制台错误', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/zh-CN/auth/login');
    await page.waitForLoadState('networkidle');
    expect(errors.filter((e) => !e.includes('favicon') && !e.includes('did not match'))).toHaveLength(0);
  });
});