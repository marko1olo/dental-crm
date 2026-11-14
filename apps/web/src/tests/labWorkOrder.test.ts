import test, { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	DENTAL_LAB_CONSTRUCTIONS,
	type DentalLabConstructionType,
	VITA_CLASSICAL_PLUS_BLEACH_PALETTE,
	CANONICAL_5_CLINICAL_LAB_STATUSES,
	canTransitionLabOrderStatus,
	calculateLabOrderFinancialsKopecks,
	addBusinessDays,
	calculateExpectedDeliveryDate,
	generateProstheticWarrantyPassport,
	labOrderStatusSchema,
} from "@dental/shared";

import {
	VITA_SHADES_SSOT,
	STUMP_SHADES,
} from "../components/lab/dentalLabCatalogData.js";

import {
	generateBarcodeSvg,
	generateQrCodeSvg,
} from "../components/lab/labBarcodeQr.js";

import {
	addWorkingDaysRu,
	calculateLabReadinessDate,
	checkFittingAppointmentCollision,
	detectLabDeadlineAlert,
	processPartialDeliveryAndRework,
	createDentalLabOrderRecord,
	type DentalLabOrderRecord,
} from "../components/lab/dentalLabOrderEngine.js";

describe("Statutory Dental Laboratory Work Order & Tracking Studio Suite (Canonical SSOT)", () => {

	describe("1. Statutory Russian Dental Prosthetic Types & Material Presets", () => {
		it("verifies all 6 canonical statutory prosthetic types exist with complete specifications", () => {
			const expectedTypes: DentalLabConstructionType[] = [
				"crown_zirconia",
				"crown_emax",
				"metal_ceramic",
				"clasp_denture",
				"aligner_splint",
				"surgical_guide",
			];

			for (const typeId of expectedTypes) {
				const preset = DENTAL_LAB_CONSTRUCTIONS[typeId];
				assert.ok(preset, `Missing prosthetic preset: ${typeId}`);
				assert.ok(preset.nameRu.length > 0, `Missing Russian name for ${typeId}`);
				assert.ok(preset.standardTurnaroundDays > 0, `Invalid turnaround days for ${typeId}`);
				assert.ok(preset.defaultPatientPriceKopecks > 0, `Invalid default clinic price for ${typeId}`);
				assert.ok(preset.defaultZtlCostKopecks > 0, `Invalid default lab cost for ${typeId}`);
				assert.ok(
					preset.defaultPatientPriceKopecks > preset.defaultZtlCostKopecks,
					`Clinic price must exceed lab cost for ${typeId}`,
				);
			}
		});

		it("verifies specific material and clinical requirements for prosthetic types", () => {
			assert.equal(DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.requiresStumpShade, true);
			assert.equal(DENTAL_LAB_CONSTRUCTIONS.crown_emax.requiresStumpShade, true);
			assert.equal(DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.requiresStumpShade, false);
			assert.equal(DENTAL_LAB_CONSTRUCTIONS.clasp_denture.requiresVitaShade, true);
			assert.equal(DENTAL_LAB_CONSTRUCTIONS.aligner_splint.requiresVitaShade, false);
			assert.equal(DENTAL_LAB_CONSTRUCTIONS.surgical_guide.standardTurnaroundDays, 3);
		});

		it("verifies laboratory materials catalog specifications and biocompatibility in canonical registry", () => {
			const zr = DENTAL_LAB_CONSTRUCTIONS.crown_zirconia;
			const emax = DENTAL_LAB_CONSTRUCTIONS.crown_emax;
			const guide = DENTAL_LAB_CONSTRUCTIONS.surgical_guide;

			assert.ok(zr.defaultMaterialRu.includes("диоксид циркония") || zr.defaultMaterialRu.includes("Multi-layer"));
			assert.ok(emax.defaultMaterialRu.includes("дисиликат лития") || emax.defaultMaterialRu.includes("Цельнокерамический"));
			assert.ok(guide.defaultMaterialRu.includes("Фотополимер") || guide.defaultMaterialRu.includes("Medical"));
		});
	});

	describe("2. VITA Shades, Natural Die Stump Shades (ND1-ND9) & Optical Texture", () => {
		it("verifies VITA Classical palette has all 16 shades with valid hex codes", () => {
			const classical16 = VITA_CLASSICAL_PLUS_BLEACH_PALETTE.filter((s) => !s.code.startsWith("BL"));
			assert.ok(classical16.length >= 16);
			const shadeCodes = classical16.map((s) => s.code);
			assert.ok(shadeCodes.includes("A1") && shadeCodes.includes("A2") && shadeCodes.includes("A3"));
			assert.ok(shadeCodes.includes("B1") && shadeCodes.includes("B4"));
			assert.ok(shadeCodes.includes("C1") && shadeCodes.includes("D4"));

			for (const s of classical16) {
				assert.match(s.hex, /^#[0-9A-Fa-f]{6}$/);
			}
		});

		it("verifies VITA Bleach shades and SSOT palette", () => {
			const bleachShades = VITA_CLASSICAL_PLUS_BLEACH_PALETTE.filter((s) => s.code.startsWith("BL"));
			assert.ok(bleachShades.length >= 4);
			assert.ok(VITA_SHADES_SSOT.length >= 20);
			const bleachCodes = bleachShades.map((s) => s.code);
			assert.ok(["BL1", "BL2", "BL3", "BL4"].every((c) => bleachCodes.includes(c)));
		});

		it("verifies IPS Natural Die Material ND1-ND9 stump shade standards", () => {
			assert.equal(STUMP_SHADES.length, 9);
			for (let i = 1; i <= 9; i++) {
				const expectedCode = `ND${i}`;
				const found = STUMP_SHADES.find((s) => s.code === expectedCode);
				assert.ok(found, `Missing stump shade ${expectedCode}`);
				assert.match(found.hexColor, /^#[0-9A-Fa-f]{6}$/);
			}
			const nd9 = STUMP_SHADES[8];
			assert.ok(nd9 && nd9.label.includes("Металлическая"));
		});
	});

	describe("3. Statutory Production Workflow Sequence", () => {
		it("verifies all 5 canonical stages in canonical sequence", () => {
			assert.equal(CANONICAL_5_CLINICAL_LAB_STATUSES.length, 5);
			const stageIds = CANONICAL_5_CLINICAL_LAB_STATUSES.map((s) => s.id);
			assert.deepEqual(stageIds, [
				"sent",
				"in_progress",
				"fitting",
				"ready",
				"completed",
			]);

			for (const stageDef of CANONICAL_5_CLINICAL_LAB_STATUSES) {
				assert.ok(stageDef);
				assert.ok(stageDef.labelRu.length > 0);
				assert.ok(stageDef.step >= 1 && stageDef.step <= 5);
			}
		});

		it("validates canonical status transitions without illegal jumps", () => {
			assert.equal(canTransitionLabOrderStatus("draft", "sent"), true);
			assert.equal(canTransitionLabOrderStatus("sent", "in_progress"), true);
			assert.equal(canTransitionLabOrderStatus("in_progress", "ready"), true);
			assert.equal(canTransitionLabOrderStatus("ready", "received"), true);
			assert.equal(canTransitionLabOrderStatus("received", "fitted"), true);
			assert.equal(canTransitionLabOrderStatus("fitted", "completed"), true);
			assert.equal(canTransitionLabOrderStatus("draft", "completed"), false);
		});
	});

	describe("4. Financial & Margin Accounting Engine (Integer Kopecks SSOT)", () => {
		it("calculates gross margin, doctor commission and clinic net profit accurately in integer kopecks", () => {
			// Single crown: 20,000 ₽ (2,000,000 kop) price, 6,000 ₽ (600,000 kop) lab cost, 20% doctor commission
			const fin = calculateLabOrderFinancialsKopecks({
				unitsCount: 1,
				pricePerUnitKopecks: 2000000,
				costPerUnitKopecks: 600000,
				doctorPercent: 20,
			});

			assert.equal(fin.patientPriceTotalKopecks, 2000000);
			assert.equal(fin.labCostTotalKopecks, 600000);
			assert.equal(fin.grossMarginKopecks, 1400000);
			assert.equal(fin.grossMarginPercent, 70.0);
			assert.equal(fin.doctorCommissionKopecks, 280000); // 1,400,000 * 20% = 280,000 kop
			assert.equal(fin.clinicNetProfitKopecks, 1120000); // 1,400,000 - 280,000 = 1,120,000 kop
			assert.equal(fin.isBalanced, true);
		});

		it("handles multi-unit scaling (e.g. 6 veneers anterior group)", () => {
			const fin = calculateLabOrderFinancialsKopecks({
				unitsCount: 6,
				pricePerUnitKopecks: 2800000,
				costPerUnitKopecks: 1000000,
				doctorPercent: 25,
			});

			assert.equal(fin.unitsCount, 6);
			assert.equal(fin.patientPriceTotalKopecks, 16800000); // 28,000 * 6 = 168,000 ₽
			assert.equal(fin.labCostTotalKopecks, 6000000); // 10,000 * 6 = 60,000 ₽
			assert.equal(fin.grossMarginKopecks, 10800000);
			assert.equal(fin.grossMarginPercent, 64.3);
			assert.equal(fin.doctorCommissionKopecks, 2700000); // 108,000 * 25% = 27,000 ₽
			assert.equal(fin.clinicNetProfitKopecks, 8100000);
			assert.equal(fin.isBalanced, true);
		});

		it("handles zero and edge cases cleanly without NaN", () => {
			const fin = calculateLabOrderFinancialsKopecks({
				unitsCount: 0,
				pricePerUnitKopecks: 0,
				costPerUnitKopecks: 0,
				doctorPercent: 0,
			});

			assert.equal(fin.unitsCount, 1);
			assert.equal(fin.patientPriceTotalKopecks, 0);
			assert.equal(fin.grossMarginKopecks, 0);
			assert.equal(fin.grossMarginPercent, 0);
			assert.equal(fin.doctorCommissionKopecks, 0);
			assert.equal(fin.clinicNetProfitKopecks, 0);
			assert.equal(fin.isBalanced, true);
		});
	});

	describe("5. Turnaround & Delivery Scheduler (Weekend Buffering)", () => {
		it("correctly skips Saturdays and Sundays when adding working days", () => {
			// Friday 2026-08-21 + 1 working day -> Monday 2026-08-24
			const friday = new Date("2026-08-21T10:00:00Z");
			const nextDay = addBusinessDays(friday, 1);
			assert.equal(nextDay.getDay(), 1); // Monday

			// Friday + 5 working days -> next Friday 2026-08-28
			const fiveDays = addBusinessDays(friday, 5);
			assert.equal(fiveDays.toISOString().slice(0, 10), "2026-08-28");
		});

		it("calculates stage turnaround schedule with delivery date for applicable types", () => {
			const deliveryDate = calculateExpectedDeliveryDate("2026-08-24", "denture", 10);
			assert.ok(deliveryDate instanceof Date);
			assert.ok(deliveryDate.toISOString().slice(0, 10) > "2026-08-24");
		});
	});

	describe("6. SVG Barcode & QR Code Generation (ISO/IEC Compliance)", () => {
		it("generates valid vector SVG for Code128 barcode", () => {
			const svg = generateBarcodeSvg("ЛО-2026/08-0142", 240, 50);
			assert.ok(svg.includes("<svg"));
			assert.ok(svg.includes("</svg>"));
			assert.ok(svg.includes("ЛО-2026/08-0142") || svg.includes("LO-2026/08-0142"));
			assert.ok(svg.includes("<rect"));
		});

		it("generates valid vector SVG for QR Code without fake math", () => {
			const qrSvg = generateQrCodeSvg("DENTE-LAB:TEST-001", 100);
			assert.ok(qrSvg.includes("<svg"));
			assert.ok(qrSvg.includes("viewBox="));
			assert.ok(qrSvg.includes('width="100"'));
			assert.ok(qrSvg.includes('height="100"'));
			assert.ok(qrSvg.includes("<rect") || qrSvg.includes("<path"));
		});
	});

	describe("7. Statutory Prosthetic Warranty Passport & Clean Blank Generator", () => {
		it("generates complete prosthetic warranty passport with STaR / GOST standards", () => {
			const passport = generateProstheticWarrantyPassport({
				orderNumber: "ЛО-2026-101",
				patientFullName: "Смирнова Анна Викторовна",
				doctorFullName: "Д-р Ковалев С. П.",
				toothFdi: "11, 21",
				restorationType: "crown_emax",
				frameworkMaterial: "IPS e.max Press",
				shade: "A1",
				shadeStump: "ND1",
				warrantyYears: 2,
				fixationDate: "2026-09-01",
			});

			assert.equal(passport.orderNumber, "ЛО-2026-101");
			assert.equal(passport.patientFullName, "Смирнова Анна Викторовна");
			assert.equal(passport.doctorFullName, "Д-р Ковалев С. П.");
			assert.equal(passport.toothFdi, "11, 21");
			assert.equal(passport.shade, "A1");
			assert.equal(passport.shadeStump, "ND1");
			assert.equal(passport.warrantyYears, 2);
			assert.equal(passport.fixationDate, "2026-09-01");
			assert.equal(passport.expirationDate, "2028-09-01");
			assert.ok(passport.gostStandard.includes("ГОСТ"));
			assert.ok(passport.sanpinDisinfectionMark.includes("СанПиН"));
		});
	});

	describe("8. Solo Doctor Autonomy (Mandates 8e, 8n) & Strict Typing (labOrderStatusSchema)", () => {
		it("validates labOrderStatusSchema with strict Zod parsing for all canonical stages", () => {
			assert.equal(labOrderStatusSchema.parse("draft"), "draft");
			assert.equal(labOrderStatusSchema.parse("sent"), "sent");
			assert.equal(labOrderStatusSchema.parse("in_progress"), "in_progress");
			assert.equal(labOrderStatusSchema.parse("shipped"), "shipped");
			assert.equal(labOrderStatusSchema.parse("received"), "received");
			assert.equal(labOrderStatusSchema.parse("refitting"), "refitting");
			assert.equal(labOrderStatusSchema.parse("completed"), "completed");
			assert.equal(labOrderStatusSchema.parse("cancelled"), "cancelled");

			assert.throws(() => labOrderStatusSchema.parse("invalid_random_stage"));
		});
	});

	describe("9. Fitting Appointment Guard & Collision Detection (Mandates 8e, 8n)", () => {
		it("calculates expected readiness date taking into account Russian working days (skipping weekends)", () => {
			// Friday 2026-10-02 + 5 working days -> Friday 2026-10-09
			const friday = new Date(2026, 9, 2); // 2026-10-02 (Friday)
			const readiness = calculateLabReadinessDate(friday, 5);
			const expectedIso = "2026-10-09";
			assert.equal(readiness, expectedIso);

			// Express preset (2 working days) starting Thursday -> Monday
			const thursday = new Date(2026, 9, 1); // 2026-10-01 (Thursday)
			const expressReadiness = calculateLabReadinessDate(thursday, 2);
			assert.equal(expressReadiness, "2026-10-05"); // Mon 2026-10-05
		});

		it("detects collision when appointment is scheduled earlier than lab readiness date with verbatim warning", () => {
			const deadline = "2026-10-15";
			const scheduledVisit = "2026-10-12"; // 3 days before lab readiness
			const collision = checkFittingAppointmentCollision(deadline, scheduledVisit);

			assert.equal(collision.hasCollision, true);
			assert.equal(collision.daysGap, 3);
			assert.ok(collision.warningRu);
			assert.ok(collision.warningRu.includes("Внимание: прием на примерку назначен раньше готовности лаборатории!"));
			assert.ok(collision.warningRu.includes("дефицит: 3 дн."));
		});

		it("returns no collision when fitting appointment is scheduled on or after readiness date", () => {
			const deadline = "2026-10-15";
			const sameDay = checkFittingAppointmentCollision(deadline, "2026-10-15");
			assert.equal(sameDay.hasCollision, false);

			const laterDay = checkFittingAppointmentCollision(deadline, "2026-10-18");
			assert.equal(laterDay.hasCollision, false);

			const noVisit = checkFittingAppointmentCollision(deadline, undefined);
			assert.equal(noVisit.hasCollision, false);
		});
	});

	describe("10. 1-Click Delay Alert & Reschedule Guard (Mandates 8b, 8e)", () => {
		it('detects delay when order status is "delayed" and triggers CRITICAL_TODAY alert with amber badge', () => {
			const alert = detectLabDeadlineAlert({
				orderId: "lab-ord-delay-1",
				orderNumber: "ЗТЛ-2026-99",
				patientName: "Кузнецов Павел",
				dueDate: "2026-10-20",
				status: "delayed",
			});

			assert.equal(alert.isDelayedAlert, true);
			assert.equal(alert.severity, "CRITICAL_TODAY");
			assert.ok(alert.badgeLabelRu?.includes("Задерживается"));
			assert.ok(alert.actionPromptRu?.includes("Перенести прием"));
		});

		it("detects overdue deadline and alerts with reschedule prompt", () => {
			const pastDate = "2020-01-01";
			const alert = detectLabDeadlineAlert({
				orderId: "lab-ord-overdue-1",
				orderNumber: "ЗТЛ-2026-100",
				patientName: "Сидорова Елена",
				dueDate: pastDate,
				status: "in_progress",
			});

			assert.equal(alert.isDelayedAlert, true);
			assert.equal(alert.severity, "OVERDUE");
			assert.ok(alert.badgeLabelRu?.includes("Просрочен"));
			assert.ok(alert.actionPromptRu?.includes("Перенести прием"));
		});

		it("triggers collision alert if visit date is earlier than deadline", () => {
			const alert = detectLabDeadlineAlert({
				orderId: "lab-ord-coll-1",
				orderNumber: "ЗТЛ-2026-101",
				patientName: "Морозов Дмитрий",
				dueDate: "2026-10-25",
				scheduledVisitDate: "2026-10-22",
				status: "in_progress",
			});

			assert.equal(alert.isDelayedAlert, true);
			assert.ok(alert.warningRu?.includes("Внимание: прием на примерку назначен раньше готовности лаборатории!"));
		});
	});

	describe("11. Shade Fidelity & Anatomical Optics Presets (VITA Classical, Bleach, 3D-Master, Translucency, Stump ND1-ND9)", () => {
		it("accurately preserves VITA Classical, Bleach, and 3D-Master shades with stump preparation", () => {
			const orderClassical = createDentalLabOrderRecord({
				orderNumber: "ЗТЛ-SHADE-1",
				patientId: "pat-1",
				patientName: "Орлов Виктор",
				doctorId: "doc-1",
				doctorName: "Д-р Петров",
				constructionType: "single_crown",
				material: "zirconia_multilayer",
				colorVita: "A2",
				shadeSystem: "classical",
				teeth: [11],
				stumpShade: "ND2",
				translucency: "HT",
				priceRub: 18000,
			});

			assert.equal(orderClassical.colorVita, "A2");
			assert.equal(orderClassical.stumpShade, "ND2");
			assert.equal(orderClassical.translucency, "HT");
			assert.equal(orderClassical.anatomicalFeatures?.stumpShade, "ND2");

			const order3d = createDentalLabOrderRecord({
				orderNumber: "ЗТЛ-SHADE-2",
				patientId: "pat-2",
				patientName: "Орлова Анна",
				doctorId: "doc-1",
				doctorName: "Д-р Петров",
				constructionType: "veneer",
				material: "emax_press",
				colorVita: "2M2",
				shadeSystem: "3d_master",
				teeth: [21],
				stumpShade: "ND1",
				translucency: "UTML",
				mamelons: true,
				opalescence: true,
				priceRub: 22000,
			});

			assert.equal(order3d.colorVita, "2M2");
			assert.equal(order3d.shadeSystem, "3d_master");
			assert.equal(order3d.translucency, "UTML");
			assert.equal(order3d.anatomicalFeatures?.mamelons, true);
			assert.equal(order3d.anatomicalFeatures?.opalescence, true);
		});

		it("preserves bleach shades and multi-zone stratification specifications", () => {
			const orderBleach = createDentalLabOrderRecord({
				orderNumber: "ЗТЛ-SHADE-3",
				patientId: "pat-3",
				patientName: "Соколова Екатерина",
				doctorId: "doc-2",
				doctorName: "Д-р Ильин",
				constructionType: "veneer",
				material: "emax_press",
				colorVita: "BL2",
				shadeSystem: "bleach",
				teeth: [12, 11, 21, 22],
				priceRub: 80000,
			});

			assert.equal(orderBleach.colorVita, "BL2");
			assert.equal(orderBleach.shadeSystem, "bleach");
			assert.equal(orderBleach.teeth?.length, 4);
		});
	});

	describe("12. Partial Delivery & Warranty Rework without Deadlock (0 ₽ Law / Mandates 8e, 8n)", () => {
		it("splits 4-crown bridge where 3 units are accepted and 1 unit requires warranty rework", () => {
			// Original 4-unit bridge: teeth [14, 15, 16, 17], price 40,000 ₽
			const originalOrder = createDentalLabOrderRecord({
				orderNumber: "ЗТЛ-2026-44",
				patientId: "pat-bridge-1",
				patientName: "Климов Роман Викторович",
				doctorId: "doc-1",
				doctorName: "Д-р Семенов С. С.",
				constructionType: "bridge_zirconia",
				material: "zirconia_multilayer",
				colorVita: "A3",
				teeth: [14, 15, 16, 17],
				priceRub: 40000,
			});

			// 3 units ready (14, 15, 17), 1 unit rework (16) due to margin fit defect
			const splitResult = processPartialDeliveryAndRework({
				originalOrder,
				deliveredTeeth: [14, 15, 17],
				reworkTeeth: [16],
				reworkReason: "Краевое прилегание уступа зуба 16, скол глазури",
				warrantyLiabilityType: "lab_defect",
			});

			// 1. Accepted order checks
			const { deliveredOrder, reworkOrder, summaryMessageRu } = splitResult;
			assert.ok(deliveredOrder);
			assert.equal(deliveredOrder.status, "ready_in_clinic");
			assert.deepEqual(deliveredOrder.teeth, [14, 15, 17]);
			assert.equal(deliveredOrder.deliveredTeeth?.length, 3);
			assert.equal(deliveredOrder.isPartialDelivery, true);
			// Proportional price: 40,000 * (3/4) = 30,000 ₽
			assert.equal(deliveredOrder.priceRub, 30000);

			// 2. Warranty rework order checks (0 ₽ Law)
			assert.ok(reworkOrder);
			assert.equal(reworkOrder.status, "warranty_rework");
			assert.deepEqual(reworkOrder.teeth, [16]);
			assert.equal(reworkOrder.reworkTeeth?.length, 1);
			assert.equal(reworkOrder.isWarrantyRework, true);
			// Patient price MUST be strictly 0 ₽!
			assert.equal(reworkOrder.priceRub, 0);
			// Lab defect -> lab cost is 0 ₽
			assert.equal(reworkOrder.warrantyLiabilityType, "lab_defect");
			// Traceability to parent
			assert.equal(reworkOrder.originalOrderId, originalOrder.id);
			assert.equal(reworkOrder.originalOrderNumber, originalOrder.orderNumber);
			assert.ok(reworkOrder.orderNumber.includes("-REW-1"));
			assert.ok(reworkOrder.reworkReason?.includes("Краевое прилегание"));

			// 3. No deadlock: statuses are clear and summary is generated
			assert.ok(summaryMessageRu.includes("Частичная приемка"));
			assert.ok(summaryMessageRu.includes("0 ₽"));
			assert.ok(summaryMessageRu.includes("ЗТЛ-2026-44"));
		});

		it("handles clinic warranty liability correctly where clinic absorbs lab cost but patient pays 0 ₽", () => {
			const originalOrder = createDentalLabOrderRecord({
				orderNumber: "ЗТЛ-2026-55",
				patientId: "pat-single-1",
				patientName: "Михайлов Артем",
				doctorId: "doc-2",
				doctorName: "Д-р Ильин",
				constructionType: "single_crown",
				material: "emax_press",
				colorVita: "B1",
				teeth: [24, 25],
				priceRub: 30000,
			});

			const splitResult = processPartialDeliveryAndRework({
				originalOrder,
				deliveredTeeth: [24],
				reworkTeeth: [25],
				reworkReason: "Коррекция контактного пункта по решению клиники",
				warrantyLiabilityType: "clinic_warranty",
			});

			// Patient still pays 0 ₽!
			assert.equal(splitResult.reworkOrder.priceRub, 0);
			assert.equal(splitResult.reworkOrder.warrantyLiabilityType, "clinic_warranty");
			assert.equal(splitResult.deliveredOrder.priceRub, 15000);
		});
	});

});
