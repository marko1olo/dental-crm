/**
 * leadReliabilityScoring.ts — Deterministic Clinical Lead Reliability Engine.
 *
 * MANDATE 8ap (Anti-Fabrication & Ban on Pseudo-Scientific Regex Scoring):
 * - Scoring is strictly calculated from VERIFIABLE NORMALIZED DATABASE FIELDS:
 *   1) Visit history in the clinic (completedVisitsCount, hasExistingPatient);
 *   2) Explicit appointment/time confirmation (isTimeConfirmed, stage);
 *   3) Verified inbound communication channel (phone, messengers, recommendations).
 * - TOTAL BAN ON REGEX / KEYWORD SEARCH IN FREE-TEXT NOTES.
 *   Human notes are for human doctors/administrators, not for fake AI scoring.
 */

export interface LeadReliabilityInput {
	readonly id?: string | undefined;
	readonly hasExistingPatient?: boolean | undefined;
	readonly completedVisitsCount?: number | undefined;
	readonly noShowCount?: number | undefined;
	readonly cancellationsCount?: number | undefined;
	readonly isTimeConfirmed?: boolean | undefined;
	readonly stage?: string | null | undefined;
	readonly channel?: string | null | undefined;
	readonly source?: string | null | undefined;
	readonly phone?: string | null | undefined;
	/**
	 * Unstructured human notes.
	 * MANDATE 8ap: Strictly IGNORED by the scoring engine.
	 */
	readonly notes?: string | null | undefined;
}

export type LeadReliabilityTier = "high" | "medium" | "low" | "unrated";

export interface LeadReliabilityEvaluation {
	readonly score: number; // 0..100
	readonly tier: LeadReliabilityTier;
	readonly tierLabelRu: string;
	readonly confidenceFactors: readonly string[];
	readonly riskFactors: readonly string[];
}

export function computeLeadReliabilityScore(
	input: LeadReliabilityInput,
): LeadReliabilityEvaluation {
	const confidenceFactors: string[] = [];
	const riskFactors: string[] = [];

	const completedVisits = input.completedVisitsCount ?? (input.hasExistingPatient ? 1 : 0);
	const noShows = input.noShowCount ?? 0;
	const cancellations = input.cancellationsCount ?? 0;

	// Is this a brand-new lead with zero verifiable touchpoints?
	const isFreshNewLead =
		!input.hasExistingPatient &&
		completedVisits === 0 &&
		!input.isTimeConfirmed &&
		(!input.stage || input.stage === "new") &&
		!input.channel &&
		!input.source;

	if (isFreshNewLead) {
		return {
			score: 50,
			tier: "unrated",
			tierLabelRu: "Новое обращение (без истории)",
			confidenceFactors: ["Первичное обращение в клинику"],
			riskFactors: [],
		};
	}

	let score = 50; // Baseline for structured inquiries

	// 1. Normalized visit history
	if (completedVisits >= 3) {
		score += 35;
		confidenceFactors.push(`Постоянный пациент клиники (${completedVisits} завершённых визитов)`);
	} else if (completedVisits > 0 || input.hasExistingPatient) {
		score += 25;
		confidenceFactors.push("Повторный пациент с успешной историей визитов");
	}

	// 2. Appointment confirmation status
	const isConfirmed =
		Boolean(input.isTimeConfirmed) ||
		input.stage === "consult_booked" ||
		input.stage === "showed_up" ||
		input.stage === "converted";

	if (isConfirmed) {
		score += 20;
		confidenceFactors.push("Время консультации зафиксировано в расписании");
	}

	// 3. First contact channel verification
	const sourceNormalized = (input.channel || input.source || "").toLowerCase();
	if (
		sourceNormalized.includes("call") ||
		sourceNormalized.includes("звонок") ||
		sourceNormalized.includes("телефон")
	) {
		score += 15;
		confidenceFactors.push("Входящий телефонный звонок (высокая вовлечённость)");
	} else if (
		sourceNormalized.includes("recom") ||
		sourceNormalized.includes("рекомендац") ||
		sourceNormalized.includes("сарафан")
	) {
		score += 20;
		confidenceFactors.push("Обращение по личной рекомендации");
	} else if (
		sourceNormalized.includes("whatsapp") ||
		sourceNormalized.includes("telegram") ||
		sourceNormalized.includes("мессенджер")
	) {
		score += 10;
		confidenceFactors.push("Прямой диалог в мессенджере");
	} else if (sourceNormalized.length > 0) {
		score += 5;
		confidenceFactors.push("Электронная заявка с подтверждённым каналом");
	}

	// 4. Normalized disciplinary risk deductions
	if (noShows > 0) {
		const penalty = Math.min(40, noShows * 20);
		score -= penalty;
		riskFactors.push(`В истории ${noShows} пропуск(ов) визита без предупреждения (-${penalty} б.)`);
	}

	if (cancellations > 1) {
		const penalty = Math.min(25, (cancellations - 1) * 10);
		score -= penalty;
		riskFactors.push(`В истории ${cancellations} отмен визитов (-${penalty} б.)`);
	}

	// Clamp between 0 and 100
	const finalScore = Math.max(0, Math.min(100, Math.round(score)));

	let tier: LeadReliabilityTier;
	let tierLabelRu: string;

	if (finalScore >= 75) {
		tier = "high";
		tierLabelRu = "Высокая надёжность";
	} else if (finalScore >= 45) {
		tier = "medium";
		tierLabelRu = "Стандартная надёжность";
	} else {
		tier = "low";
		tierLabelRu = "Требует внимания";
	}

	return {
		score: finalScore,
		tier,
		tierLabelRu,
		confidenceFactors,
		riskFactors,
	};
}
