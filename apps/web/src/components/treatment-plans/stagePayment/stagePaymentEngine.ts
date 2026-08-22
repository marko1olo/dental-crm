/**
 * stagePaymentEngine.ts — Kopeck-exact Escrow, Stage Payment Allocation & 54-FZ Engine.
 * 
 * НОРМАТИВНАЯ И ФИНАНСОВАЯ ЛОГИКА:
 * • Все расчеты проводятся строго в целых копейках (Kopecks) для исключения накопления ошибки float.
 * • ГК РФ ст. 709/711 — разделение сметы на авансовые взносы и окончательный расчет.
 * • Закон РФ № 2300-1 ст. 32 — расчет возврата аванса при расторжении за вычетом фактически понесенных расходов клиники (Lab/BOM).
 * • 54-ФЗ — формирование чеков предоплаты (тег 1214: 1, 2) и полного расчета (тег 1214: 4).
 * • Экспорт графика в CSV по стандарту RFC 4180 с UTF-8 BOM (\uFEFF).
 */

import {
	type Kopecks,
	formatKopecksRu,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	rublesToKopecks,
	sumKopecks,
} from "@dental/shared";
import {
	type FiscalAdvanceTag,
	type StagePaymentKind,
	type StagePaymentPreset,
	type StagePaymentStatus,
	STAGE_PAYMENT_PRESETS,
	getStagePresetByKind,
} from "./stagePaymentPresets.js";

export interface TreatmentStageItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string;
	readonly toothNumber?: number;
	readonly quantity: number;
	readonly priceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly labCostKopecks?: Kopecks;
	readonly materialCostKopecks?: Kopecks;
}

export interface MilestoneStage {
	readonly id: string;
	readonly stageNumber: number;
	readonly kind: StagePaymentKind;
	readonly title: string;
	readonly status: StagePaymentStatus;
	readonly totalKopecks: Kopecks;
	readonly advanceRequiredKopecks: Kopecks;
	readonly advancePaidKopecks: Kopecks;
	readonly escrowLockedKopecks: Kopecks;
	readonly completionPaidKopecks: Kopecks;
	readonly actSignedAt?: string;
	readonly actNumber?: string;
	readonly directExpensesKopecks: {
		readonly labKopecks: Kopecks;
		readonly materialsKopecks: Kopecks;
		readonly otherKopecks: Kopecks;
	};
	readonly items: readonly TreatmentStageItem[];
	readonly notes?: string;
}

export interface PatientDepositWallet {
	readonly patientId: string;
	readonly availableDepositKopecks: Kopecks;
	readonly lockedEscrowKopecks: Kopecks;
	readonly totalBalanceKopecks: Kopecks;
}

export interface StagePaymentTotals {
	readonly grandTotalKopecks: Kopecks;
	readonly totalAdvanceRequiredKopecks: Kopecks;
	readonly totalAdvancePaidKopecks: Kopecks;
	readonly totalEscrowLockedKopecks: Kopecks;
	readonly totalActCompletedKopecks: Kopecks;
	readonly totalCompletionPaidKopecks: Kopecks;
	readonly totalPaidKopecks: Kopecks;
	readonly remainingDueKopecks: Kopecks;
	readonly progressPercent: number;
}

export interface TerminationExpenseItem {
	readonly title: string;
	readonly category: "lab_cadcam" | "implant_hardware" | "sterilization_materials" | "diagnostic";
	readonly amountKopecks: Kopecks;
	readonly justificationRu: string;
}

export interface TerminationRefundCalculation {
	readonly totalPaidByPatientKopecks: Kopecks;
	readonly completedActsTotalKopecks: Kopecks;
	readonly uncompletedAdvanceKopecks: Kopecks;
	readonly actualClinicExpensesKopecks: Kopecks;
	readonly itemizedExpenses: readonly TerminationExpenseItem[];
	readonly refundableToPatientKopecks: Kopecks;
	readonly clinicRetentionKopecks: Kopecks;
	readonly legalRationaleRu: string;
}

export interface FiscalReceiptItem {
	readonly name: string;
	readonly priceKopecks: Kopecks;
	readonly quantity: number;
	readonly totalKopecks: Kopecks;
	readonly fiscalTag1212: string; // 10: Платеж/Аванс, 4: Услуга
	readonly fiscalTag1214: string; // 1: Предоплата 100%, 2: Предоплата частичная, 4: Полный расчет
}

