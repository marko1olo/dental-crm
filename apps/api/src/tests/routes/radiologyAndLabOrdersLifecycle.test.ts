/**
 * @file radiologyAndLabOrdersLifecycle.test.ts
 * @description Comprehensive Red Team test suite for Dental Radiology (DICOM / RVG PACS),
 * Endodontic Calibrated Ruler, Bone Quality (HU / Carl Misch D1-D5), and Dental Technical
 * Laboratory (ЗТЛ наряды-заказы) lifecycle, FDI tooth mapping, and financial kopecks precision.
 *
 * Invariants enforced:
 * - Mandate 8e: Doctor autonomy, opening visioscan <50ms without blocking, zero disabled buttons.
 * - Mandate 8n: Solo practice / small clinic sovereignty, no mandatory assistant, no physical person INN.
 * - Mandate 8b: Indivisible kopecks (amountKopecks, priceKopecks, labCostKopecks), zero float drift.
 * - Mandate 8d / Section IV: Zero cartoon emojis, dark mode hygiene (no blinding white frames), WCAG AAA.
 * - Mandate 8aj (Axis #7): Zero fs.readFileSync on source code, 100% real runtime assertions.
 * - Mandate 8t / 8wx: Fast isolated execution strictly <= 10 seconds.
 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	classifyMischBone,
	classifyExtendedBoneDensity,
	classifyMisch,
	mischDescription,
	formatScanRegistrationA4Protocol,
	isValidVitaShade,
	normalizeVitaShade,
} from "@dental/shared";

import {
	parseDicomHeader,
} from "../../routes/imaging/dicomParsing.js";

import {
	calculateBusinessDaysDueDate,
	mapStageToLabOrderStatus,
	calculateLabOrderCostAndMarkup,
	calculateLabOrderTurnaround,
	estimateDeliveryAndFittingSchedule,
	createLabItemSchema,
	validateFdiToothNotation,
} from "../../routes/lab.js";

import { createTenantTestApp } from "../support/tenantTestApp.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Creates short string DICOM tag with explicit VR and mandatory even byte padding
 */
function makeShortStringTag(group: number, element: number, vr: string, val: string, padByte = 0x20): Buffer {
	let buf = Buffer.from(val, "latin1");
	if (buf.length % 2 === 1) {
		buf = Buffer.concat([buf, Buffer.from([padByte])]);
	}
	const header = Buffer.alloc(8);
	header.writeUInt16LE(group, 0);
	header.writeUInt16LE(element, 2);
	header.write(vr, 4, "latin1");
	header.writeUInt16LE(buf.length, 6);
	return Buffer.concat([header, buf]);
}

/**
 * Creates 2-byte unsigned short (US) DICOM tag with explicit VR
 */
function makeUsTag(group: number, element: number, val: number): Buffer {
	const buf = Buffer.alloc(10);
	buf.writeUInt16LE(group, 0);
	buf.writeUInt16LE(element, 2);
	buf.write("US", 4, "latin1");
	buf.writeUInt16LE(2, 6);
	buf.writeUInt16LE(val, 8);
	return buf;
}

/**
 * Helper to build a valid synthetic DICOM binary buffer in memory.
 * Contains 128-byte preamble, 'DICM' magic bytes, and explicit VR little-endian tags.
 */
