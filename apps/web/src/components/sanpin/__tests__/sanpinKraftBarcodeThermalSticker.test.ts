import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculatePackageExpiration,
	evaluateKraftPackageStatus,
	generateDataMatrixSvg,
	generateCode128Svg,
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
	generateKraftBatchRecords,
	generateThermalStickerHtml,
	generateA4BatchSheetHtml,
} from "../kraft/kraftPackageEngine.js";
import {
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	DENTAL_TOOL_SETS_CATALOG,
} from "../kraft/kraftPackagePresets.js";

describe("SanPiN 3.3686-21 — Kraft Package Barcodes & Thermal Labels", () => {
	describe("1. Sterility Shelf Life Math & Material Expiration Limits", () => {
		const baseDate = new Date("2026-08-20T10:00:00.000Z");

		it("calculates statutory 50 days shelf life for single self-adhesive kraft pouches", () => {
			const res = calculatePackageExpiration(baseDate, "paper_self_seal_single", baseDate);
			assert.equal(res.daysLifespan, 50);
			assert.equal(res.status, "sterile_valid");
			assert.equal(res.isExpired, false);
			assert.equal(res.isExpiringSoon, false);
			assert.equal(res.daysRemaining, 50);
		});

		it("calculates statutory 60 days shelf life for double kraft pouches", () => {
			const res = calculatePackageExpiration(baseDate, "paper_self_seal_double", baseDate);
			assert.equal(res.daysLifespan, 60);
			assert.equal(res.status, "sterile_valid");
			assert.equal(res.daysRemaining, 60);
		});

		it("calculates statutory 180 days (6 months) for combined paper-plastic laminated pouches", () => {
			const res = calculatePackageExpiration(baseDate, "paper_plastic_pouch", baseDate);
			assert.equal(res.daysLifespan, 180);
			assert.equal(res.daysRemaining, 180);
		});

		it("calculates statutory 20 days shelf life for bix with antibacterial filter", () => {
			const res = calculatePackageExpiration(baseDate, "bix_with_filter", baseDate);
			assert.equal(res.daysLifespan, 20);
			assert.equal(res.daysRemaining, 20);
		});

		it("correctly identifies expiring soon status (within 7 days of expiry)", () => {
			// Pack date: 2026-08-01, bix with filter (20 days) -> expires 2026-08-21
			// Ref date: 2026-08-16 (5 days remaining -> <= 7 days)
			const packDate = new Date("2026-08-01T10:00:00.000Z");
			const checkDate = new Date("2026-08-16T10:00:00.000Z");
			const res = calculatePackageExpiration(packDate, "bix_with_filter", checkDate);
			assert.equal(res.status, "expiring_soon_7d");
			assert.equal(res.isExpiringSoon, true);
			assert.equal(res.isExpired, false);
			assert.equal(res.daysRemaining, 5);
		});

		it("correctly flags expired packages past their statutory shelf life", () => {
			// Pack date: 2026-06-01, single kraft (50 days) -> expired 2026-07-21
			// Ref date: 2026-08-25 -> expired
			const packDate = new Date("2026-06-01T10:00:00.000Z");
			const checkDate = new Date("2026-08-25T10:00:00.000Z");
			const res = calculatePackageExpiration(packDate, "paper_self_seal_single", checkDate);
			assert.equal(res.status, "expired");
			assert.equal(res.isExpired, true);
			assert.ok(res.daysRemaining < 0);
		});

		it("recalls package immediately if envelope seal is breached", () => {
			const status = evaluateKraftPackageStatus("2026-09-30", true);
			assert.equal(status, "recalled");
		});
	});

	describe("2. Pure TypeScript Vector Barcode Generators (DataMatrix & Code128)", () => {
		it("generates valid standalone vector SVG for 2D DataMatrix", () => {
			const payload = "BATCH-20260822-01|MELAG-43B|CYC-004|2026-08-22|2026-10-11|OPER-01";
			const svg = generateDataMatrixSvg(payload, { size: 120, color: "#000000", bgColor: "#ffffff" });

			assert.ok(svg.startsWith("<svg"), "Must start with <svg tag");
			assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
			assert.ok(svg.includes("<rect"), "Must contain vector rect pixels");
			assert.ok(svg.includes("</svg>"), "Must end with </svg>");
		});

		it("generates valid standalone vector SVG for 1D Code128", () => {
			const code = "DNT-STER-004-SURG-01";
			const svg = generateCode128Svg(code, { height: 40, showText: true, barColor: "#000000" });

			assert.ok(svg.startsWith("<svg"), "Must start with <svg tag");
			assert.ok(svg.includes("<rect"), "Must contain bar rect elements");
			assert.ok(svg.includes("<text"), "Must contain human readable text");
			assert.ok(svg.includes(code), "Must include the barcode text");
		});

		it("formats structured SanPiN DataMatrix payload and Code128 strings", () => {
			const payloadString = formatKraftDataMatrixPayload({
				batchId: "BATCH-20260822-99",
				autoclaveId: "MELAG_43B",
				cycleNumber: 5,
				packDate: "2026-08-22",
				expDate: "2026-10-11",
				toolSetId: "SURG-EXT",
				operatorId: "NURSE_01",
				serialNumber: 3,
			});

			assert.ok(payloadString.includes("BATCH-20260822-99#3"));
			assert.ok(payloadString.includes("MELAG_43B"));
			assert.ok(payloadString.includes("CYC5"));
			assert.ok(payloadString.includes("2026-08-22"));
			assert.ok(payloadString.includes("2026-10-11"));

			const barcode1d = generate1DBarcodeString("BATCH-20260822-99", 3);
			assert.ok(barcode1d.startsWith("KB"));
			assert.ok(barcode1d.endsWith("0003"));
		});
	});

	describe("3. Batch Kraft Package Generation & Thermal Printing Templates", () => {
		it("generates a sequential batch of kraft package records with unique IDs and barcodes", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "MELAG-43B-01",
				cycleNumber: 12,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 5,
				operatorName: "Иванова А.А.",
				indicatorVerified: true,
			});

			assert.equal(batch.length, 5);
			for (let i = 0; i < batch.length; i++) {
				const pkg = batch[i]!;
				assert.equal(pkg.serialNumber, i + 1);
				assert.equal(pkg.autoclaveId, "MELAG-43B-01");
				assert.equal(pkg.cycleNumber, 12);
				assert.equal(pkg.packageType, "paper_self_seal_single");
				assert.equal(pkg.daysLifespan, 50);
				assert.ok(pkg.barcode128.length > 0);
				assert.ok(pkg.barcodeDataMatrixPayload.length > 0);
				assert.equal(pkg.status, "sterile_valid");
			}
		});

		it("generates thermal sticker HTML formatted for 58x40 mm label printer", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "MELAG-43B-01",
				cycleNumber: 3,
				packageType: "paper_self_seal_double",
				packageSize: "size_150x250",
				toolSetId: "set_surgical_extraction",
				quantity: 1,
				operatorName: "Смирнова Е.В.",
			});

			const html = generateThermalStickerHtml(batch[0]!, {
				size: "58x40",
				clinicName: "ООО ДЕНТЕ",
			});

			assert.ok(html.includes("58mm"));
			assert.ok(html.includes("40mm"));
			assert.ok(html.includes("ООО ДЕНТЕ"));
			assert.ok(html.includes("СТЕРИЛЬНО"));
			assert.ok(html.includes("Годен до:"));
			assert.ok(html.includes("Хирургический набор для удаления"));
			assert.ok(html.includes("<svg")); // Embedded vector DataMatrix
		});

		it("generates thermal sticker HTML formatted for 43x25 mm compact label printer", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "EURONDA-E9-01",
				cycleNumber: 7,
				packageType: "paper_plastic_pouch",
				packageSize: "size_75x150",
				toolSetId: "set_endodontic_burs",
				quantity: 1,
				operatorName: "Петрова С.И.",
			});

			const html = generateThermalStickerHtml(batch[0]!, {
				size: "43x25",
				clinicName: "DENTE",
			});

			assert.ok(html.includes("43mm"));
			assert.ok(html.includes("25mm"));
			assert.ok(html.includes("Годен:"));
			assert.ok(html.includes("Эндодонтический набор"));
		});

		it("generates A4 batch sheet HTML with multiple stickers formatted for standard laser printing", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "MELAG-43B-01",
				cycleNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 8,
				operatorName: "Иванова А.А.",
			});

			const a4Html = generateA4BatchSheetHtml(batch, {
				clinicName: "ООО ДЕНТЕ КЛИНИК",
			});

			assert.ok(a4Html.includes("A4"));
			assert.ok(a4Html.includes("ООО ДЕНТЕ КЛИНИК"));
			assert.ok(a4Html.includes("РЕЕСТР ЭТИКЕТОК СТЕРИЛИЗАЦИИ КРАФТ-ПАКЕТОВ"));
		});
	});
});
