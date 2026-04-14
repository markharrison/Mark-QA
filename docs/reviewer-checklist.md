# Reviewer Checklist – UK Alarms Map

Use this checklist when reviewing a pull request or performing a manual regression test of the **UK Alarms Map** application.

---

## 1. General / Build

- [ ] `npm install` completes without errors
- [ ] `npm test` (Playwright suite) completes with **all tests passing**
- [ ] No new `console.error` messages appear in the browser for normal use

---

## 2. Page Load

- [ ] Page title is **"UK Alarms Map - MarkMap"**
- [ ] Header shows **"UK Alarms Map"** as the `<h1>` heading
- [ ] *"Loading alarms…"* is displayed in the header until the API responds
- [ ] After load, alarm-count shows `Total: N (🟢 G | 🟠 A | 🔴 R)` format
- [ ] *Last updated* timestamp updates after data loads
- [ ] **Add New Alarm** button is visible and labelled correctly
- [ ] **Refresh Now** button is visible and labelled correctly
- [ ] Map renders and is centred approximately on the UK

---

## 3. Map Markers

- [ ] Green-status alarms show a **green** marker
- [ ] Amber-status alarms show an **orange** marker
- [ ] Red-status alarms show a **red** marker
- [ ] Clicking a marker opens a popup with name, status badge, co-ordinates, and description
- [ ] Popup contains a red **Delete** button

---

## 4. Add New Alarm Modal

- [ ] Modal is **hidden** on page load
- [ ] Clicking **Add New Alarm** opens the modal
- [ ] Modal header reads **"Add New Alarm"**
- [ ] Form contains: Name, Latitude, Longitude, Description, Status fields
- [ ] Latitude pre-fills with `54.5` (UK centre)
- [ ] Longitude pre-fills with `-3.5` (UK centre)
- [ ] Status dropdown contains **Green (Normal)**, **Amber (Warning)**, **Red (Critical)**
- [ ] **×** close button dismisses the modal
- [ ] **Cancel** button dismisses the modal
- [ ] Clicking the dark backdrop outside the modal dismisses it
- [ ] Name field is required (browser prevents submit if blank)
- [ ] Latitude field is required (browser prevents submit if blank)
- [ ] Longitude field is required (browser prevents submit if blank)

---

## 5. Add Alarm Submission

- [ ] Submitting a valid form calls `POST /api/Things`
- [ ] On success: modal closes, success alert appears, alarm list refreshes
- [ ] On API error: modal stays open, error alert says *"Failed to add alarm…"*
- [ ] Form resets after a successful submission

---

## 6. Delete Confirmation Modal

- [ ] Delete modal is **hidden** on page load
- [ ] Opening the delete modal shows the alarm's name in bold
- [ ] Modal header reads **"Confirm Delete"**
- [ ] **×** close button dismisses the modal
- [ ] **Cancel** button dismisses the modal
- [ ] **Delete** button calls `DELETE /api/Things/{id}`
- [ ] On success: modal closes, success alert appears, alarm list refreshes
- [ ] On API error: modal stays open, error alert says *"Failed to delete alarm…"*

---

## 7. Refresh Button

- [ ] Clicking **Refresh Now** triggers a new `GET /api/Things` fetch
- [ ] Alarm count and *Last updated* timestamp update after refresh
- [ ] Removed alarms disappear from the map; new alarms appear

---

## 8. Automatic Polling

- [ ] Page loads without errors with polling enabled
- [ ] No memory leaks or duplicate timers when navigating away and back

---

## 9. Error Handling

- [ ] API load failure shows alert *"Failed to load alarms. Please try again."*
- [ ] API add failure shows alert *"Failed to add alarm. Please try again."*
- [ ] API delete failure shows alert *"Failed to delete alarm. Please try again."*

---

## 10. Responsive Design

- [ ] On mobile viewport (≤768 px), header, buttons, and modal adapt to narrow layout
- [ ] Buttons stack vertically on mobile
- [ ] Modal uses `width: 95%` and additional top margin on small screens

---

## Sign-off

| Reviewer | Date | Result |
|----------|------|--------|
| | | ☐ Approved / ☐ Changes requested |
