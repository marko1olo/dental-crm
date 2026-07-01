import { test, describe, afterEach } from "node:test";
import assert from "node:assert";
import { motionSafeScrollBehavior } from "../motionPreference.js";

describe("motionSafeScrollBehavior", () => {
  const originalWindow = (global as any).window;

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  test("returns 'smooth' when window is undefined", () => {
    delete (global as any).window;
    assert.strictEqual(motionSafeScrollBehavior(), "smooth");
  });

  test("returns 'smooth' when window.matchMedia is undefined", () => {
    (global as any).window = {};
    assert.strictEqual(motionSafeScrollBehavior(), "smooth");
  });

  test("returns 'smooth' when prefers-reduced-motion is false", () => {
    (global as any).window = {
      matchMedia: (query: string) => {
        assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
        return { matches: false };
      }
    };
    assert.strictEqual(motionSafeScrollBehavior(), "smooth");
  });

  test("returns 'auto' when prefers-reduced-motion is true", () => {
    (global as any).window = {
      matchMedia: (query: string) => {
        assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
        return { matches: true };
      }
    };
    assert.strictEqual(motionSafeScrollBehavior(), "auto");
  });
});