export interface StageFiscalReceipt54Fz {
	readonly receiptId: string;
	readonly timestamp: string;
	readonly patientName: string;
	readonly clinicInn: string;
	readonly clinicName: string;
	readonly stageTitle: string;
	readonly stageKind: StagePaymentKind;
	readonly calculationSign: "ПРЕДОПЛАТА 100%" | "ПРЕДОПЛАТА" | "ПОЛНЫЙ РАСЧЕТ";
	readonly taxationSystem: "УСН Доходы" | "УСН Доходы-Расходы" | "ОСНО";
	readonly vatRate: string;
	readonly totalAmountKopecks: Kopecks;
	readonly paymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR";
	readonly items: readonly FiscalReceiptItem[];
	readonly qrPayload: string;
	readonly fnNumber: string;
	readonly fdNumber: string;
	readonly fpd: string;
}

/**
 * Валидация допустимости перехода между статусами этапа
 */
export function validateStageStateTransition(
	currentStatus: StagePaymentStatus,
	targetStatus: StagePaymentStatus,
): { allowed: boolean; reasonRu?: string } {
	if (currentStatus === targetStatus) {
		return { allowed: true };
	}

	const allowedTransitions: Record<StagePaymentStatus, readonly StagePaymentStatus[]> = {
		draft: ["advance_paid", "in_progress", "act_completed", "fully_paid", "refunded"],
		advance_paid: ["in_progress", "act_completed", "fully_paid", "refunded", "draft"],
		in_progress: ["act_completed", "fully_paid", "refunded", "advance_paid"],
		act_completed: ["fully_paid", "refunded"],
		fully_paid: ["refunded"],
		refunded: ["draft"],
	};

	const allowed = allowedTransitions[currentStatus]?.includes(targetStatus) ?? false;

	if (!allowed) {
		return {
			allowed: false,
			reasonRu: `Переход из статуса "${currentStatus}" в "${targetStatus}" запрещен нормативным регламентом.`,
		};
	}

	return { allowed: true };
}

/**
 * Kopeck-exact расчет сводных финансовых показателей по всем этапам
 */
export function calculateStagePaymentTotals(
	stages: readonly MilestoneStage[],
): StagePaymentTotals {
	let grandTotal = 0;
	let totalAdvanceRequired = 0;
	let totalAdvancePaid = 0;
	let totalEscrowLocked = 0;
	let totalActCompleted = 0;
	let totalCompletionPaid = 0;

	for (const stage of stages) {
		grandTotal += stage.totalKopecks;
		totalAdvanceRequired += stage.advanceRequiredKopecks;
		totalAdvancePaid += stage.advancePaidKopecks;
		totalEscrowLocked += stage.escrowLockedKopecks;
		totalCompletionPaid += stage.completionPaidKopecks;

		if (stage.status === "act_completed" || stage.status === "fully_paid") {
			totalActCompleted += stage.totalKopecks;
		}
	}

	const totalPaid = totalAdvancePaid + totalCompletionPaid;
	const remainingDue = Math.max(0, grandTotal - totalPaid);
	const progressPercent =
		grandTotal > 0
			? Math.min(100, Math.round((totalActCompleted / grandTotal) * 100))
			: 0;

	return {
		grandTotalKopecks: grandTotal,
		totalAdvanceRequiredKopecks: totalAdvanceRequired,
		totalAdvancePaidKopecks: totalAdvancePaid,
		totalEscrowLockedKopecks: totalEscrowLocked,
		totalActCompletedKopecks: totalActCompleted,
		totalCompletionPaidKopecks: totalCompletionPaid,
		totalPaidKopecks: totalPaid,
		remainingDueKopecks: remainingDue,
		progressPercent,
	};
}

/**
 * Распределение свободного депозита пациента по этапам в порядке приоритета
 */
