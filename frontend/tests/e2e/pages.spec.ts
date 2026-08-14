import { test, expect } from '@playwright/test';

test.describe('Experience Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh-CN/experiences');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh-CN/settings');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});

test.describe('Resume Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh-CN/resumes/new');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});

test.describe('UI Component Rendering', () => {
  test('should render all auth pages without errors', async ({ page }) => {
    const pages = [
      '/zh-CN/auth/login',
      '/zh-CN/auth/register',
      '/zh-CN/auth/forgot-password',
      '/zh-CN/auth/reset-password?token=test',
    ];

    for (const url of pages) {
      await page.goto(url);
      // Check no console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await page.waitForLoadState('networkidle');
      expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
    }
  });
});