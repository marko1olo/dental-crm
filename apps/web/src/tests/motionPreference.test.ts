import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	motionSafeScrollBehavior,
	motionSafeScrollIntoView,
	prefersReducedMotion,
} from "../motionPreference.js";

type MockMatchMedia = (query: string) => { matches: boolean };
interface MockWindow {
	matchMedia?: MockMatchMedia | undefined;
}

function getGlobalWindow(): MockWindow | undefined {
	return Reflect.get(globalThis, "window") as MockWindow | undefined;
}

function setGlobalWindow(win: MockWindow | undefined): void {
	if (win === undefined) {
		Reflect.deleteProperty(globalThis, "window");
	} else {
		Reflect.set(globalThis, "window", win);
	}
}

describe("motionPreference", () => {
	let originalWindow: MockWindow | undefined;

	beforeEach(() => {
		originalWindow = getGlobalWindow();
	});

	afterEach(() => {
		setGlobalWindow(originalWindow);
	});

	describe("prefersReducedMotion", () => {
		it("returns false when window is undefined", () => {
			setGlobalWindow(undefined);
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns false when window.matchMedia is undefined", () => {
			setGlobalWindow({});
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns false when prefers-reduced-motion: reduce does not match", () => {
			setGlobalWindow({
				matchMedia: (query: string) => {
					assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
					return { matches: false };
				},
			});
			assert.strictEqual(prefersReducedMotion(), false);
		});

		it("returns true when prefers-reduced-motion: reduce matches", () => {
			setGlobalWindow({
				matchMedia: (query: string) => {
					assert.strictEqual(query, "(prefers-reduced-motion: reduce)");
					return { matches: true };
				},
			});
			assert.strictEqual(prefersReducedMotion(), true);
		});
	});

	describe("motionSafeScrollBehavior", () => {
		it("returns 'smooth' when prefersReducedMotion is false", () => {
			setGlobalWindow({});
			assert.strictEqual(motionSafeScrollBehavior(), "smooth");
		});

		it("returns 'auto' when prefersReducedMotion is true", () => {
			setGlobalWindow({
				matchMedia: () => ({ matches: true }),
			});
			assert.strictEqual(motionSafeScrollBehavior(), "auto");
		});
	});

	describe("motionSafeScrollIntoView", () => {
		it("does nothing and returns undefined when target is null or undefined", () => {
			let matchMediaCalls = 0;
			setGlobalWindow({
				matchMedia: () => {
					matchMediaCalls++;
					return { matches: false };
				},
			});
			assert.strictEqual(motionSafeScrollIntoView(null), undefined);
			assert.strictEqual(motionSafeScrollIntoView(undefined), undefined);
			assert.strictEqual(matchMediaCalls, 0, "null/undefined target must short-circuit before calling matchMedia");
		});

		it("calls scrollIntoView with behavior 'smooth' and merges options when prefersReducedMotion is false", () => {
			setGlobalWindow({});
			let scrollIntoViewCalled = false;
			let passedOptions: ScrollIntoViewOptions | undefined;

			const mockTarget: Pick<Element, "scrollIntoView"> = {
				scrollIntoView: (options?: boolean | ScrollIntoViewOptions) => {
					scrollIntoViewCalled = true;
					passedOptions = typeof options === "object" ? options : undefined;
				},
			};

			motionSafeScrollIntoView(mockTarget as Element, {
				block: "start",
			});
			assert.strictEqual(scrollIntoViewCalled, true);
			assert.deepStrictEqual(passedOptions, {
				block: "start",
				behavior: "smooth",
			});
		});

		it("calls scrollIntoView with behavior 'auto' and merges options when prefersReducedMotion is true", () => {
			setGlobalWindow({
				matchMedia: () => ({ matches: true }),
			});
			let scrollIntoViewCalled = false;
			let passedOptions: ScrollIntoViewOptions | undefined;

			const mockTarget: Pick<Element, "scrollIntoView"> = {
				scrollIntoView: (options?: boolean | ScrollIntoViewOptions) => {
					scrollIntoViewCalled = true;
					passedOptions = typeof options === "object" ? options : undefined;
				},
			};

			motionSafeScrollIntoView(mockTarget as Element, {
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
			setGlobalWindow({});
			let passedOptions: ScrollIntoViewOptions | undefined;
			const mockTarget: Pick<Element, "scrollIntoView"> = {
				scrollIntoView: (options?: boolean | ScrollIntoViewOptions) => {
					passedOptions = typeof options === "object" ? options : undefined;
				},
			};

			motionSafeScrollIntoView(mockTarget as Element);
			assert.deepStrictEqual(passedOptions, { behavior: "smooth" });
		});
	});
});
