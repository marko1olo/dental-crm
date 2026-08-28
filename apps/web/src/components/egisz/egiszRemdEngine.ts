/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION ENGINE — DENTE DENTAL CRM
 * Russian Ministry of Health (ЕГИСЗ РЭМД / Форма 043/у) & Federal Tax Service (ФНС)
 * Compliant with HL7 CDA R2, Order 804n, Order ED-7-11/755@, and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	ALL_FDI_TEETH,
	COMMON_804N_DENTAL_SERVICES,
	COMMON_DENTAL_ICD10,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	SAMPLE_043U_PATIENT_PRESET,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "./remdXml/egiszRemdPresets";

import {
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszProcedureItem,
	type FnsTaxCertificatePayload,
	type FnsTaxPaymentItem,
	type GostSignatureInfo,
	type XmlStructureValidationResult,
	canonicalizeCdaXml,
	escapeXml,
	formatHl7DateTime,
	formatKopecksToRubles,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificateXml,
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	validateXmlStructure,
} from "./cdaR2XmlBuilder";

// Re-export core modules for transparent ergonomics
export {
	ALL_FDI_TEETH,
	COMMON_804N_DENTAL_SERVICES,
	COMMON_DENTAL_ICD10,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	SAMPLE_043U_PATIENT_PRESET,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
};

export {
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszProcedureItem,
	type FnsTaxCertificatePayload,
	type FnsTaxPaymentItem,
	type GostSignatureInfo,
	type XmlStructureValidationResult,
	canonicalizeCdaXml,
	escapeXml,
	formatHl7DateTime,
	formatKopecksToRubles,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateFnsTaxCertificateXml,
	generateGostSignatureStampHtml,
	generateGostSignatureStampSvg,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	validateXmlStructure,
};

// Aliases for backwards compatibility with legacy 043u exports
export type Egisz043uPayload = EgiszDentalCdaPayload;
export const generateEgisz043uCdaXml = generateEgiszDentalCdaXml;

/* ═══════════════════════════════════════════════════════════════════════════
 * PREFLIGHT VALIDATION ENGINE (МИНЗДРАВ ЕГИСЗ РЭМД 043/У & ФНС КНД 1151156)
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface EgiszPreflightCheckResult {
	id: string;
	category: "clinic" | "doctor" | "patient" | "clinical" | "signature" | "taxpayer" | "finance";
	title: string;
	status: "passed" | "failed" | "warning";
	details: string;
	oid?: string | undefined;
}

export interface EgiszPreflightReport {
	isValid: boolean;
	canSendToRemd: boolean;
	totalChecks: number;
	passedCount: number;
	failedCount: number;
	warningCount: number;
	scorePercent: number;
	checks: EgiszPreflightCheckResult[];
}

export interface FnsTaxPreflightReport {
	isValid: boolean;
	totalChecks: number;
	passedCount: number;
	failedCount: number;
	warningCount: number;
	scorePercent: number;
	checks: EgiszPreflightCheckResult[];
}

/**
 * Validates Dental SEMD payload (043/u / 105 / 302 / 303) against statutory Ministry of Health requirements.
 */
