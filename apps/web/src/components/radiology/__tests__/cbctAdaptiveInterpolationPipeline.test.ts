/**
 * DENTE CRM — CBCT Two-Stage Adaptive Slice Interpolation Pipeline Inquisition Tests
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	CBCT_ADAPTIVE_INTERACTION_DEBOUNCE_MS,
	CBCT_INTERACTION_EVENT,
	CbctAdaptiveInteractionController,
	notifyCbctSliceInteraction,
	resolveAdaptiveInterpolationMethod,
} from "../mpr/cbctAdaptiveSlicePipeline";
import {
	CBCT_INTERPOLATION_CODES,
	resolveInterpolationCode,
} from "../mpr/webgl/CbctVolumeGlTextures";

describe("CBCT Two-Stage Adaptive Slice Interpolation Pipeline (FEAT-010)", () => {
	describe("1. Stage 1 Scrubbing Invariant: Instant Bilinear Fast-Path (120+ FPS)", () => {
		it("forces hardware bilinear when isInteracting is true regardless of doctor target preset", () => {
			const methodsToTest = [
				"lanczos3",
				"bilateral",
				"catmull_rom",
				"b_spline",
				"nearest",
				"bilinear",
				undefined,
			] as const;

			for (const target of methodsToTest) {
				assert.equal(resolveAdaptiveInterpolationMethod(target, true), "bilinear");
			}
		});

		it("maps bilinear fast-path to WebGL2 interpolation code 1 (hardware trilinear 3D sampler)", () => {
			const fastPathCode = resolveInterpolationCode("bilinear");
			assert.equal(fastPathCode, CBCT_INTERPOLATION_CODES.BILINEAR);
			assert.equal(fastPathCode, 1);
		});
	});

	describe("2. Stage 2 Settled Invariant: Razor-Sharp Refinement (> 80 ms pause)", () => {
		it("restores doctor's preferred interpolation method when isInteracting is false", () => {
			assert.equal(resolveAdaptiveInterpolationMethod("lanczos3", false), "lanczos3");
			assert.equal(resolveAdaptiveInterpolationMethod("bilateral", false), "bilateral");
			assert.equal(resolveAdaptiveInterpolationMethod("catmull_rom", false), "catmull_rom");
			assert.equal(resolveAdaptiveInterpolationMethod("b_spline", false), "b_spline");
			assert.equal(resolveAdaptiveInterpolationMethod("nearest", false), "nearest");
			assert.equal(resolveAdaptiveInterpolationMethod("bilinear", false), "bilinear");
			assert.equal(resolveAdaptiveInterpolationMethod(undefined, false), "bilinear");
		});

		it("maps Lanczos-3 and Bilateral to valid WebGL2 shader uniform codes", () => {
			assert.equal(resolveInterpolationCode("lanczos3"), CBCT_INTERPOLATION_CODES.LANCZOS3);
			assert.equal(resolveInterpolationCode("bilateral"), CBCT_INTERPOLATION_CODES.BILATERAL);
		});
	});

	describe("3. CbctAdaptiveInteractionController Lifecycle, Event Dispatch & Debounce State Machine", () => {
		it("switches to isInteracting=true immediately on notifyInteraction()", () => {
			const stateChanges: boolean[] = [];
			const controller = new CbctAdaptiveInteractionController({
				debounceMs: 50,
				onStateChange: (state) => stateChanges.push(state),
			});

			assert.equal(controller.getIsInteracting(), false);
			controller.notifyInteraction();
			assert.equal(controller.getIsInteracting(), true);
			assert.deepEqual(stateChanges, [true]);

			controller.dispose();
		});

		it("maintains isInteracting=true during continuous rapid scrubbing < debounceMs", async () => {
			const stateChanges: boolean[] = [];
			const controller = new CbctAdaptiveInteractionController({
				debounceMs: 60,
				onStateChange: (state) => stateChanges.push(state),
			});

			controller.notifyInteraction();
			assert.equal(controller.getIsInteracting(), true);

			await new Promise((resolve) => setTimeout(resolve, 20));
			controller.notifyInteraction();
			assert.equal(controller.getIsInteracting(), true);

			await new Promise((resolve) => setTimeout(resolve, 20));
			controller.notifyInteraction();
			assert.equal(controller.getIsInteracting(), true);

			assert.deepEqual(stateChanges, [true]);

			await new Promise((resolve) => setTimeout(resolve, 75));
			assert.equal(controller.getIsInteracting(), false);
			assert.deepEqual(stateChanges, [true, false]);

			controller.dispose();
		});

		it("cleans up timer and resets state cleanly on dispose() without memory leaks", async () => {
			let settledCalled = false;
			const controller = new CbctAdaptiveInteractionController({
				debounceMs: 40,
				onStateChange: (state) => {
					if (!state) settledCalled = true;
				},
			});

			controller.notifyInteraction();
			assert.equal(controller.getIsInteracting(), true);

			controller.dispose();
			assert.equal(controller.getIsInteracting(), false);

			await new Promise((resolve) => setTimeout(resolve, 60));
			assert.equal(settledCalled, false);
		});

		it("notifyCbctSliceInteraction dispatches CBCT_INTERACTION_EVENT cleanly when window exists", () => {
			const dispatched: string[] = [];
			const origWindow = globalThis.window;
			const origCustomEvent = globalThis.CustomEvent;
			Object.defineProperty(globalThis, "CustomEvent", {
				value: class MockCustomEvent {
					type: string;
					constructor(type: string) {
						this.type = type;
					}
				},
				writable: true,
				configurable: true,
			});
			Object.defineProperty(globalThis, "window", {
				value: {
					dispatchEvent: (ev: { type: string }) => {
						dispatched.push(ev.type);
						return true;
					},
				},
				writable: true,
				configurable: true,
			});
			try {
				notifyCbctSliceInteraction();
				assert.deepEqual(dispatched, [CBCT_INTERACTION_EVENT]);
				assert.equal(CBCT_ADAPTIVE_INTERACTION_DEBOUNCE_MS, 80);
				assert.equal(CBCT_INTERACTION_EVENT, "dente:cbct-slice-interaction");
			} finally {
				Object.defineProperty(globalThis, "window", { value: origWindow, writable: true, configurable: true });
				Object.defineProperty(globalThis, "CustomEvent", { value: origCustomEvent, writable: true, configurable: true });
			}
		});
	});
});
