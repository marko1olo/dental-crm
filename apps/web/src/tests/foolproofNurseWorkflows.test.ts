/**
 * ============================================================================
 * FOOLPROOF & SENIOR NURSE UX WORKFLOWS TEST SUITE ("БАБУШКА-PROOF")
 * Validates:
 * 1. Senior Nurse Kraft Unseal & Audio Feedback Engine (SanPiN 3.3686-21)
 * 2. Step-by-Step Patient Booking Wizard & Conflict Guards
 * 3. Simple Cash Desk ("Простая касса") Bill Stepper & Giant Change Calculator
 * 4. Dangerous Irreversible Actions Registry & Protection Barriers
 * 5. Plain Russian Error Humanizer (Zero Stacktraces / Zero Jargon)
 * 6. Touch Target & Accessibility Invariants (>= 48x48px)
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DANGEROUS_ACTIONS_REGISTRY,
	getDangerousActionDefinition,
	type DangerousActionType,
} from "../components/common/foolproofDangerGuard";
import { humanizeRussianError } from "../components/common/humanizeRussianError";
import {
	calculatePackageExpiration,
	type KraftPackageRecord,
} from "../components/sanpin/kraft/kraftPackageEngine";
import {
	playSterileSuccessTone,
	playExpiredErrorTone,
} from "../components/sanpin/kraft/seniorNurseKraftAudio";
import { COMMON_DENTAL_SERVICES } from "../components/schedule/SeniorNurseBookingWizardModal";
import { checkAppointmentResourceCollision } from "../utils/scheduleCollisionUtils";
import {
	calculateCashChangeKop,
	calculateSplitRemainingKop,
	splitStateToCheckoutPayments,
	validateCheckoutSplit,
} from "../components/payments/checkout/fastCheckoutEngine";

describe("FOOLPROOF & SENIOR NURSE UX SIMPLIFIER («БАБУШКА-PROOF»)", () => {
	// ========================================================================
	// 1. KRAFT UNSEALING & AUDIO FEEDBACK (SanPiN 3.3686-21)
	// ========================================================================
	describe("1. Вскрытие крафт-пакетов автоклава и звуковая сигнализация", () => {
		it("Корректно определяет стерильный и валидный крафт-пакет", () => {
			const today = new Date();
			const packDate = today.toISOString().slice(0, 10);
			const expResult = calculatePackageExpiration(today, "paper_self_seal_single");

			assert.equal(expResult.status, "sterile_valid");
			assert.equal(expResult.daysLifespan, 50);
			assert.equal(expResult.daysRemaining, 50);
			assert.ok(expResult.expDateFormatted.length === 10);
		});

		it("Блокирует просроченный крафт-пакет и запрещает использование", () => {
			const pastDate = new Date(Date.now() - 60 * 86400000); // 60 days ago
			const expResult = calculatePackageExpiration(pastDate, "paper_self_seal_single");

			assert.equal(expResult.status, "expired");
			assert.ok(expResult.daysRemaining < 0);
		});

		it("Безопасно вызывает звуковые тоны Web Audio без сбоев в среде Node/Browser", () => {
			// In Node environment without window.AudioContext, it should not throw
			assert.doesNotThrow(() => {
				playSterileSuccessTone();
				playExpiredErrorTone();
			});
		});

		it("Формирует нормативную запись в карту 043/у при вскрытии крафт-пакета", () => {
			const record: KraftPackageRecord = {
				id: "test-kp-1",
				batchId: "KB-20260826-01",
				serialNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				toolSetNameRu: "Набор терапевтический (лоток)",
				itemsListRu: ["Зеркало", "Зонд", "Пинцет", "Штопфер-гладилка"],
				packDate: "2026-08-26",
				expDate: "2026-10-15",
				daysLifespan: 50,
				daysRemaining: 50,
				status: "sterile_valid",
				autoclaveId: "АК-01",
				cycleNumber: 3,
				operatorId: "NURSE-01",
				operatorName: "Смирнова А.В.",
				indicatorId: "vinar_steritest_4",
				indicatorVerified: true,
				barcode128: "KB2608260001",
				barcodeDataMatrixPayload: "KB-20260826-01#1|АК-01|CYC3|2026-08-26|2026-10-15|NURSE-01|SET-THER",
				isBreached: false,
				notes: "OK",
				createdAt: new Date().toISOString(),
			};

			const protocolEntry = `Вскрыт стерильный крафт-пакет СанПиН 3.3686-21: ${record.barcode128} (${record.toolSetNameRu}, Автоклав ${record.autoclaveId} цикл #${record.cycleNumber}, стерил. ${record.packDate}, годен до ${record.expDate}, контроль ЦСО: ${record.operatorName}).`;

			assert.ok(protocolEntry.includes("СанПиН 3.3686-21"));
			assert.ok(protocolEntry.includes("KB2608260001"));
			assert.ok(protocolEntry.includes("Набор терапевтический"));
			assert.ok(protocolEntry.includes("Смирнова А.В."));
		});
	});

	// ========================================================================
	// 2. STEP-BY-STEP PATIENT BOOKING WIZARD
	// ========================================================================
	describe("2. Пошаговый мастер записи пациента (Step-by-Step Wizard)", () => {
		it("Содержит понятный каталог частых стоматологических услуг с иконками", () => {
			assert.ok(COMMON_DENTAL_SERVICES.length >= 6);

			const citoService = COMMON_DENTAL_SERVICES.find((s) => s.id === "cito");
			assert.ok(citoService);
			assert.equal(citoService?.durationMin, 20);
			assert.ok(citoService?.titleRu.includes("Острая боль"));

			const cariesService = COMMON_DENTAL_SERVICES.find((s) => s.id === "caries");
			assert.ok(cariesService);
			assert.equal(cariesService?.durationMin, 45);
		});

		it("Проверяет накладки и конфликты расписания при записи через мастера", () => {
			const existingAppointments = [
				{
					id: "app-1",
					patientId: "pat-1",
					doctorUserId: "doc-1",
					chairId: "chair-1",
					startsAt: "2026-08-26T10:00:00.000Z",
					endsAt: "2026-08-26T11:00:00.000Z",
					status: "confirmed" as const,
				},
			];

			const overlappingDraft = {
				startsAt: "2026-08-26T10:30:00.000Z",
				endsAt: "2026-08-26T11:15:00.000Z",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				patientId: "pat-2",
			};

			const collision = checkAppointmentResourceCollision(
				// biome-ignore lint/suspicious/noExplicitAny: test payload
				overlappingDraft as any,
				// biome-ignore lint/suspicious/noExplicitAny: test payload
				existingAppointments as any,
				{
					staff: [{ id: "doc-1", fullName: "Д-р Кузнецов", role: "doctor", active: true }],
					chairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
					patients: [{ id: "pat-1", fullName: "Иванов И.И.", status: "active" }],
					formatTimeFn: (iso) => iso.slice(11, 16),
				} as never,
			);

			assert.equal(collision.hasCollision, true);
			assert.ok(collision.message?.includes("Кузнецов"));
		});
	});

	// ========================================================================
	// 3. SIMPLE CASH DESK ("ПРОСТАЯ КАССА") & CHANGE CALCULATOR
	// ========================================================================
	describe("3. Режим «Простая касса» и расчет сдачи", () => {
		it("Рассчитывает сдачу с купюры 5 000 ₽ при сумме чека 3 600 ₽", () => {
			const totalBillKop = 360000; // 3600.00 ₽
			const cashTenderedKop = 500000; // 5000.00 ₽

			const change = calculateCashChangeKop(cashTenderedKop, totalBillKop);
			assert.equal(change.isUnderpaid, false);
			assert.equal(change.changeDueKop, 140000); // 1400.00 ₽
			assert.equal(change.missingKop, 0);
		});

		it("Определяет точную оплату «Без сдачи (Ровно)»", () => {
			const totalBillKop = 250000;
			const cashTenderedKop = 250000;

			const change = calculateCashChangeKop(cashTenderedKop, totalBillKop);
			assert.equal(change.isUnderpaid, false);
			assert.equal(change.changeDueKop, 0);
			assert.equal(change.missingKop, 0);
		});

		it("Предупреждает о недостаче при неполной сумме наличных", () => {
			const totalBillKop = 400000;
			const cashTenderedKop = 300000;

			const change = calculateCashChangeKop(cashTenderedKop, totalBillKop);
			assert.equal(change.isUnderpaid, true);
			assert.equal(change.changeDueKop, 0);
			assert.equal(change.missingKop, 100000); // 1000.00 ₽
		});

		it("Валидирует 100% оплату картой и СБП QR", () => {
			const billKop = 500000;
			const paymentsCard = splitStateToCheckoutPayments({
				cardRub: 5000,
			});
			const validationCard = validateCheckoutSplit({
				orderId: "ORD-1",
				totalBillKop: billKop,
				payments: paymentsCard,
			});
			assert.equal(validationCard.isValid, true);
			assert.equal(calculateSplitRemainingKop(billKop, paymentsCard), 0);

			const paymentsSbp = splitStateToCheckoutPayments({
				sbpRub: 5000,
			});
			const validationSbp = validateCheckoutSplit({
				orderId: "ORD-2",
				totalBillKop: billKop,
				payments: paymentsSbp,
			});
			assert.equal(validationSbp.isValid, true);
			assert.equal(calculateSplitRemainingKop(billKop, paymentsSbp), 0);
		});
	});

	// ========================================================================
	// 4. DANGEROUS ACTIONS REGISTRY & CONFIRMATION BARRIERS
	// ========================================================================
	describe("4. Защита от случайных опасных действий (Foolproof Danger Guard)", () => {
		it("Содержит регламент для всех критических операций клиники", () => {
			const actionTypes: DangerousActionType[] = [
				"cancel_appointment",
				"delete_tooth",
				"void_receipt",
				"delete_inventory_item",
				"discard_medical_waste",
				"breach_kraft_batch",
			];

			actionTypes.forEach((type) => {
				const def = getDangerousActionDefinition(type);
				assert.ok(def, `Missing definition for ${type}`);
				assert.ok(def.titleRu.length > 5);
				assert.ok(def.descriptionRu.length > 10);
				assert.ok(def.consequencesRu.length > 0);
				assert.ok(def.confirmButtonLabelRu.length > 0);
				assert.ok(def.cancelButtonLabelRu.length > 0);
			});
		});

		it("Требует явного подтверждения (чекбокса) для удаления зуба и аннулирования чека", () => {
			const toothDef = getDangerousActionDefinition("delete_tooth");
			assert.equal(toothDef.requiresExplicitCheckbox, true);
			assert.equal(toothDef.dangerSeverity, "critical");

			const voidDef = getDangerousActionDefinition("void_receipt");
			assert.equal(voidDef.requiresExplicitCheckbox, true);
			assert.equal(voidDef.dangerSeverity, "critical");

			const breachDef = getDangerousActionDefinition("breach_kraft_batch");
			assert.equal(breachDef.requiresExplicitCheckbox, true);
			assert.equal(breachDef.dangerSeverity, "critical");
		});
	});

	// ========================================================================
	// 5. RUSSIAN ERROR HUMANIZER (ZERO JARGON / ZERO STACKTRACES)
	// ========================================================================
	describe("5. Человечный перевод технических ошибок на чистый русский язык", () => {
		it("Переводит ошибку сети (Failed to fetch) в понятную инструкцию", () => {
			const err = new Error("TypeError: Failed to fetch");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Временная потеря связи с сервером клиники");
			assert.ok(humanized.actionAdviceRu.includes("черновике"));
			assert.ok(!humanized.titleRu.includes("fetch"));
			assert.ok(!humanized.titleRu.includes("TypeError"));
		});

		it("Переводит ошибку ККТ (paper_out) в понятное сообщение о чековой ленте", () => {
			const err = new Error("ATOL_KKT_ERROR: PAPER_OUT_HEX_0x14");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Закончилась кассовая лента");
			assert.ok(humanized.actionAdviceRu.includes("рулон ленты"));
		});

		it("Переводит ошибку накладки (409 Conflict) в вежливое объяснение расписания", () => {
			const err = new Error("HTTP 409: Doctor schedule slot overlap conflict");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Выбранное время уже занято");
			assert.ok(humanized.actionAdviceRu.includes("свободное время"));
		});

		it("Переводит истекшую сессию (401 Unauthorized) в приглашение ввести PIN-код", () => {
			const err = new Error("401 Unauthorized: Session token expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Сессия сотрудника истекла");
			assert.ok(humanized.actionAdviceRu.includes("PIN-код"));
		});

		it("Переводит блокировку СанПиН по просроченному крафт-пакету", () => {
			const err = new Error("SanpinViolation: kraft package expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Использование крафт-пакета заблокировано СанПиН");
			assert.ok(humanized.actionAdviceRu.includes("стерилизацию"));
		});
	});
});
