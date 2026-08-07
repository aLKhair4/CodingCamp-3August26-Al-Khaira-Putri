# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side expense tracking application using HTML, CSS, and vanilla JavaScript. The implementation follows the architecture defined in the design document: a single `index.html`, one `css/style.css`, and one `js/app.js`. Chart.js is loaded from CDN. No build step or framework is used.

Tasks are ordered to establish the file scaffold first, then implement each feature incrementally (constants → state → storage → validation → business logic → rendering → event handlers → init), wiring everything together at each step.

---

## Tasks

- [x] 1. Scaffold project structure and base HTML
  - Create `expense-budget-visualizer/index.html` with the full HTML skeleton: `<html data-theme="light">`, `<head>` with Chart.js CDN link and `css/style.css` link, `<header>` with app title and Theme_Toggle button, `<main class="dashboard">` containing `#balance-section`, `#chart-section` (with `<canvas id="spending-chart">` and `#chart-empty-message`), `#form-section` (with `#transaction-form` and `#category-form`), `#sort-section` (with `#sort-control` select), and `#list-section` (with `<ul id="transaction-list">`)
  - Create `expense-budget-visualizer/css/style.css` as an empty file (content added in task 3)
  - Create `expense-budget-visualizer/js/app.js` as an empty file (content added in subsequent tasks)
  - Link `js/app.js` via `<script defer src="js/app.js">` in `index.html`
  - _Requirements: 1.1, 2.4, 3.1, 4.1, 5.4, 9.1, 10.3_

- [ ] 2. Implement JS constants and in-memory state (`js/app.js`)
  - [x] 2.1 Write the Constants section
    - Define `STORAGE_KEY = 'ebv_transactions'`, `CATEGORIES_KEY = 'ebv_categories'`, `THEME_KEY = 'ebv_theme'`
    - Define `BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun']`
    - Define `SORT_OPTIONS` object mapping `'amount-asc'`, `'amount-desc'`, `'category-asc'`, `'category-desc'`, `'date-desc'`
    - _Requirements: 6.1, 6.2, 8.2, 9.1_

  - [ ] 2.2 Write the State section
    - Declare module-level variables: `let transactions = []`, `let categories = [...BUILT_IN_CATEGORIES]`, `let activeSortKey = 'date-desc'`
    - _Requirements: 2.2, 6.3, 9.1_

- [ ] 3. Implement CSS theming, layout, and responsive styles (`css/style.css`)
  - [x] 3.1 Define CSS custom properties for light and dark themes
    - Write `:root[data-theme="light"]` block with colour tokens (background, surface, text, accent, border, etc.)
    - Write `:root[data-theme="dark"]` block with dark-mode equivalents
    - Add `transition: background-color 0.2s, color 0.2s` on `body` for smooth theme switch under 300ms
    - _Requirements: 7.2, 7.3, 7.4_

  - [ ] 3.2 Implement dashboard grid layout and responsive breakpoints
    - Style `<main class="dashboard">` with CSS Grid for desktop (two-column or multi-area layout)
    - Add `@media (max-width: 767px)` rule to collapse grid to single-column stacked layout
    - Ensure all interactive controls have `min-height: 44px; min-width: 44px` for touch targets
    - Style `#balance-section`, `#chart-section`, `#form-section`, `#sort-section`, `#list-section` cards
    - _Requirements: 10.1, 10.4, 10.5_

  - [x] 3.3 Style form elements, transaction list items, buttons, and error messages
    - Style `#transaction-form` and `#category-form` inputs, selects, and submit buttons
    - Style `#transaction-list` `<li>` items to display name, amount, category, date, and delete button
    - Style inline error message elements (`.error-message`)
    - Style theme toggle button in `<header>`
    - _Requirements: 1.1, 2.1, 3.1_

