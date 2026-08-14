import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
  });

  test('should display login page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('登录 ResumeForge');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('登录');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('text=请输入邮箱地址')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=邮箱或密码错误')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to register page', async ({ page }) => {
    await page.click('a:has-text("立即注册")');
    await expect(page).toHaveURL(/.*\/auth\/register/);
    await expect(page.locator('h1')).toContainText('注册 ResumeForge');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('a:has-text("忘记密码")');
    await expect(page).toHaveURL(/.*\/auth\/forgot-password/);
  });
});

test.describe('Register Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh-CN/auth/register');
  });

  test('should display register page correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('注册 ResumeForge');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="确认"]')).toBeVisible();
  });

  test('should show validation error for password mismatch', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[placeholder*="确认"]', 'different');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=两次密码不一致')).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'short');
    await page.fill('input[placeholder*="确认"]', 'short');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=密码至少 8 位')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('a:has-text("立即登录")');
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/zh-CN/dashboard');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    // Since we don't have auth, we should be redirected
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});

test.describe('Experience Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/zh-CN/experiences');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/auth\/login/);
  });
});

test.describe('Language Switching', () => {
  test('should switch between Chinese and English', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('h1')).toContainText('登录 ResumeForge');

    // Navigate to English
    await page.goto('/en-US/auth/login');
    await expect(page.locator('h1')).toContainText('Login to ResumeForge');
  });

  test('should have correct translations for auth pages', async ({ page }) => {
    await page.goto('/en-US/auth/login');
    await expect(page.locator('input[type="email"]')).toHaveAttribute('placeholder', 'Enter your email address');
    await expect(page.locator('button[type="submit"]')).toContainText('Login');

    await page.goto('/en-US/auth/register');
    await expect(page.locator('h1')).toContainText('Register for ResumeForge');
  });
});

test.describe('Responsive Design', () => {
  test('should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh-CN/auth/login');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should be usable on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/zh-CN/auth/login');

    await expect(page.locator('h1')).toBeVisible();
  });

  test('should be usable on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/zh-CN/auth/login');

    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveCount(1);
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('label[for]')).toHaveCount(2); // email and password labels
  });

  test('should have accessible focus states', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]:focus')).toBeVisible();
  });
});