export function runEgisz043uPreflight(payload: EgiszDentalCdaPayload): EgiszPreflightReport {
	const checks: EgiszPreflightCheckResult[] = [];

	// 1. Clinic OID (ФРМО)
	const oidValid = validateOidFormat(payload.clinic.clinicOid);
	if (!payload.clinic.clinicOid) {
		checks.push({
			id: "mo_oid_missing",
			category: "clinic",
			title: "OID медицинской организации в ФРМО",
			status: "failed",
			details: "Отсутствует OID клиники. Регистрация в РЭМД невозможна без OID ФРМО (1.2.643.5.1.13.13.12.2...)",
			oid: EGISZ_REMD_OIDS.FRMO_MO_ROOT,
		});
	} else if (!oidValid) {
		checks.push({
			id: "mo_oid_invalid",
			category: "clinic",
			title: "Формат OID медицинской организации",
			status: "failed",
			details: `Некорректный синтаксис OID клиники: "${payload.clinic.clinicOid}". Ожидается точечная нотация (например 1.2.643.5.1.13.13.12.2.77.10425)`,
			oid: EGISZ_REMD_OIDS.FRMO_MO_ROOT,
		});
	} else {
		checks.push({
			id: "mo_oid_ok",
			category: "clinic",
			title: "OID медицинской организации (ФРМО)",
			status: "passed",
			details: `OID корректен: ${payload.clinic.clinicOid}`,
			oid: EGISZ_REMD_OIDS.FRMO_MO_ROOT,
		});
	}

	// 2. Clinic OGRN & INN
	const ogrnOk = validateRussianOgrn(payload.clinic.clinicOgrn || "");
	if (ogrnOk) {
		checks.push({
			id: "mo_ogrn_ok",
			category: "clinic",
			title: "ОГРН юридического лица / ИП",
			status: "passed",
			details: `ОГРН проверен по контрольной сумме: ${payload.clinic.clinicOgrn}`,
			oid: EGISZ_REMD_OIDS.OGRN_LEGAL,
		});
	} else {
		checks.push({
			id: "mo_ogrn_invalid",
			category: "clinic",
			title: "ОГРН организации / ИП",
			status: "failed",
			details: `Недействительный ОГРН: "${payload.clinic.clinicOgrn}". Требуется 13 или 15 цифр с корректной контрольной суммой`,
			oid: EGISZ_REMD_OIDS.OGRN_LEGAL,
		});
	}

	const innOk = validateRussianInn(payload.clinic.clinicInn || "");
	if (innOk) {
		checks.push({
			id: "mo_inn_ok",
			category: "clinic",
			title: "ИНН организации",
			status: "passed",
			details: `ИНН проверен: ${payload.clinic.clinicInn}`,
			oid: EGISZ_REMD_OIDS.INN,
		});
	} else {
		checks.push({
			id: "mo_inn_invalid",
			category: "clinic",
			title: "ИНН организации",
			status: "warning",
			details: `Проверьте ИНН: "${payload.clinic.clinicInn}"`,
			oid: EGISZ_REMD_OIDS.INN,
		});
	}

	// 3. Doctor SNILS & FRMR Position
	const docSnilsRes = validateRussianSnils(payload.doctor.doctorSnils || "");
	if (docSnilsRes.isValid) {
		checks.push({
			id: "doc_snils_ok",
			category: "doctor",
			title: "СНИЛС лечащего врача (ФРМР)",
			status: "passed",
			details: `СНИЛС врача верифицирован: ${docSnilsRes.formatted}`,
			oid: EGISZ_REMD_OIDS.SNILS,
		});
	} else {
		checks.push({
			id: "doc_snils_invalid",
			category: "doctor",
			title: "СНИЛС лечащего врача",
			status: "failed",
			details: `Ошибка СНИЛС врача: ${docSnilsRes.error || "Неверный СНИЛС"}. Без СНИЛС врача ЕГИСЗ отклоняет СЭМД`,
			oid: EGISZ_REMD_OIDS.SNILS,
		});
	}

	const isKnownPosition = FRMR_DOCTOR_POSITIONS.some(
		(p) => p.code === payload.doctor.doctorPositionCode
	);
	if (isKnownPosition || payload.doctor.doctorPosition) {
		checks.push({
			id: "doc_pos_ok",
			category: "doctor",
			title: "Должность медработника по номенклатуре Минздрава",
			status: "passed",
			details: `Должность: ${payload.doctor.doctorPosition} (Код: ${payload.doctor.doctorPositionCode || "71"})`,
			oid: EGISZ_REMD_OIDS.MEDICAL_POSITIONS,
		});
	} else {
		checks.push({
			id: "doc_pos_warn",
			category: "doctor",
			title: "Должность врача в справочнике 1.2.643.5.1.13.13.11.1002",
			status: "warning",
			details: "Код должности не найден в стандартном классификаторе ФРМР",
			oid: EGISZ_REMD_OIDS.MEDICAL_POSITIONS,
		});
	}

	// 4. Patient Identifiers (SNILS, OMS, Passport, Card Number)
	if (payload.patient.patientSnils) {
		const patSnilsRes = validateRussianSnils(payload.patient.patientSnils);
		if (patSnilsRes.isValid) {
			checks.push({
				id: "pat_snils_ok",
				category: "patient",
				title: "СНИЛС пациента",
				status: "passed",
				details: `СНИЛС пациента проверен: ${patSnilsRes.formatted}`,
				oid: EGISZ_REMD_OIDS.SNILS,
			});
		} else {
			checks.push({
				id: "pat_snils_warn",
				category: "patient",
				title: "СНИЛС пациента (Контрольная сумма)",
				status: "warning",
				details: `СНИЛС пациента указан с предупреждением: ${patSnilsRes.error}`,
				oid: EGISZ_REMD_OIDS.SNILS,
			});
		}
	} else if (payload.patient.patientPolisOms || payload.patient.patientPassport) {
		checks.push({
			id: "pat_ident_alt",
			category: "patient",
			title: "Идентификатор пациента (ОМС / Паспорт)",
			status: "passed",
			details: `Используется альтернативный документ: ${payload.patient.patientPolisOms ? `Полис ОМС ${payload.patient.patientPolisOms}` : `Паспорт ${payload.patient.patientPassport}`}`,
			oid: EGISZ_REMD_OIDS.POLIS_OMS,
		});
	} else {
		checks.push({
			id: "pat_ident_missing",
			category: "patient",
			title: "Удостоверение личности пациента",
			status: "failed",
			details: "Не указан ни СНИЛС, ни полис ОМС, ни паспорт пациента. Заполнение обязательно для идентификации в ЕГИСЗ",
			oid: EGISZ_REMD_OIDS.IDENTITY_DOC_TYPE,
		});
	}

	if (!payload.patient.cardNumber) {
		checks.push({
			id: "pat_card_missing",
			category: "patient",
			title: "Номер амбулаторной карты 043/у",
			status: "warning",
			details: "Номер медицинской карты стоматологического пациента не заполнен",
		});
	} else {
		checks.push({
			id: "pat_card_ok",
			category: "patient",
			title: "Номер амбулаторной карты 043/у",
			status: "passed",
			details: `Карта: ${payload.patient.cardNumber}`,
		});
	}

	// 5. Clinical Diagnoses (ICD-10)
	const primaryDiag = payload.diagnoses.find((d) => d.isPrimary) || payload.diagnoses[0];
	if (!primaryDiag || !primaryDiag.icd10Code) {
		checks.push({
			id: "diag_missing",
			category: "clinical",
			title: "Клинический диагноз по МКБ-10",
			status: "failed",
			details: "Отсутствует основной диагноз по МКБ-10. Для СЭМД 043/у требуется минимум один диагноз",
			oid: EGISZ_REMD_OIDS.ICD10,
		});
	} else {
		checks.push({
			id: "diag_ok",
			category: "clinical",
			title: "Основной диагноз по МКБ-10",
			status: "passed",
			details: `${primaryDiag.icd10Code} — ${primaryDiag.icd10Name}${primaryDiag.tooth ? ` (зуб ${primaryDiag.tooth})` : ""}`,
			oid: EGISZ_REMD_OIDS.ICD10,
		});
	}

	// 6. Dental Tooth Formula (Odontogram)
	const toothCount = Object.keys(payload.toothStates || {}).length;
	if (toothCount === 0) {
		checks.push({
			id: "tooth_formula_empty",
			category: "clinical",
			title: "Зубная формула (FDI ISO 3950)",
			status: "warning",
			details: "Зубная формула пуста. Рекомендуется заполнить статус зубов пациента для протокола 043/у",
			oid: EGISZ_REMD_OIDS.DENTAL_TOOTH,
		});
	} else {
		const nonHealthyCount = Object.values(payload.toothStates).filter(
			(st) => st !== "Healthy" && st !== "0"
		).length;
		checks.push({
			id: "tooth_formula_ok",
			category: "clinical",
			title: "Зубная формула и статус полости рта",
			status: "passed",
			details: `Заполнено зубов: ${toothCount} (патологий / реставраций: ${nonHealthyCount})`,
			oid: EGISZ_REMD_OIDS.DENTAL_TOOTH,
		});
	}

	// 7. Medical Services & Procedures (804n)
	if (payload.docTypeCode === "303") {
		if (!payload.procedures || payload.procedures.length === 0) {
			checks.push({
				id: "proc_804n_empty",
				category: "clinical",
				title: "Медицинские услуги по Номенклатуре 804н",
				status: "failed",
				details: "Для протокола вмешательства (СЭМД 303) обязателен перечень выполненных услуг по Номенклатуре 804н",
				oid: EGISZ_REMD_OIDS.NOMENKLATURA_804N,
			});
		} else {
			checks.push({
				id: "proc_804n_ok",
				category: "clinical",
				title: "Услуги номенклатуры 804н",
				status: "passed",
				details: `Услуг оказано: ${payload.procedures.length} (${payload.procedures.map((p) => p.code).join(", ")})`,
				oid: EGISZ_REMD_OIDS.NOMENKLATURA_804N,
			});
		}
	}

	// 8. Electronic Signature (63-FZ / GOST)
	if (payload.doctorSignature && payload.doctorSignature.signatureBase64) {
		checks.push({
			id: "sig_doctor_ok",
			category: "signature",
			title: "УКЭП врача (ГОСТ Р 34.10-2012 / 63-ФЗ)",
			status: "passed",
			details: `Подписано сертификатом № ${payload.doctorSignature.certificateSerialNumber} (${payload.doctorSignature.certificateSubject})`,
			oid: payload.doctorSignature.algorithmOid || EGISZ_REMD_OIDS.GOST_3410_2012_256,
		});
	} else {
		checks.push({
			id: "sig_doctor_missing",
			category: "signature",
			title: "Электронная подпись врача (УКЭП)",
			status: "warning",
			details: "Документ готов к генерации XML, но для прямой отправки в РЭМД требуется наложение УКЭП врача",
			oid: EGISZ_REMD_OIDS.GOST_3410_2012_256,
		});
	}

	const failedCount = checks.filter((c) => c.status === "failed").length;
	const warningCount = checks.filter((c) => c.status === "warning").length;
	const passedCount = checks.filter((c) => c.status === "passed").length;
	const totalChecks = checks.length;
	const scorePercent = Math.round((passedCount / (totalChecks || 1)) * 100);

	return {
		isValid: failedCount === 0,
		canSendToRemd: failedCount === 0 && Boolean(payload.doctorSignature?.signatureBase64),
		totalChecks,
		passedCount,
		failedCount,
		warningCount,
		scorePercent,
		checks,
	};
}

