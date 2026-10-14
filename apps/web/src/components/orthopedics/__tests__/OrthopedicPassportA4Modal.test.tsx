import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	OrthopedicPassportA4Modal,
	type OrthopedicPassportData,
} from "../OrthopedicPassportA4Modal";

describe("OrthopedicPassportA4Modal — Printable A4 Passport & Warranty (Mandates 8d, 8e, 8n)", () => {
	const samplePassport: OrthopedicPassportData = {
		orderNumber: "ЗТЛ-884102",
		passportNumber: "ГП-ЗТЛ-884102",
		issueDate: "14 октября 2026 г.",
		clinicName: "Стоматологическая клиника «DENTE»",
		patientName: "Иванов Иван Иванович",
		patientChartNumber: "043-882",
		doctorName: "Д-р Смирнов А.В.",
		technicianName: "Петров И.С. (ЗТЛ CAD/CAM)",
		labName: "ЗТЛ «DenteLab Precision»",
		toothFdi: "16",
		constructionName: "Коронка цельнокерамическая (ZrO2 Multi-Layer)",
		material: "Диоксид циркония Katana HTML",
		colorVita: "A2",
		stumpShade: "ND2",
		preparationMarginLabel: "Круговой уступ Chamfer (0.8 мм)",
		fixationTypeLabel: "Постоянная цементная (GC Fuji Plus / RelyX U200)",
		warrantyMonths: 60,
		warrantyLabelRu: "60 месяцев (5 лет)",
		batchLotNumber: "LOT-2026-ZR441",
	};

	it("renders when isOpen=true with full A4 sheet, credentials, and passport number", () => {
		const html = renderToString(
			<OrthopedicPassportA4Modal
				isOpen={true}
				onClose={() => {}}
				passport={samplePassport}
			/>,
		);

		assert.ok(html.includes('data-testid="orthopedic-passport-modal"'), "Must render root modal dialog");
		assert.ok(html.includes('id="orthopedic-passport-print-area"'), "Must render printable A4 print area");
		assert.ok(html.includes("ПАСПОРТ ОРТОПЕДИЧЕСКОЙ КОНСТРУКЦИИ"), "Must render document title");
		assert.ok(html.includes("ГП-ЗТЛ-884102"), "Must render passport number");
		assert.ok(html.includes("Иванов Иван Иванович"), "Must render patient name");
		assert.ok(html.includes("043-882"), "Must render medical chart number");
		assert.ok(html.includes("Д-р Смирнов А.В."), "Must render doctor name");
		assert.ok(html.includes("Петров И.С."), "Must render technician name");
	});

	it("renders technical specifications: FDI tooth, material, VITA color, margin, and fixation", () => {
		const html = renderToString(
			<OrthopedicPassportA4Modal
				isOpen={true}
				onClose={() => {}}
				passport={samplePassport}
			/>,
		);

		assert.ok(html.includes("16"), "Must render tooth 16");
		assert.ok(html.includes("Диоксид циркония Katana HTML"), "Must render material name");
		assert.ok(html.includes("A2"), "Must render VITA shade A2");
		assert.ok(html.includes("ND2"), "Must render stump shade ND2");
		assert.ok(html.includes("Chamfer"), "Must render prep margin Chamfer");
		assert.ok(html.includes("GC Fuji Plus / RelyX U200"), "Must render fixation protocol");
		assert.ok(html.includes("LOT-2026-ZR441"), "Must render material lot number");
	});

	it("renders warranty conditions, patient care recommendations, and signatures", () => {
		const html = renderToString(
			<OrthopedicPassportA4Modal
				isOpen={true}
				onClose={() => {}}
				passport={samplePassport}
			/>,
		);

		assert.ok(html.includes("60 месяцев (5 лет)"), "Must render warranty term");
		assert.ok(html.includes("Памятка пациенту по уходу"), "Must render care recommendations section");
		assert.ok(html.includes("ирригатор"), "Must recommend oral irrigator");
		assert.ok(html.includes("М.П. Клиники"), "Must have clinic stamp placeholder");
		assert.ok(html.includes("Штамп лаборатории"), "Must have lab stamp placeholder");
		assert.ok(html.includes("Подпись пациента"), "Must have patient signature placeholder");
	});

	it("renders print and copy action buttons with touch targets", () => {
		const html = renderToString(
			<OrthopedicPassportA4Modal
				isOpen={true}
				onClose={() => {}}
				passport={samplePassport}
			/>,
		);

		assert.ok(html.includes('data-testid="passport-print-btn"'), "Must render print button");
		assert.ok(html.includes('data-testid="passport-copy-btn"'), "Must render copy button");
		assert.ok(html.includes('data-testid="passport-close-btn"'), "Must render close button");
	});

	it("does not render when isOpen=false", () => {
		const html = renderToString(
			<OrthopedicPassportA4Modal
				isOpen={false}
				onClose={() => {}}
				passport={samplePassport}
			/>,
		);

		assert.equal(html, "", "Should return null when closed");
	});

	it("complies with Mandate 8d (Zero cartoon emojis in clinical document)", () => {
		const html = renderToString(
			<OrthopedicPassportA4Modal
				isOpen={true}
				onClose={() => {}}
				passport={samplePassport}
			/>,
		);

		const forbiddenEmojis = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.ok(!forbiddenEmojis.test(html), "Passport must not contain cartoon emojis");
	});
});
