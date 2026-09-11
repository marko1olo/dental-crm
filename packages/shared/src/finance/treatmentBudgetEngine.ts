/**
 * treatmentBudgetEngine.ts — Multi-Stage Treatment Budget & Commercial Estimate Engine.
 *
 * Reverse-engineered & adapted from DentalPin budget module (models.py, pricing.py, workflow.py)
 * and aligned with Russian healthcare legislation and clinical workflows:
 * - Постановление Правительства РФ от 11.05.2023 № 736 (Правила платных медицинских услуг).
 * - Гражданский кодекс РФ (ст. 709 «Смета», ст. 711 «Сроки оплаты», ст. 819 «Кредит и рассрочка»).
 * - Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 37).
 * - Приказ Минздрава России от 13.10.2017 № 804н (Номенклатура медицинских услуг).
 * - Мандат 8e (Автономия врача): свободное применение скидок 0%..100% (гарантийная переделка, персонал)
 *   без блокировок и мастер-паролей.
 * - Мандат 8d п. 7: строго 0 эмодзи в официальных документах и сметах.
 * - Целочисленные копейки (Kopeck-exact) без деградации float.
 */

import { z } from "zod";
import { escapeXml } from "../cda/c14n.js";
import { amountToWordsRu } from "../fiscal/taxDeduction.js";
import { kopecksToRub } from "../fiscal/kopecksArithmetic.js";

// ─── 1. ZOD SCHEMAS & DOMAIN TYPES ──────────────────────────────────────────

export const budgetStageStatusSchema = z.enum([
	"draft",
	"proposed",
	"accepted",
	"in_progress",
	"completed",
	"declined",
]);
export type BudgetStageStatus = z.infer<typeof budgetStageStatusSchema>;

export const budgetPaymentTypeSchema = z.enum([
	"full_prepay",
	"stage_prepay",
	"postpay",
	"credit_installments",
]);
export type BudgetPaymentType = z.infer<typeof budgetPaymentTypeSchema>;

export const budgetStageCategorySchema = z.enum([
	"therapeutic",
	"surgical",
	"orthopedic",
	"orthodontic",
	"hygiene_sanitation",
	"periodontal",
	"other",
]);
export type BudgetStageCategory = z.infer<typeof budgetStageCategorySchema>;

export const doctorDiscountReasonSchema = z.enum([
	"warranty_rework",
	"staff_discount",
	"clinical_courtesy",
	"promotional",
	"chief_decision",
]);
export type DoctorDiscountReason = z.infer<typeof doctorDiscountReasonSchema>;

export const budgetItemSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(300),
	code804n: z.string().min(1).max(50).nullable().optional(),
	toothNumber: z.number().int().min(11).max(85).nullable().optional(),
	surfaces: z.array(z.string()).optional().default([]),
	quantity: z.number().int().positive().default(1),
	unitPriceKopecks: z.number().int().nonnegative(),
	discountPercent: z.number().min(0).max(100).default(0),
	discountKopecks: z.number().int().nonnegative().default(0),
	totalPriceKopecks: z.number().int().nonnegative(),
	doctorDiscountReason: doctorDiscountReasonSchema.nullable().optional(),
	doctorDiscountNote: z.string().max(500).nullable().optional(),
	notes: z.string().max(1000).nullable().optional(),
});
export type BudgetItem = z.infer<typeof budgetItemSchema>;

export const installmentScheduleItemSchema = z.object({
	installmentNumber: z.number().int().positive(),
	paymentDateIso: z.string(),
	amountKopecks: z.number().int().nonnegative(),
	description: z.string(),
	status: z.enum(["pending", "paid", "overdue"]).default("pending"),
	stageId: z.string().uuid().nullable().optional(),
});
export type InstallmentScheduleItem = z.infer<typeof installmentScheduleItemSchema>;

