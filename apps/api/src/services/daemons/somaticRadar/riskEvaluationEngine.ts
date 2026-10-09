import { omniLlmGateway } from "../../agent/omniGateway.js";
import type { ChatOptions } from "../../agent/omniGatewayTypes.js";
import {
	calculateAge,
	isAnesthesiaIndicatedAppointment,
	isSurgicalAppointment,
} from "./clinicalClassifiers.js";
import {
	type AppointmentSomaticContextInput,
	type PatientSomaticProfileInput,
	type SomaticAnamnesisExtraction,
	SomaticAnamnesisExtractionSchema,
	type SomaticRadarAlert,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. OMNIGATEWAY CLINICAL EXTRACTION & DETERMINISTIC FALLBACK (LAYER 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts structured somatic risk indicators from natural language clinical text
 * using the multi-provider OmniGateway LLM with strict Zod validation.
 */
export async function extractSomaticRisksWithLlm(
	text: string,
	options: ChatOptions = {},
): Promise<SomaticAnamnesisExtraction> {
	if (!text || text.trim().length === 0) {
		return SomaticAnamnesisExtractionSchema.parse({});
	}

	const systemPrompt = [
		"You are a Senior Clinical Somatic & Drug-Drug Interaction (DDI) AI Specialist in a Dental CRM.",
		"Analyze the patient's medical history, free-text notes, diagnoses, and current medications.",
		"CRITICAL INSTRUCTIONS ON NEGATIONS & HISTORICAL CONDITIONS:",
		"- If a medication or condition is negated, stopped, cancelled, or denied (e.g. 'отрицает варфарин', 'аспирин отменен', 'аллергии на артикаин нет', 'давление в норме', 'криз был в 2012 г.', 'астмы нет'), DO NOT mark it as active!",
		"- Only mark conditions/medications as TRUE/ACTIVE if the patient is CURRENTLY experiencing them or taking the medication.",
		"- Distinguish current therapies from past resolved history.",
	].join("\n");

	try {
		const result = await omniLlmGateway.generateStructuredJson(
			SomaticAnamnesisExtractionSchema,
			[
				{
					role: "user",
					content: `Анамнез, жалобы и записи пациента:\n"""\n${text}\n"""\n\nВыдели активные соматические факторы риска и исключи все отрицания.`,
				},
			],
			{
				...options,
				system: systemPrompt,
			},
		);

		return SomaticAnamnesisExtractionSchema.parse(result.data);
	} catch (err) {
		console.warn(
			"[SomaticRadarDaemon:WARN] OmniGateway LLM extraction failed or unavailable, using deterministic fallback:",
			err instanceof Error ? err.message : String(err),
		);
		return extractSomaticRisksDeterministic(text);
	}
}

/**
 * Deterministic Semantic Negation & Somatic Extractor (Fast Path / Offline Fallback).
 * Evaluates semantic boundaries, word associations, and negations without external API dependencies.
 */
export function extractSomaticRisksDeterministic(
	text: string,
	activeMeds: readonly string[] = [],
	allergies: readonly {
		allergenGroup: string;
		drugInnLatin?: string | null | undefined;
		reactionSeverity?: string | null | undefined;
		clinicalManifestations?: string | null | undefined;
		hasSamterTriad?: boolean | null | undefined;
		notes?: string | null | undefined;
	}[] = [],
): SomaticAnamnesisExtraction {
	const lower = (text || "").toLowerCase();
	const medsText = activeMeds.join(" ").toLowerCase();
	const combinedText = `${lower} ${medsText}`;

	// Helper for semantic negation in clinical text clause
	const isNegatedInClause = (kw: string): boolean => {
		const idx = combinedText.indexOf(kw);
		if (idx === -1) return false;
		const start = Math.max(0, idx - 60);
		const end = Math.min(combinedText.length, idx + kw.length + 60);
		const before = combinedText.slice(start, idx);
		const after = combinedText.slice(idx + kw.length, end);

		const lastDelim = Math.max(
			before.lastIndexOf("."),
			before.lastIndexOf("!"),
			before.lastIndexOf("?"),
			before.lastIndexOf(";"),
			before.lastIndexOf("\n"),
		);
		const clauseBefore = lastDelim !== -1 ? before.slice(lastDelim + 1) : before;

		const firstDelim = after.search(/[.!?;:\n]/);
		const clauseAfter = firstDelim !== -1 ? after.slice(0, firstDelim) : after;

		const clause = `${clauseBefore} ${kw} ${clauseAfter}`;

		return (
			/(?<![а-яa-z0-9])(?:не\s+(?:принимает|пьет|пьёт|страдает|имеет|употребляет|было)|отрицает|отменен[аоы]?|отменил[аи]?|прекратил[аи]?|ранее\s+принимал|сейчас\s+не\s+пь[её]т|сейчас\s+не\s+принимает|нет|без\s+признаков|не\s+отягощен|в\s+норме|в\s+20\d\d\s*г|было\s+в\s+детстве)(?![а-яa-z0-9])/iu.test(
				clause,
			) ||
			/(?<![а-яa-z0-9])аллерги[а-я\s-]{1,30}нет(?![а-яa-z0-9])/iu.test(
				clause,
			) ||
			/(?<![а-яa-z0-9])(?:давление|ад)\s+в\s+норме(?![а-яa-z0-9])/iu.test(
				clause,
			)
		);
	};

	// 1. Anticoagulants
	const anticoagKws = [
		"варфарин",
		"warfarin",
		"ксарелто",
		"xarelto",
		"ривароксабан",
		"эликвис",
		"eliquis",
		"апиксабан",
		"прадакса",
		"pradaxa",
		"дабигатран",
		"плавикс",
		"plavix",
		"клопидогрел",
		"брилинта",
		"аспирин",
		"aspirin",
		"тромбо асс",
		"кардиомагнил",
		"клексан",
		"гепарин",
	];
	const activeAnticoags: string[] = [];
	for (const kw of anticoagKws) {
		if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
			activeAnticoags.push(kw);
		}
	}

	// 2. Articaine / Amide
	const articaineKws = [
		"артикаин",
		"articaine",
		"ультракаин",
		"ultracain",
		"септанест",
		"убистезин",
		"лидокаин",
		"lidocaine",
		"lidocain",
		"lidocainum",
		"ледокаин",
		"лидакаин",
		"амидные анестетики",
	];
	let hasArticaineAmideAllergy = false;
	for (const a of allergies) {
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (
			articaineKws.some((k) => str.includes(k)) &&
			a.reactionSeverity !== "none" &&
			!str.includes("отрицает")
		) {
			hasArticaineAmideAllergy = true;
		}
	}
	const anamnesisTriggers = [
		"аллерг",
		"непереносим",
		"отек квинке",
		"шок",
		"коллапс",
		"реакци",
	];
	if (!hasArticaineAmideAllergy) {
		for (const kw of articaineKws) {
			if (
				combinedText.includes(kw) &&
				anamnesisTriggers.some((t) => combinedText.includes(t)) &&
				!isNegatedInClause(kw)
			) {
				hasArticaineAmideAllergy = true;
			}
		}
	}

	// 3. Hypertension / Thyrotoxicosis
	const hyperKws = [
		"гипертония 3",
		"гипертоническая болезнь 3",
		"гипертония iii",
		"криз",
		"тиреотоксикоз",
		"токсический зоб",
		"феохромоцитом",
	];
	let hasSevereHypertensionOrThyrotoxicosis = false;
	for (const kw of hyperKws) {
		if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
			hasSevereHypertensionOrThyrotoxicosis = true;
		}
	}

	// 4. Asthma / Sulfites
	const asthmaKws = ["бронхиальная астма", "астм", "метабисульфит", "сульфит"];
	let hasBronchialAsthmaOrSulfiteAllergy = false;
	for (const a of allergies) {
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (
			(str.includes("сульфит") || str.includes("астм")) &&
			a.reactionSeverity !== "none"
		) {
			hasBronchialAsthmaOrSulfiteAllergy = true;
		}
	}
	if (!hasBronchialAsthmaOrSulfiteAllergy) {
		for (const kw of asthmaKws) {
			if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
				hasBronchialAsthmaOrSulfiteAllergy = true;
			}
		}
	}

	// 5. Bisphosphonates / MRONJ
	const bisphosKws = [
		"акласта",
		"aclasta",
		"золедронов",
		"фосамакс",
		"алендронат",
		"бонвива",
		"пролиа",
		"prolia",
		"эксджива",
		"деносумаб",
		"бисфосфонат",
	];
	const activeBisphosphonates: string[] = [];
	for (const kw of bisphosKws) {
		if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
			activeBisphosphonates.push(kw);
		}
	}

	// 6. Penicillin
	const penKws = [
		"пенициллин",
		"амоксициллин",
		"амоксиклав",
		"аугментин",
		"флемоксин",
	];
	let hasPenicillinAllergy = false;
	for (const a of allergies) {
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (
			penKws.some((k) => str.includes(k)) &&
			a.reactionSeverity !== "none" &&
			!str.includes("отрицает")
		) {
			hasPenicillinAllergy = true;
		}
	}
	if (!hasPenicillinAllergy) {
		for (const kw of penKws) {
			if (
				combinedText.includes(kw) &&
				combinedText.includes("аллерг") &&
				!isNegatedInClause(kw)
			) {
				hasPenicillinAllergy = true;
			}
		}
	}

	// 7. NSAID
	const nsaidKws = [
		"нпвс",
		"нпвп",
		"ибупрофен",
		"кеторолак",
		"кеторол",
		"кетанов",
		"нимесулид",
		"триада самтера",
		"аспирин",
		"aspirin",
		"ацетилсалициловая кислота",
		"аспириновая астма",
		"аспириновая триада",
	];
	let hasNsaidAllergyOrSamterTriad = false;
	for (const a of allergies) {
		if (a.hasSamterTriad) hasNsaidAllergyOrSamterTriad = true;
		const str = `${a.allergenGroup} ${a.drugInnLatin || ""}`.toLowerCase();
		if (nsaidKws.some((k) => str.includes(k)) && a.reactionSeverity !== "none") {
			hasNsaidAllergyOrSamterTriad = true;
		}
	}
	if (!hasNsaidAllergyOrSamterTriad) {
		const directTriadKws = [
			"триада самтера",
			"аспириновая астма",
			"аспириновая триада",
		];
		for (const kw of directTriadKws) {
			if (combinedText.includes(kw) && !isNegatedInClause(kw)) {
				hasNsaidAllergyOrSamterTriad = true;
				break;
			}
		}
	}
	if (!hasNsaidAllergyOrSamterTriad) {
		for (const kw of nsaidKws) {
			if (
				combinedText.includes(kw) &&
				anamnesisTriggers.some((t) => combinedText.includes(t)) &&
				!isNegatedInClause(kw)
			) {
				hasNsaidAllergyOrSamterTriad = true;
				break;
			}
		}
	}

	return {
		activeAnticoagulants: Array.from(new Set(activeAnticoags)),
		isAnticoagulantActive: activeAnticoags.length > 0,
		hasArticaineAmideAllergy,
		hasSevereHypertensionOrThyrotoxicosis,
		hasBronchialAsthmaOrSulfiteAllergy,
		activeBisphosphonates: Array.from(new Set(activeBisphosphonates)),
		isBisphosphonateActive: activeBisphosphonates.length > 0,
		hasPenicillinAllergy,
		hasNsaidAllergyOrSamterTriad,
		clinicalReasoning: "Deterministic semantic negation analysis complete",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CORE CLINICAL RADAR EVALUATION ENGINE (LAYER 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluates patient somatic profile against appointment context.
 * Returns quiet, structured alert cards only when genuine high-risk clinical combinations occur.
 */
export function evaluatePatientSomaticRisk(
	patient: PatientSomaticProfileInput,
	appointment: AppointmentSomaticContextInput,
	options?: {
		now?: Date;
		extractedRisks?: SomaticAnamnesisExtraction;
	},
): SomaticRadarAlert[] {
	const now = options?.now ?? new Date();
	const alerts: SomaticRadarAlert[] = [];

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

	const freeTextContext = [
		patient.notes || "",
		patient.pastAnamnesisText || "",
		patient.pastDiagnosesText || "",
	]
		.join(" ")
		.trim();

	// Use provided structured extraction, or evaluate via deterministic semantic engine
	const risks =
		options?.extractedRisks ??
		extractSomaticRisksDeterministic(
			freeTextContext,
			patient.activeMedications ?? [],
			patient.allergies ?? [],
		);

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 1: Surgery / Extraction + Anticoagulants (Dual-Factor)
	// ─────────────────────────────────────────────────────────────────────────
	if (isSurgery && risks.isAnticoagulantActive) {
		const highPotencyDrugs = [
			"варфарин",
			"warfarin",
			"ксарелто",
			"xarelto",
			"эликвис",
			"eliquis",
			"прадакса",
			"плавикс",
			"брилинта",
		];
		const isHighPotency = risks.activeAnticoagulants.some((kw) =>
			highPotencyDrugs.some((hp) => kw.toLowerCase().includes(hp)),
		);

		const urgency = isHighPotency ? "CRITICAL" : "HIGH";
		const detectedDrugNames = risks.activeAnticoagulants.join(", ") || "Антикоагулянтная терапия";

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_anticoagulant_surgery`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: true,
			category: "anticoagulant_surgery",
			threatTitleRu: "Риск интра- и постоперационного кровотечения (Антикоагулянты)",
			badgeText: "Коагулограмма / Гемостаз",
			urgency,
			clinicalAlertMessage: `🩸 Высокий риск кровотечения при хирургическом вмешательстве! Пациент принимает антикоагулянты/дезагреганты (${detectedDrugNames}). Рекомендован гемостатический протокол.`,
			detectedTriggers: risks.activeAnticoagulants,
			contraindicatedDrugs: ["НПВС (Кеторол, Аспирин) — повышают риск ЖКТ и раневых кровотечений"],
			recommendedAlternatives: [
				"Местный гемостаз (гемостатическая губка, швы на лунку, фибрин)",
				"Обезболивание: Парацетамол 500-1000 мг (безопаснее НПВС)",
				"Контроль МНО/коагулограммы перед сложным удалением",
			],
			clinicalGuidanceRu:
				"Не отменять антикоагулянты без согласования с кардиологом. Использовать атравматичное удаление, ушивание лунки полигликолидной нитью.",
			suggestedActions: [
				{
					actionId: "request_coagulogram",
					title: "Запросить коагулограмму / МНО кардиолога",
					payload: { patientId: patient.patientId, detectedDrugs: risks.activeAnticoagulants },
				},
				{
					actionId: "prepare_hemostatic_kit",
					title: "Подготовить набор местного гемостаза",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 2: Local Anesthesia + Articaine / Amide Allergy
	// ─────────────────────────────────────────────────────────────────────────
	if (isAnesthesia && risks.hasArticaineAmideAllergy) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_anesthetic_allergy`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "anesthetic_allergy",
			threatTitleRu: "Аллергия / непереносимость амидных анестетиков (Артикаин)",
			badgeText: "Противопоказан Артикаин",
			urgency: "CRITICAL",
			clinicalAlertMessage:
				"⚠️ Противопоказан Артикаин (Ультракаин, Септанест, Убистезин) и амидные анестетики! В анамнезе зафиксирована аллергическая реакция / отек.",
			detectedTriggers: ["Аллергия на артикаин / амиды"],
			contraindicatedDrugs: ["Артикаин 4%", "Лидокаин 2%", "Ультракаин Д-С Форте"],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
				"Проведение аллергопроб перед вмешательством",
			],
			clinicalGuidanceRu:
				"Использовать бессосудосуживающий анестетик Мепивакаин 3% или направить на аллергопробы.",
			suggestedActions: [
				{
					actionId: "switch_to_mepivacaine",
					title: "Использовать Мепивакаин 3% (Скандонест)",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 3: Vasoconstrictor Contraindication (Hypertension III / Thyrotoxicosis)
	// ─────────────────────────────────────────────────────────────────────────
	if (isAnesthesia && risks.hasSevereHypertensionOrThyrotoxicosis) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_vasoconstrictor_contraindication`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "vasoconstrictor_contraindication",
			threatTitleRu: "Противопоказан адреналин (Гипертоническая болезнь 3 ст. / Тиреотоксикоз)",
			badgeText: "Без адреналина",
			urgency: "CRITICAL",
			clinicalAlertMessage:
				"🛑 Противопоказан адреналин/эпинефрин! Высокий риск гипертонического криза, тахиаритмии или тиреотоксического криза.",
			detectedTriggers: ["Гипертония 3 ст. / Тиреотоксикоз"],
			contraindicatedDrugs: [
				"Адреналин 1:100 000",
				"Эпинефрин 1:200 000 (Ультракаин Д-С)",
			],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора (Скандонест 3%)",
				"Артикаин 4% без адреналина (Ультракаин Д)",
			],
			clinicalGuidanceRu:
				"Обязательный контроль АД и пульса до анестезии. Использовать анестетик без адреналина.",
			suggestedActions: [
				{
					actionId: "record_blood_pressure",
					title: "Измерить и зафиксировать АД перед приемом",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 4: Bronchial Asthma / Sulfite Allergy
	// ─────────────────────────────────────────────────────────────────────────
	if (isAnesthesia && risks.hasBronchialAsthmaOrSulfiteAllergy) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_sulfite_asthma`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "sulfite_asthma",
			threatTitleRu: "Риск бронхоспазма на стабилизатор карпулы (Метабисульфит E223)",
			badgeText: "Астма / Бесульфитный протокол",
			urgency: "HIGH",
			clinicalAlertMessage:
				"🫁 Бронхиальная астма / сульфитная гиперчувствительность! Противопоказаны анестетики с метабисульфитом натрия (E223).",
			detectedTriggers: ["Бронхиальная астма / сульфиты"],
			contraindicatedDrugs: ["Карпульные анестетики с адреналином и метабисульфитом натрия (E223)"],
			recommendedAlternatives: [
				"Мепивакаин 3% без вазоконстриктора",
				"Ультракаин Д (без консервантов и сульфитов)",
			],
			clinicalGuidanceRu:
				"Убедиться в наличии бронходилататора у пациента перед началом манипуляций.",
			suggestedActions: [
				{
					actionId: "check_inhaler",
					title: "Проверить наличие индивидуального ингалятора",
					payload: { patientId: patient.patientId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 5: Bisphosphonates + Surgery (MRONJ Risk)
	// ─────────────────────────────────────────────────────────────────────────
	if (isSurgery && risks.isBisphosphonateActive) {
		const detectedDrugs = risks.activeBisphosphonates.join(", ") || "Бисфосфонаты";

		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_bisphosphonates_mronj`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: true,
			category: "bisphosphonates_osteonecrosis",
			threatTitleRu: "Риск медикаментозного остеонекроза челюсти (MRONJ)",
			badgeText: "MRONJ Протокол",
			urgency: "CRITICAL",
			clinicalAlertMessage: `🦴 Высокий риск остеонекроза челюсти (MRONJ)! Пациент получает терапию бисфосфонатами/деносумабом (${detectedDrugs}).`,
			detectedTriggers: risks.activeBisphosphonates,
			contraindicatedDrugs: ["Грубая травматизация надкостницы", "Удаление без антибиотикопрофилактики"],
			recommendedAlternatives: [
				"Атравматичное удаление зуба с минимальным отслаиванием надкостницы",
				"Антибиотикопрофилактика (Амоксициллин / Клиндамицин)",
				"Герметичное первичное ушивание лунки без натяжения",
			],
			clinicalGuidanceRu:
				"Обязательно информированное согласие с предупреждением о риске остеонекроза. Минимизировать инвазивность.",
			suggestedActions: [
				{
					actionId: "mronj_protocol",
					title: "Активировать атравматичный протокол MRONJ",
					payload: { patientId: patient.patientId, detectedDrugs: risks.activeBisphosphonates },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 6: Penicillin Allergy
	// ─────────────────────────────────────────────────────────────────────────
	if (risks.hasPenicillinAllergy) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_penicillin_allergy`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "penicillin_allergy",
			threatTitleRu: "Аллергия на бета-лактамные антибиотики (Пенициллины)",
			badgeText: "Аллергия: Пенициллин",
			urgency: "HIGH",
			clinicalAlertMessage:
				"💊 Аллергия на пенициллиновый ряд! Противопоказаны Амоксициллин, Амоксиклав, Аугментин, Флемоксин.",
			detectedTriggers: ["Пенициллины"],
			contraindicatedDrugs: ["Амоксициллин", "Амоксиклав", "Аугментин"],
			recommendedAlternatives: [
				"Азитромицин (Сумамед) 500 мг 1 раз/сут 3 дня",
				"Клиндамицин 300 мг 3 раза/сут",
				"Кларитромицин 500 мг 2 раза/сут",
			],
			clinicalGuidanceRu:
				"При необходимости антибиотикопрофилактики использовать макролиды или линкозамиды.",
			suggestedActions: [
				{
					actionId: "set_alternative_antibiotic",
					title: "Выбрать макролид (Азитромицин / Клиндамицин)",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// THREAT 7: NSAID Allergy / Samter's Triad
	// ─────────────────────────────────────────────────────────────────────────
	if (risks.hasNsaidAllergyOrSamterTriad) {
		alerts.push({
			id: `somatic_radar_${appointment.appointmentId}_nsaid_contraindication`,
			organizationId: appointment.organizationId,
			appointmentId: appointment.appointmentId,
			patientId: patient.patientId,
			patientFullName: patient.fullName,
			patientPhone: patient.phone ?? null,
			patientAgeYears,
			doctorId: appointment.doctorId ?? null,
			doctorName: appointment.doctorName || "Лечащий врач",
			appointmentStartsAt:
				typeof appointment.startsAt === "string"
					? appointment.startsAt
					: appointment.startsAt.toISOString(),
			appointmentReason: appointment.reason ?? null,
			isSurgeryPlanned: isSurgery,
			category: "nsaid_contraindication",
			threatTitleRu: "Непереносимость НПВС / Аспириновая триада",
			badgeText: "Противопоказаны НПВС",
			urgency: "HIGH",
			clinicalAlertMessage:
				"⚠️ Аллергия на НПВС / аспириновая триада! Противопоказаны классические нестероидные противовоспалительные средства.",
			detectedTriggers: ["НПВС / Аспириновая триада"],
			contraindicatedDrugs: ["Ибупрофен", "Кеторолак (Кетанов)", "Диклофенак", "Нимесулид", "Аспирин"],
			recommendedAlternatives: [
				"Парацетамол 500-1000 мг до 4 раз/сут (макс 4 г/сут)",
				"Селективные ингибиторы ЦОГ-2 (Целекоксиб 100-200 мг)",
			],
			clinicalGuidanceRu:
				"Для купирования болевого синдрома назначать Парацетамол.",
			suggestedActions: [
				{
					actionId: "recommend_paracetamol",
					title: "Назначить Парацетамол вместо НПВС",
					payload: { appointmentId: appointment.appointmentId },
				},
			],
			createdAt: now.toISOString(),
		});
	}

	return alerts;
}
