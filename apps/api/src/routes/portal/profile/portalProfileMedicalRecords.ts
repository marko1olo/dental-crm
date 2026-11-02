/**
 * Portal Patient Medical Records, Diagnostic Imaging & Somatic Health Questionnaire
 * (DOMAIN: PATIENT PORTAL - LAYER 2 DATA ACCESS & CLINICAL ENGINE)
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	generatedDocuments,
	imagingStudies,
	patientDrugAllergies,
	patientInvoices,
	patients,
	treatmentPlans,
	visitDiaries,
} from "../../../db/schema.js";
import type { HealthQuestionnaireBody } from "../types.js";

/**
 * Получение медицинских записей пациента: дневники визитов, планы лечения, счета, документы и снимки.
 */
export async function fetchPatientMedicalRecords(
	patientId: string,
	organizationId: string,
) {
	const visits = await db
		.select()
		.from(visitDiaries)
		.where(
			and(
				eq(visitDiaries.patientId, patientId),
				eq(visitDiaries.organizationId, organizationId),
			),
		);

	const plans = await db
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.patientId, patientId),
				eq(treatmentPlans.organizationId, organizationId),
			),
		);

	const invoices = await db
		.select()
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.patientId, patientId),
				eq(patientInvoices.organizationId, organizationId),
			),
		);

	const documents = await db
		.select()
		.from(generatedDocuments)
		.where(
			and(
				eq(generatedDocuments.patientId, patientId),
				eq(generatedDocuments.organizationId, organizationId),
				eq(generatedDocuments.status, "issued"),
			),
		);

	// 152-ФЗ / 323-ФЗ ст. 13: Снимки визиографа/КТ без служебных заметок врача/куратора
	const scans = await db
		.select({
			id: imagingStudies.id,
			titleRu: imagingStudies.title,
			modality: imagingStudies.kind,
			toothCode: imagingStudies.toothCode,
			capturedAt: imagingStudies.capturedAt,
			aiSummary: imagingStudies.aiSummary,
			storagePath: imagingStudies.storagePath,
		})
		.from(imagingStudies)
		.where(
			and(
				eq(imagingStudies.patientId, patientId),
				eq(imagingStudies.organizationId, organizationId),
			),
		)
		.orderBy(desc(imagingStudies.capturedAt));

	return {
		visits,
		plans,
		invoices,
		documents,
		scans,
	};
}

export interface EvaluatedSomaticRiskResult {
	somaticProfile: {
		hasCardiovascularRisk: boolean;
		hasSulfiteAllergy: boolean;
		hasLocalAnestheticsAllergy: boolean;
		hasPenicillinAllergy: boolean;
		hasBronchialAsthma: boolean;
		hasBleedingDisorder: boolean;
		hasDiabetes: boolean;
		isPregnantOrLactating: boolean;
		customNotes?: string | undefined;
	};
	alerts: Array<{
		id: string;
		severity: "danger" | "warning" | "caution" | "info";
		title: string;
		message: string;
		recommendedAction: string;
	}>;
	riskLevel: "high" | "moderate" | "low";
	drugListToInsert: string[];
}

/**
 * Оценка соматических рисков и генерация клинических алертов для врача-стоматолога.
 */
