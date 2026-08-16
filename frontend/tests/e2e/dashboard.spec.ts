import { test, expect } from './fixtures';
import { uniqueEmail, registerAndLogin, loginViaUI, injectTokens } from './fixtures';

async function loginAsFreshUser(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail();
  const tokens = await registerAndLogin(request, email, 'password123');
  await injectTokens(page, tokens);
  return { email, tokens };
}

test.describe('仪表盘 Dashboard', () => {
  test('新用户看到空状态', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.goto('/zh-CN/dashboard');
    await expect(page.locator('h1')).toContainText('我的简历');
    await expect(page.locator('text=还没有简历')).toBeVisible();
    await expect(page.locator('text=创建第一份简历')).toBeVisible();
  });

  test('新建简历按钮跳转到 /resumes/new', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.goto('/zh-CN/dashboard');
    await page.locator('a[href="/resumes/new"]').first().click();
    await expect(page).toHaveURL(/\/zh-CN\/resumes\/new/);
  });

  test('空状态动作按钮跳转创建页', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.goto('/zh-CN/dashboard');
    await page.locator('button:has-text("创建第一份简历")').click();
    await expect(page).toHaveURL(/\/zh-CN\/resumes\/new/);
  });

  test('顶部导航可跳转经历管理和设置', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.goto('/zh-CN/dashboard');

    await page.locator('header nav a:has-text("经历管理")').click();
    await expect(page).toHaveURL(/\/zh-CN\/experiences/);

    await page.goto('/zh-CN/dashboard');
    await page.locator('header nav a:has-text("设置")').click();
    await expect(page).toHaveURL(/\/zh-CN\/settings/);
  });

  test('用户菜单打开与关闭', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.goto('/zh-CN/dashboard');

    const userButton = page.locator('button[aria-haspopup="true"]');
    await userButton.click();
    await expect(page.locator('button:has-text("auth.login.logout")')).toBeVisible();
    await expect(page.locator('a:has-text("个人资料")')).toBeVisible();

    // 点击遮罩关闭
    await page.mouse.click(5, 5);
    await expect(page.locator('button:has-text("auth.login.logout")')).not.toBeVisible();
  });

  test('用户菜单跳转个人资料设置', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.goto('/zh-CN/dashboard');

    await page.locator('button[aria-haspopup="true"]').click();
    await page.locator('a:has-text("个人资料")').click();
    await expect(page).toHaveURL(/\/zh-CN\/settings\?tab=profile/);
  });

  test('移动端汉堡菜单打开导航', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh-CN/dashboard');

    const hamburger = page.locator('button[aria-label="Toggle menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await expect(page.locator('#mobile-menu a:has-text("经历管理")')).toBeVisible();

    // 通过移动菜单跳转
    await page.locator('#mobile-menu a:has-text("经历管理")').click();
    await expect(page).toHaveURL(/\/zh-CN\/experiences/);
  });
});