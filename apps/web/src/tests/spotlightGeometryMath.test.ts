/**
 * spotlightGeometryMath.test.ts
 *
 * DENTE CRM — Inquisitor Geometry & Spotlight Cutout Verification
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero pixel overlap, no clipping outside viewport, mobile safety).
 * - Mandate 8e: Doctor Autonomy (Non-blocking overlays, click-through preservation).
 * - Mandate 8s: Friction-Killer (100% deterministic geometry calculation, defensive math).
 * - Mandate 8t: Targeted Unit Test Verification.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
	calculateSpotlightCutout,
	calculateTooltipPlacement,
	isElementFullyInViewport,
	type SimpleRect,
	type ViewportDimensions,
} from "../components/tutorial/spotlightGeometry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Spotlight Geometry & Coach Mark Math Invariants", async (t) => {
	const defaultViewport: ViewportDimensions = { width: 1920, height: 1080 };

	await t.test("1. calculateSpotlightCutout handles invalid or zero-dimension rects safely", () => {
		assert.strictEqual(calculateSpotlightCutout(null), null);
		assert.strictEqual(calculateSpotlightCutout(undefined), null);
		assert.strictEqual(
			calculateSpotlightCutout({ top: 100, left: 100, width: 0, height: 50 }),
			null,
		);
		assert.strictEqual(
			calculateSpotlightCutout({ top: 100, left: 100, width: 50, height: -10 }),
			null,
		);
	});

	await t.test("2. calculateSpotlightCutout computes padded and rounded cutout coordinates", () => {
		const target: SimpleRect = { top: 200, left: 300, width: 120, height: 40 };
		const cutout = calculateSpotlightCutout(target, 8, 10, defaultViewport);

		assert.ok(cutout !== null, "Cutout must not be null");
		assert.strictEqual(cutout.x, 300 - 8);
		assert.strictEqual(cutout.y, 200 - 8);
		assert.strictEqual(cutout.width, 120 + 16);
		assert.strictEqual(cutout.height, 40 + 16);
		assert.strictEqual(cutout.rx, 10);
	});

	await t.test("3. calculateSpotlightCutout clamps coordinates when target touches screen edges", () => {
		// Target at top-left corner
		const topLeftTarget: SimpleRect = { top: 2, left: 3, width: 80, height: 30 };
		const cutoutTopLeft = calculateSpotlightCutout(topLeftTarget, 10, 8, defaultViewport);

		assert.ok(cutoutTopLeft !== null);
		assert.strictEqual(cutoutTopLeft.x, 0, "x coordinate must clamp to 0 at left boundary");
		assert.strictEqual(cutoutTopLeft.y, 0, "y coordinate must clamp to 0 at top boundary");

		// Target near bottom-right corner
		const bottomRightTarget: SimpleRect = {
			top: 1060,
			left: 1900,
			width: 60,
			height: 40,
		};
		const cutoutBR = calculateSpotlightCutout(bottomRightTarget, 10, 8, defaultViewport);

		assert.ok(cutoutBR !== null);
		assert.ok(cutoutBR.x + cutoutBR.width <= defaultViewport.width);
		assert.ok(cutoutBR.y + cutoutBR.height <= defaultViewport.height);
	});

	await t.test("4. calculateTooltipPlacement falls back to center dock when targetRect is null", () => {
		const placement = calculateTooltipPlacement(null, 380, 260, defaultViewport);
		assert.strictEqual(placement.side, "center");
		assert.ok(placement.top > 0);
		assert.ok(placement.left > 0);
		assert.ok(placement.left + 380 <= defaultViewport.width);
	});

	await t.test("5. calculateTooltipPlacement prefers 'bottom' when ample vertical space exists below", () => {
		// Target in top bar (top: 20, height: 40, bottom: 60)
		const topbarTarget: SimpleRect = {
			top: 20,
			left: 500,
			width: 140,
			height: 40,
			bottom: 60,
			right: 640,
		};

		const placement = calculateTooltipPlacement(topbarTarget, 380, 260, defaultViewport, 14);
		assert.strictEqual(placement.side, "bottom", "Must place below topbar target");
		assert.strictEqual(placement.top, 60 + 14, "Top position must equal targetBottom + margin");

		// Left position should center around targetCenterX (500 + 70 = 570)
		// 570 - 190 = 380
		assert.strictEqual(placement.left, 380);
	});

	await t.test("6. calculateTooltipPlacement switches to 'top' when target is near bottom of viewport", () => {
		// Target near bottom (top: 950, height: 40, bottom: 990)
		const bottomTarget: SimpleRect = {
			top: 950,
			left: 400,
			width: 120,
			height: 40,
			bottom: 990,
			right: 520,
		};

		const placement = calculateTooltipPlacement(bottomTarget, 380, 260, defaultViewport, 14);
		assert.strictEqual(placement.side, "top", "Must flip to 'top' when bottom space is insufficient");
		assert.strictEqual(placement.top, 950 - 14 - 260);
	});

	await t.test("7. calculateTooltipPlacement uses side placement when vertical space is constrained", () => {
		// Target in a compact window (height: 400, target in vertical middle)
		const compactViewport: ViewportDimensions = { width: 1280, height: 400 };
		const sideTarget: SimpleRect = {
			top: 150,
			left: 100,
			width: 80,
			height: 100,
			bottom: 250,
			right: 180,
		};

		const placement = calculateTooltipPlacement(sideTarget, 380, 260, compactViewport, 14);
		assert.strictEqual(placement.side, "right", "Must place to the right when vertical space is squeezed");
		assert.strictEqual(placement.left, 180 + 14);
	});

	await t.test("8. calculateTooltipPlacement arrow offset remains within tooltip bounds", () => {
		// Target shifted far to left
		const leftAlignedTarget: SimpleRect = {
			top: 100,
			left: 10,
			width: 50,
			height: 35,
			bottom: 135,
			right: 60,
		};

		const placement = calculateTooltipPlacement(leftAlignedTarget, 380, 260, defaultViewport, 14);
		assert.ok(placement.arrowOffsetPx >= 18, "Arrow offset must not collapse below left padding");
		assert.ok(placement.arrowOffsetPx <= 380 - 18, "Arrow offset must not exceed right padding");
	});

	await t.test("9. isElementFullyInViewport correctly determines visibility status", () => {
		// Fully visible
		const visible: SimpleRect = { top: 100, left: 100, width: 200, height: 80 };
		assert.strictEqual(isElementFullyInViewport(visible, defaultViewport), true);

		// Obscured at top boundary
		const clippedTop: SimpleRect = { top: 10, left: 100, width: 200, height: 80 };
		assert.strictEqual(isElementFullyInViewport(clippedTop, defaultViewport, 20), false);

		// Obscured at bottom boundary
		const clippedBottom: SimpleRect = { top: 1050, left: 100, width: 200, height: 80 };
		assert.strictEqual(isElementFullyInViewport(clippedBottom, defaultViewport, 20), false);

		// Null/zero
		assert.strictEqual(isElementFullyInViewport(null, defaultViewport), false);
		assert.strictEqual(
			isElementFullyInViewport({ top: 0, left: 0, width: 0, height: 0 }, defaultViewport),
			false,
		);
	});

	await t.test("10. guided-tour.css contains all critical animation keyframes and non-blocking rules", () => {
		const cssPath = path.resolve(__dirname, "../styles/guided-tour.css");
		const cssContent = fs.readFileSync(cssPath, "utf8");

		// Pulsing halo keyframe
		assert.ok(
			cssContent.includes("@keyframes tour-halo-pulse"),
			"Must define @keyframes tour-halo-pulse for expanding concentric ripples",
		);

		// Glowing beacon keyframe
		assert.ok(
			cssContent.includes("@keyframes tour-beacon-glow"),
			"Must define @keyframes tour-beacon-glow for breathing target border",
		);

		// Directional pointer bouncing keyframes
		assert.ok(
			cssContent.includes("tour-pointer-bounce-vertical") &&
				cssContent.includes("tour-pointer-bounce-horizontal"),
			"Must define vertical and horizontal bouncing animations for pointer badges",
		);

		// Non-blocking overlay rules
		assert.ok(
			cssContent.includes("pointer-events: none"),
			"Root spotlight overlay must have pointer-events: none to preserve underlying button clicks",
		);

		// Smooth transition on cutout
		assert.ok(
			cssContent.includes("transition:") && cssContent.includes("cubic-bezier"),
			"Cutout must feature smooth cubic-bezier transitions between steps",
		);

		// Contrast safety
		assert.ok(
			cssContent.includes("var(--paper") && cssContent.includes("var(--ink"),
			"Coach marks must use semantic design tokens for light/dark theme contrast",
		);
	});

	await t.test("11. Tutorial barrel export index.ts exports all components and math utilities", () => {
		const indexPath = path.resolve(__dirname, "../components/tutorial/index.ts");
		const indexContent = fs.readFileSync(indexPath, "utf8");

		assert.ok(indexContent.includes("./spotlightGeometry"));
		assert.ok(indexContent.includes("./SpotlightOverlay"));
		assert.ok(indexContent.includes("./PulsingHaloAnchor"));
		assert.ok(indexContent.includes("./CoachMarkTooltip"));
	});

	await t.test("12. Stress Test: Partially clipped elements with negative coordinates clamp accurately", () => {
		// Element partially scrolled off to the left (left: -20, width: 100)
		const offscreenLeft: SimpleRect = { top: 50, left: -20, width: 100, height: 40 };
		const cutout = calculateSpotlightCutout(offscreenLeft, 8, 8, defaultViewport);

		assert.ok(cutout !== null);
		assert.strictEqual(cutout.x, 0, "x coordinate must clamp to 0");
		// targetRight = -20 + 100 = 80; padded right = 88; clampedRight = 88
		// width = 88 - 0 = 88
		assert.strictEqual(cutout.width, 88);
		assert.strictEqual(cutout.y, 50 - 8);
	});

	await t.test("13. Stress Test: Completely offscreen elements return null to avoid ghost spotlights", () => {
		// Element scrolled 500px above viewport
		const aboveViewport: SimpleRect = { top: -500, left: 100, width: 80, height: 40 };
		assert.strictEqual(calculateSpotlightCutout(aboveViewport, 8, 8, defaultViewport), null);

		// Element scrolled past right boundary
		const pastRight: SimpleRect = { top: 100, left: 2500, width: 80, height: 40 };
		assert.strictEqual(calculateSpotlightCutout(pastRight, 8, 8, defaultViewport), null);
	});

	await t.test("14. Stress Test: Ultra-narrow element limits rx to avoid visual distortion", () => {
		// Narrow vertical divider (width: 4px, height: 80px)
		const narrow: SimpleRect = { top: 100, left: 200, width: 4, height: 80 };
		// with padding 0, width is 4 -> max rx should be 2
		const cutout = calculateSpotlightCutout(narrow, 0, 16, defaultViewport);
		assert.ok(cutout !== null);
		assert.strictEqual(cutout.rx, 2, "rx must not exceed width / 2");
	});

	await t.test("15. Stress Test: Mobile screen (375x667) adapts card width and max-height cleanly", () => {
		const mobileViewport: ViewportDimensions = { width: 375, height: 667 };
		const target: SimpleRect = { top: 50, left: 20, width: 100, height: 35 };

		const placement = calculateTooltipPlacement(target, 380, 260, mobileViewport, 10);
		// On 375px width: 375 - 16 * 2 = 343px
		assert.strictEqual(placement.width, 343, "Card width must clamp to 343px on 375px mobile screen");
		assert.ok(placement.left >= 16, "Must respect left screen margin");
		assert.ok(placement.left + placement.width <= 375 - 16, "Must not overflow right screen edge");
		assert.ok(placement.maxHeight <= 667 - 32, "Max height must not exceed viewport height minus margins");
	});

	await t.test("16. Stress Test: Theme typography and requestAnimationFrame presence verified in source", () => {
		const tourPath = path.resolve(__dirname, "../components/workspace/DoctorClinicalTrainingTour.tsx");
		const tourContent = fs.readFileSync(tourPath, "utf8");

		assert.ok(
			tourContent.includes("requestAnimationFrame"),
			"DoctorClinicalTrainingTour must use requestAnimationFrame to throttle scroll and resize updates",
		);
		assert.ok(
			tourContent.includes("scrollIntoView"),
			"DoctorClinicalTrainingTour must call scrollIntoView for smooth auto-scroll to off-screen targets",
		);

		const cssPath = path.resolve(__dirname, "../styles/guided-tour.css");
		const cssContent = fs.readFileSync(cssPath, "utf8");
		assert.ok(
			cssContent.includes(".tour-coach-tooltip h3") && cssContent.includes("#f8fafc"),
			"guided-tour.css must ensure high-contrast #f8fafc text in dark mode",
		);
	});

	await t.test("17. calculateTooltipPlacement computes arrowOffsetYPx pointing accurately at targetCenterY for side placements", () => {
		// Target centered vertically in a squeezed height window (height: 400, target Y: 150..250, center Y = 200)
		const compactViewport: ViewportDimensions = { width: 1280, height: 400 };
		const sideTarget: SimpleRect = {
			top: 150,
			left: 100,
			width: 80,
			height: 100,
			bottom: 250,
			right: 180,
		};

		const placement = calculateTooltipPlacement(sideTarget, 380, 260, compactViewport, 14);
		assert.strictEqual(placement.side, "right", "Must choose right when vertical space is squeezed");
		// TargetCenterY = 200. IdealTop = 200 - 130 = 70. Arrow offset Y = 200 - 70 = 130.
		assert.strictEqual(placement.arrowOffsetYPx, 130, "Arrow offset Y must point directly to target center Y");
	});

	await t.test("18. calculateTooltipPlacement clamps arrowOffsetYPx safely when card top is constrained by viewport bounds", () => {
		// Target placed high in a squeezed height window (height: 280, target Y: 70..130, center Y = 100)
		const compactViewport: ViewportDimensions = { width: 1280, height: 280 };
		const highSideTarget: SimpleRect = {
			top: 70,
			left: 100,
			width: 80,
			height: 60,
			bottom: 130,
			right: 180,
		};

		// preferredHeight 220. Space above: 70 - 14 = 56 (< 220). Space below: 280 - (130 + 14) = 136 (< 220).
		const placement = calculateTooltipPlacement(highSideTarget, 380, 220, compactViewport, 14);
		assert.strictEqual(placement.side, "right", "Must choose right side placement");
		// idealTop = 100 - 110 = -10 -> clamped to 16.
		assert.strictEqual(placement.top, 16, "Card top must clamp to screen margin 16");
		// Target center Y is 100. Relative to card top: 100 - 16 = 84px.
		assert.strictEqual(placement.arrowOffsetYPx, 84, "Arrow offset Y must adjust to clamped card top");
		assert.ok(placement.arrowOffsetYPx >= 18, "Must not collapse below corner radius threshold");
		assert.ok(placement.arrowOffsetYPx <= placement.maxHeight - 18, "Must not exceed bottom corner radius");
	});

	await t.test("19. guided-tour.css defines theme-aware halo variables for all themes and GPU-composited concentric rings", () => {
		const cssPath = path.resolve(__dirname, "../styles/guided-tour.css");
		const cssContent = fs.readFileSync(cssPath, "utf8");

		// Theme tokens
		assert.ok(cssContent.includes("--tour-halo-color"), "Must define --tour-halo-color");
		assert.ok(cssContent.includes("--tour-halo-glow"), "Must define --tour-halo-glow");
		assert.ok(cssContent.includes("--tour-spotlight-backdrop"), "Must define --tour-spotlight-backdrop");
		assert.ok(cssContent.includes('[data-theme="sakura"]'), "Must provide Sakura theme tokens");
		assert.ok(cssContent.includes('[data-theme="emerald"]'), "Must provide Emerald theme tokens");
		assert.ok(cssContent.includes('[data-theme="ocean"]'), "Must provide Ocean theme tokens");
		assert.ok(cssContent.includes('[data-theme="cyber_xray"]'), "Must provide Cyber X-Ray theme tokens");

		// Stutter-free keyframe fade-in
		assert.ok(
			cssContent.includes("opacity: 0") && cssContent.includes("opacity: 0.75"),
			"Keyframes must feature lead-in opacity ramp from 0 to eliminate repeat flashes",
		);

		// Hardware acceleration
		assert.ok(
			cssContent.includes("will-change: transform, opacity") &&
				cssContent.includes("transform: translateZ(0)"),
			"Must apply GPU layer promotion (will-change & translateZ(0)) for 60/120fps stutter-free rendering",
		);

		// Pointer bounce preservation of horizontal/vertical centering
		assert.ok(
			cssContent.includes("transform: translateX(-50%) translateY("),
			"Vertical pointer bounce must preserve translateX(-50%) centering",
		);
		assert.ok(
			cssContent.includes("transform: translateY(-50%) translateX("),
			"Horizontal pointer bounce must preserve translateY(-50%) centering",
		);
	});

	await t.test("20. SpotlightOverlay and CoachMarkTooltip support visualViewport for Retina zoom scaling", () => {
		const spotlightPath = path.resolve(__dirname, "../components/tutorial/SpotlightOverlay.tsx");
		const spotlightContent = fs.readFileSync(spotlightPath, "utf8");
		assert.ok(
			spotlightContent.includes("window.visualViewport"),
			"SpotlightOverlay must inspect window.visualViewport for Retina and pinch-zoom resilience",
		);

		const tooltipPath = path.resolve(__dirname, "../components/tutorial/CoachMarkTooltip.tsx");
		const tooltipContent = fs.readFileSync(tooltipPath, "utf8");
		assert.ok(
			tooltipContent.includes("window.visualViewport"),
			"CoachMarkTooltip must inspect window.visualViewport for Retina and pinch-zoom resilience",
		);
		assert.ok(
			tooltipContent.includes("arrowOffsetYPx"),
			"CoachMarkTooltip must utilize arrowOffsetYPx for side placements",
		);
	});
});
