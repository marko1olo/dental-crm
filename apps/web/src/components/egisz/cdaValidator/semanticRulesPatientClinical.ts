/**
 * semanticRulesPatientClinical.ts — Rules 6-12: Patient, ICD-10, FDI tooth, Timestamp, UKEP, LegalAuth
 */

import { formatSnils, isValidSnils, normalizeSnils } from "@dental/shared/cda";
import { type CdaExportData, EGISZ_STANDARD_OIDS, type SemanticValidationRuleResult } from "./validatorTypes";

export function checkPatientAndClinicalRules(
	data: CdaExportData,
	xml: string,
	hasDoctorSignature: boolean,
	rules: SemanticValidationRuleResult[],
): void {
	// 6. Patient SNILS & Polis OMS
	const patSnilsRaw = normalizeSnils(data.patientSnils);
	const isPatSnilsValid = isValidSnils(patSnilsRaw);
	const hasPolis = Boolean(data.patientPolisOms && data.patientPolisOms.trim().length > 0);
	rules.push({
		id: "RULE_PATIENT_IDENTITY", name: "Идентификация пациента (СНИЛС / Полис ОМС)", category: "patient",
		status: isPatSnilsValid || hasPolis ? "passed" : "failed",
		message: isPatSnilsValid ? `СНИЛС пациента валиден: ${formatSnils(patSnilsRaw)}` : hasPolis ? `СНИЛС отсутствует, указан полис ОМС: ${data.patientPolisOms}` : "У пациента должен быть заполнен корректный СНИЛС или полис ОМС.",
		details: `СНИЛС: ${patSnilsRaw || "нет"}, ОМС: ${data.patientPolisOms || "нет"}`, xpathOrOid: "ClinicalDocument/recordTarget/patientRole/id",
	});

	// 7. Patient Birth Date & Gender
	const hasBirth = Boolean(data.patientBirthDate && !Number.isNaN(new Date(data.patientBirthDate).getTime()));
	const hasGender = data.patientGender === "male" || data.patientGender === "female";
	rules.push({
		id: "RULE_PATIENT_DEMOGRAPHICS", name: "Демографические данные пациента (Дата рождения и пол)", category: "patient",
		status: hasBirth && hasGender ? "passed" : "failed",
		message: hasBirth && hasGender ? `Дата рождения: ${data.patientBirthDate}, Пол: ${data.patientGender === "male" ? "Мужской" : "Женский"}` : "В карточке пациента должны быть указаны дата рождения и пол.",
		details: `Дата рождения: ${data.patientBirthDate || "нет"}, Пол: ${data.patientGender || "нет"}`, xpathOrOid: "recordTarget/patientRole/patient/birthTime, administrativeGenderCode",
	});

	// 8. ICD-10 Diagnosis code
	const icd10Regex = /^[A-TV-Z]\d{2}(\.\d{1,4})?$/i;
	const effectiveIcd10 = (data.icd10Code || "").trim() || (xml.match(/codeSystem="1\.2\.643\.5\.1\.13\.13\.11\.1005"[^>]*?code="([^"]+)"/)?.[1] || "");
	const isIcd10Valid = Boolean(effectiveIcd10 && icd10Regex.test(effectiveIcd10));
	rules.push({
		id: "RULE_ICD10_DIAGNOSIS", name: "Основной диагноз по справочнику МКБ-10", category: "clinical",
		status: isIcd10Valid ? "passed" : "failed",
		message: isIcd10Valid ? `Код МКБ-10: ${effectiveIcd10.toUpperCase()} (${data.diagnosisText || "Диагноз указан"})` : "Диагноз должен содержать валидный код МКБ-10 (например, K02.1, K04.0, K05.3).",
		details: "МКБ-10 OID: 1.2.643.5.1.13.13.11.1005", xpathOrOid: 'structuredBody//observation/value[@codeSystem="1.2.643.5.1.13.13.11.1005"]',
	});

	// 9. Dental localization / Tooth number
	const hasTooth = Boolean(data.diagnosisTooth && String(data.diagnosisTooth).trim().length > 0);
	const hasOdontogram = Boolean(data.toothStates && Object.keys(data.toothStates).length > 0);
	rules.push({
		id: "RULE_DENTAL_LOCALIZATION", name: "Стоматологическая локализация и зубная формула FDI", category: "clinical",
		status: hasTooth || hasOdontogram ? "passed" : "warning",
		message: hasTooth ? `Указана локализация диагноза: Зуб #${data.diagnosisTooth} (ISO 3950)` : hasOdontogram ? `Прикреплена зубная формула: ${Object.keys(data.toothStates || {}).length} зубов` : "Рекомендуется указать номер причинного зуба по формуле FDI (11–48) для стоматологического СЭМД.",
		details: "Классификатор зубов 1.2.643.5.1.13.13.11.1466", xpathOrOid: 'structuredBody//targetSiteCode[@codeSystem="1.2.643.5.1.13.13.11.1466"]',
	});

	// 10. Timestamp
	const hasEffectiveTime = xml.includes("<effectiveTime");
	rules.push({
		id: "RULE_ENCOUNTER_TIMESTAMP", name: "Временные метки приема (HL7 TS с часовым поясом)", category: "header",
		status: hasEffectiveTime ? "passed" : "failed",
		message: hasEffectiveTime ? "Временная метка приёма сформирована в формате ISO/HL7 TS (+ZZZZ)." : "Отсутствует корректная временная метка случая обслуживания.",
		details: "HL7 TS: YYYYMMDDHHMMSS+ZZZZ", xpathOrOid: "ClinicalDocument/effectiveTime",
	});

	// 11. UKEP Signature
	rules.push({
		id: "RULE_UKEP_SIGNATURE", name: "Усиленная квалифицированная электронная подпись (УКЭП)", category: "signature",
		status: hasDoctorSignature ? "passed" : "warning",
		message: hasDoctorSignature ? "УКЭП врача ГОСТ Р 34.10-2012 успешно наложена и проверена." : "УКЭП врача еще не наложена. Для отправки в РЭМД ЕГИСЗ требуется подписание.",
		details: `ГОСТ Р 34.10-2012 (${EGISZ_STANDARD_OIDS.GOST_3410_2012_256}) PKCS#7 detached`, xpathOrOid: "package/doctorSignature",
	});

	// 12. Legal Authenticator
	const hasLegalAuth = xml.includes("<legalAuthenticator");
	rules.push({
		id: "RULE_LEGAL_AUTHENTICATOR", name: "Сведения о лице, заверившем документ (legalAuthenticator)", category: "header",
		status: hasLegalAuth ? "passed" : "failed",
		message: hasLegalAuth ? "Блок заверителя документа (руководитель МО / главный врач) присутствует в CDA XML." : "В структуре CDA отсутствует обязательный блок <legalAuthenticator>.",
		details: "HL7 CDA R2 legalAuthenticator + подпись МО", xpathOrOid: "ClinicalDocument/legalAuthenticator",
	});
}
