/**
 * semanticRouter.ts — Fast Deterministic Semantic Router & Task Decomposer.
 *
 * Statutory & Functional Mandate:
 * - Decomposes compound multi-domain doctor prompts into discrete clinical,
 *   financial, and scheduling subtasks without slow multi-LLM cascading.
 * - Single-model ReAct architecture: 0 extra LLM calls, <1ms deterministic
 *   tokenization & syntactic analysis.
 * - Categorization domains:
 *   1. `clinical`: odontogram, diagnoses, tooth treatments, extractions, endo, implants.
 *   2. `finance`: discounts (percentage or fixed rubles/kopecks), billing estimates, 804n nomenclature.
 *   3. `booking`: appointments, recalls, calendar slots with relative time offsets ("через 3 месяца", "через неделю").
 * - Unifies subtask execution into a coherent, professional clinical copilot response.
 */

import { isValidFdiToothNumber } from "./validatorAgent.js";

// ============================================================================
// CONTRACTS & TYPES
// ============================================================================

export type SubtaskIntent = "clinical" | "finance" | "booking" | "unknown";

export type ClinicalActionType =
	| "extraction"
	| "restoration"
	| "endodontics"
	| "implant"
	| "crown"
	| "hygiene"
	| "examination"
	| "diagnosis"
	| "generic";

export type FinanceActionType =
	| "apply_discount"
	| "calculate_estimate"
	| "generate_invoice"
	| "generic";

export type BookingActionType =
	| "schedule_appointment"
	| "find_slot"
	| "recall"
	| "generic";

export interface ClinicalSubtask {
	readonly intent: "clinical";
	readonly action: ClinicalActionType;
	readonly toothNumber?: number | undefined;
	readonly toothNumbers?: readonly number[] | undefined;
	readonly procedureTitle: string;
	readonly diagnoses?: readonly string[] | undefined;
	readonly rawTextSegment: string;
}

export interface FinanceSubtask {
	readonly intent: "finance";
	readonly action: FinanceActionType;
	readonly discountType: "percent" | "fixed_rub" | "none";
	readonly discountValue: number;
	readonly discountPercent?: number | undefined;
	readonly discountRub?: number | undefined;
	readonly discountKopecks?: number | undefined;
	readonly rawTextSegment: string;
}

export interface BookingSubtask {
	readonly intent: "booking";
	readonly action: BookingActionType;
	readonly targetProcedure: string;
	readonly timeOffsetDescription: string;
	readonly relativeDays: number;
	readonly suggestedDateIso?: string | undefined;
	readonly rawTextSegment: string;
}

export type DecomposedSubtask = ClinicalSubtask | FinanceSubtask | BookingSubtask;

export interface DecomposedTaskPlan {
	readonly rawPrompt: string;
	readonly subtasks: readonly DecomposedSubtask[];
	readonly hasClinical: boolean;
	readonly hasFinance: boolean;
	readonly hasBooking: boolean;
	readonly intents: readonly SubtaskIntent[];
	readonly decomposedAtIso: string;
}

export interface SemanticRouterContext {
	readonly patientId?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly currentTooth?: number | undefined;
	readonly referenceDate?: Date | undefined;
}

export interface SemanticRouterResult {
	readonly plan: DecomposedTaskPlan;
	readonly unifiedResponseRu: string;
	readonly stagedActions: readonly {
		readonly domain: SubtaskIntent;
		readonly summary: string;
		readonly payload: Record<string, unknown>;
	}[];
}

// ============================================================================
// REGEX PATTERNS & TOKENIZERS
// ============================================================================

// Punctuation & clause splitters: commas, semicolons, "и", "а также", newlines
const CLAUSE_SPLIT_REGEX = /[,;\n]+|\s+и\s+|\s+а\s+также\s+/i;

// Tooth extraction regex: "36 зуб", "зуб 36", "на 24 зубе", "зуба 16", etc.
const TOOTH_REGEX = /(?:зуб(?:а|е|у|ом)?\s*(\d{2})|(\d{2})\s*зуб(?:а|е|у|ом)?)/i;

