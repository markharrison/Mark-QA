const { test, expect, openApp, screenshot, expectAlert } = require('./fixtures');

test.beforeEach(async ({ page, api }) => {
    await page.clock.setFixedTime(new Date('2026-01-15T12:00:00Z'));
});

test('loads alarms, status colours, details and map controls', async ({ page, api }, testInfo) => {
    await openApp(page);
    await expect(page).toHaveTitle('UK Alarms Map - MarkMap');
    await expect(page.getByRole('heading', { name: 'UK Alarms Map' })).toBeVisible();
    await expect(page.locator('#last-update')).toHaveText('Last updated: 12:00:00');
    for (const [index, colour] of ['rgb(0, 128, 0)', 'rgb(255, 165, 0)', 'rgb(255, 0, 0)'].entries()) {
        await expect(page.locator('.custom-marker > div').nth(index)).toHaveCSS('background-color', colour);
    }
    await screenshot(page, 'overview', testInfo);
    await page.locator('.custom-marker').first().click();
    const popup = page.locator('.popup-content');
    await expect(popup.getByRole('heading')).toHaveText('York sensor');
    await expect(popup).toContainText('53.960000, -1.080000');
    await expect(popup).toContainText('Operating normally');
    await expect(popup.locator('.popup-status')).toHaveText('green');
    await screenshot(page, 'alarm-details', testInfo);
    await page.getByRole('button', { name: 'Close popup' }).click();
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(() => page.evaluate(() => map.getZoom())).toBe(7);
    await expect(page.locator('.leaflet-map-pane')).not.toHaveClass(/leaflet-zoom-anim/);
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect.poll(() => page.evaluate(() => map.getZoom())).toBe(6);
    await expect(page.locator('.custom-marker')).toHaveCount(3);
    expect(api.requests.map(request => request.method)).toEqual(['GET']);
});

for (const status of ['green', 'amber', 'red']) {
    test(`adds a ${status} alarm and resets the form`, async ({ page, api }, testInfo) => {
        await openApp(page);
        await page.getByRole('button', { name: 'Add New Alarm', exact: true }).click();
        await expect(page.getByLabel('Latitude:', { exact: true })).toHaveValue('54.5');
        await expect(page.getByLabel('Longitude:', { exact: true })).toHaveValue('-3.5');
        await page.getByLabel('Name:', { exact: true }).fill('Leeds test alarm');
        await page.getByLabel('Latitude:', { exact: true }).fill('53.800001');
        await page.getByLabel('Longitude:', { exact: true }).fill('-1.500001');
        await page.getByLabel('Description:').fill('Regression test alarm');
        await page.getByLabel('Status:').selectOption(status);
        if (status === 'amber') await screenshot(page, 'add-alarm', testInfo);
        await expectAlert(page, 'Alarm added successfully!', () =>
            page.getByRole('button', { name: 'Add Alarm', exact: true }).click());
        await expect(page.locator('#add-alarm-modal')).toBeHidden();
        await expect(page.locator('.custom-marker')).toHaveCount(4);
        const counts = { green: '2 | 🟠 1 | 🔴 1', amber: '1 | 🟠 2 | 🔴 1', red: '1 | 🟠 1 | 🔴 2' };
        await expect(page.locator('#alarm-count')).toHaveText(`Total: 4 (🟢 ${counts[status]})`);
        expect(api.requests.find(request => request.method === 'POST').body).toEqual({
            name: 'Leeds test alarm', latitude: 53.800001, longitude: -1.500001,
            text: 'Regression test alarm', status, image: '', data: '',
        });
        await page.locator('.custom-marker').last().click();
        await expect(page.locator('.popup-content')).toContainText('Leeds test alarm');
        await expect(page.locator('.popup-status')).toHaveText(status);
        await page.getByRole('button', { name: 'Add New Alarm', exact: true }).click();
        await expect(page.getByLabel('Name:', { exact: true })).toHaveValue('');
        await expect(page.getByLabel('Description:')).toHaveValue('');
        await expect(page.getByLabel('Status:')).toHaveValue('green');
    });
}

