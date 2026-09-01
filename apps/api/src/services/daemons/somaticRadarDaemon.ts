/**
 * somaticRadarDaemon.ts — 07:30 AM Morning Pre-Shift Somatic Risk & DDI Clinical Radar.
 *
 * Scans today's scheduled appointments for all doctors across the clinic:
 * 1. Analyzes patient electronic health records (EHR), anamnesis notes, active prescriptions,
 *    and verified drug allergies (patientDrugAllergies).
 * 2. Applies Clinical NLP Negation Parser:
 *    - Accurately excludes negated, historical, or resolved conditions
 *      (e.g., "отрицает варфарин", "аспирин отменен", "аллергии на артикаин нет", "давление в норме", "криз в 2012 г.").
 * 3. Cross-references patient somatic profile with scheduled dental procedures.
 * 4. Applies dual-factor high-precision trigger logic:
 *    - Generates quiet, actionable clinical alerts ONLY when a genuine risk combination occurs:
 *      * Patient for surgery/extraction + taking Anticoagulants (Warfarin, Xarelto, Plavix, Aspirin, Eliquis).
 *        -> Alert: "Высокий риск кровотечения. Рекомендовано: коагулограмма (МНО/АЧТВ) перед манипуляцией, местный гемостаз".
 *      * Patient for anesthesia + allergy to Articaine / Amide anesthetics.
 *        -> Alert: "Противопоказан Артикаин. Рекомендован Мепивакаин 3% без вазоконстриктора или Скандонест".
 *      * Patient for anesthesia + Stage III Hypertension / Thyrotoxicosis / Pheochromocytoma.
 *        -> Alert: "Противопоказан адреналин/эпинефрин. Использовать анестезию без вазоконстриктора (Мепивакаин 3% / Скандонест 3%)".
 *      * Patient with Bronchial Asthma / Sulfite Allergy vs Adrenaline with Metabisulfite (E223).
 *        -> Alert: "Противопоказаны анестетики с метабисульфитом натрия (E223). Рекомендован Мепивакаин 3% или Ультракаин Д".
 *      * Patient on Bisphosphonates / Denosumab + Invasive Surgery.
 *        -> Alert: "Высокий риск остеонекроза челюсти (MRONJ). Атравматичный протокол и антибиотикопрофилактика".
 * 5. Yields structured Copilot cards & Quiet Passive Badges for doctor pre-shift review with zero modal blockers.
 * 6. High-Performance Architecture: Uses batch parallel queries (inArray) to eliminate N+1 database patterns.
 */

import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	electronicPrescriptionItems,
	electronicPrescriptions,
	patientDrugAllergies,
	patients,
	users,
	visits,
} from "../../db/schema.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type SomaticThreatCategory =
	| "anticoagulant_surgery"
	| "anesthetic_allergy"
	| "vasoconstrictor_contraindication"
	| "sulfite_asthma"
	| "bisphosphonates_osteonecrosis"
	| "penicillin_allergy"
	| "nsaid_contraindication"
	| "somatic_general";

export interface SomaticRadarAlertAction {
	readonly actionId: string;
	readonly title: string;
	readonly payload: Record<string, unknown>;
}

export interface SomaticRadarAlert {
	readonly id: string;
	readonly organizationId: string;
	readonly appointmentId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPhone: string | null;
	readonly patientAgeYears: number | null;
	readonly doctorId: string | null;
	readonly doctorName: string;
	readonly appointmentStartsAt: string; // ISO
	readonly appointmentReason: string | null;
	readonly isSurgeryPlanned: boolean;
	readonly category: SomaticThreatCategory;
	readonly threatTitleRu: string;
	readonly badgeText: string;
	readonly urgency: "CRITICAL" | "HIGH" | "WARNING";
	readonly clinicalAlertMessage: string;
	readonly detectedTriggers: string[];
	readonly contraindicatedDrugs: string[];
	readonly recommendedAlternatives: string[];
	readonly clinicalGuidanceRu: string;
	readonly suggestedActions: SomaticRadarAlertAction[];
	readonly createdAt: string; // ISO
}

export interface SomaticRadarPreShiftSummary {
	readonly id: string;
	readonly organizationId: string;
	readonly shiftDate: string;
	readonly totalAppointmentsScanned: number;
	readonly totalPatientsWithRisk: number;
	readonly criticalThreatsCount: number;
	readonly highThreatsCount: number;
	readonly warningsCount: number;
	readonly alerts: SomaticRadarAlert[];
	readonly createdAt: string;
}

export interface PatientSomaticProfileInput {
	readonly patientId: string;
	readonly organizationId: string;
	readonly fullName: string;
	readonly birthDate?: string | null;
	readonly phone?: string | null;
	readonly notes?: string | null;
	readonly allergies?: Array<{
		readonly allergenGroup: string;
		readonly drugInnLatin?: string | null;
		readonly reactionSeverity?: string | null;
		readonly clinicalManifestations?: string | null;
		readonly hasSamterTriad?: boolean | null;
		readonly notes?: string | null;
	}>;
	readonly pastAnamnesisText?: string | null;
	readonly pastDiagnosesText?: string | null;
	readonly activeMedications?: string[];
}

