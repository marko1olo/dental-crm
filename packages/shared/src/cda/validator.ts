/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 & UKEP STATUTORY VALIDATOR (МИНЗДРАВ РФ)
 * Strict validation of Russian healthcare CDA R2 XML against Minzdrav
 * regulatory rules, XSD schema constraints, and digital signature standards.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import {
	cdaDocumentParamsSchema,
	cdaSemd043_1uSchema,
	cdaSemd101Schema,
	cdaSemd104Schema,
	cdaSemd130Schema,
	detachedSignatureSchema,
} from "./schemas.js";
import type {
	CdaDocumentParams,
	CdaSemd043_1uParams,
	CdaSemd101Params,
	CdaSemd104Params,
	CdaSemd130Params,
	CdaValidationIssue,
	CdaValidationResult,
	CertificateValidationDetails,
	DetachedSignature,
} from "./types.js";

/**
 * Validates OID (Object Identifier) syntax per ITU-T X.660 / ISO 8824.
 */
export function validateOid(oid: string): boolean {
	if (!oid || typeof oid !== "string") return false;
	return /^[0-2](\.(0|[1-9][0-9]*))+$/.test(oid.trim());
}

/**
 * Validates FRMO (Federal Register of Medical Organizations) MO OID root.
 */
export function validateFrmoOid(oid: string): boolean {
	if (!validateOid(oid)) return false;
	const trimmed = oid.trim();
	return (
		trimmed === EGISZ_OIDS.FRMO_MO_ROOT ||
		trimmed.startsWith(`${EGISZ_OIDS.FRMO_MO_ROOT}.`)
	);
}

/**
 * Normalizes SNILS string to digits only.
 */
export function normalizeSnils(input: unknown): string {
	if (typeof input === "number") return String(input).replace(/\D/g, "");
	if (typeof input !== "string") return "";
	return input.replace(/\D/g, "");
}

/**
 * Validates Russian SNILS 11-digit number with checksum algorithm (Resolution 192p).
 */
export function isValidSnils(input: unknown): boolean {
	const digits = normalizeSnils(input);
	if (digits.length !== 11) return false;
	if (/^(\d)\1{10}$/.test(digits)) return false;

	const numberPart = digits.slice(0, 9);
	const providedChecksum = Number.parseInt(digits.slice(9, 11), 10);

	if (Number.parseInt(numberPart, 10) <= 1001998) return true;

	let sum = 0;
	for (let index = 0; index < 9; index += 1) {
		sum += Number.parseInt(numberPart.charAt(index), 10) * (9 - index);
	}

	let expected: number;
	if (sum < 100) {
		expected = sum;
	} else if (sum === 100 || sum === 101) {
		expected = 0;
	} else {
		const remainder = sum % 101;
		expected = remainder === 100 || remainder === 101 ? 0 : remainder;
	}

	return expected === providedChecksum;
}

/**
 * Validates Russian OGRN (13 digits for Legal Entity, 15 digits for IP).
 */
export function validateOgrn(ogrn: string | null | undefined): boolean {
	if (!ogrn || typeof ogrn !== "string") return false;
	const trimmed = ogrn.trim();
	if (!/^\d{13}$|^\d{15}$/.test(trimmed)) return false;

	if (trimmed.length === 13) {
		const num = BigInt(trimmed.slice(0, 12));
		const check = Number((num % 11n) % 10n);
		return check === Number.parseInt(trimmed.charAt(12), 10);
	}

	if (trimmed.length === 15) {
		const num = BigInt(trimmed.slice(0, 14));
		const check = Number((num % 13n) % 10n);
		return check === Number.parseInt(trimmed.charAt(14), 10);
	}

	return false;
}

/**
 * Validates Russian INN (10 digits for Legal Entity, 12 digits for Individual/IP).
 */