export function evaluateSomaticHealthRisks(
	body: HealthQuestionnaireBody,
): EvaluatedSomaticRiskResult {
	const allergies = body.allergies || {};
	const cardiovascular = body.cardiovascular || {};
	const diabetes = body.diabetes || {};
	const coagulation = body.coagulation || {};
	const pregnancy = body.pregnancy || {};
	const respiratory = body.respiratory || {};

	const hasSulfiteAllergy = Boolean(
		allergies.sulfiteAllergy ||
			(allergies.details && /сульфит|метабисульфит/i.test(allergies.details)),
	);
	const hasLocalAnestheticsAllergy = Boolean(
		allergies.localAnestheticsAllergy ||
			(allergies.details && /анестетик|новокаин|лидокаин|ультракаин/i.test(allergies.details)),
	);
	const hasPenicillinAllergy = Boolean(
		allergies.antibioticsAllergy ||
			(allergies.details &&
				/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин|цефалоспорин|бета-лактам|penicillin|amoxicillin/i.test(
					allergies.details,
				)) ||
			(Array.isArray(allergies.drugList) &&
				allergies.drugList.some((d) =>
					/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин|цефалоспорин|бета-лактам|penicillin|amoxicillin/i.test(
						d,
					),
				)),
	);
	const hasBronchialAsthma = Boolean(
		respiratory.bronchialAsthma ||
			(allergies.details && /астма/i.test(allergies.details)),
	);
	const hasCardio = Boolean(
		cardiovascular.hasRisk ||
			cardiovascular.hypertension ||
			cardiovascular.arrhythmia ||
			cardiovascular.ischemicHeartDisease ||
			cardiovascular.heartAttackHistory ||
			cardiovascular.pacemaker,
	);
	const hasCoagulation = Boolean(
		coagulation.hasBleedingDisorder ||
			coagulation.onAnticoagulants ||
			coagulation.hemophilia,
	);
	const hasDiabetes = Boolean(diabetes.hasDiabetes);
	const isPregnantOrLactating = Boolean(pregnancy.isPregnantOrLactating);

	const alerts: EvaluatedSomaticRiskResult["alerts"] = [];

	if (hasSulfiteAllergy || (hasBronchialAsthma && hasSulfiteAllergy)) {
		alerts.push({
			id: "alert_sulfite_asthma",
			severity: "danger",
			title: "АЛЛЕРГОАНАМНЕЗ: Аллергия на сульфиты / риск бронхоспазма",
			message:
				"У пациента аллергия на сульфиты или бронхиальная астма. Противопоказаны анестетики с консервантом метабисульфитом натрия (Ультракаин Д-С, Септанест).",
			recommendedAction:
				"Применять Скандонест 3% (Мепивакаин без сульфитов и адреналина).",
		});
	}

	if (hasLocalAnestheticsAllergy) {
		alerts.push({
			id: "alert_local_anesthetics_allergy",
			severity: "danger",
			title: "АЛЛЕРГОАНАМНЕЗ: Гиперчувствительность к местным анестетикам",
			message:
				"Пациент указывает на реакцию на местные анестетики. Требуется проведение аллергопробы и подбор альтернативного препарата.",
			recommendedAction: "Консультация аллерголога, премедикация, безадреналиновый протокол.",
		});
	}

	if (hasPenicillinAllergy) {
		alerts.push({
			id: "alert_penicillin_allergy",
			severity: "danger",
			title: "АЛЛЕРГОАНАМНЕЗ: Аллергия на пенициллины и бета-лактамы",
			message:
				"Пациент указывает на аллергию к антибиотикам пенициллинового ряда. Категорически противопоказаны Амоксициллин, Амоксиклав, Аугментин, Цефалоспорины.",
			recommendedAction:
				"Препараты выбора при антибиотикопрофилактике: Кларитромицин, Азитромицин, Линкомицин или Клиндамицин.",
		});
	}

	if (hasCoagulation) {
		alerts.push({
			id: "alert_coagulation_anticoagulants",
			severity: "danger",
			title: "ГЕМОСТАЗ: Нарушение свертываемости крови / Антикоагулянты",
			message:
				"Пациент принимает антикоагулянты или имеет гемофилию. Высокий риск луночкового или интраоперационного кровотечения.",
			recommendedAction:
				"Обязательный гемостаз лунки (коллагеновая губка, швы), мониторинг свертываемости.",
		});
	}

	if (hasCardio) {
		alerts.push({
			id: "alert_cardio_pathology",
			severity: "warning",
			title: "КАРДИОВАСКУЛЯРНЫЙ РИСК: Гипертензия / ИБС / Аритмия",
			message:
				"Сердечно-сосудистая патология. Лимит эпинефрина: не более 0.04 мг (макс. 2 карпулы 1:100 000 или 4 карпулы 1:200 000).",
			recommendedAction:
				"Контроль АД перед приемом. При гипертонии — Скандонест 3% без вазоконстриктора.",
		});
	}

	if (isPregnantOrLactating) {
		alerts.push({
			id: "alert_pregnancy_status",
			severity: "warning",
			title: "АКУШЕРСКИЙ СТАТУС: Беременность / Лактация",
			message:
				"Препарат выбора — Артикаин 1:200 000 (Ультракаин Д-С) с минимальной дозой. Избегать высокой концентрации адреналина (1:100 000).",
			recommendedAction: "Ультракаин Д-С 1:200 000 в минимально эффективном объеме.",
		});
	}

	if (hasDiabetes) {
		alerts.push({
			id: "alert_diabetes_mellitus",
			severity: "warning",
			title: "ЭНДОКРИНОЛОГИЯ: Сахарный диабет",
			message:
				"Риск замедленной эпителизации, снижения остеоинтеграции имплантатов и инфекционных осложнений.",
			recommendedAction: "Антисептический протокол, атравматичная хирургия, контроль заживления.",
		});
	}

	const hasDanger = alerts.some((a) => a.severity === "danger");
	const hasWarning = alerts.some((a) => a.severity === "warning");
	const riskLevel: "high" | "moderate" | "low" = hasDanger
		? "high"
		: hasWarning
			? "moderate"
			: "low";

	const somaticProfile = {
		hasCardiovascularRisk: hasCardio,
		hasSulfiteAllergy,
		hasLocalAnestheticsAllergy,
		hasPenicillinAllergy,
		hasBronchialAsthma,
		hasBleedingDisorder: hasCoagulation,
		hasDiabetes,
		isPregnantOrLactating,
		customNotes: body.additionalNotes || undefined,
	};

	const drugListToInsert: string[] = Array.isArray(allergies.drugList)
		? [...allergies.drugList]
		: [];

	if (
		hasPenicillinAllergy &&
		!drugListToInsert.some((d) =>
			/пенициллин|амоксициллин|амоксиклав|аугментин|ампициллин/i.test(d),
		)
	) {
		drugListToInsert.push("Антибиотики пенициллинового ряда (Амоксициллин/Амоксиклав)");
	}
	if (
		hasLocalAnestheticsAllergy &&
		!drugListToInsert.some((d) =>
			/анестетик|новокаин|лидокаин|ультракаин/i.test(d),
		)
	) {
		drugListToInsert.push("Местные анестетики");
	}
	if (
		hasSulfiteAllergy &&
		!drugListToInsert.some((d) => /сульфит/i.test(d))
	) {
		drugListToInsert.push("Сульфиты / метабисульфит натрия");
	}

	return {
		somaticProfile,
		alerts,
		riskLevel,
		drugListToInsert,
	};
}

