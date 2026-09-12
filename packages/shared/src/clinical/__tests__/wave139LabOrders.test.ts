/**
 * wave139LabOrders.test.ts — Unit Tests for Dental Laboratory Orders (ZTL) & Prosthetic Stages Workflow Engine.
 *
 * Wave 139 — Domain: Clinical / Prosthetics & Dental Laboratory Workflow.
 * Adapted from DentalPin (backend/app/modules/lab_orders/) for DENTE Dental CRM.
 *
 * 100% Zero Mocks. Validates:
 * 1. Re-exports & Architectural Parity:
 *    - All schemas, types, and functions re-exported identically from clinical/index.ts and shared/index.ts.
 * 2. Lab Order Creation (createLabOrder):
 *    - Validates multi-unit bridge & crown creation (Zirconia Multilayer, VITA A2, FDI teeth 11, 12, 21, digital intraoral scan).
 *    - Validates automatic stage breakdown calculation across work types (bridge, single_crown, removable_denture, surgical_guide).
 *    - Rejects invalid FDI tooth numbers (<11, >48, or invalid quadrant teeth like 10, 19, 99).
 * 3. Lab Order Lifecycle Transitions (advanceLabOrderStatus):
 *    - sent_to_lab -> in_progress -> fitting_stage -> received_in_clinic -> installed_accepted.
 *    - Automatic stage completion stamping when received or completed.
 *    - Timestamped append of clinical & technician notes.
 * 4. Doctor Autonomy & Warranty Rework (Mandate 8e item 7 & Mandate 8n):
 *    - Transition to 'rework_needed' never blocks order processing and requires no admin master-passwords.
 *    - Marks isWarrantyRework: true and records clinical reworkReason.
 * 5. Laboratory SLA Compliance & Reliability Metrics (calculateLabSlaCompliance):
 *    - On-time delivery rate, overdue order detection, average turnaround in calendar days, rework rate.
 *    - Safe handling of empty orders, zero completed orders, and active in-flight jobs.
 * 6. Statutory Russian Form ZTL-1 A4 Protocol (formatLabOrderFormZtl1A4Protocol):
 *    - Generates statutory requisition slip for attachment to Form 043/u (Ministry of Health).
 *    - MANDATE 8d ITEM 7: STRICTLY 0 EMOJIS (checked via Unicode \p{Extended_Pictographic}, general ranges, and forbidden symbols).
 * 7. Zod Schema Validation:
 *    - Validates strict constraints on work types, prosthetic materials, VITA shades, and stages.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	advanceLabOrderStatus,
	calculateLabSlaCompliance,
	createLabOrder,
	formatLabOrderFormZtl1A4Protocol,
	generateDefaultStages,
	IMPRESSION_TYPE_LABELS_RU,
	impressionTypeSchema,
	isValidFdiToothNumber,
	LAB_ORDER_STATUS_LABELS_RU,
	LAB_WORK_TYPE_LABELS_RU,
	labOrderSchema,
	labOrderStageSchema,
	labOrderStageStatusSchema,
	labOrderStatusSchema,
	labOrdersEngine,
	labWorkTypeSchema,
	PROSTHETIC_MATERIAL_LABELS_RU,
	prostheticMaterialSchema,
	vitaShadeSchema,
	type LabOrder,
	type LabOrderStage,
	type LabOrderStatus,
	type LabWorkType,
	type ProstheticMaterial,
	type VitaShade,
} from "../labOrdersEngine.js";
import {
	advanceLabOrderStatus as advanceFromClinicalIndex,
	calculateLabSlaCompliance as calculateSlaFromClinicalIndex,
	createLabOrder as createFromClinicalIndex,
	formatLabOrderFormZtl1A4Protocol as formatA4FromClinicalIndex,
	generateDefaultStages as generateStagesFromClinicalIndex,
	IMPRESSION_TYPE_LABELS_RU as IMP_LABELS_FROM_CLINICAL,
	impressionTypeSchema as impSchemaFromClinical,
	isValidFdiToothNumber as isValidFdiFromClinical,
	LAB_ORDER_STATUS_LABELS_RU as STATUS_LABELS_FROM_CLINICAL,
	LAB_WORK_TYPE_LABELS_RU as WORK_LABELS_FROM_CLINICAL,
	labOrderSchema as orderSchemaFromClinical,
	labOrderStageSchema as stageSchemaFromClinical,
	labOrdersEngine as engineFromClinical,
	labWorkTypeSchema as workSchemaFromClinical,
	PROSTHETIC_MATERIAL_LABELS_RU as MAT_LABELS_FROM_CLINICAL,
	prostheticMaterialSchema as matSchemaFromClinical,
	vitaShadeSchema as shadeSchemaFromClinical,
} from "../index.js";

describe("Wave 139: Dental Lab Orders & Prosthetic Stages Workflow Engine", () => {
	const mockClinicId = "clinic-spb-nevsky-01";
	const mockDoctorId = "doc-petrov-ortho";
	const mockPatientId = "pat-778899";
	const mockLabId = "lab-cadcam-master";

	describe("1. Re-exports & Architectural Parity", () => {
		it("re-exports all Wave 139 functions and schemas identically from clinical/index.ts", () => {
			assert.equal(createLabOrder, createFromClinicalIndex);
			assert.equal(advanceLabOrderStatus, advanceFromClinicalIndex);
			assert.equal(calculateLabSlaCompliance, calculateSlaFromClinicalIndex);
			assert.equal(formatLabOrderFormZtl1A4Protocol, formatA4FromClinicalIndex);
			assert.equal(generateDefaultStages, generateStagesFromClinicalIndex);
			assert.equal(isValidFdiToothNumber, isValidFdiFromClinical);
			assert.equal(labWorkTypeSchema, workSchemaFromClinical);
			assert.equal(prostheticMaterialSchema, matSchemaFromClinical);
			assert.equal(vitaShadeSchema, shadeSchemaFromClinical);
			assert.equal(impressionTypeSchema, impSchemaFromClinical);
			assert.equal(labOrderStageSchema, stageSchemaFromClinical);
			assert.equal(labOrderSchema, orderSchemaFromClinical);
			assert.equal(labOrdersEngine, engineFromClinical);
			assert.deepEqual(LAB_WORK_TYPE_LABELS_RU, WORK_LABELS_FROM_CLINICAL);
			assert.deepEqual(PROSTHETIC_MATERIAL_LABELS_RU, MAT_LABELS_FROM_CLINICAL);
			assert.deepEqual(LAB_ORDER_STATUS_LABELS_RU, STATUS_LABELS_FROM_CLINICAL);
			assert.deepEqual(IMPRESSION_TYPE_LABELS_RU, IMP_LABELS_FROM_CLINICAL);
		});

		it("contains comprehensive Russian labels for work types, materials, and statuses", () => {
			assert.equal(LAB_WORK_TYPE_LABELS_RU.single_crown, "Одиночная коронка");
			assert.equal(LAB_WORK_TYPE_LABELS_RU.bridge, "Мостовидный протез");
			assert.equal(LAB_WORK_TYPE_LABELS_RU.veneer, "Винир / Ультранир");
			assert.equal(
				PROSTHETIC_MATERIAL_LABELS_RU.zirconia_multilayer,
				"Диоксид циркония (Multilayer 3D/5D)",
			);
			assert.equal(
				PROSTHETIC_MATERIAL_LABELS_RU.emax_disilicate,
				"Пресс-керамика IPS e.max (Дисиликат лития)",
			);
			assert.equal(
				LAB_ORDER_STATUS_LABELS_RU.fitting_stage,
				"Этап клинической примерки",
			);
			assert.equal(
				LAB_ORDER_STATUS_LABELS_RU.rework_needed,
				"Требуется переделка / Коррекция",
			);
		});
	});

	describe("2. Lab Order Creation & FDI Tooth Validation (createLabOrder)", () => {
		it("creates a validated bridge lab order with Zirconia Multilayer, VITA A2, teeth 11, 12, 21 and digital scan", () => {
			const order = createLabOrder({
				id: "ztl-order-2026-001",
				clinicId: mockClinicId,
				patientId: mockPatientId,
				patientFullName: "Соколова Анна Сергеевна",
				doctorId: mockDoctorId,
				doctorFullName: "Д-р Петров В.С.",
				labId: mockLabId,
				labName: "ООО ДенталЛаб Эксперт",
				workType: "bridge",
				material: "zirconia_multilayer",
				shade: "A2",
				toothNumbers: [11, 12, 21],
				impressionType: "digital_intraoral_scan",
				antagonistInfo: "Интраоральный скан прикуса в привычной окклюзии",
				sentDate: "2026-09-12",
				expectedDate: "2026-09-22",
				labCostKopecks: 3600000, // 36,000 RUB
				notes: "Край уступа поддесневой 0.3 мм, моделирование с анатомическими буграми",
				warrantyMonths: 24,
				now: "2026-09-12T10:00:00.000Z",
			});

			assert.equal(order.id, "ztl-order-2026-001");
			assert.equal(order.workType, "bridge");
			assert.equal(order.material, "zirconia_multilayer");
			assert.equal(order.shade, "A2");
			assert.deepEqual(order.toothNumbers, [11, 12, 21]);
			assert.equal(order.impressionType, "digital_intraoral_scan");
			assert.equal(order.status, "sent_to_lab");
			assert.equal(order.isWarrantyRework, false);
			assert.equal(order.labCostKopecks, 3600000);
			assert.equal(order.warrantyMonths, 24);

			// Bridge should automatically generate 3 intermediate stages
			assert.equal(order.stages.length, 3);
			assert.ok(order.stages[0]!.stageName.includes("каркаса"));
			assert.ok(order.stages[1]!.stageName.includes("примерка"));
			assert.ok(order.stages[2]!.stageName.includes("глазурование"));
			assert.equal(order.stages[0]!.status, "pending");
		});

		it("generates correct stages for surgical guide and clasp denture", () => {
			const guideStages = generateDefaultStages("surgical_guide", "2026-09-12", "2026-09-18");
			assert.equal(guideStages.length, 3);
			assert.ok(guideStages[0]!.stageName.includes("3D-планирование"));
			assert.ok(guideStages[1]!.stageName.includes("3D-печать"));

			const dentureStages = generateDefaultStages("clasp_denture", "2026-09-12", "2026-09-26");
			assert.equal(dentureStages.length, 3);
			assert.ok(dentureStages[0]!.stageName.includes("прикусных валиков"));
			assert.ok(dentureStages[1]!.stageName.includes("восковой постановки"));
		});

		it("validates permanent adult FDI teeth (11..18, 21..28, 31..38, 41..48)", () => {
			assert.equal(isValidFdiToothNumber(11), true);
			assert.equal(isValidFdiToothNumber(18), true);
			assert.equal(isValidFdiToothNumber(21), true);
			assert.equal(isValidFdiToothNumber(36), true);
			assert.equal(isValidFdiToothNumber(48), true);

			// Invalid tooth numbers
			assert.equal(isValidFdiToothNumber(0), false);
			assert.equal(isValidFdiToothNumber(10), false);
			assert.equal(isValidFdiToothNumber(19), false);
			assert.equal(isValidFdiToothNumber(29), false);
			assert.equal(isValidFdiToothNumber(50), false);
			assert.equal(isValidFdiToothNumber(99), false);
			assert.equal(isValidFdiToothNumber(-11), false);
		});

		it("rejects invalid FDI tooth numbers during order creation", () => {
			assert.throws(() => {
				createLabOrder({
					clinicId: mockClinicId,
					patientId: mockPatientId,
					patientFullName: "Иванов И.И.",
					doctorId: mockDoctorId,
					doctorFullName: "Д-р Петров",
					labId: mockLabId,
					labName: "Лаб",
					workType: "single_crown",
					material: "emax_disilicate",
					shade: "A1",
					toothNumbers: [19], // Invalid FDI tooth!
					impressionType: "silicone_a_type",
					sentDate: "2026-09-12",
					expectedDate: "2026-09-18",
				});
			});
		});
	});

	describe("3. Lab Order Lifecycle Transitions (advanceLabOrderStatus)", () => {
		it("transitions order through complete manufacturing lifecycle to completion", () => {
			const initialOrder = createLabOrder({
				id: "ztl-lifecycle-1",
				clinicId: mockClinicId,
				patientId: mockPatientId,
				patientFullName: "Морозов Дмитрий Павлович",
				doctorId: mockDoctorId,
				doctorFullName: "Д-р Петров В.С.",
				labId: mockLabId,
				labName: "ПраймЛаб",
				workType: "single_crown",
				material: "emax_disilicate",
				shade: "B1",
				toothNumbers: [24],
				impressionType: "digital_intraoral_scan",
				sentDate: "2026-09-12",
				expectedDate: "2026-09-17",
				now: "2026-09-12T10:00:00.000Z",
			});

			assert.equal(initialOrder.status, "sent_to_lab");
			assert.equal(initialOrder.receivedDate, null);

			// Step 1: In progress at lab
			const inProgress = advanceLabOrderStatus(initialOrder, "in_progress", {
				notes: "Сканы приняты, моделирование начато",
				now: "2026-09-13T09:00:00.000Z",
			});
			assert.equal(inProgress.status, "in_progress");
			assert.ok(inProgress.notes?.includes("моделирование начато"));

			// Step 2: Clinical fitting stage
			const fitting = advanceLabOrderStatus(inProgress, "fitting_stage", {
				technicianNotes: "Каркас готов к клинической примерке",
				now: "2026-09-15T11:00:00.000Z",
			});
			assert.equal(fitting.status, "fitting_stage");

			// Step 3: Received in clinic
			const received = advanceLabOrderStatus(fitting, "received_in_clinic", {
				receivedDate: "2026-09-16",
				now: "2026-09-16T14:00:00.000Z",
			});
			assert.equal(received.status, "received_in_clinic");
			assert.equal(received.receivedDate, "2026-09-16");
			// Stages should now be stamped as completed
			assert.ok(received.stages.every((st) => st.status === "completed"));

			// Step 4: Installed & Accepted by doctor and patient
			const accepted = advanceLabOrderStatus(received, "installed_accepted", {
				notes: "Коронка зафиксирована на RelyX U200, окклюзия проверена",
				now: "2026-09-17T12:00:00.000Z",
			});
			assert.equal(accepted.status, "installed_accepted");
			assert.ok(accepted.notes?.includes("RelyX U200"));
		});
	});

	describe("4. Doctor Autonomy & Warranty Rework (Mandate 8e & Mandate 8n)", () => {
		it("permits warranty rework transitions without administrator passwords or blockers", () => {
			const order = createLabOrder({
				id: "ztl-rework-test",
				clinicId: mockClinicId,
				patientId: mockPatientId,
				patientFullName: "Кузнецов Алексей Иванович",
				doctorId: mockDoctorId,
				doctorFullName: "Д-р Петров В.С.",
				labId: mockLabId,
				labName: "Лаборатория Скан-Дент",
				workType: "veneer",
				material: "emax_disilicate",
				shade: "BL2",
				toothNumbers: [11, 21],
				impressionType: "digital_intraoral_scan",
				sentDate: "2026-09-12",
				expectedDate: "2026-09-18",
			});

			// Doctor identifies contact discrepancy during try-in and triggers rework in 1 click
			const reworkOrder = advanceLabOrderStatus(order, "rework_needed", {
				reworkReason: "Коррекция экватора зуба 21, переделка по гарантии клиники (100% скидка)",
				notes: "Снять 0.2 мм в пришеечной трети вестибулярной поверхности",
				now: "2026-09-18T15:00:00.000Z",
			});

			assert.equal(reworkOrder.status, "rework_needed");
			assert.equal(reworkOrder.isWarrantyRework, true);
			assert.ok(reworkOrder.reworkReason?.includes("переделка по гарантии"));
			assert.ok(reworkOrder.notes?.includes("Снять 0.2 мм"));

			// System remains 100% operational, doctor is not locked out
			assert.equal(reworkOrder.patientId, mockPatientId);
			assert.equal(reworkOrder.doctorId, mockDoctorId);
		});
	});

	describe("5. Laboratory SLA Compliance & Turnaround (calculateLabSlaCompliance)", () => {
		it("calculates accurate on-time rate, turnaround days, and rework metrics", () => {
			const orders: LabOrder[] = [
				// Order 1: on-time (sent Sep 01, expected Sep 08, received Sep 07 -> 6 days turnaround)
				createLabOrder({
					id: "o-1",
					clinicId: mockClinicId,
					patientId: "p-1",
					patientFullName: "Пациент 1",
					doctorId: mockDoctorId,
					doctorFullName: "Врач 1",
					labId: mockLabId,
					labName: "Лаб",
					workType: "single_crown",
					material: "zirconia_multilayer",
					shade: "A3",
					toothNumbers: [16],
					impressionType: "digital_intraoral_scan",
					sentDate: "2026-09-01",
					expectedDate: "2026-09-08",
				}),
				// Order 2: on-time (sent Sep 02, expected Sep 10, received Sep 10 -> 8 days turnaround)
				createLabOrder({
					id: "o-2",
					clinicId: mockClinicId,
					patientId: "p-2",
					patientFullName: "Пациент 2",
					doctorId: mockDoctorId,
					doctorFullName: "Врач 2",
					labId: mockLabId,
					labName: "Лаб",
					workType: "veneer",
					material: "emax_disilicate",
					shade: "A1",
					toothNumbers: [12],
					impressionType: "digital_intraoral_scan",
					sentDate: "2026-09-02",
					expectedDate: "2026-09-10",
				}),
				// Order 3: overdue completed (sent Sep 01, expected Sep 07, received Sep 11 -> overdue!)
				createLabOrder({
					id: "o-3",
					clinicId: mockClinicId,
					patientId: "p-3",
					patientFullName: "Пациент 3",
					doctorId: mockDoctorId,
					doctorFullName: "Врач 3",
					labId: mockLabId,
					labName: "Лаб",
					workType: "bridge",
					material: "pfm_cobalt_chromium",
					shade: "A2",
					toothNumbers: [45, 46, 47],
					impressionType: "silicone_a_type",
					sentDate: "2026-09-01",
					expectedDate: "2026-09-07",
				}),
				// Order 4: active in-flight overdue (sent Sep 01, expected Sep 08, not received as of Sep 12)
				createLabOrder({
					id: "o-4",
					clinicId: mockClinicId,
					patientId: "p-4",
					patientFullName: "Пациент 4",
					doctorId: mockDoctorId,
					doctorFullName: "Врач 4",
					labId: mockLabId,
					labName: "Лаб",
					workType: "implant_abutment",
					material: "titanium_custom",
					shade: "A2",
					toothNumbers: [25],
					impressionType: "digital_intraoral_scan",
					sentDate: "2026-09-01",
					expectedDate: "2026-09-08",
					status: "in_progress",
				}),
				// Order 5: rework order
				createLabOrder({
					id: "o-5",
					clinicId: mockClinicId,
					patientId: "p-5",
					patientFullName: "Пациент 5",
					doctorId: mockDoctorId,
					doctorFullName: "Врач 5",
					labId: mockLabId,
					labName: "Лаб",
					workType: "single_crown",
					material: "zirconia_multilayer",
					shade: "A3",
					toothNumbers: [36],
					impressionType: "digital_intraoral_scan",
					sentDate: "2026-09-05",
					expectedDate: "2026-09-15",
					isWarrantyRework: true,
					reworkReason: "Скол глазури",
				}),
			];

			// Advance orders 1, 2, 3 to received
			const completedOrders: LabOrder[] = [
				advanceLabOrderStatus(orders[0]!, "received_in_clinic", { receivedDate: "2026-09-07" }),
				advanceLabOrderStatus(orders[1]!, "received_in_clinic", { receivedDate: "2026-09-10" }),
				advanceLabOrderStatus(orders[2]!, "received_in_clinic", { receivedDate: "2026-09-11" }), // late
				orders[3]!, // in_progress overdue
				orders[4]!, // rework
			];

			const sla = calculateLabSlaCompliance(completedOrders, "2026-09-12");

			assert.equal(sla.totalOrders, 5);
			assert.equal(sla.completedCount, 3);
			// 2 on-time out of 3 completed = 66.67% (0.6667)
			assert.equal(sla.onTimeRate, 0.6667);
			// 2 overdue (1 completed late + 1 in-flight overdue)
			assert.equal(sla.overdueCount, 2);
			// Rework count: 1 (order 5) out of 5 = 20%
			assert.equal(sla.reworkRate, 0.2);
			// Average turnaround: (6 + 8 + 10) / 3 = 24 / 3 = 8.0 days
			assert.equal(sla.averageTurnaroundDays, 8.0);
		});

		it("handles zero orders safely without NaN or infinity", () => {
			const sla = calculateLabSlaCompliance([], "2026-09-12");
			assert.equal(sla.totalOrders, 0);
			assert.equal(sla.completedCount, 0);
			assert.equal(sla.onTimeRate, 1.0);
			assert.equal(sla.overdueCount, 0);
			assert.equal(sla.averageTurnaroundDays, 0);
			assert.equal(sla.reworkRate, 0.0);
		});
	});

	describe("6. Statutory Form ZTL-1 A4 Protocol (formatLabOrderFormZtl1A4Protocol)", () => {
		it("formats official A4 requisition document adhering to Form 043/u and Russian standards", () => {
			const order = createLabOrder({
				id: "ZTL-RU-2026-8801",
				clinicId: mockClinicId,
				patientId: mockPatientId,
				patientFullName: "Васильев Константин Борисович",
				doctorId: mockDoctorId,
				doctorFullName: "Д-р Смирнов А.Н.",
				labId: mockLabId,
				labName: "Зуботехническая лаборатория «Норд-Дент»",
				workType: "bridge",
				material: "zirconia_multilayer",
				shade: "A2",
				toothNumbers: [14, 15, 16],
				impressionType: "digital_intraoral_scan",
				antagonistInfo: "Цифровой скан челюсти-антагониста, сопоставление в Medit Link",
				sentDate: "2026-09-12",
				expectedDate: "2026-09-20",
				labCostKopecks: 4200000, // 42,000.00 RUB
				notes: "Промывное пространство овоида седловидной формы, гигиенический зазор",
				warrantyMonths: 12,
			});

			const a4 = formatLabOrderFormZtl1A4Protocol(order, "Стоматологическая клиника ДЕНТЕ Нева");

			assert.ok(a4.includes("НАРЯД-ЗАКАЗ В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ (ФОРМА ЗТЛ-1)"));
			assert.ok(a4.includes("Форма 043/у"));
			assert.ok(a4.includes("Стоматологическая клиника ДЕНТЕ Нева"));
			assert.ok(a4.includes("Зуботехническая лаборатория «Норд-Дент»"));
			assert.ok(a4.includes("ZTL-RU-2026-8801"));
			assert.ok(a4.includes("Васильев Константин Борисович"));
			assert.ok(a4.includes("Д-р Смирнов А.Н."));
			assert.ok(a4.includes("Мостовидный протез [bridge]"));
			assert.ok(a4.includes("Диоксид циркония (Multilayer 3D/5D)"));
			assert.ok(a4.includes("A2"));
			assert.ok(a4.includes("14, 15, 16"));
			assert.ok(a4.includes("42000.00 руб."));
			assert.ok(a4.includes("12 мес."));
			assert.ok(a4.includes("Штамп ОТК лаборатории"));
			assert.ok(a4.includes("Оттиск снял и наряд оформил"));
		});

		it("STRICTLY ZERO EMOJIS in compliance with Mandate 8d item 7", () => {
			const order = createLabOrder({
				id: "ZTL-CLEAN-001",
				clinicId: mockClinicId,
				patientId: mockPatientId,
				patientFullName: "Николаева Ольга Сергеевна",
				doctorId: mockDoctorId,
				doctorFullName: "Д-р Петров В.С.",
				labId: mockLabId,
				labName: "АртДент Лаб",
				workType: "veneer",
				material: "emax_disilicate",
				shade: "BL1",
				toothNumbers: [11, 21],
				impressionType: "digital_intraoral_scan",
				sentDate: "2026-09-12",
				expectedDate: "2026-09-19",
				isWarrantyRework: true,
				reworkReason: "Уточнение микротекстуры эмали",
			});

			const a4 = formatLabOrderFormZtl1A4Protocol(order, "Клиника ДЕНТЕ");

			// 1. Extended_Pictographic Unicode check
			const unicodeEmojiRegex = /\p{Extended_Pictographic}/u;
			assert.equal(
				unicodeEmojiRegex.test(a4),
				false,
				"Mandate 8d Item 7 Violation: Detected Extended_Pictographic Unicode emoji in Form ZTL-1 A4!",
			);

			// 2. Comprehensive range check for standard emoji symbols
			const generalEmojiRegex =
				/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
			assert.equal(
				generalEmojiRegex.test(a4),
				false,
				"Mandate 8d Item 7 Violation: Detected standard Unicode emoji range in Form ZTL-1 A4!",
			);

			// 3. Explicit forbidden cartoon symbols
			const forbiddenList = ["🎉", "🚀", "💡", "🦷", "📦", "📄", "⚠️", "🚨", "✅", "❌", "🔥"];
			for (const forbidden of forbiddenList) {
				assert.equal(
					a4.includes(forbidden),
					false,
					`Mandate 8d Item 7 Violation: Explicit emoji ${forbidden} found in Form ZTL-1 A4!`,
				);
			}
		});
	});

	describe("7. Zod Schema Integrity Validations", () => {
		it("validates compliant labOrderStageSchema", () => {
			const validStage = labOrderStageSchema.parse({
				stageName: "Фрезерование",
				plannedDate: "2026-09-15",
				completedDate: null,
				technicianNotes: null,
				status: "pending",
			});
			assert.equal(validStage.stageName, "Фрезерование");
			assert.equal(validStage.status, "pending");
		});

		it("validates all 10 lab work types and 7 materials in Zod enum", () => {
			const workTypes: LabWorkType[] = [
				"single_crown",
				"bridge",
				"veneer",
				"inlay_onlay",
				"implant_abutment",
				"removable_denture",
				"clasp_denture",
				"orthodontic_splint",
				"surgical_guide",
				"repair",
			];
			for (const wt of workTypes) {
				assert.equal(labWorkTypeSchema.parse(wt), wt);
			}

			const materials: ProstheticMaterial[] = [
				"zirconia_multilayer",
				"emax_disilicate",
				"pfm_cobalt_chromium",
				"pmma_milled_temp",
				"titanium_custom",
				"peek_bio",
				"composite_nano",
			];
			for (const mat of materials) {
				assert.equal(prostheticMaterialSchema.parse(mat), mat);
			}
		});

		it("rejects empty tooth numbers array in labOrderSchema", () => {
			assert.throws(() => {
				labOrderSchema.parse({
					id: "bad-order",
					clinicId: mockClinicId,
					patientId: mockPatientId,
					patientFullName: "Тест",
					doctorId: mockDoctorId,
					doctorFullName: "Тест",
					labId: mockLabId,
					labName: "Тест",
					workType: "single_crown",
					material: "emax_disilicate",
					shade: "A1",
					toothNumbers: [], // empty!
					impressionType: "digital_intraoral_scan",
					sentDate: "2026-09-12",
					expectedDate: "2026-09-15",
					createdAt: "2026-09-12T10:00:00Z",
					updatedAt: "2026-09-12T10:00:00Z",
				});
			});
		});
	});
});
