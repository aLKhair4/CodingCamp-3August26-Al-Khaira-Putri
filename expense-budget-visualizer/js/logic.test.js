// Feature: expense-budget-visualizer
// Property-based and unit tests for pure validation and business logic functions.
// Uses fast-check (https://github.com/dubzzz/fast-check) with { numRuns: 100 }.

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  validateTransaction,
  validateCategoryName,
  calculateBalance,
  buildChartData,
  sortTransactions,
} from './logic.js';

// ---------------------------------------------------------------------------
// Arbitraries / generators
// ---------------------------------------------------------------------------

/** A valid transaction object arbitrary */
const transactionArb = fc.record({
  id:        fc.uuid(),
  name:      fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  amount:    fc.float({ min: Math.fround(0.01), max: Math.fround(999999), noNaN: true, noDefaultInfinity: true }),
  category:  fc.oneof(
    fc.constantFrom('Food', 'Transport', 'Fun'),
    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  ),
  createdAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString()),
});

// ---------------------------------------------------------------------------
// validateTransaction — unit tests
// ---------------------------------------------------------------------------

describe('validateTransaction — unit tests', () => {
  it('accepts a valid transaction', () => {
    const result = validateTransaction('Coffee', 3.50, 'Food');
    expect(result.valid).toBe(true);
  });

  it('rejects empty name', () => {
    const result = validateTransaction('', 10, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('name');
  });

  it('rejects name longer than 100 chars', () => {
    const result = validateTransaction('a'.repeat(101), 10, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('name');
  });

  it('rejects zero amount', () => {
    const result = validateTransaction('Coffee', 0, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects negative amount', () => {
    const result = validateTransaction('Coffee', -5, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects amount exceeding 999999999.99', () => {
    const result = validateTransaction('Coffee', 1000000000, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects empty category', () => {
    const result = validateTransaction('Coffee', 5, '');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('category');
  });

  it('rejects NaN amount', () => {
    const result = validateTransaction('Coffee', NaN, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });
});

// ---------------------------------------------------------------------------
// P2: Whitespace names rejected
// Feature: expense-budget-visualizer, Property 2: Invalid item names are rejected
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------

describe('P2 — validateTransaction: whitespace-only names rejected', () => {
  it('rejects any string composed entirely of whitespace characters', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r')),
        fc.float({ min: Math.fround(0.01), max: Math.fround(999999), noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom('Food', 'Transport', 'Fun'),
        (whitespaceOnlyName, amount, category) => {
          const result = validateTransaction(whitespaceOnlyName, amount, category);
          return result.valid === false && 'name' in result.errors;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P3: Invalid amounts rejected
// Feature: expense-budget-visualizer, Property 3: Invalid amounts are rejected
// Validates: Requirements 1.6, 1.7
// ---------------------------------------------------------------------------

describe('P3 — validateTransaction: invalid amounts rejected', () => {
  it('rejects non-positive amounts (≤ 0)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.float({ max: Math.fround(0), noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom('Food', 'Transport', 'Fun'),
        (name, amount, category) => {
          const result = validateTransaction(name, amount, category);
          return result.valid === false && 'amount' in result.errors;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects amount = 1000000000 (above cap)', () => {
    const result = validateTransaction('Test', 1000000000, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects NaN amount', () => {
    const result = validateTransaction('Test', NaN, 'Food');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('amount');
  });

  it('rejects amounts above 999999999.99 via property test', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.float({ min: Math.fround(1000000000), noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom('Food', 'Transport', 'Fun'),
        (name, amount, category) => {
          const result = validateTransaction(name, amount, category);
          return result.valid === false && 'amount' in result.errors;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// validateCategoryName — unit tests
// ---------------------------------------------------------------------------

describe('validateCategoryName — unit tests', () => {
  it('accepts a valid new category name', () => {
    const result = validateCategoryName('Groceries', ['Food', 'Transport', 'Fun']);
    expect(result.valid).toBe(true);
  });

  it('rejects empty string', () => {
    const result = validateCategoryName('', []);
    expect(result.valid).toBe(false);
  });

  it('rejects whitespace-only name', () => {
    const result = validateCategoryName('   ', []);
    expect(result.valid).toBe(false);
  });

  it('rejects name longer than 50 chars', () => {
    const result = validateCategoryName('a'.repeat(51), []);
    expect(result.valid).toBe(false);
  });

  it('rejects exact duplicate (same case)', () => {
    const result = validateCategoryName('Food', ['Food', 'Transport']);
    expect(result.valid).toBe(false);
  });

  it('rejects case-insensitive duplicate', () => {
    const result = validateCategoryName('FOOD', ['Food', 'Transport']);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// P5 (design P16): Valid custom category names accepted
// Feature: expense-budget-visualizer, Property 16: Valid custom category names are accepted
// Validates: Requirements 8.1, 8.2
// ---------------------------------------------------------------------------

describe('P5 — validateCategoryName: valid names accepted', () => {
  it('accepts any non-duplicate name of 1–50 non-whitespace chars', () => {
    fc.assert(
      fc.property(
        // Produce a name that has at least 1 non-whitespace char, ≤ 50 trimmed chars
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          s => s.trim().length >= 1 && s.trim().length <= 50
        ),
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          { maxLength: 10 }
        ),
        (name, existingCategories) => {
          // Exclude names that would be duplicates to keep this test focused on valid inputs
          const lower = name.trim().toLowerCase();
          const isDuplicate = existingCategories.some(c => c.toLowerCase() === lower);
          if (isDuplicate) return true; // skip this run

          const result = validateCategoryName(name, existingCategories);
          return result.valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P6 (design P17): Duplicate category names rejected (case-insensitive)
// Feature: expense-budget-visualizer, Property 17: Duplicate category names are rejected (case-insensitive)
// Validates: Requirements 8.4
// ---------------------------------------------------------------------------

describe('P6 — validateCategoryName: duplicates rejected', () => {
  it('rejects names that match existing entries case-insensitively', () => {
    fc.assert(
      fc.property(
        // An existing category name (at least 1 non-whitespace char, ≤ 50 trimmed)
        fc.string({ minLength: 1, maxLength: 50 }).filter(
          s => s.trim().length >= 1 && s.trim().length <= 50
        ),
        (existingName) => {
          const variations = [
            existingName.trim(),
            existingName.trim().toUpperCase(),
            existingName.trim().toLowerCase(),
          ];
          for (const variant of variations) {
            const result = validateCategoryName(variant, [existingName.trim()]);
            if (result.valid !== false) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// calculateBalance — unit tests
// ---------------------------------------------------------------------------

describe('calculateBalance — unit tests', () => {
  it('returns 0 for empty array', () => {
    expect(calculateBalance([])).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(calculateBalance(null)).toBe(0);
    expect(calculateBalance(undefined)).toBe(0);
  });

  it('sums a single transaction', () => {
    expect(calculateBalance([{ amount: 42 }])).toBe(42);
  });

  it('sums multiple transactions', () => {
    expect(
      calculateBalance([{ amount: 10 }, { amount: 20 }, { amount: 5 }])
    ).toBe(35);
  });

  it('includes negative amounts in the sum', () => {
    expect(
      calculateBalance([{ amount: 100 }, { amount: -30 }])
    ).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// P11: Balance equals sum of all transaction amounts
// Feature: expense-budget-visualizer, Property 11: Balance equals sum of all transaction amounts
// Validates: Requirements 4.1, 4.4, 4.5
// ---------------------------------------------------------------------------

describe('P11 — calculateBalance: equals arithmetic sum', () => {
  it('always equals reduce sum for any array of finite floats', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ noNaN: true, noDefaultInfinity: true }),
          { maxLength: 50 }
        ),
        (amounts) => {
          const txs = amounts.map(a => ({ amount: a }));
          const expected = amounts.reduce((acc, a) => acc + a, 0);
          return calculateBalance(txs) === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// buildChartData — unit tests
// ---------------------------------------------------------------------------

describe('buildChartData — unit tests', () => {
  it('returns null for empty array', () => {
    expect(buildChartData([])).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(buildChartData(null)).toBeNull();
    expect(buildChartData(undefined)).toBeNull();
  });

  it('groups transactions by category', () => {
    const txs = [
      { category: 'Food', amount: 10 },
      { category: 'Food', amount: 20 },
      { category: 'Transport', amount: 15 },
    ];
    const result = buildChartData(txs);
    expect(result.labels).toEqual(['Food', 'Transport']);
    expect(result.datasets[0].data).toEqual([30, 15]);
  });

  it('groups missing/empty category under "Uncategorized"', () => {
    const txs = [
      { category: '', amount: 5 },
      { category: null, amount: 3 },
    ];
    const result = buildChartData(txs);
    expect(result.labels).toContain('Uncategorized');
  });

  it('returns one segment per unique category', () => {
    const txs = [
      { category: 'Food', amount: 10 },
      { category: 'Fun', amount: 10 },
      { category: 'Transport', amount: 10 },
    ];
    const result = buildChartData(txs);
    expect(result.labels.length).toBe(3);
    expect(result.datasets[0].data.length).toBe(3);
    expect(result.datasets[0].backgroundColor.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// P12: Chart segments correspond 1-to-1 with unique categories
// Feature: expense-budget-visualizer, Property 12: Chart segments correspond 1-to-1 with active categories
// Validates: Requirements 5.1, 5.5
// ---------------------------------------------------------------------------

describe('P12 — buildChartData: segments match unique categories', () => {
  it('labels.length equals number of distinct categories and data sums are correct', () => {
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 50 }),
        (txs) => {
          const result = buildChartData(txs);

          // Must return a non-null object for non-empty input
          if (!result) return false;

          // Compute expected unique categories
          const uniqueCategories = new Set(
            txs.map(tx => (tx.category && tx.category.trim()) ? tx.category.trim() : 'Uncategorized')
          );

          // Number of labels must equal number of unique categories
          if (result.labels.length !== uniqueCategories.size) return false;

          // Each label must appear exactly once in uniqueCategories
          for (const label of result.labels) {
            if (!uniqueCategories.has(label)) return false;
          }

          // Each segment value must equal the sum of amounts for that category
          for (let i = 0; i < result.labels.length; i++) {
            const label = result.labels[i];
            const expectedTotal = txs
              .filter(tx => {
                const cat = (tx.category && tx.category.trim()) ? tx.category.trim() : 'Uncategorized';
                return cat === label;
              })
              .reduce((sum, tx) => sum + tx.amount, 0);
            if (Math.abs(result.datasets[0].data[i] - expectedTotal) > 1e-6) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// sortTransactions — unit tests
// ---------------------------------------------------------------------------

describe('sortTransactions — unit tests', () => {
  const base = [
    { id: '1', amount: 30, category: 'Food',      createdAt: '2024-01-01T00:00:00.000Z' },
    { id: '2', amount: 10, category: 'Transport', createdAt: '2024-01-03T00:00:00.000Z' },
    { id: '3', amount: 20, category: 'Fun',       createdAt: '2024-01-02T00:00:00.000Z' },
  ];

  it('returns empty array for empty input', () => {
    expect(sortTransactions([], 'date-desc')).toEqual([]);
    expect(sortTransactions(null, 'date-desc')).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const copy = [...base];
    sortTransactions(copy, 'amount-asc');
    expect(copy).toEqual(base);
  });

  it('amount-asc: sorts from lowest to highest amount', () => {
    const result = sortTransactions(base, 'amount-asc');
    expect(result[0].amount).toBe(10);
    expect(result[1].amount).toBe(20);
    expect(result[2].amount).toBe(30);
  });

  it('amount-desc: sorts from highest to lowest amount', () => {
    const result = sortTransactions(base, 'amount-desc');
    expect(result[0].amount).toBe(30);
    expect(result[1].amount).toBe(20);
    expect(result[2].amount).toBe(10);
  });

  it('category-asc: sorts categories A–Z', () => {
    const result = sortTransactions(base, 'category-asc');
    expect(result[0].category).toBe('Food');
    expect(result[1].category).toBe('Fun');
    expect(result[2].category).toBe('Transport');
  });

  it('category-desc: sorts categories Z–A', () => {
    const result = sortTransactions(base, 'category-desc');
    expect(result[0].category).toBe('Transport');
    expect(result[1].category).toBe('Fun');
    expect(result[2].category).toBe('Food');
  });

  it('date-desc: sorts most recent first', () => {
    const result = sortTransactions(base, 'date-desc');
    expect(result[0].id).toBe('2'); // 2024-01-03
    expect(result[1].id).toBe('3'); // 2024-01-02
    expect(result[2].id).toBe('1'); // 2024-01-01
  });

  it('uses date-desc as tiebreaker for equal amounts', () => {
    const tied = [
      { id: 'a', amount: 10, category: 'Food', createdAt: '2024-01-01T00:00:00.000Z' },
      { id: 'b', amount: 10, category: 'Food', createdAt: '2024-01-05T00:00:00.000Z' },
    ];
    const result = sortTransactions(tied, 'amount-asc');
    expect(result[0].id).toBe('b'); // newer comes first on tie
  });
});

// ---------------------------------------------------------------------------
// P19: Sorted transaction list satisfies the ordering predicate
// Feature: expense-budget-visualizer, Property 19: Sorted transaction list satisfies the ordering predicate
// Validates: Requirements 9.2, 9.4
// ---------------------------------------------------------------------------

describe('P19 — sortTransactions: satisfies ordering predicate for all sort keys', () => {
  const sortKeys = ['amount-asc', 'amount-desc', 'category-asc', 'category-desc'];

  for (const key of sortKeys) {
    it(`every adjacent pair satisfies predicate for sortKey="${key}"`, () => {
      fc.assert(
        fc.property(
          fc.array(transactionArb, { minLength: 2, maxLength: 30 }),
          (txs) => {
            const sorted = sortTransactions(txs, key);

            for (let i = 0; i < sorted.length - 1; i++) {
              const a = sorted[i];
              const b = sorted[i + 1];

              switch (key) {
                case 'amount-asc': {
                  if (a.amount > b.amount) return false;
                  if (a.amount === b.amount) {
                    // tiebreaker: a should be more recent than or equal to b
                    const tA = new Date(a.createdAt).getTime();
                    const tB = new Date(b.createdAt).getTime();
                    if (tA < tB) return false;
                  }
                  break;
                }
                case 'amount-desc': {
                  if (a.amount < b.amount) return false;
                  if (a.amount === b.amount) {
                    const tA = new Date(a.createdAt).getTime();
                    const tB = new Date(b.createdAt).getTime();
                    if (tA < tB) return false;
                  }
                  break;
                }
                case 'category-asc': {
                  const cmp = (a.category || '').localeCompare(b.category || '');
                  if (cmp > 0) return false;
                  if (cmp === 0) {
                    const tA = new Date(a.createdAt).getTime();
                    const tB = new Date(b.createdAt).getTime();
                    if (tA < tB) return false;
                  }
                  break;
                }
                case 'category-desc': {
                  const cmp = (b.category || '').localeCompare(a.category || '');
                  if (cmp > 0) return false;
                  if (cmp === 0) {
                    const tA = new Date(a.createdAt).getTime();
                    const tB = new Date(b.createdAt).getTime();
                    if (tA < tB) return false;
                  }
                  break;
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  }
});

// ---------------------------------------------------------------------------
// P20 (design P5): Default date-desc sort — most-recent-first
// Feature: expense-budget-visualizer, Property 5: Default load order is most-recent-first
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------

describe('P20 — sortTransactions: date-desc produces most-recent-first order', () => {
  it('adjacent pairs always have a[createdAt] >= b[createdAt]', () => {
    fc.assert(
      fc.property(
        // Generate transactions with distinct createdAt timestamps using unique dates
        fc.array(
          fc.record({
            id:        fc.uuid(),
            name:      fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            amount:    fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true }),
            category:  fc.constantFrom('Food', 'Transport', 'Fun'),
            createdAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
                        .map(d => d.toISOString()),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (txs) => {
          const sorted = sortTransactions(txs, 'date-desc');
          for (let i = 0; i < sorted.length - 1; i++) {
            const tA = new Date(sorted[i].createdAt).getTime();
            const tB = new Date(sorted[i + 1].createdAt).getTime();
            if (tA < tB) return false;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