- [ ] 4. Implement Storage layer (`js/app.js`)
  - [x] 4.1 Write `loadTransactions()` and `saveTransactions()`
    - `loadTransactions()`: try `JSON.parse(localStorage.getItem(STORAGE_KEY))`, return array or `[]` on error; on catch, set a `storageError` flag and return `[]`
    - `saveTransactions(txs)`: try `localStorage.setItem(STORAGE_KEY, JSON.stringify(txs))`; on catch, display write-failure toast
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 4.2 Write `loadCategories()` and `saveCategories()`
    - `loadCategories()`: try parse `CATEGORIES_KEY`; return custom array or `[]` on error; on catch, set a warning flag
    - `saveCategories(cats)`: try `localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats))`; on catch, show error
    - _Requirements: 8.3, 8.5, 8.6_

  - [ ] 4.3 Write `loadTheme()` and `saveTheme()`
    - `loadTheme()`: try `localStorage.getItem(THEME_KEY)`; return `'light'` if null or error
    - `saveTheme(theme)`: try `localStorage.setItem(THEME_KEY, theme)`
    - _Requirements: 7.3, 7.4_

- [ ] 5. Implement Validation layer (`js/app.js`)
  - [x] 5.1 Write `validateTransaction(name, amount, category)`
    - Return `{ valid: true }` when: name has 1–100 non-whitespace-only chars, amount is a positive finite number ≤ 999,999,999.99, category is a non-empty string
    - Return `{ valid: false, errors: { name?, amount?, category? } }` for each failing rule
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 5.2 Write property test for `validateTransaction` — P2: whitespace names rejected
    - **Property 2: Invalid item names are rejected**
    - Use `fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'))` as name input; assert `valid === false`
    - **Validates: Requirements 1.4**

  - [ ]* 5.3 Write property test for `validateTransaction` — P3: invalid amounts rejected
    - **Property 3: Invalid amounts are rejected**
    - Use `fc.oneof(fc.float({ max: 0 }), fc.constant(1000000000), fc.constant(NaN))` as amount input; assert `valid === false`
    - **Validates: Requirements 1.6, 1.7**

  - [ ] 5.4 Write `validateCategoryName(name, existingCategories)`
    - Reject empty/whitespace-only strings and names longer than 50 chars
    - Reject names that match any entry in `existingCategories` case-insensitively
    - Return `{ valid: true }` or `{ valid: false, error: string }`
    - _Requirements: 8.1, 8.4_

  - [ ]* 5.5 Write property test for `validateCategoryName` — P16: valid names accepted
    - **Property 16: Valid custom category names are accepted**
    - Use filtered `fc.string({ minLength: 1, maxLength: 50 })` containing non-whitespace, not in existing list; assert `valid === true`
    - **Validates: Requirements 8.1, 8.2**

  - [ ]* 5.6 Write property test for `validateCategoryName` — P17: duplicates rejected
    - **Property 17: Duplicate category names are rejected (case-insensitive)**
    - For any existing category name, pass uppercase/lowercase variants; assert `valid === false`
    - **Validates: Requirements 8.4**

