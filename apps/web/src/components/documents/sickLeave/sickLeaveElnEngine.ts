/**
 * STATUTORY ELECTRONIC SICK LEAVE (ЭЛН) & ORDER 1089N ENGINE
 * Conforming to Ministry of Health of the Russian Federation Order № 1089н
 *
 * Domain: Statutory Electronic Sick Leave (ЭЛН) & Medical Commission (ВК)
 */

import {
	IncapacityReasonCode,
	IncapacityRegimeType,
	SickLeaveClosingCode,
	RegimeViolationCode,
	INCAPACITY_REASON_CODES,
	SICK_LEAVE_CLOSING_CODES,
	REGIME_VIOLATION_CODES
} from './sickLeaveElnPresets';
import { generateQrCodeSvg } from "@dental/shared";

export const SINGLE_DOCTOR_MAX_DAYS = 15;
export const FELDSHER_MAX_DAYS = 10;
export const DEFAULT_CLINIC_OGRN = '1187746123456';
export const DEFAULT_CLINIC_NAME = 'ООО "ДЕНТЕ КЛИНИК"';
export const DEFAULT_CLINIC_ADDRESS = '127006, г. Москва, ул. Тверская-Ямская, д. 18, стр. 1';
export const DEFAULT_CLINIC_LICENCE = 'ЛО-77-01-020894 от 14.10.2021';

export interface IncapacityPeriod {
	id: string;
	dateFrom: string; // YYYY-MM-DD
	dateTo: string; // YYYY-MM-DD
	doctorSpecialty: string;
	doctorFio: string;
	doctorSnils: string;
	doctorRole: 'attending' | 'vk_member' | 'vk_chairperson';
	vkChairpersonFio?: string | undefined;
	vkChairpersonSnils?: string | undefined;
	vkProtocolNumber?: string | undefined;
	vkProtocolDate?: string | undefined;
}

export interface MedicalCommissionProtocol {
	protocolNumber: string;
	protocolDate: string; // YYYY-MM-DD
	chairpersonFio: string;
	chairpersonSpecialty: string;
	chairpersonSnils: string;
	deputyChairpersonFio?: string | undefined;
	memberFios: string[];
	attendingDoctorFio: string;
	clinicalDiagnosis: string;
	icd10Code: string;
	clinicalSubstantiation: string;
	expertDecision: string;
	extensionDays: number;
	extensionDateFrom: string; // YYYY-MM-DD
	extensionDateTo: string; // YYYY-MM-DD
	nextReviewDate?: string | undefined;
}

export interface SickLeavePatientData {
	patientFio: string;
	patientBirthDate: string; // YYYY-MM-DD
	patientGender: 'male' | 'female';
	patientSnils: string;
	patientOmsNumber?: string | undefined;
	patientPassport?: string | undefined;
	employerName: string;
	isPrimaryWorkplace: boolean;
	patientPhone?: string | undefined;
}

export interface SickLeaveFormState {
	elnNumber: string;
	issueDate: string; // YYYY-MM-DD
	isDuplicate: boolean;
	prevElnNumber?: string | undefined;
	reasonCode: IncapacityReasonCode;
	additionalReasonCode?: string | undefined;
	regimeType: IncapacityRegimeType;
	icd10Code: string;
	diagnosisText: string;
	periods: IncapacityPeriod[];
	closingCode: SickLeaveClosingCode;
	workResumeDate?: string | undefined;
	nextElnNumber?: string | undefined;
	violationCode?: RegimeViolationCode | undefined;
	violationDate?: string | undefined;
	isVkRequired: boolean;
	vkProtocol?: MedicalCommissionProtocol | undefined;
	organizationName: string;
	organizationOgrn: string;
	organizationAddress: string;
	medicalLicenceNumber: string;
}

export interface SickLeaveValidationResult {
	isValid: boolean;
	totalDays: number;
	isVkRequired: boolean;
	singleDoctorLimitExceeded: boolean;
	errors: string[];
	warnings: string[];
	infoMessages: string[];
}

