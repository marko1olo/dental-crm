import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { prefersReducedMotion, motionSafeScrollBehavior, motionSafeScrollIntoView } from '../motionPreference.js';

describe('motionPreference', () => {
  let originalWindow: any;

  beforeEach(() => {
    // Save original window if it exists
    originalWindow = global.window;
  });

  afterEach(() => {
    // Restore original window
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
    mock.restoreAll();
  });

  describe('prefersReducedMotion', () => {
    test('returns false when window is undefined', () => {
      delete (global as any).window;
      assert.strictEqual(prefersReducedMotion(), false);
    });

    test('returns false when window.matchMedia is undefined', () => {
      (global as any).window = {};
      assert.strictEqual(prefersReducedMotion(), false);
    });

    test('returns false when window.matchMedia is not a function', () => {
      (global as any).window = { matchMedia: 'not-a-function' };
      assert.strictEqual(prefersReducedMotion(), false);
    });

    test('returns true when prefers-reduced-motion matches', () => {
      (global as any).window = {
        matchMedia: mock.fn((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
        })),
      };
      assert.strictEqual(prefersReducedMotion(), true);
      assert.strictEqual((global as any).window.matchMedia.mock.calls.length, 1);
      assert.strictEqual((global as any).window.matchMedia.mock.calls[0].arguments[0], '(prefers-reduced-motion: reduce)');
    });

    test('returns false when prefers-reduced-motion does not match', () => {
      (global as any).window = {
        matchMedia: mock.fn(() => ({
          matches: false,
        })),
      };
      assert.strictEqual(prefersReducedMotion(), false);
    });
  });

  describe('motionSafeScrollBehavior', () => {
    test('returns "auto" when reduced motion is preferred', () => {
      (global as any).window = {
        matchMedia: mock.fn(() => ({ matches: true })),
      };
      assert.strictEqual(motionSafeScrollBehavior(), 'auto');
    });

    test('returns "smooth" when reduced motion is not preferred', () => {
      (global as any).window = {
        matchMedia: mock.fn(() => ({ matches: false })),
      };
      assert.strictEqual(motionSafeScrollBehavior(), 'smooth');
    });

    test('returns "smooth" when matchMedia is unavailable', () => {
      delete (global as any).window;
      assert.strictEqual(motionSafeScrollBehavior(), 'smooth');
    });
  });

  describe('motionSafeScrollIntoView', () => {
    test('does not throw when target is null', () => {
      assert.doesNotThrow(() => {
        motionSafeScrollIntoView(null);
      });
    });

    test('does not throw when target is undefined', () => {
      assert.doesNotThrow(() => {
        motionSafeScrollIntoView(undefined);
      });
    });

    test('calls scrollIntoView with behavior: "auto" when reduced motion is preferred', () => {
      (global as any).window = {
        matchMedia: mock.fn(() => ({ matches: true })),
      };

      const scrollIntoView = mock.fn();
      const target = { scrollIntoView } as unknown as Element;

      motionSafeScrollIntoView(target);

      assert.strictEqual(scrollIntoView.mock.calls.length, 1);
      assert.deepStrictEqual(scrollIntoView.mock.calls[0].arguments[0], { behavior: 'auto' });
    });

    test('calls scrollIntoView with behavior: "smooth" when reduced motion is not preferred', () => {
      (global as any).window = {
        matchMedia: mock.fn(() => ({ matches: false })),
      };

      const scrollIntoView = mock.fn();
      const target = { scrollIntoView } as unknown as Element;

      motionSafeScrollIntoView(target);

      assert.strictEqual(scrollIntoView.mock.calls.length, 1);
      assert.deepStrictEqual(scrollIntoView.mock.calls[0].arguments[0], { behavior: 'smooth' });
    });

    test('passes additional options along with computed behavior', () => {
      (global as any).window = {
        matchMedia: mock.fn(() => ({ matches: false })),
      };

      const scrollIntoView = mock.fn();
      const target = { scrollIntoView } as unknown as Element;

      motionSafeScrollIntoView(target, { block: 'center', inline: 'nearest' });

      assert.strictEqual(scrollIntoView.mock.calls.length, 1);
      assert.deepStrictEqual(scrollIntoView.mock.calls[0].arguments[0], {
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth'
      });
    });
  });
});
