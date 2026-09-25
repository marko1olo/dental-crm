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


export * from "./cdaIdValidators.js";
export * from "./cdaXmlValidator.js";

import {
	validateOid,
	validateFrmoOid,
	validateOgrn,
	validateInn,
	VALID_FDI_TEETH,
	validateFdiToothNumber,
	validateIcd10Code,
	validateOrder804nCode,
	isValidSnils,
} from "./cdaIdValidators.js";

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
				errors.push(
					`Диагноз: Номер зуба "${diag.tooth}" не соответствует стандарту FDI ISO 3950 (разрешены 11..48, 51..85)`,
				);
				issues.push({
					path: "diagnoses.tooth",
					field: "tooth",
					message: `Недопустимый зуб "${diag.tooth}"`,
					severity: "error",
					oid: EGISZ_OIDS.DENTAL_TOOTH,
				});
			}
		}

		if (d101.dentalStatus) {
			for (const st of d101.dentalStatus) {
				if (!validateFdiToothNumber(st.tooth)) {
					errors.push(
						`Зубная формула: Недопустимый номер зуба FDI "${st.tooth}" (разрешены 11..48, 51..85)`,
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
					errors.push(
						`Услуги: Код услуги "${s.code}" не соответствует Номенклатуре медицинских услуг Приказа 804н (ожидается A16.07.xxx или B01.065.xxx)`,
					);
					issues.push({
						path: "services.code",
						field: "code",
						message: `Недопустимый код услуги "${s.code}"`,
						severity: "error",
						oid: EGISZ_OIDS.ORDER_804N,
					});
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