// Action keywords
const EXTRACTION_KEYWORDS = ["удали", "удаление", "удалить", "экстракц", "удалка"];
const RESTORATION_KEYWORDS = ["кариес", "вылечи", "лечение кариеса", "пломб", "реставрац", "поставь пломбу"];
const ENDODONTICS_KEYWORDS = ["пульпит", "периодонтит", "каналы", "депульп", "эндодонт", "чистка каналов"];
const IMPLANT_KEYWORDS = ["имплант", "имплантац", "имплантир", "винтовой имплантат", "установка импланта"];
const CROWN_KEYWORDS = ["коронк", "протез", "вкладк", "протезирован", "слепок", "сканирован"];
const HYGIENE_KEYWORDS = ["гигиен", "профгигиен", "чистк", "air-flow", "ультразвук", "зубной камень"];
const EXAM_KEYWORDS = ["осмотр", "консультац", "диагностик", "прием", "приём", "кт", "рентген"];

// Discount keywords
const DISCOUNT_PERCENT_REGEX = /(?:скидк[ауе]?\s*(\d{1,2})\s*%|(\d{1,2})\s*%\s*скидк[ауе]?)/i;
const DISCOUNT_FIXED_REGEX = /(?:скидк[ауе]?\s*(\d+)\s*(?:руб|р|₽)|(\d+)\s*(?:руб|р|₽)\s*скидк[ауе]?|скинь\s*(\d+)\s*(?:руб|р|₽)?)/i;

// Booking & time offset keywords
const BOOKING_KEYWORDS = ["запиши", "записать", "назначь", "назначить", "визит", "прием", "приём", "запись"];

const OFFSET_MONTH_REGEX = /через\s*(\d+)?\s*(?:мес|месяц|месяца|месяцев)/i;
const OFFSET_WEEK_REGEX = /через\s*(\d+)?\s*(?:нед|неделю|недели|недель)/i;
const OFFSET_DAY_REGEX = /через\s*(\d+)?\s*(?:дн|дня|дней)/i;
const OFFSET_TOMORROW_REGEX = /завтра/i;

// ============================================================================
// DETERMINISTIC SEMANTIC ROUTER IMPLEMENTATION
// ============================================================================

