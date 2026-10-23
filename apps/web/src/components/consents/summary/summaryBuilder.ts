import {
	type ConsentTemplateKey,
	getConsentPackage,
	getConsentTemplate,
} from "../consentTemplates.js";
import { STATUTORY_CONSENT_KEY_LABELS } from "../consentSsotEngine.js";
import type { PatientConsentSummaryParams } from "./types";
import { sanitizeConsentFieldValue } from "./sanitizer";

/**
 * Формирует выжимку дополнительного согласия для отправки пациенту или подшивки к протоколу.
 */
export function buildAddendumConsentSummary(params: {
	patientName?: string | null | undefined;
	doctorName?: string | null | undefined;
	clinicName?: string | null | undefined;
	uncoveredTemplates?: ConsentTemplateKey[];
	uncoveredTemplateKeys?: ConsentTemplateKey[];
	toothNumbers?: string | null | undefined;
}): string {
	const effectivePatientName = sanitizeConsentFieldValue(params.patientName, "Пациент");
	const effectiveDoctorName = sanitizeConsentFieldValue(params.doctorName, "Лечащий врач-стоматолог");
	const effectiveClinicName = sanitizeConsentFieldValue(params.clinicName, "ООО «Стоматологическая клиника ДЕНТЕ»");
	const effectiveTeeth = sanitizeConsentFieldValue(params.toothNumbers, "Полость рта");
	const templates = params.uncoveredTemplates || params.uncoveredTemplateKeys || [];

	const titles = templates.map((k) => {
		try {
			const t = getConsentTemplate(k);
			return `${t.title} (${t.code})`;
		} catch {
			return (STATUTORY_CONSENT_KEY_LABELS as Record<string, string | undefined>)[k] || k;
		}
	});

	return [
		`ДОПОЛНИТЕЛЬНОЕ ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (клиника «${effectiveClinicName}»):`,
		`Пациент: ${effectivePatientName}`,
		`Лечащий врач: ${effectiveDoctorName}`,
		`Добавленные процедуры: ${titles.length > 0 ? titles.join(", ") : "По клиническим показаниям"}`,
		`Область вмешательства: ${effectiveTeeth}`,
		`Правовое основание: Федеральный закон № 323-ФЗ (ст. 20), Приказ Минздрава РФ № 1051н.`,
		`Врачебная автономия сохранена (экстренная помощь оказывается безотлагательно).`,
		`Памятка: пациент проинформирован о целях, методах, возможных рисках и альтернативах добавленных вмешательств.`,
	].join("\n");
}

/**
 * Формирует выжимку согласия и памятку для пациента без эмодзи (Мандаты 8d п. 7, 8e п. 5, 8i, 8k, 8n).
 * Готова для 1-клик отправки в WhatsApp / Telegram / SMS.
 */
export function buildPatientConsentSummary(params: PatientConsentSummaryParams): string {
	const effectivePatientName = sanitizeConsentFieldValue(params.patientName, "Пациент");
	const effectiveDoctorName = sanitizeConsentFieldValue(
		params.doctorName ||
			(params.doctorSpecialty ? `Врач-стоматолог (${params.doctorSpecialty})` : null) ||
			"Лечащий врач",
		"Лечащий врач",
	);
	const effectiveClinicName = sanitizeConsentFieldValue(
		params.clinicName || params.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		"ООО «Стоматологическая клиника ДЕНТЕ»",
	);
	const effectiveClinicPhone = (params.clinicPhone || "").trim();
	const effectiveTeeth = sanitizeConsentFieldValue(
		params.toothNumbers,
		params.activeMode === "single" ? "По показаниям" : "По плану лечения",
	);
	const hashPrefix = (params.integrityHash || "0000000000000000").slice(0, 16);

	if (params.activeMode === "packages") {
		const pkg = getConsentPackage(params.packageKey || "PACKAGE_PRIMARY_VISIT");
		const docList = pkg.templateKeys
			.map((key) => {
				const tpl = getConsentTemplate(key);
				return `${tpl.title} (${tpl.code})`;
			})
			.join(", ");

		const memoLines = [
			`Информированные согласия на лечение (клиника «${effectiveClinicName}»):`,
			`Пациент: ${effectivePatientName}`,
			`Пакет: ${pkg.title}`,
			`Документы: ${docList}`,
			`Врач: ${effectiveDoctorName}`,
			`Область лечения: ${effectiveTeeth}`,
			`Хеш целостности SHA-256: ${hashPrefix}...`,
		];
		if (effectiveClinicPhone) {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями. При возникновении вопросов звоните в клинику: ${effectiveClinicPhone}.`);
		} else {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями.`);
		}
		return memoLines.join("\n");
	}

	const tpl = getConsentTemplate(params.templateKey || "CONSENT_THERAPY");
	const effectiveDiagnosis = sanitizeConsentFieldValue(
		params.customDiagnosis || params.diagnosisIcd || "По плану лечения",
		"По плану лечения",
	);

	const memoLines = [
		`Информированное добровольное согласие (клиника «${effectiveClinicName}»):`,
		`Пациент: ${effectivePatientName}`,
		`Медицинское вмешательство: ${tpl.title} (${tpl.code})`,
		`Врач: ${effectiveDoctorName}`,
		`Область лечения: ${effectiveTeeth}`,
		`Диагноз МКБ: ${effectiveDiagnosis}`,
		`Ключевые риски и памятка: после вмешательства возможно появление локальной болезненности, отёка и чувствительности (1-3 дня). Строго соблюдайте назначения лечащего врача.`,
		`Хеш целостности SHA-256: ${hashPrefix}...`,
	];
	if (effectiveClinicPhone) {
		memoLines.push(`Телефон клиники: ${effectiveClinicPhone}.`);
	}
	return memoLines.join("\n");
}
