import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	motionSafeScrollBehavior,
	motionSafeScrollIntoView,
	prefersReducedMotion,
} from "../motionPreference.js";

describe("motionPreference", () => {
	let originalWindow: any;

	beforeEach(() => {
		originalWindow = (global as any).window;
	});

	afterEach(() => {
		if (originalWindow === undefined) {
			delete (global as any).window;
		} else {
			(global as any).window = originalWindow;
		}
	});

	describe("prefersReducedMotion", () => {
		it("returns false when window is undefined", () => {
			delete (global as any).window;
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns false when window.matchMedia is undefined", () => {
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

			motionSafeScrollIntoView(mockTarget as unknown as Element, {
				block: "start",
			});
			assert.strictEqual(scrollIntoViewCalled, true);
			assert.deepStrictEqual(passedOptions, {
				block: "start",
				behavior: "smooth",
			});
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

			motionSafeScrollIntoView(mockTarget as unknown as Element, {
				block: "end",
				inline: "nearest",
			});
			assert.strictEqual(scrollIntoViewCalled, true);
			assert.deepStrictEqual(passedOptions, {
				block: "end",
				inline: "nearest",
				behavior: "auto",
			});
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
		});
	});
});
