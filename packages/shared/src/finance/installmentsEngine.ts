/**
 * installmentsEngine.ts — Kopeck-Exact Clinic Internal 0% Installments Engine.
 * 
 * ДОМЕН ВНУТРЕННЕЙ БЕСПРОЦЕНТНОЙ РАССРОЧКИ КЛИНИКИ:
 * В стоматологической практике (StomX patient/installments-list) дорогостоящие планы лечения:
 * • Брекет-системы (200 000 – 350 000 ₽)
 * • Элайнеры (250 000 – 400 000 ₽)
 * • Имплантация All-on-4 / All-on-6 (350 000 – 600 000 ₽)
 * • Тотальное протезирование цирконием (400 000 – 800 000 ₽)
 * часто оплачиваются пациентами во внутреннюю беспроцентную рассрочку клиники БЕЗ участия банков,
 * грабительских кредитов, скорингов и процентов.
 * 
 * УСЛОВИЯ:
 * 1. Первоначальный взнос (30% - 50%) в день подписания договора.
 * 2. Равные ежемесячные платежи на N месяцев (3, 6, 10, 12, 18, 24 мес).
 * 3. Расчет строго в целочисленных копейках (Kopecks) без потери даже 1 копейки (остаток относится на 1-й платеж).
 * 4. Статусы договора и платежей:
 *    - "on_schedule" («По графику»)
 *    - "due" («Очередной платеж ожидает оплаты»)
 *    - "overdue" («Просрочен»)
 *    - "completed" («Полностью выплачен»)
 * 5. 1-клик прием очередного платежа с формированием фискального чека 54-ФЗ (тег 1214: аванс/предоплата).
 * 6. Автоматическое формирование вежливого текста напоминания пациенту (WhatsApp / СМС).
 */

import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "../money.js";

export type InstallmentPlanStatus = "on_schedule" | "due" | "overdue" | "completed";

export type InstallmentItemStatus = "paid" | "on_schedule" | "due" | "overdue";

export interface InternalInstallmentScheduleItem {
	readonly id: string;
	readonly paymentNumber: number; // 0 = первоначальный взнос, 1..N = ежемесячные платежи
	readonly title: string;
	readonly dueDateIso: string;
	readonly amountKopecks: Kopecks;
	readonly paidKopecks: Kopecks;
	readonly status: InstallmentItemStatus;
	readonly paidAtIso?: string | undefined;
	readonly paymentMethod?: "cash" | "card" | "sbp" | undefined;
	readonly fiscalReceiptNumber?: string | undefined;
	readonly fiscalSign?: string | undefined;
}

export type ClinicInstallmentItem = InternalInstallmentScheduleItem;

export interface InstallmentPlan {
	readonly id: string;
	readonly contractNumber: string; // e.g. "РАС-2026/042"
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly treatmentTitle: string; // e.g. "Брекеты Damon Q на 2 челюсти"
	readonly totalAmountKopecks: Kopecks;
	readonly downPaymentKopecks: Kopecks;
	readonly monthsCount: number;
	readonly monthlyPaymentKopecks: Kopecks;
	readonly startDateIso: string;
	readonly schedule: readonly InternalInstallmentScheduleItem[];
	readonly paidAmountKopecks: Kopecks;
	readonly remainingDebtKopecks: Kopecks;
	readonly overdueDebtKopecks: Kopecks;
	readonly status: InstallmentPlanStatus;
	readonly nextPaymentDueItem?: InternalInstallmentScheduleItem | null | undefined;
	readonly daysUntilNextPayment?: number | null | undefined;
	readonly createdAtIso: string;
	readonly notes?: string | undefined;
}

export interface GenerateInstallmentScheduleInput {
	readonly totalAmountKopecks: Kopecks;
	readonly downPaymentKopecks: Kopecks;
	readonly monthsCount: number;
	readonly startDateIso?: string | undefined;
	readonly dueDayOfMonth?: number | undefined;
}

/**
 * Рассчитывает копеечно-точный график платежей по внутренней беспроцентной рассрочке.
 * Без потери ни одной копейки: неделимый остаток при делении относится на 1-й ежемесячный платеж.
 */
