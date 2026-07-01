import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { prefersReducedMotion, motionSafeScrollBehavior, motionSafeScrollIntoView } from '../motionPreference.js';

describe('motionPreference', () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('prefersReducedMotion', () => {
    test('returns false when window is undefined', () => {
      delete (global as any).window;
      assert.strictEqual(prefersReducedMotion(), false);
    });

    test('returns false when window.matchMedia is not a function', () => {
      (global as any).window = {};
      assert.strictEqual(prefersReducedMotion(), false);
    });

    test('returns false when matchMedia matches is false', () => {
      (global as any).window = {
        matchMedia: (query: string) => {
          assert.strictEqual(query, '(prefers-reduced-motion: reduce)');
          return { matches: false };
        }
      };
      assert.strictEqual(prefersReducedMotion(), false);
    });

    test('returns true when matchMedia matches is true', () => {
      (global as any).window = {
        matchMedia: (query: string) => {
          assert.strictEqual(query, '(prefers-reduced-motion: reduce)');
          return { matches: true };
        }
      };
      assert.strictEqual(prefersReducedMotion(), true);
    });
  });

  describe('motionSafeScrollBehavior', () => {
    test('returns "smooth" when not preferring reduced motion', () => {
      (global as any).window = {
        matchMedia: () => ({ matches: false })
      };
      assert.strictEqual(motionSafeScrollBehavior(), 'smooth');
    });

    test('returns "auto" when preferring reduced motion', () => {
      (global as any).window = {
        matchMedia: () => ({ matches: true })
      };
      assert.strictEqual(motionSafeScrollBehavior(), 'auto');
    });
  });

  describe('motionSafeScrollIntoView', () => {
    test('does nothing when target is null or undefined', () => {
      // Should not throw
      motionSafeScrollIntoView(null);
      motionSafeScrollIntoView(undefined);
    });

    test('calls scrollIntoView with smooth behavior when reduced motion is not preferred', () => {
      (global as any).window = {
        matchMedia: () => ({ matches: false })
      };

      let called = false;
      const target = {
        scrollIntoView: (options: ScrollIntoViewOptions) => {
          called = true;
          assert.deepStrictEqual(options, { behavior: 'smooth', block: 'start' });
        }
      } as unknown as Element;

      motionSafeScrollIntoView(target, { block: 'start' });
      assert.strictEqual(called, true);
    });

    test('calls scrollIntoView with auto behavior when reduced motion is preferred', () => {
      (global as any).window = {
        matchMedia: () => ({ matches: true })
      };

      let called = false;
      const target = {
        scrollIntoView: (options: ScrollIntoViewOptions) => {
          called = true;
          assert.deepStrictEqual(options, { behavior: 'auto', inline: 'center' });
        }
      } as unknown as Element;

      motionSafeScrollIntoView(target, { inline: 'center' });
      assert.strictEqual(called, true);
    });
  });
});
