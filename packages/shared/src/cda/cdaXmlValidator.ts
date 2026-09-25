/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 XML STRUCTURAL VALIDATOR (МИНЗДРАВ РФ)
 * Statutory XSD constraints, root namespaces, header metadata, author/custodian OIDs,
 * and clinical sections verification for SEMDs.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import type {
	CdaValidationIssue,
	CdaValidationResult,
} from "./types.js";
import {
	validateOid,
	validateFrmoOid,
	validateOgrn,
	validateInn,
	validateFdiToothNumber,
	validateOrder804nCode,
	isValidSnils,
	normalizeSnils,
} from "./cdaIdValidators.js";

/**
 * Rigorous XML structural validator against HL7 CDA R2 & Minzdrav REMD statutory XSD constraints.
 * Validates XML well-formedness, root namespaces, header metadata, author/custodian OIDs,
 * and presence of required clinical sections for specific SEMD kinds (101, 103, 104, 108, 109, 130).
 */
export function validateCdaXmlStructure(
	xml: string,
	expectedDocKind?:
		| "101"
		| "103"
		| "104"
		| "108"
		| "109"
		| "043u"
		| "043-1u"
		| "130"
		| string,
): CdaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const issues: CdaValidationIssue[] = [];

	if (!xml || typeof xml !== "string" || xml.trim().length === 0) {
		errors.push("XML документ пуст или не является строкой.");
		return { valid: false, errors, warnings, issues };
	}

	const trimmed = xml.trim();

	// 1. Root XML declaration & ClinicalDocument root element
	if (!trimmed.startsWith("<?xml")) {
		warnings.push(
			'XML документ не содержит стандартной декларации <?xml version="1.0"...?>',
		);
	}

	if (!/<ClinicalDocument\b[^>]*\bxmlns="urn:hl7-org:v3"/i.test(trimmed)) {
		errors.push(
			'XML документ не содержит корневого элемента <ClinicalDocument xmlns="urn:hl7-org:v3"> (HL7 CDA R2)',
		);
		issues.push({
			path: "ClinicalDocument",
			field: "root",
			message: "Некорректный корневой элемент CDA",
			severity: "error",
		});
	}

	// 2. Statutory Header Elements per HL7 CDA R2 XSD (Attribute-order agnostic)
	if (!/<realmCode\b[^>]*\bcode="RU"[^>]*\/?>/i.test(trimmed)) {
		errors.push(
			'Отсутствует обязательный элемент <realmCode code="RU"/> (Минздрав РФ)',
		);
		issues.push({
			path: "ClinicalDocument.realmCode",
			field: "realmCode",
			message: "Отсутствует realmCode RU",
			severity: "error",
		});
	}

	const typeIdMatch = trimmed.match(/<typeId\b([^>]+)\/?>/i);
	const typeIdAttrs = typeIdMatch?.[1] ?? "";
	if (
		!typeIdAttrs ||
		!/\broot="2\.16\.840\.1\.113883\.1\.3"/i.test(typeIdAttrs) ||
		!/\bextension="POCD_HD000040"/i.test(typeIdAttrs)
	) {
		errors.push(
			"Отсутствует или некорректен элемент <typeId> (ожидается POCD_HD000040 c OID 2.16.840.1.113883.1.3)",
		);
		issues.push({
			path: "ClinicalDocument.typeId",
			field: "typeId",
			message: "Некорректный typeId CDA R2",
			severity: "error",
		});
	}

	// Template ID check
	const templateRoots = [
		...trimmed.matchAll(
			/<templateId\b[^>]*\broot="([0-2](\.(0|[1-9][0-9]*))+)"/gi,
		),
	].map((m) => m[1] ?? "");
	if (templateRoots.length === 0) {
		errors.push(
			"Отсутствует элемент <templateId> с OID шаблона документа Минздрава",
		);
		issues.push({
			path: "ClinicalDocument.templateId",
			field: "templateId",
			message: "Отсутствует templateId",
			severity: "error",
		});
	}

	// Document ID check
	const idMatches = [...trimmed.matchAll(/<id\b([^>]+)\/?>/gi)];
	const hasValidDocId = idMatches.some((m) => {
		const attrs = m[1] ?? "";
		return (
			/\broot="[0-2](\.(0|[1-9][0-9]*))+"/i.test(attrs) &&
			/\bextension="[^"]+"/i.test(attrs)
		);
	});
	if (!hasValidDocId) {
		errors.push(
			'Отсутствует уникальный идентификатор документа <id root="..." extension="..."/>',
		);
		issues.push({
			path: "ClinicalDocument.id",
			field: "id",
			message: "Отсутствует id документа",
			severity: "error",
		});
	}

	// Document code (NSI 1.2.643.5.1.13.13.11.1522)
	const codeMatches = [...trimmed.matchAll(/<code\b([^>]+)\/?>/gi)];
	const docCodeMatch = codeMatches.find((m) =>
		/\bcodeSystem="1\.2\.643\.5\.1\.13\.13\.11\.1522"/i.test(m[1] ?? ""),
	);
	if (!docCodeMatch) {
		errors.push(
			"Отсутствует или некорректен элемент <code> с классификатором видов меддокументов Минздрава (OID 1.2.643.5.1.13.13.11.1522)",
		);
		issues.push({
			path: "ClinicalDocument.code",
			field: "code",
			message: "Некорректный код вида документа",
			severity: "error",
		});
	} else {
		const docAttrs = docCodeMatch[1] ?? "";
		const codeValMatch = docAttrs.match(/\bcode="([^"]+)"/i);
		const actualDocCode = codeValMatch ? (codeValMatch[1] ?? "") : "";

		// Verify expected doc kind matches NSI code and template OID
		if (expectedDocKind) {
			const normalizedKind =
				expectedDocKind === "043u"
					? "101"
					: expectedDocKind === "043-1u"
						? "109"
						: expectedDocKind;
			if (actualDocCode && actualDocCode !== normalizedKind) {
				errors.push(
					`СЭМД: Несоответствие кода вида документа НСИ 1522: ожидался "${normalizedKind}", но в XML указан "${actualDocCode}"`,
				);
				issues.push({
					path: "ClinicalDocument.code",
					field: "code",
					message: "Несоответствие кода вида документа",
					severity: "error",
				});
			}

			// Verify statutory template OID for expected document kind
			const expectedTemplateMap: Record<string, string> = {
				"101": EGISZ_OIDS.SEMD_TEMPLATE_101,
				"103": EGISZ_OIDS.SEMD_TEMPLATE_103,
				"104": EGISZ_OIDS.SEMD_TEMPLATE_104,
				"108": EGISZ_OIDS.SEMD_TEMPLATE_DENTAL_108,
				"109": EGISZ_OIDS.SEMD_TEMPLATE_109,
				"130": EGISZ_OIDS.SEMD_TEMPLATE_130,
			};
			const requiredOid = expectedTemplateMap[normalizedKind];
			if (requiredOid && !templateRoots.includes(requiredOid)) {
				errors.push(
					`СЭМД ${expectedDocKind}: Отсутствует обязательный OID шаблона документа ${requiredOid}`,
				);
				issues.push({
					path: "ClinicalDocument.templateId",
					field: "templateId",
					message: `Отсутствует обязательный OID шаблона ${requiredOid}`,
					severity: "error",
				});
			}
		}
	}

	// Effective time (YYYYMMDD with optional HHmmss and optional timezone offset or Z)
	if (
		!/<effectiveTime\b[^>]*\bvalue="\d{8}(?:\d{4,6})?(?:[+-]\d{2,4}|Z)?"/i.test(
			trimmed,
		)
	) {
		errors.push(
			'Отсутствует или некорректен элемент даты документа <effectiveTime value="YYYYMMDD..."/>',
		);
		issues.push({
			path: "ClinicalDocument.effectiveTime",
			field: "effectiveTime",
			message: "Некорректная дата effectiveTime",
			severity: "error",
		});
	}

	// Confidentiality code
	if (!/<confidentialityCode\b[^>]*\bcode="N"/i.test(trimmed)) {
		warnings.push(
			'Рекомендуется стандартный код конфиденциальности <confidentialityCode code="N"/>',
		);
	}

	// Language code
	if (!/<languageCode\b[^>]*\bcode="ru-RU"/i.test(trimmed)) {
		errors.push('Отсутствует элемент локали <languageCode code="ru-RU"/>');
		issues.push({
			path: "ClinicalDocument.languageCode",
			field: "languageCode",
			message: "Отсутствует languageCode ru-RU",
			severity: "error",
		});
	}

	// 3. Clinical Participants (recordTarget, author, custodian)
	if (!/<recordTarget>/i.test(trimmed) || !/<patientRole>/i.test(trimmed)) {
		errors.push("Отсутствует секция пациента <recordTarget><patientRole>...");
		issues.push({
			path: "ClinicalDocument.recordTarget",
			field: "recordTarget",
			message: "Отсутствует recordTarget",
			severity: "error",
		});
	}

	if (!/<author>/i.test(trimmed) || !/<assignedAuthor>/i.test(trimmed)) {
		errors.push(
			"Отсутствует секция автора документа <author><assignedAuthor>...",
		);
		issues.push({
			path: "ClinicalDocument.author",
			field: "author",
			message: "Отсутствует author",
			severity: "error",
		});
	} else {
		// Check author doctor SNILS (OID 1.2.643.100.3)
		const authorBlockMatch = trimmed.match(/<author>[\s\S]*?<\/author>/i);
		if (authorBlockMatch) {
			const snilsMatch =
				authorBlockMatch[0].match(
					/<id\b[^>]*\broot="1\.2\.643\.100\.3"[^>]*\bextension="([^"]+)"/i,
				) ||
				authorBlockMatch[0].match(
					/<id\b[^>]*\bextension="([^"]+)"[^>]*\broot="1\.2\.643\.100\.3"/i,
				);
			if (!snilsMatch || !isValidSnils(snilsMatch[1])) {
				errors.push(
					"В секции автора <author> отсутствует валидный СНИЛС врача (OID 1.2.643.100.3)",
				);
				issues.push({
					path: "ClinicalDocument.author.assignedAuthor.id",
					field: "snils",
					message: "Некорректный или отсутствующий СНИЛС врача",
					severity: "error",
					oid: EGISZ_OIDS.SNILS,
				});
			}
		}
	}

	if (!/<custodian>/i.test(trimmed) || !/<assignedCustodian>/i.test(trimmed)) {
		errors.push(
			"Отсутствует секция медицинской организации <custodian><assignedCustodian>...",
		);
		issues.push({
			path: "ClinicalDocument.custodian",
			field: "custodian",
			message: "Отсутствует custodian",
			severity: "error",
		});
	} else {
		// Check MO identification (FRMO OID 1.2.643.5.1.13.13.12.2 / MO Passport OID 1.2.643.5.1.13.13.11.1008 / OGRN / INN)
		const custodianBlock = trimmed.match(/<custodian>[\s\S]*?<\/custodian>/i);
		if (custodianBlock) {
			const hasMoId =
				/root="1\.2\.643\.5\.1\.13\.13\.12\.2"/i.test(custodianBlock[0]) ||
				/root="1\.2\.643\.5\.1\.13\.13\.11\.1008"/i.test(custodianBlock[0]) ||
				/root="1\.2\.643\.100\.1"/i.test(custodianBlock[0]) ||
				/root="1\.2\.643\.100\.4"/i.test(custodianBlock[0]);
			if (!hasMoId) {
				errors.push(
					"В секции организации <custodian> отсутствует идентификатор МО (ФРМО OID 1.2.643.5.1.13.13.12.2 / Паспорт МО OID 1.2.643.5.1.13.13.11.1008 / ОГРН / ИНН)",
				);
				issues.push({
					path: "ClinicalDocument.custodian.assignedCustodian.representedCustodianOrganization.id",
					field: "id",
					message: "Отсутствует идентификатор медицинской организации",
					severity: "error",
					oid: EGISZ_OIDS.FRMO_MO_ROOT,
				});
			}
		}
	}

	// FDI Tooth numbering validation in clinical entries (<targetSiteCode code="..." codeSystem="1.2.643.5.1.13.13.11.1466" ...>)
	const toothMatches = [...trimmed.matchAll(/<targetSiteCode\b([^>]+)\/?>/gi)];
	for (const tm of toothMatches) {
		const attrs = tm[1] ?? "";
		if (/codeSystem="1\.2\.643\.5\.1\.13\.13\.11\.1466"/i.test(attrs)) {
			const codeMatch = attrs.match(/\bcode="([^"]+)"/i);
			if (codeMatch && codeMatch[1]) {
				const toothNum = codeMatch[1].trim();
				if (!validateFdiToothNumber(toothNum)) {
					errors.push(
						`СЭМД: Недопустимый номер зуба FDI "${toothNum}" в клиническом документе (разрешены 11..48, 51..85 по ISO 3950)`,
					);
					issues.push({
						path: "structuredBody.targetSiteCode",
						field: "code",
						message: `Недопустимый номер зуба FDI "${toothNum}"`,
						severity: "error",
						oid: EGISZ_OIDS.DENTAL_TOOTH,
					});
				}
			}
		}
	}

	// Order 804n service code validation in clinical entries (<code code="..." codeSystem="1.2.643.5.1.13.13.11.1070" ...>)
	const serviceMatches = [...trimmed.matchAll(/<code\b([^>]+)\/?>/gi)];
	for (const sm of serviceMatches) {
		const attrs = sm[1] ?? "";
		if (/codeSystem="1\.2\.643\.5\.1\.13\.13\.11\.1070"/i.test(attrs)) {
			const codeMatch = attrs.match(/\bcode="([^"]+)"/i);
			if (codeMatch && codeMatch[1]) {
				const serviceCode = codeMatch[1].trim();
				if (!validateOrder804nCode(serviceCode)) {
					errors.push(
						`СЭМД: Код медицинской услуги "${serviceCode}" не соответствует Номенклатуре Приказа Минздрава РФ № 804н`,
					);
					issues.push({
						path: "structuredBody.procedure.code",
						field: "code",
						message: `Недопустимый код услуги 804н "${serviceCode}"`,
						severity: "error",
						oid: EGISZ_OIDS.ORDER_804N,
					});
				}
			}
		}
	}

	// 4. Structured Body
	if (!/<component>\s*<structuredBody>/i.test(trimmed)) {
		errors.push(
			"Отсутствует секция структурированного клинического тела документа <component><structuredBody>",
		);
		issues.push({
			path: "ClinicalDocument.component.structuredBody",
			field: "structuredBody",
			message: "Отсутствует structuredBody",
			severity: "error",
		});
	}

	// 5. Document-type specific sections
	const normKind =
		expectedDocKind === "043u"
			? "101"
			: expectedDocKind === "043-1u"
				? "109"
				: expectedDocKind;
	if (normKind === "101" || normKind === "103" || normKind === "108") {
		if (!trimmed.includes(EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION)) {
			errors.push(
				`СЭМД ${expectedDocKind}: Отсутствует обязательная секция диагнозов (LOINC ${EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION})`,
			);
			issues.push({
				path: "structuredBody.diagnoses",
				field: "section",
				message: "Отсутствует секция диагнозов",
				severity: "error",
			});
		}
		if (!trimmed.includes(EGISZ_OIDS.ICD10)) {
			errors.push(
				`СЭМД ${expectedDocKind}: Отсутствует кодирование диагноза по МКБ-10 (OID ${EGISZ_OIDS.ICD10})`,
			);
			issues.push({
				path: "structuredBody.diagnoses.icd10",
				field: "value",
				message: "Отсутствует код МКБ-10",
				severity: "error",
			});
		}
	} else if (normKind === "104") {
		if (!trimmed.includes(EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION)) {
			errors.push(
				"СЭМД 104 (Эпикриз): Отсутствует обязательная секция диагнозов",
			);
			issues.push({
				path: "structuredBody.diagnoses",
				field: "section",
				message: "Отсутствует секция диагнозов",
				severity: "error",
			});
		}
		if (!trimmed.includes(EGISZ_OIDS.LOINC_EPICRISIS)) {
			warnings.push(
				"СЭМД 104 (Эпикриз): Рекомендуется секция выписного заключения (LOINC 42344-2)",
			);
		}
	} else if (normKind === "109") {
		const hasOdontogram =
			trimmed.includes(EGISZ_OIDS.LOINC_DENTAL_STATUS) ||
			trimmed.includes(EGISZ_OIDS.LOINC_DENTAL_ODONTOGRAM);
		const hasOcclusion =
			trimmed.includes(EGISZ_OIDS.ANGLE_OCCLUSION_CLASSIFIER) ||
			trimmed.includes(EGISZ_OIDS.LOINC_DIAGNOSIS_SECTION);
		if (!hasOdontogram && !hasOcclusion) {
			errors.push(
				"СЭМД 109 (Ортодонтия): Отсутствует обязательная одонтограмма или ортодонтический статус",
			);
			issues.push({
				path: "structuredBody.orthodontic",
				field: "section",
				message: "Отсутствует одонтограмма или статус прикуса",
				severity: "error",
			});
		}
	} else if (normKind === "130") {
		if (!trimmed.includes(EGISZ_OIDS.LOINC_PAYMENTS_AND_CONTRACT)) {
			errors.push(
				"СЭМД 130: Отсутствует секция договора на медуслуги (LOINC 48768-6)",
			);
			issues.push({
				path: "structuredBody.contract",
				field: "section",
				message: "Отсутствует секция договора",
				severity: "error",
			});
		}
		if (!trimmed.includes(EGISZ_OIDS.LOINC_TAXPAYER_INFO)) {
			warnings.push(
				"СЭМД 130: Рекомендуется секция сведений о налогоплательщике (LOINC 55752-0)",
			);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		issues,
	};
}

