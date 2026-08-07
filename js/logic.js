// logic.js — Pure functions for the Expense & Budget Visualizer
// Exported for use in tests and app.js alike.

// === Constants ===

export const STORAGE_KEY    = 'ebv_transactions';
export const CATEGORIES_KEY = 'ebv_categories';
export const THEME_KEY      = 'ebv_theme';

export const BUILT_IN_CATEGORIES = ['Food', 'Transport', 'Fun'];

export const SORT_OPTIONS = {
  'amount-asc':    'Amount: Low to High',
  'amount-desc':   'Amount: High to Low',
  'category-asc':  'Category: A\u2013Z',
  'category-desc': 'Category: Z\u2013A',
  'date-desc':     'Date: Newest First',
};

// === Storage ===

/**
 * Read and return the persisted transaction array from LocalStorage.
 * Returns an empty array if no data exists, if the stored value is not
 * an array, or if any error is encountered.
 * @returns {Array}
 */
export function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Persist the given transaction array to LocalStorage.
 * @param {Array} txs
 */
export function saveTransactions(txs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
  } catch (err) {
    // Storage failure — swallowed here; app.js shows a toast
  }
}

/**
 * Read custom categories from LocalStorage. Returns [] on error or missing key.
 * @returns {string[]}
 */
export function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

/**
 * Persist the custom categories array to LocalStorage.
 * @param {string[]} cats
 */
export function saveCategories(cats) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  } catch (err) {
    // Storage failure — swallowed here
  }
}

/**
 * Read the persisted theme preference. Returns 'light' if absent or on error.
 * @returns {'light'|'dark'}
 */
export function loadTheme() {
  try {
    const val = localStorage.getItem(THEME_KEY);
    return val === 'dark' ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

/**
 * Persist the theme preference to LocalStorage.
 * @param {'light'|'dark'} theme
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    // Storage failure — swallowed here
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
export function validateTransaction(name, amount, category) {
  const errors = {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Item name is required.';
  } else if (name.trim().length > 100) {
    errors.name = 'Item name must be 100 characters or fewer.';
  }

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Amount must be a positive number.';
  } else if (amount > 999999999.99) {
    errors.amount = 'Amount must not exceed 999,999,999.99.';
  }

  if (typeof category !== 'string' || category.trim().length === 0) {
    errors.category = 'Please select a category.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validate a custom category name.
 *
 * Rules:
 *   - 1–50 characters containing at least one non-whitespace character
 *   - Must not match any existing category (case-insensitive)
 *
 * @param {string} name
 * @param {string[]} existingCategories
 * @returns {{ valid: true } | { valid: false, error: string }}
 */
export function validateCategoryName(name, existingCategories) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Category name is required.' };
  }
  if (name.trim().length > 50) {
    return { valid: false, error: 'Category name must be 50 characters or fewer.' };
  }

  const lower = name.trim().toLowerCase();
  const isDuplicate = (existingCategories || []).some(
    (c) => c.toLowerCase() === lower
  );
  if (isDuplicate) {
    return { valid: false, error: 'A category with that name already exists.' };
  }

  return { valid: true };
}

// === Business Logic ===

/**
 * Return the arithmetic sum of all `amount` fields across the given
 * transactions array. Returns 0 for an empty or falsy array.
 *
 * @param {Array<{amount: number}>} transactions
 * @returns {number}
 */
export function calculateBalance(transactions) {
  if (!transactions || transactions.length === 0) return 0;
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Build chart data from a transactions array.
 * Groups amounts by category; uses 'Uncategorized' for missing/empty category.
 * Returns null for an empty or falsy array.
 *
 * @param {Array<{category: string, amount: number}>} transactions
 * @returns {{ labels: string[], datasets: Array } | null}
 */
export function buildChartData(transactions) {
  if (!transactions || transactions.length === 0) return null;

  const COLORS = [
    '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
    '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
  ];

  const totals = {};
  for (const tx of transactions) {
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
export function sortTransactions(transactions, sortKey) {
  if (!transactions || transactions.length === 0) return [];

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

// Module-level Chart.js instance (used by renderChart).
// Only relevant in a browser context where Chart is loaded from CDN.
let _chart = null;

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
export function renderChart(chartData) {
  const canvas   = document.getElementById('spending-chart');
  const emptyMsg = document.getElementById('chart-empty-message');

  if (!canvas || !emptyMsg) return;

  if (!chartData) {
    // No data — hide chart, show empty message (Req 5.4)
    canvas.hidden   = true;
    emptyMsg.hidden = false;
    if (_chart) {
      _chart.destroy();
      _chart = null;
    }
    return;
  }

  // Data present — show chart, hide empty message (Req 5.1, 5.2, 5.3)
  canvas.hidden   = false;
  emptyMsg.hidden = true;

  // typeof Chart guard: Chart.js is loaded from CDN and unavailable in tests
  if (typeof Chart === 'undefined') return;

  if (_chart === null) {
    // Create a new Chart instance (Req 5.1)
    _chart = new Chart(canvas, {
      type: 'pie',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 16,
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
    _chart.data = chartData;
    _chart.update();
  }
}

/**
 * Reset the internal chart instance reference. Used by tests to ensure
 * a clean slate between test runs.
 * @internal
 */
export function _resetChart() {
  if (_chart) {
    _chart.destroy();
  }
  _chart = null;
}

/**
 * Format `total` to two decimal places with a `$` prefix and set the
 * text content of `#balance-display`.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * @param {number} total
 */
export function renderBalance(total) {
  const el = document.getElementById('balance-display');
  if (!el) return;
  el.textContent = `$${Number(total).toFixed(2)}`;
}

/**
 * Format an ISO 8601 date string into a human-readable local date string.
 * Returns the raw string if it cannot be parsed.
 *
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return isoString;
  }
}

/**
 * Render the transaction list into `#transaction-list`.
 *
 * Behaviour:
 *  - If `transactions` is empty (or the DOM element is absent): clear the
 *    list and show an empty-state `<li>` with the message
 *    "No transactions recorded yet."
 *  - Otherwise: sort the transactions using `sortTransactions(transactions,
 *    activeSortKey)`, then create one `<li>` per transaction containing:
 *      • a `<span class="tx-name">` for the item name
 *      • a `<span class="tx-amount">` with the amount formatted to 2 d.p.
 *      • a `<span class="tx-category">` for the category label
 *      • a `<span class="tx-date">` with a human-readable date
 *      • a `<button class="btn-delete" data-id="<id>">Delete</button>`
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 3.1
 *
 * @param {Array<{id: string, name: string, amount: number, category: string, createdAt: string}>} transactions
 * @param {string} activeSortKey  — the currently active sort key (module state)
 */
export function renderList(transactions, activeSortKey = 'date-desc') {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  // Clear existing content
  list.innerHTML = '';

  // Empty state (Req 2.4)
  if (!transactions || transactions.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'tx-empty';
    empty.textContent = 'No transactions recorded yet.';
    list.appendChild(empty);
    return;
  }

  // Sort before rendering (Req 2.2, 9.2)
  const sorted = sortTransactions(transactions, activeSortKey);

  // Build one <li> per transaction (Req 2.1, 3.1)
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
    dateEl.textContent = formatDate(tx.createdAt);

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
