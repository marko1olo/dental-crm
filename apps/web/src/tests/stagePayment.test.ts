/**
 * stagePayment.test.ts — Unit-тесты модуля поэтапной оплаты, эскроу-депозита и фискализации 54-ФЗ.
 * 
 * ПРОВЕРЯЕМЫЕ НОРМАТИВНЫЕ И АЛГОРИТМИЧЕСКИЕ ИНВАРИАНТЫ:
 * • ГК РФ ст. 709/711 — разделение сметы на аванс и постоплату, отсутствие float-погрешности (kopeck-exact).
 * • Закон РФ № 2300-1 ст. 32 — расчет возврата аванса за вычетом фактически понесенных расходов клиники (Lab/BOM).
 * • Эскроу-депозит: заморозка средств до подписания акта и высвобождение при признании выручки.
 * • 54-ФЗ — признаки способа расчета (тег 1214) и предмета расчета (тег 1212), освобождение от НДС (ст. 149 НК РФ).
 * • Экспорт CSV RFC 4180 с UTF-8 BOM (\uFEFF).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	type MilestoneStage,
	type PatientDepositWallet,
	type StagePaymentKind,
	type StagePaymentStatus,
	STAGE_PAYMENT_PRESETS,
	STAGE_STATUS_UI_MAP,
	allocatePatientDepositToStages,
	calculateStagePaymentTotals,
	calculateTerminationRefund,
	closeStageWithCompletedAct,
	createDefaultMilestoneStages,
	exportStageScheduleToCsv,
	generate54FzStageFiscalReceipt,
	getAllStagePaymentKinds,
	getStagePresetByKind,
	validateStageStateTransition,
} from "../components/treatment-plans/stagePayment/index.js";

describe("Statutory Treatment Plan Stage Payment & Escrow Engine", () => {
	// 1. ПРЕСЕТЫ И НОРМАТИВНАЯ БАЗА
	describe("1. Statutory Stage Presets & Archetypes", () => {
		it("все 5 клинических архетипов зарегистрированы с корректными нормативными процентами", () => {
			const kinds = getAllStagePaymentKinds();
			assert.equal(kinds.length, 5);
			assert.ok(kinds.includes("stage_1_sanitation_therapy"));
			assert.ok(kinds.includes("stage_2_surgery_implant"));
			assert.ok(kinds.includes("stage_3_orthopedic_prosthetics"));
			assert.ok(kinds.includes("stage_4_orthodontics_braces"));
			assert.ok(kinds.includes("stage_5_periodontics_maintenance"));

			// Терапия: 100% аванс
			const therapy = getStagePresetByKind("stage_1_sanitation_therapy");
			assert.equal(therapy.defaultAdvancePercent, 100);
			assert.equal(therapy.defaultCompletionPercent, 0);
			assert.equal(therapy.fiscalAdvanceTag, "PREPAYMENT_100");
			assert.ok(therapy.legalBasisRu.includes("ГК РФ"));

			// Хирургия: 50% аванс + 50% окончательный расчет
			const surgery = getStagePresetByKind("stage_2_surgery_implant");
			assert.equal(surgery.defaultAdvancePercent, 50);
			assert.equal(surgery.defaultCompletionPercent, 50);
			assert.equal(surgery.implantHardwareSharePercent, 50);
			assert.equal(surgery.fiscalAdvanceTag, "PREPAYMENT_PARTIAL");

			// Ортопедия: 50% аванс на CAD/CAM лабораторию + 50% при фиксации
			const orthopedics = getStagePresetByKind("stage_3_orthopedic_prosthetics");
			assert.equal(orthopedics.defaultAdvancePercent, 50);
			assert.equal(orthopedics.defaultCompletionPercent, 50);
			assert.equal(orthopedics.cadCamLabSharePercent, 40);

			// Ортодонтия: 30% первоначальный взнос + рассрочка
			const ortho = getStagePresetByKind("stage_4_orthodontics_braces");
			assert.equal(ortho.defaultAdvancePercent, 30);
			assert.equal(ortho.defaultCompletionPercent, 70);
			assert.equal(ortho.installmentsAllowed, true);

			// Пародонтология: 0% аванс / 100% по факту приема
			const perio = getStagePresetByKind("stage_5_periodontics_maintenance");
			assert.equal(perio.defaultAdvancePercent, 0);
			assert.equal(perio.defaultCompletionPercent, 100);
			assert.equal(perio.fiscalAdvanceTag, "FULL_SETTLEMENT");
		});

		it("getStagePresetByKind возвращает дефолтный пресет для неизвестного ключа", () => {
			const fallback = getStagePresetByKind("unknown_stage" as any);
			assert.equal(fallback.kind, "stage_1_sanitation_therapy");
		});

		it("метаданные статусов STAGE_STATUS_UI_MAP содержат все 6 состояний жизненного цикла", () => {
			const statuses: StagePaymentStatus[] = [
				"draft",
				"advance_paid",
				"in_progress",
				"act_completed",
				"fully_paid",
				"refunded",
			];

			for (const status of statuses) {
				const meta = STAGE_STATUS_UI_MAP[status];
				assert.ok(meta, `Метаданные для ${status} должны существовать`);
				assert.ok(meta.labelRu.length > 0);
				assert.ok(meta.badgeClass.length > 0);
			}
		});
	});

	// 2. ВАЛИДАЦИЯ ПЕРЕХОДОВ СТАТУСОВ
	describe("2. Stage State Transitions Validation", () => {
		it("разрешает корректный жизненный цикл draft -> advance_paid -> in_progress -> act_completed -> fully_paid", () => {
			assert.equal(validateStageStateTransition("draft", "advance_paid").allowed, true);
			assert.equal(validateStageStateTransition("advance_paid", "in_progress").allowed, true);
			assert.equal(validateStageStateTransition("in_progress", "act_completed").allowed, true);
			assert.equal(validateStageStateTransition("act_completed", "fully_paid").allowed, true);
		});

		it("разрешает переход в refunded из незавершенных состояний", () => {
			assert.equal(validateStageStateTransition("draft", "refunded").allowed, true);
			assert.equal(validateStageStateTransition("advance_paid", "refunded").allowed, true);
			assert.equal(validateStageStateTransition("in_progress", "refunded").allowed, true);
		});

		it("запрещает недопустимые переходы статусов", () => {
			const invalid1 = validateStageStateTransition("fully_paid", "draft");
			assert.equal(invalid1.allowed, false);
			assert.ok(invalid1.reasonRu?.includes("запрещен"));

			const invalid2 = validateStageStateTransition("act_completed", "draft");
			assert.equal(invalid2.allowed, false);
		});
	});

	// 3. KOPECK-EXACT РАСЧЕТ СВОДНЫХ ПОКАЗАТЕЛЕЙ
	describe("3. Kopeck-Exact Financial Totals Calculation", () => {
		it("рассчитывает итоговые суммы без накопления ошибок float", () => {
			const stages = createDefaultMilestoneStages();
			assert.equal(stages.length, 3);

			// Stage 1: 28 500.00 ₽ (2850000 коп), 100% аванс
			// Stage 2: 85 000.00 ₽ (8500000 коп), 50% аванс = 4250000 коп
			// Stage 3: 120 000.00 ₽ (12000000 коп), 50% аванс = 6000000 коп
			const totals = calculateStagePaymentTotals(stages);

			assert.equal(totals.grandTotalKopecks, rublesToKopecks(233500));
			assert.equal(totals.totalAdvanceRequiredKopecks, rublesToKopecks(28500 + 42500 + 60000));
			assert.equal(totals.totalAdvancePaidKopecks, 0);
			assert.equal(totals.totalEscrowLockedKopecks, 0);
			assert.equal(totals.totalActCompletedKopecks, 0);
			assert.equal(totals.totalPaidKopecks, 0);
			assert.equal(totals.remainingDueKopecks, rublesToKopecks(233500));
			assert.equal(totals.progressPercent, 0);
		});

		it("прогресс выполнения отражает процент закрытых актами этапов", () => {
			const stages = createDefaultMilestoneStages();
			// Закрываем этап 1 (28 500 ₽ из 233 500 ₽ = ~12.2% -> 12%)
			const updatedStages: MilestoneStage[] = [
				{
					...stages[0]!,
					status: "act_completed",
					advancePaidKopecks: stages[0]!.totalKopecks,
					completionPaidKopecks: 0,
				},
				stages[1]!,
				stages[2]!,
			];

			const totals = calculateStagePaymentTotals(updatedStages);
			assert.equal(totals.totalActCompletedKopecks, rublesToKopecks(28500));
			assert.equal(totals.progressPercent, 12);
		});
	});

	// 4. WATERFALL РАСПРЕДЕЛЕНИЕ ДЕПОЗИТА ПАЦИЕНТА И ЭСКРОУ
	describe("4. Patient Deposit & Waterfall Escrow Allocation", () => {
		it("распределяет свободный депозит по этапам в порядке приоритета", () => {
			const stages = createDefaultMilestoneStages();
			// Депозит: 50 000.00 ₽
			const deposit: PatientDepositWallet = {
				patientId: "PAT-001",
				availableDepositKopecks: rublesToKopecks(50000),
				lockedEscrowKopecks: 0,
				totalBalanceKopecks: rublesToKopecks(50000),
			};

			const result = allocatePatientDepositToStages(stages, deposit);

			// Этап 1 (Терапия, аванс 28 500 ₽) -> полностью покрыт (28 500 ₽) и заблокирован в эскроу
			const stage1 = result.updatedStages[0]!;
			assert.equal(stage1.advancePaidKopecks, rublesToKopecks(28500));
			assert.equal(stage1.escrowLockedKopecks, rublesToKopecks(28500));
			assert.equal(stage1.status, "advance_paid");

			// Этап 2 (Хирургия, аванс 42 500 ₽) -> частично покрыт остатком 21 500 ₽
			const stage2 = result.updatedStages[1]!;
			assert.equal(stage2.advancePaidKopecks, rublesToKopecks(21500));
			assert.equal(stage2.escrowLockedKopecks, rublesToKopecks(21500));

			// Этап 3 (Ортопедия) -> 0 ₽
			const stage3 = result.updatedStages[2]!;
			assert.equal(stage3.advancePaidKopecks, 0);

			// Депозит: 0 ₽ свободно, 50 000 ₽ заблокировано в эскроу
			assert.equal(result.updatedDeposit.availableDepositKopecks, 0);
			assert.equal(result.updatedDeposit.lockedEscrowKopecks, rublesToKopecks(50000));
			assert.equal(result.updatedDeposit.totalBalanceKopecks, rublesToKopecks(50000));
		});

		it("сохраняет балансовый инвариант: available + locked === totalBalance", () => {
			const stages = createDefaultMilestoneStages();
			const deposit: PatientDepositWallet = {
				patientId: "PAT-002",
				availableDepositKopecks: rublesToKopecks(250000), // Большой депозит
				lockedEscrowKopecks: 0,
				totalBalanceKopecks: rublesToKopecks(250000),
			};

			const result = allocatePatientDepositToStages(stages, deposit);
			const totalAllocated = result.allocatedLog.reduce((sum, item) => sum + item.amountKopecks, 0);

			assert.equal(
				result.updatedDeposit.availableDepositKopecks + result.updatedDeposit.lockedEscrowKopecks,
				result.updatedDeposit.totalBalanceKopecks,
			);
			assert.equal(result.updatedDeposit.lockedEscrowKopecks, rublesToKopecks(131000));
			assert.equal(totalAllocated, rublesToKopecks(233500));
		});
	});

	// 5. ЗАКРЫТИЕ ЭТАПА АКТОМ И ПРИЗНАНИЕ ВЫРУЧКИ
	describe("5. Completed Works Act Sign-Off & Escrow Release", () => {
		it("разблокирует эскроу-депозит и признает выручку клиники", () => {
			const stages = createDefaultMilestoneStages();
			const stage1 = stages[0]!;

			// Этап с внесенным авансом и эскроу
			const activeStage: MilestoneStage = {
				...stage1,
				status: "in_progress",
				advancePaidKopecks: stage1.totalKopecks,
				escrowLockedKopecks: stage1.totalKopecks,
			};

			const result = closeStageWithCompletedAct(activeStage, "АКТ-001/2026", "2026-08-22");

			assert.equal(result.updatedStage.status, "fully_paid");
			assert.equal(result.updatedStage.escrowLockedKopecks, 0);
			assert.equal(result.updatedStage.actNumber, "АКТ-001/2026");
			assert.equal(result.updatedStage.actSignedAt, "2026-08-22");
			assert.equal(result.releasedEscrowKopecks, stage1.totalKopecks);
			assert.equal(result.recognizedRevenueKopecks, stage1.totalKopecks);
		});
	});

	// 6. РАСЧЕТ ВОЗВРАТА ПРИ ДОСРОЧНОМ РАСТОРЖЕНИИ (СТ. 32 ЗАКОНА № 2300-1)
	describe("6. Statutory Termination Refund (Law 2300-1 Art. 32 & Civil Code 709)", () => {
		it("удерживает фактически понесенные расходы клиники (Lab/BOM) и возвращает остаток аванса", () => {
			const stages = createDefaultMilestoneStages();

			// Этап 1: закрыт по акту (28 500 ₽) — возврату НЕ подлежит
			const stage1: MilestoneStage = {
				...stages[0]!,
				status: "act_completed",
				advancePaidKopecks: stages[0]!.totalKopecks,
			};

			// Этап 2: аванс внесен (42 500 ₽), расходы на имплантаты и шаблон (30 000 ₽)
			const stage2: MilestoneStage = {
				...stages[1]!,
				status: "in_progress",
				advancePaidKopecks: rublesToKopecks(42500),
				escrowLockedKopecks: rublesToKopecks(42500),
				directExpensesKopecks: {
					labKopecks: 0,
					materialsKopecks: rublesToKopecks(25000), // Имплантат
					otherKopecks: rublesToKopecks(5000),     // Шаблон
				},
			};

			// Этап 3: черновик, оплат нет, прямых расходов нет
			const stage3: MilestoneStage = {
				...stages[2]!,
				directExpensesKopecks: {
					labKopecks: 0,
					materialsKopecks: 0,
					otherKopecks: 0,
				},
			};

			const refundCalc = calculateTerminationRefund([stage1, stage2, stage3]);

			assert.equal(refundCalc.totalPaidByPatientKopecks, rublesToKopecks(28500 + 42500));
			assert.equal(refundCalc.completedActsTotalKopecks, rublesToKopecks(28500));
			assert.equal(refundCalc.uncompletedAdvanceKopecks, rublesToKopecks(42500));
			assert.equal(refundCalc.actualClinicExpensesKopecks, rublesToKopecks(30000));
			assert.equal(refundCalc.clinicRetentionKopecks, rublesToKopecks(30000));
			// К возврату пациенту: 42 500 - 30 000 = 12 500 ₽
			assert.equal(refundCalc.refundableToPatientKopecks, rublesToKopecks(12500));
			assert.ok(refundCalc.legalRationaleRu.includes("ст. 32 Закона РФ"));
			assert.ok(refundCalc.legalRationaleRu.includes("ст. 709 ГК РФ"));
		});

		it("не допускает отрицательный возврат, если расходы превышают аванс", () => {
			const stages = createDefaultMilestoneStages();
			const stage2: MilestoneStage = {
				...stages[1]!,
				status: "in_progress",
				advancePaidKopecks: rublesToKopecks(10000), // Пациент внес только 10 000 ₽
				directExpensesKopecks: {
					labKopecks: 0,
					materialsKopecks: rublesToKopecks(35000), // Клиника потратила 35 000 ₽
					otherKopecks: 0,
				},
			};

			const refundCalc = calculateTerminationRefund([stage2]);
			assert.equal(refundCalc.refundableToPatientKopecks, 0);
			assert.equal(refundCalc.clinicRetentionKopecks, rublesToKopecks(10000));
		});
	});

	// 7. ФИСКАЛИЗАЦИЯ 54-ФЗ
	describe("7. 54-FZ Fiscal Receipt Generation", () => {
		it("генерирует чек на аванс 100% с тегом 1214: 1 и тегом 1212: 10", () => {
			const stages = createDefaultMilestoneStages();
			const stage1 = stages[0]!; // Терапия (100% аванс)

			const receipt = generate54FzStageFiscalReceipt(
				stage1,
				"advance",
				"BANK_CARD",
				"7701234567",
				"Петров П. П.",
			);

			assert.equal(receipt.calculationSign, "ПРЕДОПЛАТА 100%");
			assert.equal(receipt.totalAmountKopecks, stage1.totalKopecks);
			assert.equal(receipt.paymentMethod, "BANK_CARD");
			assert.equal(receipt.items[0]?.fiscalTag1214, "1");
			assert.equal(receipt.items[0]?.fiscalTag1212, "10");
			assert.ok(receipt.vatRate.includes("ст. 149 НК РФ"));
			assert.ok(receipt.qrPayload.startsWith("t="));
		});

		it("генерирует чек на окончательный расчет с тегом 1214: 4 и тегом 1212: 4", () => {
			const stages = createDefaultMilestoneStages();
			const stage2 = stages[1]!; // Хирургия (50% аванс)
			const activeStage: MilestoneStage = {
				...stage2,
				advancePaidKopecks: stage2.advanceRequiredKopecks,
			};

			const receipt = generate54FzStageFiscalReceipt(
				activeStage,
				"completion",
				"SBP_QR",
			);

			assert.equal(receipt.calculationSign, "ПОЛНЫЙ РАСЧЕТ");
			assert.equal(receipt.totalAmountKopecks, stage2.totalKopecks - stage2.advanceRequiredKopecks);
			assert.equal(receipt.paymentMethod, "SBP_QR");
			assert.equal(receipt.items[0]?.fiscalTag1214, "4");
			assert.equal(receipt.items[0]?.fiscalTag1212, "4");
		});
	});

	// 8. RFC 4180 CSV ЭКСПОРТ
	describe("8. RFC 4180 CSV Export with UTF-8 BOM", () => {
		it("формирует валидный CSV файл с UTF-8 BOM и экранированием", () => {
			const stages = createDefaultMilestoneStages();
			const csv = exportStageScheduleToCsv(stages, "План реабилитации", "Сидоров С. С.");

			// Проверка UTF-8 BOM (\uFEFF)
			assert.ok(csv.startsWith("\uFEFF"));

			// Проверка заголовков
			assert.ok(csv.includes("№ этапа"));
			assert.ok(csv.includes("Наименование этапа"));
			assert.ok(csv.includes("Общая стоимость (руб)"));
			assert.ok(csv.includes("Правовое основание (ГК РФ)"));

			// Проверка данных этапов
			assert.ok(csv.includes("Этап 1: Терапевтическая санация"));
			assert.ok(csv.includes("Этап 2: Хирургический этап"));
			assert.ok(csv.includes("Этап 3: Ортопедический этап"));
			assert.ok(csv.includes("ИТОГО ПО ВСЕМ ЭТАПАМ:"));
		});
	});
});