export const budgetStageSchema = z.object({
	id: z.string().uuid(),
	stageNumber: z.number().int().positive(),
	category: budgetStageCategorySchema,
	title: z.string().min(1).max(200),
	description: z.string().max(1000).nullable().optional(),
	status: budgetStageStatusSchema.default("draft"),
	estimatedDurationDays: z.number().int().positive().nullable().optional(),
	dueDateIso: z.string().nullable().optional(),
	items: z.array(budgetItemSchema),
	subtotalKopecks: z.number().int().nonnegative(),
	discountKopecks: z.number().int().nonnegative(),
	totalPriceKopecks: z.number().int().nonnegative(),
	paymentType: budgetPaymentTypeSchema.default("stage_prepay"),
});
export type BudgetStage = z.infer<typeof budgetStageSchema>;

export const treatmentBudgetRecordSchema = z.object({
	id: z.string().uuid(),
	clinicId: z.string().uuid(),
	patientId: z.string().uuid(),
	budgetNumber: z.string().min(1),
	version: z.number().int().positive().default(1),
	parentBudgetId: z.string().uuid().nullable().optional(),
	title: z.string().min(1).max(250),
	status: budgetStageStatusSchema.default("draft"),
	clinic: z.object({
		name: z.string().min(1),
		legalName: z.string().nullable().optional(),
		inn: z.string().nullable().optional(),
		ogrn: z.string().nullable().optional(),
		address: z.string().nullable().optional(),
		phone: z.string().nullable().optional(),
		licenseInfo: z.string().nullable().optional(),
	}),
	patient: z.object({
		id: z.string().uuid().optional(),
		fullName: z.string().min(1),
		birthDate: z.string().nullable().optional(),
		phone: z.string().nullable().optional(),
		cardNumber: z.string().nullable().optional(),
		passport: z.string().nullable().optional(),
	}),
	attendingDoctor: z
		.object({
			id: z.string().uuid().optional(),
			fullName: z.string().min(1),
			specialty: z.string().nullable().optional(),
		})
		.nullable()
		.optional(),
	stages: z.array(budgetStageSchema).min(1),
	paymentType: budgetPaymentTypeSchema.default("stage_prepay"),
	globalDiscountType: z.enum(["none", "percentage", "absolute"]).default("none"),
	globalDiscountValue: z.number().nonnegative().default(0),
	subtotalKopecks: z.number().int().nonnegative(),
	totalDiscountKopecks: z.number().int().nonnegative(),
	grandTotalKopecks: z.number().int().nonnegative(),
	installmentSchedule: z.array(installmentScheduleItemSchema).nullable().optional(),
	validUntilDate: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	patientNotes: z.string().nullable().optional(),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
	acceptedAt: z.string().datetime().nullable().optional(),
	acceptedVia: z.string().nullable().optional(),
	signedByName: z.string().nullable().optional(),
});
export type TreatmentBudgetRecord = z.infer<typeof treatmentBudgetRecordSchema>;

// ─── 2. LABELS & RUSSIAN TERMINOLOGY ────────────────────────────────────────

export const BUDGET_STAGE_CATEGORY_LABELS_RU: Record<BudgetStageCategory, string> = {
	therapeutic: "Терапевтический этап (лечение кариеса, эндодонтия)",
	surgical: "Хирургический этап (удаление, имплантация, костная пластика)",
	orthopedic: "Ортопедический этап (протезирование, коронки, виниры)",
	orthodontic: "Ортодонтический этап (брекет-системы, элайнеры)",
	hygiene_sanitation: "Санация и профессиональная гигиена полости рта",
	periodontal: "Пародонтологическое лечение",
	other: "Дополнительные медицинские манипуляции",
};

export const BUDGET_STAGE_STATUS_LABELS_RU: Record<BudgetStageStatus, string> = {
	draft: "Черновик",
	proposed: "Предложена пациенту",
	accepted: "Согласована пациентом",
	in_progress: "В процессе лечения",
	completed: "Выполнена полностью",
	declined: "Отклонена пациентом",
};

export const BUDGET_PAYMENT_TYPE_LABELS_RU: Record<BudgetPaymentType, string> = {
	full_prepay: "100% Предоплата",
	stage_prepay: "Поэтапная оплата перед каждым этапом",
	postpay: "Оплата по факту выполнения услуг",
	credit_installments: "Беспроцентная рассрочка клиники (0%)",
};