/**
 * Validates FNS Tax Deduction Certificate (КНД 1151156) payload against Order ED-7-11/755@.
 */
export function runFnsTaxCertificatePreflight(payload: FnsTaxCertificatePayload): FnsTaxPreflightReport {
	const checks: EgiszPreflightCheckResult[] = [];

	// 1. Clinic Tax Identifiers (INN & OGRN)
	const innOk = validateRussianInn(payload.clinic.inn || "");
	if (innOk) {
		checks.push({
			id: "fns_mo_inn_ok",
			category: "clinic",
			title: "ИНН медицинской организации",
			status: "passed",
			details: `ИНН проверен: ${payload.clinic.inn}`,
		});
	} else {
		checks.push({
			id: "fns_mo_inn_invalid",
			category: "clinic",
			title: "ИНН медицинской организации",
			status: "failed",
			details: `Некорректный ИНН клиники: "${payload.clinic.inn}"`,
		});
	}

	const ogrnOk = validateRussianOgrn(payload.clinic.ogrn || "");
	if (ogrnOk) {
		checks.push({
			id: "fns_mo_ogrn_ok",
			category: "clinic",
			title: "ОГРН организации / ИП",
			status: "passed",
			details: `ОГРН проверен: ${payload.clinic.ogrn}`,
		});
	} else {
		checks.push({
			id: "fns_mo_ogrn_invalid",
			category: "clinic",
			title: "ОГРН организации / ИП",
			status: "failed",
			details: `Некорректный ОГРН клиники: "${payload.clinic.ogrn}"`,
		});
	}

	// 2. Taxpayer Identifiers (INN / SNILS)
	const tpHasInn = Boolean(payload.taxpayer.inn && validateRussianInn(payload.taxpayer.inn));
	const tpSnilsRes = payload.taxpayer.snils ? validateRussianSnils(payload.taxpayer.snils) : null;
	if (tpHasInn || (tpSnilsRes && tpSnilsRes.isValid)) {
		checks.push({
			id: "fns_tp_ident_ok",
			category: "taxpayer",
			title: "Идентификатор налогоплательщика (ИНН / СНИЛС)",
			status: "passed",
			details: tpHasInn
				? `ИНН налогоплательщика проверен: ${payload.taxpayer.inn}`
				: `СНИЛС налогоплательщика проверен: ${tpSnilsRes?.formatted}`,
		});
	} else {
		checks.push({
			id: "fns_tp_ident_missing",
			category: "taxpayer",
			title: "Идентификатор налогоплательщика",
			status: "failed",
			details: "Для налогового вычета обязателен валидный ИНН или СНИЛС налогоплательщика",
		});
	}

	// 3. Patient and Relationship Code
	const validRelCodes = ["1", "2", "3", "4"];
	if (validRelCodes.includes(payload.patient.relationshipCode)) {
		checks.push({
			id: "fns_rel_code_ok",
			category: "patient",
			title: "Степень родства пациента (Приказ ЕД-7-11/755@)",
			status: "passed",
			details: `Код родства: ${payload.patient.relationshipCode} (${payload.patient.relationshipName || (payload.patient.relationshipCode === "1" ? "Сам налогоплательщик" : "Родственник")})`,
		});
	} else {
		checks.push({
			id: "fns_rel_code_invalid",
			category: "patient",
			title: "Степень родства пациента",
			status: "failed",
			details: `Недопустимый код родства: "${payload.patient.relationshipCode}". Допустимы значения: 1 (сам), 2 (супруг), 3 (родитель), 4 (ребенок)`,
		});
	}

	// 4. Financial Calculations & Kopecks
	const payments = payload.payments || [];
	if (payments.length === 0) {
		checks.push({
			id: "fns_payments_empty",
			category: "finance",
			title: "Сведения о произведенных оплатах",
			status: "failed",
			details: "В справке отсутствуют записи об оплате медицинских услуг",
		});
	} else {
		const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
		if (totalKopecks <= 0) {
			checks.push({
				id: "fns_total_zero",
				category: "finance",
				title: "Итоговая сумма оплаты услуг",
				status: "failed",
				details: "Сумма оплат должна быть строго больше нуля",
			});
		} else {
			const formattedTotal = formatKopecksToRubles(totalKopecks);
			checks.push({
				id: "fns_total_ok",
				category: "finance",
				title: "Итоговая сумма оплат (целочисленные копейки)",
				status: "passed",
				details: `Итого к вычету: ${formattedTotal} руб. (${payments.length} платеж(ей))`,
			});
		}
	}

	// 5. Tax Year
	const currentYear = new Date().getFullYear();
	if (payload.taxYear && payload.taxYear >= 2020 && payload.taxYear <= currentYear) {
		checks.push({
			id: "fns_year_ok",
			category: "finance",
			title: "Налоговый период (год)",
			status: "passed",
			details: `Налоговый период: ${payload.taxYear} год`,
		});
	} else {
		checks.push({
			id: "fns_year_warn",
			category: "finance",
			title: "Налоговый период (год)",
			status: "warning",
			details: `Проверьте налоговый период: ${payload.taxYear}. Налоговый вычет оформляется за предшествующие 3 года`,
		});
	}

	// 6. Signer (Руководитель)
	if (!payload.signer.fullName) {
		checks.push({
			id: "fns_signer_missing",
			category: "signature",
			title: "Подписант справки",
			status: "failed",
			details: "Не указано ФИО руководителя или уполномоченного лица",
		});
	} else {
		checks.push({
			id: "fns_signer_ok",
			category: "signature",
			title: "Подписант справки",
			status: "passed",
			details: `Подписант: ${payload.signer.fullName} (${payload.signer.position || "Руководитель"})`,
		});
	}

	const failedCount = checks.filter((c) => c.status === "failed").length;
	const warningCount = checks.filter((c) => c.status === "warning").length;
	const passedCount = checks.filter((c) => c.status === "passed").length;
	const totalChecks = checks.length;
	const scorePercent = Math.round((passedCount / (totalChecks || 1)) * 100);

	return {
		isValid: failedCount === 0,
		totalChecks,
		passedCount,
		failedCount,
		warningCount,
		scorePercent,
		checks,
	};
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. MOCK SIGNATURE GENERATOR & HELPERS
 * ═══════════════════════════════════════════════════════════════════════════ */

export function createMockGostSignature(
	doctorName: string,
	doctorSnils: string,
	clinicName: string
): GostSignatureInfo {
	const now = new Date();
	const serialHex = Array.from({ length: 16 }, () =>
		Math.floor(Math.random() * 16).toString(16)
	).join("").toUpperCase();

	const mockBytes = `UKEP_GOST3410_2012_SIGNATURE_DOC_${doctorSnils}_${Date.now()}`;
	const signatureBase64 =
		typeof btoa === "function"
			? btoa(mockBytes)
			: Buffer.from(mockBytes).toString("base64");

	const validFrom = new Date(now.getFullYear() - 1, 0, 1).toISOString();
	const validTo = new Date(now.getFullYear() + 1, 11, 31).toISOString();

	return {
		signatureBase64,
		certificateSerialNumber: `00E4A28B${serialHex.slice(8)}`,
		certificateSubject: `CN=${doctorName}, SNILS=${doctorSnils}, O=${clinicName}, C=RU`,
		certificateIssuer:
			"CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU",
		validFrom,
		validTo,
		signedAt: now.toISOString(),
		algorithmOid: EGISZ_REMD_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: EGISZ_REMD_OIDS.GOST_3411_2012_256,
		signatureValueHex: Array.from({ length: 64 }, () =>
			Math.floor(Math.random() * 16).toString(16)
		).join("").toUpperCase(),
	};
}

export function createMockMoGostSignature(
	clinicName: string,
	clinicOgrn: string
): GostSignatureInfo {
	const now = new Date();
	const serialHex = Array.from({ length: 16 }, () =>
		Math.floor(Math.random() * 16).toString(16)
	).join("").toUpperCase();

	const mockBytes = `UKEP_MO_GOST3410_2012_SIGNATURE_ORG_${clinicOgrn}_${Date.now()}`;
	const signatureBase64 =
		typeof btoa === "function"
			? btoa(mockBytes)
			: Buffer.from(mockBytes).toString("base64");

	const validFrom = new Date(now.getFullYear() - 1, 0, 1).toISOString();
	const validTo = new Date(now.getFullYear() + 1, 11, 31).toISOString();

	return {
		signatureBase64,
		certificateSerialNumber: `00B17F9A${serialHex.slice(8)}`,
		certificateSubject: `O=${clinicName}, OGRN=${clinicOgrn}, C=RU`,
		certificateIssuer:
			"CN=УЦ ФНС России (Квалифицированный для юридических лиц), O=Федеральная налоговая служба, C=RU",
		validFrom,
		validTo,
		signedAt: now.toISOString(),
		algorithmOid: EGISZ_REMD_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: EGISZ_REMD_OIDS.GOST_3411_2012_256,
		signatureValueHex: Array.from({ length: 64 }, () =>
			Math.floor(Math.random() * 16).toString(16)
		).join("").toUpperCase(),
	};
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. FILE NAMING UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generateEgiszXmlFilename(payload: EgiszDentalCdaPayload): string {
	const docCode = payload.docTypeCode || "105";
	const cleanOid = (payload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2").replace(/[^\d.]/g, "_");
	const dateStr = formatHl7DateTime(payload.encounterDate || new Date(), false);
	const docId = (payload.patient.cardNumber || "DOC").replace(/[^\w-]/g, "_");
	return `SEMD_${docCode}_${cleanOid}_${dateStr}_${docId}.xml`;
}

export function generateFnsTaxXmlFilename(payload: FnsTaxCertificatePayload): string {
	const inn = (payload.clinic.inn || "0000000000").trim();
	const docDate = payload.documentDate instanceof Date ? payload.documentDate : new Date(payload.documentDate);
	const validDate = Number.isNaN(docDate.getTime()) ? new Date() : docDate;
	const dateStr = `${validDate.getFullYear()}${(validDate.getMonth() + 1).toString().padStart(2, "0")}${validDate.getDate().toString().padStart(2, "0")}`;
	const docNum = (payload.documentNumber || "1").replace(/[^\w-]/g, "_");
	return `UT_SPROPLMED_${inn}_${dateStr}_${docNum}.xml`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 4. PRINTABLE HTML TEMPLATES (043/У & ФНС КНД 1151156)
 * ═══════════════════════════════════════════════════════════════════════════ */

export function generateForm043uPrintHtml(payload: EgiszDentalCdaPayload): string {
	const docDef = EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode as EgiszDentalSemdCode] || {
		title: "Протокол консультации стоматолога (Форма 043/у)",
		nsiCode: "105",
	};
	const visitDateStr = formatRuDate(payload.encounterDate || new Date());
	const birthDateStr = formatRuDate(payload.patient.patientBirthDate);

	const renderTeethQuadrant = (teeth: readonly number[]) => {
		return teeth
			.map((t) => {
				const st = payload.toothStates[t] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", labelRu: st };
				const surfs = payload.toothSurfaces?.[t] || [];
				return `
					<div class="tooth-cell">
						<div class="tooth-num">${t}</div>
						<div class="tooth-sym ${st !== "Healthy" ? "abnormal" : ""}">${stObj.shortSymbol}</div>
						${surfs.length > 0 ? `<div class="tooth-surf">${surfs.join("")}</div>` : ""}
					</div>
				`;
			})
			.join("");
	};

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Медицинская карта ф. 043/у — ${escapeXml(payload.patient.patientFullName)}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 8px; }
		.doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
		.mo-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.mo-sub { font-size: 11px; color: #333; }
		.doc-title { font-size: 16px; font-weight: bold; margin-top: 8px; }
		.doc-semd { font-size: 11px; font-family: monospace; color: #555; }
		.field-row { margin-bottom: 6px; }
		.field-label { font-weight: bold; }
		.section-title { font-size: 14px; font-weight: bold; margin-top: 12px; margin-bottom: 6px; border-bottom: 1px solid #999; padding-bottom: 2px; }
		.formula-table { display: grid; grid-template-columns: repeat(16, 1fr); gap: 2px; text-align: center; margin: 8px 0; border: 1px solid #666; padding: 4px; }
		.tooth-cell { border: 1px solid #ccc; padding: 2px; min-height: 38px; }
		.tooth-num { font-size: 10px; color: #666; font-weight: bold; }
		.tooth-sym { font-size: 12px; font-weight: bold; }
		.tooth-sym.abnormal { color: #b91c1c; }
		.tooth-surf { font-size: 9px; color: #1e40af; }
		.services-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 12px; }
		.services-table th, .services-table td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
		.services-table th { background: #f0f0f0; }
		.signature-box { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #666; padding-top: 10px; }
	</style>
</head>
<body>
	<div class="doc-header">
		<div class="mo-title">${escapeXml(payload.clinic.clinicName)}</div>
		<div class="mo-sub">ОГРН: ${escapeXml(payload.clinic.clinicOgrn)} | ИНН: ${escapeXml(payload.clinic.clinicInn)} | OID: ${escapeXml(payload.clinic.clinicOid)}</div>
		<div class="mo-sub">${escapeXml(payload.clinic.clinicAddress)} | тел: ${escapeXml(payload.clinic.clinicPhone)}</div>
		<div class="doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/У)</div>
		<div class="doc-semd">СЭМД ЕГИСЗ РЭМД: ${escapeXml(docDef.title)} (Вид ${escapeXml(docDef.nsiCode)})</div>
	</div>

	<div class="field-row">
		<span class="field-label">Номер карты:</span> ${escapeXml(payload.patient.cardNumber || "б/н")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Дата приема:</span> ${visitDateStr}
	</div>

	<div class="field-row">
		<span class="field-label">Пациент (ФИО):</span> <strong>${escapeXml(payload.patient.patientFullName)}</strong> &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Дата рождения:</span> ${birthDateStr} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">СНИЛС:</span> ${escapeXml(payload.patient.patientSnils || "Не указан")}
	</div>

	<div class="field-row">
		<span class="field-label">Полис ОМС:</span> ${escapeXml(payload.patient.patientPolisOms || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Телефон:</span> ${escapeXml(payload.patient.patientPhone || "—")}
	</div>

	<div class="section-title">1. ЖАЛОБЫ И АНАМНЕЗ</div>
	<div class="field-row"><span class="field-label">Жалобы:</span> ${escapeXml(payload.complaints || "Не предъявляет.")}</div>
	<div class="field-row"><span class="field-label">Анамнез заболевания:</span> ${escapeXml(payload.anamnesisMorbi || "Без особенностей.")}</div>
	<div class="field-row"><span class="field-label">Анамнез жизни:</span> ${escapeXml(payload.anamnesisVitae || "Без соматических отягощений.")}</div>

	<div class="section-title">2. ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950)</div>
	<div class="formula-table">
		${renderTeethQuadrant(FDI_ADULT_TEETH.slice(0, 16))}
		${renderTeethQuadrant(FDI_ADULT_TEETH.slice(16, 32))}
	</div>

	<div class="section-title">3. КЛИНИЧЕСКИЙ ДИАГНОЗ ПО МКБ-10</div>
	<ul>
		${payload.diagnoses.map((d) => `<li><strong>${d.isPrimary ? "[Основной] " : "[Сопутствующий] "}</strong>${escapeXml(d.icd10Code)} — ${escapeXml(d.icd10Name)}${d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : ""}</li>`).join("")}
	</ul>

	<div class="section-title">4. ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ (НОМЕНКЛАТУРА 804Н)</div>
	<table class="services-table">
		<thead>
			<tr>
				<th style="width: 120px;">Код 804н</th>
				<th>Наименование услуги</th>
				<th style="width: 70px;">Зуб</th>
			</tr>
		</thead>
		<tbody>
			${payload.procedures.map((p) => `<tr><td>${escapeXml(p.code)}</td><td>${escapeXml(p.name)}</td><td>${escapeXml(p.tooth ? String(p.tooth) : "—")}</td></tr>`).join("")}
		</tbody>
	</table>

	<div class="section-title">5. НАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ</div>
	<div>${escapeXml(payload.recommendations || "Индивидуальная гигиена полости рта.")}</div>

	<div class="signature-box">
		<div>
			<div><strong>Лечащий врач:</strong> ${escapeXml(payload.doctor.doctorFullName)}</div>
			<div>${escapeXml(payload.doctor.doctorPosition)}</div>
			<div>СНИЛС: ${escapeXml(payload.doctor.doctorSnils)}</div>
		</div>

		${payload.doctorSignature ? generateGostSignatureStampHtml({
			signerName: payload.doctor.doctorFullName,
			certificateNumber: payload.doctorSignature.certificateSerialNumber,
			validFrom: payload.doctorSignature.validFrom || new Date().toISOString(),
			validTo: payload.doctorSignature.validTo || new Date().toISOString(),
			orgName: payload.clinic.clinicName,
		}) : `
		<div style="text-align: right;">
			<div>Подпись врача: ___________________ / ${escapeXml(payload.doctor.doctorFullName)}</div>
		</div>`}
	</div>
</body>
</html>`;
}

export function generateFnsTaxCertificatePrintHtml(payload: FnsTaxCertificatePayload): string {
	const docDateStr = formatRuDate(payload.documentDate);
	const payments = payload.payments || [];
	const totalKopecks = payments.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code1Kopecks = payments
		.filter((p) => p.serviceCode === "1")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);
	const code2Kopecks = payments
		.filter((p) => p.serviceCode === "2")
		.reduce((sum, p) => sum + Math.max(0, Math.round(p.amountKopecks || 0)), 0);

	const totalRublesStr = formatKopecksToRubles(totalKopecks);
	const code1RublesStr = formatKopecksToRubles(code1Kopecks);
	const code2RublesStr = formatKopecksToRubles(code2Kopecks);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<title>Справка об оплате медицинских услуг (КНД 1151156) — № ${escapeXml(payload.documentNumber)}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
		.form-code { text-align: right; font-size: 11px; font-weight: bold; margin-bottom: 8px; }
		.doc-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }
		.doc-title { font-size: 15px; font-weight: bold; text-transform: uppercase; }
		.doc-subtitle { font-size: 12px; margin-top: 4px; }
		.doc-meta { font-size: 13px; font-weight: bold; margin-top: 6px; }
		.section-header { font-size: 13px; font-weight: bold; background: #f0f0f0; padding: 4px 8px; border-left: 4px solid #000; margin-top: 12px; margin-bottom: 6px; }
		.field-row { margin-bottom: 5px; }
		.field-label { font-weight: bold; }
		.table-payments { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
		.table-payments th, .table-payments td { border: 1px solid #666; padding: 5px 8px; text-align: left; }
		.table-payments th { background: #f8f8f8; }
		.table-payments td.num { text-align: right; font-family: monospace; font-size: 12px; }
		.total-box { margin-top: 10px; padding: 8px; border: 1px solid #000; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between; }
		.signature-box { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #666; padding-top: 12px; }
	</style>
</head>
<body>
	<div class="form-code">
		Форма по КНД 1151156<br/>
		Приказ ФНС России от 08.11.2023 № ЕД-7-11/755@
	</div>

	<div class="doc-header">
		<div class="doc-title">СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ</div>
		<div class="doc-subtitle">для представления в налоговый орган Российской Федерации</div>
		<div class="doc-meta">№ ${escapeXml(payload.documentNumber)} от ${docDateStr} г.</div>
	</div>

	<div class="section-header">1. СВЕДЕНИЯ О МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ / ИП</div>
	<div class="field-row"><span class="field-label">Наименование:</span> ${escapeXml(payload.clinic.name)}</div>
	<div class="field-row">
		<span class="field-label">ИНН:</span> ${escapeXml(payload.clinic.inn)} &nbsp;&nbsp;|&nbsp;&nbsp;
		${payload.clinic.kpp ? `<span class="field-label">КПП:</span> ${escapeXml(payload.clinic.kpp)} &nbsp;&nbsp;|&nbsp;&nbsp;` : ""}
		<span class="field-label">ОГРН:</span> ${escapeXml(payload.clinic.ogrn)}
	</div>

	<div class="section-header">2. СВЕДЕНИЯ О НАЛОГОПЛАТЕЛЬЩИКЕ (ФЛ)</div>
	<div class="field-row"><span class="field-label">ФИО налогоплательщика:</span> <strong>${escapeXml(payload.taxpayer.fullName)}</strong></div>
	<div class="field-row">
		<span class="field-label">ИНН:</span> ${escapeXml(payload.taxpayer.inn || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">СНИЛС:</span> ${escapeXml(payload.taxpayer.snils || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Дата рождения:</span> ${formatRuDate(payload.taxpayer.birthDate) || "—"}
	</div>

	<div class="section-header">3. СВЕДЕНИЯ О ПАЦИЕНТЕ И СТЕПЕНИ РОДСТВА</div>
	<div class="field-row"><span class="field-label">ФИО пациента:</span> <strong>${escapeXml(payload.patient.fullName)}</strong></div>
	<div class="field-row">
		<span class="field-label">Степень родства:</span> Код ${escapeXml(payload.patient.relationshipCode)} (${escapeXml(payload.patient.relationshipName || (payload.patient.relationshipCode === "1" ? "Сам налогоплательщик" : "Родственник"))}) &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">СНИЛС пациента:</span> ${escapeXml(payload.patient.snils || "—")}
	</div>

	<div class="section-header">4. СВЕДЕНИЯ О ПРОИЗВЕДЕННЫХ ОПЛАТАХ ЗА ${payload.taxYear} ГОД</div>
	<table class="table-payments">
		<thead>
			<tr>
				<th style="width: 30px;">№</th>
				<th>Дата оплаты</th>
				<th>Код услуги</th>
				<th>Описание услуги</th>
				<th style="width: 110px; text-align: right;">Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			${payments.map((p, idx) => `
				<tr>
					<td>${idx + 1}</td>
					<td>${formatRuDate(p.date)}</td>
					<td>${p.serviceCode === "1" ? "1 (Стандартная мед. услуга)" : "2 (Дорогостоящее лечение)"}</td>
					<td>${escapeXml(p.serviceDescription || "Медицинские стоматологические услуги")}</td>
					<td class="num">${formatKopecksToRubles(p.amountKopecks)}</td>
				</tr>
			`).join("")}
		</tbody>
	</table>

	<div class="total-box">
		<div>
			<div>По коду 1 (Стандартные услуги): ${code1RublesStr} руб.</div>
			<div>По коду 2 (Дорогостоящее лечение): ${code2RublesStr} руб.</div>
		</div>
		<div style="font-size: 15px; align-self: center;">
			ИТОГО К ВЫЧЕТУ: ${totalRublesStr} руб.
		</div>
	</div>

	<div class="signature-box">
		<div>
			<div><strong>Руководитель МО / Уполномоченное лицо:</strong></div>
			<div style="margin-top: 4px;">${escapeXml(payload.signer.fullName)} (${escapeXml(payload.signer.position || "Руководитель")})</div>
			${payload.signer.snils ? `<div>СНИЛС: ${escapeXml(payload.signer.snils)}</div>` : ""}
		</div>

		${payload.doctorSignature ? generateGostSignatureStampHtml({
			signerName: payload.signer.fullName,
			certificateNumber: payload.doctorSignature.certificateSerialNumber,
			validFrom: payload.doctorSignature.validFrom || new Date().toISOString(),
			validTo: payload.doctorSignature.validTo || new Date().toISOString(),
			orgName: payload.clinic.name,
		}) : `
		<div style="text-align: right;">
			<div>Подпись: ___________________ / ${escapeXml(payload.signer.fullName)}</div>
			<div style="font-size: 10px; color: #555; margin-top: 4px;">М.П.</div>
		</div>`}
	</div>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * 5. SAMPLE PRESETS FOR UI HUBS AND TESTS
 * ═══════════════════════════════════════════════════════════════════════════ */

export const SAMPLE_DENTAL_SEMD_105_PRESET: EgiszDentalCdaPayload = {
	docTypeCode: "105",
	documentUuid: "DOC-105-2026-08419",
	documentVersion: 1,
	encounterDate: "2026-08-28T10:30:00+03:00",
	clinic: DEFAULT_EGISZ_CLINIC_PRESET,
	doctor: DEFAULT_EGISZ_DOCTOR_PRESET,
	patient: SAMPLE_043U_PATIENT_PRESET,
	complaints: "Жалобы на кратковременные боли от холодного и кислого в зубе 46, застревание волокнистой пищи.",
	anamnesisMorbi: "Появление болей отмечает около двух недель назад. Ранее зуб 46 не лечился.",
	anamnesisVitae: "Соматический анамнез не отягощен. Аллергия на медикаменты отрицается.",
	toothStates: {
		18: "Healthy",
		17: "Healthy",
		16: "Filling",
		15: "Healthy",
		14: "Healthy",
		13: "Healthy",
		12: "Healthy",
		11: "Healthy",
		21: "Healthy",
		22: "Healthy",
		23: "Healthy",
		24: "Healthy",
		25: "Healthy",
		26: "Crown",
		27: "Healthy",
		28: "Healthy",
		48: "Healthy",
		47: "Healthy",
		46: "Caries",
		45: "Healthy",
		44: "Healthy",
		43: "Healthy",
		42: "Healthy",
		41: "Healthy",
		31: "Healthy",
		32: "Healthy",
		33: "Healthy",
		34: "Healthy",
		35: "Healthy",
		36: "Filling",
		37: "Healthy",
		38: "Healthy",
	},
	toothSurfaces: {
		46: ["O", "D"],
		16: ["O"],
		36: ["O", "M"],
	},
	diagnoses: [
		{
			icd10Code: "K02.1",
			icd10Name: "Кариес дентина (глубокий кариес)",
			isPrimary: true,
			tooth: 46,
			surfaces: ["O", "D"],
			clinicalDescription: "Кариозная полость средней глубины на жевательно-дистальной поверхности зуба 46, зондирование болезненно по эмалево-дентинной границе.",
		},
	],
	procedures: [
		{
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			tooth: 46,
			quantity: 1,
		},
		{
			code: "A16.07.002.002",
			name: "Восстановление зуба пломбой II класс по Блэку с использованием светоотверждаемых композитов",
			tooth: 46,
			surfaces: ["O", "D"],
			quantity: 1,
		},
	],
	treatmentProtocolDescription: "Проведена инфильтрационная анестезия Sol. Ultracaini DS Forte 1.7 ml. Препарирование кариозной полости зуба 46, медикаментозная обработка 2% р-ром хлоргексидина. Наложение изолирующей прокладки, адгезивный протокол Single Bond Universal, послойная реставрация Filtek Ultimate (A3/A3.5), полировка Enhance + Prisma Gloss.",
	recommendations: "Соблюдение гигиены полости рта, щадящий режим жевания на зубе 46 в течение 2 часов. Контрольный осмотр через 6 месяцев.",
	nextVisitDate: "2027-02-28",
};

export const SAMPLE_FNS_TAX_1151156_PRESET: FnsTaxCertificatePayload = {
	documentNumber: "СПР-2026/0412",
	documentDate: "2026-08-28",
	taxYear: 2026,
	clinic: {
		name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
		inn: "7701234560",
		kpp: "770101001",
		ogrn: "1157746123457",
		phone: "+7 (495) 789-45-60",
		email: "buh@dente-clinic.ru",
	},
	taxpayer: {
		fullName: "Соколов Владимир Николаевич",
		inn: "772412345678",
		snils: "123-456-789 64",
		birthDate: "1985-04-12",
		docTypeCode: "21",
		docSeriesNumber: "4515 892341",
	},
	patient: {
		fullName: "Соколова Анна Владимировна",
		snils: "123-456-789 64",
		birthDate: "2010-06-14",
		relationshipCode: "4",
		relationshipName: "Ребенок / Подопечный",
	},
	payments: [
		{
			id: "PAY-01",
			date: "2026-03-15",
			serviceCode: "1",
			serviceDescription: "Терапевтическое лечение кариеса зуба 46 и профгигиена",
			amountKopecks: 1250000, // 12 500.00 руб.
		},
		{
			id: "PAY-02",
			date: "2026-06-20",
			serviceCode: "2",
			serviceDescription: "Ортодонтическое лечение и установка брекет-системы (дорогостоящее)",
			amountKopecks: 8500050, // 85 000.50 руб.
		},
	],
	signer: {
		fullName: "Смирнова Елена Викторовна",
		position: "Главный врач",
		snils: "123-456-789 64",
	},
};
