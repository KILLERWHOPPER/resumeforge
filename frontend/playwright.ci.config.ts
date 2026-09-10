import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  reporter: [['line']],
  outputDir: process.env.E2E_OUTPUT_DIR || '.pw-results',
  use: {
    ...(base.use as object),
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