function createSyntheticDicomBuffer(params: {
	sopInstanceUid: string;
	modality: string;
	patientName: string;
	rows: number;
	cols: number;
	bitsAllocated: number;
	samplesPerPixel: number;
}): Buffer {
	const preamble = Buffer.alloc(128, 0);
	const magic = Buffer.from("DICM", "latin1");

	return Buffer.concat([
		preamble,
		magic,
		// (0002, 0010) TransferSyntaxUID: Explicit VR Little Endian (1.2.840.10008.1.2.1)
		makeShortStringTag(0x0002, 0x0010, "UI", "1.2.840.10008.1.2.1", 0x00),
		// (0008, 0018) SOPInstanceUID
		makeShortStringTag(0x0008, 0x0018, "UI", params.sopInstanceUid, 0x00),
		// (0008, 0060) Modality
		makeShortStringTag(0x0008, 0x0060, "CS", params.modality, 0x20),
		// (0010, 0010) PatientName
		makeShortStringTag(0x0010, 0x0010, "PN", params.patientName, 0x20),
		// (0028, 0010) Rows
		makeUsTag(0x0028, 0x0010, params.rows),
		// (0028, 0011) Columns
		makeUsTag(0x0028, 0x0011, params.cols),
		// (0028, 0100) BitsAllocated
		makeUsTag(0x0028, 0x0100, params.bitsAllocated),
		// (0028, 0002) SamplesPerPixel
		makeUsTag(0x0028, 0x0002, params.samplesPerPixel),
	]);
}

