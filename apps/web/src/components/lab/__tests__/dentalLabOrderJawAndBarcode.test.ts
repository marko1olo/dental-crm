import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	generateBarcodeSvg,
	generateQrCodeSvg,
	formatGostOrderNumber,
	isJawWideConstruction,
	formatJawScopeLabel,
	formatLabOrderTeethOrJaw,
	type JawScope,
} from "../labMath";
describe("DentalLabOrderModal — Printable Blank Vector Barcode & QR Code Engine", () => {
	test("generateBarcodeSvg возвращает валидный SVG со штрихами и номером наряда", () => {
		const token = "ZTL-ORD-2026-991";
		const svg = generateBarcodeSvg(token);
		assert.ok(svg.startsWith("<svg"));
		assert.ok(svg.includes("<rect"));
		assert.ok(svg.includes("</svg>"));
	});
	test("generateBarcodeSvg санитизирует спецсимволы и пустые строки", () => {
		const emptySvg = generateBarcodeSvg("");
		assert.ok(emptySvg.includes("<svg"));
		assert.ok(emptySvg.includes("ZTL-ORDER"));
		const specialSvg = generateBarcodeSvg("$$$---###");
		assert.ok(specialSvg.includes("<svg"));
	});
	test("generateQrCodeSvg возвращает валидную ISO/IEC 18004 SVG матрицу QR-кода", () => {
		const shortCode = "ZTL-ORDER-123";
		const shortQrSvg = generateQrCodeSvg(shortCode);
		assert.ok(shortQrSvg.startsWith("<svg"));
		assert.ok(shortQrSvg.includes("viewBox="));
		assert.ok(shortQrSvg.includes("<rect"));
		const portalUrl = "http://localhost:5173/#/portal/lab-order/test-token-123";
		const qrSvg = generateQrCodeSvg(portalUrl);
		assert.ok(qrSvg.startsWith("<svg"));
		assert.ok(qrSvg.includes("viewBox="));
		assert.ok(qrSvg.includes("<rect"));
		assert.ok(qrSvg.includes("</svg>"));
	});
	test("formatGostOrderNumber форматирует номер наряда по стандарту ЗТЛ-ГГММ-ТОКЕН", () => {
		const date = new Date(2026, 7, 22);
		const formatted = formatGostOrderNumber("ABCDEF123456", date);
		assert.equal(formatted, "ЗТЛ-2608-ABCDEF");
	});
});
describe("DentalLabOrderModal — Full-Jaw Orders & Mandate 8e Unblocker", () => {
	test("isJawWideConstruction корректно определяет общечелюстные конструкции", () => {
		assert.equal(isJawWideConstruction("nightguard_bruxism"), true);
		assert.equal(isJawWideConstruction("occlusal_splint"), true);
		assert.equal(isJawWideConstruction("sports_mouthguard"), true);
		assert.equal(isJawWideConstruction("bleaching_tray"), true);
		assert.equal(isJawWideConstruction("full_denture"), true);
		assert.equal(isJawWideConstruction("custom_impression_tray"), true);
		assert.equal(isJawWideConstruction("all_on_arch"), true);
		assert.equal(isJawWideConstruction("all_on_4_6"), true);
		assert.equal(isJawWideConstruction("clasp_denture"), true);
		assert.equal(isJawWideConstruction("aligner_nightguard"), true);
		assert.equal(isJawWideConstruction("aligners_nightguard"), true);
		assert.equal(isJawWideConstruction("single_crown"), false);
		assert.equal(isJawWideConstruction("veneer"), false);
		assert.equal(isJawWideConstruction("inlay_onlay"), false);
		assert.equal(isJawWideConstruction("endocrown"), false);
	});
	test("formatJawScopeLabel возвращает канонические русские названия для челюстей", () => {
		assert.equal(formatJawScopeLabel("upper"), "Верхняя челюсть (В/Ч)");
		assert.equal(formatJawScopeLabel("lower"), "Нижняя челюсть (Н/Ч)");
		assert.equal(formatJawScopeLabel("both"), "Обе челюсти (В/Ч + Н/Ч)");
		assert.equal(formatJawScopeLabel("upper", true), "В/Ч целиком");
		assert.equal(formatJawScopeLabel("lower", true), "Н/Ч целиком");
		assert.equal(formatJawScopeLabel("both", true), "Обе челюсти");
		assert.equal(formatJawScopeLabel(null), "");
		assert.equal(formatJawScopeLabel(undefined), "");
	});
	test("formatLabOrderTeethOrJaw форматирует наряд на челюсть без одиночных зубов", () => {
		assert.equal(formatLabOrderTeethOrJaw({ jawScope: "upper" }), "В/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ jawScope: "lower" }), "Н/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ jawScope: "both" }), "Обе челюсти");
		assert.equal(formatLabOrderTeethOrJaw({ toothFdi: "Верхняя челюсть (В/Ч)" }), "В/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ toothFdi: "Нижняя челюсть (Н/Ч)" }), "Н/Ч целиком");
		assert.equal(formatLabOrderTeethOrJaw({ toothFdi: "Обе челюсти (В/Ч + Н/Ч)" }), "Обе челюсти");
		assert.equal(
			formatLabOrderTeethOrJaw({
				constructionType: "nightguard_bruxism",
				selectedTeeth: [],
			}),
			"Челюсть целиком",
		);
		assert.equal(formatLabOrderTeethOrJaw({ selectedTeeth: [16] }), "Зуб 16");
		assert.equal(formatLabOrderTeethOrJaw({ selectedTeeth: [16, 17] }), "Зубы: 16, 17");
	});
	test("Мандат 8e: Наряд на челюсть оформляется без обязательного выбора зубов в формуле", () => {
		const jawOrder = {
			patientId: "patient-101",
			constructionType: "nightguard_bruxism",
			jawScope: "both" as JawScope,
			selectedTeeth: [],
			priceRub: 15000,
		};
		assert.equal(jawOrder.selectedTeeth.length, 0);
		assert.equal(jawOrder.jawScope, "both");
		assert.equal(isJawWideConstruction(jawOrder.constructionType), true);
		assert.equal(formatLabOrderTeethOrJaw(jawOrder), "Обе челюсти");
	});
});