export function allocatePatientDepositToStages(
	stages: readonly MilestoneStage[],
	deposit: PatientDepositWallet,
): {
	readonly updatedStages: readonly MilestoneStage[];
	readonly updatedDeposit: PatientDepositWallet;
	readonly allocatedLog: readonly { stageId: string; amountKopecks: Kopecks; reason: string }[];
} {
	let available = deposit.availableDepositKopecks;
	let lockedEscrow = deposit.lockedEscrowKopecks;
	const log: { stageId: string; amountKopecks: Kopecks; reason: string }[] = [];

	const updatedStages: MilestoneStage[] = stages.map((stage) => {
		if (available <= 0 || stage.status === "fully_paid" || stage.status === "refunded") {
			return stage;
		}

		// 1. Покрываем обязательный аванс этапа, если он еще не внесен полностью
		const unpaidAdvance = Math.max(0, stage.advanceRequiredKopecks - stage.advancePaidKopecks);
		let currentAdvancePaid = stage.advancePaidKopecks;
		let currentEscrowLocked = stage.escrowLockedKopecks;
		let currentCompletionPaid = stage.completionPaidKopecks;
		let currentStatus: StagePaymentStatus = stage.status;

		if (unpaidAdvance > 0 && available > 0) {
			const toAllocateAdvance = Math.min(available, unpaidAdvance);
			available -= toAllocateAdvance;
			currentAdvancePaid += toAllocateAdvance;
			currentEscrowLocked += toAllocateAdvance;
			lockedEscrow += toAllocateAdvance;

			log.push({
				stageId: stage.id,
				amountKopecks: toAllocateAdvance,
				reason: `Покрытие аванса этапа №${stage.stageNumber} "${stage.title}"`,
			});

			if (currentAdvancePaid >= stage.advanceRequiredKopecks && currentStatus === "draft") {
				currentStatus = "advance_paid";
			}
		}

		// 2. Если аванс закрыт, а этап уже принят по акту (или разрешена полная предоплата), покрываем остаток
		const unpaidTotal = Math.max(
			0,
			stage.totalKopecks - (currentAdvancePaid + currentCompletionPaid),
		);

		if (unpaidTotal > 0 && available > 0 && (currentStatus === "act_completed" || currentStatus === "advance_paid" || currentStatus === "in_progress")) {
			const toAllocateRemaining = Math.min(available, unpaidTotal);
			available -= toAllocateRemaining;
			currentCompletionPaid += toAllocateRemaining;

			log.push({
				stageId: stage.id,
				amountKopecks: toAllocateRemaining,
				reason: `Окончательный расчет по этапу №${stage.stageNumber} "${stage.title}"`,
			});

			if (currentAdvancePaid + currentCompletionPaid >= stage.totalKopecks) {
				currentStatus = currentStatus === "act_completed" ? "fully_paid" : currentStatus;
			}
		}

		return {
			...stage,
			advancePaidKopecks: currentAdvancePaid,
			escrowLockedKopecks: currentEscrowLocked,
			completionPaidKopecks: currentCompletionPaid,
			status: currentStatus,
		};
	});

	const updatedDeposit: PatientDepositWallet = {
		patientId: deposit.patientId,
		availableDepositKopecks: available,
		lockedEscrowKopecks: lockedEscrow,
		totalBalanceKopecks: available + lockedEscrow,
	};

	return {
		updatedStages,
		updatedDeposit,
		allocatedLog: log,
	};
}

/**
 * Закрытие этапа актом выполненных работ (ст. 720 ГК РФ)
 * Разблокирует замороженный эскроу-депозит и признает выручку клиники
 */
export function closeStageWithCompletedAct(
	stage: MilestoneStage,
	actNumber: string,
	actDate?: string,
): {
	readonly updatedStage: MilestoneStage;
	readonly releasedEscrowKopecks: Kopecks;
	readonly recognizedRevenueKopecks: Kopecks;
} {
	const releasedEscrow = stage.escrowLockedKopecks;
	const recognizedRevenue = stage.totalKopecks;
	const isFullyPaid = stage.advancePaidKopecks + stage.completionPaidKopecks >= stage.totalKopecks;

	const updatedStage: MilestoneStage = {
		...stage,
		status: isFullyPaid ? "fully_paid" : "act_completed",
		escrowLockedKopecks: 0,
		actNumber: actNumber.trim() || `АКТ-ЭТ-${stage.stageNumber}-${Date.now().toString().slice(-4)}`,
		actSignedAt: actDate || new Date().toISOString(),
	};

	return {
		updatedStage,
		releasedEscrowKopecks: releasedEscrow,
		recognizedRevenueKopecks: recognizedRevenue,
	};
}

/**
 * Расчет суммы возврата при досрочном расторжении договора (ст. 32 Закона РФ № 2300-1 и ст. 709 ГК РФ)
 * Возврат аванса за вычетом фактически понесенных клиникой расходов (Lab/BOM)
 */
