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

	it("renders CephalometricCanvas with vector lateral cephalogram, touch hit areas and SVG overlays", () => {
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

		// SVG anatomical model
		assert.ok(
			html.includes("Векторная анатомическая модель ТРГ"),
			"Renders anatomical lateral ceph vector model",
		);

		// Sella, Nasion, Incisors, Orbitale, Porion handles in SVG
		assert.ok(html.includes('class="landmark-handle cursor-pointer"'));
		assert.ok(html.includes('class="touch-hit-area"'));
		assert.ok(html.includes('class="polygon-layer"'));
		assert.ok(html.includes('class="planes-layer opacity-75"'));

		// Toolbars with >= 44x44px controls
		assert.ok(html.includes("Установите точку:"));
		assert.ok(html.includes("Sella (Седло)"));
		assert.ok(html.includes("100%"));
		assert.ok(html.includes('aria-label="Приблизить масштаб"'));
		assert.ok(html.includes('aria-label="Отдалить масштаб"'));
	});
});
