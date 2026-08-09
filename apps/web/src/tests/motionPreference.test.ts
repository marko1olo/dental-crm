import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	motionSafeScrollBehavior,
	motionSafeScrollIntoView,
	prefersReducedMotion,
} from "../motionPreference.js";

describe("motionPreference", () => {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	let originalWindow: any;

	beforeEach(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		originalWindow = (global as any).window;
	});

	afterEach(() => {
		if (originalWindow === undefined) {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			delete (global as any).window;
		} else {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = originalWindow;
		}
	});

	describe("prefersReducedMotion", () => {
		it("returns false when window is undefined", () => {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			delete (global as any).window;
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns false when window.matchMedia is undefined", () => {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = {};
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns false when prefers-reduced-motion: reduce does not match", () => {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = {
				matchMedia: (query: string) => {
					assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
					return { matches: false };
				},
			};
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns true when prefers-reduced-motion: reduce matches", () => {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = {};
			assert.strictEqual(motionSafeScrollBehavior(), "smooth");
		});

		it("returns 'auto' when prefersReducedMotion is true", () => {
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = {};
			let scrollIntoViewCalled = false;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let passedOptions: any;

			const mockTarget = {
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = {
				matchMedia: () => ({ matches: true }),
			};
			let scrollIntoViewCalled = false;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let passedOptions: any;

			const mockTarget = {
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(global as any).window = {};
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let passedOptions: any;
			const mockTarget = {
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				scrollIntoView: (options: any) => {
					passedOptions = options;
				},
			};

			motionSafeScrollIntoView(mockTarget as unknown as Element);
			assert.deepStrictEqual(passedOptions, { behavior: "smooth" });
		});
	});
});
