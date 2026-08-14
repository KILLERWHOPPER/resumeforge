// Playwright test fixtures and utilities
import { test as base, type Page } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

interface TestFixtures {
  authenticatedPage: Page;
  apiHelper: ApiHelper;
}

class ApiHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string): Promise<APIResponse> {
    return this.page.request.post('/api/v1/auth/login', {
      data: { email, password },
    });
  }

  async register(email: string, password: string): Promise<APIResponse> {
    return this.page.request.post('/api/v1/auth/register', {
      data: { email, password, confirm_password: password },
    });
  }

  async getExperiences(token: string): Promise<APIResponse> {
    return this.page.request.get('/api/v1/experiences/aggregate', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async createExperience(token: string, data: any): Promise<APIResponse> {
    return this.page.request.post('/api/v1/experiences/', {
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // This would be used with actual auth setup
    await use(page);
  },

  apiHelper: async ({ page }, use) => {
    await use(new ApiHelper(page));
  },
});

export { expect } from '@playwright/test';