export const DOCTOR_DISCOUNT_REASONS_RU: Record<DoctorDiscountReason, string> = {
	warranty_rework: "Гарантийная переделка (100% скидка по гарантии)",
	staff_discount: "Лечение сотрудника клиники / корпоративная скидка",
	clinical_courtesy: "Клиническое решение лечащего врача",
	promotional: "Специальное предложение / акция",
	chief_decision: "Согласовано с руководством клиники",
};

// ─── 3. STATE TRANSITIONS ───────────────────────────────────────────────────

export const VALID_BUDGET_STATUS_TRANSITIONS: Record<BudgetStageStatus, readonly BudgetStageStatus[]> = {
	draft: ["proposed", "accepted", "declined"],
	proposed: ["accepted", "declined", "draft"],
	accepted: ["in_progress", "declined", "draft"],
	in_progress: ["completed", "declined"],
	completed: [],
	declined: ["draft"],
};

export function canTransitionBudgetStatus(from: BudgetStageStatus, to: BudgetStageStatus): boolean {
	if (from === to) return true;
	return VALID_BUDGET_STATUS_TRANSITIONS[from].includes(to);
}

// ─── 4. PURE PRICING & KOPECK-EXACT ARITHMETIC ──────────────────────────────

export interface StageCalculationInput {
	readonly id?: string;
	readonly stageNumber: number;
	readonly category: BudgetStageCategory;
	readonly title: string;
	readonly description?: string | null;
	readonly status?: BudgetStageStatus;
	readonly estimatedDurationDays?: number | null;
	readonly dueDateIso?: string | null;
	readonly paymentType?: BudgetPaymentType;
	readonly items: readonly ItemCalculationInput[];
}

export interface ItemCalculationInput {
	readonly id?: string;
	readonly name: string;
	readonly code804n?: string | null;
	readonly toothNumber?: number | null;
	readonly surfaces?: readonly string[];
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number;
	readonly doctorDiscountReason?: DoctorDiscountReason | null;
	readonly doctorDiscountNote?: string | null;
	readonly notes?: string | null;
}

export interface TreatmentBudgetCalculationInput {
	readonly stages: readonly StageCalculationInput[];
	readonly globalDiscountType?: "none" | "percentage" | "absolute";
	readonly globalDiscountValue?: number;
}

export interface TreatmentBudgetCalculationResult {
	readonly stages: BudgetStage[];
	readonly subtotalKopecks: number;
	readonly totalDiscountKopecks: number;
	readonly grandTotalKopecks: number;
}

/**
 * Calculates multi-stage dental treatment budget with exact kopeck arithmetic.
 * Adapted from DentalPin pricing.py allocate_global_discount, adjusted for Russian
 * currency requirements: all values are integers (kopecks) with remainder drift landed
 * on the last line to guarantee that sum(stageTotals) === grandTotalKopecks.
 */
