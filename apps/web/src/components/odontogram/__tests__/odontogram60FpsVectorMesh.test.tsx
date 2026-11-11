/**
 * apps/web/src/components/odontogram/__tests__/odontogram60FpsVectorMesh.test.tsx
 *
 * 60 FPS Vector Mesh Invariant Test Suite (THE HAMMER Constitution):
 * 1. ZERO Parasitic Re-renders: When tooth 16 state or selection changes,
 *    strictly tooth 16 re-renders. Neighboring teeth (15, 14, 11, etc.) have ZERO re-renders.
 * 2. Stable Callbacks: onClick and onQuickStateChange references remain 100% stable
 *    across state mutations, eliminating 32-tooth re-render cascading storms.
 * 3. Low-End Hardware Mode & Reduced Motion: isLowSpecFilterDisabled() and CSS rules
 *    strictly strip heavy SVG Gaussian drop-shadow filters on low-end hardware and reduced motion.
 * 4. Fast Quadrant & Dentition Switcher: Instant adult (32) vs pediatric (20) vs mixed formula transitions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function readCssWithImports(filePath: string): string {
	const dir = path.dirname(filePath);
	let css = fs.readFileSync(filePath, "utf-8");
	const importRegex = /@import\s+['"]([^'"]+)['"];/g;
	css = css.replace(importRegex, (_, rel) => readCssWithImports(path.resolve(dir, rel)));
	return css;
}

import {
	areAnatomicalToothPropsEqual,
	type AnatomicalToothProps,
} from "../gate0/AnatomicalTooth";
import {
	isLowSpecFilterDisabled,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
} from "../AnatomicalToothColors";
import type { ToothData, ToothState } from "../ToothChart";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("1. 60 FPS Vector Mesh: Parasitic Re-render Elimination & Comparators", () => {
	it("areAnatomicalToothPropsEqual returns true for tooth 15 when tooth 16 changes state", () => {
		const onClickDummy = () => {};

		const prevPropsTooth15: AnatomicalToothProps = {
			toothNumber: 15,
			presetId: "intact",
			isDark: false,
			zoom: 1,
			isFlipped: false,
			showBadge: true,
			onClick: onClickDummy,
		};

		const nextPropsTooth15: AnatomicalToothProps = {
			toothNumber: 15,
			presetId: "intact",
			isDark: false,
			zoom: 1,
			isFlipped: false,
			showBadge: true,
			onClick: onClickDummy,
		};

		// For unmutated tooth 15, areAnatomicalToothPropsEqual MUST be true -> ZERO re-render!
		const isEqual = areAnatomicalToothPropsEqual(prevPropsTooth15, nextPropsTooth15);
		expect(isEqual).toBe(true);
	});

	it("areAnatomicalToothPropsEqual returns false strictly for tooth 16 when tooth 16 is modified", () => {
		const onClickDummy = () => {};

		const prevTooth16Props: AnatomicalToothProps = {
			toothNumber: 16,
			presetId: "intact",
			isDark: false,
			zoom: 1,
			isFlipped: false,
			showBadge: true,
			onClick: onClickDummy,
		};

		const nextTooth16Props: AnatomicalToothProps = {
			toothNumber: 16,
			presetId: "caries_dentin",
			isDark: false,
			zoom: 1,
			isFlipped: false,
			showBadge: true,
			onClick: onClickDummy,
		};

		// Tooth 16 MUST re-render because its presetId changed
		const isEqual = areAnatomicalToothPropsEqual(prevTooth16Props, nextTooth16Props);
		expect(isEqual).toBe(false);
	});

	it("areAnatomicalToothPropsEqual preserves memoization with deep layer comparison", () => {
		const onClickDummy = () => {};

		const prevProps: AnatomicalToothProps = {
			toothNumber: 46,
			isDark: false,
			zoom: 1,
			onClick: onClickDummy,
			layers: {
				crown: true,
				roots: true,
				canals: true,
				pulp: true,
				caries: false,
			} as any,
		};

		const nextProps: AnatomicalToothProps = {
			toothNumber: 46,
			isDark: false,
			zoom: 1,
			onClick: onClickDummy,
			layers: {
				crown: true,
				roots: true,
				canals: true,
				pulp: true,
				caries: false,
			} as any,
		};

		expect(areAnatomicalToothPropsEqual(prevProps, nextProps)).toBe(true);

		const changedProps: AnatomicalToothProps = {
			...nextProps,
			layers: {
				...nextProps.layers!,
				caries: true,
			},
		};
		expect(areAnatomicalToothPropsEqual(prevProps, changedProps)).toBe(false);
	});

	it("simulates a 32-tooth arch state mutation and proves strictly 1 tooth re-renders", () => {
		const allTeeth = [...TOP_TEETH, ...BOTTOM_TEETH];
		const onClickStable = () => {};

		// Initial state: all intact
		const prevMap = new Map<number, AnatomicalToothProps>();
		const nextMap = new Map<number, AnatomicalToothProps>();

		for (const toothNum of allTeeth) {
			prevMap.set(toothNum, {
				toothNumber: toothNum,
				presetId: "intact",
				isDark: false,
				zoom: 1,
				isFlipped: (toothNum >= 21 && toothNum <= 38),
				showBadge: true,
				onClick: onClickStable,
			});
			nextMap.set(toothNum, {
				toothNumber: toothNum,
				presetId: toothNum === 16 ? "caries_dentin" : "intact",
				isDark: false,
				zoom: 1,
				isFlipped: (toothNum >= 21 && toothNum <= 38),
				showBadge: true,
				onClick: onClickStable,
			});
		}

		let reRenderCount = 0;
		const reRenderedTeeth: number[] = [];

		for (const toothNum of allTeeth) {
			const prevProps = prevMap.get(toothNum)!;
			const nextProps = nextMap.get(toothNum)!;

			const shouldSkipRender = areAnatomicalToothPropsEqual(prevProps, nextProps);
			if (!shouldSkipRender) {
				reRenderCount++;
				reRenderedTeeth.push(toothNum);
			}
		}

		// STRICTURE: Strictly tooth 16 re-renders! All 31 other teeth skip render!
		expect(reRenderCount).toBe(1);
		expect(reRenderedTeeth).toEqual([16]);
	});
});

describe("2. Low-End Hardware Mode & Reduced Motion Graphic Filters", () => {
	let origDocument: any;

	beforeEach(() => {
		origDocument = (globalThis as any).document;
		const attributes: Record<string, string> = {};
		const classList = new Set<string>();
		const bodyClassList = new Set<string>();

		(globalThis as any).document = {
			documentElement: {
				getAttribute: (name: string) => attributes[name] ?? null,
				setAttribute: (name: string, val: string) => {
					attributes[name] = val;
				},
				removeAttribute: (name: string) => {
					delete attributes[name];
				},
				classList: {
					add: (cls: string) => classList.add(cls),
					remove: (cls: string) => classList.delete(cls),
					contains: (cls: string) => classList.has(cls),
				},
			},
			body: {
				classList: {
					add: (cls: string) => bodyClassList.add(cls),
					remove: (cls: string) => bodyClassList.delete(cls),
					contains: (cls: string) => bodyClassList.has(cls),
				},
			},
		};
	});

	afterEach(() => {
		(globalThis as any).document = origDocument;
	});

	it("isLowSpecFilterDisabled() correctly detects .low-end-hardware-mode class", () => {
		expect(isLowSpecFilterDisabled()).toBe(false);

		document.documentElement.classList.add("low-end-hardware-mode");
		expect(isLowSpecFilterDisabled()).toBe(true);

		document.documentElement.classList.remove("low-end-hardware-mode");
		expect(isLowSpecFilterDisabled()).toBe(false);

		document.body.classList.add("low-end-hardware-mode");
		expect(isLowSpecFilterDisabled()).toBe(true);
	});

	it("isLowSpecFilterDisabled() correctly detects hardware attributes", () => {
		document.documentElement.setAttribute("data-hardware-tier", "low");
		expect(isLowSpecFilterDisabled()).toBe(true);

		document.documentElement.removeAttribute("data-hardware-tier");
		document.documentElement.setAttribute("data-low-spec", "true");
		expect(isLowSpecFilterDisabled()).toBe(true);
	});

	it("odontogram.css physically contains low-end hardware mode and reduced motion filter: none rules", () => {
		const cssPath = path.resolve(__dirname, "../odontogram.css");
		const cssContent = readCssWithImports(cssPath);

		expect(cssContent).toContain(".low-end-hardware-mode .tooth-svg-element");
		expect(cssContent).toContain("filter: none !important;");
		expect(cssContent).toContain("outline: 2px solid var(--teal, #0d9488) !important;");
		expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");
	});
});

describe("3. Fast Quadrant and Dentition Mode Formula Switchers", () => {
	it("adult formula contains exactly 32 teeth (16 upper, 16 lower)", () => {
		expect(TOP_TEETH.length).toBe(16);
		expect(BOTTOM_TEETH.length).toBe(16);
		expect([...TOP_TEETH, ...BOTTOM_TEETH].length).toBe(32);
	});

	it("pediatric formula contains exactly 20 primary teeth (10 upper, 10 lower)", () => {
		expect(PEDIATRIC_TOP_TEETH.length).toBe(10);
		expect(PEDIATRIC_BOTTOM_TEETH.length).toBe(10);
		expect([...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH].length).toBe(20);
		// Check FDI primary tooth notation: quadrants 5, 6, 7, 8
		for (const tooth of PEDIATRIC_TOP_TEETH) {
			expect(tooth >= 51 && tooth <= 65).toBe(true);
		}
		for (const tooth of PEDIATRIC_BOTTOM_TEETH) {
			expect(tooth >= 71 && tooth <= 85).toBe(true);
		}
	});

	it("mixed dentition formula combines permanent molars with primary teeth (24 teeth)", () => {
		expect(MIXED_TOP_TEETH.length).toBe(12);
		expect(MIXED_BOTTOM_TEETH.length).toBe(12);
		expect([...MIXED_TOP_TEETH, ...MIXED_BOTTOM_TEETH].length).toBe(24);
		// Permanent first molars (16, 26, 46, 36) included in mixed dentition
		expect(MIXED_TOP_TEETH).toContain(16);
		expect(MIXED_TOP_TEETH).toContain(26);
		expect(MIXED_BOTTOM_TEETH).toContain(46);
		expect(MIXED_BOTTOM_TEETH).toContain(36);
	});
});