export function generateInstallmentSchedule(
	input: GenerateInstallmentScheduleInput,
): InternalInstallmentScheduleItem[] {
	const totalKop = Math.max(0, Math.round(input.totalAmountKopecks)) as Kopecks;
	const downPaymentKop = Math.max(0, Math.min(totalKop, Math.round(input.downPaymentKopecks))) as Kopecks;
	const months = Math.max(1, Math.round(input.monthsCount));
	const startDate = input.startDateIso ? new Date(input.startDateIso) : new Date();

	const schedule: InternalInstallmentScheduleItem[] = [];

	// 1. Первоначальный взнос (Пункт 0)
	if (downPaymentKop > 0) {
		schedule.push({
			id: `inst-pay-0`,
			paymentNumber: 0,
			title: `Первоначальный взнос (${Math.round((downPaymentKop / totalKop) * 100)}%)`,
			dueDateIso: startDate.toISOString(),
			amountKopecks: downPaymentKop,
			paidKopecks: 0 as Kopecks,
			status: "due",
		});
	}

	// 2. Ежемесячные платежи на остаток суммы
	const remainingDebtKop = (totalKop - downPaymentKop) as Kopecks;
	if (remainingDebtKop > 0) {
		const baseMonthlyKop = Math.floor(remainingDebtKop / months) as Kopecks;
		const remainderKop = (remainingDebtKop - baseMonthlyKop * months) as Kopecks;

		for (let i = 1; i <= months; i++) {
			const payDate = new Date(startDate);
			payDate.setMonth(payDate.getMonth() + i);

			if (input.dueDayOfMonth && input.dueDayOfMonth >= 1 && input.dueDayOfMonth <= 31) {
				payDate.setDate(Math.min(input.dueDayOfMonth, new Date(payDate.getFullYear(), payDate.getMonth() + 1, 0).getDate()));
			}

			// Неделимый остаток копеек прибавляется к первому ежемесячному платежу
			const amountKopecks = (i === 1 ? baseMonthlyKop + remainderKop : baseMonthlyKop) as Kopecks;

			schedule.push({
				id: `inst-pay-${i}`,
				paymentNumber: i,
				title: `Ежемесячный платеж №${i} из ${months}`,
				dueDateIso: payDate.toISOString(),
				amountKopecks,
				paidKopecks: 0 as Kopecks,
				status: "on_schedule",
			});
		}
	}

	return schedule;
}

/**
 * Оценивает текущий статус графика рассрочки на заданную дату:
 * - "overdue" («Просрочен»), если дата платежа прошла, а взнос не оплачен;
 * - "due" («Очередной платеж ожидает оплаты»), если дата платежа наступает в течение 5 дней или сегодня;
 * - "on_schedule" («По графику»), если всё оплачено в срок и следующий платеж в будущем (> 5 дней);
 * - "completed" («Полностью выплачен»), если сумма оплат покрыла 100% договора.
 */
export function evaluateInstallmentStatus(
	schedule: readonly InternalInstallmentScheduleItem[],
	currentDateIso: string = new Date().toISOString(),
): {
	status: InstallmentPlanStatus;
	overdueDebtKopecks: Kopecks;
	paidAmountKopecks: Kopecks;
	remainingDebtKopecks: Kopecks;
	nextPaymentDueItem: InternalInstallmentScheduleItem | null;
	daysUntilNextPayment: number | null;
	updatedSchedule: InternalInstallmentScheduleItem[];
} {
	const currentMs = new Date(currentDateIso).getTime();
	const todayDateStr = currentDateIso.split("T")[0]!;

	let paidAmountKopecks = 0 as Kopecks;
	let totalAmountKopecks = 0 as Kopecks;
	let overdueDebtKopecks = 0 as Kopecks;
	let nextPaymentDueItem: InternalInstallmentScheduleItem | null = null;
	let daysUntilNextPayment: number | null = null;

	const updatedSchedule: InternalInstallmentScheduleItem[] = [];

	for (const item of schedule) {
		totalAmountKopecks = (totalAmountKopecks + item.amountKopecks) as Kopecks;
		paidAmountKopecks = (paidAmountKopecks + item.paidKopecks) as Kopecks;

		const remainingItemKop = Math.max(0, item.amountKopecks - item.paidKopecks) as Kopecks;
		const dueMs = new Date(item.dueDateIso).getTime();
		const dueDateStr = item.dueDateIso.split("T")[0]!;

		let itemStatus: InstallmentItemStatus = item.status;

		if (remainingItemKop <= 0) {
			itemStatus = "paid";
		} else {
			// Разница в полных сутках
			const diffDays = Math.floor((dueMs - currentMs) / (24 * 60 * 60 * 1000));

			if (dueDateStr < todayDateStr) {
				itemStatus = "overdue";
				overdueDebtKopecks = (overdueDebtKopecks + remainingItemKop) as Kopecks;
			} else if (diffDays <= 5) {
				itemStatus = "due";
			} else {
				itemStatus = "on_schedule";
			}

			// Находим ближайший ожидающий платеж
			if (!nextPaymentDueItem) {
				nextPaymentDueItem = { ...item, status: itemStatus };
				daysUntilNextPayment = diffDays;
			}
		}

		updatedSchedule.push({
			...item,
			status: itemStatus,
		});
	}

	const remainingDebtKopecks = Math.max(0, totalAmountKopecks - paidAmountKopecks) as Kopecks;

	let planStatus: InstallmentPlanStatus = "on_schedule";
	if (remainingDebtKopecks <= 0) {
		planStatus = "completed";
	} else if (overdueDebtKopecks > 0) {
		planStatus = "overdue";
	} else if (nextPaymentDueItem && (nextPaymentDueItem.status === "due" || (daysUntilNextPayment !== null && daysUntilNextPayment <= 5))) {
		planStatus = "due";
	} else {
		planStatus = "on_schedule";
	}

	return {
		status: planStatus,
		overdueDebtKopecks,
		paidAmountKopecks,
		remainingDebtKopecks,
		nextPaymentDueItem,
		daysUntilNextPayment,
		updatedSchedule,
	};
}

