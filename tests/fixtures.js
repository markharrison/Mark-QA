const { test: base, expect } = require('@playwright/test');
const path = require('node:path');

const initialAlarms = [
    { thingid: 1, name: 'York sensor', latitude: 53.96, longitude: -1.08, status: 'green', text: 'Operating normally' },
    { thingid: 2, name: 'Cardiff sensor', latitude: 51.48, longitude: -3.18, status: 'amber', text: 'Inspection required' },
    { thingid: 3, name: 'Glasgow sensor', latitude: 55.86, longitude: -4.25, status: 'red', text: 'Immediate attention' },
];

const test = base.extend({
    api: async ({ page }, use) => {
        const pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        const api = {
            alarms: structuredClone(initialAlarms),
            requests: [],
            fail: null,
        };
        let nextId = 4;
        await page.route('**/*', async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.origin === 'https://things--api.azurewebsites.net') {
                const method = request.method();
                api.requests.push({
                    method,
                    pathname: url.pathname,
                    body: method === 'POST' ? request.postDataJSON() : null,
                });
                if (api.fail === method) {
                    return route.fulfill({ status: 500, json: { error: 'Simulated failure' } });
                }
                if (url.pathname === '/api/Things' && method === 'GET') {
                    return route.fulfill({ json: api.alarms });
                }
                if (url.pathname === '/api/Things' && method === 'POST') {
                    const alarm = { ...request.postDataJSON(), thingid: nextId++ };
                    api.alarms.push(alarm);
                    return route.fulfill({ status: 201, json: alarm });
                }
                if (method === 'DELETE' && /^\/api\/Things\/\d+$/.test(url.pathname)) {
                    const id = Number(url.pathname.split('/').pop());
                    api.alarms = api.alarms.filter(alarm => alarm.thingid !== id);
                    return route.fulfill({ status: 204 });
                }
                return route.fulfill({ status: 400 });
            }
            if (url.origin === 'https://unpkg.com' &&
                ['/leaflet@1.9.4/dist/leaflet.js', '/leaflet@1.9.4/dist/leaflet.css'].includes(url.pathname)) {
                return route.fulfill({
                    path: path.join(path.dirname(require.resolve('leaflet')), path.basename(url.pathname)),
                    contentType: url.pathname.endsWith('.js') ? 'application/javascript' : 'text/css',
                });
            }
            if (url.origin === 'http://127.0.0.1:8080') {
                return route.continue();
            }
            return route.abort();
        });
        await use(api);
        expect(pageErrors, 'Unexpected browser JavaScript errors').toEqual([]);
    },
});

async function openApp(page) {
    await page.goto('/');
    await expect(page.locator('#alarm-count')).toHaveText('Total: 3 (🟢 1 | 🟠 1 | 🔴 1)');
    await expect(page.locator('.custom-marker')).toHaveCount(3);
}

async function screenshot(page, name, testInfo) {
    if (process.env.UPDATE_DOC_SCREENSHOTS === '1' && testInfo.project.name === 'chromium') {
        await page.screenshot({
            path: path.join(__dirname, '..', 'docs', 'screenshots', `${name}.png`),
            fullPage: true,
            animations: 'disabled',
        });
    }
}

module.exports = { test, expect, openApp, screenshot };