export interface Form036uEntry {
	entryNumber: string;
	date: string;
	patientFio: string;
	birthDate: string;
	snils: string;
	medicalCardNumber: string;
	diagnosis: string;
	icd10: string;
	sickLeaveNumber: string;
	incapacityPeriodText: string;
	totalDays: number;
	vkReason: string;
	vkDecisionText: string;
	chairpersonSign: string;
	membersSign: string[];
}

/**
 * Calculates inclusive calendar days between two YYYY-MM-DD dates (inclusive of both start and end date)
 */
export function calculateDaysBetween(from: string, to: string): number {
	if (!from || !to) return 0;
	const dFrom = new Date(from);
	const dTo = new Date(to);
	if (isNaN(dFrom.getTime()) || isNaN(dTo.getTime())) return 0;
	const diffMs = dTo.getTime() - dFrom.getTime();
	if (diffMs < 0) return 0;
	const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
	return days;
}

/**
 * Formats YYYY-MM-DD to Russian DD.MM.YYYY
 */
export function formatDateRu(dateStr: string): string {
	if (!dateStr) return '';
	const parts = dateStr.split('-');
	if (parts.length !== 3) return dateStr;
	const [year, month, day] = parts;
	return `${day}.${month}.${year}`;
}

/**
 * Adds N calendar days to YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return dateStr;
	d.setDate(d.getDate() + days);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Calculates standard date sequence for sick leave
 */
export function calculateSickLeaveDates(startDate: string, durationDays: number) {
	const validDays = Math.max(1, Math.round(durationDays || 1));
	const dateFrom = startDate;
	const dateTo = addDays(startDate, validDays - 1);
	const workResumeDate = addDays(dateTo, 1);
	const nextAppointmentDate = dateTo;

	return {
		dateFrom,
		dateTo,
		totalDays: validDays,
		workResumeDate,
		nextAppointmentDate
	};
}

/**
 * Generates a standard 12-digit statutory ELN Number conforming to SFR/FSS format
 */
export function generateElnNumber(prefix = '999'): string {
	let randomPart = '';
	for (let i = 0; i < 9; i++) {
		randomPart += Math.floor(Math.random() * 10);
	}
	return `${prefix}${randomPart}`;
}

/**
 * Validates Sick Leave duration and compliance with Ministry of Health Order 1089n
 */