export class SemanticRouter {
	/**
	 * Decomposes a compound doctor prompt into discrete clinical, finance,
	 * and booking subtasks.
	 */
	public static decompose(
		prompt: string,
		context?: SemanticRouterContext,
	): DecomposedTaskPlan {
		const rawPrompt = prompt.trim();
		const segments = rawPrompt
			.split(CLAUSE_SPLIT_REGEX)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		const subtasks: DecomposedSubtask[] = [];
		const referenceDate = context?.referenceDate ?? new Date();

		// Track which intents were detected
		let hasClinical = false;
		let hasFinance = false;
		let hasBooking = false;

		// First pass: evaluate individual segments
		for (const segment of segments) {
			const lower = segment.toLowerCase();

			// ── 1. FINANCE SUBTASK DETECTION ───────────────────────────────────
			const percentMatch = lower.match(DISCOUNT_PERCENT_REGEX);
			const fixedMatch = lower.match(DISCOUNT_FIXED_REGEX);

			if (percentMatch || fixedMatch || lower.includes("скидк") || lower.includes("скинь")) {
				let discountType: "percent" | "fixed_rub" | "none" = "none";
				let discountValue = 0;
				let discountPercent: number | undefined = undefined;
				let discountRub: number | undefined = undefined;

				if (percentMatch) {
					discountType = "percent";
					discountValue = Number.parseInt(percentMatch[1] || percentMatch[2] || "0", 10);
					discountPercent = discountValue;
				} else if (fixedMatch) {
					discountType = "fixed_rub";
					discountValue = Number.parseInt(
						fixedMatch[1] || fixedMatch[2] || fixedMatch[3] || "0",
						10,
					);
					discountRub = discountValue;
				}

				subtasks.push({
					intent: "finance",
					action: "apply_discount",
					discountType,
					discountValue,
					...(discountPercent !== undefined ? { discountPercent } : {}),
					...(discountRub !== undefined ? { discountRub, discountKopecks: discountRub * 100 } : {}),
					rawTextSegment: segment,
				});
				hasFinance = true;
				continue; // segment parsed as finance
			}

			// ── 2. BOOKING SUBTASK DETECTION ───────────────────────────────────
			const isBookingTrigger = BOOKING_KEYWORDS.some((kw) => lower.includes(kw));
			const hasTimeOffset =
				OFFSET_MONTH_REGEX.test(lower) ||
				OFFSET_WEEK_REGEX.test(lower) ||
				OFFSET_DAY_REGEX.test(lower) ||
				OFFSET_TOMORROW_REGEX.test(lower);

			if (isBookingTrigger || (hasTimeOffset && !lower.includes("болит"))) {
				let relativeDays = 0;
				let timeDesc = "в ближайшее время";

				const monthMatch = lower.match(OFFSET_MONTH_REGEX);
				const weekMatch = lower.match(OFFSET_WEEK_REGEX);
				const dayMatch = lower.match(OFFSET_DAY_REGEX);

				if (monthMatch) {
					const count = Number.parseInt(monthMatch[1] || "1", 10);
					relativeDays = count * 30;
					timeDesc = `через ${count} мес.`;
				} else if (weekMatch) {
					const count = Number.parseInt(weekMatch[1] || "1", 10);
					relativeDays = count * 7;
					timeDesc = `через ${count} нед.`;
				} else if (dayMatch) {
					const count = Number.parseInt(dayMatch[1] || "1", 10);
					relativeDays = count;
					timeDesc = `через ${count} дн.`;
				} else if (OFFSET_TOMORROW_REGEX.test(lower)) {
					relativeDays = 1;
					timeDesc = "завтра";
				}

				// Extract target procedure for booking
				let targetProcedure = "Повторный приём / Осмотр";
				if (IMPLANT_KEYWORDS.some((kw) => lower.includes(kw))) {
					targetProcedure = "Дентальная имплантация";
				} else if (CROWN_KEYWORDS.some((kw) => lower.includes(kw))) {
					targetProcedure = "Ортопедический этап / Фиксация коронки";
				} else if (HYGIENE_KEYWORDS.some((kw) => lower.includes(kw))) {
					targetProcedure = "Профессиональная гигиена полости рта";
				} else if (RESTORATION_KEYWORDS.some((kw) => lower.includes(kw))) {
					targetProcedure = "Терапевтический прием (лечение кариеса)";
				}

				const targetDate = new Date(
					referenceDate.getTime() + relativeDays * 24 * 60 * 60 * 1000,
				);

				subtasks.push({
					intent: "booking",
					action: "schedule_appointment",
					targetProcedure,
					timeOffsetDescription: timeDesc,
					relativeDays,
					suggestedDateIso: targetDate.toISOString(),
					rawTextSegment: segment,
				});
				hasBooking = true;
				continue; // segment parsed as booking
			}

			// ── 3. CLINICAL SUBTASK DETECTION ──────────────────────────────────
			const toothMatch = segment.match(TOOTH_REGEX);
			let toothNumber: number | undefined = undefined;
			if (toothMatch) {
				const rawNum = Number.parseInt(toothMatch[1] || toothMatch[2] || "0", 10);
				if (isValidFdiToothNumber(rawNum)) {
					toothNumber = rawNum;
				}
			}

			// Determine clinical action
			let action: ClinicalActionType = "generic";
			let procedureTitle = "Клинический осмотр";
			const diagnoses: string[] = [];

			if (EXTRACTION_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "extraction";
				procedureTitle = toothNumber ? `Удаление зуба ${toothNumber}` : "Удаление зуба";
				diagnoses.push("K04.7"); // Периапикальный абсцесс / разрушение
			} else if (RESTORATION_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "restoration";
				procedureTitle = toothNumber ? `Лечение кариеса зуба ${toothNumber}` : "Лечение кариеса";
				diagnoses.push("K02.1"); // Кариес дентина
			} else if (ENDODONTICS_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "endodontics";
				procedureTitle = toothNumber ? `Эндодонтическое лечение зуба ${toothNumber}` : "Эндодонтическое лечение";
				diagnoses.push("K04.0"); // Пульпит
			} else if (IMPLANT_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "implant";
				procedureTitle = toothNumber ? `Дентальная имплантация в области ${toothNumber}` : "Дентальная имплантация";
				diagnoses.push("K08.1"); // Потеря зубов вследствие несчастного случая/удаления
			} else if (CROWN_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "crown";
				procedureTitle = toothNumber ? `Установка коронки на зуб ${toothNumber}` : "Протезирование коронкой";
				diagnoses.push("K08.2"); // Атрофия альвеолярного края / дефект коронковой части
			} else if (HYGIENE_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "hygiene";
				procedureTitle = "Профессиональная гигиена полости рта (Air-Flow + УЗ)";
				diagnoses.push("K05.0"); // Острый гингивит / зубной налет
			} else if (EXAM_KEYWORDS.some((kw) => lower.includes(kw))) {
				action = "examination";
				procedureTitle = "Консультация и диагностический осмотр стоматолога";
			}

			// If we found an action or a valid tooth number, record clinical subtask
			if (action !== "generic" || toothNumber !== undefined) {
				subtasks.push({
					intent: "clinical",
					action,
					...(toothNumber !== undefined ? { toothNumber } : {}),
					procedureTitle,
					diagnoses: diagnoses.length > 0 ? diagnoses : undefined,
					rawTextSegment: segment,
				});
				hasClinical = true;
			}
		}

		// Fallback: If no subtasks were parsed via segments, run global match on the whole prompt
		if (subtasks.length === 0) {
			const lower = rawPrompt.toLowerCase();
			const toothMatch = rawPrompt.match(TOOTH_REGEX);
			let toothNumber: number | undefined = undefined;
			if (toothMatch) {
				const rawNum = Number.parseInt(toothMatch[1] || toothMatch[2] || "0", 10);
				if (isValidFdiToothNumber(rawNum)) {
					toothNumber = rawNum;
				}
			}

			subtasks.push({
				intent: "clinical",
				action: "examination",
				...(toothNumber !== undefined ? { toothNumber } : {}),
				procedureTitle: toothNumber ? `Осмотр и лечение зуба ${toothNumber}` : "Консультация стоматолога",
				rawTextSegment: rawPrompt,
			});
			hasClinical = true;
		}

		const intents = Array.from(new Set(subtasks.map((s) => s.intent))) as SubtaskIntent[];

		return {
			rawPrompt,
			subtasks,
			hasClinical,
			hasFinance,
			hasBooking,
			intents,
			decomposedAtIso: new Date().toISOString(),
		};
	}

