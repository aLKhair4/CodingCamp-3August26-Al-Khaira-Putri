// === Constants ===

const STORAGE_KEY    = 'ebv_transactions';
const CATEGORIES_KEY = 'ebv_categories';
const THEME_KEY      = 'ebv_theme';

const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun'];

const SORT_OPTIONS = {
  'amount-asc':    'Amount: Low to High',
  'amount-desc':   'Amount: High to Low',
  'category-asc':  'Category: A\u2013Z',
  'category-desc': 'Category: Z\u2013A',
  'date-desc':     'Date: Newest First',
};

// === State ===

let transactions  = [];
let categories    = [...BUILT_IN_CATEGORIES];
let activeSortKey = 'date-desc';
let storageError  = false;

/** Holds the active Chart.js instance, or null when no chart is rendered. */
let chart = null;

// === Utilities ===

/**
 * Display a temporary toast message at the bottom of the screen.
 * The toast is removed automatically after 3 seconds.
 * @param {string} message
 */
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.style.cssText = [
    'position:fixed',
    'bottom:1.5rem',
    'left:50%',
    'transform:translateX(-50%)',
    'background:#333',
    'color:#fff',
    'padding:0.75rem 1.25rem',
    'border-radius:0.5rem',
    'z-index:9999',
    'font-size:0.9rem',
    'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
    'max-width:90vw',
    'text-align:center',
  ].join(';');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// === Storage ===

/**
 * Read and return the persisted transaction array from LocalStorage.
 * Returns an empty array if no data exists, if the stored value is not
 * an array, or if any error is encountered.  Sets the module-level
 * `storageError` flag on failure so that `init()` can surface a banner.
 * @returns {Array}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    storageError = true;
    return [];
  }
}

/**
 * Persist the given transaction array to LocalStorage.
 * Shows a write-failure toast if the write is unsuccessful.
 * @param {Array} txs
 */
function saveTransactions(txs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  } catch (err) {
    showToast('Could not save data. Changes may not persist.');
  }
}

// === Validation ===

/**
 * Validate the fields for a new transaction.
 *
 * Rules:
 *   - name   : non-empty string, 1–100 characters, not whitespace-only
 *   - amount : positive finite number (> 0), ≤ 999,999,999.99, not NaN
 *   - category: non-empty string
 *
 * @param {string} name
 * @param {number} amount
 * @param {string} category
 * @returns {{ valid: true } | { valid: false, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateTransaction(name, amount, category) {
  const errors = {};

  // --- name validation ---
  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Item name is required.';
  } else if (name.trim().length > 100) {
    errors.name = 'Item name must be 100 characters or fewer.';
  }

  // --- amount validation ---
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number.';
  } else if (amount > 999999999.99) {
    errors.amount = 'Amount must not exceed 999,999,999.99.';
  }

  // --- category validation ---
  if (typeof category !== 'string' || category.trim().length === 0) {
    errors.category = 'Please select a category.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

// === Business Logic ===

/**
 * Return the arithmetic sum of all `amount` fields across the given
 * transactions array.  Returns 0 for an empty array.
 *
 * Negative amounts are included in the sum (Requirement 4.5).
 *
 * @param {Array<{amount: number}>} transactions
 * @returns {number}
 */
