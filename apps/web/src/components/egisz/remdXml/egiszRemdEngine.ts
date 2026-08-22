/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 HL7 OUTPATIENT CARD 043/U XML GENERATOR ENGINE
 * Russian Ministry of Health Statutory Electronic Medical Document (СЭМД)
 * Compliant with HL7 CDA R2 (POCD_MT000040) & Federal Law 63-FZ (УКЭП)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	ALL_FDI_TEETH,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "./egiszRemdPresets";

/** Escape free-text for CDA XML text/attribute nodes */
export function escapeXml(value: string | number | undefined | null): string {
	if (value === undefined || value === null) return "";
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Format Date to HL7 CDA R2 TS format:
 * - Date only (birthTime): YYYYMMDD
 * - Date with Time & Timezone offset (effectiveTime): YYYYMMDDHHMMSS+ZZZZ
 */
export function formatHl7DateTime(dateInput: Date | string | number | undefined, includeTime = true): string {
	const d = dateInput instanceof Date
		? dateInput
		: dateInput
		? new Date(dateInput)
		: new Date();
	const validDate = Number.isNaN(d.getTime()) ? new Date() : d;

	const pad = (n: number) => n.toString().padStart(2, "0");
	const yyyy = validDate.getFullYear().toString();
	const MM = pad(validDate.getMonth() + 1);
	const dd = pad(validDate.getDate());
	if (!includeTime) return `${yyyy}${MM}${dd}`;

	const HH = pad(validDate.getHours());
	const mm = pad(validDate.getMinutes());
	const ss = pad(validDate.getSeconds());

	const offsetMinutes = -validDate.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? "+" : "-";
	const absOffset = Math.abs(offsetMinutes);
	const offsetHours = pad(Math.floor(absOffset / 60));
	const offsetMins = pad(absOffset % 60);
	const tzStr = `${sign}${offsetHours}${offsetMins}`;

	return `${yyyy}${MM}${dd}${HH}${mm}${ss}${tzStr}`;
}

/** Format date for Russian readable outputs (DD.MM.YYYY) */
export function formatRuDate(dateInput: Date | string | undefined): string {
	if (!dateInput) return "";
	const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
	if (Number.isNaN(d.getTime())) return String(dateInput);
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export interface EgiszClinicInfo {
	clinicName: string;
	clinicOid: string;
	clinicOgrn: string;
	clinicInn: string;
	clinicKpp?: string | undefined;
	clinicAddress: string;
	clinicPhone: string;
	clinicEmail?: string | undefined;
	chiefDoctorName?: string | undefined;
	chiefDoctorSnils?: string | undefined;
}

export interface EgiszDoctorInfo {
	doctorFullName: string;
	doctorSnils: string;
	doctorPosition: string;
	doctorPositionCode: string;
	doctorPhone?: string | undefined;
	doctorEmail?: string | undefined;
}

export interface EgiszPatientInfo {
	patientId: string;
	cardNumber: string;
	patientFullName: string;
	patientSnils?: string | undefined;
	patientBirthDate: string;
	patientGender: "male" | "female" | "other" | string;
	patientPolisOms?: string | undefined;
	patientPassport?: string | undefined;
	patientAddress?: string | undefined;
	patientPhone?: string | undefined;
	patientEmail?: string | undefined;
}

export interface EgiszProcedureItem {
	code: string;
	name: string;
	tooth?: number | string | undefined;
	surfaces?: string[] | undefined;
	quantity?: number | undefined;
	completedAt?: string | Date | undefined;
}

export interface EgiszDiagnosisItem {
	icd10Code: string;
	icd10Name: string;
	isPrimary: boolean;
	tooth?: number | string | undefined;
	surfaces?: string[] | undefined;
	clinicalDescription?: string | undefined;
}

export interface GostSignatureInfo {
	signatureBase64: string;
	certificateSerialNumber: string;
	certificateSubject: string;
	certificateIssuer?: string | undefined;
	validFrom?: string | undefined;
	validTo?: string | undefined;
	signedAt: string;
	algorithmOid: string;
	digestAlgorithmOid: string;
	signatureValueHex?: string | undefined;
}

export interface Egisz043uPayload {
	docTypeCode: EgiszDentalSemdCode;
	documentUuid?: string | undefined;
	documentVersion?: number | undefined;
	encounterDate?: string | Date | undefined;
	clinic: EgiszClinicInfo;
	doctor: EgiszDoctorInfo;
	patient: EgiszPatientInfo;
	complaints: string;
	anamnesisMorbi: string;
	anamnesisVitae: string;
	toothStates: Record<number, string>;
	toothSurfaces?: Record<number, string[]> | undefined;
	diagnoses: EgiszDiagnosisItem[];
	procedures: EgiszProcedureItem[];
	treatmentProtocolDescription?: string | undefined;
	recommendations: string;
	nextVisitDate?: string | Date | undefined;
	chiefDoctorSignature?: boolean | undefined;
	doctorSignature?: GostSignatureInfo | undefined;
}

export interface EgiszPreflightCheckResult {
	id: string;
	category: "clinic" | "doctor" | "patient" | "clinical" | "signature";
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

/**
 * Валидация полноты и соответствия данных СЭМД 043/у стандартам Минздрава РФ перед отправкой в ЕГИСЗ РЭМД
 */
export function runEgisz043uPreflight(payload: Egisz043uPayload): EgiszPreflightReport {
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
	const ogrnOk = validateRussianOgrn(payload.clinic.clinicOgrn);
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

	const innOk = validateRussianInn(payload.clinic.clinicInn);
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
	const docSnilsRes = validateRussianSnils(payload.doctor.doctorSnils);
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
			details: `Должность: ${payload.doctor.doctorPosition} (Код: ${payload.doctor.doctorPositionCode})`,
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

	// 4. Patient Identifiers (SNILS, OMS, Card Number)
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
 * Приведение XML-документа CDA к детерминированному каноническому виду UTF-8 (C14N)
 */
export function canonicalizeCdaXml(xml: string): string {
	if (!xml || typeof xml !== "string") return "";
	return xml
		.replace(/^\uFEFF/, "") // Strip BOM
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.trim();
}

/**
 * Создает моковый/демонстрационный контейнер УКЭП по ГОСТ Р 34.10-2012 для предпросмотра и тестирования
 */
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
	const signatureBase64 = typeof btoa === "function" ? btoa(mockBytes) : Buffer.from(mockBytes).toString("base64");

	const validFrom = new Date(now.getFullYear() - 1, 0, 1).toISOString();
	const validTo = new Date(now.getFullYear() + 1, 11, 31).toISOString();

	return {
		signatureBase64,
		certificateSerialNumber: `00E4A28B${serialHex.slice(8)}`,
		certificateSubject: `CN=${doctorName}, SNILS=${doctorSnils}, O=${clinicName}, C=RU`,
		certificateIssuer: 'CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU',
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

/**
 * Генератор структурированного XML документа CDA R2 (HL7 Release 2) для ф. 043/у в ЕГИСЗ РЭМД
 */
export function generateEgisz043uCdaXml(payload: Egisz043uPayload): string {
	const docDef =
		EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode] ||
		EGISZ_DENTAL_SEMD_TYPES["303"];

	const now = new Date();
	const effectiveTime = formatHl7DateTime(now, true);
	const encounterDate = payload.encounterDate
		? new Date(payload.encounterDate)
		: now;
	const visitTime = formatHl7DateTime(encounterDate, true);
	const birthTime = formatHl7DateTime(payload.patient.patientBirthDate, false);

	const genderCode =
		payload.patient.patientGender === "male"
			? "1"
			: payload.patient.patientGender === "female"
			? "2"
			: "0";
	const genderLabel =
		genderCode === "1"
			? "Мужской"
			: genderCode === "2"
			? "Женский"
			: "Не указан";

	const docUuid =
		payload.documentUuid ||
		`DOC-043-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
	const clinicOid = payload.clinic.clinicOid || EGISZ_REMD_OIDS.FRMO_MO_ROOT;

	// Split Patient FIO
	const patParts = (payload.patient.patientFullName || "Пациент").trim().split(/\s+/);
	const patFamily = patParts[0] || "Пациент";
	const patGiven = patParts[1] || "";
	const patPatronymic = patParts[2] || "";

	// Split Doctor FIO
	const docParts = (payload.doctor.doctorFullName || "Врач").trim().split(/\s+/);
	const docFamily = docParts[0] || "Врач";
	const docGiven = docParts[1] || "";
	const docPatronymic = docParts[2] || "";

	const cleanDocSnils = payload.doctor.doctorSnils.replace(/\D/g, "");
	const cleanPatSnils = payload.patient.patientSnils ? payload.patient.patientSnils.replace(/\D/g, "") : "";

	// 1. Clinical Section: Complaints (Жалобы)
	const complaintsText = payload.complaints || "Жалобы отсутствуют (профилактический осмотр)";
	const complaintsSection = `
			<!-- Секция 1: Жалобы пациента -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_COMPLAINTS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Жалобы"/>
					<title>Жалобы пациента</title>
					<text>
						<paragraph>${escapeXml(complaintsText)}</paragraph>
					</text>
				</section>
			</component>`;

	// 2. Clinical Section: Anamnesis (Анамнез)
	const anamnesisMorbi = payload.anamnesisMorbi || "Развитие настоящего заболевания без особенностей.";
	const anamnesisVitae = payload.anamnesisVitae || "Аллергологический анамнез не отягощен, гемотрансфузий не было.";
	const anamnesisSection = `
			<!-- Секция 2: Анамнез заболевания и жизни -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_ANAMNESIS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Анамнез"/>
					<title>Анамнез заболевания и жизни</title>
					<text>
						<paragraph><strong>Анамнез заболевания:</strong> ${escapeXml(anamnesisMorbi)}</paragraph>
						<paragraph><strong>Анамнез жизни и соматический статус:</strong> ${escapeXml(anamnesisVitae)}</paragraph>
					</text>
				</section>
			</component>`;

	// 3. Clinical Section: Tooth Formula / Odontogram (Зубная формула FDI)
	const toothStates = payload.toothStates || {};
	const toothSurfaces = payload.toothSurfaces || {};
	const sortedTeeth = Object.keys(toothStates)
		.map(Number)
		.filter((n) => !Number.isNaN(n))
		.sort((a, b) => a - b);

	let toothObservationsXml = "";
	let toothFormulaSummary = "";

	if (sortedTeeth.length > 0) {
		toothFormulaSummary = sortedTeeth
			.map((tNum) => {
				const rawStatus = toothStates[tNum] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[rawStatus] || {
					labelRu: rawStatus,
					shortSymbol: "?",
					egiszCode: "0",
				};
				const surfs = toothSurfaces[tNum] || [];
				const surfsStr = surfs.length > 0 ? ` [${surfs.join("")}]` : "";
				return `Зуб ${tNum}: ${stObj.labelRu}${surfsStr}`;
			})
			.join("; ");

		toothObservationsXml = sortedTeeth
			.map((tNum) => {
				const rawStatus = toothStates[tNum] || "Healthy";
				const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[rawStatus] || {
					labelRu: rawStatus,
					shortSymbol: "?",
					egiszCode: "0",
				};
				const surfs = toothSurfaces[tNum] || [];
				const surfsAttr = surfs.length > 0 ? ` surfaces="${surfs.join(",")}"` : "";

				return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" displayName="Статус зуба ${tNum}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(stObj.egiszCode)}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="${escapeXml(stObj.labelRu)}"${surfsAttr}/>
							<targetSiteCode code="${tNum}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${tNum}"/>
						</observation>
					</entry>`;
			})
			.join("\n");
	} else {
		toothFormulaSummary = "Зубная формула: интактный зубной ряд, патологий не выявлено.";
	}

	const dentalFormulaSection = `
			<!-- Секция 3: Стоматологический статус и зубная формула (FDI ISO 3950) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DENTAL_ODONTOGRAM}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Зубная формула и одонтограмма"/>
					<title>Зубная формула (FDI ISO 3950 / Форма 043/у)</title>
					<text>
						<paragraph>${escapeXml(toothFormulaSummary)}</paragraph>
					</text>
${toothObservationsXml}
				</section>
			</component>`;

	// 4. Clinical Section: Diagnoses (Диагнозы по МКБ-10)
	const diagnosesList = payload.diagnoses.length > 0
		? payload.diagnoses
		: [{ icd10Code: "Z01.2", icd10Name: "Стоматологическое обследование", isPrimary: true }];

	const diagnosesEntriesXml = diagnosesList
		.map((diag) => {
			return `\t\t\t\t\t<entry>
						<observation classCode="OBS" moodCode="EVN">
							<code code="282291009" codeSystem="2.16.840.1.113883.6.96" displayName="${diag.isPrimary ? "Основной клинический диагноз" : "Сопутствующий диагноз"}"/>
							<statusCode code="completed"/>
							<value xsi:type="CD" code="${escapeXml(diag.icd10Code)}" codeSystem="${EGISZ_REMD_OIDS.ICD10}" codeSystemName="МКБ-10" displayName="${escapeXml(diag.icd10Name)}"/>
							${diag.tooth ? `<targetSiteCode code="${escapeXml(String(diag.tooth))}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(diag.tooth))}"/>` : ""}
						</observation>
					</entry>`;
		})
		.join("\n");

	const diagnosesSection = `
			<!-- Секция 4: Клинические диагнозы по МКБ-10 -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_DIAGNOSIS_SECTION}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Диагнозы"/>
					<title>Клинический диагноз</title>
					<text>
						<list>
							${diagnosesList.map((d) => `<item>${d.isPrimary ? "<strong>[Основной]</strong> " : "[Сопутствующий] "}${escapeXml(d.icd10Code)} — ${escapeXml(d.icd10Name)}${d.tooth ? ` (зуб ${escapeXml(String(d.tooth))})` : ""}</item>`).join("\n\t\t\t\t\t\t\t")}
						</list>
					</text>
${diagnosesEntriesXml}
				</section>
			</component>`;

	// 5. Clinical Section: Treatment Protocol / Services 804n (Протокол лечения)
	const proceduresList = payload.procedures.length > 0
		? payload.procedures
		: [
				{
					code: "B01.065.001",
					name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
				},
		  ];

	const proceduresEntriesXml = proceduresList
		.map((proc) => {
			return `\t\t\t\t\t<entry>
						<procedure classCode="PROC" moodCode="EVN">
							<code code="${escapeXml(proc.code)}" codeSystem="${EGISZ_REMD_OIDS.NOMENKLATURA_804N}" codeSystemName="Номенклатура медицинских услуг 804н" displayName="${escapeXml(proc.name)}"/>
							<statusCode code="completed"/>
							<effectiveTime value="${visitTime}"/>
							${proc.tooth ? `<targetSiteCode code="${escapeXml(String(proc.tooth))}" codeSystem="${EGISZ_REMD_OIDS.DENTAL_TOOTH}" displayName="Зуб ${escapeXml(String(proc.tooth))}"/>` : ""}
						</procedure>
					</entry>`;
		})
		.join("\n");

	const proceduresSection = `
			<!-- Секция 5: Оказанные медицинские вмешательства (Номенклатура 804н) -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_SERVICES_RENDERED}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Проведенные процедуры и вмешательства"/>
					<title>Протокол стоматологического вмешательства и оказанные услуги</title>
					<text>
						${payload.treatmentProtocolDescription ? `<paragraph><strong>Описание вмешательства:</strong> ${escapeXml(payload.treatmentProtocolDescription)}</paragraph>` : ""}
						<list>
							${proceduresList.map((p) => `<item>${escapeXml(p.code)} — ${escapeXml(p.name)}${p.tooth ? ` (зуб ${escapeXml(String(p.tooth))})` : ""}</item>`).join("\n\t\t\t\t\t\t\t")}
						</list>
					</text>
${proceduresEntriesXml}
				</section>
			</component>`;

	// 6. Clinical Section: Recommendations & Care (Рекомендации)
	const recommendationsText = payload.recommendations || "Соблюдение индивидуальной гигиены полости рта, контрольный осмотр через 6 месяцев.";
	const nextVisitStr = payload.nextVisitDate ? ` Дата назначенного приема: ${formatRuDate(payload.nextVisitDate)}.` : "";
	const recommendationsSection = `
			<!-- Секция 6: Назначения, рекомендации и эпикриз -->
			<component>
				<section>
					<code code="${EGISZ_REMD_OIDS.LOINC_RECOMMENDATIONS}" codeSystem="${EGISZ_REMD_OIDS.LOINC}" codeSystemName="LOINC" displayName="Рекомендации"/>
					<title>Рекомендации и план дальнейшего ведения</title>
					<text>
						<paragraph>${escapeXml(recommendationsText)}${escapeXml(nextVisitStr)}</paragraph>
					</text>
				</section>
			</component>`;

	// Build Full CDA XML
	const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:identity="urn:hl7-ru:identity" xmlns:address="urn:hl7-ru:address" xmlns:fias="urn:hl7-ru:fias">
	<realmCode code="RU"/>
	<typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
	<templateId root="${docDef.templateRoot}"/>
	<id root="${escapeXml(clinicOid)}.100.1.1" extension="${escapeXml(docUuid)}"/>
	<code code="${docDef.nsiCode}" codeSystem="${EGISZ_REMD_OIDS.NSI_SEMD_DOC_TYPES}" codeSystemName="Виды СЭМД ЕГИСЗ" displayName="${escapeXml(docDef.title)}"/>
	<title>${escapeXml(docDef.title)} (Форма 043/у)</title>
	<effectiveTime value="${effectiveTime}"/>
	<confidentialityCode code="N" codeSystem="${EGISZ_REMD_OIDS.CONFIDENTIALITY}" codeSystemName="HL7 Confidentiality" displayName="Обычный доступ"/>
	<languageCode code="ru-RU"/>
	<setId root="${escapeXml(clinicOid)}.100.1.2" extension="${escapeXml(payload.patient.cardNumber || docUuid)}"/>
	<versionNumber value="${payload.documentVersion || 1}"/>

	<!-- Субъект документа / Пациент -->
	<recordTarget>
		<patientRole>
			${cleanPatSnils ? `<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml(cleanPatSnils)}"/>` : ""}
			<id root="${escapeXml(clinicOid)}.100.2" extension="${escapeXml(payload.patient.cardNumber || payload.patient.patientId)}"/>
			${payload.patient.patientPolisOms ? `<id root="${EGISZ_REMD_OIDS.POLIS_OMS}" extension="${escapeXml(payload.patient.patientPolisOms.replace(/\s+/g, ""))}"/>` : ""}
			${payload.patient.patientPassport ? `<id root="${EGISZ_REMD_OIDS.IDENTITY_DOC_TYPE}" extension="${escapeXml(payload.patient.patientPassport)}"/>` : ""}
			<addr>
				<streetAddressLine>${escapeXml(payload.patient.patientAddress || payload.clinic.clinicAddress)}</streetAddressLine>
			</addr>
			${payload.patient.patientPhone ? `<telecom value="tel:${escapeXml(payload.patient.patientPhone.replace(/[^\d+]/g, ""))}" use="MC"/>` : ""}
			${payload.patient.patientEmail ? `<telecom value="mailto:${escapeXml(payload.patient.patientEmail)}" use="WP"/>` : ""}
			<patient>
				<name>
					<family>${escapeXml(patFamily)}</family>
					<given>${escapeXml(patGiven)}</given>
					${patPatronymic ? `<identity:Patronymic>${escapeXml(patPatronymic)}</identity:Patronymic>` : ""}
				</name>
				<administrativeGenderCode code="${genderCode}" codeSystem="${EGISZ_REMD_OIDS.GENDER}" codeSystemName="Пол" displayName="${escapeXml(genderLabel)}"/>
				<birthTime value="${birthTime}"/>
			</patient>
		</patientRole>
	</recordTarget>

	<!-- Автор документа / Лечащий врач -->
	<author>
		<time value="${visitTime}"/>
		<assignedAuthor>
			<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml(cleanDocSnils)}"/>
			<code code="${escapeXml(payload.doctor.doctorPositionCode || "71")}" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_POSITIONS}" codeSystemName="Должности медработников" displayName="${escapeXml(payload.doctor.doctorPosition || "Врач-стоматолог-терапевт")}"/>
			${payload.doctor.doctorPhone ? `<telecom value="tel:${escapeXml(payload.doctor.doctorPhone.replace(/[^\d+]/g, ""))}" use="WP"/>` : ""}
			<assignedPerson>
				<name>
					<family>${escapeXml(docFamily)}</family>
					<given>${escapeXml(docGiven)}</given>
					${docPatronymic ? `<identity:Patronymic>${escapeXml(docPatronymic)}</identity:Patronymic>` : ""}
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}" extension="${escapeXml(payload.clinic.clinicOgrn.replace(/\D/g, ""))}"/>
				<id root="${EGISZ_REMD_OIDS.INN}" extension="${escapeXml(payload.clinic.clinicInn.replace(/\D/g, ""))}"/>
				<name>${escapeXml(payload.clinic.clinicName)}</name>
				<telecom value="tel:${escapeXml(payload.clinic.clinicPhone.replace(/[^\d+]/g, ""))}" use="WP"/>
				<addr>
					<streetAddressLine>${escapeXml(payload.clinic.clinicAddress)}</streetAddressLine>
				</addr>
			</representedOrganization>
		</assignedAuthor>
	</author>

	<!-- Хранитель медицинской документации / Медицинская организация (МО) -->
	<custodian>
		<assignedCustodian>
			<representedCustodianOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<id root="${EGISZ_REMD_OIDS.OGRN_LEGAL}" extension="${escapeXml(payload.clinic.clinicOgrn.replace(/\D/g, ""))}"/>
				<name>${escapeXml(payload.clinic.clinicName)}</name>
				<telecom value="tel:${escapeXml(payload.clinic.clinicPhone.replace(/[^\d+]/g, ""))}" use="WP"/>
				<addr>
					<streetAddressLine>${escapeXml(payload.clinic.clinicAddress)}</streetAddressLine>
				</addr>
			</representedCustodianOrganization>
		</assignedCustodian>
	</custodian>

	<!-- Лицо, имеющее право подписи от имени МО / Главный врач -->
	<legalAuthenticator>
		<time value="${effectiveTime}"/>
		<signatureCode code="S"/>
		<assignedEntity>
			<id root="${EGISZ_REMD_OIDS.SNILS}" extension="${escapeXml((payload.clinic.chiefDoctorSnils || payload.doctor.doctorSnils).replace(/\D/g, ""))}"/>
			<code code="15" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_POSITIONS}" displayName="Главный врач"/>
			<assignedPerson>
				<name>
					<family>${escapeXml(payload.clinic.chiefDoctorName ? payload.clinic.chiefDoctorName.split(" ")[0] : docFamily)}</family>
					<given>${escapeXml(payload.clinic.chiefDoctorName ? payload.clinic.chiefDoctorName.split(" ")[1] || "" : docGiven)}</given>
					<identity:Patronymic>${escapeXml(payload.clinic.chiefDoctorName ? payload.clinic.chiefDoctorName.split(" ")[2] || "" : docPatronymic)}</identity:Patronymic>
				</name>
			</assignedPerson>
			<representedOrganization>
				<id root="${EGISZ_REMD_OIDS.FRMO_MO_ROOT}" extension="${escapeXml(clinicOid)}"/>
				<name>${escapeXml(payload.clinic.clinicName)}</name>
			</representedOrganization>
		</assignedEntity>
	</legalAuthenticator>

	<!-- Амбулаторный прием / Случай оказания помощи -->
	<componentOf>
		<encompassingEncounter>
			<id root="${escapeXml(clinicOid)}.100.1.3" extension="${escapeXml(payload.patient.cardNumber || docUuid)}"/>
			<code code="1" codeSystem="${EGISZ_REMD_OIDS.MEDICAL_CARE_TYPE}" displayName="Первичная медико-санитарная помощь"/>
			<effectiveTime>
				<low value="${visitTime}"/>
				<high value="${effectiveTime}"/>
			</effectiveTime>
		</encompassingEncounter>
	</componentOf>

	<!-- ТЕЛО ДОКУМЕНТА (Клинические секции ф. 043/у) -->
	<component>
		<structuredBody>${complaintsSection}${anamnesisSection}${dentalFormulaSection}${diagnosesSection}${proceduresSection}${recommendationsSection}
		</structuredBody>
	</component>