test('rejects missing names and coordinates outside UK bounds without posting', async ({ page, api }) => {
    await openApp(page);
    await page.getByRole('button', { name: 'Add New Alarm', exact: true }).click();
    await page.getByRole('button', { name: 'Add Alarm', exact: true }).click();
    await expect(page.locator('#alarm-name:invalid')).toBeVisible();
    await page.getByLabel('Name:', { exact: true }).fill('Validation test');
    for (const [id, values, valid] of [
        ['alarm-latitude', ['', '48.9', '61.1'], '54.5'],
        ['alarm-longitude', ['', '-8.1', '2.1'], '-3.5'],
    ]) {
        for (const value of values) {
            await page.locator(`#${id}`).fill(value);
            await page.getByRole('button', { name: 'Add Alarm', exact: true }).click();
            await expect(page.locator(`#${id}:invalid`)).toBeVisible();
            await expect(page.locator('#add-alarm-modal')).toBeVisible();
        }
        await page.locator(`#${id}`).fill(valid);
    }
    expect(api.requests.map(request => request.method)).toEqual(['GET']);
});

for (const [latitude, longitude] of [['49', '-8'], ['61', '2']]) {
    test(`accepts UK boundary coordinates ${latitude}, ${longitude} and optional description`, async ({ page, api }) => {
        await openApp(page);
        await page.getByRole('button', { name: 'Add New Alarm', exact: true }).click();
        await page.getByLabel('Name:', { exact: true }).fill('Boundary alarm');
        await page.getByLabel('Latitude:', { exact: true }).fill(latitude);
        await page.getByLabel('Longitude:', { exact: true }).fill(longitude);
        page.once('dialog', dialog => dialog.accept());
        await page.getByRole('button', { name: 'Add Alarm', exact: true }).click();
        await expect(page.locator('#alarm-count')).toContainText('Total: 4');
        expect(api.requests.find(request => request.method === 'POST').body).toMatchObject({
            latitude: Number(latitude), longitude: Number(longitude), text: '', status: 'green',
        });
    });
}

for (const modal of ['add', 'delete']) {
    for (const dismissal of ['Cancel', 'close', 'backdrop']) {
        test(`${dismissal} dismisses the ${modal} modal without changing alarms`, async ({ page, api }) => {
            await openApp(page);
            if (modal === 'add') {
                await page.getByRole('button', { name: 'Add New Alarm', exact: true }).click();
            } else {
                await page.locator('.custom-marker').first().click();
                await page.locator('.popup-content').getByRole('button', { name: 'Delete' }).click();
            }
            const container = page.locator(modal === 'add' ? '#add-alarm-modal' : '#delete-modal');
            await expect(container).toBeVisible();
            if (dismissal === 'Cancel') await container.getByRole('button', { name: 'Cancel' }).click();
            if (dismissal === 'close') await container.locator('.close').click();
            if (dismissal === 'backdrop') await container.click({ position: { x: 5, y: 5 } });
            await expect(container).toBeHidden();
            await expect(page.locator('.custom-marker')).toHaveCount(3);
            expect(api.requests.map(request => request.method)).toEqual(['GET']);
        });
    }
}

test('confirms deletion of the selected alarm and refreshes the map', async ({ page, api }, testInfo) => {
    await openApp(page);
    await page.locator('.custom-marker').first().click();
    await page.locator('.popup-content').getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('#delete-alarm-name')).toHaveText('York sensor');
    await screenshot(page, 'delete-alarm', testInfo);
    await expectAlert(page, 'Alarm deleted successfully!', () =>
        page.locator('#confirm-delete-btn').click());
    await expect(page.locator('#delete-modal')).toBeHidden();
    await expect(page.locator('.custom-marker')).toHaveCount(2);
    await expect(page.locator('#alarm-count')).toHaveText('Total: 2 (🟢 0 | 🟠 1 | 🔴 1)');
    expect(api.requests.filter(request => request.method === 'DELETE')).toEqual([
        { method: 'DELETE', pathname: '/api/Things/1', body: null },
    ]);
    expect(api.alarms.map(alarm => alarm.thingid)).toEqual([2, 3]);
});

test('manual refresh updates existing details and coordinates, adds and removes markers', async ({ page, api }) => {
    await openApp(page);
    const marker = page.locator('.custom-marker').first();
    const position = await marker.getAttribute('style');
    api.alarms = [
        { ...api.alarms[0], name: 'York updated', text: 'New reading', latitude: 54.5 },
        { thingid: 4, name: 'New sensor', latitude: 52.5, longitude: -2, status: 'red' },
    ];
    await page.clock.setFixedTime(new Date('2026-01-15T12:01:00Z'));
    await page.getByRole('button', { name: 'Refresh Now' }).click();
    await expect(page.locator('.custom-marker')).toHaveCount(2);
    await expect(marker).not.toHaveAttribute('style', position);
    await expect(page.locator('#alarm-count')).toHaveText('Total: 2 (🟢 1 | 🟠 0 | 🔴 1)');
    await expect(page.locator('#last-update')).toHaveText('Last updated: 12:01:00');
    await marker.click();
    await expect(page.locator('.popup-content')).toContainText('York updated');
    await expect(page.locator('.popup-content')).toContainText('New reading');
    await expect(page.locator('.popup-content')).toContainText('54.500000, -1.080000');
    expect(api.requests.map(request => request.method)).toEqual(['GET', 'GET']);
});

