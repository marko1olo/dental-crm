import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephalometricAnalysisModal } from "../CephalometricAnalysisModal";
import { CephalometricCanvas } from "../CephalometricCanvas";
import {
	CEPHALOMETRIC_LANDMARKS,
	DEFAULT_CEPH_LANDMARKS_PRESET,
} from "../cephalometricMath";

describe("CephalometricAnalysisModal Component (ТРГ боковая)", () => {
	it("renders nothing when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});

	it("renders full modal structure, title, patient name, and Steiner / Tweed / Downs / Ricketts badge when isOpen is true", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Иванова Мария Сергеевна",
			}),
		);

		// Modal structure & test ID
		assert.ok(
			html.includes('data-testid="cephalometric-analysis-modal"'),
			"Contains modal root testid",
		);

		// Headers & Badges
		assert.ok(
			html.includes("Цефалометрический анализ ТРГ"),
			"Contains modal title",
		);
		assert.ok(
			html.includes("Steiner / Tweed / Downs / Ricketts"),
			"Contains comprehensive analysis systems badge",
		);
		assert.ok(
			html.includes("Иванова Мария Сергеевна"),
			"Renders active patient name",
		);
		assert.ok(
			html.includes("Форма 043/у"),
			"Mentions Form 043/y compliance",
		);

		// Navigation Tabs
		assert.ok(html.includes("1. Ориентиры"), "Contains tab 1: Ориентиры");
		assert.ok(html.includes("2. Расчет углов"), "Contains tab 2: Расчет углов");
		assert.ok(html.includes("3. Форма 043/у"), "Contains tab 3: Форма 043/у");

		// Filter buttons
		assert.ok(html.includes("Стандарт"), "Contains standard filter button");
		assert.ok(html.includes("Инверсия"), "Contains invert filter button");
		assert.ok(html.includes("Костный (Bone+)"), "Contains bone enhance filter button");
		assert.ok(html.includes("Контуры"), "Contains edge detect filter button");

		// Overlays toggles
		assert.ok(html.includes("Полигон"), "Contains polygon toggle button");
		assert.ok(html.includes("Плоскости"), "Contains planes toggle button");
		assert.ok(html.includes("Подписи"), "Contains labels toggle button");

		// Action buttons
		assert.ok(
			html.includes("Загрузить снимок ТРГ"),
			"Contains upload image button",
		);
		assert.ok(
			html.includes("Эталонная разметка"),
			"Contains load preset button",
		);
		assert.ok(
			html.includes("Сбросить"),
			"Contains reset landmarks button",
		);
	});

	it("renders all 16 mandatory orthodontic landmarks in the checklist with touch targets", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		// Check all 16 landmark names in Russian
		for (const lm of CEPHALOMETRIC_LANDMARKS) {
			assert.ok(
				html.includes(lm.nameRu),
				`Checklist contains landmark name: ${lm.nameRu}`,
			);
		}
	});

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

		assert.ok(
			html.includes('data-testid="cephalometric-canvas-container"'),
			"Contains canvas container testid",
		);

		// Honest medical dropzone
		assert.ok(
			html.includes('data-testid="ceph-dropzone"'),
			"Renders honest clinical dropzone",
		);
		assert.ok(
			html.includes("Боковая телерентгенограмма черепа (ТРГ)"),
			"Displays clinical modality title in dropzone",
		);
		assert.ok(
			html.includes("DICOM / JPG / PNG"),
			"Specifies accepted clinical radiology formats",
		);
		assert.ok(
			html.includes("Выбрать снимок ТРГ"),
			"Contains primary select ceph image button",
		);
		assert.ok(
			html.includes("Загрузить клинический снимок ТРГ пациента"),
			"Contains patient clinical ceph upload button",
		);

		// ABSOLUTE ZERO FAKE VECTOR SKULL
		assert.ok(
			!html.includes("Векторная анатомическая модель ТРГ"),
			"Does NOT contain fake vector anatomical skull model",
		);
		assert.ok(
			!html.includes("cephBeamGlow"),
			"Does NOT contain fake skull procedural gradients",
		);
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

		assert.ok(
			html.includes('data-testid="cephalometric-canvas-container"'),
			"Contains canvas container testid",
		);

		// Renders real X-Ray image
		assert.ok(
			html.includes(testImageUrl),
			"Renders underlying clinical X-ray image",
		);
		assert.ok(
			html.includes('alt="Lateral Cephalogram X-Ray (ТРГ боковая)"'),
			"Includes clinical image alt attribute",
		);

		// Interactive Cephalometric SVG Overlay
		assert.ok(
			html.includes('class="landmark-handle cursor-pointer"'),
			"Renders interactive landmark handles",
		);
		assert.ok(
			html.includes('class="touch-hit-area"'),
			"Renders WCAG touch hit targets",
		);
		assert.ok(
			html.includes('class="polygon-layer"'),
			"Renders cephalometric polygon layer",
		);
		assert.ok(
			html.includes('class="planes-layer opacity-75"'),
			"Renders cephalometric planes layer (Steiner/Tweed/Downs)",
		);

		// HUD Controls: When all 16 landmarks are present in preset
		assert.ok(
			html.includes("Все 16 точек заданы. Расчет углов готов"),
			"Displays complete 16 points calculation ready status",
		);
		assert.ok(html.includes("100%"));
		assert.ok(html.includes("Линейка"));
		assert.ok(html.includes('aria-label="Приблизить масштаб"'));
		assert.ok(html.includes('aria-label="Отдалить масштаб"'));

		// Dropzone is hidden when real image is present
		assert.ok(
			!html.includes('data-testid="ceph-dropzone"'),
			"Dropzone is not shown when real image is loaded",
		);
		// Zero fake skull
		assert.ok(
			!html.includes("Векторная анатомическая модель ТРГ"),
			"No fake vector skull backdrop on real image",
		);
	});

	it("synchronizes landmark HUD status between placed and pending points", () => {
		const testImageUrl = "https://clinic.dente.ru/radiology/ceph-lateral-042.jpg";

		// 1. Point already set: should show 'Точка задана:'
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
		assert.ok(htmlPlaced.includes("Точка задана:"), "Displays 'Точка задана:' when point is already placed");
		assert.ok(htmlPlaced.includes("Sella (Седло)"), "Displays landmark name in Russian");

		// 2. Point pending: should show 'Установите точку:'
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
		assert.ok(htmlPending.includes("Установите точку:"), "Displays 'Установите точку:' when point is not placed yet");
		assert.ok(htmlPending.includes("Nasion (Назион)"), "Displays target pending landmark name");
	});

	it("renders mobile tab switcher with [Снимок / Разметка], [16 ориентиров], [Расчет углов], and [Форма 043/у]", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Смирнов Алексей Викторович",
				initialImageUrl: "https://clinic.dente.ru/radiology/ceph-sample.jpg",
			}),
		);

		assert.ok(
			html.includes('data-testid="ceph-mobile-tab-canvas"'),
			"Contains mobile tab for canvas [Снимок / Разметка]",
		);
		assert.ok(
			html.includes("Снимок / Разметка"),
			"Displays 'Снимок / Разметка' tab label",
		);
		assert.ok(
			html.includes('data-testid="ceph-mobile-tab-landmarks"'),
			"Contains mobile tab for 16 landmarks",
		);
		assert.ok(
			html.includes("16 ориентиров"),
			"Displays '16 ориентиров' tab label",
		);
		assert.ok(
			html.includes('data-testid="ceph-mobile-tab-metrics"'),
			"Contains mobile tab for angle calculations [Расчет углов]",
		);
		assert.ok(
			html.includes("Расчет углов"),
			"Displays 'Расчет углов' tab label",
		);
		assert.ok(
			html.includes('data-testid="ceph-mobile-tab-report"'),
			"Contains mobile tab for Form 043/y [Форма 043/у]",
		);
		assert.ok(
			html.includes("Форма 043/у"),
			"Displays 'Форма 043/у' tab label",
		);

		// Non-truncated filter toolbar with flex-nowrap and overflow-x-auto
		assert.ok(
			html.includes("flex-nowrap") && html.includes("overflow-x-auto"),
			"Toolbar is wrapped in flex-nowrap overflow-x-auto to prevent button truncation",
		);
		assert.ok(
			html.includes("min-w-max"),
			"Toolbar buttons have min-w-max to guarantee complete text display without clipping",
		);
	});
});