export function validateSickLeaveDuration(form: SickLeaveFormState): SickLeaveValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const infoMessages: string[] = [];

	if (!form.elnNumber || form.elnNumber.replace(/\D/g, '').length !== 12) {
		warnings.push('Номер ЭЛН должен состоять из 12 цифр согласно стандарту Социального фонда России (СФР).');
	}

	if (!form.periods || form.periods.length === 0) {
		errors.push('Отсутствуют периоды освобождения от работы.');
		return {
			isValid: false,
			totalDays: 0,
			isVkRequired: false,
			singleDoctorLimitExceeded: false,
			errors,
			warnings,
			infoMessages
		};
	}

	let totalDays = 0;
	let singleDoctorCumulativeDays = 0;

	for (let i = 0; i < form.periods.length; i++) {
		const p = form.periods[i];
		if (!p || !p.dateFrom || !p.dateTo) {
			errors.push(`В периоде №${i + 1} не заполнены даты начала или окончания.`);
			continue;
		}

		const periodDays = calculateDaysBetween(p.dateFrom, p.dateTo);
		if (periodDays <= 0) {
			errors.push(`В периоде №${i + 1} дата окончания (${formatDateRu(p.dateTo)}) предшествует дате начала (${formatDateRu(p.dateFrom)}).`);
			continue;
		}

		totalDays += periodDays;

		// Check sequential continuity
		if (i > 0) {
			const prevPeriod = form.periods[i - 1];
			if (prevPeriod && prevPeriod.dateTo) {
				const expectedNextStart = addDays(prevPeriod.dateTo, 1);
				if (p.dateFrom !== expectedNextStart) {
					warnings.push(`Период №${i + 1} начинается с даты ${formatDateRu(p.dateFrom)}, нарушая непрерывность с предыдущим периодом (ожидалось ${formatDateRu(expectedNextStart)}).`);
				}
			}
		}

		if (p.doctorRole === 'attending') {
			singleDoctorCumulativeDays += periodDays;
		}
	}

	const singleDoctorLimitExceeded = totalDays > SINGLE_DOCTOR_MAX_DAYS;
	const isVkRequired = singleDoctorLimitExceeded || form.isVkRequired;

	if (singleDoctorLimitExceeded) {
		if (!form.isVkRequired) {
			errors.push(
				`Общая продолжительность нетрудоспособности составляет ${totalDays} дн., что превышает установленный законом 15-дневный лимит единоличной экспертизы лечащего врача (Приказ Минздрава РФ № 1089н, п. 19). Необходимо сформировать протокол заседания Врачебной комиссии (ВК).`
			);
		} else if (!form.vkProtocol || !form.vkProtocol.protocolNumber || form.vkProtocol.protocolNumber.trim() === '') {
			errors.push('Для продления ЭЛН свыше 15 дней требуется заполнить номер протокола и состав Врачебной комиссии (ВК).');
		} else {
			infoMessages.push(`Продление ЭЛН свыше 15 дней санкционировано решением Врачебной комиссии (Протокол ВК № ${form.vkProtocol.protocolNumber} от ${formatDateRu(form.vkProtocol.protocolDate)}).`);
		}
	} else {
		infoMessages.push(`Срок нетрудоспособности (${totalDays} дн.) находится в пределах 15-дневного лимита единоличной выдачи лечащим врачом (Приказ № 1089н).`);
	}

	// Validate Closing status
	if (form.closingCode === '31') {
		if (!form.workResumeDate) {
			errors.push('При статусе закрытия "31 - Приступить к работе" обязательно указание даты выхода на работу.');
		} else {
			const lastPeriod = form.periods[form.periods.length - 1];
			if (lastPeriod && lastPeriod.dateTo) {
				const expectedWorkResumeDate = addDays(lastPeriod.dateTo, 1);
				if (form.workResumeDate < expectedWorkResumeDate) {
					warnings.push(`Дата выхода на работу (${formatDateRu(form.workResumeDate)}) должна быть не ранее дня, следующего за окончанием последнего периода нетрудоспособности (${formatDateRu(expectedWorkResumeDate)}).`);
				}
			}
		}
	}

	if (form.closingCode === '32' && !form.nextElnNumber) {
		warnings.push('При статусе закрытия "32 - Продолжает болеть" рекомендуется указать номер нового листка нетрудоспособности (продолжения).');
	}

	// Validate Violation
	if (form.violationCode && !form.violationDate) {
		warnings.push('При отметке о нарушении режима необходимо указать дату фиксации нарушения.');
	}

	const isValid = errors.length === 0;

	return {
		isValid,
		totalDays,
		isVkRequired,
		singleDoctorLimitExceeded,
		errors,
		warnings,
		infoMessages
	};
}

/**
 * Generates statutory XML Payload conforming to SFR/FSS & EGISZ SEMD standard (Schema FSS_ELN_v2 / Minzdrav 1089n)
 */