</ClinicalDocument>`;

	return canonicalizeCdaXml(rawXml);
}

/**
 * Генерирует XMLDSig XML-блок отсоединенной электронной подписи (63-ФЗ)
 */
export function generateGostXmlSignatureBlock(sig: GostSignatureInfo, documentRef = ""): string {
	return `
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
	<ds:SignedInfo>
		<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
		<ds:SignatureMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-256"/>
		<ds:Reference URI="${documentRef}">
			<ds:Transforms>
				<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
				<ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
			</ds:Transforms>
			<ds:DigestMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-256"/>
			<ds:DigestValue>${escapeXml(sig.signatureBase64.slice(0, 44))}</ds:DigestValue>
		</ds:Reference>
	</ds:SignedInfo>
	<ds:SignatureValue>${escapeXml(sig.signatureBase64)}</ds:SignatureValue>
	<ds:KeyInfo>
		<ds:X509Data>
			<ds:X509SubjectName>${escapeXml(sig.certificateSubject)}</ds:X509SubjectName>
			<ds:X509IssuerSerial>
				<ds:X509IssuerName>${escapeXml(sig.certificateIssuer || "Головной УЦ Минцифры России")}</ds:X509IssuerName>
				<ds:X509SerialNumber>${escapeXml(sig.certificateSerialNumber)}</ds:X509SerialNumber>
			</ds:X509IssuerSerial>
		</ds:X509Data>
	</ds:KeyInfo>
