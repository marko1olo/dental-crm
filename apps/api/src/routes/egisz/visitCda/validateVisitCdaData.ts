/**
 * validateVisitCdaData.ts — Statutory CDA prerequisite validations per Order 947n.
 * Mandate 8b compliant (<= 120 lines).
 */

import { isValidSnils } from "../../../utils/snils.js";

export interface ValidateVisitCdaInput {
	diaryRow: any;
	effectiveDiagnosis: string;
	clinicOid: string | null;
	doctorName: { first: string; last: string };
	patientSnilsDigits: string;
	resolvedIcd10: string;
	birthStr: string;
	birthParsed: Date | null;
	patientGender: string | null;
	patientFullNameRaw: string;
	patientNameParts: { last: string };
	clinicName: string;
}

export function validateVisitCdaPrerequisites(input: ValidateVisitCdaInput): { error: string; message: string } | null {
	if (input.diaryRow && input.diaryRow.isLocked !== true) {
		return { error: "DiaryNotLocked", message: "Для выгрузки в ЕГИСЗ дневник 043/у должен быть подписан (заблокирован). Сохраните и подпишите карту." };
	}
	if (!input.effectiveDiagnosis) {
		return { error: "DiagnosisRequired", message: "Для выгрузки в ЕГИСЗ у случая обслуживания должен быть заполнен диагноз." };
	}
	if (!input.clinicOid) {
		return { error: "ClinicOidRequired", message: "Для выгрузки в ЕГИСЗ укажите идентификатор организации в настройках интеграции." };
	}
	if (!input.doctorName.last || input.doctorName.last === "Не указан") {
		return { error: "DoctorRequired", message: "Для выгрузки в ЕГИСЗ должен быть указан врач приёма (в расписании или в подписанном дневнике)." };
	}
	if (input.patientSnilsDigits.length !== 11 || !isValidSnils(input.patientSnilsDigits)) {
		return { error: "PatientSnilsRequired", message: "Для выгрузки в ЕГИСЗ у пациента должен быть указан корректный СНИЛС в административной карточке." };
	}
	if (!input.resolvedIcd10) {
		return { error: "Icd10Required", message: "Для выгрузки в ЕГИСЗ у диагноза должен быть указан код МКБ-10." };
	}
	if (!input.birthStr || !input.birthParsed || Number.isNaN(input.birthParsed.getTime())) {
		return { error: "PatientBirthDateRequired", message: "Для выгрузки в ЕГИСЗ у пациента должна быть указана дата рождения." };
	}
	if (input.patientGender !== "male" && input.patientGender !== "female") {
		return { error: "PatientGenderRequired", message: "Для выгрузки в ЕГИСЗ у пациента должен быть указан пол (мужской или женский)." };
	}
	if (!input.patientFullNameRaw.trim() || !input.patientNameParts.last.trim()) {
		return { error: "PatientNameRequired", message: "Для выгрузки в ЕГИСЗ у пациента должно быть указано ФИО в карточке." };
	}
	if (!input.clinicName) {
		return { error: "ClinicNameRequired", message: "Для выгрузки в ЕГИСЗ у медицинской организации должно быть указано наименование." };
	}
	return null;
}