- [x] 6. Implement Business Logic layer (`js/app.js`)
  - [x] 6.1 Write `calculateBalance(transactions)`
    - Return the arithmetic sum of all `amount` fields; return `0` for an empty array
    - _Requirements: 4.1, 4.4, 4.5_

  - [ ]* 6.2 Write property test for `calculateBalance` — P11: balance equals sum
    - **Property 11: Balance equals sum of all transaction amounts**
    - Use `fc.array(fc.float({ noNaN: true, noDefaultInfinity: true }))` as amounts; assert result equals `amounts.reduce((a, b) => a + b, 0)`
    - **Validates: Requirements 4.1, 4.4, 4.5**

  - [x] 6.3 Write `buildChartData(transactions)`
    - Aggregate amounts by category; use `'Uncategorized'` for missing/empty category
    - Return `{ labels, datasets: [{ data, backgroundColor }] }`
    - Return `null` (or a sentinel) when the transaction array is empty
    - _Requirements: 5.1, 5.5_

  - [ ]* 6.4 Write property test for `buildChartData` — P12: segments match unique categories
    - **Property 12: Chart segments correspond 1-to-1 with active categories**
    - Use `fc.array(transactionArb, { minLength: 1 })`; assert `labels.length` equals number of distinct categories and each data value equals that category's total
    - **Validates: Requirements 5.1, 5.5**

  - [x] 6.5 Write `sortTransactions(transactions, sortKey)`
    - Implement comparators for `'amount-asc'`, `'amount-desc'`, `'category-asc'`, `'category-desc'`; use `createdAt` descending as tiebreaker for equal sort keys; `'date-desc'` sorts by `createdAt` descending
    - Return a new sorted array without mutating the input
    - _Requirements: 9.2, 9.4_

  - [ ]* 6.6 Write property test for `sortTransactions` — P19: sorted list satisfies ordering predicate
    - **Property 19: Sorted transaction list satisfies the ordering predicate**
    - Use `fc.array(transactionArb, { minLength: 2 })` with all 4 sort keys; assert every adjacent pair satisfies the comparator (with tiebreaker)
    - **Validates: Requirements 9.2, 9.4**

  - [ ]* 6.7 Write property test for `sortTransactions` — P5: default load order is most-recent-first
    - **Property 5: Default load order is most-recent-first**
    - Use `fc.array(transactionArb, { minLength: 2 })` with distinct `createdAt`; call `sortTransactions(txs, 'date-desc')`; assert result is ordered by `createdAt` descending
    - **Validates: Requirements 2.2**

- [x] 7. Checkpoint — Validate pure logic before wiring to DOM
  - Ensure all tests pass for validation and business logic functions, ask the user if questions arise.

- [ ] 8. Implement Rendering layer (`js/app.js`)
  - [x] 8.1 Write `renderBalance(total)`
    - Format `total` to two decimal places with `$` prefix; set `#balance-display` text content
    - Handle zero and negative amounts correctly
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 8.2 Write `renderChart(chartData)`
    - If `chartData` is null/empty: hide `<canvas id="spending-chart">`, show `#chart-empty-message`
    - If `chartData` is non-null: show canvas, hide empty message; create or update Chart.js pie chart instance (`chart.data = chartData; chart.update()`)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.3 Write `renderCategorySelector(categories)`
    - Populate `#category-select` with `<option>` elements for each category in the merged array (built-ins + custom); preserve currently selected value if possible
    - Include a default blank `<option>` prompting the user to select a category
    - _Requirements: 1.2, 8.2, 8.3_

  - [x] 8.4 Write `renderList(transactions)`
    - If `transactions` is empty: show empty-state message inside `#transaction-list`; hide list items
    - For each transaction: create `<li>` with item name, amount formatted to 2 decimal places, category, formatted date, and a delete `<button>` with `data-id` attribute set to `transaction.id`
    - Apply `sortTransactions(transactions, activeSortKey)` before rendering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1_

  - [ ]* 8.5 Write property test for `renderList` — P4: list renders all required fields
    - **Property 4: Transaction list renders all required fields**
    - Use `fc.array(transactionArb, { minLength: 1 })`; assert each rendered `<li>` contains name, 2-decimal amount, category, and date text
    - **Validates: Requirements 2.1**

  - [ ]* 8.6 Write property test for `renderList` — P7: every entry has a delete control
    - **Property 7: Every transaction entry has a delete control**
    - Use `fc.array(transactionArb, { minLength: 1 })`; assert each `<li>` contains a delete button with a `data-id` attribute
    - **Validates: Requirements 3.1**

  - [ ] 8.7 Write `renderErrors(errors, container)`
    - Clear existing `.error-message` elements from `container`; for each error string, insert a `<span class="error-message">` below the relevant field
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 8.4_

