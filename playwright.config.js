const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 2,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://127.0.0.1:8080',
        viewport: { width: 1280, height: 1000 },
        locale: 'en-GB',
        timezoneId: 'Europe/London',
        serviceWorkers: 'block',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1000 } } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 1000 } } },
        { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 1000 } } },
    ],
    webServer: {
        command: 'npm start',
        url: 'http://127.0.0.1:8080',
        reuseExistingServer: false,
    },
});