export interface RecordInstallmentPaymentInput {
	readonly plan: InstallmentPlan;
	readonly paymentItemId?: string | undefined;
	readonly paidAmountKopecks?: Kopecks | undefined;
	readonly paymentMethod?: "cash" | "card" | "sbp" | undefined;
	readonly paidAtIso?: string | undefined;
	readonly cashierName?: string | undefined;
}

export interface FiscalReceipt54FzResult {
	readonly receiptNumber: string;
	readonly fiscalSign: string;
	readonly fiscalDocumentNumber: number;
	readonly paymentMethodRu: string;
	readonly amountKopecks: Kopecks;
	readonly formattedAmount: string;
	readonly calculationTypeTag1214: number; // 2 = частичная предоплата/аванс, 4 = полный расчет
	readonly calculationTypeNameRu: string;
	readonly timestampIso: string;
	readonly qrPayload: string;
}

/**
 * 1-клик прием очередного платежа по рассрочке с выбиванием фискального чека 54-ФЗ.
 */
export function recordInstallmentPayment(
	input: RecordInstallmentPaymentInput,
): {
	updatedPlan: InstallmentPlan;
	receipt: FiscalReceipt54FzResult;
} {
	const currentIso = input.paidAtIso || new Date().toISOString();
	const paymentMethod = input.paymentMethod || "card";
	const methodRu = paymentMethod === "cash" ? "Наличные" : paymentMethod === "sbp" ? "СБП (0%)" : "Банковская карта";

	// Находим целевой элемент для оплаты
	let targetItemIndex = -1;
	if (input.paymentItemId) {
		targetItemIndex = input.plan.schedule.findIndex((s) => s.id === input.paymentItemId);
	}
	if (targetItemIndex === -1) {
		// Берем первый неоплаченный
		targetItemIndex = input.plan.schedule.findIndex((s) => s.paidKopecks < s.amountKopecks);
	}

	if (targetItemIndex === -1) {
		throw new Error("Все платежи по данному договору рассрочки уже оплачены 100%");
	}

	const targetItem = input.plan.schedule[targetItemIndex]!;
	const payAmountKop = (input.paidAmountKopecks !== undefined && input.paidAmountKopecks > 0)
		? input.paidAmountKopecks
		: (targetItem.amountKopecks - targetItem.paidKopecks) as Kopecks;

	const newPaidKop = Math.min(targetItem.amountKopecks, targetItem.paidKopecks + payAmountKop) as Kopecks;
	const isFullyPaid = newPaidKop >= targetItem.amountKopecks;

	// Генерация фискального чека 54-ФЗ (ФФД 1.2, тег 1214)
	const docNum = Math.floor(10000 + Math.random() * 90000);
	const fpd = Math.floor(1000000000 + Math.random() * 9000000000).toString();
	const receiptNumber = `ФД-${docNum}`;

	// Тег 1214: Признак способа расчета (2 — предоплата, 4 — полный расчет при закрытии последнего взноса)
	const isLastPayment = input.plan.schedule.filter((s, idx) => idx !== targetItemIndex && s.paidKopecks < s.amountKopecks).length === 0 && isFullyPaid;
	const tag1214 = isLastPayment ? 4 : 2;
	const tag1214NameRu = isLastPayment ? "Полный расчет (54-ФЗ)" : "Аванс / Взнос по рассрочке (54-ФЗ)";

	const qrPayload = `t=${currentIso.replace(/[-:]/g, "").slice(0, 15)}&s=${(payAmountKop / 100).toFixed(2)}&fn=999907890001&i=${docNum}&fp=${fpd}&n=1`;

	const updatedSchedule = input.plan.schedule.map((item, idx) => {
		if (idx === targetItemIndex) {
			return {
				...item,
				paidKopecks: newPaidKop,
				status: isFullyPaid ? ("paid" as InstallmentItemStatus) : item.status,
				paidAtIso: currentIso,
				paymentMethod,
				fiscalReceiptNumber: receiptNumber,
				fiscalSign: fpd,
			};
		}
		return item;
	});

	const evalResult = evaluateInstallmentStatus(updatedSchedule, currentIso);

	const updatedPlan: InstallmentPlan = {
		...input.plan,
		schedule: evalResult.updatedSchedule,
		paidAmountKopecks: evalResult.paidAmountKopecks,
		remainingDebtKopecks: evalResult.remainingDebtKopecks,
		overdueDebtKopecks: evalResult.overdueDebtKopecks,
		status: evalResult.status,
		nextPaymentDueItem: evalResult.nextPaymentDueItem,
		daysUntilNextPayment: evalResult.daysUntilNextPayment,
	};

	const receipt: FiscalReceipt54FzResult = {
		receiptNumber,
		fiscalSign: fpd,
		fiscalDocumentNumber: docNum,
		paymentMethodRu: methodRu,
		amountKopecks: payAmountKop,
		formattedAmount: formatKopecksRu(payAmountKop),
		calculationTypeTag1214: tag1214,
		calculationTypeNameRu: tag1214NameRu,
		timestampIso: currentIso,
		qrPayload,
	};

	return {
		updatedPlan,
		receipt,
	};
}