test('polls after 60 seconds and handles an empty response', async ({ page, api }) => {
    await page.clock.install({ time: new Date('2026-01-15T12:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-15T12:00:00Z'));
    await openApp(page);
    api.alarms = [];
    await page.clock.runFor(59999);
    expect(api.requests).toHaveLength(1);
    await page.clock.runFor(1);
    await expect(page.locator('#alarm-count')).toHaveText('Total: 0 (🟢 0 | 🟠 0 | 🔴 0)');
    await expect(page.locator('.custom-marker')).toHaveCount(0);
    await expect(page.locator('#last-update')).toHaveText('Last updated: 12:01:00');
    expect(api.requests).toHaveLength(2);
});

test('reports initial load failure and recovers on refresh', async ({ page, api }) => {
    api.fail = 'GET';
    await expectAlert(page, 'Failed to load alarms. Please try again.', () => page.goto('/'));
    await expect(page.locator('#last-update')).toHaveText('Last updated: Never');
    api.fail = null;
    await page.getByRole('button', { name: 'Refresh Now' }).click();
    await expect(page.locator('.custom-marker')).toHaveCount(3);
    await expect(page.locator('#alarm-count')).toContainText('Total: 3');
});

for (const method of ['GET', 'POST', 'DELETE']) {
    test(`preserves state after ${method} failure and allows retry`, async ({ page, api }) => {
        await openApp(page);
        api.fail = method;
        let action;
        if (method === 'GET') {
            action = page.getByRole('button', { name: 'Refresh Now' });
        } else if (method === 'POST') {
            await page.getByRole('button', { name: 'Add New Alarm', exact: true }).click();
            await page.getByLabel('Name:', { exact: true }).fill('Retry alarm');
            action = page.getByRole('button', { name: 'Add Alarm', exact: true });
        } else {
            await page.locator('.custom-marker').first().click();
            await page.locator('.popup-content').getByRole('button', { name: 'Delete' }).click();
            action = page.locator('#confirm-delete-btn');
        }
        const verb = { GET: 'load alarms', POST: 'add alarm', DELETE: 'delete alarm' }[method];
        await expectAlert(page, `Failed to ${verb}. Please try again.`, () => action.click());
        await expect(page.locator('.custom-marker')).toHaveCount(3);
        await expect(page.locator('#last-update')).toHaveText('Last updated: 12:00:00');
        if (method === 'POST') {
            await expect(page.locator('#add-alarm-modal')).toBeVisible();
            await expect(page.getByLabel('Name:', { exact: true })).toHaveValue('Retry alarm');
        }
        if (method === 'DELETE') await expect(page.locator('#delete-modal')).toBeVisible();
        api.fail = null;
        if (method !== 'GET') page.once('dialog', dialog => dialog.accept());
        await action.click();
        const expectedCount = { GET: 3, POST: 4, DELETE: 2 }[method];
        await expect(page.locator('.custom-marker')).toHaveCount(expectedCount);
        await expect.poll(() => api.requests.filter(request => request.method === method).length)
            .toBe(method === 'GET' ? 3 : 2);
    });
}

test('keeps controls and add form usable on a narrow screen', async ({ page, api }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);
    await expect(page.getByRole('heading', { name: 'UK Alarms Map' })).toBeVisible();
    const add = page.getByRole('button', { name: 'Add New Alarm', exact: true });
    const refresh = page.getByRole('button', { name: 'Refresh Now' });
    const addBox = await add.boundingBox();
    const refreshBox = await refresh.boundingBox();
    expect(refreshBox.y).toBeGreaterThanOrEqual(addBox.y + addBox.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await screenshot(page, 'mobile', testInfo);
    await add.click();
    await page.getByLabel('Name:', { exact: true }).fill('Mobile alarm');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Add Alarm', exact: true }).click();
    await expect(page.locator('#alarm-count')).toContainText('Total: 4');
});
