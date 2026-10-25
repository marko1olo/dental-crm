import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CephalometricAnalysisModal } from "../../radiology/CephalometricAnalysisModal";

describe("Cephalometric Modal Mobile Navigation & Toolbar", () => {
	it("renders mobile tab switcher with [Снимок / Разметка], [16 ориентиров], [Расчет углов], and [Медицинская карта]", () => {
		const html = renderToStaticMarkup(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-123",
				patientName: "Смирнов Алексей Викторович",
				initialImageUrl: "https://clinic.dente.ru/radiology/ceph-sample.jpg",
			}),
		);

		assert.ok(html.includes('data-testid="ceph-mobile-tab-canvas"'));
		assert.ok(html.includes("Снимок / Разметка"));
		assert.ok(html.includes('data-testid="ceph-mobile-tab-landmarks"'));
		assert.ok(html.includes("16 ориентиров"));
		assert.ok(html.includes('data-testid="ceph-mobile-tab-metrics"'));
		assert.ok(html.includes("Расчет углов"));
		assert.ok(html.includes('data-testid="ceph-mobile-tab-report"'));
		assert.ok(html.includes("Медицинская карта"));

		assert.ok(html.includes("flex-nowrap") && html.includes("overflow-x-auto"));
		assert.ok(html.includes("min-w-max"));
	});
});