export interface InstallmentReminderOutput {
	readonly patientName: string;
	readonly clinicName: string;
	readonly messageText: string;
	readonly whatsappUrl: string;
	readonly smsText: string;
	readonly dueDateRu: string;
	readonly amountFormatted: string;
	readonly remainingDebtFormatted: string;
}

/**
 * Формирует автоматическое вежливое напоминание пациенту о приближении или наличии очередного платежа.
 */
export function generateInstallmentReminder(params: {
	patientName: string;
	clinicName: string;
	plan: InstallmentPlan;
	targetItem?: InternalInstallmentScheduleItem | null | undefined;
	sbpQrUrl?: string | undefined;
}): InstallmentReminderOutput {
	const item = params.targetItem || params.plan.nextPaymentDueItem || params.plan.schedule.find((s) => s.paidKopecks < s.amountKopecks);
	const targetAmountKop = item ? (item.amountKopecks - item.paidKopecks) as Kopecks : params.plan.remainingDebtKopecks;
	const amountFormatted = formatKopecksRu(targetAmountKop);
	const remainingDebtFormatted = formatKopecksRu(params.plan.remainingDebtKopecks);

	const dueDate = item ? new Date(item.dueDateIso) : new Date();
	const dueDateRu = dueDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

	const isOverdue = item ? item.status === "overdue" : params.plan.status === "overdue";
	const headerTone = isOverdue
		? `⚠️ Напоминаем о необходимости внесения очередного платежа по договору рассрочки №${params.plan.contractNumber}`
		: `Напоминаем о приближении даты очередного платежа по внутренней рассрочке`;

	const sbpLink = params.sbpQrUrl ? `\n📲 Оплата через СБП без комиссии: ${params.sbpQrUrl}` : "";

	const messageText =
		`Здравствуйте, ${params.patientName}!\n\n` +
		`${headerTone} в клинике ${params.clinicName}.\n` +
		`План лечения: ${params.plan.treatmentTitle}\n` +
		`Сумма к оплате: ${amountFormatted}\n` +
		`Срок оплаты: до ${dueDateRu}\n` +
		`Остаток задолженности по договору: ${remainingDebtFormatted}` +
		`${sbpLink}\n\n` +
		`Если вы уже внесли оплату, спасибо! При любых вопросах мы на связи.`;

	const cleanPhone = (params.plan.patientPhone || "").replace(/\D/g, "");
	const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

	const smsText = `Клиника ${params.clinicName}: очередной платеж по рассрочке ${amountFormatted} до ${dueDateRu}. Остаток: ${remainingDebtFormatted}. Тел: +7 (495) 000-00-00`;

	return {
		patientName: params.patientName,
		clinicName: params.clinicName,
		messageText,
		whatsappUrl,
		smsText,
		dueDateRu,
		amountFormatted,
		remainingDebtFormatted,
	};
}

