import { test, expect } from './fixtures';
import { uniqueEmail, registerAndLogin, injectTokens } from './fixtures';

async function loginAsFreshUser(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail();
  const tokens = await registerAndLogin(request, email, 'password123');
  await injectTokens(page, tokens);
  await page.goto('/zh-CN/settings');
  await expect(page).toHaveURL(/\/zh-CN\/settings/);
}

test.describe('设置页面 Settings', () => {
  test('设置页默认显示 LLM 配置标签', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await expect(page.locator('h1')).toContainText('设置');
    await expect(page.locator('[role="tab"][data-state="active"]')).toContainText('LLM 配置');
  });

  test('标签切换', async ({ page, request }) => {
    await loginAsFreshUser(page, request);

    for (const [tab, label] of [
      ['profile', '个人资料'],
      ['llm', 'LLM 配置'],
      ['security', '安全设置'],
      ['appearance', '外观'],
    ] as const) {
      await page.locator(`[role="tab"]:has-text("${label}")`).click();
      await expect(page.locator(`[role="tab"][data-state="active"]`)).toContainText(label);
    }
  });

  test('个人资料标签显示邮箱', async ({ page, request }) => {
    await loginAsFreshUser(page, request);
    await page.locator('[role="tab"]:has-text("个人资料")').click();
    await expect(page.locator('input[value]').first()).toHaveValue('user@example.com');
    await expect(page.locator('text=邮箱不可修改')).toBeVisible();
  });

  test.describe('LLM 配置', () => {
    test('无配置时显示空状态', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await expect(page.locator('button:has-text("添加配置")').first()).toBeVisible();
    });

    test('新增配置表单校验错误', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('button:has-text("添加配置")').first().click();
      await page.locator('button:has-text("保存配置")').click();
      // 校验错误 toast
      await expect(page.locator('text=请输入配置名称').first()).toBeVisible();
    });

    test('新增并保存 LLM 配置', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('button:has-text("添加配置")').first().click();

      await page.locator('input[placeholder="如：DeepSeek Chat、GPT-4o"]').fill('测试配置');
      await page.locator('input[placeholder="如：https://api.deepseek.com/v1"]').fill(
        'https://api.deepseek.com/v1'
      );
      await page.locator('input[placeholder="输入 API Key（加密存储）"]').fill('sk-test-123456');
      await page.locator('input[placeholder="如：deepseek-chat、gpt-4o"]').fill('deepseek-chat');
      await page.locator('button:has-text("保存配置")').click();

      await expect(page.locator('text=测试配置')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=deepseek-chat')).toBeVisible();
      // 脱敏后的 API Key（可能为 sk-test-1... 或含加密往返差异）
      await expect(page.locator('text=/sk-test/')).toBeVisible();
    });

    test('服务商切换自动填充 Base URL', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('button:has-text("添加配置")').first().click();

      await page.locator('button[aria-haspopup="listbox"]').first().click();
      await page.locator('[role="option"]:has-text("OpenAI"):not(:has-text("自定义"))').click();
      await expect(page.locator('input[placeholder="如：https://api.deepseek.com/v1"]')).toHaveValue(
        'https://api.openai.com/v1'
      );
    });

    test('删除配置需确认', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      // 先新增一条
      await page.locator('button:has-text("添加配置")').first().click();
      await page.locator('input[placeholder="如：DeepSeek Chat、GPT-4o"]').fill('待删除配置');
      await page.locator('input[placeholder="如：https://api.deepseek.com/v1"]').fill(
        'https://api.deepseek.com/v1'
      );
      await page.locator('input[placeholder="输入 API Key（加密存储）"]').fill('sk-test-123456');
      await page.locator('input[placeholder="如：deepseek-chat、gpt-4o"]').fill('deepseek-chat');
      await page.locator('button:has-text("保存配置")').click();
      await expect(page.locator('text=待删除配置')).toBeVisible();

      // 删除
      await page.locator('button[aria-label="删除"]').click();
      await expect(page.locator('text=确认删除').first()).toBeVisible();
      await page.locator('[role="dialog"] button:has-text("确认")').click();
      await expect(page.locator('h3:has-text("待删除配置")')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('安全设置', () => {
    test('两次新密码不一致提示错误', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('[role="tab"]:has-text("安全设置")').click();

      const passwordInputs = page.locator('input[type="password"]');
      await passwordInputs.nth(0).fill('password123');
      await passwordInputs.nth(1).fill('newpassword123');
      await passwordInputs.nth(2).fill('different123');
      await page.locator('button:has-text("更新密码")').click();

      await expect(page.locator('text=两次密码不一致').first()).toBeVisible();
    });
  });

  test.describe('外观设置', () => {
    test('中英文切换按钮高亮', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('[role="tab"]:has-text("外观")').click();

      // 中文按钮应为 primary 样式（当前 locale）
      const zhBtn = page.locator('button:has-text("中文")');
      await expect(zhBtn).toBeVisible();
      await expect(zhBtn).toHaveClass(/primary/);
    });
  });
});