export interface AppointmentSomaticContextInput {
	readonly appointmentId: string;
	readonly organizationId: string;
	readonly doctorId?: string | null;
	readonly doctorName?: string;
	readonly startsAt: string | Date;
	readonly endsAt?: string | Date;
	readonly reason?: string | null;
	readonly comment?: string | null;
	readonly plannedServices?: Array<{
		readonly code?: string | null;
		readonly title: string;
	}>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLINICAL VOCABULARY & KEYWORD DICTIONARIES
// ─────────────────────────────────────────────────────────────────────────────

const SURGERY_PROCEDURE_KEYWORDS = [
	"удален",
	"экстракци",
	"имплант",
	"синус-лифт",
	"резекци",
	"кюретаж",
	"остеопластик",
	"костн",
	"апикоэктоми",
	"периостотоми",
	"вскрытие абсцесса",
	"лоскутн",
	"гингивэктоми",
	"surgery",
	"extraction",
	"implant",
];

const SURGERY_NOMENCLATURE_CODES = [
	"a16.07.001", // Удаление зуба
	"a16.07.054", // Внутрикостная дентальная имплантация
	"a16.07.026", // Резекция верхушки корня
	"a16.07.041", // Костная пластика челюстно-лицевой области
	"a16.07.042", // Синус-лифтинг
	"a16.07.043", // Гингивэктомия
	"a16.07.044", // Лоскутная операция
	"a16.07.011", // Периостотомия
	"a16.07.016", // Цистэктомия
];

const ANTICOAGULANT_KEYWORDS = [
	"варфарин",
	"warfarin",
	"ксарелто",
	"xarelto",
	"ривароксабан",
	"rivaroxaban",
	"эликвис",
	"eliquis",
	"апиксабан",
	"apixaban",
	"прадакса",
	"pradaxa",
	"дабигатран",
	"dabigatran",
	"плавикс",
	"plavix",
	"клопидогрел",
	"clopidogrel",
	"брилинта",
	"brilinta",
	"тикагрелор",
	"ticagrelor",
	"аспирин",
	"aspirin",
	"тромбо асс",
	"thrombo ass",
	"кардиомагнил",
	"cardiomagnyl",
	"клексан",
	"clexane",
	"эноксапарин",
	"enoxaparin",
	"гепарин",
	"heparin",
	"фраксипарин",
	"fraxiparine",
	"антикоагулянт",
	"дезагрегант",
];

const ARTICAINE_AMIDE_KEYWORDS = [
	"артикаин",
	"articaine",
	"ультракаин",
	"ultracain",
	"септанест",
	"septanest",
	"убистезин",
	"ubistesin",
	"альфакаин",
	"alphacaine",
	"лидокаин",
	"lidocaine",
	"амидные анестетики",
	"амидн",
];

const VASOCONSTRICTOR_CONTRAINDICATION_KEYWORDS = [
	"гипертония 3",
	"гипертоническая болезнь 3",
	"гипертоническая болезнь iii",
	"гипертония iii",
	"гипертонический криз",
	"криз",
	"неконтролируемая гипертензия",
	"severe_hypertension",
	"тиреотоксикоз",
	"гипертиреоз",
	"базедова",
	"зоб токсический",
	"thyrotoxicosis",
	"феохромоцитом",
	"pheochromocytoma",
	"пропранолол",
	"анаприлин",
	"соталол",
	"пароксизмальная тахикардия",
	"мерцательная аритмия",
];

const SULFITE_ASTHMA_KEYWORDS = [
	"бронхиальная астма",
	"астма",
	"asthma",
	"сульфит",
	"метабисульфит",
	"sulfite",
	"e223",
];

const BISPHOSPHONATES_KEYWORDS = [
	"акласта",
	"aclasta",
	"золедронов",
	"zoledron",
	"фосамакс",
	"fosamax",
	"алендронат",
	"alendronat",
	"бонвива",
	"bonviva",
	"ибандронат",
	"ibandronat",
	"пролиа",
	"prolia",
	"эксджива",
	"xgeva",
	"деносумаб",
	"denosumab",
	"бисфосфонат",
	"бифосфонат",
	"bisphosphonate",
];

const PENICILLIN_KEYWORDS = [
	"пенициллин",
	"пеницилин",
	"penicillin",
	"амоксициллин",
	"amoxicillin",
	"амоксиклав",
	"amoxiclav",
	"аугментин",
	"augmentin",
	"флемоксин",
	"flemoxin",
	"цефалоспорин",
	"бета-лактам",
];

const NSAID_KEYWORDS = [
	"нпвс",
	"нпвп",
	"nsaid",
	"ибупрофен",
	"кеторолак",
	"кеторол",
	"кетанов",
	"нимесулид",
	"нимесил",
	"диклофенак",
	"аспириновая триада",
	"samter",
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CLINICAL NLP NEGATION PARSER
// ─────────────────────────────────────────────────────────────────────────────

const PRE_NEGATION_PATTERNS = [
	/(?<![а-яa-z0-9])(?:не\s+(?:принимает|пьет|пьёт|страдает|имеет|употребляет|было|отмечает|выявлено|обнаружено))(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:отрицает(?:\s+прием|\s+наличие|\s+аллергию|\s+непереносимость|\s+лечение)?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:отменил[аи]?|отменен[аоы]?|отмена|прекратил[аи]?\s+прием|снят(?:\s+диагноз)?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:нет(?:\s+аллергии|\s+данных|\s+приступов|\s+кризов|\s+жалоб)?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:без(?:\s+признаков|\s+гипертонии|\s+аллергии|\s+кризов)?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:отсутству(?:ет|ют)|не\s+отягощен|не\s+отягощён|не\s+выявлен[оаы]?|не\s+обнаружен[оаы]?|исключен[оаы]?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:давление\s+в\s+норме|ад\s+в\s+норме|давление\s+нормализовано|ад\s+стабильно)(?![а-яa-z0-9])/iu,
];

const POST_NEGATION_PATTERNS = [
	/(?<![а-яa-z0-9])(?:отрицает|отменен[аоы]?|отменил[аи]?|не\s+принимает|не\s+пьет|не\s+пьёт|прекращен[аоы]?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:нет|отсутству(?:ет|ют)|не\s+выявлен[аоы]?|не\s+обнаружен[аоы]?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:в\s+норме|нормализовано|стабильно|стабилизировано|купирован[оаы]?)(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:в\s+прошлом|в\s+детстве|в\s+анамнезе\s*\((?:норма|купирован|без\s+рецидивов)\))(?![а-яa-z0-9])/iu,
	/(?<![а-яa-z0-9])(?:(?:в|до)\s+\d{4}\s*г(?:\.|ода)?(?:\s*\([^)]*норм[^)]*\))?)(?![а-яa-z0-9])/iu,
];

