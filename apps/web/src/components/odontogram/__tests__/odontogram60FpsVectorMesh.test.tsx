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

import {
	areToothWrapperPropsEqual,
	areToothDataEqual,
	type ToothWrapperProps,
} from "../ToothWrapper";
import {
	areAnatomicalToothSvgPropsEqual,
	type AnatomicalToothSVGProps,
} from "../AnatomicalToothSVG";
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
	it("areToothWrapperPropsEqual returns true for tooth 15 when tooth 16 changes state", () => {
		const onClickDummy = () => {};
		const onQuickStateChangeDummy = () => {};

		const tooth15DataPrev: ToothData = {
			toothNumber: 15,
			state: "Healthy",
			surfaces: [],
		};

		const tooth15DataNext: ToothData = {
			toothNumber: 15,
			state: "Healthy",
			surfaces: [],
		};

		const prevPropsTooth15: ToothWrapperProps = {
			tooth: tooth15DataPrev,
			scale: 1,
			isTop: true,
			isSelected: false,
			selectedTeeth: [16], // Tooth 16 selected
			activeStamp: null,
			onClick: onClickDummy,
			onQuickStateChange: onQuickStateChangeDummy,
			useSurfaces: false,
			isPontic: false,
			hasLeftBridgeConnector: false,
			hasRightBridgeConnector: false,
		};

		const nextPropsTooth15: ToothWrapperProps = {
			tooth: tooth15DataNext,
			scale: 1,
			isTop: true,
			isSelected: false,
			selectedTeeth: [16], // Tooth 16 still selected
			activeStamp: null,
			onClick: onClickDummy, // Stable reference
			onQuickStateChange: onQuickStateChangeDummy, // Stable reference
			useSurfaces: false,
			isPontic: false,
			hasLeftBridgeConnector: false,
			hasRightBridgeConnector: false,
		};

		// For unselected tooth 15, areToothWrapperPropsEqual MUST be true -> ZERO re-render!
		const isEqual = areToothWrapperPropsEqual(prevPropsTooth15, nextPropsTooth15);
		expect(isEqual).toBe(true);
	});

	it("areToothWrapperPropsEqual returns false strictly for tooth 16 when tooth 16 is modified", () => {
		const onClickDummy = () => {};
		const onQuickStateChangeDummy = () => {};

		const prevTooth16Props: ToothWrapperProps = {
			tooth: { toothNumber: 16, state: "Healthy", surfaces: [] },
			scale: 1,
			isTop: true,
			isSelected: false,
			selectedTeeth: [],
			activeStamp: null,
			onClick: onClickDummy,
			onQuickStateChange: onQuickStateChangeDummy,
			useSurfaces: false,
			isPontic: false,
			hasLeftBridgeConnector: false,
			hasRightBridgeConnector: false,
		};

		const nextTooth16Props: ToothWrapperProps = {
			tooth: { toothNumber: 16, state: "Caries", surfaces: ["O"] },
			scale: 1,
			isTop: true,
			isSelected: true,
			selectedTeeth: [16],
			activeStamp: null,
			onClick: onClickDummy,
			onQuickStateChange: onQuickStateChangeDummy,
			useSurfaces: false,
			isPontic: false,
			hasLeftBridgeConnector: false,
			hasRightBridgeConnector: false,
		};

		// Tooth 16 MUST re-render because its state & selection changed
		const isEqual = areToothWrapperPropsEqual(prevTooth16Props, nextTooth16Props);
		expect(isEqual).toBe(false);
	});

	it("areAnatomicalToothSvgPropsEqual preserves memoization when unmutated tooth received stable callbacks", () => {
		const onClickDummy = () => {};
		const onQuickStateChangeDummy = () => {};

		const prevSvgProps: AnatomicalToothSVGProps = {
			number: 15,
			state: "Healthy",
			scale: 1,
			onClick: onClickDummy,
			onQuickStateChange: onQuickStateChangeDummy,
			surfaces: [],
			bopSites: [],
			suppurationSites: [],
			pocketDepth: 2,
			mobility: 0,
			furcation: 0,
		};

		const nextSvgProps: AnatomicalToothSVGProps = {
			number: 15,
			state: "Healthy",
			scale: 1,
			onClick: onClickDummy,
			onQuickStateChange: onQuickStateChangeDummy,
			surfaces: [],
			bopSites: [],
			suppurationSites: [],
			pocketDepth: 2,
			mobility: 0,
			furcation: 0,
		};

		expect(areAnatomicalToothSvgPropsEqual(prevSvgProps, nextSvgProps)).toBe(true);

		// Now change pathology on tooth 15: must return false (re-render triggered)
		const changedSvgProps: AnatomicalToothSVGProps = {
			...nextSvgProps,
			state: "Periodontitis",
			pocketDepth: 6,
			mobility: 2,
			furcation: 1,
			bopSites: ["M", "D"],
		};
		expect(areAnatomicalToothSvgPropsEqual(prevSvgProps, changedSvgProps)).toBe(false);
	});

	it("simulates a 32-tooth arch state mutation and proves strictly 1 tooth re-renders", () => {
		const initialTeeth: ToothData[] = TOP_TEETH.concat(BOTTOM_TEETH).map((num) => ({
			toothNumber: num,
			state: "Healthy" as ToothState,
			surfaces: [],
		}));

		const onClickStable = () => {};
		const onQuickStateChangeStable = () => {};

		// Simulate updating tooth 16 from Healthy to Caries (O)
		const updatedTeeth: ToothData[] = initialTeeth.map((t) =>
			t.toothNumber === 16 ? { ...t, state: "Caries" as ToothState, surfaces: ["O"] } : t,
		);

		let reRenderCount = 0;
		const reRenderedTeeth: number[] = [];

		for (const toothNum of TOP_TEETH.concat(BOTTOM_TEETH)) {
			const prevToothData = initialTeeth.find((t) => t.toothNumber === toothNum)!;
			const nextToothData = updatedTeeth.find((t) => t.toothNumber === toothNum)!;

			const prevProps: ToothWrapperProps = {
				tooth: prevToothData,
				scale: 1,
				isTop: toothNum < 30,
				isSelected: false,
				selectedTeeth: [],
				activeStamp: null,
				onClick: onClickStable,
				onQuickStateChange: onQuickStateChangeStable,
				useSurfaces: false,
				isPontic: false,
				hasLeftBridgeConnector: false,
				hasRightBridgeConnector: false,
			};

			const nextProps: ToothWrapperProps = {
				tooth: nextToothData,
				scale: 1,
				isTop: toothNum < 30,
				isSelected: toothNum === 16,
				selectedTeeth: [16],
				activeStamp: null,
				onClick: onClickStable,
				onQuickStateChange: onQuickStateChangeStable,
				useSurfaces: false,
				isPontic: false,
				hasLeftBridgeConnector: false,
				hasRightBridgeConnector: false,
			};

			const shouldSkipRender = areToothWrapperPropsEqual(prevProps, nextProps);
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
		const cssContent = fs.readFileSync(cssPath, "utf-8");

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
		expect(TOP_TEETH.concat(BOTTOM_TEETH).length).toBe(32);
	});

	it("pediatric formula contains exactly 20 primary teeth (10 upper, 10 lower)", () => {
		expect(PEDIATRIC_TOP_TEETH.length).toBe(10);
		expect(PEDIATRIC_BOTTOM_TEETH.length).toBe(10);
		expect(PEDIATRIC_TOP_TEETH.concat(PEDIATRIC_BOTTOM_TEETH).length).toBe(20);
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
		expect(MIXED_TOP_TEETH.concat(MIXED_BOTTOM_TEETH).length).toBe(24);
		// Permanent first molars (16, 26, 46, 36) included in mixed dentition
		expect(MIXED_TOP_TEETH).toContain(16);
		expect(MIXED_TOP_TEETH).toContain(26);
		expect(MIXED_BOTTOM_TEETH).toContain(46);
		expect(MIXED_BOTTOM_TEETH).toContain(36);
	});
});
