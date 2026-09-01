/**
 * somaticRadarDaemon.ts — 07:30 AM Morning Pre-Shift Somatic Risk & DDI Clinical Radar.
 *
 * Scans today's scheduled appointments for all doctors across the clinic:
 * 1. Analyzes patient electronic health records (EHR), anamnesis notes, active prescriptions,
 *    and verified drug allergies (patientDrugAllergies).
 * 2. Cross-references patient somatic profile with scheduled dental procedures.
 * 3. Applies dual-factor high-precision trigger logic:
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
 * 4. Yields structured Copilot cards & Quiet Passive Badges for doctor pre-shift review with zero modal blockers.
 */

import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
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
// 2. CLINICAL DETECTION HELPERS
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
// 3. CORE PURE CLINICAL RADAR EVALUATION ENGINE
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

	// Collect full combined patient context text
	const patientAllergiesList = patient.allergies || [];
	const allergyText = patientAllergiesList
		.map(
			(a) =>
				`${a.allergenGroup} ${a.drugInnLatin || ""} ${a.clinicalManifestations || ""} ${a.notes || ""}`,
		)
		.join(" ")
		.toLowerCase();

	const medsText = (patient.activeMedications || []).join(" ").toLowerCase();
	const notesText = (patient.notes || "").toLowerCase();
	const pastAnamnesis = (patient.pastAnamnesisText || "").toLowerCase();
	const pastDiagnoses = (patient.pastDiagnosesText || "").toLowerCase();

	const fullTextContext = `${allergyText} ${medsText} ${notesText} ${pastAnamnesis} ${pastDiagnoses}`.toLowerCase();

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 1: Surgery / Extraction + Anticoagulants (Dual-Factor)
	// ─────────────────────────────────────────────────────────────────────────
	const matchedAnticoagulants = ANTICOAGULANT_KEYWORDS.filter((kw) =>
		fullTextContext.includes(kw),
	);

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
	const matchedAmideAllergies = ARTICAINE_AMIDE_KEYWORDS.filter((kw) =>
		allergyText.includes(kw) || notesText.includes(`аллергия на ${kw}`) || notesText.includes(`непереносимость ${kw}`),
	);

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
	const matchedVasoconstrictorRisks = VASOCONSTRICTOR_CONTRAINDICATION_KEYWORDS.filter(
		(kw) => fullTextContext.includes(kw),
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
	const matchedSulfiteAsthma = SULFITE_ASTHMA_KEYWORDS.filter((kw) =>
		fullTextContext.includes(kw),
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
	const matchedBisphosphonates = BISPHOSPHONATES_KEYWORDS.filter((kw) =>
		fullTextContext.includes(kw),
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
	const matchedPenicillins = PENICILLIN_KEYWORDS.filter((kw) => allergyText.includes(kw));

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
	const matchedNsaid = NSAID_KEYWORDS.filter((kw) => allergyText.includes(kw));

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
// 4. DATABASE INTEGRATION SCANNER (07:30 AM Shift Scanner)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the live 07:30 AM morning pre-shift somatic radar scan against PostgreSQL database.
 */
export async function runSomaticRadarScan(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarAlert[]> {
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

	const allAlerts: SomaticRadarAlert[] = [];

	for (const appt of todayAppointments) {
		if (!appt.patientId) continue;

		// 1. Fetch patient drug allergies
		const allergies = await db
			.select({
				allergenGroup: patientDrugAllergies.allergenGroup,
				drugInnLatin: patientDrugAllergies.drugInnLatin,
				reactionSeverity: patientDrugAllergies.reactionSeverity,
				clinicalManifestations: patientDrugAllergies.clinicalManifestations,
				hasSamterTriad: patientDrugAllergies.hasSamterTriad,
				notes: patientDrugAllergies.notes,
			})
			.from(patientDrugAllergies)
			.where(
				and(
					eq(patientDrugAllergies.organizationId, appt.organizationId),
					eq(patientDrugAllergies.patientId, appt.patientId),
				),
			);

		// 2. Fetch past visit notes / anamnesis
		const pastVisits = await db
			.select({
				complaint: visits.complaint,
				anamnesis: visits.anamnesis,
				objectiveStatus: visits.objectiveStatus,
				diagnosis: visits.diagnosis,
				treatmentPlan: visits.treatmentPlan,
				doctorSummary: visits.doctorSummary,
			})
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, appt.organizationId),
					eq(visits.patientId, appt.patientId),
				),
			)
			.orderBy(desc(visits.createdAt))
			.limit(5);

		const anamnesisTexts: string[] = [];
		const diagnosisTexts: string[] = [];

		for (const v of pastVisits) {
			if (v.anamnesis) anamnesisTexts.push(v.anamnesis);
			if (v.complaint) anamnesisTexts.push(v.complaint);
			if (v.doctorSummary) anamnesisTexts.push(v.doctorSummary);
			if (v.diagnosis) diagnosisTexts.push(v.diagnosis);
			if (v.objectiveStatus) diagnosisTexts.push(v.objectiveStatus);
		}

		// 3. Fetch active electronic prescriptions if any
		const activePrescriptionItems = await db
			.select({
				innLatin: electronicPrescriptionItems.innLatin,
				signatureDirectionRussian: electronicPrescriptionItems.signatureDirectionRussian,
			})
			.from(electronicPrescriptionItems)
			.innerJoin(
				electronicPrescriptions,
				eq(electronicPrescriptionItems.prescriptionId, electronicPrescriptions.id),
			)
			.where(
				and(
					eq(electronicPrescriptions.organizationId, appt.organizationId),
					eq(electronicPrescriptions.patientId, appt.patientId),
				),
			)
			.limit(10);

		const activeMedications = activePrescriptionItems.map(
			(i) => `${i.innLatin} ${i.signatureDirectionRussian}`,
		);

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
}

/**
 * Builds aggregated pre-shift summary grouped by organization.
 */
export async function runSomaticRadarShiftSummary(options?: {
	organizationId?: string | undefined;
	targetDate?: Date | undefined;
	now?: Date | undefined;
}): Promise<SomaticRadarPreShiftSummary[]> {
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
}
