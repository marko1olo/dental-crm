import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { prefersReducedMotion, motionSafeScrollBehavior, motionSafeScrollIntoView } from "../motionPreference.js";

describe("motionPreference", () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = (global as any).window;
  });

  afterEach(() => {
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import { prefersReducedMotion, motionSafeScrollBehavior, motionSafeScrollIntoView } from '../motionPreference.js';

describe('motionPreference', () => {

    // Save original window if it exists
    originalWindow = global.window;

    // Restore original window
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
  });

  describe("prefersReducedMotion", () => {
    it("returns false when window is undefined", () => {
    mock.restoreAll();

  describe('prefersReducedMotion', () => {
    test('returns false when window is undefined', () => {
      delete (global as any).window;
      assert.strictEqual(prefersReducedMotion(), false);
    });

    it("returns false when window.matchMedia is undefined", () => {
    test('returns false when window.matchMedia is undefined', () => {
      (global as any).window = {};
      assert.strictEqual(prefersReducedMotion(), false);
    });

    it("returns false when prefers-reduced-motion: reduce does not match", () => {
      (global as any).window = {
        matchMedia: (query: string) => {
          assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
          return { matches: false };
        },
      };
      assert.strictEqual(prefersReducedMotion(), false);
    });

    it("returns true when prefers-reduced-motion: reduce matches", () => {
      (global as any).window = {
        matchMedia: (query: string) => {
          assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
          return { matches: true };
        },
      };
      assert.strictEqual(prefersReducedMotion(), true);
    });
  });

  describe("motionSafeScrollBehavior", () => {
    it("returns 'smooth' when prefersReducedMotion is false", () => {
      (global as any).window = {};
      assert.strictEqual(motionSafeScrollBehavior(), "smooth");
    });

    it("returns 'auto' when prefersReducedMotion is true", () => {
      (global as any).window = {
        matchMedia: () => ({ matches: true }),
      };
      assert.strictEqual(motionSafeScrollBehavior(), "auto");
    });
  });

  describe("motionSafeScrollIntoView", () => {
    it("does nothing when target is null or undefined", () => {
      // Should not throw
      motionSafeScrollIntoView(null);
      motionSafeScrollIntoView(undefined);
    });

    it("calls scrollIntoView with behavior 'smooth' and merges options when prefersReducedMotion is false", () => {
      (global as any).window = {};
      let scrollIntoViewCalled = false;
      let passedOptions: any;

      const mockTarget = {
        scrollIntoView: (options: any) => {
          scrollIntoViewCalled = true;
          passedOptions = options;
        },
      };

      motionSafeScrollIntoView(mockTarget as unknown as Element, { block: "start" });
      assert.strictEqual(scrollIntoViewCalled, true);
      assert.deepStrictEqual(passedOptions, { block: "start", behavior: "smooth" });
    });

    it("calls scrollIntoView with behavior 'auto' and merges options when prefersReducedMotion is true", () => {
      (global as any).window = {
        matchMedia: () => ({ matches: true }),
      };
      let scrollIntoViewCalled = false;
      let passedOptions: any;

      const mockTarget = {
        scrollIntoView: (options: any) => {
          scrollIntoViewCalled = true;
          passedOptions = options;
        },
      };

      motionSafeScrollIntoView(mockTarget as unknown as Element, { block: "end", inline: "nearest" });
      assert.strictEqual(scrollIntoViewCalled, true);
      assert.deepStrictEqual(passedOptions, { block: "end", inline: "nearest", behavior: "auto" });
    });

    it("defaults to empty options except behavior if not provided", () => {
      (global as any).window = {};
      let passedOptions: any;
      const mockTarget = {
        scrollIntoView: (options: any) => {
          passedOptions = options;
        },
      };

      motionSafeScrollIntoView(mockTarget as unknown as Element);
      assert.deepStrictEqual(passedOptions, { behavior: "smooth" });
    test('returns false when window.matchMedia is not a function', () => {
      (global as any).window = { matchMedia: 'not-a-function' };

    test('returns true when prefers-reduced-motion matches', () => {
        matchMedia: mock.fn((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
        })),
      assert.strictEqual((global as any).window.matchMedia.mock.calls.length, 1);
      assert.strictEqual((global as any).window.matchMedia.mock.calls[0].arguments[0], '(prefers-reduced-motion: reduce)');

    test('returns false when prefers-reduced-motion does not match', () => {
        matchMedia: mock.fn(() => ({
          matches: false,
        })),

  describe('motionSafeScrollBehavior', () => {
    test('returns "auto" when reduced motion is preferred', () => {
        matchMedia: mock.fn(() => ({ matches: true })),
      assert.strictEqual(motionSafeScrollBehavior(), 'auto');

    test('returns "smooth" when reduced motion is not preferred', () => {
        matchMedia: mock.fn(() => ({ matches: false })),
      assert.strictEqual(motionSafeScrollBehavior(), 'smooth');

    test('returns "smooth" when matchMedia is unavailable', () => {
      delete (global as any).window;
      assert.strictEqual(motionSafeScrollBehavior(), 'smooth');

  describe('motionSafeScrollIntoView', () => {
    test('does not throw when target is null', () => {
      assert.doesNotThrow(() => {

    test('does not throw when target is undefined', () => {
      assert.doesNotThrow(() => {

    test('calls scrollIntoView with behavior: "auto" when reduced motion is preferred', () => {
        matchMedia: mock.fn(() => ({ matches: true })),

      const scrollIntoView = mock.fn();
      const target = { scrollIntoView } as unknown as Element;

      motionSafeScrollIntoView(target);

      assert.strictEqual(scrollIntoView.mock.calls.length, 1);
      assert.deepStrictEqual(scrollIntoView.mock.calls[0].arguments[0], { behavior: 'auto' });

    test('calls scrollIntoView with behavior: "smooth" when reduced motion is not preferred', () => {
        matchMedia: mock.fn(() => ({ matches: false })),

      const scrollIntoView = mock.fn();
      const target = { scrollIntoView } as unknown as Element;

      motionSafeScrollIntoView(target);

      assert.strictEqual(scrollIntoView.mock.calls.length, 1);
      assert.deepStrictEqual(scrollIntoView.mock.calls[0].arguments[0], { behavior: 'smooth' });

    test('passes additional options along with computed behavior', () => {
        matchMedia: mock.fn(() => ({ matches: false })),

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