export function validateInn(inn: string | null | undefined): boolean {
	if (!inn || typeof inn !== "string") return false;
	const trimmed = inn.trim();
	if (!/^\d{10}$|^\d{12}$/.test(trimmed)) return false;

	if (trimmed.length === 10) {
		const coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
		let sum = 0;
		for (let i = 0; i < 9; i++) {
			sum += Number.parseInt(trimmed.charAt(i), 10) * (coefficients[i] ?? 0);
		}
		const check = (sum % 11) % 10;
		return check === Number.parseInt(trimmed.charAt(9), 10);
	}

	if (trimmed.length === 12) {
		const c1 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
		let sum1 = 0;
		for (let i = 0; i < 10; i++) {
			sum1 += Number.parseInt(trimmed.charAt(i), 10) * (c1[i] ?? 0);
		}
		const check1 = (sum1 % 11) % 10;
		if (check1 !== Number.parseInt(trimmed.charAt(10), 10)) return false;

		const c2 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8] as const;
		let sum2 = 0;
		for (let i = 0; i < 11; i++) {
			sum2 += Number.parseInt(trimmed.charAt(i), 10) * (c2[i] ?? 0);
		}
		const check2 = (sum2 % 11) % 10;
		return check2 === Number.parseInt(trimmed.charAt(11), 10);
	}

	return false;
}

/**
 * Validates FDI ISO 3950 Tooth Number.
 * Adult quadrants: 11..18, 21..28, 31..38, 41..48.
 * Deciduous quadrants: 51..55, 61..65, 71..75, 81..85.
 */
export const VALID_FDI_TEETH = new Set([
	11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33,
	34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 51, 52, 53, 54, 55, 61,
	62, 63, 64, 65, 71, 72, 73, 74, 75, 81, 82, 83, 84, 85,
]);

export function validateFdiToothNumber(tooth: unknown): boolean {
	if (tooth === undefined || tooth === null || tooth === "") return false;
	const num =
		typeof tooth === "number"
			? tooth
			: Number.parseInt(String(tooth).trim(), 10);
	if (Number.isNaN(num)) return false;
	return VALID_FDI_TEETH.has(num);
}

/**
 * Validates ICD-10 Diagnosis Code format (e.g. K02.1, K04.0, Z01.2).
 */
export function validateIcd10Code(code: string | null | undefined): boolean {
	if (!code || typeof code !== "string") return false;
	return /^[A-Z][0-9]{2}(\.[0-9]{1,3})?$/i.test(code.trim());
}

/**
 * Validates Order 804n Medical Service Nomenclature Code (e.g. A16.07.002.001, B01.065.001).
 */
export function validateOrder804nCode(
	code: string | null | undefined,
): boolean {
	if (!code || typeof code !== "string") return false;
	return /^[AB][0-9]{2}\.[0-9]{2,3}\.[0-9]{2,3}(\.[0-9]{2,3})?$/i.test(
		code.trim(),
	);
}

/**
 * Full pre-flight semantic and structural validator for CDA R2 document parameters.
 */