export type TreatmentPresetType = "aligners" | "all_on_4" | "braces" | "total_rehab";

export interface TreatmentPresetConfig {
	readonly title: string;
	readonly totalRubles: number;
	readonly downPaymentPercent: number;
	readonly months: number;
	readonly notes: string;
}

export const TREATMENT_INSTALLMENT_PRESETS: Record<TreatmentPresetType, TreatmentPresetConfig> = {
	aligners: {
		title: "Ортодонтическое лечение: Элайнеры Spark / 3D Smile (2 челюсти)",
		totalRubles: 360000,
		downPaymentPercent: 30, // 108 000 ₽ взнос
		months: 10, // 10 месяцев по 25 200 ₽
		notes: "Полный курс прозрачных капп, виртуальный сетап ClinCheck, контрольные приемы и ретенционные аппараты.",
	},
	all_on_4: {
		title: "Имплантация и несъемное протезирование All-on-4 (Straumann / Osstem)",
		totalRubles: 450000,
		downPaymentPercent: 40, // 180 000 ₽ взнос
		months: 6, // 6 месяцев по 45 000 ₽
		notes: "Хирургический этап: 4 имплантата + мульти-юнит абатменты + несъемный адаптационный протез с винтовой фиксацией.",
	},
	braces: {
		title: "Ортодонтия: Брекет-система Damon Q / Clear (обе челюсти)",
		totalRubles: 240000,
		downPaymentPercent: 30, // 72 000 ₽ взнос
		months: 12, // 12 месяцев по 14 000 ₽
		notes: "Фиксация брекетов, замена дуг, плановые активации раз в 4-6 недель, снятие и установка ретейнеров.",
	},
	total_rehab: {
		title: "Тотальная реабилитация: Цельноциркониевые коронки Prettau (до 14 ед.)",
		totalRubles: 600000,
		downPaymentPercent: 50, // 300 000 ₽ взнос
		months: 6, // 6 месяцев по 50 000 ₽
		notes: "Препарирование, временные коронки PMMA, индивидуальные циркониевые реставрации CAD/CAM, постоянная фиксация.",
	},
};

/**
 * Создает готовый типовой договор внутренней рассрочки для клиники.
 */
export function createDefaultInternalInstallmentsPreset(
	patientId: string,
	patientName: string,
	presetType: TreatmentPresetType = "aligners",
	startDateIso: string = new Date().toISOString(),
	patientPhone: string = "+7 (926) 000-00-00",
): InstallmentPlan {
	const cfg = TREATMENT_INSTALLMENT_PRESETS[presetType];
	const totalKop = rublesToKopecks(cfg.totalRubles);
	const downPaymentKop = Math.round((totalKop * cfg.downPaymentPercent) / 100) as Kopecks;

	const schedule = generateInstallmentSchedule({
		totalAmountKopecks: totalKop,
		downPaymentKopecks: downPaymentKop,
		monthsCount: cfg.months,
		startDateIso,
		dueDayOfMonth: 15,
	});

	const evalResult = evaluateInstallmentStatus(schedule, startDateIso);

	const monthlyPaymentKop = schedule.length > 1 ? schedule[1]!.amountKopecks : (0 as Kopecks);

	const randomNum = Math.floor(10 + Math.random() * 90);
	const year = new Date(startDateIso).getFullYear();

	return {
		id: `inst-plan-${presetType}-${patientId}-${Date.now()}`,
		contractNumber: `РАС-${year}/${randomNum}`,
		patientId,
		patientName,
		patientPhone,
		doctorName: "Врач-куратор клиники",
		treatmentTitle: cfg.title,
		totalAmountKopecks: totalKop,
		downPaymentKopecks: downPaymentKop,
		monthsCount: cfg.months,
		monthlyPaymentKopecks: monthlyPaymentKop,
		startDateIso,
		schedule: evalResult.updatedSchedule,
		paidAmountKopecks: evalResult.paidAmountKopecks,
		remainingDebtKopecks: evalResult.remainingDebtKopecks,
		overdueDebtKopecks: evalResult.overdueDebtKopecks,
		status: evalResult.status,
		nextPaymentDueItem: evalResult.nextPaymentDueItem,
		daysUntilNextPayment: evalResult.daysUntilNextPayment,
		createdAtIso: startDateIso,
		notes: cfg.notes,
	};
}
