import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	calculateKraftBatchStatistics,
	calculatePackageExpiration,
	encodeStringToCp866,
	evaluateKraftPackageStatus,
	exportKraftBatchToCsv,
	filterKraftPackages,
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
	generateA4BatchSheetHtml,
	generateCode128Svg,
	generateDataMatrixSvg,
	generateEscPosSanpinLabelBinary,
	generateKraftBatchRecords,
	generateThermalStickerHtml,
	generateTsplLabelCode,
	generateZplLabelCode,
	type KraftPackageRecord,
} from "../components/sanpin/kraft/kraftPackageEngine.js";
import {
	CLINIC_AUTOCLAVE_UNITS,
	DENTAL_TOOL_SETS_CATALOG,
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	SANPIN_CHEMICAL_INDICATORS,
	getChemicalIndicatorDefinition,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "../components/sanpin/kraft/kraftPackagePresets.js";

describe("SanPiN 3.3686-21 Statutory Kraft Package Barcode & Expiry Studio Suite", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. STATUTORY PRESETS & REGULATORY NORMS INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory Presets & Materials Classification (SanPiN 3.3686-21 Table 3.14)", () => {
		it("verifies all statutory packaging materials and exact shelf-life days", () => {
			assert.equal(KRAFT_PACKAGE_MATERIALS.length, 5);

			// 1. Одинарный самоклеящийся крафт-пакет: 50 суток
			const singlePaper = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "paper_self_seal_single");
			assert.ok(singlePaper);
			assert.equal(singlePaper?.statutoryShelfLifeDays, 50);
			assert.ok(singlePaper?.sanpinClauseRu.includes("3632"));
			assert.equal(singlePaper?.isHeatSealed, false);
			assert.equal(singlePaper?.isTransparentFilm, false);

			// 2. Двойной крафт-пакет: 60 суток
			const doublePaper = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "paper_self_seal_double");
			assert.ok(doublePaper);
			assert.equal(doublePaper?.statutoryShelfLifeDays, 60);
			assert.ok(doublePaper?.sanpinClauseRu.includes("3634"));

			// 3. Комбинированный пакет бумага + пленка термосварочный: 180 суток (6 мес)
			const comboPouch = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "paper_plastic_pouch");
			assert.ok(comboPouch);
			assert.equal(comboPouch?.statutoryShelfLifeDays, 180);
			assert.equal(comboPouch?.isHeatSealed, true);
			assert.equal(comboPouch?.isTransparentFilm, true);

			// 4. Крепированная бумага 2 слоя: 60 суток
			const crepe = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "crepe_paper_wrap");
			assert.ok(crepe);
			assert.equal(crepe?.statutoryShelfLifeDays, 60);

			// 5. Бикс КСПФ с фильтром: 20 суток
			const bix = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === "bix_with_filter");
			assert.ok(bix);
			assert.equal(bix?.statutoryShelfLifeDays, 20);
		});

		it("verifies standard package size dimensions and usage", () => {
			assert.equal(KRAFT_PACKAGE_SIZES.length, 4);

			const size100x200 = KRAFT_PACKAGE_SIZES.find((s) => s.id === "size_100x200");
			assert.ok(size100x200);
			assert.equal(size100x200?.widthMm, 100);
			assert.equal(size100x200?.heightMm, 200);
			assert.equal(size100x200?.dimensionsMmRu, "100 × 200 мм");

			const size75x150 = KRAFT_PACKAGE_SIZES.find((s) => s.id === "size_75x150");
			assert.ok(size75x150);
			assert.equal(size75x150?.widthMm, 75);
			assert.equal(size75x150?.heightMm, 150);

			const size150x250 = KRAFT_PACKAGE_SIZES.find((s) => s.id === "size_150x250");
			assert.ok(size150x250);
			assert.equal(size150x250?.widthMm, 150);
			assert.equal(size150x250?.heightMm, 250);

			const size200x300 = KRAFT_PACKAGE_SIZES.find((s) => s.id === "size_200x300");
			assert.ok(size200x300);
			assert.equal(size200x300?.widthMm, 200);
			assert.equal(size200x300?.heightMm, 300);
		});

		it("verifies chemical indicators catalog (Class 4 and Class 5 integrators)", () => {
			assert.equal(SANPIN_CHEMICAL_INDICATORS.length, 4);

			const vinar4 = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === "vinar_steritest_4");
			assert.ok(vinar4);
			assert.equal(vinar4?.indicatorClass, "class_4_multivariable");
			assert.equal(vinar4?.originalColorHex, "#fb7185"); // Розовый
			assert.equal(vinar4?.finalColorHex, "#3b1a0e"); // Темно-коричневый
			assert.ok(vinar4?.sanpinNormRefRu.includes("Класс 4"));

			const vinar5 = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === "vinar_intetest_5");
			assert.ok(vinar5);
			assert.equal(vinar5?.indicatorClass, "class_5_integrator");
			assert.ok(vinar5?.standardTargetParamRu.includes("Интегратор"));

			const medtest4 = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === "medtest_medis_4");
			assert.ok(medtest4);
			assert.equal(medtest4?.originalColorHex, "#facc15"); // Желтый

			const medtest5 = SANPIN_CHEMICAL_INDICATORS.find((i) => i.id === "medtest_is5_integrator");
			assert.ok(medtest5);
			assert.equal(medtest5?.indicatorClass, "class_5_integrator");
		});

		it("verifies standard dental tool sets catalog", () => {
			assert.equal(DENTAL_TOOL_SETS_CATALOG.length, 5);

			const tray = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === "set_therapeutic_tray");
			assert.ok(tray);
			assert.equal(tray?.shortCode, "TER-TRAY");
			assert.ok(tray?.typicalItemsRu.some((item) => item.includes("Зеркало")));
			assert.ok(tray?.typicalItemsRu.some((item) => item.includes("Пинцет")));

			const endo = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === "set_endodontic_burs");
			assert.ok(endo);
			assert.equal(endo?.shortCode, "ENDO-SET");
			assert.ok(endo?.typicalItemsRu.some((item) => item.includes("К-файлы")));

			const surg = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === "set_surgical_extraction");
			assert.ok(surg);
			assert.equal(surg?.shortCode, "SURG-EXT");
			assert.ok(surg?.typicalItemsRu.some((item) => item.includes("Щипцы")));

			const perio = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === "set_periodontal_gracey");
			assert.ok(perio);
			assert.equal(perio?.shortCode, "PERIO-GRC");
			assert.ok(perio?.typicalItemsRu.some((item) => item.includes("Грейси")));

			const ortho = DENTAL_TOOL_SETS_CATALOG.find((s) => s.id === "set_orthopedic_prep");
			assert.ok(ortho);
			assert.equal(ortho?.shortCode, "ORTH-PREP");
		});

		it("verifies autoclave unit presets", () => {
			assert.ok(CLINIC_AUTOCLAVE_UNITS.length >= 3);
			assert.equal(CLINIC_AUTOCLAVE_UNITS[0]?.id, "AUTO-01");
			assert.ok(CLINIC_AUTOCLAVE_UNITS[0]?.brandModelRu.includes("Melag"));
		});

		it("tests safe fallback lookup functions", () => {
			const mat = getKraftMaterialDefinition("paper_self_seal_single");
			assert.equal(mat.id, "paper_self_seal_single");

			const sz = getKraftSizeDefinition("size_100x200");
			assert.equal(sz.id, "size_100x200");

			const ind = getChemicalIndicatorDefinition("vinar_steritest_4");
			assert.equal(ind.id, "vinar_steritest_4");

			const set = getDentalToolSetDefinition("set_therapeutic_tray");
			assert.equal(set.id, "set_therapeutic_tray");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. EXPIRATION DATE MATH & STATUS EVALUATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Expiration Date Math & Status Evaluation Engine", () => {
		it("calculates exact expiration dates for all statutory material lifespans", () => {
			const packDate = "2026-08-01T00:00:00.000Z";

			// 1. Одинарный крафт: 50 суток -> 2026-09-20
			const resSingle = calculatePackageExpiration(packDate, "paper_self_seal_single", "2026-08-01T00:00:00.000Z");
			assert.equal(resSingle.daysLifespan, 50);
			assert.equal(resSingle.packDateFormatted, "2026-08-01");
			assert.equal(resSingle.expDateFormatted, "2026-09-20");
			assert.equal(resSingle.daysRemaining, 50);
			assert.equal(resSingle.status, "sterile_valid");

			// 2. Двойной крафт: 60 суток -> 2026-09-30
			const resDouble = calculatePackageExpiration(packDate, "paper_self_seal_double", "2026-08-01T00:00:00.000Z");
			assert.equal(resDouble.daysLifespan, 60);
			assert.equal(resDouble.expDateFormatted, "2026-09-30");
			assert.equal(resDouble.daysRemaining, 60);

			// 3. Комбинированный пакет (180 суток): -> 2027-01-28
			const resCombo = calculatePackageExpiration(packDate, "paper_plastic_pouch", "2026-08-01T00:00:00.000Z");
			assert.equal(resCombo.daysLifespan, 180);
			assert.equal(resCombo.expDateFormatted, "2027-01-28");
			assert.equal(resCombo.daysRemaining, 180);

			// 4. Креп-бумага (60 суток): -> 2026-09-30
			const resCrepe = calculatePackageExpiration(packDate, "crepe_paper_wrap", "2026-08-01T00:00:00.000Z");
			assert.equal(resCrepe.daysLifespan, 60);
			assert.equal(resCrepe.expDateFormatted, "2026-09-30");

			// 5. Бикс КСПФ с фильтром (20 суток): -> 2026-08-21
			const resBix = calculatePackageExpiration(packDate, "bix_with_filter", "2026-08-01T00:00:00.000Z");
			assert.equal(resBix.daysLifespan, 20);
			assert.equal(resBix.expDateFormatted, "2026-08-21");
		});

		it("evaluates package status transitions (sterile_valid, expiring_soon_7d, expired, recalled)", () => {
			const expDate = "2026-08-22T00:00:00.000Z";

			// 1. > 7 дней до истечения -> sterile_valid
			const statusValid = evaluateKraftPackageStatus(expDate, false, "2026-08-10T00:00:00.000Z");
			assert.equal(statusValid, "sterile_valid");

			// 2. 5 дней до истечения -> expiring_soon_7d
			const statusExpiring = evaluateKraftPackageStatus(expDate, false, "2026-08-17T00:00:00.000Z");
			assert.equal(statusExpiring, "expiring_soon_7d");

			// 3. 0 дней (день истечения) -> expired
			const statusToday = evaluateKraftPackageStatus(expDate, false, "2026-08-22T00:00:00.000Z");
			assert.equal(statusToday, "expired");

			// 4. Просрочено на 3 дня -> expired
			const statusPast = evaluateKraftPackageStatus(expDate, false, "2026-08-25T00:00:00.000Z");
			assert.equal(statusPast, "expired");

			// 5. Нарушена герметичность -> recalled
			const statusBreached = evaluateKraftPackageStatus(expDate, true, "2026-08-10T00:00:00.000Z");
			assert.equal(statusBreached, "recalled");
		});

		it("generates clear human readable remaining messages", () => {
			const packDate = "2026-08-01";

			// Стерильно 30 дней
			const res1 = calculatePackageExpiration(packDate, "paper_self_seal_single", "2026-08-21");
			assert.ok(res1.humanReadableRemainingRu.includes("Осталось 30 дн."));

			// Просрочено
			const resOverdue = calculatePackageExpiration(packDate, "bix_with_filter", "2026-08-25");
			assert.ok(resOverdue.humanReadableRemainingRu.includes("Просрочено на 4 дн."));
			assert.ok(resOverdue.humanReadableRemainingRu.includes("повторная ПСО"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. BARCODE PAYLOAD & VECTOR SVG GENERATORS
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Barcode Payload & Vector SVG Generators (Code128 & DataMatrix 2D)", () => {
		it("formats structured SanPiN DataMatrix payload according to standard", () => {
			const payload = formatKraftDataMatrixPayload({
				batchId: "KB-20260822-01",
				autoclaveId: "AUTO-01",
				cycleNumber: 4,
				packDate: "2026-08-22",
				expDate: "2026-10-11",
				operatorId: "NURSE-01",
				toolSetId: "TER-TRAY",
				serialNumber: 3,
			});

			assert.equal(
				payload,
				"KB-20260822-01#3|AUTO-01|CYC4|2026-08-22|2026-10-11|NURSE-01|TER-TRAY",
			);
		});

		it("generates 1D barcode text format", () => {
			const barcode = generate1DBarcodeString("KB-20260822-01", 12);
			assert.equal(barcode, "KB0822010012");
		});

		it("generates valid Code128 vector SVG with checksum", () => {
			const svg = generateCode128Svg("KB2608220001", { height: 40, showText: true });
			assert.ok(svg.startsWith("<svg"));
			assert.ok(svg.includes("xmlns=\"http://www.w3.org/2000/svg\""));
			assert.ok(svg.includes("<rect"));
			assert.ok(svg.includes("KB2608220001"));
			assert.ok(svg.endsWith("</svg>"));
		});

		it("generates valid 2D DataMatrix vector SVG with L-finder pattern", () => {
			const payload = "KB-20260822-01#1|AUTO-01|CYC4|2026-08-22|2026-10-11|NURSE-01|TER-TRAY";
			const svg = generateDataMatrixSvg(payload, { size: 100 });

			assert.ok(svg.startsWith("<svg"));
			assert.ok(svg.includes("viewBox=\"0 0 100 100\""));
			assert.ok(svg.includes("<rect"));
			assert.ok(svg.endsWith("</svg>"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. BATCH GENERATION, FILTERING & STATISTICS
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Batch Generation & Registry Operations", () => {
		it("generates a complete batch of kraft package records with unique IDs and sequential serials", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "AUTO-01",
				cycleNumber: 3,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 5,
				operatorName: "Смирнова А.В.",
				indicatorId: "vinar_steritest_4",
			});

			assert.equal(batch.length, 5);

			// Check first and last serial numbers
			assert.equal(batch[0]?.serialNumber, 1);
			assert.equal(batch[4]?.serialNumber, 5);

			// Check common properties
			for (const p of batch) {
				assert.equal(p.autoclaveId, "AUTO-01");
				assert.equal(p.cycleNumber, 3);
				assert.equal(p.packageType, "paper_self_seal_single");
				assert.equal(p.daysLifespan, 50);
				assert.equal(p.status, "sterile_valid");
				assert.equal(p.operatorName, "Смирнова А.В.");
				assert.ok(p.barcode128.startsWith("KB"));
				assert.ok(p.barcodeDataMatrixPayload.includes("TER-TRAY"));
			}
		});

		it("filters kraft packages by status, autoclave, and query", () => {
			const sampleRecords: KraftPackageRecord[] = [
				{
					id: "kp-1",
					batchId: "KB-01",
					serialNumber: 1,
					packageType: "paper_self_seal_single",
					packageSize: "size_100x200",
					toolSetId: "set_therapeutic_tray",
					toolSetNameRu: "Терапевтический лоток",
					itemsListRu: ["Зеркало", "Зонд"],
					packDate: "2026-08-22",
					expDate: "2026-10-11",
					daysLifespan: 50,
					daysRemaining: 50,
					status: "sterile_valid",
					autoclaveId: "AUTO-01",
					cycleNumber: 1,
					operatorId: "NURSE-01",
					operatorName: "Смирнова А.В.",
					indicatorId: "vinar_steritest_4",
					indicatorVerified: true,
					barcode128: "KB010001",
					barcodeDataMatrixPayload: "...",
					isBreached: false,
					notes: "",
					createdAt: "2026-08-22T00:00:00Z",
				},
				{
					id: "kp-2",
					batchId: "KB-02",
					serialNumber: 1,
					packageType: "paper_plastic_pouch",
					packageSize: "size_150x250",
					toolSetId: "set_surgical_extraction",
					toolSetNameRu: "Хирургический набор",
					itemsListRu: ["Щипцы", "Элеватор"],
					packDate: "2026-08-01",
					expDate: "2026-08-21",
					daysLifespan: 20,
					daysRemaining: -1,
					status: "expired",
					autoclaveId: "AUTO-02",
					cycleNumber: 2,
					operatorId: "NURSE-02",
					operatorName: "Петрова Е.И.",
					indicatorId: "vinar_intetest_5",
					indicatorVerified: true,
					barcode128: "KB020001",
					barcodeDataMatrixPayload: "...",
					isBreached: false,
					notes: "",
					createdAt: "2026-08-01T00:00:00Z",
				},
			];

			// 1. Filter by status: sterile_valid
			const filtered1 = filterKraftPackages(sampleRecords, { status: "sterile_valid" });
			assert.equal(filtered1.length, 1);
			assert.equal(filtered1[0]?.id, "kp-1");

			// 2. Filter by search query: "хирург"
			const filtered2 = filterKraftPackages(sampleRecords, { query: "хирург" });
			assert.equal(filtered2.length, 1);
			assert.equal(filtered2[0]?.id, "kp-2");

			// 3. Filter by autoclave: "AUTO-01"
			const filtered3 = filterKraftPackages(sampleRecords, { autoclaveId: "AUTO-01" });
			assert.equal(filtered3.length, 1);
		});

		it("calculates accurate statistics for the package fleet", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "AUTO-01",
				cycleNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 8,
			});

			const stats = calculateKraftBatchStatistics(batch);
			assert.equal(stats.totalPacks, 8);
			assert.equal(stats.sterileValidCount, 8);
			assert.equal(stats.expiredCount, 0);
			assert.equal(stats.verifiedIndicatorCount, 8);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. THERMAL STICKER LAYOUT & EXPORTERS
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Thermal Sticker (58x40 / 43x25 mm), A4 Sheet & CSV Exporters", () => {
		const sampleRecord: KraftPackageRecord = {
			id: "kp-test-01",
			batchId: "KB-20260822-01",
			serialNumber: 1,
			packageType: "paper_self_seal_single",
			packageSize: "size_100x200",
			toolSetId: "set_therapeutic_tray",
			toolSetNameRu: "Терапевтический лоток смотровой",
			itemsListRu: ["Зеркало", "Зонд", "Пинцет"],
			packDate: "2026-08-22",
			expDate: "2026-10-11",
			daysLifespan: 50,
			daysRemaining: 50,
			status: "sterile_valid",
			autoclaveId: "AUTO-01",
			cycleNumber: 3,
			operatorId: "NURSE-01",
			operatorName: "Смирнова А.В.",
			indicatorId: "vinar_steritest_4",
			indicatorVerified: true,
			barcode128: "KB2608220001",
			barcodeDataMatrixPayload: "KB-20260822-01#1|AUTO-01|CYC3|2026-08-22|2026-10-11|NURSE-01|TER-TRAY",
			isBreached: false,
			notes: "",
			createdAt: "2026-08-22T08:00:00Z",
		};

		it("generates official 58x40 mm thermal sticker HTML with all statutory fields", () => {
			const html = generateThermalStickerHtml(sampleRecord, { size: "58x40" });
			assert.ok(html.includes("kraft-sticker-58x40"));
			assert.ok(html.includes("СТЕРИЛЬНО • СанПиН 3.3686-21"));
			assert.ok(html.includes("Терапевтический лоток смотровой"));
			assert.ok(html.includes("AUTO-01 / ЦИКЛ #3"));
			assert.ok(html.includes("2026-08-22"));
			assert.ok(html.includes("2026-10-11"));
			assert.ok(html.includes("50 сут."));
			assert.ok(html.includes("Индикатор:"));
			assert.ok(html.includes("<svg")); // 2D DataMatrix SVG included
		});

		it("generates compact 43x25 mm thermal sticker HTML", () => {
			const html = generateThermalStickerHtml(sampleRecord, { size: "43x25" });
			assert.ok(html.includes("kraft-sticker-43x25"));
			assert.ok(html.includes("СТЕРИЛЬНО • СанПиН"));
			assert.ok(html.includes("2026-08-22"));
			assert.ok(html.includes("<svg"));
		});

		it("generates A4 batch sheet HTML for multi-label laser printing", () => {
			const a4Html = generateA4BatchSheetHtml([sampleRecord, sampleRecord]);
			assert.ok(a4Html.includes("РЕЕСТР ЭТИКЕТОК СТЕРИЛИЗАЦИИ КРАФТ-ПАКЕТОВ"));
			assert.ok(a4Html.includes("Всего этикеток:"));
			assert.ok(a4Html.includes("a4-grid"));
		});

		it("exports kraft batch register to RFC 4180 CSV with UTF-8 BOM", () => {
			const csv = exportKraftBatchToCsv([sampleRecord]);
			assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
			assert.ok(csv.includes("ID записи;Номер партии;Серийный номер"));
			assert.ok(csv.includes("Терапевтический лоток смотровой"));
			assert.ok(csv.includes("50"));
			assert.ok(csv.includes("Стерильно (годен)"));
			assert.ok(csv.includes("Смирнова А.В."));
		});

		it("generates raw TSPL (TSC/Xprinter) label script with SanPiN 3.3686-21, cycle and dates", () => {
			const tspl58 = generateTsplLabelCode(sampleRecord, { size: "58x40", copies: 2 });
			assert.ok(tspl58.includes("SIZE 58 mm, 40 mm"));
			assert.ok(tspl58.includes("STERILE - SANPIN 3.3686-21"));
			assert.ok(tspl58.includes("AUTO-01/#3"));
			assert.ok(tspl58.includes("DMATRIX"));
			assert.ok(tspl58.includes("PACK: 2026-08-22"));
			assert.ok(tspl58.includes("EXP:  2026-10-11"));
			assert.ok(tspl58.includes("PRINT 1,2"));

			const tspl43 = generateTsplLabelCode(sampleRecord, { size: "43x25", copies: 1 });
			assert.ok(tspl43.includes("SIZE 43 mm, 25 mm"));
			assert.ok(tspl43.includes("STERILE SANPIN"));
			assert.ok(tspl43.includes("AUTO-01/#3"));
			assert.ok(tspl43.includes("PRINT 1,1"));
		});

		it("generates raw ZPL II (Zebra) label script with SanPiN 3.3686-21, cycle and dates", () => {
			const zpl58 = generateZplLabelCode(sampleRecord, { size: "58x40", copies: 3 });
			assert.ok(zpl58.includes("^XA"));
			assert.ok(zpl58.includes("^PW464"));
			assert.ok(zpl58.includes("^LL320"));
			assert.ok(zpl58.includes("STERILE - SANPIN 3.3686-21"));
			assert.ok(zpl58.includes("AUTO-01/#3"));
			assert.ok(zpl58.includes("^BXN"));
			assert.ok(zpl58.includes("PACK: 2026-08-22"));
			assert.ok(zpl58.includes("EXP:  2026-10-11"));
			assert.ok(zpl58.includes("^PQ3,0,1,Y"));
			assert.ok(zpl58.includes("^XZ"));

			const zpl43 = generateZplLabelCode(sampleRecord, { size: "43x25", copies: 1 });
			assert.ok(zpl43.includes("^XA"));
			assert.ok(zpl43.includes("^PW344"));
			assert.ok(zpl43.includes("^LL200"));
			assert.ok(zpl43.includes("STERILE SANPIN"));
			assert.ok(zpl43.includes("AUTO-01/#3"));
			assert.ok(zpl43.includes("^PQ1,0,1,Y"));
			assert.ok(zpl43.includes("^XZ"));
		});

		it("encodes Russian Cyrillic strings into standard IBM CP866 byte arrays for legacy thermal printers", () => {
			const textRu = "СТЕРИЛИЗАЦИЯ: САНПИН № 123";
			const bytes = encodeStringToCp866(textRu);
			assert.ok(bytes instanceof Uint8Array);
			assert.equal(bytes.length, textRu.length);

			// 'С' in CP866: 0x91
			assert.equal(bytes[0], 0x91);
			// 'Т' in CP866: 0x92
			assert.equal(bytes[1], 0x92);
			// '№' in CP866: 0xFC
			assert.equal(bytes[21], 0xfc);
		});

		it("generates valid raw ESC/POS binary stream with CP866 code page and auto-cut", () => {
			const binary = generateEscPosSanpinLabelBinary(sampleRecord, {
				clinicName: "СТОМАТОЛОГИЯ DENTE",
				cutPaper: true,
			});
			assert.ok(binary instanceof Uint8Array);
			assert.ok(binary.length > 50);

			// Check ESC @ init [0x1B, 0x40]
			assert.equal(binary[0], 0x1b);
			assert.equal(binary[1], 0x40);

			// Check ESC t 17 (CP866) [0x1B, 0x74, 0x11]
			assert.equal(binary[2], 0x1b);
			assert.equal(binary[3], 0x74);
			assert.equal(binary[4], 0x11);

			// Check GS V 66 0 (Cut) at the end
			const last4 = binary.slice(-4);
			assert.deepEqual(Array.from(last4), [0x1d, 0x56, 0x42, 0x00]);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. ENGINE & BARREL EXPORT INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Engine & Barrel Export Integrity", () => {
		it("verifies all Kraft Package engine functions are properly exported", () => {
			assert.equal(typeof calculatePackageExpiration, "function");
			assert.equal(typeof generateKraftBatchRecords, "function");
			assert.equal(typeof generateThermalStickerHtml, "function");
			assert.equal(typeof generateTsplLabelCode, "function");
			assert.equal(typeof generateZplLabelCode, "function");
			assert.equal(typeof encodeStringToCp866, "function");
			assert.equal(typeof generateEscPosSanpinLabelBinary, "function");
			assert.equal(typeof exportKraftBatchToCsv, "function");
		});
	});
});
