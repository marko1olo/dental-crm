import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { StaffActionAuditService } from "../staffActionAuditService";
import clientLogger, { OFFLINE_STAFF_AUDIT_STORAGE_KEY } from "../../logging/clientLogger";

// Mock localStorage for Node test runner
const storageMap = new Map<string, string>();
const mockLocalStorage = {
	getItem: (key: string) => storageMap.get(key) ?? null,
	setItem: (key: string, value: string) => storageMap.set(key, value),
	removeItem: (key: string) => storageMap.delete(key),
	clear: () => storageMap.clear(),
};

(globalThis as any).window = {
	localStorage: mockLocalStorage,
	addEventListener: () => {},
	removeEventListener: () => {},
	document: {},
};
(globalThis as any).localStorage = mockLocalStorage;

describe("StaffActionAuditService (apps/web Offline-First Staff Telemetry)", () => {
	beforeEach(() => {
		storageMap.clear();
	});

	it("1. Logs EMR open (043/у) action correctly", () => {
		const entry = StaffActionAuditService.logEmrOpen({
			patientId: "patient-uuid-001",
			cardId: "card-043-999",
			actorUserId: "doctor-uuid-100",
			actorRole: "doctor",
			actorName: "Д-р Петров П.П.",
			reason: "Первичный консультативный осмотр",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "emr_open");
		assert.strictEqual(entry.entityType, "emr_card_043");
		assert.strictEqual(entry.entityId, "card-043-999");
		assert.strictEqual(entry.patientId, "patient-uuid-001");
		assert.strictEqual(entry.reason, "Первичный консультативный осмотр");
	});

	it("2. Logs diagnosis change with old/new state and ICD-10 code", () => {
		const entry = StaffActionAuditService.logDiagnosisChange({
			patientId: "patient-uuid-002",
			recordId: "rec-777",
			oldDiagnosis: { icdCode: "K02.1", name: "Кариес дентина" },
			newDiagnosis: { icdCode: "K04.0", name: "Острый очаговый пульпит" },
			toothNumber: 46,
			reason: "Зондирование дна полости болезненно, реакция на холод свыше 1 мин",
			actorUserId: "doctor-uuid-100",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "diagnosis_change");
		assert.strictEqual(entry.entityId, "rec-777");
		assert.strictEqual((entry.details as any).toothNumber, 46);
		assert.strictEqual((entry.details as any).icdCode, "K04.0");
		assert.deepStrictEqual((entry.details as any).oldState.icdCode, "K02.1");
	});

	it("3. Logs service add and remove in treatment plan with integer kopecks", () => {
		const addEntry = StaffActionAuditService.logServiceAdd({
			patientId: "patient-uuid-003",
			planId: "plan-555",
			serviceCode: "A16.07.002",
			serviceName: "Восстановление зуба пломбой светоотверждаемой",
			amountKopecks: 650000,
			quantity: 1,
			toothNumber: 24,
		});

		assert.ok(addEntry);
		assert.strictEqual(addEntry.actionType, "service_add");
		assert.strictEqual((addEntry.details as any).amountKopecks, 650000);
		assert.strictEqual((addEntry.details as any).toothNumber, 24);

		const removeEntry = StaffActionAuditService.logServiceRemove({
			patientId: "patient-uuid-003",
			planId: "plan-555",
			serviceCode: "A16.07.002",
			reason: "Пациент отказался от реставрации в пользу ортопедии",
		});

		assert.ok(removeEntry);
		assert.strictEqual(removeEntry.actionType, "service_remove");
		assert.strictEqual(removeEntry.reason, "Пациент отказался от реставрации в пользу ортопедии");
	});

	it("4. Logs discount application with percentage and reason", () => {
		const entry = StaffActionAuditService.logDiscountApply({
			patientId: "patient-uuid-004",
			billId: "bill-888",
			discountPercent: 15,
			discountAmountKopecks: 150000,
			originalAmountKopecks: 1000000,
			finalAmountKopecks: 850000,
			reason: "Программа лояльности клиники (ветеран труда)",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "discount_apply");
		assert.strictEqual((entry.details as any).discountPercent, 15);
		assert.strictEqual((entry.details as any).finalAmountKopecks, 850000);
		assert.strictEqual(entry.reason, "Программа лояльности клиники (ветеран труда)");
	});

	it("5. Logs payment receive and payment refund", () => {
		const payEntry = StaffActionAuditService.logPaymentReceive({
			patientId: "patient-uuid-005",
			billId: "bill-900",
			amountKopecks: 2400000,
			paymentMethod: "card",
			fiscalReceiptNumber: "ФД-124991",
		});

		assert.ok(payEntry);
		assert.strictEqual(payEntry.actionType, "payment_receive");
		assert.strictEqual((payEntry.details as any).amountKopecks, 2400000);
		assert.strictEqual((payEntry.details as any).fiscalReceiptNumber, "ФД-124991");

		const refundEntry = StaffActionAuditService.logPaymentRefund({
			patientId: "patient-uuid-005",
			billId: "bill-900",
			amountKopecks: 2400000,
			paymentMethod: "card",
			reason: "Ошибочное списание по терминалу",
		});

		assert.ok(refundEntry);
		assert.strictEqual(refundEntry.actionType, "payment_refund");
		assert.strictEqual(refundEntry.reason, "Ошибочное списание по терминалу");
	});

	it("6. Logs shift open and shift close for cashier/doctor shifts", () => {
		const openEntry = StaffActionAuditService.logShiftOpen({
			cashRegisterId: "kkt-atold-01",
			shiftNumber: 42,
			openingCashKopecks: 500000,
		});

		assert.ok(openEntry);
		assert.strictEqual(openEntry.actionType, "shift_open");
		assert.strictEqual((openEntry.details as any).shiftNumber, "42");
		assert.strictEqual((openEntry.details as any).amountKopecks, 500000);

		const closeEntry = StaffActionAuditService.logShiftClose({
			cashRegisterId: "kkt-atold-01",
			shiftNumber: 42,
			totalRevenueKopecks: 38000000,
			closingCashKopecks: 43000000,
		});

		assert.ok(closeEntry);
		assert.strictEqual(closeEntry.actionType, "shift_close");
		assert.strictEqual((closeEntry.details as any).totalRevenueKopecks, 38000000);
	});

	it("7. Logs appointment cancellation with mandatory reason", () => {
		const entry = StaffActionAuditService.logAppointmentCancel({
			appointmentId: "appt-333",
			patientId: "patient-uuid-007",
			reason: "Пациент заболел ОРВИ, перенос на следующую неделю",
			scheduledTime: "2026-10-05T10:00:00.000Z",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "appointment_cancel");
		assert.strictEqual(entry.entityId, "appt-333");
		assert.strictEqual(entry.reason, "Пациент заболел ОРВИ, перенос на следующую неделю");
	});

	it("8. Logs document print and document export", () => {
		const printEntry = StaffActionAuditService.logDocumentPrint({
			patientId: "patient-uuid-008",
			documentType: "tax_certificate_2026",
			documentId: "doc-spravka-401",
			title: "Справка об оплате медицинских услуг для налогового вычета",
		});

		assert.ok(printEntry);
		assert.strictEqual(printEntry.actionType, "document_print");
		assert.strictEqual((printEntry.details as any).documentType, "tax_certificate_2026");

		const exportEntry = StaffActionAuditService.logDocumentExport({
			exportType: "patient_registry_csv",
			recordCount: 154,
			format: "csv",
			reason: "Годовой статистический отчет по форме 30",
		});

		assert.ok(exportEntry);
		assert.strictEqual(exportEntry.actionType, "document_export");
		assert.strictEqual((exportEntry.details as any).recordCount, 154);
		assert.strictEqual((exportEntry.details as any).format, "csv");
	});

	it("9. Persists in localStorage offline queue and reports pending count", () => {
		StaffActionAuditService.logEmrOpen({
			patientId: "patient-persistence-01",
			cardId: "card-pers-01",
		});

		const pendingCount = StaffActionAuditService.getPendingCount();
		assert.ok(pendingCount > 0, "Pending count must reflect newly logged actions");

		const storedRaw = storageMap.get(OFFLINE_STAFF_AUDIT_STORAGE_KEY);
		assert.ok(storedRaw, "Events must be written to localStorage buffer");
		const parsed = JSON.parse(storedRaw);
		assert.ok(Array.isArray(parsed));
		assert.ok(parsed.length > 0);
	});

	it("10. Logs appointment creation with scheduled time and doctor attribution", () => {
		const entry = StaffActionAuditService.logAppointmentCreate({
			appointmentId: "appt-create-101",
			patientId: "patient-uuid-010",
			scheduledTime: "2026-10-10T14:30:00.000Z",
			doctorUserId: "doctor-uuid-200",
			reason: "Консультация ортодонта",
			actorUserId: "admin-uuid-001",
			actorRole: "administrator",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "appointment_create");
		assert.strictEqual(entry.entityType, "appointment");
		assert.strictEqual(entry.entityId, "appt-create-101");
		assert.strictEqual(entry.patientId, "patient-uuid-010");
		assert.strictEqual(entry.actorRole, "administrator");
		assert.strictEqual((entry.details as any).doctorUserId, "doctor-uuid-200");
		assert.strictEqual((entry.details as any).scheduledTime, "2026-10-10T14:30:00.000Z");
	});

	it("11. Logs appointment reschedule with old and new timestamps", () => {
		const entry = StaffActionAuditService.logAppointmentReschedule({
			appointmentId: "appt-resched-102",
			patientId: "patient-uuid-011",
			oldTime: "2026-10-10T14:30:00.000Z",
			newTime: "2026-10-12T16:00:00.000Z",
			reason: "Просьба пациента в связи с командировкой",
			actorUserId: "admin-uuid-001",
			actorRole: "administrator",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "appointment_reschedule");
		assert.strictEqual(entry.entityId, "appt-resched-102");
		assert.strictEqual((entry.details as any).oldTime, "2026-10-10T14:30:00.000Z");
		assert.strictEqual((entry.details as any).newTime, "2026-10-12T16:00:00.000Z");
		assert.strictEqual(entry.reason, "Просьба пациента в связи с командировкой");
	});

	it("12. Logs appointment deletion with justification", () => {
		const entry = StaffActionAuditService.logAppointmentDelete({
			appointmentId: "appt-delete-103",
			patientId: "patient-uuid-012",
			reason: "Дублирующая запись, созданная по ошибке",
			actorUserId: "admin-uuid-001",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "appointment_delete");
		assert.strictEqual(entry.entityId, "appt-delete-103");
		assert.strictEqual(entry.reason, "Дублирующая запись, созданная по ошибке");
	});

	it("13. Logs revision protocol «Исправленному верить» for medical diary", () => {
		const entry = StaffActionAuditService.logRevisionSaved({
			patientId: "patient-uuid-013",
			visitId: "visit-uuid-500",
			revisionReason: "Уточнение описания окклюзионных контактов",
			actorUserId: "doctor-uuid-100",
			actorRole: "doctor",
		});

		assert.ok(entry);
		assert.strictEqual(entry.actionType, "diary_revision");
		assert.strictEqual(entry.entityType, "diary_revision");
		assert.strictEqual(entry.entityId, "visit-uuid-500");
		assert.strictEqual((entry.details as any).protocol, "Исправленному верить");
	});

	it("14. Dual persistence mirrors to both canonical and legacy keys", () => {
		StaffActionAuditService.logEmrOpen({
			patientId: "patient-dual-01",
			cardId: "card-dual-01",
		});

		// Both keys must be populated
		const legacyRaw = storageMap.get(OFFLINE_STAFF_AUDIT_STORAGE_KEY);
		const canonicalRaw = storageMap.get("dente_staff_audit_events_v1");

		assert.ok(legacyRaw, "Legacy buffer must be present");
		assert.ok(canonicalRaw, "Canonical buffer must be present");

		const legacyParsed = JSON.parse(legacyRaw);
		const canonicalParsed = JSON.parse(canonicalRaw);

		assert.strictEqual(legacyParsed.length, canonicalParsed.length);
	});

	it("15. Non-blocking Doctor Autonomy: never throws on corrupted inputs or storage errors", () => {
		// Mock throwing storage
		const brokenStorage = {
			...mockLocalStorage,
			setItem: () => {
				throw new Error("QuotaExceededError: LocalStorage limit reached");
			},
		};
		(globalThis as any).localStorage = brokenStorage;

		const result = StaffActionAuditService.logAction({
			actionType: "custom_action",
			entityType: "resilience_check",
			entityId: "res-001",
		});

		// Must not throw, returns entry or null
		assert.ok(result);

		// Restore mock
		(globalThis as any).localStorage = mockLocalStorage;
	});
});