export function generateElnXmlPayload(form: SickLeaveFormState, patient: SickLeavePatientData): string {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);

	const periodsXml = form.periods
		.map((p, idx) => {
			const days = calculateDaysBetween(p.dateFrom, p.dateTo);
			return `    <eln:IncapacityRow Id="${idx + 1}">
      <eln:DateFrom>${p.dateFrom}</eln:DateFrom>
      <eln:DateTo>${p.dateTo}</eln:DateTo>
      <eln:DaysCount>${days}</eln:DaysCount>
      <eln:DoctorRole>${p.doctorRole}</eln:DoctorRole>
      <eln:DoctorSpecialty>${escapeXml(p.doctorSpecialty)}</eln:DoctorSpecialty>
      <eln:DoctorFio>${escapeXml(p.doctorFio)}</eln:DoctorFio>
      <eln:DoctorSnils>${escapeXml(p.doctorSnils)}</eln:DoctorSnils>
      ${
				p.vkChairpersonFio
					? `<eln:VkChairpersonFio>${escapeXml(p.vkChairpersonFio)}</eln:VkChairpersonFio>
      <eln:VkChairpersonSnils>${escapeXml(p.vkChairpersonSnils || '')}</eln:VkChairpersonSnils>
      <eln:VkProtocolNumber>${escapeXml(p.vkProtocolNumber || '')}</eln:VkProtocolNumber>
      <eln:VkProtocolDate>${escapeXml(p.vkProtocolDate || '')}</eln:VkProtocolDate>`
					: ''
			}
    </eln:IncapacityRow>`;
		})
		.join('\n');

	const vkXml =
		form.isVkRequired && form.vkProtocol
			? `  <eln:MedicalCommissionProtocol>
    <eln:ProtocolNumber>${escapeXml(form.vkProtocol.protocolNumber)}</eln:ProtocolNumber>
    <eln:ProtocolDate>${form.vkProtocol.protocolDate}</eln:ProtocolDate>
    <eln:ChairpersonFio>${escapeXml(form.vkProtocol.chairpersonFio)}</eln:ChairpersonFio>
    <eln:ChairpersonSnils>${escapeXml(form.vkProtocol.chairpersonSnils)}</eln:ChairpersonSnils>
    <eln:AttendingDoctorFio>${escapeXml(form.vkProtocol.attendingDoctorFio)}</eln:AttendingDoctorFio>
    <eln:ClinicalSubstantiation>${escapeXml(form.vkProtocol.clinicalSubstantiation)}</eln:ClinicalSubstantiation>
    <eln:ExpertDecision>${escapeXml(form.vkProtocol.expertDecision)}</eln:ExpertDecision>
    <eln:CommissionMembers>
${form.vkProtocol.memberFios.map((m) => `      <eln:MemberFio>${escapeXml(m)}</eln:MemberFio>`).join('\n')}
    </eln:CommissionMembers>
  </eln:MedicalCommissionProtocol>`
			: '';

	const violationXml =
		form.violationCode && form.violationDate
			? `  <eln:RegimeViolation>
    <eln:ViolationCode>${form.violationCode}</eln:ViolationCode>
    <eln:ViolationDate>${form.violationDate}</eln:ViolationDate>
  </eln:RegimeViolation>`
			: '';

	return `<?xml version="1.0" encoding="UTF-8"?>
<eln:SickLeaveDocument xmlns:eln="http://www.fss.ru/eln/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="2.0" MinzdravOrder="1089n">
  <eln:Header>
    <eln:ElnNumber>${escapeXml(form.elnNumber)}</eln:ElnNumber>
    <eln:IssueDate>${form.issueDate}</eln:IssueDate>
    <eln:IsDuplicate>${form.isDuplicate}</eln:IsDuplicate>
    ${form.prevElnNumber ? `<eln:PrevElnNumber>${escapeXml(form.prevElnNumber)}</eln:PrevElnNumber>` : ''}
    <eln:ReasonCode>${form.reasonCode}</eln:ReasonCode>
    ${form.additionalReasonCode ? `<eln:AdditionalReasonCode>${form.additionalReasonCode}</eln:AdditionalReasonCode>` : ''}
    <eln:RegimeType>${form.regimeType}</eln:RegimeType>
    <eln:Icd10Code>${escapeXml(form.icd10Code)}</eln:Icd10Code>
    <eln:DiagnosisDescription>${escapeXml(form.diagnosisText)}</eln:DiagnosisDescription>
  </eln:Header>
  <eln:MedicalOrganization>
    <eln:Ogrn>${escapeXml(form.organizationOgrn || DEFAULT_CLINIC_OGRN)}</eln:Ogrn>
    <eln:Name>${escapeXml(form.organizationName || DEFAULT_CLINIC_NAME)}</eln:Name>
    <eln:Address>${escapeXml(form.organizationAddress || DEFAULT_CLINIC_ADDRESS)}</eln:Address>
    <eln:LicenceNumber>${escapeXml(form.medicalLicenceNumber || DEFAULT_CLINIC_LICENCE)}</eln:LicenceNumber>
  </eln:MedicalOrganization>
  <eln:Patient>
    <eln:Fio>${escapeXml(patient.patientFio)}</eln:Fio>
    <eln:BirthDate>${patient.patientBirthDate}</eln:BirthDate>
    <eln:Gender>${patient.patientGender}</eln:Gender>
    <eln:Snils>${escapeXml(patient.patientSnils)}</eln:Snils>
    ${patient.patientOmsNumber ? `<eln:OmsNumber>${escapeXml(patient.patientOmsNumber)}</eln:OmsNumber>` : ''}
    <eln:EmployerName>${escapeXml(patient.employerName)}</eln:EmployerName>
    <eln:IsPrimaryWorkplace>${patient.isPrimaryWorkplace}</eln:IsPrimaryWorkplace>
  </eln:Patient>
  <eln:IncapacityPeriods TotalDays="${totalDays}">
${periodsXml}
  </eln:IncapacityPeriods>
${vkXml}
${violationXml}
  <eln:ClosingStatus>
    <eln:ClosingCode>${form.closingCode}</eln:ClosingCode>
    ${form.workResumeDate ? `<eln:WorkResumeDate>${form.workResumeDate}</eln:WorkResumeDate>` : ''}
    ${form.nextElnNumber ? `<eln:NextElnNumber>${escapeXml(form.nextElnNumber)}</eln:NextElnNumber>` : ''}
  </eln:ClosingStatus>
  <eln:DigitalSignatures>
    <eln:Signature Role="AttendingDoctor" SignStatus="Valid" />
    ${form.isVkRequired ? '<eln:Signature Role="VkChairperson" SignStatus="Valid" />' : ''}
    <eln:Signature Role="MedicalOrgUkep" SignStatus="Valid" />
  </eln:DigitalSignatures>
</eln:SickLeaveDocument>`;
}