- [ ] 9. Implement Event Handlers and Init (`js/app.js`)
  - [x] 9.1 Write `onFormSubmit(event)` for `#transaction-form`
    - Prevent default; read `#item-name`, `#amount`, `#category-select` values
    - Call `validateTransaction`; on failure call `renderErrors`; on success: build Transaction object (`id: crypto.randomUUID()`, `createdAt: new Date().toISOString()`), push to `transactions`, call `saveTransactions`, call `renderList`, `renderBalance(calculateBalance(transactions))`, `renderChart(buildChartData(transactions))`; clear form fields
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.3, 4.2, 5.2_

  - [ ]* 9.2 Write property test for `onFormSubmit` — P1: valid submission adds exactly one entry
    - **Property 1: Valid transaction submission adds exactly one entry**
    - For any valid transaction input, assert `transactions.length` increases by exactly 1 and new entry matches submitted values
    - **Validates: Requirements 1.3**

  - [ ]* 9.3 Write property test for new transaction position — P6: new transaction at top
    - **Property 6: New transaction appears at the top (default sort)**
    - For any existing list under `'date-desc'` sort, add a new transaction and assert it is at index 0 of `sortTransactions(transactions, 'date-desc')`
    - **Validates: Requirements 2.3**

  - [ ]* 9.4 Write property test for sorting after add — P20: sort re-applies after transaction added
    - **Property 20: Sorting with an active option re-applies after adding a transaction**
    - Add a transaction while a non-default sort is active; assert rendered list satisfies the ordering predicate of that sort
    - **Validates: Requirements 9.3**

  - [ ] 9.5 Write `onDeleteClick(event)` and `onDeleteConfirm(id)`
    - `onDeleteClick`: identify transaction by `data-id`; call `window.confirm` with message containing item name and formatted amount; on true call `onDeleteConfirm`; on false do nothing
    - `onDeleteConfirm(id)`: remove transaction from `transactions` array; try `saveTransactions`; on catch show error toast and abort UI update; on success call `renderList`, `renderBalance`, `renderChart`
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 9.6 Write property test for `onDeleteConfirm` — P9: confirmed delete removes from state and storage
    - **Property 9: Confirmed deletion removes transaction from state and storage**
    - For any transaction list, confirm deletion of a random entry; assert its `id` is absent from `transactions` and from parsed `localStorage.getItem(STORAGE_KEY)`
    - **Validates: Requirements 3.3**

  - [ ]* 9.7 Write property test for `onDeleteClick` cancel — P10: cancelled deletion leaves state unchanged
    - **Property 10: Cancelled deletion leaves state and storage unchanged**
    - Capture full state snapshot; simulate cancel (return false from confirm); assert all state and storage values are identical
    - **Validates: Requirements 3.4**

  - [ ]* 9.8 Write property test for delete confirmation prompt — P8: prompt identifies transaction
    - **Property 8: Delete confirmation prompt identifies the transaction**
    - For any transaction, assert confirm message contains its name and amount formatted to 2 decimal places
    - **Validates: Requirements 3.2**

  - [ ] 9.9 Write `onThemeToggle(event)`
    - Read current `data-theme` from `document.documentElement`; toggle to opposite value; call `saveTheme`
    - _Requirements: 7.1, 7.2_

  - [ ] 9.10 Write `onSortChange(event)`
    - Set `activeSortKey` to `event.target.value`; call `renderList(transactions)`
    - _Requirements: 9.2, 9.4, 9.5_

  - [ ] 9.11 Write `onCategoryFormSubmit(event)` for `#category-form`
    - Prevent default; read `#custom-category-name` value; call `validateCategoryName(name, categories)`
    - On failure: show inline error; on success: push to `categories`, call `saveCategories`, call `renderCategorySelector(categories)`; clear input
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

  - [x] 9.12 Write `init()` and bind event listeners
    - Apply theme before rendering: `document.documentElement.setAttribute('data-theme', loadTheme())`
    - Load transactions and categories from storage; merge `BUILT_IN_CATEGORIES` with loaded custom categories
    - Show storage error banner if load failed
    - Call `renderCategorySelector(categories)`, `renderList(transactions)`, `renderBalance(calculateBalance(transactions))`, `renderChart(buildChartData(transactions))`
    - Attach `onFormSubmit` to `#transaction-form` submit event
    - Attach `onCategoryFormSubmit` to `#category-form` submit event
    - Attach `onDeleteClick` to `#transaction-list` via event delegation (click on `[data-id]`)
    - Attach `onThemeToggle` to Theme_Toggle button click
    - Attach `onSortChange` to `#sort-control` change event
    - Call `init()` inside `document.addEventListener('DOMContentLoaded', init)`
    - _Requirements: 2.2, 6.3, 6.4, 7.3, 7.4, 8.3_

