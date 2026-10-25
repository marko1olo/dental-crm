import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephalometricAnalysisModal } from "../../radiology/CephalometricAnalysisModal";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";

describe("Cephalometric Analysis Modal — Structure & 16 Landmarks", () => {
	it("renders nothing when isOpen is false", () => {
		const html = renderToStaticMarkup(createElement(CephalometricAnalysisModal, { isOpen: false, onClose: () => {} }));
		assert.equal(html, "");
	});

	it("renders modal structure, title, patient name, and Steiner / Tweed / Downs / Ricketts badge", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Иванова Мария Сергеевна",
				initialImageUrl: "https://clinic.dente.ru/radiology/ceph-sample.jpg",
			}),
		);

		assert.ok(html.includes('data-testid="cephalometric-analysis-modal"'));
		assert.ok(html.includes("Цефалометрический анализ ТРГ"));
		assert.ok(html.includes("Steiner / Tweed / Downs / Ricketts"));
		assert.ok(html.includes("Иванова Мария Сергеевна"));
		assert.ok(html.includes("Медицинская карта"));

		assert.ok(html.includes("1. Ориентиры"));
		assert.ok(html.includes("2. Расчет углов"));
		assert.ok(html.includes("3. Медицинская карта"));

		assert.ok(html.includes("Стандарт"));
		assert.ok(html.includes("Инверсия"));
		assert.ok(html.includes("Костный (Bone+)"));
		assert.ok(html.includes("Контуры"));

		assert.ok(html.includes("Полигон"));
		assert.ok(html.includes("Плоскости"));
		assert.ok(html.includes("Подписи"));
	});

	it("renders all 16 mandatory orthodontic landmarks in the checklist with touch targets", () => {
		const html = renderToStaticMarkup(createElement(CephalometricAnalysisModal, { isOpen: true, onClose: () => {} }));
		for (const lm of CEPHALOMETRIC_LANDMARKS) {
			assert.ok(html.includes(lm.nameRu), `Checklist contains landmark name: ${lm.nameRu}`);
		}
	});
});