/**
 * Generates typed JSON Payload for statutory API / EGISZ gateway
 */
export function generateElnJsonPayload(form: SickLeaveFormState, patient: SickLeavePatientData) {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);
	return {
		schemaVersion: '2.0-1089n',
		elnNumber: form.elnNumber,
		issueDate: form.issueDate,
		isDuplicate: form.isDuplicate,
		prevElnNumber: form.prevElnNumber || null,
		medicalOrganization: {
			name: form.organizationName || DEFAULT_CLINIC_NAME,
			ogrn: form.organizationOgrn || DEFAULT_CLINIC_OGRN,
			address: form.organizationAddress || DEFAULT_CLINIC_ADDRESS,
			licence: form.medicalLicenceNumber || DEFAULT_CLINIC_LICENCE
		},
		patient: {
			fio: patient.patientFio,
			birthDate: patient.patientBirthDate,
			gender: patient.patientGender,
			snils: patient.patientSnils,
			omsNumber: patient.patientOmsNumber || null,
			employer: patient.employerName,
			isPrimaryWorkplace: patient.isPrimaryWorkplace
		},
		clinicalData: {
			reasonCode: form.reasonCode,
			reasonTitle: INCAPACITY_REASON_CODES[form.reasonCode]?.titleRu || '',
			regimeType: form.regimeType,
			icd10Code: form.icd10Code,
			diagnosisText: form.diagnosisText,
			totalIncapacityDays: totalDays
		},
		periods: form.periods.map((p, idx) => ({
			index: idx + 1,
			dateFrom: p.dateFrom,
			dateTo: p.dateTo,
			days: calculateDaysBetween(p.dateFrom, p.dateTo),
			doctorRole: p.doctorRole,
			doctorFio: p.doctorFio,
			doctorSpecialty: p.doctorSpecialty,
			doctorSnils: p.doctorSnils,
			vkChairpersonFio: p.vkChairpersonFio || null,
			vkChairpersonSnils: p.vkChairpersonSnils || null,
			vkProtocolNumber: p.vkProtocolNumber || null
		})),
		medicalCommission:
			form.isVkRequired && form.vkProtocol
				? {
						protocolNumber: form.vkProtocol.protocolNumber,
						protocolDate: form.vkProtocol.protocolDate,
						chairpersonFio: form.vkProtocol.chairpersonFio,
						chairpersonSnils: form.vkProtocol.chairpersonSnils,
						substantiation: form.vkProtocol.clinicalSubstantiation,
						expertDecision: form.vkProtocol.expertDecision,
						members: form.vkProtocol.memberFios
					}
				: null,
		regimeViolation:
			form.violationCode && form.violationDate
				? {
						code: form.violationCode,
						description: REGIME_VIOLATION_CODES[form.violationCode]?.titleRu || '',
						date: form.violationDate
					}
				: null,
		closing: {
			code: form.closingCode,
			title: SICK_LEAVE_CLOSING_CODES[form.closingCode]?.titleRu || '',
			workResumeDate: form.workResumeDate || null,
			nextElnNumber: form.nextElnNumber || null
		}
	};
}

