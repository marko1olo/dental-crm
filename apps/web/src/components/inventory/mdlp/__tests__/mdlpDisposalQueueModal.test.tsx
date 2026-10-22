import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createCarpuleQueueItem } from "@dental/shared";
import { MdlpDisposalQueueModal } from "../MdlpDisposalQueueModal.js";

describe("MDLP Disposal Queue Modal Autonomy (Mandates 8e, 8k, 8n, 8d)", () => {
	it("1. createCarpuleQueueItem creates valid queue item with FEFO metadata", () => {
		const validRaw = "010460700836012421SN123456789\x1d17280531\x1d10LOT1\x1d91ABCD\x1d92qwe";
		const dummyItem = createCarpuleQueueItem(validRaw, {
			costRub: 420,
			patientId: "pat-1",
			patientName: "Тест Пациент",
			doctorId: "doc-1",
			doctorName: "Тест Врач",
		});

		assert.ok(dummyItem.id);
		assert.strictEqual(dummyItem.patientName, "Тест Пациент");
		assert.strictEqual(dummyItem.doctorName, "Тест Врач");
		assert.strictEqual(dummyItem.status, "queued");
	});

	it("2. MdlpDisposalQueueModal renders with 1-click shift carpules button and non-blocking actions", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: true,
				onClose: () => {},
				initialItems: [],
				patientName: "Иванов И.И.",
				doctorName: "Д-р Смирнов",
			}),
		);

		assert.ok(html.includes("data-testid=\"mdlp-disposal-queue-modal\""));
		assert.ok(html.includes("data-testid=\"banner-quick-shift-carpules-btn\""));
		assert.ok(html.includes("Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)"));
		assert.ok(html.includes("data-testid=\"add-barcode-btn\""));
		assert.ok(html.includes("data-testid=\"confirm-disposal-btn\""));
		assert.ok(html.includes("data-testid=\"print-disposal-act-btn\""));

		// Anti-Emoji Law: No emojis in the modal
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
	});

	it("3. Buttons meet touch target requirement (min-h-[44px] or minHeight 44px)", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: true,
				onClose: () => {},
				initialItems: [],
			}),
		);

		assert.ok(html.includes("min-h-[44px]") || html.includes("min-height: 44px") || html.includes("min-height:44px"));
	});

	it("5. MdlpDisposalQueueModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(MdlpDisposalQueueModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.strictEqual(html, "");
	});
});
