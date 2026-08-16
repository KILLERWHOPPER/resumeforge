import { test, expect } from './fixtures';
import { uniqueEmail, registerAndLogin, injectTokens } from './fixtures';
import type { Page } from '@playwright/test';

const SAMPLE_JD =
  '我们正在寻找一名高级后端工程师，负责设计和维护高并发分布式系统。要求熟悉 Python、FastAPI、PostgreSQL，具备良好的系统设计能力和团队协作精神。';

/** 注入已登录 token 并 mock JD 分析与生成接口，保证测试确定性 */
async function setupAuthenticated(
  page: Page,
  request: import('@playwright/test').APIRequestContext
) {
  const email = uniqueEmail();
  const tokens = await registerAndLogin(request, email, 'password123');
  await injectTokens(page, tokens);
}

/** mock /analyze-jd 与 /generate 的 SSE 流，返回稳定的分析结果 */
function mockGeneration(page: Page, resumeId = 1) {
  let nextId = resumeId;

  // 创建简历接口
  page.route('**/api/v1/resumes/', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      const body = req.postDataJSON?.() || {};
      const id = nextId++;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id,
          company_name: body.company_name || null,
          target_language: body.target_language || 'english',
          status: 'draft',
          created_at: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  });

  // JD 分析接口（延迟 800ms，确保"分析 JD..."加载态可见）
  page.route('**/api/v1/resumes/*/analyze-jd', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        resume_id: nextId - 1,
        core_responsibilities: ['设计和维护高并发系统'],
        required_skills: ['Python', 'FastAPI'],
        preferred_skills: ['Redis', 'Kafka'],
        experience_level: '3-5年',
        soft_skills: ['团队协作'],
        keywords: ['分布式', '后端', 'Python'],
        created_at: new Date().toISOString(),
      }),
    });
  });

  // 生成接口（SSE 流，延迟确保加载态可见）
  page.route('**/api/v1/resumes/*/generate', async (route) => {
    await new Promise((r) => setTimeout(r, 800));
    const body = [
      'event: status\ndata: {"stage":"analyzing","message":"分析职位要求..."}\n\n',
      'event: status\ndata: {"stage":"matching","message":"匹配个人经历..."}\n\n',
      'event: chunk\ndata: {"delta":"工作经历\\n- 负责后端服务开发"}\n\n',
      'event: status\ndata: {"stage":"writing","message":"撰写简历内容..."}\n\n',
      'event: complete\ndata: {"version":2}\n\n',
    ].join('');
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache' },
      body,
    });
  });

  // 生效的 LLM provider
  page.route('**/api/v1/llm-configs/effective', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        source: 'opencode_free',
        name: 'OpenCode DeepSeek V4 Flash (免费)',
        model_name: 'deepseek-v4-flash-free',
        base_url: 'https://opencode.ai/zen/v1',
      }),
    });
  });

  // 经历聚合
  page.route('**/api/v1/experiences/aggregate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        education: [],
        work: [],
        project: [],
        skill: [],
        certificate: [],
      }),
    });
  });
}

test.describe('简历创建流程 Resume Creation', () => {
  test.beforeEach(async ({ page, request }) => {
    await setupAuthenticated(page, request);
  });

  test('JD 为空显示校验错误', async ({ page }) => {
    mockGeneration(page);
    await page.goto('/zh-CN/resumes/new');
    await page.locator('button:has-text("生成简历")').click();
    await expect(page.locator('text=请输入职位描述').first()).toBeVisible();
  });

  test('JD 过短显示校验错误', async ({ page }) => {
    mockGeneration(page);
    await page.goto('/zh-CN/resumes/new');
    await page.locator('textarea').fill('太短的 JD');
    await page.locator('button:has-text("生成简历")').click();
    await expect(page.locator('text=职位描述至少 50 字符').first()).toBeVisible();
  });

  test('显示 provider 信息与经历完整性检查', async ({ page }) => {
    mockGeneration(page);
    await page.goto('/zh-CN/resumes/new');
    await expect(page.locator('text=当前使用 OpenCode 匿名免费模型').first()).toBeVisible();
    await expect(page.locator('text=经历完整性检查')).toBeVisible();
    await expect(page.locator('text=缺少工作或项目经历').first()).toBeVisible();
    await expect(page.locator('text=缺少教育经历').first()).toBeVisible();
    await expect(page.locator('text=缺少技能').first()).toBeVisible();
  });

  test('目标语言下拉切换', async ({ page }) => {
    mockGeneration(page);
    await page.goto('/zh-CN/resumes/new');
    await page.locator('button[aria-haspopup="listbox"]').click();
    await page.locator('[role="option"]:has-text("中文")').click();
    await expect(page.locator('button[aria-haspopup="listbox"]')).toContainText('中文');
  });

  test('完整流程：表单 → 分析 → 展示分析结果 → 生成 → 跳转', async ({ page }) => {
    mockGeneration(page);
    await page.goto('/zh-CN/resumes/new');

    // 填写表单
    await page.locator('textarea').fill(SAMPLE_JD);
    await page.locator('input[placeholder="如：字节跳动（可选）"]').fill('字节跳动');
    await page.locator('button:has-text("生成简历")').click();

    // 分析中
    await expect(page.locator('text=分析 JD...').first()).toBeVisible({ timeout: 10000 });

    // 分析结果
    await expect(page.locator('text=JD 分析结果')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=设计和维护高并发系统')).toBeVisible();
    await expect(page.locator('text=Python').first()).toBeVisible();
    await expect(page.locator('text=FastAPI').first()).toBeVisible();

    // 继续生成
    await page.locator('button:has-text("继续生成简历")').click();

    // 生成中进度
    await expect(page.locator('text=正在生成简历').first()).toBeVisible();
    await expect(page.locator('text=实时内容预览')).toBeVisible({ timeout: 5000 });

    // 完成后跳转到简历结果页
    await expect(page).toHaveURL(/\/zh-CN\/resumes\/1/, { timeout: 10000 });
  });

  test('重新分析按钮触发重新分析', async ({ page }) => {
    mockGeneration(page);
    await page.goto('/zh-CN/resumes/new');
    await page.locator('textarea').fill(SAMPLE_JD);
    await page.locator('button:has-text("生成简历")').click();

    await expect(page.locator('text=JD 分析结果')).toBeVisible({ timeout: 10000 });
    await page.locator('button:has-text("重新分析")').click();
    await expect(page.locator('text=分析 JD...').first()).toBeVisible();
    await expect(page.locator('text=JD 分析结果')).toBeVisible({ timeout: 10000 });
  });
});