/**
 * Generates an official Form 036/u entry (Журнал учета клинико-экспертной работы)
 */
export function generateForm036uEntry(
	form: SickLeaveFormState,
	patient: SickLeavePatientData,
	medicalCardNumber = '043-у/2026-08'
): Form036uEntry {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);
	const firstDate = form.periods[0]?.dateFrom || form.issueDate;
	const lastDate = form.periods[form.periods.length - 1]?.dateTo || form.issueDate;
	const periodText = `с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)} (${totalDays} кал. дн.)`;

	const isVk = form.isVkRequired && !!form.vkProtocol;
	const entryNum = isVk ? form.vkProtocol?.protocolNumber || '1' : `ВН-${form.elnNumber.slice(-4)}`;
	const entryDate = isVk ? form.vkProtocol?.protocolDate || form.issueDate : form.issueDate;

	const vkReason = isVk
		? `Продление временной нетрудоспособности свыше 15 дней по Приказу Минздрава № 1089н при тяжелом течении (${form.icd10Code}).`
		: `Экспертиза временной нетрудоспособности лечащим врачом единолично (до 15 дн.).`;

	const vkDecision = isVk
		? form.vkProtocol?.expertDecision ||
			`Продлить ЭЛН № ${form.elnNumber} с ${formatDateRu(form.vkProtocol?.extensionDateFrom || firstDate)} по ${formatDateRu(form.vkProtocol?.extensionDateTo || lastDate)}. Повторный осмотр ВК ${formatDateRu(form.vkProtocol?.nextReviewDate || lastDate)}.`
		: `Выдать ЭЛН № ${form.elnNumber} на срок ${totalDays} дн. с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)}. Режим: ${form.regimeType === 'ambulatory' ? 'Амбулаторный' : 'Стационарный'}.`;

	const chairperson = isVk ? form.vkProtocol?.chairpersonFio || 'Иванова Е.В.' : form.periods[0]?.doctorFio || 'Соколов А.М.';
	const members = isVk ? form.vkProtocol?.memberFios || ['Смирнов П.А.', 'Кузнецова О.Д.'] : [];

	return {
		entryNumber: entryNum,
		date: formatDateRu(entryDate),
		patientFio: patient.patientFio,
		birthDate: formatDateRu(patient.patientBirthDate),
		snils: patient.patientSnils,
		medicalCardNumber,
		diagnosis: form.diagnosisText,
		icd10: form.icd10Code,
		sickLeaveNumber: form.elnNumber,
		incapacityPeriodText: periodText,
		totalDays,
		vkReason,
		vkDecisionText: vkDecision,
		chairpersonSign: chairperson,
		membersSign: members
	};
}

/**
 * Generates Printable Patient Certificate / Memo (Памятка пациенту о номере электронного листка нетрудоспособности)
 */