export function calculateBudgetKopecks(
	input: TreatmentBudgetCalculationInput,
): TreatmentBudgetCalculationResult {
	const globalType = input.globalDiscountType ?? "none";
	const globalVal = Math.max(0, input.globalDiscountValue ?? 0);

	interface TempLine {
		stageIndex: number;
		itemIndex: number;
		id: string;
		name: string;
		code804n?: string | null;
		toothNumber?: number | null;
		surfaces: string[];
		quantity: number;
		unitPriceKopecks: number;
		baseKopecks: number;
		lineDiscountPercent: number;
		lineDiscountKopecks: number;
		netAfterLineDiscountKopecks: number;
		globalDiscountShareKopecks: number;
		doctorDiscountReason?: DoctorDiscountReason | null;
		doctorDiscountNote?: string | null;
		notes?: string | null;
	}

	const allLines: TempLine[] = [];

	input.stages.forEach((st, sIdx) => {
		st.items.forEach((it, iIdx) => {
			const qty = Math.max(1, Math.round(it.quantity));
			const unitPrice = Math.max(0, Math.round(it.unitPriceKopecks));
			const base = unitPrice * qty;
			const rawPct = Math.min(100, Math.max(0, it.discountPercent ?? 0));
			const lineDisc = Math.min(base, Math.round(base * (rawPct / 100)));
			const net = base - lineDisc;

			allLines.push({
				stageIndex: sIdx,
				itemIndex: iIdx,
				id: it.id ?? `00000000-0000-0000-0000-${String(allLines.length + 1).padStart(12, "0")}`,
				name: it.name,
				code804n: it.code804n ?? null,
				toothNumber: it.toothNumber ?? null,
				surfaces: it.surfaces ? [...it.surfaces] : [],
				quantity: qty,
				unitPriceKopecks: unitPrice,
				baseKopecks: base,
				lineDiscountPercent: rawPct,
				lineDiscountKopecks: lineDisc,
				netAfterLineDiscountKopecks: net,
				globalDiscountShareKopecks: 0,
				doctorDiscountReason: it.doctorDiscountReason ?? null,
				doctorDiscountNote: it.doctorDiscountNote ?? null,
				notes: it.notes ?? null,
			});
		});
	});

	// Global discount allocation (DentalPin pricing.py port to integer kopecks)
	const totalNet = allLines.reduce((sum, l) => sum + l.netAfterLineDiscountKopecks, 0);

	if (totalNet > 0 && globalVal > 0) {
		if (globalType === "percentage") {
			const pct = Math.min(100, globalVal);
			for (const line of allLines) {
				line.globalDiscountShareKopecks = Math.min(
					line.netAfterLineDiscountKopecks,
					Math.round(line.netAfterLineDiscountKopecks * (pct / 100)),
				);
			}
		} else if (globalType === "absolute") {
			const targetKopecks = Math.min(totalNet, Math.round(globalVal));
			let allocated = 0;
			let lastEligibleLine: TempLine | null = null;

			for (const line of allLines) {
				if (line.netAfterLineDiscountKopecks > 0) {
					const share = Math.floor((targetKopecks * line.netAfterLineDiscountKopecks) / totalNet);
					line.globalDiscountShareKopecks = share;
					allocated += share;
					lastEligibleLine = line;
				}
			}

			const drift = targetKopecks - allocated;
			if (lastEligibleLine && drift > 0) {
				lastEligibleLine.globalDiscountShareKopecks += drift;
			}
		}
	}

	// Reassemble stages
	const calculatedStages: BudgetStage[] = input.stages.map((st, sIdx) => {
		const stageLines = allLines.filter((l) => l.stageIndex === sIdx);

		const items: BudgetItem[] = stageLines.map((l) => {
			const totalDisc = l.lineDiscountKopecks + l.globalDiscountShareKopecks;
			const finalTotal = Math.max(0, l.baseKopecks - totalDisc);
			const effectivePct =
				l.baseKopecks > 0 ? Math.round((totalDisc / l.baseKopecks) * 10000) / 100 : 0;

			return {
				id: l.id,
				name: l.name,
				code804n: l.code804n,
				toothNumber: l.toothNumber,
				surfaces: l.surfaces,
				quantity: l.quantity,
				unitPriceKopecks: l.unitPriceKopecks,
				discountPercent: effectivePct,
				discountKopecks: totalDisc,
				totalPriceKopecks: finalTotal,
				doctorDiscountReason: l.doctorDiscountReason,
				doctorDiscountNote: l.doctorDiscountNote,
				notes: l.notes,
			};
		});

		const stageSubtotal = items.reduce((acc, i) => acc + i.unitPriceKopecks * i.quantity, 0);
		const stageDiscount = items.reduce((acc, i) => acc + i.discountKopecks, 0);
		const stageTotal = items.reduce((acc, i) => acc + i.totalPriceKopecks, 0);

		return {
			id: st.id ?? `00000000-0000-0000-0001-${String(sIdx + 1).padStart(12, "0")}`,
			stageNumber: st.stageNumber,
			category: st.category,
			title: st.title,
			description: st.description ?? null,
			status: st.status ?? "draft",
			estimatedDurationDays: st.estimatedDurationDays ?? null,
			dueDateIso: st.dueDateIso ?? null,
			items,
			subtotalKopecks: stageSubtotal,
			discountKopecks: stageDiscount,
			totalPriceKopecks: stageTotal,
			paymentType: st.paymentType ?? "stage_prepay",
		};
	});

	const grandSubtotal = calculatedStages.reduce((acc, s) => acc + s.subtotalKopecks, 0);
	const grandDiscount = calculatedStages.reduce((acc, s) => acc + s.discountKopecks, 0);
	const grandTotal = calculatedStages.reduce((acc, s) => acc + s.totalPriceKopecks, 0);

	return {
		stages: calculatedStages,
		subtotalKopecks: grandSubtotal,
		totalDiscountKopecks: grandDiscount,
		grandTotalKopecks: grandTotal,
	};
}