/**
 * Получение анкеты соматического здоровья и алертов рисков пациента.
 */
export async function fetchSomaticHealthQuestionnaire(
	patientId: string,
	organizationId: string,
) {
	const [patientRow] = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			administrativeProfile: patients.administrativeProfile,
		})
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!patientRow) return null;

	const profile =
		(patientRow.administrativeProfile as Record<string, unknown> | null) || {};
	return {
		questionnaire: profile.somaticQuestionnaire || null,
		somaticProfile: profile.somaticRiskProfile || null,
		alerts: profile.somaticAlerts || [],
		riskLevel: profile.somaticRiskLevel || "low",
		updatedAt: profile.somaticUpdatedAt || null,
	};
}

/**
 * Сохранение анкеты здоровья, оценка рисков и фиксация лекарственных аллергий.
 */
export async function saveSomaticHealthQuestionnaire(
	patientId: string,
	organizationId: string,
	body: HealthQuestionnaireBody,
) {
	const evaluated = evaluateSomaticHealthRisks(body);
	const now = new Date();
	const nowIso = now.toISOString();

	const [patientRow] = await db
		.select()
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);

	if (!patientRow) return null;

	const currentProfile =
		(patientRow.administrativeProfile as Record<string, unknown> | null) || {};

	// Update administrative profile
	await db
		.update(patients)
		.set({
			administrativeProfile: {
				...currentProfile,
				somaticQuestionnaire: body,
				somaticRiskProfile: evaluated.somaticProfile,
				somaticAlerts: evaluated.alerts,
				somaticRiskLevel: evaluated.riskLevel,
				somaticUpdatedAt: nowIso,
			} as any,
			updatedAt: now,
		})
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		);

	if (
		evaluated.drugListToInsert.length > 0 &&
		(body.allergies?.hasAllergies ||
			evaluated.somaticProfile.hasPenicillinAllergy ||
			evaluated.somaticProfile.hasLocalAnestheticsAllergy ||
			evaluated.somaticProfile.hasSulfiteAllergy)
	) {
		await db.insert(patientDrugAllergies).values(
			evaluated.drugListToInsert.map((drugName) => ({
				organizationId,
				patientId,
				allergenGroup: "Лекарственные препараты",
				drugInnLatin: drugName,
				reactionSeverity: "high",
				clinicalManifestations:
					body.allergies?.details || "Указано пациентом при заполнении анкеты здоровья в личном кабинете",
				isConfirmedByAllergist: false,
			})),
		);
	}

	return {
		success: true,
		somaticProfile: evaluated.somaticProfile,
		alerts: evaluated.alerts,
		riskLevel: evaluated.riskLevel,
		updatedAt: nowIso,
	};
}