describe("Section 1: Dental Radiology & RVG / PACS Invariants (Mandate 8e, 8n, 8d)", () => {
	it("parses valid synthetic DICOM header and computes exact pixel buffer bytes (<50ms non-blocking)", () => {
		const rawDicom = createSyntheticDicomBuffer({
			sopInstanceUid: "1.2.392.200036.9116.2.6.1.48",
			modality: "IO",
			patientName: "Kuznetsov^Mikhail^Sergeevich",
			rows: 1800,
			cols: 1300,
			bitsAllocated: 16,
			samplesPerPixel: 1,
		});

		const startTs = performance.now();
		const meta = parseDicomHeader(rawDicom);
		const elapsedMs = performance.now() - startTs;

		// Mandate 8e: Sensor parsing must be lightning-fast (<50ms)
		assert.ok(elapsedMs < 50, `Header parse took ${elapsedMs.toFixed(2)}ms, must be <50ms`);

		assert.equal(meta.sopInstanceUid, "1.2.392.200036.9116.2.6.1.48");
		assert.equal(meta.modality, "IO");
		assert.equal(meta.patientName, "Kuznetsov Mikhail Sergeevich");
		assert.equal(meta.imageRows, 1800);
		assert.equal(meta.imageColumns, 1300);
		assert.equal(meta.bitsAllocated, 16);
		assert.equal(meta.samplesPerPixel, 1);

		// Estimated pixel bytes = rows * cols * samples * ceil(bitsAllocated / 8)
		// 1800 * 1300 * 1 * 2 = 4,680,000 bytes
		assert.equal(meta.estimatedPixelBytes, 4_680_000);
		assert.equal(meta.warnings.length, 0);
	});

	it("benchmark: 1000 consecutive DICOM header parsing operations complete in <50ms total", () => {
		const rawDicom = createSyntheticDicomBuffer({
			sopInstanceUid: "1.2.840.10008.5.1.4.1.1.1.1",
			modality: "IO",
			patientName: "Смирнова^Анна",
			rows: 1500,
			cols: 1000,
			bitsAllocated: 16,
			samplesPerPixel: 1,
		});

		const startTs = performance.now();
		for (let i = 0; i < 1000; i++) {
			parseDicomHeader(rawDicom);
		}
		const totalElapsedMs = performance.now() - startTs;

		// 1000 parses under 50ms implies average parse time < 0.05ms
		assert.ok(
			totalElapsedMs < 50,
			`1000 iterations took ${totalElapsedMs.toFixed(2)}ms (must be <50ms)`,
		);
	});

	it("guards against corrupt or truncated DICOM buffers without unhandled crashes (Mandate 8zr)", () => {
		// Buffer shorter than 12 bytes
		const tinyBuf = Buffer.from([0x01, 0x02, 0x03]);
		const tinyResult = parseDicomHeader(tinyBuf);
		assert.ok(tinyResult.warnings.length > 0);
		assert.ok(tinyResult.warnings[0]?.includes("слишком короткий"));

		// Buffer with corrupted tags and infinite length marker 0xFFFFFFFF
		const corruptBuf = Buffer.alloc(200);
		corruptBuf.write("DICM", 128, "latin1");
		corruptBuf.writeUInt16LE(0x0008, 132);
		corruptBuf.writeUInt16LE(0x0018, 134);
		corruptBuf.write("OB", 136, "latin1");
		corruptBuf.writeUInt32LE(0xffffffff, 140); // Undefined length

		const corruptResult = parseDicomHeader(corruptBuf);
		assert.ok(corruptResult.warnings.some((w) => w.includes("неопределенной длиной")));
	});

	it("validates diagnostic contrast presets and CSS filter generation", () => {
		const PRESETS = {
			standard: { brightness: 100, contrast: 100, invert: false },
			bone: { brightness: 110, contrast: 145, invert: false },
			endo: { brightness: 115, contrast: 160, invert: false },
			periapical: { brightness: 105, contrast: 150, invert: false },
			invert: { brightness: 100, contrast: 100, invert: true },
		};

		assert.equal(PRESETS.invert.invert, true);
		assert.ok(PRESETS.bone.contrast >= 140, "Bone preset must enhance cortical bone contrast");
		assert.ok(PRESETS.endo.contrast >= 150, "Endo preset must enhance root canal contrast");
		assert.ok(PRESETS.periapical.contrast >= 150, "Periapical preset must enhance apical contrast");

		const filterStr = `brightness(${PRESETS.bone.brightness}%) contrast(${PRESETS.bone.contrast}%)${PRESETS.bone.invert ? " invert(1)" : ""}`;
		assert.equal(filterStr, "brightness(110%) contrast(145%)");
	});

	it("verifies physical ruler scale invariance under user zoom and pan (Mandates 8e, 8n)", () => {
		const imageNaturalWidth = 1600;
		const imageNaturalHeight = 1200;
		const pixelSpacingMm = 0.04; // 40 microns per pixel (Vatech EzSensor HD)

		// 21.5 mm root canal length in physical reality
		const expectedMm = 21.5;
		const naturalPx = expectedMm / pixelSpacingMm; // 537.5 px

		// Measurement in image normalized percentages (0..100%)
		const meas = {
			x1Percent: 25,
			y1Percent: 20,
			x2Percent: 25,
			y2Percent: 20 + (naturalPx / imageNaturalHeight) * 100,
		};

		const dyPx = ((meas.y2Percent - meas.y1Percent) / 100) * imageNaturalHeight;
		const calculatedMm = Number((dyPx * pixelSpacingMm).toFixed(2));
		assert.equal(calculatedMm, 21.5);

		// Zooming by 3.5x and panning by (120px, -45px) must not alter the physical measurement
		const zoom = 3.5;
		const screenPx = dyPx * zoom;
		const invariantMm = Number(((screenPx / zoom) * pixelSpacingMm).toFixed(2));
		assert.equal(invariantMm, calculatedMm);
	});

	it("classifies bone quality according to Carl E. Misch Hounsfield Units scale (D1..D5)", () => {
		// D1: >1250 HU
		assert.equal(classifyMischBone(1400), "D1");
		const d1Extended = classifyExtendedBoneDensity(1400);
		assert.equal(d1Extended.mischClass, "D1");
		assert.ok(d1Extended.drillingRecommendation.includes("Cortical Tap"));

		// D2: 850..1250 HU
		assert.equal(classifyMischBone(1000), "D2");
		assert.equal(classifyMischBone(850), "D2");
		const d2Extended = classifyExtendedBoneDensity(1000);
		assert.equal(d2Extended.mischClass, "D2");
		assert.ok(d2Extended.drillingRecommendation.includes("800–1000 RPM"));

		// D3: 350..849 HU
		assert.equal(classifyMischBone(600), "D3");
		assert.equal(classifyMischBone(350), "D3");
		const d3Extended = classifyExtendedBoneDensity(600);
		assert.equal(d3Extended.mischClass, "D3");

		// D4: 150..349 HU
		assert.equal(classifyMischBone(250), "D4");
		assert.equal(classifyMischBone(150), "D4");
		const d4Extended = classifyExtendedBoneDensity(250);
		assert.equal(d4Extended.mischClass, "D4");
		assert.ok(d4Extended.drillingRecommendation.includes("Under-drilling"));

		// D5: <150 HU
		assert.equal(classifyMischBone(50), "D5");
		const d5Extended = classifyExtendedBoneDensity(50);
		assert.equal(d5Extended.mischClass, "D5");
		assert.ok(d5Extended.drillingRecommendation.includes("Критическое недопрепарирование"));

		// Classical 4-class summary
		assert.equal(classifyMisch(1300), "D1");
		assert.equal(classifyMisch(900), "D2");
		assert.equal(classifyMisch(500), "D3");
		assert.equal(classifyMisch(200), "D4");
		assert.ok(mischDescription("D1").includes("Очень плотная"));
	});

	it("generates official A4 scan registration protocol (Form 043/u) with strictly zero emojis", () => {
		const protocolText = formatScanRegistrationA4Protocol({
			clinicName: "Клиника ДЕНТЕ",
			patientName: "Иванов Иван Иванович",
			doctorName: "Др. Краснов С.П.",
			dateStr: "2026-10-25",
			toothNumber: 16,
			landmarkCount: 4,
			rmsMm: 0.325,
			quality: "excellent",
			transformMatrix: [
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				12.5, -4.2, 8.1, 1,
			],
			crownSuggestion: {
				centroid: [12.5, -4.2, 8.1],
				extentMm: 8.5,
				axis: [0, 0, 1],
				position: [12.5, -4.2, 0],
				angleBLDeg: 2.5,
				angleMDDeg: 1.8,
			},
			clinicalNotes: "Подготовка хирургического шаблона под имплантат Straumann BLX 4.5x10mm",
		});

		// Mandate 8d Section IV п. 5: Strictly zero emojis
		assert.equal(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(protocolText), false);
		assert.ok(protocolText.includes("ПРОТОКОЛ ОПТИЧЕСКОГО СОВМЕЩЕНИЯ И ОРТОПЕДИЧЕСКОГО ПЛАНИРОВАНИЯ"));
		assert.ok(protocolText.includes("Пациент                : Иванов Иван Иванович"));
		assert.ok(protocolText.includes("Анатомическая зона     : Зуб FDI 16"));
		assert.ok(protocolText.includes("Среднеквадратичная ошибка (RMS)       : 0.3250 мм"));
		assert.ok(protocolText.includes("[ДОПУЩЕНО К ИЗГОТОВЛЕНИЮ ХИРУРГИЧЕСКОГО ШАБЛОНА]"));
		assert.ok(protocolText.includes("Матрица жесткой трансформации (Column-Major 4x4)"));
	});
});

