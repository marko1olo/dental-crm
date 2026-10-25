import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephalometricCanvas } from "../CephalometricCanvas";
import { DEFAULT_CEPH_LANDMARKS_PRESET } from "../cephalometricMath";

describe("Cephalometric Canvas Overlay & Honest Dropzone", () => {
	it("renders honest medical dropzone when imageUrl is null, without fake vector skull", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricCanvas, {
				landmarks: DEFAULT_CEPH_LANDMARKS_PRESET,
				onLandmarkChange: () => {},
				activeTargetKey: "S",
				onSelectTargetKey: () => {},
				imageUrl: null,
				filterMode: "normal",
				brightness: 100,
				contrast: 100,
				showPolygon: true,
				showPlanes: true,
				showLabels: true,
				scaleMmPerPixel: 0.15,
			}),
		);

		assert.ok(html.includes('data-testid="cephalometric-canvas-container"'));
		assert.ok(html.includes('data-testid="ceph-dropzone"'));
		assert.ok(html.includes("Боковая телерентгенограмма черепа (ТРГ)"));
		assert.ok(html.includes("DICOM / JPG / PNG"));
		assert.ok(html.includes("Выбрать снимок ТРГ"));
		assert.ok(!html.includes("Векторная анатомическая модель ТРГ"));
	});

	it("renders cephalometric landmarks and planes overlay directly on top of real X-ray image without vector skull", () => {
		const testImageUrl = "https://clinic.dente.ru/radiology/ceph-lateral-042.jpg";
		const html = renderToStaticMarkup(
			createElement(CephalometricCanvas, {
				landmarks: DEFAULT_CEPH_LANDMARKS_PRESET,
				onLandmarkChange: () => {},
				activeTargetKey: "S",
				onSelectTargetKey: () => {},
				imageUrl: testImageUrl,
				filterMode: "normal",
				brightness: 100,
				contrast: 100,
				showPolygon: true,
				showPlanes: true,
				showLabels: true,
				scaleMmPerPixel: 0.15,
			}),
		);

		assert.ok(html.includes('data-testid="cephalometric-canvas-container"'));
		assert.ok(html.includes(testImageUrl));
		assert.ok(html.includes('class="landmark-handle cursor-pointer"'));
		assert.ok(html.includes('class="touch-hit-area"'));
		assert.ok(html.includes('class="polygon-layer"'));
		assert.ok(html.includes('class="planes-layer opacity-75"'));
		assert.ok(html.includes("Все 16 точек заданы. Расчет углов готов"));
		assert.ok(!html.includes('data-testid="ceph-dropzone"'));
	});

	it("synchronizes landmark HUD status between placed and pending points", () => {
		const testImageUrl = "https://clinic.dente.ru/radiology/ceph-lateral-042.jpg";
		const htmlPlaced = renderToStaticMarkup(
			createElement(CephalometricCanvas, {
				landmarks: { S: { x: 280, y: 190 } },
				onLandmarkChange: () => {},
				activeTargetKey: "S",
				onSelectTargetKey: () => {},
				imageUrl: testImageUrl,
				filterMode: "normal",
				brightness: 100,
				contrast: 100,
				showPolygon: true,
				showPlanes: true,
				showLabels: true,
				scaleMmPerPixel: 0.15,
			}),
		);
		assert.ok(htmlPlaced.includes("Точка задана:"));
		assert.ok(htmlPlaced.includes("Sella (Седло)"));

		const htmlPending = renderToStaticMarkup(
			createElement(CephalometricCanvas, {
				landmarks: { S: { x: 280, y: 190 } },
				onLandmarkChange: () => {},
				activeTargetKey: "N",
				onSelectTargetKey: () => {},
				imageUrl: testImageUrl,
				filterMode: "normal",
				brightness: 100,
				contrast: 100,
				showPolygon: true,
				showPlanes: true,
				showLabels: true,
				scaleMmPerPixel: 0.15,
			}),
		);
		assert.ok(htmlPending.includes("Установите точку:"));
		assert.ok(htmlPending.includes("Nasion (Назион)"));
	});
});
