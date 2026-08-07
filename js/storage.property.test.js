// @vitest-environment jsdom
// Feature: expense-budget-visualizer
// Property-based tests for LocalStorage storage functions.
// Uses fast-check (https://github.com/dubzzz/fast-check) with { numRuns: 100 }.

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  STORAGE_KEY,
  CATEGORIES_KEY,
  THEME_KEY,
  loadTransactions,
  saveTransactions,
  loadCategories,
  saveCategories,
  loadTheme,
  saveTheme,
} from './logic.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear all relevant LocalStorage keys before each test. */
beforeEach(() => {
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// P13: LocalStorage round-trip preserves transaction data
// Feature: expense-budget-visualizer, Property 13: LocalStorage round-trip preserves transaction data
// Validates: Requirements 6.6
// ---------------------------------------------------------------------------

describe('P13 — saveTransactions / loadTransactions: round-trip preserves transaction data', () => {
  it('all fields of a saved transaction survive a round-trip through LocalStorage', () => {
    fc.assert(
      fc.property(
        fc.record({
          id:        fc.uuid(),
          name:      fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          amount:    fc.float({ min: Math.fround(0.01), max: Math.fround(999999), noNaN: true }),
          category:  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          createdAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
                      .map(d => d.toISOString()),
        }),
        (tx) => {
          localStorage.clear();
          saveTransactions([tx]);
          const loaded = loadTransactions();

          if (!loaded || loaded.length !== 1) return false;
          const result = loaded[0];

          return (
            result.id        === tx.id        &&
            result.name      === tx.name      &&
            result.amount    === tx.amount    &&
            result.category  === tx.category  &&
            result.createdAt === tx.createdAt
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P14: App load restores persisted transactions
// Feature: expense-budget-visualizer, Property 14: App load restores persisted transactions
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

describe('P14 — loadTransactions: app load restores persisted transactions', () => {
  it('returns a deep-equal array to what was written directly to localStorage', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id:        fc.uuid(),
            name:      fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            amount:    fc.float({ min: Math.fround(0.01), max: Math.fround(999999), noNaN: true }),
            category:  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            createdAt: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
                        .map(d => d.toISOString()),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (txArray) => {
          localStorage.clear();
          // Write directly to storage (simulates another session having saved data)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(txArray));

          const loaded = loadTransactions();

          if (!loaded || loaded.length !== txArray.length) return false;

          for (let i = 0; i < txArray.length; i++) {
            const orig   = txArray[i];
            const result = loaded[i];
            if (
              result.id        !== orig.id        ||
              result.name      !== orig.name      ||
              result.amount    !== orig.amount    ||
              result.category  !== orig.category  ||
              result.createdAt !== orig.createdAt
            ) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P15: Theme preference round-trip
// Feature: expense-budget-visualizer, Property 15: Theme preference round-trip
// Validates: Requirements 7.3
// ---------------------------------------------------------------------------

describe('P15 — saveTheme / loadTheme: theme preference round-trip', () => {
  it('loadTheme() returns the same value that was passed to saveTheme()', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (theme) => {
          localStorage.clear();
          saveTheme(theme);
          const loaded = loadTheme();
          return loaded === theme;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('data-theme attribute on <html> matches the saved theme when applied', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light', 'dark'),
        (theme) => {
          localStorage.clear();
          saveTheme(theme);
          const restoredTheme = loadTheme();

          // Simulate what init() does: apply the loaded theme to the document
          document.documentElement.setAttribute('data-theme', restoredTheme);

          return document.documentElement.getAttribute('data-theme') === theme;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// P18: Custom categories round-trip through LocalStorage
// Feature: expense-budget-visualizer, Property 18: Custom categories round-trip through LocalStorage
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------

describe('P18 — saveCategories / loadCategories: custom categories round-trip', () => {
  // Generator for a valid category name: 1–50 chars with at least one non-whitespace char
  const validCategoryNameArb = fc.string({ minLength: 1, maxLength: 50 })
    .filter(s => s.trim().length >= 1);

  it('loadCategories() returns a deep-equal array to what was passed to saveCategories()', () => {
    fc.assert(
      fc.property(
        fc.array(validCategoryNameArb, { minLength: 1, maxLength: 20 }),
        (cats) => {
          localStorage.clear();
          saveCategories(cats);
          const loaded = loadCategories();

          if (!loaded || loaded.length !== cats.length) return false;

          for (let i = 0; i < cats.length; i++) {
            if (loaded[i] !== cats[i]) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
