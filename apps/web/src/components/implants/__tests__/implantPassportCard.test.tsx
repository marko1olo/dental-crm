import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { createDefaultPassportRecord } from "../implantQuickPresets";
import { ImplantPassportCard } from "../ImplantPassportCard";

describe("Implant Passport Card Component (Mandates 8e, 8x)", () => {
	it("3. ImplantPassportCard renders complete clinical passport view", () => {
		const data = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
			patientName: "Сидоров А. В.",
		});
		const html = renderToString(<ImplantPassportCard data={data} />);
		assert.ok(html.includes("Паспорт имплантата DENTE"));
		assert.ok(html.includes("46"));
		assert.ok(html.includes("Osstem"));
		assert.ok(html.includes("35 Н·см") || html.includes("35 Н/см"));
		assert.ok(html.includes("Сидоров А. В."));
		assert.ok(html.includes("btn-copy-passport-card"));
	});

	it("8. ImplantPassportCard renders capType and zero emojis", () => {
		const record = {
			...createDefaultPassportRecord({
				toothFdi: 46,
				brand: "Straumann",
				patientName: "Сидоров А. В.",
				capType: "plug",
				isqDay0: 74,
			}),
			isWarehouseOverdraft: true,
		};
		const html = renderToString(<ImplantPassportCard data={record} />);
		assert.ok(html.includes("Винт-заглушка (2 этапа)"));
		assert.ok(html.includes("min-h-[48px]"));
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Must not contain emojis");
		assert.ok(html.includes("lucide-triangle-alert") || html.includes("lucide-alert-triangle"));
		assert.ok(html.includes("мягкий овердрафт склада"));
	});

	it("11. ImplantPassportCard renders QR-code verification and min-w-0 truncation", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 21,
			brand: "Nobel Biocare",
			patientName: "Константинопольский-Длиннофамильный Александр Владимирович",
			doctorId: "DOC-SURG-77",
		});
		const html = renderToString(<ImplantPassportCard data={record} />);
		assert.ok(html.includes("passport-qr-verification"));
		assert.ok(html.includes("QR VERIFIED"));
		assert.ok(html.includes("truncate"));
		assert.ok(html.includes("min-w-0"));
	});

	it("18. ImplantPassportCard renders printable patient warranty certificate with barcode", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 36,
			brand: "Ankylos",
			patientName: "Кузнецов П. В.",
			patientId: "PAT-0099",
			doctorName: "Др. Васильев",
			catalogArticle: "A-B110-CX",
		});
		const html = renderToString(<ImplantPassportCard data={record} />);
		assert.ok(html.includes("passport-barcode-svg"));
		assert.ok(html.includes("Место для наклейки со стерильной упаковки"));
		assert.ok(html.includes("Гарантийные обязательства клиники"));
		assert.ok(html.includes("Подпись хирурга-имплантолога"));
		assert.ok(html.includes("Подпись пациента"));
		assert.ok(html.includes("М.П."));
		assert.ok(html.includes("36 — Первый моляр нижней челюсти слева"));
	});

	it("24. ImplantPassportCard renders messenger sharing buttons for WhatsApp and Telegram", () => {
		const record = createDefaultPassportRecord({ toothFdi: 46, brand: "Osstem", patientName: "Алексеев Д. М." });
		const html = renderToString(<ImplantPassportCard data={record} />);
		assert.ok(html.includes("btn-share-whatsapp"));
		assert.ok(html.includes("btn-share-telegram"));
		assert.ok(html.includes("anatomical-jaw-arch"));
	});

	it("35. ImplantPassportCardHeader hides action buttons on print", () => {
		const record = createDefaultPassportRecord({ toothFdi: 46, brand: "Dentium", patientName: "Смирнов В. А." });
		const html = renderToString(<ImplantPassportCard data={record} />);
		assert.ok(html.includes("print:hidden"));
		assert.ok(html.includes("btn-share-whatsapp"));
		assert.ok(html.includes("btn-share-telegram"));
	});

	it("37. Implant passport renders osteointegration date and zero Soviet order codes", () => {
		const record = createDefaultPassportRecord({ toothFdi: 46, brand: "Straumann", patientName: "Васильев В. В." });
		const html = renderToString(<ImplantPassportCard data={record} />);
		assert.ok(html.includes("passport-osteointegration-notice"));
		assert.ok(html.includes("Контроль остеоинтеграции"));
		assert.ok(html.includes("passport-osteo-date"));
		assert.ok(!html.includes("043/у"));
		assert.ok(!html.includes("804н"));
		assert.ok(!html.includes("54-ФЗ"));
		assert.ok(!html.includes("disabled"));
	});
});