/**
 * Detects whether all occurrences of a keyword in the text are negated or historical.
 */
export function isKeywordNegatedInText(text: string, keyword: string): boolean {
	const lowerText = text.toLowerCase();
	const kwLower = keyword.toLowerCase();
	let searchPos = 0;
	let anyOccurrenceFound = false;
	let hasNonNegatedOccurrence = false;

	while (searchPos < lowerText.length) {
		const idx = lowerText.indexOf(kwLower, searchPos);
		if (idx === -1) break;
		anyOccurrenceFound = true;

		// Extract surrounding window/clause for this occurrence (up to 70 chars before/after)
		const startBoundary = Math.max(0, idx - 70);
		const endBoundary = Math.min(lowerText.length, idx + kwLower.length + 70);

		const beforeText = lowerText.slice(startBoundary, idx);
		const afterText = lowerText.slice(idx + kwLower.length, endBoundary);

		const lastDelimiterBefore = Math.max(
			beforeText.lastIndexOf("."),
			beforeText.lastIndexOf("!"),
			beforeText.lastIndexOf("?"),
			beforeText.lastIndexOf(";"),
			beforeText.lastIndexOf("\n"),
		);
		const clauseBefore = lastDelimiterBefore !== -1
			? beforeText.slice(lastDelimiterBefore + 1)
			: beforeText;

		const firstDelimiterAfter = afterText.search(/[.!?;:\n]/);
		const clauseAfter = firstDelimiterAfter !== -1
			? afterText.slice(0, firstDelimiterAfter)
			: afterText;

		const fullClause = `${clauseBefore} ${kwLower} ${clauseAfter}`.trim();

		// Check pre-negation
		const isPreNegated = PRE_NEGATION_PATTERNS.some((p) => p.test(clauseBefore));
		// Check post-negation
		const isPostNegated = POST_NEGATION_PATTERNS.some((p) => p.test(clauseAfter));
		// Check clause-wide patterns
		const isClauseNegated =
			isPreNegated ||
			isPostNegated ||
			/(?<![а-яa-z0-9])аллерги(?:и|я|ю)\s+(?:на\s+)?[а-яa-z0-9\s-]{1,30}\s+нет(?![а-яa-z0-9])/iu.test(fullClause) ||
			/(?<![а-яa-z0-9])отрицает\s+[а-яa-z0-9\s-]{0,30}\s*(?:варфарин|аспирин|ксарелто|артикаин|пенициллин|нпвс|астм|криз)(?![а-яa-z0-9])/iu.test(fullClause) ||
			/(?<![а-яa-z0-9])(?:давление|ад)\s+в\s+норме(?![а-яa-z0-9])/iu.test(fullClause) ||
			/(?<![а-яa-z0-9])(?:криз[а-я]*|приступ[а-я]*)\s+(?:в|до)\s+20\d\d\s*г/iu.test(fullClause) ||
			/(?<![а-яa-z0-9])(?:в|до)\s+20\d\d\s*г(?:\.|ода)?\s*\([^)]*норм[^)]*\)/iu.test(fullClause);

		if (!isClauseNegated) {
			hasNonNegatedOccurrence = true;
			break;
		}

		searchPos = idx + kwLower.length;
	}

	if (!anyOccurrenceFound) return false;
	return !hasNonNegatedOccurrence;
}

/**
 * Searches for active (non-negated, non-historical) matches of any target keywords in clinical text.
 */
