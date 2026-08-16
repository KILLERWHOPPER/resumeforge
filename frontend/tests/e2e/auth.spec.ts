import { test, expect } from './fixtures';
import { uniqueEmail, registerAndLogin, loginViaUI } from './fixtures';

test.describe('登录流程 Authentication Flow', () => {
  test('登录页正确渲染（中文）', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('h1')).toContainText('登录 ResumeForge');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('登录');
  });

  test('登录页正确渲染（英文）', async ({ page }) => {
    await page.goto('/en-US/auth/login');
    await expect(page.locator('h1')).toContainText('Login to ResumeForge');
    await expect(page.locator('input[type="email"]')).toHaveAttribute(
      'placeholder',
      'Enter your email address'
    );
    await expect(page.locator('button[type="submit"]')).toContainText('Login');
  });

  test('空字段提交不跳转（HTML5 required 校验）', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/zh-CN\/auth\/login/);
    // 邮箱输入框应仍处于非法状态（原生校验阻止提交）
    const invalid = await page
      .locator('input[type="email"]')
      .evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(invalid).toBe(false);
  });

  test('错误凭据显示错误提示', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await page.locator('input[type="email"]').fill('nobody@test.com');
    await page.locator('input[type="password"]').fill('wrong-password');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=邮箱或密码错误')).toBeVisible({ timeout: 5000 });
  });

  test('密码可见性切换', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    const password = page.locator('input[type="password"]');
    await password.fill('secret123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.locator('button[aria-label="显示密码"]').click();
    await expect(page.locator('input[type="text"]')).toHaveValue('secret123');
    await page.locator('button[aria-label="隐藏密码"]').click();
    await expect(page.locator('input[type="password"]')).toHaveValue('secret123');
  });

  test('正确凭据登录并跳转仪表盘', async ({ page, request }) => {
    const email = uniqueEmail();
    const password = 'password123';
    await registerAndLogin(request, email, password);

    await page.goto('/zh-CN/auth/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/zh-CN\/dashboard/, { timeout: 10000 });
  });

  test('跳转注册页', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await page.locator('a:has-text("立即注册")').click();
    await expect(page).toHaveURL(/\/zh-CN\/auth\/register/);
    await expect(page.locator('h1')).toContainText('注册 ResumeForge');
  });
});

test.describe('注册流程 Register Flow', () => {
  test('注册页正确渲染', async ({ page }) => {
    await page.goto('/zh-CN/auth/register');
    await expect(page.locator('h1')).toContainText('注册 ResumeForge');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="再次输入"]')).toBeVisible();
  });

  test('两次密码不一致显示校验错误', async ({ page }) => {
    await page.goto('/zh-CN/auth/register');
    await page.locator('input[type="email"]').fill('someone@test.com');
    await page.locator('input[type="password"]').first().fill('password123');
    await page.locator('input[placeholder*="再次输入"]').fill('different123');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=两次密码不一致')).toBeVisible();
  });

  test('密码过短时原生校验阻止提交', async ({ page }) => {
    await page.goto('/zh-CN/auth/register');
    await page.locator('input[type="email"]').fill('someone@test.com');
    await page.locator('input[type="password"]').first().fill('short');
    await page.locator('input[placeholder*="再次输入"]').fill('short');
    await page.locator('button[type="submit"]').click();
    // HTML5 minLength=8 原生校验阻止提交，页面保持注册页
    await expect(page).toHaveURL(/\/zh-CN\/auth\/register/);
    const valid = await page
      .locator('input[type="password"]')
      .first()
      .evaluate((el) => (el as HTMLInputElement).checkValidity());
    expect(valid).toBe(false);
  });

  test('成功注册后跳转登录页', async ({ page }) => {
    await page.goto('/zh-CN/auth/register');
    await page.locator('input[type="email"]').fill(uniqueEmail());
    await page.locator('input[type="password"]').first().fill('password123');
    await page.locator('input[placeholder*="再次输入"]').fill('password123');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/zh-CN\/auth\/login/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('登录 ResumeForge');
  });

  test('跳转登录页', async ({ page }) => {
    await page.goto('/zh-CN/auth/register');
    await page.locator('a:has-text("立即登录")').click();
    await expect(page).toHaveURL(/\/zh-CN\/auth\/login/);
  });
});

test.describe('未登录访问受保护页面', () => {
  const protectedPages = ['/zh-CN/dashboard', '/zh-CN/experiences', '/zh-CN/settings', '/zh-CN/resumes/new'];

  for (const url of protectedPages) {
    test(`${url} 重定向到登录页`, async ({ page }) => {
      await page.goto(url);
      await expect(page).toHaveURL(/\/zh-CN\/auth\/login/, { timeout: 10000 });
    });
  }
});

test.describe('退出登录 Logout', () => {
  test('从用户菜单退出登录', async ({ page, request }) => {
    const email = uniqueEmail();
    await registerAndLogin(request, email, 'password123');
    await loginViaUI(page, email, 'password123');
    await expect(page).toHaveURL(/\/zh-CN\/dashboard/);

    await page.locator('button[aria-haspopup="true"]').click();
    await expect(page.locator('button:has-text("auth.login.logout")')).toBeVisible();
    await page.locator('button:has-text("auth.login.logout")').click();
    await expect(page).toHaveURL(/\/zh-CN\/auth\/login/, { timeout: 10000 });
  });
});

test.describe('语言切换 Language Switching', () => {
  test('中英文页面切换', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('h1')).toContainText('登录 ResumeForge');
    await page.goto('/en-US/auth/login');
    await expect(page.locator('h1')).toContainText('Login to ResumeForge');
  });

  test('英文注册页翻译正确', async ({ page }) => {
    await page.goto('/en-US/auth/register');
    await expect(page.locator('h1')).toContainText('Register for ResumeForge');
    await expect(page.locator('input[type="email"]')).toHaveAttribute(
      'placeholder',
      'Enter your email address'
    );
  });
});

test.describe('响应式与可访问性 Responsive & Accessibility', () => {
  test('移动端登录页可用', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('标题层级正确（仅一个 h1）', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('表单标签关联正确', async ({ page }) => {
    await page.goto('/zh-CN/auth/login');
    await expect(page.locator('label[for]')).toHaveCount(2);
  });
});