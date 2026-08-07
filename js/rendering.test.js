// @vitest-environment jsdom
// Feature: expense-budget-visualizer
// Unit tests for DOM rendering functions.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderBalance, renderList, renderChart, _resetChart } from './logic.js';

// ---------------------------------------------------------------------------
// renderBalance — unit tests
// Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
// ---------------------------------------------------------------------------

describe('renderBalance — unit tests', () => {
  beforeEach(() => {
    // Reset the DOM to a clean state with the required element before each test.
    document.body.innerHTML = '<div id="balance-display"></div>';
  });

  it('formats zero as "$0.00"', () => {
    renderBalance(0);
    expect(document.getElementById('balance-display').textContent).toBe('$0.00');
  });

  it('formats a positive integer as two decimal places', () => {
    renderBalance(100);
    expect(document.getElementById('balance-display').textContent).toBe('$100.00');
  });

  it('formats a positive decimal correctly', () => {
    renderBalance(12.5);
    expect(document.getElementById('balance-display').textContent).toBe('$12.50');
  });

  it('formats a value already at two decimal places unchanged', () => {
    renderBalance(9.99);
    expect(document.getElementById('balance-display').textContent).toBe('$9.99');
  });

  it('rounds to two decimal places', () => {
    renderBalance(1.005);
    // toFixed(2) behaviour: result should have exactly two decimal places
    const text = document.getElementById('balance-display').textContent;
    expect(text.startsWith('$')).toBe(true);
    expect(text.split('.')[1]).toHaveLength(2);
  });

  it('formats a negative amount correctly (Req 4.5)', () => {
    renderBalance(-5.25);
    expect(document.getElementById('balance-display').textContent).toBe('$-5.25');
  });

  it('formats a negative integer as two decimal places', () => {
    renderBalance(-42);
    expect(document.getElementById('balance-display').textContent).toBe('$-42.00');
  });

  it('handles very small positive amounts', () => {
    renderBalance(0.01);
    expect(document.getElementById('balance-display').textContent).toBe('$0.01');
  });

  it('sets textContent of #balance-display (Req 4.1)', () => {
    renderBalance(50);
    const el = document.getElementById('balance-display');
    expect(el.textContent).toBe('$50.00');
  });

  it('does not throw when #balance-display is absent', () => {
    document.body.innerHTML = ''; // remove the element
    expect(() => renderBalance(10)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// renderList — unit tests
// Requirements: 2.1, 2.2, 2.3, 2.4, 3.1
// ---------------------------------------------------------------------------

const makeTx = (overrides = {}) => ({
  id: 'tx-1',
  name: 'Coffee',
  amount: 4.5,
  category: 'Food',
  createdAt: '2024-06-01T10:00:00.000Z',
  ...overrides,
});

describe('renderList — unit tests', () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="transaction-list"></ul>';
  });

  // Req 2.4 — empty state message
  it('shows empty-state message when transactions array is empty', () => {
    renderList([], 'date-desc');
    const list = document.getElementById('transaction-list');
    expect(list.children).toHaveLength(1);
    expect(list.querySelector('.tx-empty')).not.toBeNull();
    expect(list.querySelector('.tx-empty').textContent).toBe('No transactions recorded yet.');
  });

  it('shows empty-state message when transactions is null', () => {
    renderList(null, 'date-desc');
    expect(document.querySelector('.tx-empty')).not.toBeNull();
  });

  it('shows empty-state message when transactions is undefined', () => {
    renderList(undefined, 'date-desc');
    expect(document.querySelector('.tx-empty')).not.toBeNull();
  });

  // Req 2.1 — each transaction renders all required fields
  it('renders item name in a .tx-name span', () => {
    renderList([makeTx({ name: 'Bus fare' })], 'date-desc');
    expect(document.querySelector('.tx-name').textContent).toBe('Bus fare');
  });

  it('renders amount formatted to 2 decimal places', () => {
    renderList([makeTx({ amount: 12.5 })], 'date-desc');
    expect(document.querySelector('.tx-amount').textContent).toBe('$12.50');
  });

  it('renders amount with exactly 2 decimal places for whole numbers', () => {
    renderList([makeTx({ amount: 100 })], 'date-desc');
    expect(document.querySelector('.tx-amount').textContent).toBe('$100.00');
  });

  it('renders category in a .tx-category span', () => {
    renderList([makeTx({ category: 'Transport' })], 'date-desc');
    expect(document.querySelector('.tx-category').textContent).toBe('Transport');
  });

  it('renders a formatted date in a .tx-date span', () => {
    renderList([makeTx({ createdAt: '2024-06-01T10:00:00.000Z' })], 'date-desc');
    const dateEl = document.querySelector('.tx-date');
    expect(dateEl).not.toBeNull();
    expect(dateEl.textContent.trim().length).toBeGreaterThan(0);
  });

  // Req 3.1 — each entry has a delete button with data-id
  it('renders a delete button with data-id set to transaction.id', () => {
    renderList([makeTx({ id: 'abc-123' })], 'date-desc');
    const btn = document.querySelector('.btn-delete');
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('data-id')).toBe('abc-123');
  });

  it('renders one <li> per transaction', () => {
    const txs = [
      makeTx({ id: 't1', createdAt: '2024-06-03T10:00:00.000Z' }),
      makeTx({ id: 't2', createdAt: '2024-06-02T10:00:00.000Z' }),
      makeTx({ id: 't3', createdAt: '2024-06-01T10:00:00.000Z' }),
    ];
    renderList(txs, 'date-desc');
    expect(document.querySelectorAll('.tx-item')).toHaveLength(3);
  });

  it('does not show the empty-state message when transactions exist', () => {
    renderList([makeTx()], 'date-desc');
    expect(document.querySelector('.tx-empty')).toBeNull();
  });

  // Req 2.2 — default sort is date-desc (most recent first)
  it('orders transactions most-recent-first under date-desc sort', () => {
    const txs = [
      makeTx({ id: 'old', name: 'Old', createdAt: '2024-01-01T00:00:00.000Z' }),
      makeTx({ id: 'new', name: 'New', createdAt: '2024-06-01T00:00:00.000Z' }),
    ];
    renderList(txs, 'date-desc');
    const items = document.querySelectorAll('.tx-item');
    expect(items[0].querySelector('.tx-name').textContent).toBe('New');
    expect(items[1].querySelector('.tx-name').textContent).toBe('Old');
  });

  it('re-renders from scratch on each call (no duplicate items)', () => {
    renderList([makeTx()], 'date-desc');
    renderList([makeTx()], 'date-desc');
    expect(document.querySelectorAll('.tx-item')).toHaveLength(1);
  });

  it('does not throw when #transaction-list element is absent', () => {
    document.body.innerHTML = '';
    expect(() => renderList([makeTx()], 'date-desc')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// renderChart — unit tests
// Requirements: 5.1, 5.2, 5.3, 5.4
// ---------------------------------------------------------------------------

/**
 * Minimal Chart.js stub: records the last call so tests can assert on it.
 * Also provides destroy(), update(), and a data property so renderChart's
 * update branch can be exercised.
 */
class ChartStub {
  constructor(canvas, config) {
    ChartStub.lastInstance = this;
    ChartStub.constructorCalls.push({ canvas, config });
    this.data    = config.data;
    this._type   = config.type;
    this.options = config.options;
  }
  update()  { ChartStub.updateCalls++; }
  destroy() { ChartStub.destroyCalls++; }
}

function resetChartStub() {
  ChartStub.lastInstance    = null;
  ChartStub.constructorCalls = [];
  ChartStub.updateCalls     = 0;
  ChartStub.destroyCalls    = 0;
}

const sampleChartData = {
  labels: ['Food', 'Transport'],
  datasets: [{ data: [30, 70], backgroundColor: ['#4e79a7', '#f28e2b'] }],
};

describe('renderChart — unit tests', () => {
  beforeEach(() => {
    // Provide the required DOM elements
    document.body.innerHTML = `
      <canvas id="spending-chart"></canvas>
      <p id="chart-empty-message" hidden>No spending data to visualise.</p>
    `;
    // Reset internal chart state between tests
    _resetChart();
    // Install Chart stub on globalThis so renderChart can find it
    resetChartStub();
    globalThis.Chart = ChartStub;
  });

  // Req 5.4 — null data hides canvas and shows empty message
  it('hides canvas and shows empty message when chartData is null (Req 5.4)', () => {
    renderChart(null);
    const canvas   = document.getElementById('spending-chart');
    const emptyMsg = document.getElementById('chart-empty-message');
    expect(canvas.hidden).toBe(true);
    expect(emptyMsg.hidden).toBe(false);
  });

  it('hides canvas and shows empty message when chartData is undefined (Req 5.4)', () => {
    renderChart(undefined);
    expect(document.getElementById('spending-chart').hidden).toBe(true);
    expect(document.getElementById('chart-empty-message').hidden).toBe(false);
  });

  // Req 5.1 — non-null data shows canvas and hides empty message
  it('shows canvas and hides empty message when chartData is provided (Req 5.1)', () => {
    renderChart(sampleChartData);
    const canvas   = document.getElementById('spending-chart');
    const emptyMsg = document.getElementById('chart-empty-message');
    expect(canvas.hidden).toBe(false);
    expect(emptyMsg.hidden).toBe(true);
  });

  // Req 5.1 — creates a pie chart on first call
  it('creates a new Chart instance of type "pie" on first non-null call (Req 5.1)', () => {
    renderChart(sampleChartData);
    expect(ChartStub.constructorCalls).toHaveLength(1);
    expect(ChartStub.constructorCalls[0].config.type).toBe('pie');
  });

  it('passes chartData to the Chart constructor (Req 5.1)', () => {
    renderChart(sampleChartData);
    expect(ChartStub.constructorCalls[0].config.data).toBe(sampleChartData);
  });

  // Req 5.2 / 5.3 — subsequent calls update in-place rather than recreating
  it('updates existing chart instance in-place on subsequent calls (Req 5.2, 5.3)', () => {
    renderChart(sampleChartData);
    const updatedData = {
      labels: ['Fun'],
      datasets: [{ data: [100], backgroundColor: ['#e15759'] }],
    };
    renderChart(updatedData);
    // Constructor called only once; update called once
    expect(ChartStub.constructorCalls).toHaveLength(1);
    expect(ChartStub.updateCalls).toBe(1);
    // data property was replaced
    expect(ChartStub.lastInstance.data).toBe(updatedData);
  });

  // Req 5.4 — switching back to null destroys the chart
  it('destroys the chart instance when chartData becomes null (Req 5.4)', () => {
    renderChart(sampleChartData);
    renderChart(null);
    expect(ChartStub.destroyCalls).toBe(1);
  });

  it('does not create a Chart when canvas element is absent', () => {
    document.body.innerHTML = '<p id="chart-empty-message" hidden></p>';
    expect(() => renderChart(sampleChartData)).not.toThrow();
    expect(ChartStub.constructorCalls).toHaveLength(0);
  });

  it('does not throw when both DOM elements are absent', () => {
    document.body.innerHTML = '';
    expect(() => renderChart(null)).not.toThrow();
    expect(() => renderChart(sampleChartData)).not.toThrow();
  });

  it('re-creates chart after destroy when new data arrives', () => {
    renderChart(sampleChartData);
    renderChart(null);         // destroys
    renderChart(sampleChartData); // re-creates
    expect(ChartStub.constructorCalls).toHaveLength(2);
    expect(ChartStub.destroyCalls).toBe(1);
  });
});