	/**
	 * Dispatches decomposed subtasks and aggregates results into a clean,
	 * unified response string with staged actions.
	 */
	public static dispatchAndAggregate(
		plan: DecomposedTaskPlan,
		context?: SemanticRouterContext,
	): SemanticRouterResult {
		const summaryParts: string[] = [];
		const stagedActions: {
			domain: SubtaskIntent;
			summary: string;
			payload: Record<string, unknown>;
		}[] = [];

		for (const subtask of plan.subtasks) {
			if (subtask.intent === "clinical") {
				const toothLabel = subtask.toothNumber ? ` зуба ${subtask.toothNumber}` : "";
				summaryParts.push(`1. Клиника: запланировано "${subtask.procedureTitle}"`);
				stagedActions.push({
					domain: "clinical",
					summary: `Клиническая манипуляция: ${subtask.procedureTitle}`,
					payload: {
						action: subtask.action,
						tooth: subtask.toothNumber,
						procedureTitle: subtask.procedureTitle,
						diagnoses: subtask.diagnoses,
					},
				});
			} else if (subtask.intent === "finance") {
				const discountLabel =
					subtask.discountType === "percent"
						? `${subtask.discountValue}%`
						: subtask.discountType === "fixed_rub"
							? `${subtask.discountValue} ₽`
							: "по прайсу";
				summaryParts.push(`2. Финансы: применена скидка ${discountLabel}`);
				stagedActions.push({
					domain: "finance",
					summary: `Применение скидки ${discountLabel} к сметному расчету`,
					payload: {
						discountType: subtask.discountType,
						discountValue: subtask.discountValue,
						discountPercent: subtask.discountPercent,
						discountRub: subtask.discountRub,
					},
				});
			} else if (subtask.intent === "booking") {
				const formattedDate = subtask.suggestedDateIso
					? new Date(subtask.suggestedDateIso).toLocaleDateString("ru-RU", {
							day: "numeric",
							month: "long",
							year: "numeric",
						})
					: subtask.timeOffsetDescription;

				summaryParts.push(
					`3. Запись: предварительная бронь на процедуру "${subtask.targetProcedure}" (${subtask.timeOffsetDescription}, ориентировочно: ${formattedDate})`,
				);
				stagedActions.push({
					domain: "booking",
					summary: `Запись на приём: ${subtask.targetProcedure} (${subtask.timeOffsetDescription})`,
					payload: {
						targetProcedure: subtask.targetProcedure,
						timeOffset: subtask.timeOffsetDescription,
						relativeDays: subtask.relativeDays,
						targetDateIso: subtask.suggestedDateIso,
					},
				});
			}
		}

		const unifiedResponseRu = [
			"Составной запрос врача успешно разобран и скоординирован:",
			...summaryParts,
		].join("\n");

		return {
			plan,
			unifiedResponseRu,
			stagedActions,
		};
	}
}
