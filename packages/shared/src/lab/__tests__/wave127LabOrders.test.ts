/**
 * wave127LabOrders.test.ts — Unit Tests for Dental Lab Orders & Prosthodontic Workflow Engine.
 *
 * Wave 127 — Domain: Dental Lab Orders (DentalPin Reverse-Engineering).
 *
 * Test coverage:
 * 1. Re-exports & Architectural Integrity:
 *    - All schemas, types, and engine functions exported from lab/index.ts and shared root index.ts.
 * 2. Zod Validation Schemas & Labels:
 *    - labWorkTypeSchema validates all 8 types and checks LAB_WORK_TYPE_LABELS_RU.
 *    - labOrderStatusSchema validates all 7 statuses and checks LAB_ORDER_STATUS_LABELS_RU.
 *    - labImpressionTypeSchema validates all 5 impression types and checks LAB_IMPRESSION_LABELS_RU.
 *    - vitaShadeSchema validates Classical (A1..D4) and Bleach (bleach_1..bleach_4) shades.
 *    - labOrderRecordSchema validates complete realistic prosthodontic lab order.
 * 3. State Transitions & Doctor Autonomy (Mandate 8e):
 *    - Standard clinical workflow progression.
 *    - Doctor autonomy: returning fitted or received orders to in_progress for adjustment/remake.
 *    - Cancellation and reopening workflows.
 *    - Rejection of invalid direct jumps (e.g. draft -> fitted).
 * 4. Overdue SLA Detection (isLabOrderOverdue):
 *    - Detects past expected delivery deadline for active orders.
 *    - Ignores delivered, fitted, and cancelled orders.
 *    - Boundary checks for reference dates.
 * 5. Manufacturing Turnaround Duration (calculateLabTurnaroundDays):
 *    - Calendar days calculation between sentDate and receivedDate.
 *    - Same-day, multi-week, and inverted/malformed date edge cases.
 * 6. Statutory A4 Lab Prescription Sheet (formatLabOrderPrescriptionA4):
 *    - Complete clinical metadata and statutory citations (СанПиН 3.3686-21, ГОСТ, СтАР).
 *    - Strict Mandate 8d item 7 verification: 100% ZERO unicode emojis.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateLabTurnaroundDays,
	canTransitionLabOrderStatus,
	formatLabOrderPrescriptionA4,
	isLabOrderOverdue,
	LAB_IMPRESSION_LABELS_RU,
	LAB_ORDER_STATUS_LABELS_RU,
	LAB_WORK_TYPE_LABELS_RU,
	labImpressionTypeSchema,
	labOrderRecordSchema,
	labOrderStatusSchema,
	labWorkTypeSchema,
	type LabImpressionType,
	type LabOrderRecord,
	type LabOrderStatus,
	type LabWorkType,
	vitaShadeSchema,
	type VitaShade,
} from "../labOrdersEngine.js";
import {
	calculateLabTurnaroundDays as calcTurnaroundFromLabIndex,
	canTransitionLabOrderStatus as canTransitionFromLabIndex,
	formatLabOrderPrescriptionA4 as formatA4FromLabIndex,
	isLabOrderOverdue as isOverdueFromLabIndex,
	LAB_IMPRESSION_LABELS_RU as IMPRESSION_LABELS_FROM_LAB_INDEX,
	LAB_ORDER_STATUS_LABELS_RU as STATUS_LABELS_FROM_LAB_INDEX,
	LAB_WORK_TYPE_LABELS_RU as WORK_LABELS_FROM_LAB_INDEX,
	labImpressionTypeSchema as impressionSchemaFromLabIndex,
	labOrderRecordSchema as orderRecordSchemaFromLabIndex,
	labOrderStatusSchema as orderStatusSchemaFromLabIndex,
	labWorkTypeSchema as workTypeSchemaFromLabIndex,
	vitaShadeSchema as vitaShadeSchemaFromLabIndex,
} from "../index.js";
import {
	calculateLabTurnaroundDays as calcTurnaroundFromRootIndex,
	canTransitionLabOrderStatus as canTransitionFromRootIndex,
	formatLabOrderPrescriptionA4 as formatA4FromRootIndex,
	isLabOrderOverdue as isOverdueFromRootIndex,
	LAB_IMPRESSION_LABELS_RU as IMPRESSION_LABELS_FROM_ROOT_INDEX,
	LAB_ORDER_STATUS_LABELS_RU as STATUS_LABELS_FROM_ROOT_INDEX,
	LAB_WORK_TYPE_LABELS_RU as WORK_LABELS_FROM_ROOT_INDEX,
	labImpressionTypeSchema as impressionSchemaFromRootIndex,
	labOrderRecordSchema as orderRecordSchemaFromRootIndex,
	labWorkTypeSchema as workTypeSchemaFromRootIndex,
} from "../../index.js";

describe("Wave 127: Dental Lab Orders & Prosthodontic Workflow Engine", () => {
	describe("1. Re-exports & Architectural Parity", () => {
		it("re-exports all functions and schemas identically from lab/index.ts", () => {
			assert.equal(canTransitionLabOrderStatus, canTransitionFromLabIndex);
			assert.equal(isLabOrderOverdue, isOverdueFromLabIndex);
			assert.equal(calculateLabTurnaroundDays, calcTurnaroundFromLabIndex);
			assert.equal(formatLabOrderPrescriptionA4, formatA4FromLabIndex);
			assert.equal(labWorkTypeSchema, workTypeSchemaFromLabIndex);
			assert.equal(labOrderStatusSchema, orderStatusSchemaFromLabIndex);
			assert.equal(labImpressionTypeSchema, impressionSchemaFromLabIndex);
			assert.equal(vitaShadeSchema, vitaShadeSchemaFromLabIndex);
			assert.equal(labOrderRecordSchema, orderRecordSchemaFromLabIndex);
			assert.deepEqual(LAB_WORK_TYPE_LABELS_RU, WORK_LABELS_FROM_LAB_INDEX);
			assert.deepEqual(LAB_ORDER_STATUS_LABELS_RU, STATUS_LABELS_FROM_LAB_INDEX);
			assert.deepEqual(LAB_IMPRESSION_LABELS_RU, IMPRESSION_LABELS_FROM_LAB_INDEX);
		});

		it("re-exports all functions and schemas identically from @dental/shared root index", () => {
			assert.equal(canTransitionLabOrderStatus, canTransitionFromRootIndex);
			assert.equal(isLabOrderOverdue, isOverdueFromRootIndex);
			assert.equal(calculateLabTurnaroundDays, calcTurnaroundFromRootIndex);
			assert.equal(formatLabOrderPrescriptionA4, formatA4FromRootIndex);
			assert.equal(labWorkTypeSchema, workTypeSchemaFromRootIndex);
			assert.equal(labImpressionTypeSchema, impressionSchemaFromRootIndex);
			assert.equal(labOrderRecordSchema, orderRecordSchemaFromRootIndex);
			assert.deepEqual(LAB_WORK_TYPE_LABELS_RU, WORK_LABELS_FROM_ROOT_INDEX);
			assert.deepEqual(LAB_ORDER_STATUS_LABELS_RU, STATUS_LABELS_FROM_ROOT_INDEX);
			assert.deepEqual(LAB_IMPRESSION_LABELS_RU, IMPRESSION_LABELS_FROM_ROOT_INDEX);
		});
	});

	describe("2. Zod Validation Schemas & Localized Labels", () => {
		it("labWorkTypeSchema validates all 8 canonical prosthodontic work types", () => {
			const expectedTypes: LabWorkType[] = [
				"crown",
				"bridge",
				"denture",
				"implant",
				"veneer",
				"orthodontic",
				"repair",
				"other",
			];

			for (const type of expectedTypes) {
				assert.equal(labWorkTypeSchema.parse(type), type);
				assert.ok(LAB_WORK_TYPE_LABELS_RU[type].length > 0);
			}

			assert.throws(() => labWorkTypeSchema.parse("invalid_work_type"));
		});

		it("labOrderStatusSchema validates all 7 lab order lifecycle statuses", () => {
			const expectedStatuses: LabOrderStatus[] = [
				"draft",
				"sent",
				"in_progress",
				"ready",
				"received",
				"fitted",
				"cancelled",
			];

			for (const status of expectedStatuses) {
				assert.equal(labOrderStatusSchema.parse(status), status);
				assert.ok(LAB_ORDER_STATUS_LABELS_RU[status].length > 0);
			}

			assert.throws(() => labOrderStatusSchema.parse("completed_legacy"));
		});

		it("labImpressionTypeSchema validates all 5 impression and scanning modalities", () => {
			const expectedImpressions: LabImpressionType[] = [
				"digital_scan",
				"alginate",
				"pvs_silicone",
				"polyether",
				"other",
			];

			for (const imp of expectedImpressions) {
				assert.equal(labImpressionTypeSchema.parse(imp), imp);
				assert.ok(LAB_IMPRESSION_LABELS_RU[imp].length > 0);
			}

			assert.throws(() => labImpressionTypeSchema.parse("wax_bite_only"));
		});

		it("vitaShadeSchema validates Classical and Bleach shades accurately", () => {
			const classical: VitaShade[] = [
				"A1", "A2", "A3", "A3.5", "A4",
				"B1", "B2", "B3", "B4",
				"C1", "C2", "C3", "C4",
				"D2", "D3", "D4",
			];
			for (const s of classical) {
				assert.equal(vitaShadeSchema.parse(s), s);
			}

			const bleach: VitaShade[] = ["bleach_1", "bleach_2", "bleach_3", "bleach_4"];
			for (const b of bleach) {
				assert.equal(vitaShadeSchema.parse(b), b);
			}

			assert.throws(() => vitaShadeSchema.parse("E1"));
			assert.throws(() => vitaShadeSchema.parse("neon_white"));
		});

		it("labOrderRecordSchema parses complete realistic prosthodontic order record", () => {
			const validRecord: LabOrderRecord = {
				id: "a0000000-0000-0000-0000-000000000001",
				patientId: "p1000000-0000-0000-0000-000000000001",
				patientName: "Смирнова Елена Александровна",
				labContactId: "c2000000-0000-0000-0000-000000000001",
				labName: 'ЗТЛ "Дентал-Мастер CAD/CAM"',
				workType: "crown",
				toothReference: "1.6, 1.7",
				impressionType: "digital_scan",
				antagonistInfo: "Интраоральный скан антагонистов нижней челюсти приложен",
				shade: "A2",
				status: "sent",
				sentDate: "2026-09-01",
				expectedDate: "2026-09-08",
				receivedDate: null,
				priceRub: 14500,
				notes: "Круговой поддесневой уступ 0.8 мм. Каркас из диоксида циркония Multi-layer.",
				createdAt: "2026-09-01T08:30:00.000Z",
			};

			const parsed = labOrderRecordSchema.parse(validRecord);
			assert.equal(parsed.patientName, "Смирнова Елена Александровна");
			assert.equal(parsed.workType, "crown");
			assert.equal(parsed.shade, "A2");
			assert.equal(parsed.priceRub, 14500);
		});

		it("labOrderRecordSchema enforces date formatting and rejects malformed values", () => {
			assert.throws(() => {
				labOrderRecordSchema.parse({
					patientId: "p1",
					patientName: "Иванов И.И.",
					labContactId: "c1",
					labName: "ЗТЛ",
					workType: "crown",
					sentDate: "01.09.2026", // Invalid: must be YYYY-MM-DD
				});
			});

			assert.throws(() => {
				labOrderRecordSchema.parse({
					patientId: "p1",
					patientName: "Иванов И.И.",
					labContactId: "c1",
					labName: "ЗТЛ",
					workType: "crown",
					sentDate: "2026-09-01",
					priceRub: -500, // Invalid: cannot be negative
				});
			});
		});
	});

	describe("3. Lifecycle State Transitions & Mandate 8e (Doctor Autonomy)", () => {
		it("permits standard forward progression through manufacturing pipeline", () => {
			assert.equal(canTransitionLabOrderStatus("draft", "sent"), true);
			assert.equal(canTransitionLabOrderStatus("sent", "in_progress"), true);
			assert.equal(canTransitionLabOrderStatus("in_progress", "ready"), true);
			assert.equal(canTransitionLabOrderStatus("ready", "received"), true);
			assert.equal(canTransitionLabOrderStatus("received", "fitted"), true);
		});

		it("permits doctor autonomy: returning fitted work back for adjustment or remake (Mandate 8e)", () => {
			// Prosthodontist checks fit in patient's mouth: needs contact point adjustment or shade correction
			assert.equal(canTransitionLabOrderStatus("fitted", "in_progress"), true);
			assert.equal(canTransitionLabOrderStatus("fitted", "received"), true);
			// Prosthodontist inspects received item before patient arrival and finds defect: sends back to tech
			assert.equal(canTransitionLabOrderStatus("received", "in_progress"), true);
		});

		it("allows cancelling from any active status and reopening cancelled orders", () => {
			const activeStatuses: LabOrderStatus[] = ["draft", "sent", "in_progress", "ready", "received", "fitted"];
			for (const status of activeStatuses) {
				assert.equal(canTransitionLabOrderStatus(status, "cancelled"), true);
			}

			// Reopening cancelled orders
			assert.equal(canTransitionLabOrderStatus("cancelled", "draft"), true);
			assert.equal(canTransitionLabOrderStatus("cancelled", "sent"), true);
		});

		it("permits identical self-transitions (from === to)", () => {
			const statuses: LabOrderStatus[] = ["draft", "sent", "in_progress", "ready", "received", "fitted", "cancelled"];
			for (const status of statuses) {
				assert.equal(canTransitionLabOrderStatus(status, status), true);
			}
		});

		it("blocks invalid illegal jumps (e.g. draft directly to fitted or ready)", () => {
			assert.equal(canTransitionLabOrderStatus("draft", "ready"), false);
			assert.equal(canTransitionLabOrderStatus("draft", "received"), false);
			assert.equal(canTransitionLabOrderStatus("draft", "fitted"), false);
			assert.equal(canTransitionLabOrderStatus("sent", "fitted"), false);
		});
	});

	describe("4. Overdue SLA Detection (isLabOrderOverdue)", () => {
		const baseOrder: LabOrderRecord = {
			id: "a0000000-0000-0000-0000-000000000001",
			patientId: "p1",
			patientName: "Кузнецов А.В.",
			labContactId: "c1",
			labName: "Лаборатория Прайм",
			workType: "bridge",
			toothReference: "2.4, 2.5, 2.6",
			shade: "A3",
			status: "sent",
			sentDate: "2026-09-01",
			expectedDate: "2026-09-08",
		};

		it("flags active order as overdue when referenceDate exceeds expected deadline", () => {
			const pastDeadline = new Date("2026-09-09T10:00:00.000Z");
			assert.equal(isLabOrderOverdue(baseOrder, pastDeadline), true);
		});

		it("does not flag order as overdue before expected delivery date", () => {
			const beforeDeadline = new Date("2026-09-05T12:00:00.000Z");
			assert.equal(isLabOrderOverdue(baseOrder, beforeDeadline), false);
		});

		it("does not flag order as overdue on the expected delivery date itself", () => {
			const onDay = new Date("2026-09-08T15:30:00.000Z");
			assert.equal(isLabOrderOverdue(baseOrder, onDay), false);
		});

		it("never flags received, fitted, or cancelled orders as overdue", () => {
			const farFuture = new Date("2026-10-01T00:00:00.000Z");

			assert.equal(isLabOrderOverdue({ ...baseOrder, status: "received" }, farFuture), false);
			assert.equal(isLabOrderOverdue({ ...baseOrder, status: "fitted" }, farFuture), false);
			assert.equal(isLabOrderOverdue({ ...baseOrder, status: "cancelled" }, farFuture), false);
		});

		it("returns false if expectedDate is omitted or empty", () => {
			const noDueDateOrder: LabOrderRecord = { ...baseOrder, expectedDate: null };
			const futureDate = new Date("2026-09-20T00:00:00.000Z");
			assert.equal(isLabOrderOverdue(noDueDateOrder, futureDate), false);
		});
	});

	describe("5. Manufacturing Turnaround Duration (calculateLabTurnaroundDays)", () => {
		it("calculates exact calendar turnaround duration in days", () => {
			assert.equal(calculateLabTurnaroundDays("2026-09-01", "2026-09-08"), 7);
			assert.equal(calculateLabTurnaroundDays("2026-09-01", "2026-09-15"), 14);
			assert.equal(calculateLabTurnaroundDays("2026-08-15", "2026-09-05"), 21);
		});

		it("returns 0 for same-day delivery (e.g. express chairside repair)", () => {
			assert.equal(calculateLabTurnaroundDays("2026-09-05", "2026-09-05"), 0);
		});

		it("returns 0 for inverted dates or malformed date inputs", () => {
			assert.equal(calculateLabTurnaroundDays("2026-09-10", "2026-09-01"), 0);
			assert.equal(calculateLabTurnaroundDays("invalid-date", "2026-09-01"), 0);
			assert.equal(calculateLabTurnaroundDays("2026-09-01", "invalid-date"), 0);
		});
	});

	describe("6. Statutory A4 Lab Prescription Generator & Zero-Emoji Audit (Mandate 8d Item 7)", () => {
		const fullOrder: LabOrderRecord = {
			id: "f1111111-2222-3333-4444-555555555555",
			patientId: "pat-9901",
			patientName: "Васильев Сергей Николаевич",
			labContactId: "lab-con-04",
			labName: 'ООО "ЗТЛ ТопДент"',
			workType: "implant",
			toothReference: "4.6",
			impressionType: "digital_scan",
			antagonistInfo: "Цифровой скан прикуса в центральной окклюзии",
			shade: "A3.5",
			status: "in_progress",
			sentDate: "2026-09-02",
			expectedDate: "2026-09-12",
			receivedDate: null,
			priceRub: 22000,
			notes: "Индивидуальный титановый абатмент + циркониевая коронка с винтовой фиксацией. Шахта 4.6.",
		};

		it("generates statutory Russian A4 prescription layout with all clinical requisites", () => {
			const prescription = formatLabOrderPrescriptionA4(
				fullOrder,
				'Стоматологический центр "ДЕНТЕ Эксперт"',
				"Д-р Морозов К.Б.",
			);

			assert.ok(prescription.includes("НАРЯД-ЗАКАЗ В ЗУБОТЕХНИЧЕСКУЮ ЛАБОРАТОРИЮ"));
			assert.ok(prescription.includes('Клиника:     Стоматологический центр "ДЕНТЕ Эксперт"'));
			assert.ok(prescription.includes("Врач:        Д-р Морозов К.Б."));
			assert.ok(prescription.includes('Лаборатория: ООО "ЗТЛ ТопДент"'));
			assert.ok(prescription.includes("ФИО пациента:        Васильев Сергей Николаевич"));
			assert.ok(prescription.includes("Вид конструкции:     Протезирование на имплантате (implant)"));
			assert.ok(prescription.includes("Зубная формула (FDI): 4.6"));
			assert.ok(prescription.includes("Расцветка / оттенок: VITA A3.5"));
			assert.ok(prescription.includes("Тип оттиска / скана: Цифровой скан IOS"));
			assert.ok(prescription.includes("22 000 руб."));
			assert.ok(prescription.includes("СанПиН 3.3686-21"));
			assert.ok(prescription.includes("ГОСТ Р 51087-97"));
			assert.ok(prescription.includes("Клинические рекомендации СтАР"));
			assert.ok(prescription.includes("Врач-стоматолог-ортопед:     ____________________ / Д-р Морозов К.Б. /"));
		});

		it("STRICT AUDIT: guarantees 100% absence of cartoon emojis per Mandate 8d Item 7", () => {
			const prescription = formatLabOrderPrescriptionA4(
				fullOrder,
				'Клиника "ДЕНТЕ"',
				"Врач Столяров А.Н.",
			);

			// Strict unicode regex for all emojis, symbols, pictographs, flags, etc.
			const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1FA00}-\u{1FAFF}]/u;

			assert.equal(
				EMOJI_REGEX.test(prescription),
				false,
				"Mandate 8d Item 7 VIOLATION: Emoji detected in statutory medical prescription!",
			);

			// Additional check for common forbidden clinical emojis
			const forbiddenChars = ["🦷", "🏥", "💉", "✨", "🚀", "💡", "🎉", "🔥", "⚠️"];
			for (const char of forbiddenChars) {
				assert.equal(
					prescription.includes(char),
					false,
					`Forbidden emoji '${char}' found in prescription`,
				);
			}
		});
	});
});
