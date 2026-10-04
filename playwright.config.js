import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser-tests',
  use: { baseURL: 'http://localhost:5173', browserName: 'chromium' },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    env: { VITE_SIGNUP_ENDPOINT: 'https://signup.test/signup' },
    reuseExistingServer: false,
  },
});