function calculateBalance(transactions) {
  if (!transactions || transactions.length === 0) return 0;
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Sort a transactions array by the given sortKey and return a new array
 * without mutating the original.
 *
 * Supported sort keys:
 *   'amount-asc'    — amount ascending; tiebreak: createdAt descending
 *   'amount-desc'   — amount descending; tiebreak: createdAt descending
 *   'category-asc'  — category A–Z (localeCompare); tiebreak: createdAt descending
 *   'category-desc' — category Z–A (localeCompare); tiebreak: createdAt descending
 *   'date-desc'     — createdAt descending (most recent first)
 *   (unknown)       — falls back to 'date-desc' behaviour
 *
 * Requirements: 9.2, 9.4
 *
 * @param {Array<{amount: number, category: string, createdAt: string}>} transactions
 * @param {string} sortKey
 * @returns {Array}
 */
function sortTransactions(transactions, sortKey) {
  // Tiebreaker: more-recent createdAt comes first (descending)
  const byDateDesc = (a, b) => {
    if (a.createdAt > b.createdAt) return -1;
    if (a.createdAt < b.createdAt) return 1;
    return 0;
  };

  const sorted = [...transactions];

  switch (sortKey) {
    case 'amount-asc':
      sorted.sort((a, b) => {
        if (a.amount !== b.amount) return a.amount - b.amount;
        return byDateDesc(a, b);
      });
      break;

    case 'amount-desc':
      sorted.sort((a, b) => {
        if (a.amount !== b.amount) return b.amount - a.amount;
        return byDateDesc(a, b);
      });
      break;

    case 'category-asc':
      sorted.sort((a, b) => {
        const cmp = (a.category || '').localeCompare(b.category || '');
        if (cmp !== 0) return cmp;
        return byDateDesc(a, b);
      });
      break;

    case 'category-desc':
      sorted.sort((a, b) => {
        const cmp = (b.category || '').localeCompare(a.category || '');
        if (cmp !== 0) return cmp;
        return byDateDesc(a, b);
      });
      break;

    case 'date-desc':
    default:
      sorted.sort(byDateDesc);
      break;
  }

  return sorted;
}

// === Rendering ===

/**
 * Render the transaction list, applying the current `activeSortKey`.
 * Delegates to the exported `renderList` from logic.js, passing the
 * module-level sort state.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1
 *
 * @param {Array} txs
 */
function renderList(txs) {
  // Import is unavailable in plain-script context; inline the logic here
  // mirroring logic.js renderList so app.js stays self-contained.
  const list = document.getElementById('transaction-list');
  if (!list) return;

  list.innerHTML = '';

  if (!txs || txs.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'tx-empty';
    empty.textContent = 'No transactions recorded yet.';
    list.appendChild(empty);
    return;
  }

  const sorted = sortTransactions(txs, activeSortKey);

  for (const tx of sorted) {
    const li = document.createElement('li');
    li.className = 'tx-item';

    const nameEl = document.createElement('span');
    nameEl.className = 'tx-name';
    nameEl.textContent = tx.name;

    const amountEl = document.createElement('span');
    amountEl.className = 'tx-amount';
    amountEl.textContent = `$${Number(tx.amount).toFixed(2)}`;

    const categoryEl = document.createElement('span');
    categoryEl.className = 'tx-category';
    categoryEl.textContent = tx.category;

    const dateEl = document.createElement('span');
    dateEl.className = 'tx-date';
    dateEl.textContent = formatDateForDisplay(tx.createdAt);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('data-id', tx.id);
    deleteBtn.setAttribute('aria-label', `Delete transaction: ${tx.name}`);

    li.appendChild(nameEl);
    li.appendChild(amountEl);
    li.appendChild(categoryEl);
    li.appendChild(dateEl);
    li.appendChild(deleteBtn);

    list.appendChild(li);
  }
}

/**
 * Format an ISO 8601 date string into a human-readable local date string.
 * Returns the raw string if parsing fails.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatDateForDisplay(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

/**
 * Format `total` to two decimal places with a `$` prefix and set the
 * text content of `#balance-display`.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * @param {number} total
 */
function renderBalance(total) {
  const el = document.getElementById('balance-display');
  if (!el) return;
  el.textContent = `$${Number(total).toFixed(2)}`;
}

/**
 * Render or update the spending pie chart using Chart.js.
 *
 * Behaviour:
 *  - If `chartData` is null/falsy: hide `<canvas id="spending-chart">`,
 *    show `#chart-empty-message`, destroy any existing Chart instance.
 *  - If `chartData` is non-null: show the canvas, hide the empty message.
 *    • If no chart instance exists: create a new Chart with type 'pie'.
 *    • If a chart instance already exists: update it in-place via
 *      `chart.data = chartData; chart.update()`.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 *
 * @param {{ labels: string[], datasets: Array } | null} chartData
 */
function renderChart(chartData) {
  const canvas   = document.getElementById('spending-chart');
  const emptyMsg = document.getElementById('chart-empty-message');

  if (!canvas || !emptyMsg) return;

  if (!chartData) {
    // No data — hide chart, show empty message (Req 5.4)
    canvas.hidden   = true;
    emptyMsg.hidden = false;
    if (chart) {
      chart.destroy();
      chart = null;
    }
    return;
  }

  // Data present — show chart, hide empty message (Req 5.1, 5.2, 5.3)
  canvas.hidden   = false;
  emptyMsg.hidden = true;

  if (chart === null) {
    // Create a new Chart instance (Req 5.1)
    chart = new Chart(canvas, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 20,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              pointStyleWidth: 8,
              font: { size: 13 },
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
                const pct   = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : '0.0';
                return ` ${ctx.label}: $${ctx.parsed.toFixed(2)} (${pct}%)`;
              },
            },
          },
          datalabels: false,
        },
        // Smooth fade-in on load; no spin
        animation: {
          duration: 700,
          easing: 'easeInOutQuart',
        },
        // Smooth hover transition for slice offset
        transitions: {
          active: {
            animation: {
              duration: 200,
              easing: 'easeOutCubic',
            },
          },
        },
      },
    });
  } else {
    // Update the existing instance in-place (Req 5.2, 5.3)
    chart.data = chartData;
    chart.update();
  }
}

