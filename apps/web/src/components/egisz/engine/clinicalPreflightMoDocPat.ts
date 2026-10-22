/**
 * clinicalPreflightMoDocPat.ts — Organization, Doctor & Patient Preflight Checks
 */

import {
	EGISZ_REMD_OIDS,
	FRMR_DOCTOR_POSITIONS,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
} from "../remdXml/egiszRemdPresets";
import type { EgiszDentalCdaPayload } from "../cdaR2XmlBuilder";
import type { EgiszPreflightCheckResult } from "./engineTypes";

export function checkClinicAndDoctor(payload: EgiszDentalCdaPayload, checks: EgiszPreflightCheckResult[]): void {
	const oidValid = validateOidFormat(payload.clinic.clinicOid);
	if (!payload.clinic.clinicOid) {
		checks.push({
			id: "mo_oid_missing", category: "clinic", title: "OID медицинской организации в ФРМО",
			status: "failed", details: "Отсутствует OID клиники. Регистрация в РЭМД невозможна без OID ФРМО (1.2.643.5.1.13.13.12.2...)",
			oid: EGISZ_REMD_OIDS.FRMO_MO_ROOT,
		});
	} else if (!oidValid) {
		checks.push({
			id: "mo_oid_invalid", category: "clinic", title: "Формат OID медицинской организации",
			status: "failed", details: `Некорректный синтаксис OID клиники: "${payload.clinic.clinicOid}". Ожидается точечная нотация`,
			oid: EGISZ_REMD_OIDS.FRMO_MO_ROOT,
		});
	} else {
		checks.push({
			id: "mo_oid_ok", category: "clinic", title: "OID медицинской организации (ФРМО)",
			status: "passed", details: `OID корректен: ${payload.clinic.clinicOid}`,
			oid: EGISZ_REMD_OIDS.FRMO_MO_ROOT,
		});
	}

	const ogrnOk = validateRussianOgrn(payload.clinic.clinicOgrn || "");
	checks.push(ogrnOk ? {
		id: "mo_ogrn_ok", category: "clinic", title: "ОГРН юридического лица / ИП",
		status: "passed", details: `ОГРН проверен по контрольной сумме: ${payload.clinic.clinicOgrn}`,
		oid: EGISZ_REMD_OIDS.OGRN_LEGAL,
	} : {
		id: "mo_ogrn_invalid", category: "clinic", title: "ОГРН организации / ИП",
		status: "failed", details: `Недействительный ОГРН: "${payload.clinic.clinicOgrn}". Требуется 13 или 15 цифр`,
		oid: EGISZ_REMD_OIDS.OGRN_LEGAL,
	});

	const innOk = validateRussianInn(payload.clinic.clinicInn || "");
	checks.push(innOk ? {
		id: "mo_inn_ok", category: "clinic", title: "ИНН организации",
		status: "passed", details: `ИНН проверен: ${payload.clinic.clinicInn}`, oid: EGISZ_REMD_OIDS.INN,
	} : {
		id: "mo_inn_invalid", category: "clinic", title: "ИНН организации",
		status: "warning", details: `Проверьте ИНН: "${payload.clinic.clinicInn}"`, oid: EGISZ_REMD_OIDS.INN,
	});

	const docSnilsRes = validateRussianSnils(payload.doctor.doctorSnils || "");
	checks.push(docSnilsRes.isValid ? {
		id: "doc_snils_ok", category: "doctor", title: "СНИЛС лечащего врача (ФРМР)",
		status: "passed", details: `СНИЛС врача верифицирован: ${docSnilsRes.formatted}`, oid: EGISZ_REMD_OIDS.SNILS,
	} : {
		id: "doc_snils_invalid", category: "doctor", title: "СНИЛС лечащего врача",
		status: "failed", details: `Ошибка СНИЛС врача: ${docSnilsRes.error || "Неверный СНИЛС"}. Без СНИЛС ЕГИСЗ отклоняет СЭМД`,
		oid: EGISZ_REMD_OIDS.SNILS,
	});

	const isKnownPosition = FRMR_DOCTOR_POSITIONS.some((p) => p.code === payload.doctor.doctorPositionCode);
	checks.push(isKnownPosition || payload.doctor.doctorPosition ? {
		id: "doc_pos_ok", category: "doctor", title: "Должность медработника по номенклатуре Минздрава",
		status: "passed", details: `Должность: ${payload.doctor.doctorPosition} (Код: ${payload.doctor.doctorPositionCode || "71"})`,
		oid: EGISZ_REMD_OIDS.MEDICAL_POSITIONS,
	} : {
		id: "doc_pos_warn", category: "doctor", title: "Должность врача в справочнике 1.2.643.5.1.13.13.11.1002",
		status: "warning", details: "Код должности не найден в стандартном классификаторе ФРМР",
		oid: EGISZ_REMD_OIDS.MEDICAL_POSITIONS,
	});
}

export function checkPatient(payload: EgiszDentalCdaPayload, checks: EgiszPreflightCheckResult[]): void {
	if (payload.patient.patientSnils) {
		const patSnilsRes = validateRussianSnils(payload.patient.patientSnils);
		checks.push(patSnilsRes.isValid ? {
			id: "pat_snils_ok", category: "patient", title: "СНИЛС пациента",
			status: "passed", details: `СНИЛС пациента проверен: ${patSnilsRes.formatted}`, oid: EGISZ_REMD_OIDS.SNILS,
		} : {
			id: "pat_snils_warn", category: "patient", title: "СНИЛС пациента (Контрольная сумма)",
			status: "warning", details: `СНИЛС пациента указан с предупреждением: ${patSnilsRes.error}`, oid: EGISZ_REMD_OIDS.SNILS,
		});
	} else if (payload.patient.patientPolisOms || payload.patient.patientPassport) {
		checks.push({
			id: "pat_ident_alt", category: "patient", title: "Идентификатор пациента (ОМС / Паспорт)",
			status: "passed", details: `Используется альтернативный документ: ${payload.patient.patientPolisOms ? `Полис ОМС ${payload.patient.patientPolisOms}` : `Паспорт ${payload.patient.patientPassport}`}`,
			oid: EGISZ_REMD_OIDS.POLIS_OMS,
		});
	} else {
		checks.push({
			id: "pat_ident_missing", category: "patient", title: "Удостоверение личности пациента",
			status: "failed", details: "Не указан ни СНИЛС, ни полис ОМС, ни паспорт пациента. Заполнение обязательно для ЕГИСЗ",
			oid: EGISZ_REMD_OIDS.IDENTITY_DOC_TYPE,
		});
	}

	checks.push(!payload.patient.cardNumber ? {
		id: "pat_card_missing", category: "patient", title: "Номер амбулаторной карты 043/у",
		status: "warning", details: "Номер медицинской карты стоматологического пациента не заполнен",
	} : {
		id: "pat_card_ok", category: "patient", title: "Номер амбулаторной карты 043/у",
		status: "passed", details: `Карта: ${payload.patient.cardNumber}`,
	});
}