- [x] 10. Implement Storage integration property tests
  - [ ]* 10.1 Write property test for `saveTransactions` / `loadTransactions` — P13: LocalStorage round-trip preserves transaction data
    - **Property 13: LocalStorage round-trip preserves transaction data**
    - Use `fc.record({ id: fc.uuid(), name: fc.string(), amount: fc.float(), category: fc.string(), createdAt: fc.string() })`; call `saveTransactions([tx])`; assert `loadTransactions()[0]` has identical fields
    - **Validates: Requirements 6.6**

  - [ ]* 10.2 Write property test for `loadTransactions` — P14: app load restores persisted transactions
    - **Property 14: App load restores persisted transactions**
    - Write a valid array to `STORAGE_KEY`; call `loadTransactions()`; assert returned array deep-equals the written array
    - **Validates: Requirements 6.3**

  - [ ]* 10.3 Write property test for `loadTheme` / `saveTheme` — P15: theme preference round-trip
    - **Property 15: Theme preference round-trip**
    - Use `fc.constantFrom('light', 'dark')`; call `saveTheme(theme)`; assert `loadTheme()` returns same value and `data-theme` attribute matches
    - **Validates: Requirements 7.3**

  - [ ]* 10.4 Write property test for `loadCategories` / `saveCategories` — P18: custom categories round-trip
    - **Property 18: Custom categories round-trip through LocalStorage**
    - Use `fc.array(validCategoryNameArb, { minLength: 1 })`; call `saveCategories(cats)`; assert `loadCategories()` deep-equals `cats`
    - **Validates: Requirements 8.3**

- [ ] 11. Checkpoint — Verify complete feature wiring
  - Ensure all tests pass (property tests and any unit tests), verify theme toggle, add/delete transactions, sort control, custom categories, chart updates, and balance updates all work together end-to-end. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical boundaries
- Property tests use fast-check with `{ numRuns: 100 }` minimum; each test includes a comment `// Feature: expense-budget-visualizer, Property N: <property text>`
- Unit tests and property tests are complementary and both should be run
- All storage functions must be wrapped in try/catch per the design; never let a storage failure crash the app
- Theme must be applied before first paint to prevent flash of unstyled content (FOUC) — do this in a `<script>` block in `<head>` before `app.js` or synchronously at top of `init()`
- `crypto.randomUUID()` is available in all modern browsers; fall back to `Date.now().toString() + Math.random()` if needed for older targets

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 1, "tasks": ["3.2", "3.3", "4.1", "4.2", "4.3"] },
    { "id": 2, "tasks": ["5.1", "5.4", "6.1", "6.3", "6.5"] },
    { "id": 3, "tasks": ["5.2", "5.3", "5.5", "5.6", "6.2", "6.4", "6.6", "6.7"] },
    { "id": 4, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.7"] },
    { "id": 5, "tasks": ["8.5", "8.6", "9.1", "9.5", "9.9", "9.10", "9.11"] },
    { "id": 6, "tasks": ["9.2", "9.3", "9.4", "9.6", "9.7", "9.8", "9.12"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3", "10.4"] }
  ]
}
```