/**
 * Build the category <select> options from the merged categories array.
 * Preserves the current selection if it still exists after re-render.
 *
 * Requirements: 8.1, 8.2, 8.3
 *
 * @param {string[]} cats
 */
function renderCategorySelector(cats) {
  const select = document.getElementById('category-select');
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = '<option value="">-- Select a category --</option>';

  for (const cat of cats) {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  }

  // Restore previous selection if it still exists
  if (currentValue && [...select.options].some((o) => o.value === currentValue)) {
    select.value = currentValue;
  }
}

/**
 * Render inline validation errors below form fields.
 * Clears all existing errors before applying new ones.
 *
 * @param {{ name?: string, amount?: string, category?: string }} errors
 * @param {HTMLElement} form
 */
function renderErrors(errors, form) {
  // Clear previous errors
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  for (const [field, message] of Object.entries(errors)) {
    const input = form.querySelector(`#${field === 'category' ? 'category-select' : field}`);
    if (!input) continue;

    input.setAttribute('aria-invalid', 'true');

    const errEl = document.createElement('span');
    errEl.className = 'field-error';
    errEl.setAttribute('role', 'alert');
    errEl.textContent = message;
    input.insertAdjacentElement('afterend', errEl);
  }
}

// === Storage (inline — no ES module imports in plain-script context) ===

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    storageError = true;
    return [];
  }
}

function saveCategories(cats) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  } catch (err) {
    showToast('Could not save categories. Changes may not persist.');
  }
}

function loadTheme() {
  try {
    const val = localStorage.getItem(THEME_KEY);
    return val === 'dark' ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    // Swallowed — theme preference is non-critical
  }
}

// === Business Logic (inline) ===

/**
 * Build chart data from a transactions array.
 * Groups amounts by category; uses 'Uncategorized' for missing/empty category.
 * Returns null for an empty or falsy array.
 *
 * Requirements: 5.1, 5.5
 *
 * @param {Array<{category: string, amount: number}>} txs
 * @returns {{ labels: string[], datasets: Array } | null}
 */
function buildChartData(txs) {
  if (!txs || txs.length === 0) return null;

  const COLORS = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
    '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  ];

  const totals = {};
  for (const tx of txs) {
    const key = (tx.category && tx.category.trim()) ? tx.category.trim() : 'Uncategorized';
    totals[key] = (totals[key] || 0) + tx.amount;
  }

  const labels = Object.keys(totals);
  const data   = labels.map((l) => totals[l]);
  const backgroundColor = labels.map((_, i) => COLORS[i % COLORS.length]);

  return {
    labels,
    datasets: [{
      data,
      backgroundColor,
      borderColor: '#ffffff',
      borderWidth: 3,
      offset: 12,
      hoverOffset: 18,
    }],
  };
}

// === Event Handlers ===

function onFormSubmit(event) {
  event.preventDefault();
  const form     = document.getElementById('transaction-form');
  const name     = document.getElementById('item-name').value;
  const amount   = parseFloat(document.getElementById('amount').value);
  const category = document.getElementById('category-select').value;

  const result = validateTransaction(name, amount, category);

  if (!result.valid) {
    renderErrors(result.errors, form);
    return;
  }

  // Clear previous errors
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  const tx = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Date.now().toString(),
    name: name.trim(),
    amount,
    category,
    createdAt: new Date().toISOString(),
  };

  transactions = [tx, ...transactions];
  saveTransactions(transactions);

  // Reset form fields
  form.reset();

  renderList(transactions);
  renderBalance(calculateBalance(transactions));
  renderChart(buildChartData(transactions));
}

function onDeleteClick(event) {
  const btn = event.target.closest('[data-id]');
  if (!btn) return;

  const id = btn.getAttribute('data-id');
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;

  const confirmed = window.confirm(
    `Delete "${tx.name}" ($${Number(tx.amount).toFixed(2)})?`
  );

  if (confirmed) {
    onDeleteConfirm(id);
  }
}

function onDeleteConfirm(id) {
  const prev = transactions;
  transactions = transactions.filter((t) => t.id !== id);

  try {
    saveTransactions(transactions);
  } catch (err) {
    showToast('Deletion could not be saved to storage.');
    transactions = prev;
    return;
  }

  renderList(transactions);
  renderBalance(calculateBalance(transactions));
  renderChart(buildChartData(transactions));
}

function onThemeToggle() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  saveTheme(next);
}

function onSortChange(event) {
  activeSortKey = event.target.value;
  renderList(transactions);
}

