# Mark-QA

**UK Alarms Map** – a browser-based dashboard that displays geographic alarm markers on an interactive UK map.

## Running the application

The application is a static web app served with [live-server](https://www.npmjs.com/package/live-server).

```bash
# Install dependencies (first time only)
npm install

# Start the dev server on http://127.0.0.1:8080
npm start
```

Then open <http://127.0.0.1:8080> in your browser.

---

## Running the regression tests

Tests are written with [Playwright](https://playwright.dev) (TypeScript).  
`live-server` is started automatically by Playwright when you run the tests.

```bash
# Install dependencies (first time only)
npm install
npx playwright install chromium

# Run all tests (headless)
npm test

# Run tests with the interactive UI
npx playwright test --ui

# View the HTML test report after a run
npm run test:report
```

### What is tested

| Suite | Tests |
|---|---|
| Page Load | Title, map, buttons |
| Alarm Statistics | Loading state, counts, Last updated |
| Add New Alarm Modal | Open/close, fields, defaults, dismiss variants |
| Add Alarm Form Submission | Validation, success, error |
| Delete Confirmation Modal | Open/close, name display, confirm, error |
| Refresh Button | Re-fetches data |
| API Error Handling | Error alerts |

---

## Documentation

| Document | Description |
|---|---|
| [`docs/user-flows.md`](docs/user-flows.md) | User flows with screenshots |
| [`docs/reviewer-checklist.md`](docs/reviewer-checklist.md) | Manual QA checklist for reviewers |
