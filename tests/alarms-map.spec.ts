import { test, expect, Page } from '@playwright/test';

// Mock alarm data returned by the API
const MOCK_ALARMS = [
  {
    thingid: 1,
    name: 'London HQ',
    latitude: 51.5074,
    longitude: -0.1278,
    text: 'Headquarters alarm',
    status: 'green',
    image: '',
    data: '',
  },
  {
    thingid: 2,
    name: 'Manchester Office',
    latitude: 53.4808,
    longitude: -2.2426,
    text: 'Office alarm - monitor closely',
    status: 'amber',
    image: '',
    data: '',
  },
  {
    thingid: 3,
    name: 'Edinburgh Site',
    latitude: 55.9533,
    longitude: -3.1883,
    text: 'Critical sensor failure',
    status: 'red',
    image: '',
    data: '',
  },
];

/** Intercept the Things API with our mock data */
async function mockAlarmsApi(page: Page, alarms = MOCK_ALARMS) {
  await page.route('**/api/Things', (route) => {
    if (route.request().method() === 'GET') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(alarms) });
    } else if (route.request().method() === 'POST') {
      const newAlarm = { thingid: 99, ...JSON.parse(route.request().postData() ?? '{}') };
      route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newAlarm) });
    } else {
      route.continue();
    }
  });
  await page.route('**/api/Things/**', (route) => {
    route.fulfill({ status: 204, body: '' });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PAGE LOAD
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Page Load', () => {
  test('displays the page title and header', async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
    await expect(page).toHaveTitle('UK Alarms Map - MarkMap');
    await expect(page.locator('header h1')).toHaveText('UK Alarms Map');
  });

  test('renders the map container', async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
    const map = page.locator('#map');
    await expect(map).toBeVisible();
  });

  test('shows Add New Alarm and Refresh Now buttons', async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
    await expect(page.locator('#add-alarm-btn')).toBeVisible();
    await expect(page.locator('#add-alarm-btn')).toHaveText('Add New Alarm');
    await expect(page.locator('#refresh-btn')).toBeVisible();
    await expect(page.locator('#refresh-btn')).toHaveText('Refresh Now');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ALARM STATISTICS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Alarm Statistics', () => {
  test('initially shows "Loading alarms…" in the header', async ({ page }) => {
    // Do NOT mock – let the initial state render before any fetch completes
    await page.route('**/api/Things', () => { /* never fulfil – keep loading */ });
    await page.goto('/');
    await expect(page.locator('#alarm-count')).toHaveText('Loading alarms...');
  });

  test('displays correct alarm totals after data loads', async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
    // Wait for the stats to update (1 green, 1 amber, 1 red from MOCK_ALARMS)
    await expect(page.locator('#alarm-count')).toContainText('Total: 3');
    await expect(page.locator('#alarm-count')).toContainText('🟢 1');
    await expect(page.locator('#alarm-count')).toContainText('🟠 1');
    await expect(page.locator('#alarm-count')).toContainText('🔴 1');
  });

  test('updates "Last updated" timestamp after data loads', async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
    await expect(page.locator('#last-update')).not.toHaveText('Last updated: Never');
    await expect(page.locator('#last-update')).toContainText('Last updated:');
  });

  test('shows zero counts when no alarms exist', async ({ page }) => {
    await mockAlarmsApi(page, []);
    await page.goto('/');
    await expect(page.locator('#alarm-count')).toContainText('Total: 0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADD NEW ALARM MODAL
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Add New Alarm Modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
  });

  test('modal is hidden on page load', async ({ page }) => {
    await expect(page.locator('#add-alarm-modal')).toBeHidden();
  });

  test('clicking Add New Alarm opens the modal', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#add-alarm-modal')).toBeVisible();
  });

  test('modal header shows "Add New Alarm"', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#add-alarm-modal .modal-header h2')).toHaveText('Add New Alarm');
  });

  test('form has all required fields', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#alarm-name')).toBeVisible();
    await expect(page.locator('#alarm-latitude')).toBeVisible();
    await expect(page.locator('#alarm-longitude')).toBeVisible();
    await expect(page.locator('#alarm-text')).toBeVisible();
    await expect(page.locator('#alarm-status')).toBeVisible();
  });

  test('latitude defaults to UK centre (54.5)', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#alarm-latitude')).toHaveValue('54.5');
  });

  test('longitude defaults to UK centre (-3.5)', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#alarm-longitude')).toHaveValue('-3.5');
  });

  test('status dropdown contains Green, Amber and Red options', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    const select = page.locator('#alarm-status');
    await expect(select.locator('option[value="green"]')).toHaveText('Green (Normal)');
    await expect(select.locator('option[value="amber"]')).toHaveText('Amber (Warning)');
    await expect(select.locator('option[value="red"]')).toHaveText('Red (Critical)');
  });

  test('close (×) button dismisses the modal', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#add-alarm-modal')).toBeVisible();
    await page.locator('#add-alarm-modal .close').click();
    await expect(page.locator('#add-alarm-modal')).toBeHidden();
  });

  test('Cancel button dismisses the modal', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#add-alarm-modal')).toBeVisible();
    await page.locator('#add-alarm-modal .cancel-btn').click();
    await expect(page.locator('#add-alarm-modal')).toBeHidden();
  });

  test('clicking outside the modal dismisses it', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    await expect(page.locator('#add-alarm-modal')).toBeVisible();
    // Click on the overlay backdrop (the modal element itself, not its content)
    await page.locator('#add-alarm-modal').dispatchEvent('click');
    await expect(page.locator('#add-alarm-modal')).toBeHidden();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADD ALARM FORM SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Add Alarm Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
  });

  test('Name field is required – form does not submit without it', async ({ page }) => {
    await page.locator('#add-alarm-btn').click();
    // Clear the pre-filled latitude/longitude and leave name empty
    await page.locator('#alarm-latitude').fill('54.5');
    await page.locator('#alarm-longitude').fill('-3.5');
    // Try to submit without name
    await page.locator('#add-alarm-form button[type="submit"]').click();
    // Modal should still be visible (HTML5 validation prevents submission)
    await expect(page.locator('#add-alarm-modal')).toBeVisible();
  });

  test('successfully submits the form and closes the modal', async ({ page }) => {
    // Intercept the POST so it returns the new alarm
    let postCalled = false;
    await page.route('**/api/Things', (route) => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ thingid: 99, name: 'Test Alarm', latitude: 54.5, longitude: -3.5, text: '', status: 'green', image: '', data: '' }),
        });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ALARMS) });
      }
    });

    await page.locator('#add-alarm-btn').click();
    await page.locator('#alarm-name').fill('Test Alarm');
    await page.locator('#alarm-latitude').fill('54.5');
    await page.locator('#alarm-longitude').fill('-3.5');
    await page.locator('#alarm-status').selectOption('green');

    // Handle success alert
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#add-alarm-form button[type="submit"]').click();

    // Modal should close after successful submit
    await expect(page.locator('#add-alarm-modal')).toBeHidden();
    expect(postCalled).toBe(true);
  });

  test('shows an error alert when the API call fails', async ({ page }) => {
    await page.route('**/api/Things', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ALARMS) });
      }
    });

    await page.locator('#add-alarm-btn').click();
    await page.locator('#alarm-name').fill('Bad Alarm');
    await page.locator('#alarm-latitude').fill('54.5');
    await page.locator('#alarm-longitude').fill('-3.5');

    let dialogMessage = '';
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });
    await page.locator('#add-alarm-form button[type="submit"]').click();
    await expect.poll(() => dialogMessage).toContain('Failed to add alarm');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DELETE CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Delete Confirmation Modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlarmsApi(page);
    await page.goto('/');
  });

  test('delete modal is hidden on page load', async ({ page }) => {
    await expect(page.locator('#delete-modal')).toBeHidden();
  });

  test('delete modal shows the alarm name when opened programmatically', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).openDeleteModal(42, 'Test Site');
    });
    await expect(page.locator('#delete-modal')).toBeVisible();
    await expect(page.locator('#delete-alarm-name')).toHaveText('Test Site');
  });

  test('delete modal header reads "Confirm Delete"', async ({ page }) => {
    await page.evaluate(() => (window as any).openDeleteModal(1, 'Any Site'));
    await expect(page.locator('#delete-modal .modal-header h2')).toHaveText('Confirm Delete');
  });

  test('close (×) button dismisses the delete modal', async ({ page }) => {
    await page.evaluate(() => (window as any).openDeleteModal(1, 'Any Site'));
    await page.locator('#delete-modal .close').click();
    await expect(page.locator('#delete-modal')).toBeHidden();
  });

  test('Cancel button dismisses the delete modal', async ({ page }) => {
    await page.evaluate(() => (window as any).openDeleteModal(1, 'Any Site'));
    await page.locator('#delete-modal .cancel-btn').click();
    await expect(page.locator('#delete-modal')).toBeHidden();
  });

  test('Delete button calls DELETE API and closes modal', async ({ page }) => {
    let deleteCalled = false;
    await page.route('**/api/Things/42', (route) => {
      deleteCalled = true;
      route.fulfill({ status: 204, body: '' });
    });

    await page.evaluate(() => (window as any).openDeleteModal(42, 'London HQ'));
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#confirm-delete-btn').click();

    await expect(page.locator('#delete-modal')).toBeHidden();
    expect(deleteCalled).toBe(true);
  });

  test('shows error alert when delete API fails', async ({ page }) => {
    await page.route('**/api/Things/42', (route) => {
      route.fulfill({ status: 500, body: 'Internal Server Error' });
    });

    await page.evaluate(() => (window as any).openDeleteModal(42, 'London HQ'));

    let dialogMessage = '';
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });
    await page.locator('#confirm-delete-btn').click();
    await expect.poll(() => dialogMessage).toContain('Failed to delete alarm');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. REFRESH BUTTON
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Refresh Button', () => {
  test('clicking Refresh Now re-fetches alarms from the API', async ({ page }) => {
    let fetchCount = 0;
    await page.route('**/api/Things', (route) => {
      if (route.request().method() === 'GET') {
        fetchCount++;
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ALARMS) });
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    // Wait for initial load
    await expect(page.locator('#alarm-count')).toContainText('Total: 3');
    const beforeCount = fetchCount;

    await page.locator('#refresh-btn').click();
    // Wait for the stats to update again
    await expect(page.locator('#alarm-count')).toContainText('Total: 3');
    expect(fetchCount).toBeGreaterThan(beforeCount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. API ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────
test.describe('API Error Handling', () => {
  test('shows error alert when initial alarm load fails', async ({ page }) => {
    await page.route('**/api/Things', (route) => {
      route.fulfill({ status: 503, body: 'Service Unavailable' });
    });

    let dialogMessage = '';
    page.once('dialog', (dialog) => {
      dialogMessage = dialog.message();
      dialog.accept();
    });

    await page.goto('/');
    await expect.poll(() => dialogMessage, { timeout: 10000 }).toContain('Failed to load alarms');
  });
});