// ─── 5. MANDATE 8e: DOCTOR AUTONOMY DISCOUNT APPLICATION ────────────────────

export interface ApplyDoctorDiscountInput {
	readonly item: BudgetItem;
	readonly discountPercent: number; // 0..100
	readonly reason: DoctorDiscountReason;
	readonly customNote?: string | null;
}

/**
 * Mandate 8e: Full doctor autonomy for discounts up to 100%.
 * Allows treating staff, warranty remakes, or clinical courtesies without
 * administrative master-password prompts or obstructive permission dialogs.
 */
export function applyDoctorDiscount(input: ApplyDoctorDiscountInput): BudgetItem {
	const pct = Math.min(100, Math.max(0, input.discountPercent));
	const base = input.item.unitPriceKopecks * input.item.quantity;
	const discKopecks = Math.round(base * (pct / 100));
	const finalKopecks = Math.max(0, base - discKopecks);

	return {
		...input.item,
		discountPercent: pct,
		discountKopecks: discKopecks,
		totalPriceKopecks: finalKopecks,
		doctorDiscountReason: input.reason,
		doctorDiscountNote: input.customNote ?? DOCTOR_DISCOUNT_REASONS_RU[input.reason],
	};
}

// ─── 6. INSTALLMENT SCHEDULE CALCULATOR ─────────────────────────────────────

function toIsoDateString(d: Date): string {
	const iso = d.toISOString();
	const idx = iso.indexOf("T");
	return idx !== -1 ? iso.substring(0, idx) : iso;
}

export interface CalculateInstallmentScheduleInput {
	readonly grandTotalKopecks: number;
	readonly initialDepositKopecks?: number;
	readonly installmentsCount: number; // e.g. 2, 3, 4, 6, 12
	readonly startDateIso?: string;
	readonly frequency?: "monthly" | "biweekly" | "per_stage";
	readonly stages?: readonly BudgetStage[];
}

/**
 * Generates exact kopeck installment schedule.
 * Remainder kopecks are added to the first installment to eliminate penny drift.
 */
export function calculateInstallmentSchedule(
	input: CalculateInstallmentScheduleInput,
): InstallmentScheduleItem[] {
	const total = Math.max(0, Math.round(input.grandTotalKopecks));
	const deposit = Math.min(total, Math.max(0, Math.round(input.initialDepositKopecks ?? 0)));
	const payable = total - deposit;
	const count = Math.max(1, Math.round(input.installmentsCount));
	const startDate = input.startDateIso ? new Date(input.startDateIso) : new Date();

	const schedule: InstallmentScheduleItem[] = [];

	if (deposit > 0) {
		schedule.push({
			installmentNumber: 1,
			paymentDateIso: toIsoDateString(startDate),
			amountKopecks: deposit,
			description: "Первоначальный взнос (аванс) при заключении плана лечения",
			status: "pending",
			stageId: null,
		});
	}

	if (payable <= 0) return schedule;

	if (input.frequency === "per_stage" && input.stages && input.stages.length > 0) {
		input.stages.forEach((st) => {
			const num = schedule.length + 1;
			const dueDate = st.dueDateIso ?? toIsoDateString(startDate);
			schedule.push({
				installmentNumber: num,
				paymentDateIso: dueDate,
				amountKopecks: st.totalPriceKopecks,
				description: `Оплата этапа ${st.stageNumber}: ${st.title}`,
				status: "pending",
				stageId: st.id,
			});
		});
		return schedule;
	}

	const baseAmount = Math.floor(payable / count);
	const drift = payable - baseAmount * count;

	for (let i = 0; i < count; i++) {
		const payDate = new Date(startDate);
		if (input.frequency === "biweekly") {
			payDate.setDate(payDate.getDate() + (i + (deposit > 0 ? 1 : 0)) * 14);
		} else {
			payDate.setMonth(payDate.getMonth() + (i + (deposit > 0 ? 1 : 0)));
		}

		const amt = i === 0 ? baseAmount + drift : baseAmount;

		schedule.push({
			installmentNumber: schedule.length + 1,
			paymentDateIso: toIsoDateString(payDate),
			amountKopecks: amt,
			description: `Платеж рассрочки № ${i + 1} из ${count}`,
			status: "pending",
			stageId: null,
		});
	}

	return schedule;
}