export function generateSickLeavePatientMemoHtml(form: SickLeaveFormState, patient: SickLeavePatientData): string {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);
	const firstDate = form.periods[0]?.dateFrom || form.issueDate;
	const lastDate = form.periods[form.periods.length - 1]?.dateTo || form.issueDate;
	const attendingDoctor = form.periods[0]?.doctorFio || 'Врач-стоматолог';
	const reasonTitle = INCAPACITY_REASON_CODES[form.reasonCode]?.titleRu || '01 - Заболевание';
	const closingTitle = SICK_LEAVE_CLOSING_CODES[form.closingCode]?.titleRu || '31 - Приступить к работе';
	const elnQrUrl = `https://www.gosuslugi.ru/eln/${encodeURIComponent(form.elnNumber)}`;
	const elnQrSvg = generateQrCodeSvg(elnQrUrl, { size: 54, margin: 1, title: `QR-код проверки ЭЛН № ${form.elnNumber}` });

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Памятка пациенту - ЭЛН № ${form.elnNumber}</title>
  <style>
    @page { size: A5 landscape; margin: 10mm; }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      font-size: 12px;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 12px;
      line-height: 1.4;
    }
    .memo-container {
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 16px;
      position: relative;
    }
    .memo-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .org-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f766e;
      text-transform: uppercase;
    }
    .org-sub {
      font-size: 10px;
      color: #64748b;
    }
    .eln-badge {
      background: #0f766e;
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1px;
      text-align: right;
    }
    .title-block {
      text-align: center;
      margin: 10px 0;
    }
    .main-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 10px;
      color: #475569;
    }
    .data-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-bottom: 12px;
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .data-item {
      display: flex;
      flex-direction: column;
    }
    .data-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    .data-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .periods-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11px;
    }
    .periods-table th {
      background: #e6fffa;
      color: #0f766e;
      border: 1px solid #cbd5e1;
      padding: 5px;
      text-align: left;
    }
    .periods-table td {
      border: 1px solid #cbd5e1;
      padding: 5px;
    }
    .qr-info-box {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #f0fdfa;
      border: 1px dashed #0f766e;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .qr-box {
      width: 54px;
      height: 54px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .qr-box svg {
      width: 54px;
      height: 54px;
    }
    .qr-text {
      font-size: 10px;
      color: #334155;
    }
    .memo-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      width: 160px;
      display: inline-block;
      margin-left: 6px;
    }
  </style>