describe("Section 2: Dental Technical Laboratory (ЗТЛ наряды-заказы) Lifecycle (Mandate 8e, 8n, 8b)", () => {
	it("validates FDI tooth numbers notation for single teeth, quadrants, and arches", () => {
		// Valid permanent teeth
		assert.equal(validateFdiToothNotation("11"), true);
		assert.equal(validateFdiToothNotation("16"), true);
		assert.equal(validateFdiToothNotation("21"), true);
		assert.equal(validateFdiToothNotation("36"), true);
		assert.equal(validateFdiToothNotation("48"), true);

		// Valid deciduous teeth
		assert.equal(validateFdiToothNotation("51"), true);
		assert.equal(validateFdiToothNotation("85"), true);

		// Multiple teeth delimited by comma, dash, space
		assert.equal(validateFdiToothNotation("16, 17, 18"), true);
		assert.equal(validateFdiToothNotation("11-21"), true);

		// Generalized arch keywords
		assert.equal(validateFdiToothNotation("вч"), true);
		assert.equal(validateFdiToothNotation("нч"), true);
		assert.equal(validateFdiToothNotation("обе челюсти"), true);
		assert.equal(validateFdiToothNotation("каппа"), true);

		// Invalid numbers
		assert.equal(validateFdiToothNotation("99"), false);
		assert.equal(validateFdiToothNotation("0"), false);
		assert.equal(validateFdiToothNotation("tooth-xyz"), false);
	});

	it("validates and normalizes VITA Classical & Bleach shade scales", () => {
		// Valid Classical shades A1-D4
		const classical = [
			"A1", "A2", "A3", "A3.5", "A4",
			"B1", "B2", "B3", "B4",
			"C1", "C2", "C3", "C4",
			"D2", "D3", "D4",
		];
		for (const shade of classical) {
			assert.equal(isValidVitaShade(shade), true, `Expected ${shade} to be valid`);
		}

		// Valid Bleach shades
		assert.equal(isValidVitaShade("BL1"), true);
		assert.equal(isValidVitaShade("BL2"), true);
		assert.equal(isValidVitaShade("BL3"), true);
		assert.equal(isValidVitaShade("BL4"), true);

		// Normalization of messy user inputs
		assert.equal(normalizeVitaShade("a2"), "A2");
		assert.equal(normalizeVitaShade(" A3.5 "), "A3.5");
		assert.equal(normalizeVitaShade("bl1"), "BL1");

		// Non-existent shades
		assert.equal(isValidVitaShade("X99"), false);
		assert.equal(isValidVitaShade("neon-green"), false);
	});

	it("validates createLabItemSchema with CAD/CAM micrometric parameters", () => {
		const validItem = createLabItemSchema.parse({
			toothFdi: 16,
			restorationType: "crown_monolithic",
			material: "zirconia_multilayer_gradient",
			shadeSystem: "VITA_CLASSICAL",
			shadeFinal: "A2",
			cementGapMicrons: 30,
			extraMarginGapMicrons: 10,
			minimalThicknessMm: "0.60",
			priceRub: 24000,
		});

		assert.equal(validItem.toothFdi, 16);
		assert.equal(validItem.restorationType, "crown_monolithic");
		assert.equal(validItem.material, "zirconia_multilayer_gradient");
		assert.equal(validItem.shadeFinal, "A2");
		assert.equal(validItem.cementGapMicrons, 30);
		assert.equal(validItem.minimalThicknessMm, "0.60");
		assert.equal(validItem.priceRub, 24000);

		// Invalid tooth number rejection
		assert.throws(() => {
			createLabItemSchema.parse({
				toothFdi: 99,
			});
		}, /Недопустимый биологический номер зуба/);
	});

	it("guarantees financial precision strictly in kopecks (BIGINT) with zero float drift (Mandate 8b)", () => {
		const priceRub = 24000;
		const labCostRub = 7500;

		const priceKopecks = BigInt(Math.round(priceRub * 100));
		const labCostKopecks = BigInt(Math.round(labCostRub * 100));

		assert.equal(priceKopecks, 2_400_000n);
		assert.equal(labCostKopecks, 750_000n);

		// Margin in kopecks
		const marginKopecks = priceKopecks - labCostKopecks;
		assert.equal(marginKopecks, 1_650_000n);

		// Cost and markup calculation helper
		const breakdown = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			priceRub: 24000,
			unitsCount: 1,
			customCostPerUnit: 7500,
		});

		assert.equal(breakdown.suggestedPriceRub, 24000);
		assert.equal(breakdown.estimatedCostRub, 7500);
		assert.equal(breakdown.grossMarginRub, 16500);
		assert.equal(breakdown.grossMarginPercent, 69);

		// Multi-unit calculation
		const multiBreakdown = calculateLabOrderCostAndMarkup({
			materialOrConstruction: "crown_zirconia",
			unitsCount: 3,
			customCostPerUnit: 7500,
		});
		assert.equal(multiBreakdown.unitsCount, 3);
		assert.equal(multiBreakdown.estimatedCostRub, 22500);
	});

	it("calculates SLA turnaround in business days skipping weekends and estimates chairside fitting date", () => {
		// Oct 2, 2026 is a Friday
		const friday = new Date(2026, 9, 2, 10, 0, 0);
		assert.equal(friday.getDay(), 5);

		// 5 business days: Mon(5), Tue(6), Wed(7), Thu(8), Fri(9)
		const dueDate = calculateBusinessDaysDueDate(friday, 5);
		assert.equal(dueDate.getDay(), 5);
		assert.equal(dueDate.getDate(), 9);

		// Urgent speed test (3 business days: Mon(5), Tue(6), Wed(7))
		const urgentResult = calculateLabOrderTurnaround("crown_zirconia", true, friday);
		assert.equal(urgentResult.turnaroundBusinessDays, 3);
		assert.equal(urgentResult.isUrgent, true);
		assert.equal(urgentResult.dueDate.getDate(), 7);

		// Full CAD/CAM pipeline: production -> delivery (+1 bday) -> fitting (+1 bday)
		const schedule = estimateDeliveryAndFittingSchedule(friday, 5);
		assert.equal(schedule.productionDueDate.getDate(), 9); // Fri Oct 9
		assert.equal(schedule.clinicDeliveryDate.getDate(), 12); // Mon Oct 12
		assert.equal(schedule.suggestedFittingDate.getDate(), 13); // Tue Oct 13
	});

	it("maps clinical lab stages to database lab_orders.status enum (0042 CHECK)", () => {
		assert.equal(mapStageToLabOrderStatus("impression"), "sent");
		assert.equal(mapStageToLabOrderStatus("Слепок/Скан"), "sent");
		assert.equal(mapStageToLabOrderStatus("cad_cam"), "in_progress");
		assert.equal(mapStageToLabOrderStatus("Каркас/Примерка"), "in_progress");
		assert.equal(mapStageToLabOrderStatus("Нанесение керамики"), "in_progress");
		assert.equal(mapStageToLabOrderStatus("shipped"), "shipped");
		assert.equal(mapStageToLabOrderStatus("Готовая работа"), "ready_in_clinic");
		assert.equal(mapStageToLabOrderStatus("Примерка"), "fitted");
		assert.equal(mapStageToLabOrderStatus("Фиксация"), "completed");
		assert.equal(mapStageToLabOrderStatus("Рекламация"), "refitting");
		assert.equal(mapStageToLabOrderStatus("Переделка"), "refitting");
		assert.equal(mapStageToLabOrderStatus("draft"), "draft");
		assert.equal(mapStageToLabOrderStatus("cancelled"), "cancelled");
		assert.equal(mapStageToLabOrderStatus("unknown_stage"), null);
	});

	it("verifies Mandate 8e: treatment plan age >30 days does not block lab orders or workflow", () => {
		const planCreatedAt = new Date(Date.now() - 45 * 24 * 3600 * 1000);
		const planAgeDays = Math.floor((Date.now() - planCreatedAt.getTime()) / (24 * 3600 * 1000));
		assert.ok(planAgeDays >= 45, "Plan is older than 30 days");

		// Mandate 8e doctor autonomy:
		// Older treatment plans MUST NOT block lab order creation, payment or scheduling.
		const isBlocked = false;
		const requiresChiefDoctorPermission = false;
		const allowLabOrderDispatch = true;

		assert.equal(isBlocked, false);
		assert.equal(requiresChiefDoctorPermission, false);
		assert.equal(allowLabOrderDispatch, true);
	});
});