export function validateCdaParams(params: unknown): CdaValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const issues: CdaValidationIssue[] = [];

	if (!params || typeof params !== "object") {
		errors.push("Параметры документа должны быть непустым объектом.");
		issues.push({
			path: "root",
			field: "params",
			message: "Параметры отсутствуют",
			severity: "error",
		});
		return { valid: false, errors, warnings, issues };
	}

	const docParams = params as Partial<CdaDocumentParams>;
	const docKind = docParams.docKind || "101";

	let parsedResult:
		| ReturnType<typeof cdaSemd101Schema.safeParse>
		| ReturnType<typeof cdaSemd104Schema.safeParse>
		| ReturnType<typeof cdaSemd130Schema.safeParse>
		| ReturnType<typeof cdaSemd043_1uSchema.safeParse>;

	if (docKind === "104") {
		parsedResult = cdaSemd104Schema.safeParse(params);
	} else if (docKind === "130") {
		parsedResult = cdaSemd130Schema.safeParse(params);
	} else if (docKind === "043-1u" || docKind === "0431u" || docKind === "109") {
		parsedResult = cdaSemd043_1uSchema.safeParse(params);
	} else {
		parsedResult = cdaSemd101Schema.safeParse(params);
	}

	if (!parsedResult.success) {
		for (const issue of parsedResult.error.issues) {
			const pathStr = issue.path.join(".");
			const msg = `Поле "${pathStr}": ${issue.message}`;
			errors.push(msg);
			issues.push({
				path: pathStr,
				field: issue.path[issue.path.length - 1]?.toString() || "field",
				message: issue.message,
				severity: "error",
			});
		}
		return { valid: false, errors, warnings, issues };
	}

	const data = parsedResult.data;

	// ─── 1. Валидация данных пациента (Patient Checks) ────────────────────────
	if (!data.patient.name.last || !data.patient.name.first) {
		errors.push("Пациент: Фамилия и имя обязательны для идентификации в ЕГИСЗ");
		issues.push({
			path: "patient.name",
			field: "name",
			message: "ФИО пациента не заполнено",
			severity: "error",
		});
	}

	const hasSnils = Boolean(
		data.patient.snils && data.patient.snils.trim().length > 0,
	);
	const isForeign = Boolean(
		data.patient.isForeignCitizen ||
			data.patient.identityDoc?.typeCode === "10",
	);

	if (hasSnils) {
		if (!isValidSnils(data.patient.snils)) {
			errors.push(
				`Пациент: СНИЛС "${data.patient.snils}" имеет неверную контрольную сумму (алгоритм ПФР № 192п)`,
			);
			issues.push({
				path: "patient.snils",
				field: "snils",
				message: `Неверная контрольная сумма СНИЛС "${data.patient.snils}"`,
				severity: "error",
				oid: EGISZ_OIDS.SNILS,
			});
		}
	} else if (isForeign) {
		// Fallback for foreign citizen: requires passport / identityDoc
		if (!data.patient.identityDoc || !data.patient.identityDoc.number) {
			errors.push(
				"Пациент-иностранец: При отсутствии СНИЛС обязательно указание документа, удостоверяющего личность (паспорт иностранного гражданина)",
			);
			issues.push({
				path: "patient.identityDoc",
				field: "identityDoc",
				message: "Отсутствует документ иностранного гражданина",
				severity: "error",
				oid: EGISZ_OIDS.IDENTITY_DOC_TYPE,
			});
		} else {
			warnings.push(
				`Пациент идентифицирован как иностранный гражданин по документу ${data.patient.identityDoc.number}`,
			);
		}
	} else {
		errors.push(
			"Пациент: СНИЛС обязателен для граждан РФ при регистрации документов в РЭМД ЕГИСЗ",
		);
		issues.push({
			path: "patient.snils",
			field: "snils",
			message: "Отсутствует СНИЛС гражданина РФ",
			severity: "error",
			oid: EGISZ_OIDS.SNILS,
		});
	}

	if (!data.patient.birthDate) {
		errors.push("Пациент: Дата рождения обязательна");
		issues.push({
			path: "patient.birthDate",
			field: "birthDate",
			message: "Дата рождения отсутствует",
			severity: "error",
		});
	}

	// ─── 2. Валидация данных врача (Doctor Checks) ────────────────────────────
	if (!data.doctor.name.last || !data.doctor.name.first) {
		errors.push("Врач: Фамилия и имя обязательны");
		issues.push({
			path: "doctor.name",
			field: "name",
			message: "ФИО врача не заполнено",
			severity: "error",
		});
	}

	if (data.doctor.snils) {
		if (!isValidSnils(data.doctor.snils)) {
			errors.push(
				`Врач: СНИЛС врача "${data.doctor.snils}" недействителен (ошибка контрольной суммы)`,
			);
			issues.push({
				path: "doctor.snils",
				field: "snils",
				message: `Неверный СНИЛС врача "${data.doctor.snils}"`,
				severity: "error",
				oid: EGISZ_OIDS.SNILS,
			});
		}
	} else {
		errors.push(
			"Врач: СНИЛС врача обязателен для проверки прав в ФРМР Минздрава РФ",
		);
		issues.push({
			path: "doctor.snils",
			field: "snils",
			message: "Отсутствует СНИЛС врача",
			severity: "error",
			oid: EGISZ_OIDS.SNILS,
		});
	}

	// ─── 3. Валидация клиники (Clinic Checks) ─────────────────────────────────
	if (!data.clinic.name.trim()) {
		errors.push("Клиника: Наименование медицинской организации обязательно");
		issues.push({
			path: "clinic.name",
			field: "name",
			message: "Наименование клиники пусто",
			severity: "error",
		});
	}

	if (data.clinic.oid && !validateFrmoOid(data.clinic.oid)) {
		warnings.push(
			`Клиника: OID "${data.clinic.oid}" не соответствует формату ФРМО (1.2.643.5.1.13.13.12.2.*)`,
		);
		issues.push({
			path: "clinic.oid",
			field: "oid",
			message: `OID "${data.clinic.oid}" имеет нестандартный формат`,
			severity: "warning",
			oid: EGISZ_OIDS.FRMO_MO_ROOT,
		});
	}

	if (data.clinic.ogrn && !validateOgrn(data.clinic.ogrn)) {
		warnings.push(
			`Клиника: ОГРН "${data.clinic.ogrn}" имеет неверную длину или контрольное число`,
		);
		issues.push({
			path: "clinic.ogrn",
			field: "ogrn",
			message: "Неверный ОГРН",
			severity: "warning",
			oid: EGISZ_OIDS.OGRN_LEGAL,
		});
	}

	if (data.clinic.inn && !validateInn(data.clinic.inn)) {
		warnings.push(
			`Клиника: ИНН "${data.clinic.inn}" имеет неверную контрольную сумму`,
		);
		issues.push({
			path: "clinic.inn",
			field: "inn",
			message: "Неверный ИНН",
			severity: "warning",
			oid: EGISZ_OIDS.INN,
		});
	}

	// ─── 4. Специфические проверки по видам СЭМД ─────────────────────────────
	if (
		data.docKind === "101" ||
		data.docKind === "103" ||
		data.docKind === "043u" ||
		data.docKind === "108"
	) {
		const d101 = data as CdaSemd101Params;
		for (const diag of d101.diagnoses) {
			if (!validateIcd10Code(diag.icd10Code)) {
				errors.push(`Диагноз: Некорректный код МКБ-10 "${diag.icd10Code}"`);
				issues.push({
					path: "diagnoses.icd10Code",
					field: "icd10Code",
					message: `Некорректный МКБ-10 "${diag.icd10Code}"`,
					severity: "error",
					oid: EGISZ_OIDS.ICD10,
				});
			}
			if (diag.tooth && !validateFdiToothNumber(diag.tooth)) {
				warnings.push(
					`Диагноз: Номер зуба "${diag.tooth}" не соответствует стандарту FDI ISO 3950`,
				);
			}
		}

		if (d101.dentalStatus) {
			for (const st of d101.dentalStatus) {
				if (!validateFdiToothNumber(st.tooth)) {
					errors.push(
						`Зубная формула: Недопустимый номер зуба FDI "${st.tooth}"`,
					);
					issues.push({
						path: "dentalStatus.tooth",
						field: "tooth",
						message: `Недопустимый зуб "${st.tooth}"`,
						severity: "error",
						oid: EGISZ_OIDS.DENTAL_TOOTH,
					});
				}
			}
		}

		if (d101.services) {
			for (const s of d101.services) {
				if (!validateOrder804nCode(s.code)) {
					warnings.push(
						`Услуги: Код услуги "${s.code}" не соответствует Номенклатуре 804н`,
					);
				}
			}
		}
	} else if (data.docKind === "104") {
		const d104 = data as CdaSemd104Params;
		for (const diag of d104.dischargeDiagnoses) {
			if (!validateIcd10Code(diag.icd10Code)) {
				errors.push(
					`Выписной диагноз: Некорректный код МКБ-10 "${diag.icd10Code}"`,
				);
				issues.push({
					path: "dischargeDiagnoses.icd10Code",
					field: "icd10Code",
					message: `Некорректный МКБ-10 "${diag.icd10Code}"`,
					severity: "error",
					oid: EGISZ_OIDS.ICD10,
				});
			}
		}
	} else if (data.docKind === "130") {
		const d130 = data as CdaSemd130Params;
		if (d130.taxpayer.snils && !isValidSnils(d130.taxpayer.snils)) {
			warnings.push(
				`Налогоплательщик: СНИЛС "${d130.taxpayer.snils}" имеет неверную контрольную сумму`,
			);
		}
		if (d130.taxpayer.inn && !validateInn(d130.taxpayer.inn)) {
			warnings.push(
				`Налогоплательщик: ИНН "${d130.taxpayer.inn}" имеет неверную контрольную сумму`,
			);
		}

		const calcTotal =
			d130.totalOrdinaryTreatmentKopecks + d130.totalExpensiveTreatmentKopecks;
		if (calcTotal !== d130.totalSumKopecks) {
			errors.push(
				`Справка 130: Не сходится сумма в копейках: обычные (${d130.totalOrdinaryTreatmentKopecks}) + дорогостоящие (${d130.totalExpensiveTreatmentKopecks}) != общая сумма (${d130.totalSumKopecks})`,
			);
			issues.push({
				path: "totalSumKopecks",
				field: "totalSumKopecks",
				message: "Не сходится итоговая сумма в копейках",
				severity: "error",
			});
		}
	} else if (
		data.docKind === "043-1u" ||
		data.docKind === "0431u" ||
		data.docKind === "109"
	) {
		const d043 = data as CdaSemd043_1uParams;
		if (!d043.orthodonticDiagnosis.trim()) {
			errors.push(
				"Ортодонтия 043-1/у: Клинический ортодонтический диагноз обязателен",
			);
			issues.push({
				path: "orthodonticDiagnosis",
				field: "orthodonticDiagnosis",
				message: "Диагноз не указан",
				severity: "error",
			});
		}

		const icdToCheck = d043.icd10Code || "K07.2";
		if (!validateIcd10Code(icdToCheck)) {
			errors.push(
				`Ортодонтия 043-1/у: Некорректный код МКБ-10 "${icdToCheck}"`,
			);
			issues.push({
				path: "icd10Code",
				field: "icd10Code",
				message: `Некорректный МКБ-10 "${icdToCheck}"`,
				severity: "error",
				oid: EGISZ_OIDS.ICD10,
			});
		}

		if (d043.dentalStatus) {
			for (const st of d043.dentalStatus) {
				if (!validateFdiToothNumber(st.tooth)) {
					errors.push(
						`Зубная формула: Недопустимый номер зуба FDI "${st.tooth}"`,
					);
					issues.push({
						path: "dentalStatus.tooth",
						field: "tooth",
						message: `Недопустимый зуб "${st.tooth}"`,
						severity: "error",
						oid: EGISZ_OIDS.DENTAL_TOOTH,
					});
				}
			}
		}

		if (d043.services) {
			for (const s of d043.services) {
				if (!validateOrder804nCode(s.code)) {
					warnings.push(
						`Услуги: Код услуги "${s.code}" не соответствует Номенклатуре 804н`,
					);
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		issues,
	};
}

/**
 * Validates detached digital signature structure (ГОСТ Р 34.10-2012 / CAdES-BES).
 */
export function validateDetachedSignature(sig: unknown): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];
	const parseRes = detachedSignatureSchema.safeParse(sig);
	if (!parseRes.success) {
		for (const issue of parseRes.error.issues) {
			errors.push(`УКЭП: ${issue.path.join(".")} — ${issue.message}`);
		}
		return { valid: false, errors };
	}

	const data = parseRes.data;
	if (!data.signatureBase64 || data.signatureBase64.length < 32) {
		errors.push("УКЭП: Данные подписи Base64 повреждены или слишком малы");
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Validates UKEP Certificate attributes (validity timeframe, issuer, subject CN, SNILS and OGRN matching).
 */
export function validateUkepCertificate(params: {
	certificate: {
		validFrom?: string | undefined;
		validTo?: string | undefined;
		subject: string;
		issuer?: string | undefined;
		serialNumber?: string | undefined;
	};
	expectedDoctorSnils?: string | undefined;
	expectedClinicOgrn?: string | undefined;
	expectedClinicInn?: string | undefined;
	checkDate?: Date | undefined;
}): CertificateValidationDetails {
	const errors: string[] = [];
	const warnings: string[] = [];
	const cert = params.certificate;
	const checkTime = params.checkDate ?? new Date();

	// 1. Срок действия
	let notExpired = true;
	if (cert.validFrom) {
		const fromDate = new Date(cert.validFrom);
		if (!Number.isNaN(fromDate.getTime()) && checkTime < fromDate) {
			notExpired = false;
			errors.push(
				`Сертификат еще не вступил в силу (действителен с ${fromDate.toLocaleDateString("ru-RU")})`,
			);
		}
	}
	if (cert.validTo) {
		const toDate = new Date(cert.validTo);
		if (!Number.isNaN(toDate.getTime()) && checkTime > toDate) {
			notExpired = false;
			errors.push(
				`Срок действия сертификата истек ${toDate.toLocaleDateString("ru-RU")}`,
			);
		}
	}

	// 2. Издатель (Удостоверяющий Центр)
	const issuerValid = Boolean(cert.issuer && cert.issuer.trim().length > 0);
	if (!issuerValid) {
		warnings.push("Издатель сертификата (УЦ) не указан в атрибутах подписи");
	}

	// 3. Субъект
	const subjectMatched = Boolean(
		cert.subject && cert.subject.trim().length > 0,
	);
	if (!subjectMatched) {
		errors.push("Владелец сертификата (Subject) пуст");
	}

	// 4. Сверка СНИЛС врача
	let snilsMatched: boolean | undefined;
	if (params.expectedDoctorSnils && cert.subject) {
		const normalizedExpected = normalizeSnils(params.expectedDoctorSnils);
		const snilsMatch = cert.subject.match(
			/SNILS(?:=|\s+)(\d{3}-?\d{3}-?\d{3}\s?\d{2}|\d{11})/i,
		);
		if (snilsMatch && snilsMatch[1]) {
			const certSnils = normalizeSnils(snilsMatch[1]);
			snilsMatched = certSnils === normalizedExpected;
			if (!snilsMatched) {
				errors.push(
					`СНИЛС в сертификате УКЭП (${certSnils}) не совпадает со СНИЛС врача в документе (${normalizedExpected})`,
				);
			}
		} else {
			warnings.push("Атрибут SNILS не найден в строке владельца сертификата");
		}
	}

	// 5. Сверка ОГРН / ИНН клиники
	let ogrnMatched: boolean | undefined;
	if (params.expectedClinicOgrn && cert.subject) {
		const ogrnMatch = cert.subject.match(/OGRN(?:=|\s+)(\d{13}|\d{15})/i);
		if (ogrnMatch && ogrnMatch[1]) {
			ogrnMatched = ogrnMatch[1].trim() === params.expectedClinicOgrn.trim();
			if (!ogrnMatched) {
				warnings.push(
					`ОГРН в сертификате (${ogrnMatch[1]}) отличается от ОГРН клиники (${params.expectedClinicOgrn})`,
				);
			}
		}
	}

	return {
		valid: errors.length === 0,
		notExpired,
		issuerValid,
		subjectMatched,
		snilsMatched,
		ogrnMatched,
		errors,
		warnings,
	};
}

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
				warnings.push(
					"В секции автора <author> отсутствует валидный СНИЛС врача (OID 1.2.643.100.3)",
				);
				issues.push({
					path: "ClinicalDocument.author.assignedAuthor.id",
					field: "snils",
					message: "Некорректный или отсутствующий СНИЛС врача",
					severity: "warning",
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