// ─── 7. STATUTORY RF DECREE 736 A4 ESTIMATE GENERATION (0 EMOJIS) ────────────

export interface GenerateEstimateA4Options {
	readonly documentTitle?: string;
	readonly contractNumber?: string;
	readonly contractDate?: string;
	readonly customNotes?: string | null;
}

function formatRubKopecks(kopecks: number): string {
	return kopecksToRub(kopecks).toLocaleString("ru-RU", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

/**
 * Generates statutory A4 printable commercial estimate for medical services
 * pursuant to RF Government Decree No. 736 and Civil Code Art. 709.
 *
 * MANDATE 8d Point 7: STRICTLY ZERO EMOJIS! Only official legal typography.
 */
export function generateStatutoryEstimateA4Html(
	budget: TreatmentBudgetRecord,
	options?: GenerateEstimateA4Options,
): string {
	const clinicName = escapeXml(budget.clinic.name);
	const legalName = escapeXml(budget.clinic.legalName || budget.clinic.name);
	const inn = escapeXml(budget.clinic.inn || "—");
	const ogrn = escapeXml(budget.clinic.ogrn || "—");
	const address = escapeXml(budget.clinic.address || "—");
	const phone = escapeXml(budget.clinic.phone || "—");
	const license = escapeXml(budget.clinic.licenseInfo || "—");

	const patientName = escapeXml(budget.patient.fullName);
	const birthDate = escapeXml(budget.patient.birthDate || "—");
	const cardNumber = escapeXml(budget.patient.cardNumber || "—");
	const patientPhone = escapeXml(budget.patient.phone || "—");

	const doctorName = escapeXml(budget.attendingDoctor?.fullName || "Лечащий врач");
	const specialty = escapeXml(budget.attendingDoctor?.specialty || "Врач-стоматолог");

	const subtotalRub = formatRubKopecks(budget.subtotalKopecks);
	const discountRub = formatRubKopecks(budget.totalDiscountKopecks);
	const grandTotalRub = formatRubKopecks(budget.grandTotalKopecks);
	const amountWords = escapeXml(amountToWordsRu(budget.grandTotalKopecks));

	const contractRef = options?.contractNumber
		? `к Договору на оказание платных медицинских услуг № ${escapeXml(options.contractNumber)}${options.contractDate ? ` от ${escapeXml(options.contractDate)}` : ""}`
		: "к Договору на оказание платных медицинских услуг";

	let stagesRowsHtml = "";
	let itemCounter = 1;

	for (const st of budget.stages) {
		const stageTotalRub = formatRubKopecks(st.totalPriceKopecks);
		const stageCategory = BUDGET_STAGE_CATEGORY_LABELS_RU[st.category] || st.category;

		let stageItemsHtml = "";
		for (const it of st.items) {
			const toothStr = it.toothNumber ? `Зуб ${it.toothNumber}` : "—";
			const codeStr = it.code804n ? `[${escapeXml(it.code804n)}] ` : "";
			const nameStr = escapeXml(it.name);
			const priceRub = formatRubKopecks(it.unitPriceKopecks);
			const itemTotalRub = formatRubKopecks(it.totalPriceKopecks);
			const discStr = it.discountPercent > 0 ? `${it.discountPercent}%` : "—";

			stageItemsHtml += `<tr>
<td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 6px;">${itemCounter++}</td>
<td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 6px;">${toothStr}</td>
<td style="border: 1px solid #d1d5db; padding: 4px 6px;">${codeStr}${nameStr}</td>
<td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 6px;">${it.quantity}</td>
<td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 6px;">${priceRub}</td>
<td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 6px;">${discStr}</td>
<td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 6px; font-weight: 600;">${itemTotalRub}</td>
</tr>`;
		}

		stagesRowsHtml += `<tr style="background-color: #f3f4f6; font-weight: 600;">
<td colspan="7" style="border: 1px solid #d1d5db; padding: 6px 8px;">
Этап ${st.stageNumber}: ${escapeXml(st.title)} (${escapeXml(stageCategory)})
<span style="float: right;">Итого по этапу: ${stageTotalRub} руб.</span>
</td>
</tr>${stageItemsHtml}`;
	}

	let scheduleHtml = "";
	if (budget.installmentSchedule && budget.installmentSchedule.length > 0) {
		let schedRows = "";
		for (const sch of budget.installmentSchedule) {
			schedRows += `<tr>
<td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 6px;">${sch.installmentNumber}</td>
<td style="border: 1px solid #d1d5db; padding: 4px 6px;">${escapeXml(sch.description)}</td>
<td style="text-align: center; border: 1px solid #d1d5db; padding: 4px 6px;">${escapeXml(sch.paymentDateIso)}</td>
<td style="text-align: right; border: 1px solid #d1d5db; padding: 4px 6px; font-weight: 600;">${formatRubKopecks(sch.amountKopecks)} руб.</td>
</tr>`;
		}

		scheduleHtml = `<div style="margin-top: 14px;">
<div style="font-weight: bold; margin-bottom: 4px;">График и условия внесения платежей:</div>
<table style="width: 100%; border-collapse: collapse; font-size: 11px;">
<thead>
<tr style="background-color: #f9fafb;">
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 40px;">№</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; text-align: left;">Назначение платежа / Этап</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 120px;">Срок оплаты</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 120px; text-align: right;">Сумма (руб.)</th>
</tr>
</thead>
<tbody>${schedRows}</tbody>
</table>
</div>`;
	}

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Смета на оказание платных медицинских услуг № ${escapeXml(budget.budgetNumber)}</title>
<style>
@page { size: A4 portrait; margin: 12mm 15mm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; line-height: 1.35; color: #111827; margin: 0; padding: 0; }
table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
tr { page-break-inside: avoid; }
.section-header { font-size: 12px; font-weight: bold; margin-top: 10px; margin-bottom: 4px; border-bottom: 1px solid #9ca3af; padding-bottom: 2px; }
</style>
</head>
<body>
<div style="text-align: right; font-size: 10px; color: #4b5563; margin-bottom: 6px;">
Приложение № 1<br>${contractRef}<br>по Постановлению Правительства РФ от 11.05.2023 № 736
</div>
<div style="text-align: center; margin-bottom: 12px;">
<div style="font-size: 15px; font-weight: bold; text-transform: uppercase;">Смета на предоставление платных медицинских услуг</div>
<div style="font-size: 12px; font-weight: 600; margin-top: 2px;">№ ${escapeXml(budget.budgetNumber)} от ${escapeXml(budget.createdAt ? toIsoDateString(new Date(budget.createdAt)) : toIsoDateString(new Date()))} г.</div>
</div>
<table style="margin-bottom: 10px; font-size: 11px;">
<tr>
<td style="width: 50%; vertical-align: top; padding-right: 10px;">
<div style="font-weight: bold; margin-bottom: 2px;">Исполнитель (Клиника):</div>
<div><strong>Организация:</strong> ${legalName}</div>
<div><strong>ИНН / ОГРН:</strong> ${inn} / ${ogrn}</div>
<div><strong>Лицензия:</strong> ${license}</div>
<div><strong>Адрес:</strong> ${address}</div>
<div><strong>Телефон:</strong> ${phone}</div>
</td>
<td style="width: 50%; vertical-align: top; padding-left: 10px;">
<div style="font-weight: bold; margin-bottom: 2px;">Пациент (Потребитель):</div>
<div><strong>ФИО:</strong> ${patientName}</div>
<div><strong>Дата рождения:</strong> ${birthDate}</div>
<div><strong>Медицинская карта 043/у:</strong> ${cardNumber}</div>
<div><strong>Телефон:</strong> ${patientPhone}</div>
<div><strong>Лечащий врач:</strong> ${doctorName} (${specialty})</div>
</td>
</tr>
</table>
<div class="section-header">Перечень и стоимость медицинских услуг по этапам лечения:</div>
<table>
<thead>
<tr style="background-color: #f9fafb;">
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 28px;">№</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 70px;">Область/Зуб</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; text-align: left;">Наименование медицинской услуги</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 45px;">Кол-во</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 75px; text-align: right;">Цена (руб.)</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 50px;">Скидка</th>
<th style="border: 1px solid #d1d5db; padding: 4px 6px; width: 85px; text-align: right;">Итого (руб.)</th>
</tr>
</thead>
<tbody>${stagesRowsHtml}</tbody>
</table>
<table style="margin-top: 10px; font-size: 11px;">
<tr>
<td style="width: 60%; vertical-align: top;">
<div><strong>Форма оплаты:</strong> ${BUDGET_PAYMENT_TYPE_LABELS_RU[budget.paymentType]}</div>
${budget.validUntilDate ? `<div><strong>Срок действия сметы:</strong> до ${escapeXml(budget.validUntilDate)}</div>` : ""}
${options?.customNotes ? `<div style="margin-top: 4px; color: #4b5563;"><strong>Примечание:</strong> ${escapeXml(options.customNotes)}</div>` : ""}
</td>
<td style="width: 40%; vertical-align: top;">
<table style="width: 100%;">
<tr><td style="padding: 2px 0;">Общая сумма без скидки:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${subtotalRub} руб.</td></tr>
<tr><td style="padding: 2px 0;">Сумма скидки:</td><td style="text-align: right; font-weight: 600; padding: 2px 0;">${discountRub} руб.</td></tr>
<tr style="border-top: 1px solid #111827;">
<td style="padding: 4px 0; font-size: 12px; font-weight: bold;">ИТОГО К ОПЛАТЕ:</td>
<td style="text-align: right; font-size: 12px; font-weight: bold; padding: 4px 0;">${grandTotalRub} руб.</td>
</tr>
</table>
</td>
</tr>
</table>
<div style="margin-top: 6px; font-size: 11px;">
<strong>Сумма к оплате прописью:</strong> ${amountWords}.
</div>
${scheduleHtml}
<div style="margin-top: 12px; font-size: 9.5px; color: #4b5563; line-height: 1.3;">
Смета составлена в соответствии с требованиями Постановления Правительства РФ от 11.05.2023 № 736
«Об утверждении Правил предоставления медицинскими организациями платных медицинских услуг», Закона РФ от 07.02.1992 № 2300-1
«О защите прав потребителей» и ст. 709 Гражданского кодекса РФ. Смета согласована сторонами и является неотъемлемой
частью Договора на оказание платных медицинских услуг. Дополнительные медицинские услуги, возникшие в процессе лечения,
оказываются исключительно с предварительного согласия Пациента с составлением дополнительной сметы.
</div>
<div style="margin-top: 20px; page-break-inside: avoid;">
<table style="width: 100%;">
<tr>
<td style="width: 48%; vertical-align: bottom;">
<div><strong>От Исполнителя:</strong></div>
<div style="margin-top: 22px; border-bottom: 1px solid #111827; width: 90%;"></div>
<div style="font-size: 9px; color: #6b7280; margin-top: 2px;">(подпись, печать / расшифровка: ${doctorName})</div>
</td>
<td style="width: 4%;">&nbsp;</td>
<td style="width: 48%; vertical-align: bottom;">
<div><strong>От Потребителя (Пациента):</strong></div>
<div style="margin-top: 22px; border-bottom: 1px solid #111827; width: 90%;"></div>
<div style="font-size: 9px; color: #6b7280; margin-top: 2px;">(подпись / расшифровка: ${patientName})</div>
</td>
</tr>
</table>
</div>
</body>
</html>`;
}