export function calculateTerminationRefund(
	stages: readonly MilestoneStage[],
	actualCustomExpenses?: readonly TerminationExpenseItem[],
): TerminationRefundCalculation {
	let totalPaidByPatient = 0;
	let completedActsTotal = 0;
	let uncompletedAdvance = 0;
	let calculatedClinicExpenses = 0;
	const itemizedExpenses: TerminationExpenseItem[] = [];

	for (const stage of stages) {
		const stagePaid = stage.advancePaidKopecks + stage.completionPaidKopecks;
		totalPaidByPatient += stagePaid;

		if (stage.status === "act_completed" || stage.status === "fully_paid") {
			// Выполненные и принятые по акту этапы не подлежат возврату
			completedActsTotal += stage.totalKopecks;
		} else {
			// Незавершенные этапы — авансы подлежат возврату за вычетом прямых расходов
			uncompletedAdvance += stagePaid;

			// Считаем прямые затраты клиники по незавершенному этапу только если работы были начаты или внесен аванс
			if (stage.status !== "draft" || stagePaid > 0) {
				const labCost = stage.directExpensesKopecks.labKopecks;
				const materialsCost = stage.directExpensesKopecks.materialsKopecks;
				const otherCost = stage.directExpensesKopecks.otherKopecks;

				if (labCost > 0) {
					calculatedClinicExpenses += labCost;
					itemizedExpenses.push({
						title: `Лабораторные расходы CAD/CAM (Этап №${stage.stageNumber})`,
						category: "lab_cadcam",
						amountKopecks: labCost,
						justificationRu: `Оплата фрезерования и моделирования в зуботехнической лаборатории по наряду этапа №${stage.stageNumber}`,
					});
				}

				if (materialsCost > 0) {
					calculatedClinicExpenses += materialsCost;
					itemizedExpenses.push({
						title: `Расходные материалы и стерилизация (Этап №${stage.stageNumber})`,
						category: "sterilization_materials",
						amountKopecks: materialsCost,
						justificationRu: `Списание индивидуальных стерильных наборов и боров по этапу №${stage.stageNumber}`,
					});
				}

				if (otherCost > 0) {
					calculatedClinicExpenses += otherCost;
					itemizedExpenses.push({
						title: `Имплантологические компоненты и диагностика (Этап №${stage.stageNumber})`,
						category: "implant_hardware",
						amountKopecks: otherCost,
						justificationRu: `Закупка индивидуальных компонентов и хирургических шаблонов под этап №${stage.stageNumber}`,
					});
				}
			}
		}
	}

	// Если переданы кастомные подтвержденные расходы, добавляем их
	if (actualCustomExpenses && actualCustomExpenses.length > 0) {
		for (const exp of actualCustomExpenses) {
			calculatedClinicExpenses += exp.amountKopecks;
			itemizedExpenses.push(exp);
		}
	}

	// Итоговый расчет возврата
	const clinicRetention = Math.min(uncompletedAdvance, calculatedClinicExpenses);
	const refundableToPatient = Math.max(0, uncompletedAdvance - clinicRetention);

	const legalRationaleRu = `В соответствии со ст. 32 Закона РФ от 07.02.1992 № 2300-1 "О защите прав потребителей" и ст. 709 ГК РФ Потребитель вправе отказаться от исполнения договора о выполнении работ в любое время при условии оплаты исполнителю фактически понесенных им расходов, связанных с исполнением обязательств по данному договору. Сумма ранее подписанных Актов выполненных работ (${formatKopecksRu(completedActsTotal)}) признана в полном объеме и возврату не подлежит. Из суммы внесенного аванса по незавершенным этапам (${formatKopecksRu(uncompletedAdvance)}) удержаны фактически понесенные клиникой затраты (${formatKopecksRu(clinicRetention)}). К возврату пациенту: ${formatKopecksRu(refundableToPatient)}.`;

	return {
		totalPaidByPatientKopecks: totalPaidByPatient,
		completedActsTotalKopecks: completedActsTotal,
		uncompletedAdvanceKopecks: uncompletedAdvance,
		actualClinicExpensesKopecks: calculatedClinicExpenses,
		itemizedExpenses,
		refundableToPatientKopecks: refundableToPatient,
		clinicRetentionKopecks: clinicRetention,
		legalRationaleRu,
	};
}

/**
 * Формирование фискального чека 54-ФЗ для этапа оплаты
 */