export function findActiveNonNegatedKeywords(
	text: string | null | undefined,
	keywords: readonly string[],
): string[] {
	if (!text) return [];
	const lowerText = text.toLowerCase();
	const activeMatches: string[] = [];

	for (const kw of keywords) {
		const kwLower = kw.toLowerCase();
		if (lowerText.includes(kwLower)) {
			if (!isKeywordNegatedInText(lowerText, kwLower)) {
				activeMatches.push(kw);
			}
		}
	}

	return Array.from(new Set(activeMatches));
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PROCEDURAL & AGE DETECTION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if a scheduled appointment involves an invasive surgical manipulation.
 */
export function isSurgicalAppointment(
	reason?: string | null,
	comment?: string | null,
	plannedServices?: Array<{ code?: string | null; title: string }>,
): boolean {
	const text = `${reason || ""} ${comment || ""}`.toLowerCase();
	if (SURGERY_PROCEDURE_KEYWORDS.some((kw) => text.includes(kw))) {
		return true;
	}

	if (plannedServices && plannedServices.length > 0) {
		for (const s of plannedServices) {
			const codeLower = (s.code || "").toLowerCase().trim();
			if (SURGERY_NOMENCLATURE_CODES.some((sc) => codeLower.startsWith(sc))) {
				return true;
			}
			const titleLower = s.title.toLowerCase();
			if (SURGERY_PROCEDURE_KEYWORDS.some((kw) => titleLower.includes(kw))) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if an appointment involves dental procedures requiring local anesthesia.
 */
export function isAnesthesiaIndicatedAppointment(
	reason?: string | null,
	comment?: string | null,
	plannedServices?: Array<{ code?: string | null; title: string }>,
): boolean {
	if (isSurgicalAppointment(reason, comment, plannedServices)) {
		return true;
	}

	const text = `${reason || ""} ${comment || ""}`.toLowerCase();
	const anesthesiaKeywords = [
		"кариес",
		"пульпит",
		"периодонтит",
		"канал",
		"пломб",
		"реставрац",
		"коронк",
		"обточк",
		"препарирован",
		"депульпирован",
		"анестези",
		"лечени",
	];

	if (anesthesiaKeywords.some((kw) => text.includes(kw))) {
		return true;
	}

	if (plannedServices && plannedServices.length > 0) {
		for (const s of plannedServices) {
			const titleLower = s.title.toLowerCase();
			if (anesthesiaKeywords.some((kw) => titleLower.includes(kw))) {
				return true;
			}
		}
	}

	// Default true for non-empty reason that isn't purely consultation / inspection
	if (reason && !text.includes("осмотр") && !text.includes("консультац")) {
		return true;
	}

	return false;
}

/**
 * Calculates patient age from birthDate string.
 */
export function calculateAge(birthDateStr?: string | null, refDate?: Date): number | null {
	if (!birthDateStr) return null;
	const bDate = new Date(birthDateStr);
	if (Number.isNaN(bDate.getTime())) return null;
	const ref = refDate ?? new Date();
	let age = ref.getFullYear() - bDate.getFullYear();
	const m = ref.getMonth() - bDate.getMonth();
	if (m < 0 || (m === 0 && ref.getDate() < bDate.getDate())) {
		age--;
	}
	return age >= 0 ? age : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CORE PURE CLINICAL RADAR EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates patient somatic profile against appointment context.
 * Returns quiet, structured alert cards only when genuine high-risk clinical combinations occur.
 */
export function evaluatePatientSomaticRisk(
	patient: PatientSomaticProfileInput,
	appointment: AppointmentSomaticContextInput,
	options?: { now?: Date },
): SomaticRadarAlert[] {
	const now = options?.now ?? new Date();
	const alerts: SomaticRadarAlert[] = [];

	const appointmentDateStr =
		typeof appointment.startsAt === "string"
			? appointment.startsAt
			: appointment.startsAt.toISOString();

	const patientAgeYears = calculateAge(patient.birthDate, now);
	const isSurgery = isSurgicalAppointment(
		appointment.reason,
		appointment.comment,
		appointment.plannedServices,
	);
	const isAnesthesia = isAnesthesiaIndicatedAppointment(
		appointment.reason,
		appointment.comment,
		appointment.plannedServices,
	);

	// Context texts for NLP analysis
	const freeTextContext = `${patient.notes || ""} ${patient.pastAnamnesisText || ""} ${patient.pastDiagnosesText || ""}`.trim();

	// Active non-negated medications
	const activeMedsList = (patient.activeMedications || []).filter(
		(m) => !m.toLowerCase().includes("отменен") && !m.toLowerCase().includes("отрицает"),
	);

	// Non-negated allergies
	const activeAllergiesList = (patient.allergies || []).filter((a) => {
		if (a.reactionSeverity === "none") return false;
		const fullAllergyStr = `${a.allergenGroup} ${a.drugInnLatin || ""} ${a.clinicalManifestations || ""} ${a.notes || ""}`.toLowerCase();
		if (fullAllergyStr.includes("отрицает") || fullAllergyStr.includes("аллергии нет")) {
			return false;
		}
		return true;
	});

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 1: Surgery / Extraction + Anticoagulants (Dual-Factor)
	// ─────────────────────────────────────────────────────────────────────────
	const matchedInFreeText = findActiveNonNegatedKeywords(freeTextContext, ANTICOAGULANT_KEYWORDS);
	const matchedInMeds = findActiveNonNegatedKeywords(activeMedsList.join(" "), ANTICOAGULANT_KEYWORDS);
	const matchedAnticoagulants = Array.from(new Set([...matchedInFreeText, ...matchedInMeds]));

	if (isSurgery && matchedAnticoagulants.length > 0) {
		const isHighPotency = matchedAnticoagulants.some(
			(kw) =>
				kw.includes("варфарин") ||
				kw.includes("warfarin") ||
				kw.includes("ксарелто") ||
				kw.includes("xarelto") ||
				kw.includes("эликвис") ||
				kw.includes("eliquis") ||
				kw.includes("прадакса") ||
				kw.includes("плавикс") ||
				kw.includes("брилинта"),
		);

		const urgency = isHighPotency ? "CRITICAL" : "HIGH";
		const detectedDrugNames = Array.from(new Set(matchedAnticoagulants)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_anticoagulant_surgery`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: true,
			category: "anticoagulant_surgery",
			threatTitleRu: "Высокий риск кровотечения при хирургии (Антикоагулянты)",
			badgeText: "Коагулограмма / Гемостаз",
			urgency,
			clinicalAlertMessage: `Высокий риск кровотечения. Пациент принимает антикоагулянты/дезагреганты (${detectedDrugNames}) перед запланированной хирургической манипуляцией. Рекомендовано: контроль коагулограммы (МНО/АЧТВ) перед манипуляцией, усиленный местный гемостаз.`,
			detectedTriggers: [
				`Прием препаратов: ${detectedDrugNames}`,
				`Запланирована хирургическая манипуляция (${appointment.reason || "удаление / имплантация"})`,
			],
			contraindicatedDrugs: ["Системные НПВС (Ибупрофен, Кеторол) для постоперационной анальгезии"],
			recommendedAlternatives: [
				"Местный гемостаз: гемостатическая губка (Альвостаз), наложение швов, транексамовая кислота",
				"Для обезболивания: Парацетамол 500–1000 мг (не влияет на агрегацию тромбоцитов)",
			],
			clinicalGuidanceRu:
				"Проверить свежее МНО (целевой диапазон для безопасного амбулаторного удаления <= 2.5–3.0). Не отменять антикоагулянты без согласования с кардиологом. Применить атравматичную технику и ушивание лунки.",
			suggestedActions: [
				{
					actionId: "request_coagulogram",
					title: "Запросить коагулограмму (МНО)",
					payload: { patientId: patient.patientId, drug: detectedDrugNames },
				},
				{
					actionId: "prepare_hemostatics",
					title: "Подготовить гемостатики и шовный материал",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 2: Allergy to Articaine / Amide Anesthetics (Dual-Factor with Anesthesia)
	// ─────────────────────────────────────────────────────────────────────────
	const amideInAllergies = findActiveNonNegatedKeywords(
		activeAllergiesList.map((a) => `${a.allergenGroup} ${a.drugInnLatin || ""}`).join(" "),
		ARTICAINE_AMIDE_KEYWORDS,
	);
	const amideInFreeText = findActiveNonNegatedKeywords(freeTextContext, ARTICAINE_AMIDE_KEYWORDS);
	const matchedAmideAllergies = Array.from(new Set([...amideInAllergies, ...amideInFreeText]));

	if (isAnesthesia && matchedAmideAllergies.length > 0) {
		const allergenTitle = Array.from(new Set(matchedAmideAllergies)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_anesthetic_allergy`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "anesthetic_allergy",
			threatTitleRu: "Аллергия на Артикаин / амидные анестетики",
			badgeText: "Противопоказан Артикаин",
			urgency: "CRITICAL",
			clinicalAlertMessage: `Противопоказан Артикаин (${allergenTitle}). В анамнезе зафиксирована лекарственная аллергия / гиперчувствительность к амидным местным анестетикам. Рекомендован Мепивакаин 3% без вазоконстриктора или Скандонест.`,
			detectedTriggers: [
				`Аллергологический статус: аллергия на ${allergenTitle}`,
				"Требуется местная анестезия для проведения вмешательства",
			],
			contraindicatedDrugs: ["Артикаин 4%", "Ультракаин", "Септанест", "Убистезин", "Лидокаин 2%"],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3% plain)",
				"Мепивастезин 3% без адреналина",
				"Консультация аллерголога с проведением кожных проб",
			],
			clinicalGuidanceRu:
				"Категорически исключить введение артикаинсодержащих препаратов. При неясном генезе реакции провести аппликационную пробу или консультацию аллерголога.",
			suggestedActions: [
				{
					actionId: "switch_to_mepivacaine",
					title: "Выбрать Мепивакаин 3% (Скандонест)",
					payload: { appointmentId: appointment.appointmentId, drug: "mepivacaine_3_plain" },
				},
				{
					actionId: "refer_allergist",
					title: "Направить на аллергопробы",
					payload: { patientId: patient.patientId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 3: Severe Hypertension Stage III / Thyrotoxicosis / Vasoconstrictor Risk
	// ─────────────────────────────────────────────────────────────────────────
	const matchedVasoconstrictorRisks = findActiveNonNegatedKeywords(
		freeTextContext,
		VASOCONSTRICTOR_CONTRAINDICATION_KEYWORDS,
	);

	if (isAnesthesia && matchedVasoconstrictorRisks.length > 0) {
		const conditionNames = Array.from(new Set(matchedVasoconstrictorRisks)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_vasoconstrictor_contraindication`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "vasoconstrictor_contraindication",
			threatTitleRu: "Противопоказание к адреналину (Гипертония III / Тиреотоксикоз)",
			badgeText: "Без адреналина",
			urgency: "CRITICAL",
			clinicalAlertMessage: `Противопоказан адреналин/эпинефрин. В соматическом статусе: ${conditionNames}. Использовать анестезию без вазоконстриктора (Мепивакаин 3% / Скандонест 3%), провести тонометрию перед началом приема.`,
			detectedTriggers: [
				`Соматический диагноз / фактор риска: ${conditionNames}`,
				"Запланирована процедура с применением местной анестезии",
			],
			contraindicatedDrugs: [
				"Адреналин / Эпинефрин 1:100 000",
				"Эпинефрин 1:200 000",
				"Ретракционная нить с эпинефрином",
			],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
				"Мепивастезин 3% без адреналина",
				"Артикаин 1:200 000 (только при стабильном АД <= 140/90, макс 1 карпула с аспирацией)",
			],
			clinicalGuidanceRu:
				"Измерить АД и пульс на приеме. При систолическом АД >= 180 мм рт. ст. плановое лечение перенести. В экстренных случаях — только анестезия без адреналина.",
			suggestedActions: [
				{
					actionId: "select_adrenaline_free",
					title: "Выбрать анестезию без адреналина",
					payload: { appointmentId: appointment.appointmentId },
				},
				{
					actionId: "record_blood_pressure",
					title: "Зафиксировать АД перед приемом",
					payload: { appointmentId: appointment.appointmentId, patientId: patient.patientId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 4: Bronchial Asthma / Sulfite Allergy vs Metabisulfite (E223)
	// ─────────────────────────────────────────────────────────────────────────
	const matchedSulfiteAsthma = findActiveNonNegatedKeywords(
		`${freeTextContext} ${activeAllergiesList.map((a) => a.allergenGroup).join(" ")}`,
		SULFITE_ASTHMA_KEYWORDS,
	);

	// Trigger only if vasoconstrictor threat didn't already capture it
	const alreadyHasAnestheticAlert = alerts.some(
		(a) => a.category === "anesthetic_allergy" || a.category === "vasoconstrictor_contraindication",
	);

	if (isAnesthesia && matchedSulfiteAsthma.length > 0 && !alreadyHasAnestheticAlert) {
		const asthmaName = Array.from(new Set(matchedSulfiteAsthma)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_sulfite_asthma`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "sulfite_asthma",
			threatTitleRu: "Риск бронхоспазма: сульфиты в анестетиках с адреналином",
			badgeText: "Астма / Бесульфитный протокол",
			urgency: "HIGH",
			clinicalAlertMessage: `Пациент с бронхиальной астмой / аллергией на сульфиты (${asthmaName}). Противопоказаны анестетики с метабисульфитом натрия (E223, консервант адреналина). Рекомендован Мепивакаин 3% без вазоконстриктора (Скандонест) или Ультракаин Д (без консервантов).`,
			detectedTriggers: [
				`Анамнез: ${asthmaName}`,
				"Использование местных анестетиков с консервантами несет риск приступа астмы",
			],
			contraindicatedDrugs: ["Ультракаин Д-С форте", "Септанест с адреналином", "Убистезин форте"],
			recommendedAlternatives: [
				"Скандонест 3% (Мепивакаин без сульфитов)",
				"Ультракаин Д (без консервантов)",
			],
			clinicalGuidanceRu:
				"Уточнить наличие ингалятора (Сальбутамол/Беродуал) у пациента перед началом лечения. Использовать анестетики без консервантов.",
			suggestedActions: [
				{
					actionId: "use_sulfite_free",
					title: "Использовать бесульфитный анестетик",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 5: Bisphosphonate Therapy / MRONJ Risk (Dual-Factor with Surgery)
	// ─────────────────────────────────────────────────────────────────────────
	const matchedBisphosphonates = findActiveNonNegatedKeywords(
		`${freeTextContext} ${activeMedsList.join(" ")}`,
		BISPHOSPHONATES_KEYWORDS,
	);

	if (isSurgery && matchedBisphosphonates.length > 0) {
		const drugName = Array.from(new Set(matchedBisphosphonates)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_bisphosphonates_osteonecrosis`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: true,
			category: "bisphosphonates_osteonecrosis",
			threatTitleRu: "Риск остеонекроза челюсти (Бисфосфонаты / Деносумаб)",
			badgeText: "MRONJ Протокол",
			urgency: "CRITICAL",
			clinicalAlertMessage: `Высокий риск медикаментозного остеонекроза челюсти (MRONJ). Пациент получает антирезорбтивную терапию (${drugName}) перед хирургическим вмешательством. Требуется атравматичный протокол удаления, сглаживание костных краев, ушивание лунки и превентивная антибиотикопрофилактика.`,
			detectedTriggers: [
				`Прием бисфосфонатов/деносумаба: ${drugName}`,
				"Планируется хирургическое вмешательство на челюстной кости",
			],
			contraindicatedDrugs: ["Грубая травматизация надкостницы", "Открытое заживление лунки без ушивания"],
			recommendedAlternatives: [
				"Атравматичное удаление с периоперационной антибиотикопрофилактикой (Амоксиклав / Клиндамицин)",
				"Герметичное ушивание слизисто-надкостничным лоскутом",
			],
			clinicalGuidanceRu:
				"Оценить длительность приема бисфосфонатов. Обязательна антисептическая обработка хлоргексидином 0.2% за 3 дня до и 10 дней после вмешательства.",
			suggestedActions: [
				{
					actionId: "mronj_protocol",
					title: "Применить протокол MRONJ",
					payload: { appointmentId: appointment.appointmentId },
				},
				{
					actionId: "antibiotic_prophylaxis",
					title: "Назначить антибиотикопрофилактику",
					payload: { patientId: patient.patientId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 6: Penicillin / Beta-Lactam Allergy
	// ─────────────────────────────────────────────────────────────────────────
	const matchedPenicillins = findActiveNonNegatedKeywords(
		`${activeAllergiesList.map((a) => `${a.allergenGroup} ${a.drugInnLatin || ""}`).join(" ")} ${freeTextContext}`,
		PENICILLIN_KEYWORDS,
	);

	if (matchedPenicillins.length > 0) {
		const penName = Array.from(new Set(matchedPenicillins)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_penicillin_allergy`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "penicillin_allergy",
			threatTitleRu: "Аллергия на пенициллины и бета-лактамы",
			badgeText: "Аллергия: Пенициллин",
			urgency: "HIGH",
			clinicalAlertMessage: `Противопоказаны бета-лактамы (Амоксициллин, Амоксиклав, Флемоксин). В аллергоанамнезе: ${penName}. При необходимости антибиотикотерапии назначить Азитромицин (Сумамед) 500 мг или Клиндамицин 300 мг.`,
			detectedTriggers: [`Аллергия на ${penName}`],
			contraindicatedDrugs: ["Амоксициллин", "Амоксиклав", "Аугментин", "Цефалоспорины"],
			recommendedAlternatives: [
				"Сумамед (Азитромицин 500 мг 1 раз/сут, 3 дня)",
				"Клиндамицин 300 мг 3 раза/сут",
			],
			clinicalGuidanceRu:
				"Не назначать пенициллиновые антибиотики. При одонтогенных инфекциях использовать макролиды или линкозамиды.",
			suggestedActions: [
				{
					actionId: "select_macrolide",
					title: "Выбрать Азитромицин / Клиндамицин",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 7: NSAID Allergy / Samter's Triad
	// ─────────────────────────────────────────────────────────────────────────
	const matchedNsaid = findActiveNonNegatedKeywords(
		`${activeAllergiesList.map((a) => `${a.allergenGroup} ${a.drugInnLatin || ""}`).join(" ")} ${freeTextContext}`,
		NSAID_KEYWORDS,
	);

	if (matchedNsaid.length > 0) {
		const nsaidName = Array.from(new Set(matchedNsaid)).join(", ");

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_nsaid_contraindication`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName ?? "Лечащий врач",
			appointmentStartsAt: appointmentDateStr,
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "nsaid_contraindication",
			threatTitleRu: "Противопоказание к НПВС (Аллергия / Аспириновая триада)",
			badgeText: "НПВС Противопоказаны",
			urgency: "HIGH",
			clinicalAlertMessage: `Противопоказаны системные НПВС (Ибупрофен, Кеторол, Нимесил, Аспирин). В аллергоанамнезе: ${nsaidName}. Для купирования постоперационной боли рекомендован Парацетамол (500–1000 мг).`,
			detectedTriggers: [`Аллергия на ${nsaidName}`],
			contraindicatedDrugs: ["Ибупрофен", "Кеторолак (Кетанов)", "Нимесулид (Найз)", "Диклофенак", "Аспирин"],
			recommendedAlternatives: ["Парацетамол (500–1000 мг до 4 раз/сут, макс 4000 мг/сут)"],
			clinicalGuidanceRu:
				"Избегать назначения всех препаратов группы НПВП. При умеренной/сильной боли использовать парацетамол.",
			suggestedActions: [
				{
					actionId: "prescribe_paracetamol",
					title: "Назначить Парацетамол",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DATABASE INTEGRATION SCANNER (07:30 AM Shift Scanner with Batch Queries)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the live 07:30 AM morning pre-shift somatic radar scan against PostgreSQL database.
 * Uses batch parallel queries (inArray) to eliminate N+1 database patterns.
 */
export async function runSomaticRadarScan(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarAlert[]> {
	try {
		const now = options?.now ?? new Date();
		const targetDate = options?.targetDate ?? now;

		const startOfDay = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate(),
			0,
			0,
			0,
		);
		const endOfDay = new Date(
			targetDate.getFullYear(),
			targetDate.getMonth(),
			targetDate.getDate(),
			23,
			59,
			59,
		);

		// Fetch today's scheduled appointments
		const conditions = [
			gte(appointments.startsAt, startOfDay),
			lte(appointments.startsAt, endOfDay),
			or(
				eq(appointments.status, "planned"),
				eq(appointments.status, "confirmed"),
				eq(appointments.status, "in_treatment"),
			),
		];

		if (options?.organizationId) {
			conditions.push(eq(appointments.organizationId, options.organizationId));
		}

		const todayAppointments = await db
			.select({
				appointmentId: appointments.id,
				organizationId: appointments.organizationId,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				status: appointments.status,
				reason: appointments.reason,
				comment: appointments.comment,
				patientFullName: patients.fullName,
				patientBirthDate: patients.birthDate,
				patientPhone: patients.phone,
				patientNotes: patients.notes,
				doctorFullName: users.fullName,
			})
			.from(appointments)
			.leftJoin(patients, eq(appointments.patientId, patients.id))
			.leftJoin(users, eq(appointments.doctorUserId, users.id))
			.where(and(...conditions));

		if (todayAppointments.length === 0) {
			return [];
		}

		// Collect unique patient IDs for batch loading (Eliminates N+1 query pattern)
		const patientIds = Array.from(
			new Set(
				todayAppointments
					.map((a) => a.patientId)
					.filter((id): id is string => Boolean(id)),
			),
		);

		const allergiesByPatient = new Map<
			string,
			Array<{
				allergenGroup: string;
				drugInnLatin?: string | null;
				reactionSeverity?: string | null;
				clinicalManifestations?: string | null;
				hasSamterTriad?: boolean | null;
				notes?: string | null;
			}>
		>();

		const pastVisitsByPatient = new Map<
			string,
			Array<{
				complaint: string | null;
				anamnesis: string | null;
				objectiveStatus: string | null;
				diagnosis: string | null;
				treatmentPlan: string | null;
				doctorSummary: string | null;
			}>
		>();

		const activePrescriptionsByPatient = new Map<string, string[]>();

		if (patientIds.length > 0) {
			const [batchAllergies, batchVisits, batchPrescriptionItems] = await Promise.all([
				// 1. Batch fetch allergies
				db
					.select({
						patientId: patientDrugAllergies.patientId,
						allergenGroup: patientDrugAllergies.allergenGroup,
						drugInnLatin: patientDrugAllergies.drugInnLatin,
						reactionSeverity: patientDrugAllergies.reactionSeverity,
						clinicalManifestations: patientDrugAllergies.clinicalManifestations,
						hasSamterTriad: patientDrugAllergies.hasSamterTriad,
						notes: patientDrugAllergies.notes,
					})
					.from(patientDrugAllergies)
					.where(inArray(patientDrugAllergies.patientId, patientIds)),

				// 2. Batch fetch past visits
				db
					.select({
						patientId: visits.patientId,
						complaint: visits.complaint,
						anamnesis: visits.anamnesis,
						objectiveStatus: visits.objectiveStatus,
						diagnosis: visits.diagnosis,
						treatmentPlan: visits.treatmentPlan,
						doctorSummary: visits.doctorSummary,
						createdAt: visits.createdAt,
					})
					.from(visits)
					.where(inArray(visits.patientId, patientIds))
					.orderBy(desc(visits.createdAt)),

				// 3. Batch fetch active prescriptions
				db
					.select({
						patientId: electronicPrescriptions.patientId,
						innLatin: electronicPrescriptionItems.innLatin,
						signatureDirectionRussian: electronicPrescriptionItems.signatureDirectionRussian,
					})
					.from(electronicPrescriptionItems)
					.innerJoin(
						electronicPrescriptions,
						eq(electronicPrescriptionItems.prescriptionId, electronicPrescriptions.id),
					)
					.where(inArray(electronicPrescriptions.patientId, patientIds)),
			]);

			// Group allergies by patientId
			for (const item of batchAllergies) {
				if (!allergiesByPatient.has(item.patientId)) {
					allergiesByPatient.set(item.patientId, []);
				}
				allergiesByPatient.get(item.patientId)!.push(item);
			}

			// Group visits by patientId (keep up to 5 most recent)
			for (const v of batchVisits) {
				if (!v.patientId) continue;
				if (!pastVisitsByPatient.has(v.patientId)) {
					pastVisitsByPatient.set(v.patientId, []);
				}
				const patientVisits = pastVisitsByPatient.get(v.patientId)!;
				if (patientVisits.length < 5) {
					patientVisits.push(v);
				}
			}

			// Group prescription items by patientId
			for (const p of batchPrescriptionItems) {
				if (!activePrescriptionsByPatient.has(p.patientId)) {
					activePrescriptionsByPatient.set(p.patientId, []);
				}
				activePrescriptionsByPatient.get(p.patientId)!.push(
					`${p.innLatin} ${p.signatureDirectionRussian}`,
				);
			}
		}

		const allAlerts: SomaticRadarAlert[] = [];

		for (const appt of todayAppointments) {
			if (!appt.patientId) continue;

			const allergies = allergiesByPatient.get(appt.patientId) ?? [];
			const pastVisits = pastVisitsByPatient.get(appt.patientId) ?? [];
			const activeMedications = activePrescriptionsByPatient.get(appt.patientId) ?? [];

			const anamnesisTexts: string[] = [];
			const diagnosisTexts: string[] = [];

			for (const v of pastVisits) {
				if (v.anamnesis) anamnesisTexts.push(v.anamnesis);
				if (v.complaint) anamnesisTexts.push(v.complaint);
				if (v.doctorSummary) anamnesisTexts.push(v.doctorSummary);
				if (v.diagnosis) diagnosisTexts.push(v.diagnosis);
				if (v.objectiveStatus) diagnosisTexts.push(v.objectiveStatus);
			}

			const patientProfile: PatientSomaticProfileInput = {
				patientId: appt.patientId,
				organizationId: appt.organizationId,
				fullName: appt.patientFullName || "Пациент",
				birthDate: appt.patientBirthDate,
				phone: appt.patientPhone,
				notes: appt.patientNotes,
				allergies,
				pastAnamnesisText: anamnesisTexts.join(" "),
				pastDiagnosesText: diagnosisTexts.join(" "),
				activeMedications,
			};

			const appointmentContext: AppointmentSomaticContextInput = {
				appointmentId: appt.appointmentId,
				organizationId: appt.organizationId,
				doctorId: appt.doctorUserId,
				doctorName: appt.doctorFullName || "Врач клиники",
				startsAt: appt.startsAt,
				endsAt: appt.endsAt,
				reason: appt.reason,
				comment: appt.comment,
			};

			const apptAlerts = evaluatePatientSomaticRisk(patientProfile, appointmentContext, { now });
			allAlerts.push(...apptAlerts);
		}

		return allAlerts;
	} catch (error) {
		console.error("[SomaticRadarDaemon:ERROR] Failed to run somatic radar scan:", error);
		throw error;
	}
}

/**
 * Builds aggregated pre-shift summary grouped by organization.
 */
export async function runSomaticRadarShiftSummary(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarPreShiftSummary[]> {
	try {
		const now = options?.now ?? new Date();
		const targetDate = options?.targetDate ?? now;
		const scanArgs: { organizationId?: string; targetDate?: Date; now?: Date } = {
			targetDate,
			now,
		};
		if (options?.organizationId) {
			scanArgs.organizationId = options.organizationId;
		}
		const alerts = await runSomaticRadarScan(scanArgs);

		const orgMap = new Map<string, SomaticRadarAlert[]>();

		for (const a of alerts) {
			const orgId = a.organizationId;
			if (!orgMap.has(orgId)) {
				orgMap.set(orgId, []);
			}
			orgMap.get(orgId)!.push(a);
		}

		if (options?.organizationId && !orgMap.has(options.organizationId)) {
			orgMap.set(options.organizationId, []);
		}

		const summaries: SomaticRadarPreShiftSummary[] = [];

		for (const [orgId, orgAlerts] of orgMap.entries()) {
			let critical = 0;
			let high = 0;
			let warnings = 0;
			const uniquePatients = new Set<string>();

			for (const a of orgAlerts) {
				uniquePatients.add(a.patientId);
				if (a.urgency === "CRITICAL") critical++;
				else if (a.urgency === "HIGH") high++;
				else warnings++;
			}

			summaries.push({
				id: `somatic_summary_${orgId}_${Date.now()}`,
				organizationId: orgId,
				shiftDate: targetDate.toLocaleDateString("ru-RU"),
				totalAppointmentsScanned: orgAlerts.length,
				totalPatientsWithRisk: uniquePatients.size,
				criticalThreatsCount: critical,
				highThreatsCount: high,
				warningsCount: warnings,
				alerts: orgAlerts,
				createdAt: now.toISOString(),
			});
		}

		return summaries;
	} catch (error) {
		console.error("[SomaticRadarDaemon:ERROR] Failed to run somatic radar shift summary:", error);
		throw error;
	}
}