</head>
<body>
  <div class="memo-container">
    <div class="memo-header">
      <div>
        <div class="org-title">${escapeXml(form.organizationName || DEFAULT_CLINIC_NAME)}</div>
        <div class="org-sub">ОГРН: ${escapeXml(form.organizationOgrn || DEFAULT_CLINIC_OGRN)} | Лицензия: ${escapeXml(form.medicalLicenceNumber || DEFAULT_CLINIC_LICENCE)}</div>
      </div>
      <div class="eln-badge">
        № ${escapeXml(form.elnNumber)}
      </div>
    </div>

    <div class="title-block">
      <div class="main-title">ПАМЯТКА ПАЦИЕНТУ О ВЫДАЧЕ ЭЛЕКТРОННОГО ЛИСТКА НЕТРУДОСПОСОБНОСТИ (ЭЛН)</div>
      <div class="sub-title">Сформирован в соответствии с Приказом Минздрава России № 1089н для передачи работодателю и в СФР</div>
    </div>

    <div class="data-grid">
      <div class="data-item">
        <span class="data-label">ФИО Пациента</span>
        <span class="data-val">${escapeXml(patient.patientFio)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">СНИЛС / Дата рождения</span>
        <span class="data-val">${escapeXml(patient.patientSnils)} / ${formatDateRu(patient.patientBirthDate)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Место работы</span>
        <span class="data-val">${escapeXml(patient.employerName)} (${patient.isPrimaryWorkplace ? 'Основное' : 'По совместительству'})</span>
      </div>
      <div class="data-item">
        <span class="data-label">Причина нетрудоспособности</span>
        <span class="data-val">${escapeXml(reasonTitle)} (${escapeXml(form.icd10Code)})</span>
      </div>
    </div>

    <table class="periods-table">
      <thead>
        <tr>
          <th>Период освобождения от работы</th>
          <th>Дней</th>
          <th>Режим</th>
          <th>Врач / Специальность</th>
          <th>Обоснование / ВК</th>
        </tr>
      </thead>
      <tbody>
        ${form.periods
					.map(
						(p) => `<tr>
          <td><strong>с ${formatDateRu(p.dateFrom)} по ${formatDateRu(p.dateTo)}</strong></td>
          <td>${calculateDaysBetween(p.dateFrom, p.dateTo)}</td>
          <td>${form.regimeType === 'ambulatory' ? 'Амбулаторный' : 'Стационарный'}</td>
          <td>${escapeXml(p.doctorFio)} (${escapeXml(p.doctorSpecialty)})</td>
          <td>${p.vkProtocolNumber ? `Протокол ВК № ${escapeXml(p.vkProtocolNumber)}` : 'Единолично лечащим врачом'}</td>
        </tr>`
					)
					.join('')}
      </tbody>
    </table>

    <div class="qr-info-box">
      <div class="qr-box">${elnQrSvg}</div>
      <div class="qr-text">
        <strong>Информация для пациента и работодателя:</strong><br/>
        Электронный больничный автоматически зарегистрирован в ЕИИС «Соцстрах» (СФР). Для назначения пособия сообщите номер ЭЛН <strong>${escapeXml(form.elnNumber)}</strong> в бухгалтерию/отдел кадров работодателя. Статус больничного и расчет выплат доступны в личном кабинете на портале <strong>Госуслуги</strong>.
      </div>
    </div>

    <div class="data-grid" style="margin-bottom: 6px;">
      <div class="data-item">
        <span class="data-label">Итоговый статус ЭЛН</span>
        <span class="data-val">${escapeXml(closingTitle)}</span>
      </div>
      <div class="data-item">
        <span class="data-label">Приступить к работе с:</span>
        <span class="data-val" style="color: #0f766e; font-size: 13px;">${form.workResumeDate ? formatDateRu(form.workResumeDate) : '—'}</span>
      </div>
    </div>

    <div class="memo-footer">
      <div>
        Лечащий врач: <strong>${escapeXml(attendingDoctor)}</strong> <span class="sign-line"></span>
      </div>
      <div>
        М.П. Клиники (Подпись / ЭЦП сформирована)
      </div>
      <div>
        Дата выдачи: ${formatDateRu(form.issueDate)}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Formats a concise summary for insertion into Dental EMR 043/u diary
 */
export function generateEmrDiarySnippet(form: SickLeaveFormState, patient: SickLeavePatientData): string {
	const totalDays = form.periods.reduce((acc, p) => acc + calculateDaysBetween(p.dateFrom, p.dateTo), 0);
	const firstDate = form.periods[0]?.dateFrom || form.issueDate;
	const lastDate = form.periods[form.periods.length - 1]?.dateTo || form.issueDate;

	let snippet = `[ЭКСПЕРТИЗА ВРЕМЕННОЙ НЕТРУДОСПОСОБНОСТИ (ЭЛН)]\n`;
	snippet += `Оформлен ЭЛН № ${form.elnNumber} (Приказ Минздрава РФ № 1089н).\n`;
	snippet += `Причина ВН: код ${form.reasonCode} (${form.icd10Code} - ${form.diagnosisText}).\n`;
	snippet += `Период освобождения от работы: с ${formatDateRu(firstDate)} по ${formatDateRu(lastDate)} (продолжительность: ${totalDays} кал. дн.). Режим: ${form.regimeType === 'ambulatory' ? 'амбулаторный' : 'стационарный'}.\n`;

	if (form.isVkRequired && form.vkProtocol) {
		snippet += `Решение Врачебной комиссии (ВК): Протокол № ${form.vkProtocol.protocolNumber} от ${formatDateRu(form.vkProtocol.protocolDate)}. Обоснование: ${form.vkProtocol.clinicalSubstantiation}. Председатель ВК: ${form.vkProtocol.chairpersonFio}.\n`;
	}

	if (form.violationCode && form.violationDate) {
		snippet += `Отметка о нарушении режима: код ${form.violationCode} от ${formatDateRu(form.violationDate)}.\n`;
	}

	if (form.closingCode === '31' && form.workResumeDate) {
		snippet += `Исход: статус 31 (Приступить к работе с ${formatDateRu(form.workResumeDate)}). Трудоспособность восстановлена.\n`;
	} else if (form.closingCode === '32') {
		snippet += `Исход: статус 32 (Продолжает болеть, выдан новый ЭЛН ${form.nextElnNumber || ''}).\n`;
	}

	snippet += `Место работы: ${patient.employerName}. Памятка пациенту выдана. ЭЛН передан в СФР/ЕГИСЗ.`;
	return snippet;
}

function escapeXml(unsafe: string): string {
	if (!unsafe) return '';
	return unsafe
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}
