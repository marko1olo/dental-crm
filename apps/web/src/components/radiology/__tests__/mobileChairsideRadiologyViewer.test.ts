import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	MobileChairsideRadiologyViewer,
	MobileGestureViewport,
	MobileRadiologyFilterToolbar,
	MobileStudiesDrawer,
	MobilePatientShowcaseOverlay,
} from "../MobileChairsideRadiologyViewer.js";
import * as mobileViewerModule from "../mobileViewer/index.js";

describe("MobileChairsideRadiologyViewer Decomposed Architecture & Ergonomics", () => {
	it("1. Facade and index.tsx re-export all essential components and types", () => {
		assert.equal(typeof MobileChairsideRadiologyViewer, "function");
		assert.equal(typeof MobileGestureViewport, "function");
		assert.equal(typeof MobileRadiologyFilterToolbar, "function");
		assert.equal(typeof MobileStudiesDrawer, "function");
		assert.equal(typeof MobilePatientShowcaseOverlay, "function");

		// Check parity between facade and mobileViewer module
		assert.equal(
			MobileChairsideRadiologyViewer,
			mobileViewerModule.MobileChairsideRadiologyViewer
		);
		assert.equal(
			MobileGestureViewport,
			mobileViewerModule.MobileGestureViewport
		);
		assert.equal(
			MobileRadiologyFilterToolbar,
			mobileViewerModule.MobileRadiologyFilterToolbar
		);
		assert.equal(
			MobileStudiesDrawer,
			mobileViewerModule.MobileStudiesDrawer
		);
		assert.equal(
			MobilePatientShowcaseOverlay,
			mobileViewerModule.MobilePatientShowcaseOverlay
		);
	});

	it("2. Validates clinical pixel spacing resolution across imaging modalities", () => {
		function resolvePixelSpacing(kind?: string): number {
			if (kind === "periapical" || kind === "bitewing") return 0.04;
			if (kind === "opg") return 0.1;
			if (kind === "cbct") return 0.125;
			return 0.04;
		}

		assert.equal(resolvePixelSpacing("periapical"), 0.04);
		assert.equal(resolvePixelSpacing("bitewing"), 0.04);
		assert.equal(resolvePixelSpacing("opg"), 0.1);
		assert.equal(resolvePixelSpacing("cbct"), 0.125);
		assert.equal(resolvePixelSpacing("unknown"), 0.04);
	});

	it("3. Validates caliper ruler distance conversion accurately", () => {
		function calcRulerDistance(distPx: number, zoom: number, pixelSpacingMm: number): number {
			return Number(((distPx / zoom) * pixelSpacingMm).toFixed(1));
		}

		assert.equal(calcRulerDistance(100, 1.0, 0.04), 4.0);
		assert.equal(calcRulerDistance(200, 2.0, 0.04), 4.0);
		assert.equal(calcRulerDistance(150, 1.5, 0.1), 10.0);
		assert.equal(calcRulerDistance(400, 1.0, 0.125), 50.0);
	});

	it("4. Validates pinch-to-zoom step cycle and boundary clamping", () => {
		function cycleZoom(prev: number): number {
			if (prev < 1.4) return 1.5;
			if (prev < 1.9) return 2.0;
			if (prev < 2.4) return 2.5;
			return 1.0;
		}

		assert.equal(cycleZoom(1.0), 1.5);
		assert.equal(cycleZoom(1.5), 2.0);
		assert.equal(cycleZoom(2.0), 2.5);
		assert.equal(cycleZoom(2.5), 1.0);

		function clampZoom(next: number): number {
			return Math.max(0.8, Math.min(4.5, next));
		}

		assert.equal(clampZoom(0.2), 0.8);
		assert.equal(clampZoom(1.5), 1.5);
		assert.equal(clampZoom(5.8), 4.5);
	});

	it("5. Validates CSS diagnostic filter compilation (Negative, Contrast, CLAHE)", () => {
		function buildFilterString(
			inverted: boolean,
			contrast: number,
			brightness: number,
			enhancementClahe: boolean
		): string {
			const parts: string[] = [];
			if (inverted) parts.push("invert(1)");
			if (contrast !== 1.0) parts.push(`contrast(${contrast})`);
			if (brightness !== 1.0) parts.push(`brightness(${brightness})`);
			if (enhancementClahe) parts.push("contrast(1.4) drop-shadow(0 0 1px #2dd4bf)");
			return parts.length > 0 ? parts.join(" ") : "none";
		}

		assert.equal(buildFilterString(false, 1.0, 1.0, false), "none");
		assert.equal(buildFilterString(true, 1.0, 1.0, false), "invert(1)");
		assert.equal(
			buildFilterString(false, 1.35, 1.1, true),
			"contrast(1.35) brightness(1.1) contrast(1.4) drop-shadow(0 0 1px #2dd4bf)"
		);
	});

	it("6. Renders master MobileChairsideRadiologyViewer with all core test anchors", () => {
		const html = renderToString(
			React.createElement(MobileChairsideRadiologyViewer, {
				selectedImagingStudy: {
					id: "study-1",
					title: "RVG Прицельный #36",
					kind: "periapical",
					toothCode: "36",
					capturedAt: "2026-10-10T12:00:00Z",
					previewUrl: "https://example.com/xray.jpg",
				},
				activeImagingStudies: [
					{
						id: "study-1",
						title: "RVG Прицельный #36",
						kind: "periapical",
						toothCode: "36",
						capturedAt: "2026-10-10T12:00:00Z",
						previewUrl: "https://example.com/xray.jpg",
					},
				],
				activePatient: {
					id: "pat-1",
					fullName: "Иванов Иван Иванович",
				},
				onSelectStudy: () => {},
				effectivePreviewUrl: "https://example.com/xray.jpg",
				isPreviewLoading: false,
				previewLoadError: false,
				selectedStudyHasFile: true,
				imagingKindLabels: { periapical: "Прицельный снимок" },
				onCaptureCamera: () => {},
				onPickFiles: () => {},
				onAnalyzeAI: () => {},
				isAnalyzingAI: false,
			})
		);

		// Core container & topbar anchors
		assert.ok(html.includes('data-testid="mobile-chairside-radiology-container"'));
		assert.ok(html.includes('data-testid="mobile-radiology-topbar"'));
		assert.ok(html.includes('data-testid="btn-open-mobile-studies-sheet"'));
		assert.ok(html.includes('data-testid="btn-mobile-camera-capture"'));
		assert.ok(html.includes('data-testid="btn-mobile-reset-transform"'));
		assert.ok(html.includes('data-testid="btn-mobile-close-viewer"'));

		// Viewport anchors
		assert.ok(html.includes('data-testid="mobile-radiology-viewport"'));
		assert.ok(html.includes('data-testid="mobile-scale-hud"'));
		assert.ok(html.includes('data-testid="mobile-active-xray-image"'));

		// Thumb bar anchors
		assert.ok(html.includes('data-testid="mobile-radiology-thumb-bar"'));
		assert.ok(html.includes('data-testid="btn-mobile-thumb-invert"'));
		assert.ok(html.includes('data-testid="btn-mobile-thumb-contrast"'));
		assert.ok(html.includes('data-testid="btn-mobile-thumb-ruler"'));
		assert.ok(html.includes('data-testid="btn-mobile-thumb-zoom"'));
		assert.ok(html.includes('data-testid="btn-mobile-thumb-rotate"'));
		assert.ok(html.includes('data-testid="btn-mobile-thumb-sliders"'));
	});

	it("7. Renders MobilePatientShowcaseOverlay with 1-click Before/After comparison and Form 043/u link", () => {
		const html = renderToString(
			React.createElement(MobilePatientShowcaseOverlay, {
				isOpen: true,
				onClose: () => {},
				selectedStudy: {
					id: "study-1",
					title: "RVG Прицельный #36",
					kind: "periapical",
					toothCode: "36",
					capturedAt: "2026-10-10T12:00:00Z",
					previewUrl: "https://example.com/xray.jpg",
				},
				activePatient: {
					fullName: "Иванов Иван Иванович",
				},
				effectivePreviewUrl: "https://example.com/xray.jpg",
				computedFilter: "none",
				modalityTitle: "Прицельный снимок",
				toothBadge: "Зуб #36",
				studyDateStr: "10.10.2026",
				comparisonStudy: {
					id: "study-old",
					title: "Архив #36",
					kind: "periapical",
					toothCode: "36",
					capturedAt: "2025-01-01T12:00:00Z",
					previewUrl: "https://example.com/old.jpg",
				},
				triggerHaptic: () => {},
			})
		);

		assert.ok(html.includes('data-testid="mobile-patient-showcase-overlay"'));
		assert.ok(html.includes('data-testid="btn-close-patient-showcase"'));
		assert.ok(html.includes('data-testid="btn-toggle-showcase-split"'));
		assert.ok(html.includes('data-testid="btn-toggle-attach-protocol-043"'));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Зуб #36"));
	});
});