export function generate54FzStageFiscalReceipt(
	stage: MilestoneStage,
	paymentType: "advance" | "completion" | "full",
	paymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR" = "BANK_CARD",
	clinicInn = "7701234567",
	patientName = "Иванов Иван Иванович",
	clinicName = "ООО 'ДЕНТЕ СТОМАТОЛОГИЯ'",
): StageFiscalReceipt54Fz {
	const now = new Date();
	const timestamp = now.toISOString();
	const preset = getStagePresetByKind(stage.kind);

	let calculationSign: "ПРЕДОПЛАТА 100%" | "ПРЕДОПЛАТА" | "ПОЛНЫЙ РАСЧЕТ";
	let fiscalTag1214: string;
	let fiscalTag1212: string;
	let amountKopecks: Kopecks;

	if (paymentType === "advance") {
		if (stage.advanceRequiredKopecks === stage.totalKopecks) {
			calculationSign = "ПРЕДОПЛАТА 100%";
			fiscalTag1214 = "1"; // Предоплата 100%
		} else {
			calculationSign = "ПРЕДОПЛАТА";
			fiscalTag1214 = "2"; // Предоплата частичная
		}
		fiscalTag1212 = "10"; // Платеж / Аванс
		amountKopecks = stage.advancePaidKopecks > 0 ? stage.advancePaidKopecks : stage.advanceRequiredKopecks;
	} else if (paymentType === "completion") {
		calculationSign = "ПОЛНЫЙ РАСЧЕТ";
		fiscalTag1214 = "4"; // Полный расчет
		fiscalTag1212 = "4"; // Услуга
		amountKopecks = Math.max(0, stage.totalKopecks - stage.advancePaidKopecks);
	} else {
		calculationSign = "ПОЛНЫЙ РАСЧЕТ";
		fiscalTag1214 = "4";
		fiscalTag1212 = "4";
		amountKopecks = stage.totalKopecks;
	}

	const itemName =
		paymentType === "advance"
			? `Аванс за медицинские услуги: ${stage.title}`
			: `Окончательный расчет: ${stage.title}`;

	const receiptItem: FiscalReceiptItem = {
		name: itemName,
		priceKopecks: amountKopecks,
		quantity: 1,
		totalKopecks: amountKopecks,
		fiscalTag1212,
		fiscalTag1214,
	};

	const receiptId = `CHK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;
	const fnNumber = "9960440301824912";
	const fdNumber = String(Math.floor(10000 + Math.random() * 89999));
	const fpd = String(Math.floor(1000000000 + Math.random() * 8999999999));

	const qrPayload = `t=${now.toISOString().replace(/[-:T]/g, "").slice(0, 15)}&s=${(amountKopecks / 100).toFixed(2)}&fn=${fnNumber}&i=${fdNumber}&fp=${fpd}&n=1`;

	return {
		receiptId,
		timestamp,
		patientName,
		clinicInn,
		clinicName,
		stageTitle: stage.title,
		stageKind: stage.kind,
		calculationSign,
		taxationSystem: "УСН Доходы",
		vatRate: "НДС не облагается (ст. 149 НК РФ пп. 2 п. 2)",
		totalAmountKopecks: amountKopecks,
		paymentMethod,
		items: [receiptItem],
		qrPayload,
		fnNumber,
		fdNumber,
		fpd,
	};
}

/**
 * Экспорт графика платежей по стандарту RFC 4180 с UTF-8 BOM (\uFEFF)
 */
export function exportStageScheduleToCsv(
	stages: readonly MilestoneStage[],
	planTitle = "Комплексный план стоматологического лечения",
	patientName = "Пациент",
): string {
	const BOM = "\uFEFF";
	const escapeCsv = (str: string | number): string => {
		const val = String(str).replace(/"/g, '""');
		return `"${val}"`;
	};

	const headers = [
		"№ этапа",
		"Наименование этапа",
		"Вид лечения",
		"Статус оплаты",
		"Общая стоимость (руб)",
		"Требуемый аванс (руб)",
		"Внесенный аванс (руб)",
		"Заблокировано в эскроу (руб)",
		"Окончательная доплата (руб)",
		"Остаток к доплате (руб)",
		"Номер акта сдачи-приемки",
		"Дата подписания акта",
		"Правовое основание (ГК РФ)",
	];

	const rows: string[][] = [];

	// Заголовочный мета-блок
	rows.push([escapeCsv(`ПЛАН ПОЭТАПНОЙ ОПЛАТЫ: ${planTitle}`)]);
	rows.push([escapeCsv(`ПАЦИЕНТ: ${patientName}`)]);
	rows.push([escapeCsv(`ДАТА ФОРМИРОВАНИЯ: ${new Date().toLocaleDateString("ru-RU")}`)]);
	rows.push([]);
	rows.push(headers.map(escapeCsv));

	let grandTotal = 0;
	let totalAdvance = 0;
	let totalPaid = 0;

	for (const stage of stages) {
		const preset = getStagePresetByKind(stage.kind);
		const totalRub = stage.totalKopecks / 100;
		const advanceReqRub = stage.advanceRequiredKopecks / 100;
		const advancePaidRub = stage.advancePaidKopecks / 100;
		const escrowRub = stage.escrowLockedKopecks / 100;
		const completionRub = stage.completionPaidKopecks / 100;
		const dueRub = Math.max(0, (stage.totalKopecks - (stage.advancePaidKopecks + stage.completionPaidKopecks)) / 100);

		grandTotal += stage.totalKopecks;
		totalAdvance += stage.advancePaidKopecks;
		totalPaid += (stage.advancePaidKopecks + stage.completionPaidKopecks);

		rows.push([
			escapeCsv(stage.stageNumber),
			escapeCsv(stage.title),
			escapeCsv(preset.shortTitle),
			escapeCsv(stage.status),
			escapeCsv(totalRub.toFixed(2)),
			escapeCsv(advanceReqRub.toFixed(2)),
			escapeCsv(advancePaidRub.toFixed(2)),
			escapeCsv(escrowRub.toFixed(2)),
			escapeCsv(completionRub.toFixed(2)),
			escapeCsv(dueRub.toFixed(2)),
			escapeCsv(stage.actNumber || "-"),
			escapeCsv(stage.actSignedAt ? new Date(stage.actSignedAt).toLocaleDateString("ru-RU") : "-"),
			escapeCsv(preset.legalBasisRu),
		]);
	}

	rows.push([]);
	rows.push([
		escapeCsv("ИТОГО ПО ВСЕМ ЭТАПАМ:"),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv((grandTotal / 100).toFixed(2)),
		escapeCsv(""),
		escapeCsv((totalAdvance / 100).toFixed(2)),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(((grandTotal - totalPaid) / 100).toFixed(2)),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv("ГК РФ ст. 709, 711"),
	]);

	const csvContent = rows.map((r) => r.join(",")).join("\r\n");
	return BOM + csvContent;
}

/**
 * Инициализация стандартных клинических этапов по умолчанию
 */
export function createDefaultMilestoneStages(
	archetypes: readonly StagePaymentKind[] = [
		"stage_1_sanitation_therapy",
		"stage_2_surgery_implant",
		"stage_3_orthopedic_prosthetics",
	],
	customAmounts?: Partial<Record<StagePaymentKind, Kopecks>>,
): MilestoneStage[] {
	const defaultPrices: Record<StagePaymentKind, Kopecks> = {
		stage_1_sanitation_therapy: rublesToKopecks(28500),
		stage_2_surgery_implant: rublesToKopecks(85000),
		stage_3_orthopedic_prosthetics: rublesToKopecks(120000),
		stage_4_orthodontics_braces: rublesToKopecks(180000),
		stage_5_periodontics_maintenance: rublesToKopecks(15000),
	};

	return archetypes.map((kind, idx) => {
		const preset = getStagePresetByKind(kind);
		const totalKopecks = customAmounts?.[kind] ?? defaultPrices[kind];
		const advanceRequiredKopecks = percentageOfKopecks(
			totalKopecks,
			preset.defaultAdvancePercent * 100,
		);

		// Расчет примерных прямых расходов (Lab / Materials)
		const labKopecks = preset.cadCamLabSharePercent
			? percentageOfKopecks(totalKopecks, preset.cadCamLabSharePercent * 100)
			: 0;
		const materialsKopecks = preset.implantHardwareSharePercent
			? percentageOfKopecks(totalKopecks, preset.implantHardwareSharePercent * 100)
			: percentageOfKopecks(totalKopecks, 1500); // 15% на терапию

		return {
			id: `stage-${kind}-${idx + 1}`,
			stageNumber: idx + 1,
			kind,
			title: preset.title,
			status: "draft",
			totalKopecks,
			advanceRequiredKopecks,
			advancePaidKopecks: 0,
			escrowLockedKopecks: 0,
			completionPaidKopecks: 0,
			directExpensesKopecks: {
				labKopecks,
				materialsKopecks,
				otherKopecks: 0,
			},
			items: [
				{
					id: `item-${kind}-1`,
					name: preset.defaultItemsSummary,
					quantity: 1,
					priceKopecks: totalKopecks,
					totalKopecks,
					labCostKopecks: labKopecks,
					materialCostKopecks: materialsKopecks,
				},
			],
			notes: `Нормативная база: ${preset.legalBasisRu}`,
		};
	});
}