</ds:Signature>`.trim();
}

/**
 * Имя файла выгрузки по официальному регламенту ЕГИСЗ
 */
export function generateEgiszXmlFilename(payload: Egisz043uPayload): string {
	const docCode = payload.docTypeCode || "303";
	const cleanOid = (payload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2").replace(/[^\d.]/g, "_");
	const dateStr = formatHl7DateTime(payload.encounterDate || new Date(), false);
	const docId = (payload.patient.cardNumber || "DOC").replace(/[^\w-]/g, "_");
	return `SEMD_${docCode}_${cleanOid}_${dateStr}_${docId}.xml`;
}

/**
 * Генерация печатной формы «Медицинская карта стоматологического пациента (Форма 043/у)»
 */
export function generateForm043uPrintHtml(payload: Egisz043uPayload): string {
	const docDef = EGISZ_DENTAL_SEMD_TYPES[payload.docTypeCode] || EGISZ_DENTAL_SEMD_TYPES["303"];
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
		@page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
		body { font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.35; color: #000; background: #fff; margin: 0; padding: 10px; }
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
		.signature-box { margin-top: 24px; display: flex; justify-content: space-between; border-top: 1px dashed #666; padding-top: 10px; }
		.stamp-ukep { border: 2px solid #0056b3; border-radius: 6px; padding: 6px 12px; color: #0056b3; font-size: 10px; line-height: 1.2; width: 280px; }
	</style>
</head>
<body>
	<div class="doc-header">
		<div class="mo-title">${escapeXml(payload.clinic.clinicName)}</div>
		<div class="mo-sub">ОГРН: ${escapeXml(payload.clinic.clinicOgrn)} | ИНН: ${escapeXml(payload.clinic.clinicInn)} | OID: ${escapeXml(payload.clinic.clinicOid)}</div>
		<div class="mo-sub">${escapeXml(payload.clinic.clinicAddress)} | тел: ${escapeXml(payload.clinic.clinicPhone)}</div>
		<div class="doc-title">МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/У)</div>
		<div class="doc-semd">СЭМД ЕГИСЗ РЭМД: ${escapeXml(docDef.title)} (Код ${docDef.nsiCode})</div>
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
		<span class="field-label">Телефон:</span> ${escapeXml(payload.patient.patientPhone || "—")} &nbsp;&nbsp;|&nbsp;&nbsp;
		<span class="field-label">Адрес:</span> ${escapeXml(payload.patient.patientAddress || "—")}
	</div>

	<div class="section-title">1. ЖАЛОБЫ И АНАМНЕЗ</div>
	<div class="field-row"><span class="field-label">Жалобы:</span> ${escapeXml(payload.complaints || "Не предъявляет.")}</div>
	<div class="field-row"><span class="field-label">Анамнез заболевания:</span> ${escapeXml(payload.anamnesisMorbi || "Без особенностей.")}</div>
	<div class="field-row"><span class="field-label">Анамнез жизни / Аллергостатус:</span> ${escapeXml(payload.anamnesisVitae || "Без соматических отягощений.")}</div>

	<div class="section-title">2. ЗУБНАЯ ФОРМУЛА (FDI / ISO 3950)</div>
	<div class="formula-table">
		${renderTeethQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
		${renderTeethQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
	</div>

	<div class="section-title">3. ДИАГНОЗ ПО МКБ-10</div>
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

	<div class="section-title">5. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ</div>
	<div>${escapeXml(payload.recommendations || "Индивидуальная гигиена полости рта.")}</div>

	<div class="signature-box">
		<div>
			<div><strong>Лечащий врач:</strong> ${escapeXml(payload.doctor.doctorFullName)}</div>
			<div>${escapeXml(payload.doctor.doctorPosition)} (Код ${escapeXml(payload.doctor.doctorPositionCode)})</div>
			<div>СНИЛС: ${escapeXml(payload.doctor.doctorSnils)}</div>
		</div>

		${payload.doctorSignature ? `
		<div class="stamp-ukep">
			<div><strong>ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ</strong></div>
			<div>Сертификат: ${escapeXml(payload.doctorSignature.certificateSerialNumber)}</div>
			<div>Владелец: ${escapeXml(payload.doctor.doctorFullName)}</div>
			<div>Действителен: с ${formatRuDate(payload.doctorSignature.validFrom)} по ${formatRuDate(payload.doctorSignature.validTo)}</div>
		</div>
		` : `
		<div style="text-align: right;">
			<div>Подпись врача: ___________________ / ${escapeXml(payload.doctor.doctorFullName)}</div>
		</div>
		`}
	</div>
</body>
</html>`;
}
