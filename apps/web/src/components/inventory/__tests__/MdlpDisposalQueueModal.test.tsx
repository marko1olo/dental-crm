import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	MdlpDisposalQueueModal,
	SeniorNurseDisposalActModal,
} from "../index.js";

describe("MDLP / Chestny Znak Frontend Modals (SSR & Static Markup Tests)", () => {
	it("MdlpDisposalQueueModal renders static markup with scanner inputs and action buttons", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнов Алексей",
				doctorName: "Д-р Кузнецов",
			}),
		);

		assert.ok(html.includes("data-testid=\"mdlp-disposal-queue-modal\""));
		assert.ok(html.includes("Списание анестетиков и медикаментов в Честный ЗНАК"));
		assert.ok(html.includes("МДЛП Схема 10560"));
		assert.ok(html.includes("Сканирование 2D DataMatrix"));
		assert.ok(html.includes("Очередь карпул на списание"));
		assert.ok(html.includes("Списать по Схеме 10560 МДЛП"));
		assert.ok(html.includes("Печать акта списания"));
		assert.ok(html.includes("data-testid=\"banner-quick-shift-carpules-btn\""));
		assert.ok(html.includes("⚡ Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)"));
	});

	it("MdlpDisposalQueueModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html, "");
	});

	it("SeniorNurseDisposalActModal renders static markup with act preview, SanPiN 3.3686-21 banner and 1-click supplier order", () => {
		const html = renderToStaticMarkup(
			createElement(SeniorNurseDisposalActModal, {
				isOpen: true,
				onClose: () => {},
				items: [],
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				initialSeniorNurseName: "Иванова Е.В.",
			}),
		);

		assert.ok(html.includes("data-testid=\"senior-nurse-disposal-act-modal\""));
		assert.ok(html.includes("Акт списания медикаментов и анестетиков (Старшая медсестра)"));
		assert.ok(html.includes("СанПиН 3.3686-21"));
		assert.ok(html.includes("Заказ поставщику (1 клик)"));
		assert.ok(html.includes("Старшая медицинская сестра"));
		assert.ok(html.includes("Иванова Е.В."));
		assert.ok(html.includes("Печать акта списания"));
		assert.ok(html.includes("data-testid=\"approve-solo-nurse-act-btn\""));
		assert.ok(html.includes("⚡ Утвердить акт единолично (1 клик)"));
	});
});
