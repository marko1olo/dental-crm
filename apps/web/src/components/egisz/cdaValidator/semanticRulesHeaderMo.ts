/**
 * semanticRulesHeaderMo.ts — Rules 1-5: Header, Template, Clinic FRMO/OGRN/INN, Doctor SNILS
 */

import { formatSnils, isValidSnils, normalizeSnils } from "@dental/shared/cda";
import { type CdaExportData, EGISZ_SEMD_DOC_TYPES, type SemanticValidationRuleResult } from "./validatorTypes";

export function checkHeaderAndMoRules(data: CdaExportData, xml: string, rules: SemanticValidationRuleResult[]): void {
	// 1. Root & realmCode
	const hasRuRealm = xml.includes('<realmCode code="RU"/>');
	const hasRoot = xml.includes("<ClinicalDocument") && xml.includes("POCD_HD000040");
	rules.push({
		id: "RULE_ROOT_REALM", name: "Корневой элемент CDA R2 и профиль РФ", category: "header",
		status: hasRuRealm && hasRoot ? "passed" : "failed",
		message: hasRuRealm && hasRoot ? 'Корневой элемент <ClinicalDocument> и профиль РФ <realmCode code="RU"/> корректны.' : 'Отсутствует обязательный корневой элемент или тег realmCode code="RU".',
		details: "HL7 CDA R2 (POCD_MT000040.xsd) + ЕГИСЗ РЭМД профиль РФ", xpathOrOid: "ClinicalDocument/realmCode",
	});

	// 2. Template ID OID
	const docDef = EGISZ_SEMD_DOC_TYPES[data.docTypeCode] || EGISZ_SEMD_DOC_TYPES["302"];
	const hasTemplate = xml.includes(`<templateId root="${docDef.templateRoot}"/>`);
	rules.push({
		id: "RULE_TEMPLATE_ID", name: `Шаблон СЭМД (${docDef.title})`, category: "header",
		status: hasTemplate ? "passed" : "failed",
		message: hasTemplate ? `Задан OID шаблона Минздрава РФ: ${docDef.templateRoot} (СЭМД ${docDef.code})` : `Не найден OID шаблона ${docDef.templateRoot} для СЭМД ${docDef.code}`,
		details: "Реестр НСИ Минздрава РФ 1.2.643.5.1.13.13.11.1527", xpathOrOid: `ClinicalDocument/templateId[@root="${docDef.templateRoot}"]`,
	});

	// 3. MO OID / FRMO
	const hasMoOid = Boolean(data.clinicOid && data.clinicOid.trim().length > 0);
	rules.push({
		id: "RULE_CLINIC_FRMO", name: "Идентификатор МО в ФРМО (OID организации)", category: "mo",
		status: hasMoOid ? "passed" : "failed",
		message: hasMoOid ? `OID медицинской организации в ФРМО: ${data.clinicOid}` : "Не указан OID клиники в настройках интеграции с ЕГИСЗ (EGISZ_CLINIC_OID).",
		details: "Реестр ФРМО 1.2.643.5.1.13.13.12.2", xpathOrOid: "ClinicalDocument/custodian/assignedCustodian/representedCustodianOrganization/id",
	});

	// 4. Legal OGRN & INN
	const hasOgrn = Boolean(data.clinicOgrn && (data.clinicOgrn.length === 13 || data.clinicOgrn.length === 15));
	const hasInn = Boolean(data.clinicInn && (data.clinicInn.length === 10 || data.clinicInn.length === 12));
	rules.push({
		id: "RULE_CLINIC_OGRN_INN", name: "Юридические реквизиты МО (ОГРН и ИНН)", category: "mo",
		status: hasOgrn && hasInn ? "passed" : hasOgrn || hasInn ? "warning" : "failed",
		message: hasOgrn && hasInn ? `ОГРН (${data.clinicOgrn}) и ИНН (${data.clinicInn}) заполнены корректно.` : "Рекомендуется указать оба реквизита: ОГРН (13/15 знаков) и ИНН (10/12 знаков).",
		details: `ОГРН: ${data.clinicOgrn || "нет"}, ИНН: ${data.clinicInn || "нет"}`, xpathOrOid: "assignedAuthor/representedOrganization/id",
	});

	// 5. Doctor SNILS & FRMR position
	const docSnilsRaw = normalizeSnils(data.doctorSnils);
	const isDocSnilsValid = isValidSnils(docSnilsRaw);
	rules.push({
		id: "RULE_DOCTOR_SNILS_FRMR", name: "СНИЛС врача и должность в ФРМР", category: "doctor",
		status: isDocSnilsValid ? "passed" : "failed",
		message: isDocSnilsValid ? `СНИЛС врача проверен по алгоритму ПФР №192п: ${formatSnils(docSnilsRaw)} (${data.doctorPosition || "Врач-стоматолог"})` : "Не указан или некорректен СНИЛС врача (ФРМР отклонит регистрацию СЭМД без валидной контрольной суммы СНИЛС).",
		details: `Позиция NSI: ${data.doctorPositionCode || "15"}, СНИЛС: ${docSnilsRaw || "не задан"}`, xpathOrOid: 'ClinicalDocument/author/assignedAuthor/id[@root="1.2.643.100.3"]',
	});
}
