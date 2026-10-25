import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import { CephalometricAnalysisModal } from "../../radiology/CephalometricAnalysisModal";

describe("Orthodontic TRG 1-Click Clinical Presets UI (Mandates 8e, 8k)", () => {
	it("renders 1-click clinical presets in both upper panel and Tab 1 toolbar", () => {
		const html = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-901",
				patientName: "Смирнова Екатерина Андреевна",
			}),
		);

		assert.ok(html.includes('data-testid="header-ceph-presets-bar"'));
		assert.ok(html.includes('data-testid="header-preset-class-1"'));
		assert.ok(html.includes('data-testid="header-preset-class-2"'));
		assert.ok(html.includes('data-testid="header-preset-class-3"'));
		assert.ok(html.includes('data-testid="header-preset-clear"'));

		assert.ok(html.includes('data-testid="tab1-ceph-presets-toolbar"'));
		assert.ok(html.includes('data-testid="tab1-preset-class-1"'));
		assert.ok(html.includes('data-testid="tab1-preset-class-2"'));
		assert.ok(html.includes('data-testid="tab1-preset-class-3"'));
		assert.ok(html.includes('data-testid="tab1-preset-clear"'));

		assert.ok(html.includes("★ I Класс (Норма)"));
		assert.ok(html.includes("II Класс (Дистальный)"));
		assert.ok(html.includes("III Класс (Мезиальный)"));
		assert.ok(html.includes("Очистить разметку"));
	});

	it("renders Tab 2 Lab Protocol Presets with testids", () => {
		const htmlTab2 = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				initialImageUrl: "/radiology/sample_trg_cephalogram.jpg",
				initialTab: "metrics",
			}),
		);
		assert.ok(htmlTab2.includes('data-testid="btn-ceph-preset-class-1"'));
		assert.ok(htmlTab2.includes('data-testid="btn-ceph-preset-class-2"'));
		assert.ok(htmlTab2.includes('data-testid="btn-ceph-preset-class-3"'));
		assert.ok(htmlTab2.includes('data-testid="btn-ceph-preset-clear"'));
	});

	it("renders 1-click 'В медицинскую карту' button without blocking dialogs", () => {
		const html = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-555",
				patientName: "Мельников Артем Дмитриевич",
				initialImageUrl: "/radiology/sample_trg_cephalogram.jpg",
				onInsertToProtocol: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="btn-insert-ceph-protocol"'));
		assert.ok(html.includes("В медицинскую карту"));
	});
});