function onCategoryFormSubmit(event) {
  event.preventDefault();
  const form  = document.getElementById('category-form');
  const input = document.getElementById('custom-category-name');
  const name  = input.value;

  // validateCategoryName is inlined here
  if (typeof name !== 'string' || name.trim().length === 0) {
    renderErrors({ 'custom-category-name': 'Category name is required.' }, form);
    return;
  }
  if (name.trim().length > 50) {
    renderErrors({ 'custom-category-name': 'Category name must be 50 characters or fewer.' }, form);
    return;
  }
  const lower = name.trim().toLowerCase();
  const isDuplicate = categories.some((c) => c.toLowerCase() === lower);
  if (isDuplicate) {
    renderErrors({ 'custom-category-name': 'A category with that name already exists.' }, form);
    return;
  }

  // Clear errors
  form.querySelectorAll('.field-error').forEach((el) => el.remove());
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));

  const newCat = name.trim();
  categories = [...categories, newCat];
  // Persist only custom categories (exclude built-ins)
  const custom = categories.filter((c) => !BUILT_IN_CATEGORIES.includes(c));
  saveCategories(custom);

  form.reset();
  renderCategorySelector(categories);
}

// === Init ===

/**
 * Show a persistent error banner at the top of the page.
 * The banner is inserted as the first child of <main> so it is immediately
 * visible.  A dismiss button allows the user to remove it.
 * @param {string} message
 */
function showErrorBanner(message) {
  const existing = document.getElementById('storage-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'storage-error-banner';
  banner.setAttribute('role', 'alert');
  banner.style.cssText = [
    'background:#c0392b',
    'color:#fff',
    'padding:0.75rem 1.25rem',
    'display:flex',
    'justify-content:space-between',
    'align-items:center',
    'gap:1rem',
    'font-size:0.9rem',
    'z-index:1000',
  ].join(';');

  const text = document.createElement('span');
  text.textContent = message;

  const dismiss = document.createElement('button');
  dismiss.textContent = '✕';
  dismiss.setAttribute('aria-label', 'Dismiss error');
  dismiss.style.cssText = [
    'background:transparent',
    'border:none',
    'color:#fff',
    'cursor:pointer',
    'font-size:1rem',
    'padding:0 0.25rem',
    'flex-shrink:0',
  ].join(';');
  dismiss.addEventListener('click', () => banner.remove());

  banner.appendChild(text);
  banner.appendChild(dismiss);

  const main = document.querySelector('main');
  if (main) {
    main.insertBefore(banner, main.firstChild);
  } else {
    document.body.insertBefore(banner, document.body.firstChild);
  }
}

/**
 * Initialise the application.
 *
 * Execution order (per design doc lifecycle):
 * 1. Apply persisted theme to <html> to prevent flash of unstyled content.
 * 2. Load transactions and categories from LocalStorage.
 * 3. Merge built-in categories with loaded custom categories.
 * 4. Show a storage error banner if any load operation failed.
 * 5. Render all UI components with the restored data.
 * 6. Attach all event listeners.
 *
 * Requirements: 2.2, 6.3, 6.4, 7.3, 7.4, 8.3
 */
function init() {
  // Step 1 — Apply theme before any rendering to avoid FOUC (Req 7.3, 7.4)
  document.documentElement.setAttribute('data-theme', loadTheme());

  // Step 2 — Load persisted data; storageError flag is set inside loaders on failure
  storageError = false;
  transactions = loadTransactions();

  const customCategories = loadCategories();
  // Step 3 — Merge built-in categories with loaded custom categories (Req 8.3)
  categories = [...BUILT_IN_CATEGORIES, ...customCategories];

  // Step 4 — Surface a banner if any storage read failed (Req 6.5, 8.5)
  if (storageError) {
    showErrorBanner('Could not load saved data. Starting with an empty list.');
  }

  // Step 5 — Render all UI components with restored data (Req 2.2, 6.3)
  renderCategorySelector(categories);
  renderList(transactions);
  renderBalance(calculateBalance(transactions));
  renderChart(buildChartData(transactions));

  // Step 6 — Attach event listeners

  // Transaction form submit (Req 1.3)
  const transactionForm = document.getElementById('transaction-form');
  if (transactionForm) {
    transactionForm.addEventListener('submit', onFormSubmit);
  }

  // Custom category form submit (Req 8.1, 8.2)
  const categoryForm = document.getElementById('category-form');
  if (categoryForm) {
    categoryForm.addEventListener('submit', onCategoryFormSubmit);
  }

  // Delete via event delegation on the transaction list (Req 3.1, 3.2)
  const transactionList = document.getElementById('transaction-list');
  if (transactionList) {
    transactionList.addEventListener('click', (event) => {
      const target = event.target.closest('[data-id]');
      if (target) {
        onDeleteClick(event);
      }
    });
  }

  // Theme toggle button (Req 7.1, 7.2)
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', onThemeToggle);
  }

  // Sort control change (Req 9.2)
  const sortControl = document.getElementById('sort-control');
  if (sortControl) {
    sortControl.addEventListener('change', onSortChange);
  }
}

document.addEventListener('DOMContentLoaded', init);
