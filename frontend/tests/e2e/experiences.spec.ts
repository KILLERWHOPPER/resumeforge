import { test, expect } from './fixtures';
import { uniqueEmail, registerAndLogin, injectTokens } from './fixtures';

async function loginAsFreshUser(page: import('@playwright/test').Page, request: import('@playwright/test').APIRequestContext) {
  const email = uniqueEmail();
  const tokens = await registerAndLogin(request, email, 'password123');
  await injectTokens(page, tokens);
  await page.goto('/zh-CN/experiences');
  await expect(page).toHaveURL(/\/zh-CN\/experiences/);
}

test.describe('经历管理 Experiences', () => {
  test.describe('标签页切换', () => {
    for (const [tab, label] of [
      ['education', '教育经历'],
      ['work', '工作经历'],
      ['project', '项目经历'],
      ['skill', '技能'],
      ['certificate', '证书'],
    ] as const) {
      test(`切换到 ${label} 标签并显示空状态`, async ({ page, request }) => {
        await loginAsFreshUser(page, request);
        await page.locator(`[role="tab"]:has-text("${label}")`).click();
        await expect(page.locator(`[role="tab"][data-state="active"]`)).toContainText(label);
        await expect(page.locator('text=暂无').first()).toBeVisible();
      });
    }
  });

  test.describe('创建经历', () => {
    // 弹窗内容较高时可滚动；滚动到提交按钮后正常点击
    async function submitModalForm(page: import('@playwright/test').Page) {
      const submit = page.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await submit.click();
    }

    test('创建教育经历', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('button:has-text("添加教育经历")').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      await page.locator('input[placeholder="如：清华大学"]').fill('浙江大学');
      await page.locator('input[placeholder="如：本科、硕士、博士"]').fill('本科');
      await page.locator('input[placeholder="如：计算机科学与技术"]').fill('软件工程');
      await submitModalForm(page);

      await expect(page.locator('text=浙江大学')).toBeVisible();
    });

    test('创建技能（含下拉选择）', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('[role="tab"]:has-text("技能")').click();
      await page.locator('button:has-text("添加技能")').click();

      await page.locator('input[placeholder="如：Python、React、Docker"]').fill('Python');
      // 选择分类
      await page.locator('button[aria-haspopup="listbox"]').first().click();
      await page.locator('[role="option"]:has-text("编程语言")').click();
      // 选择熟练度
      await page.locator('button[aria-haspopup="listbox"]').nth(1).click();
      await page.locator('[role="option"]:has-text("精通")').click();
      await submitModalForm(page);

      await expect(page.locator('text=Python')).toBeVisible();
    });

    test('创建项目经历（含技术标签输入）', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('[role="tab"]:has-text("项目经历")').click();
      await page.locator('button:has-text("添加项目经历")').click();

      await page.locator('input[placeholder="如：电商推荐系统重构"]').fill('分布式缓存中间件');
      await page.locator('input[placeholder="输入技术栈，按回车确认"]').fill('Redis');
      await page.locator('input[placeholder="输入技术栈，按回车确认"]').press('Enter');
      await page.locator('input[placeholder="输入技术栈，按回车确认"]').fill('Go');
      await page.locator('input[placeholder="输入技术栈，按回车确认"]').press('Enter');
      await submitModalForm(page);

      await expect(page.locator('text=分布式缓存中间件')).toBeVisible();
      await expect(page.locator('text=Redis')).toBeVisible();
    });
  });

  test.describe('表单校验', () => {
    test('必填字段为空时表单不提交、弹窗保持打开', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      await page.locator('button:has-text("添加教育经历")').click();
      // HTML5 required 阻止空表单提交，弹窗保持打开且无成功提示
      const submit = page.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await submit.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=浙江大学')).toHaveCount(0, { timeout: 3000 });
    });
  });

  test.describe('编辑与删除', () => {
    test('编辑已存在的教育经历', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      // 先创建一条
      await page.locator('button:has-text("添加教育经历")').click();
      await page.locator('input[placeholder="如：清华大学"]').fill('北京大学');
      const submit = page.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await submit.click();
      await expect(page.locator('text=北京大学')).toBeVisible();

      // 编辑
      await page.locator('button:has-text("编辑")').first().click();
      await page.locator('input[placeholder="如：清华大学"]').fill('复旦大学');
      await submit.scrollIntoViewIfNeeded();
      await submit.click();

      await expect(page.locator('text=复旦大学')).toBeVisible();
      await expect(page.locator('text=北京大学')).not.toBeVisible();
    });

    test('删除经历需确认', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      // 先创建一条
      await page.locator('button:has-text("添加教育经历")').click();
      await page.locator('input[placeholder="如：清华大学"]').fill('清华大学');
      const submit = page.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await submit.click();
      await expect(page.locator('text=清华大学')).toBeVisible();

      // 点击删除，出现确认弹窗
      await page.locator('button:has-text("删除")').first().click();
      await expect(page.locator('text=确认删除').first()).toBeVisible();
      await page.locator('button:has-text("取消")').click();
      await expect(page.locator('text=清华大学')).toBeVisible();

      // 再次删除并确认
      await page.locator('button:has-text("删除")').first().click();
      await page.locator('button:has-text("删除")').last().click();
      await expect(page.locator('text=清华大学')).not.toBeVisible();
    });
  });

  test.describe('拖拽排序', () => {
    test('拖拽改变排序', async ({ page, request }) => {
      await loginAsFreshUser(page, request);
      // 通过页面内已登录 token 直接创建两条教育经历
      const token = await page.evaluate(() => localStorage.getItem('rf_access_token'));
      await page.request.post('/api/v1/experiences/', {
        headers: { Authorization: `Bearer ${token}` },
        data: { type: 'education', school: '学校A', degree: '本科' },
      });
      await page.request.post('/api/v1/experiences/', {
        headers: { Authorization: `Bearer ${token}` },
        data: { type: 'education', school: '学校B', degree: '硕士' },
      });

      await page.reload();
      await expect(page.locator('text=学校A')).toBeVisible();
      await expect(page.locator('text=学校B')).toBeVisible();

      // 拖拽第一张卡片的拖拽手柄到第二张卡片
      const firstCard = page.locator('.card-base').first();
      const secondCard = page.locator('.card-base').nth(1);
      const firstHandle = firstCard.locator('button[aria-label="拖拽排序"]');
      const secondBox = await secondCard.boundingBox();
      if (!secondBox) throw new Error('second card not visible');

      await firstHandle.hover();
      await page.mouse.down();
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, {
        steps: 10,
      });
      await page.mouse.up();

      // 排序成功提示
      await expect(page.locator('text=排序已更新').first()).toBeVisible({ timeout: 5000 });
    });
  });
});