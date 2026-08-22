import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
	INCAPACITY_REASON_CODES,
	SICK_LEAVE_CLOSING_CODES,
	REGIME_VIOLATION_CODES,
	DENTAL_CLINICAL_PRESETS,
	DEFAULT_COMMISSION_PRESETS
} from '../components/documents/sickLeave/sickLeaveElnPresets';

import {
	SINGLE_DOCTOR_MAX_DAYS,
	calculateDaysBetween,
	formatDateRu,
	addDays,
	calculateSickLeaveDates,
	generateElnNumber,
	validateSickLeaveDuration,
	generateElnXmlPayload,
	generateElnJsonPayload,
	generateForm036uEntry,
	generateSickLeavePatientMemoHtml,
	generateEmrDiarySnippet,
	SickLeaveFormState,
	SickLeavePatientData,
	IncapacityPeriod,
	MedicalCommissionProtocol
} from '../components/documents/sickLeave/sickLeaveElnEngine';

describe('Statutory Electronic Sick Leave (ЭЛН) & Medical Commission (Order № 1089н) Suite', () => {

	describe('1. Statutory Constants & Dental Clinical Presets', () => {
		it('verifies statutory SFR/FSS incapacity reason codes', () => {
			assert.equal(INCAPACITY_REASON_CODES['01'].code, '01');
			assert.ok(INCAPACITY_REASON_CODES['01'].titleRu.includes('01 - Заболевание'));
			assert.equal(INCAPACITY_REASON_CODES['01'].isDentalCommon, true);

			assert.equal(INCAPACITY_REASON_CODES['02'].code, '02');
			assert.ok(INCAPACITY_REASON_CODES['02'].titleRu.includes('02 - Травма'));
			assert.equal(INCAPACITY_REASON_CODES['02'].isDentalCommon, true);

			assert.equal(INCAPACITY_REASON_CODES['08'].code, '08');
			assert.ok(INCAPACITY_REASON_CODES['08'].titleRu.includes('08 - Долечивание'));
		});

		it('verifies statutory closing and violation codes', () => {
			assert.equal(SICK_LEAVE_CLOSING_CODES['31'].code, '31');
			assert.equal(SICK_LEAVE_CLOSING_CODES['31'].requiresResumeDate, true);
			assert.equal(SICK_LEAVE_CLOSING_CODES['32'].requiresNextElnNumber, true);

			assert.equal(REGIME_VIOLATION_CODES['24'].code, '24');
			assert.ok(REGIME_VIOLATION_CODES['24'].titleRu.includes('Несвоевременная явка'));
		});

		it('verifies dental clinical duration norms for standard conditions', () => {
			const periostitis = DENTAL_CLINICAL_PRESETS.acute_purulent_periostitis;
			assert.ok(periostitis);
			assert.equal(periostitis.icd10Code, 'K10.2');
			assert.equal(periostitis.reasonCode, '01');
			assert.equal(periostitis.defaultDays, 5);
			assert.equal(periostitis.isVkMandatory, false);

			const extraction = DENTAL_CLINICAL_PRESETS.atypical_impacted_extraction;
			assert.ok(extraction);
			assert.equal(extraction.icd10Code, 'K01.1');
			assert.equal(extraction.defaultDays, 4);

			const sinusitis = DENTAL_CLINICAL_PRESETS.odontogenic_sinusitis_perforation;
			assert.ok(sinusitis);
			assert.equal(sinusitis.icd10Code, 'T81.2');
			assert.equal(sinusitis.defaultDays, 8);
		});

		it('verifies osteomyelitis preset requires mandatory Medical Commission (ВК) extension > 15 days', () => {
			const osteo = DENTAL_CLINICAL_PRESETS.osteomyelitis_subacute_vk;
			assert.ok(osteo);
			assert.equal(osteo.icd10Code, 'K10.2');
			assert.equal(osteo.defaultDays, 18);
			assert.equal(osteo.isVkMandatory, true);
			assert.ok(osteo.defaultDays > SINGLE_DOCTOR_MAX_DAYS);
		});

		it('verifies maxillofacial trauma preset uses reason code 02', () => {
			const trauma = DENTAL_CLINICAL_PRESETS.maxillofacial_trauma_fracture;
			assert.ok(trauma);
			assert.equal(trauma.icd10Code, 'S03.2');
			assert.equal(trauma.reasonCode, '02');
			assert.equal(trauma.defaultDays, 12);
		});

		it('verifies default medical commission hierarchy preset', () => {
			assert.equal(DEFAULT_COMMISSION_PRESETS.length, 4);
			const chair = DEFAULT_COMMISSION_PRESETS[0];
			assert.ok(chair);
			assert.equal(chair.role, 'CHAIRPERSON');
			assert.ok(chair.fio.length > 0);
			assert.ok(chair.snils.length > 0);
		});
	});

	describe('2. Date Calculations & Calendar Utilities', () => {
		it('calculates inclusive calendar days accurately', () => {
			assert.equal(calculateDaysBetween('2026-08-01', '2026-08-01'), 1);
			assert.equal(calculateDaysBetween('2026-08-01', '2026-08-05'), 5);
			assert.equal(calculateDaysBetween('2026-08-01', '2026-08-15'), 15);
			assert.equal(calculateDaysBetween('2026-08-10', '2026-08-05'), 0); // inverted
		});

		it('formats date strings to Russian DD.MM.YYYY', () => {
			assert.equal(formatDateRu('2026-08-22'), '22.08.2026');
			assert.equal(formatDateRu('1988-05-14'), '14.05.1988');
			assert.equal(formatDateRu(''), '');
		});

		it('adds calendar days across month boundaries', () => {
			assert.equal(addDays('2026-08-22', 1), '2026-08-23');
			assert.equal(addDays('2026-08-28', 5), '2026-09-02');
			assert.equal(addDays('2026-12-30', 3), '2027-01-02');
		});

		it('calculates standard sick leave date package', () => {
			const res = calculateSickLeaveDates('2026-08-10', 5);
			assert.equal(res.dateFrom, '2026-08-10');
			assert.equal(res.dateTo, '2026-08-14');
			assert.equal(res.totalDays, 5);
			assert.equal(res.workResumeDate, '2026-08-15');
			assert.equal(res.nextAppointmentDate, '2026-08-14');
		});

		it('generates a 12-digit statutory ELN number', () => {
			const eln = generateElnNumber('999');
			assert.equal(eln.length, 12);
			assert.ok(eln.startsWith('999'));
			assert.match(eln, /^\d{12}$/);
		});
	});

	describe('3. Order 1089n 15-Day Single-Doctor Limit Validation', () => {
		it('passes validation for standard 5-day sick leave under single doctor limit', () => {
			const form: SickLeaveFormState = {
				elnNumber: '999123456789',
				issueDate: '2026-08-10',
				isDuplicate: false,
				reasonCode: '01',
				regimeType: 'ambulatory',
				icd10Code: 'K10.2',
				diagnosisText: 'Острый гнойный периостит',
				periods: [
					{
						id: 'p-1',
						dateFrom: '2026-08-10',
						dateTo: '2026-08-14',
						doctorSpecialty: 'Врач-стоматолог-хирург',
						doctorFio: 'Соколов А.М.',
						doctorSnils: '139-204-857 44',
						doctorRole: 'attending'
					}
				],
				closingCode: '31',
				workResumeDate: '2026-08-15',
				isVkRequired: false,
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				organizationOgrn: '1187746123456',
				organizationAddress: 'г. Москва, ул. Тверская, 18',
				medicalLicenceNumber: 'ЛО-77-01-020894'
			};

			const val = validateSickLeaveDuration(form);
			assert.equal(val.isValid, true);
			assert.equal(val.totalDays, 5);
			assert.equal(val.isVkRequired, false);
			assert.equal(val.singleDoctorLimitExceeded, false);
			assert.equal(val.errors.length, 0);
		});

		it('blocks validation when sick leave exceeds 15 days without VK protocol', () => {
			const form: SickLeaveFormState = {
				elnNumber: '999123456789',
				issueDate: '2026-08-01',
				isDuplicate: false,
				reasonCode: '01',
				regimeType: 'ambulatory',
				icd10Code: 'K10.2',
				diagnosisText: 'Подострый остеомиелит челюсти',
				periods: [
					{
						id: 'p-1',
						dateFrom: '2026-08-01',
						dateTo: '2026-08-15',
						doctorSpecialty: 'Врач-стоматолог-хирург',
						doctorFio: 'Соколов А.М.',
						doctorSnils: '139-204-857 44',
						doctorRole: 'attending'
					},
					{
						id: 'p-2',
						dateFrom: '2026-08-16',
						dateTo: '2026-08-20',
						doctorSpecialty: 'Врач-стоматолог-хирург',
						doctorFio: 'Соколов А.М.',
						doctorSnils: '139-204-857 44',
						doctorRole: 'attending'
					}
				],
				closingCode: '31',
				workResumeDate: '2026-08-21',
				isVkRequired: false, // NOT activated
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				organizationOgrn: '1187746123456',
				organizationAddress: 'г. Москва, ул. Тверская, 18',
				medicalLicenceNumber: 'ЛО-77-01-020894'
			};

			const val = validateSickLeaveDuration(form);
			assert.equal(val.isValid, false);
			assert.equal(val.totalDays, 20);
			assert.equal(val.singleDoctorLimitExceeded, true);
			assert.ok(val.errors.some((e) => e.includes('15-дневный лимит единоличной экспертизы')));
		});

		it('allows extension > 15 days when valid VK protocol is supplied', () => {
			const vkProtocol: MedicalCommissionProtocol = {
				protocolNumber: 'ВК-84/2026',
				protocolDate: '2026-08-15',
				chairpersonFio: 'Иванова Е.В.',
				chairpersonSpecialty: 'Главный врач',
				chairpersonSnils: '142-876-543 89',
				memberFios: ['Смирнов П.А.', 'Соколов А.М.'],
				attendingDoctorFio: 'Соколов А.М.',
				clinicalDiagnosis: 'Подострый остеомиелит нижней челюсти',
				icd10Code: 'K10.2',
				clinicalSubstantiation: 'Затяжное течение воспалительного процесса, секвестрация костной ткани.',
				expertDecision: 'Продлить ЭЛН на 5 календарных дней с 16.08.2026 по 20.08.2026.',
				extensionDays: 5,
				extensionDateFrom: '2026-08-16',
				extensionDateTo: '2026-08-20'
			};

			const form: SickLeaveFormState = {
				elnNumber: '999123456789',
				issueDate: '2026-08-01',
				isDuplicate: false,
				reasonCode: '01',
				regimeType: 'ambulatory',
				icd10Code: 'K10.2',
				diagnosisText: 'Подострый остеомиелит челюсти',
				periods: [
					{
						id: 'p-1',
						dateFrom: '2026-08-01',
						dateTo: '2026-08-15',
						doctorSpecialty: 'Врач-стоматолог-хирург',
						doctorFio: 'Соколов А.М.',
						doctorSnils: '139-204-857 44',
						doctorRole: 'attending'
					},
					{
						id: 'p-2',
						dateFrom: '2026-08-16',
						dateTo: '2026-08-20',
						doctorSpecialty: 'Врач-стоматолог-хирург',
						doctorFio: 'Соколов А.М.',
						doctorSnils: '139-204-857 44',
						doctorRole: 'vk_member',
						vkChairpersonFio: 'Иванова Е.В.',
						vkChairpersonSnils: '142-876-543 89',
						vkProtocolNumber: 'ВК-84/2026',
						vkProtocolDate: '2026-08-15'
					}
				],
				closingCode: '31',
				workResumeDate: '2026-08-21',
				isVkRequired: true,
				vkProtocol,
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				organizationOgrn: '1187746123456',
				organizationAddress: 'г. Москва, ул. Тверская, 18',
				medicalLicenceNumber: 'ЛО-77-01-020894'
			};

			const val = validateSickLeaveDuration(form);
			assert.equal(val.isValid, true);
			assert.equal(val.totalDays, 20);
			assert.equal(val.isVkRequired, true);
			assert.equal(val.singleDoctorLimitExceeded, true);
			assert.equal(val.errors.length, 0);
			assert.ok(val.infoMessages.some((m) => m.includes('Протокол ВК № ВК-84/2026')));
		});

		it('detects inverted date ranges inside periods', () => {
			const form: SickLeaveFormState = {
				elnNumber: '999123456789',
				issueDate: '2026-08-10',
				isDuplicate: false,
				reasonCode: '01',
				regimeType: 'ambulatory',
				icd10Code: 'K10.2',
				diagnosisText: 'Периостит',
				periods: [
					{
						id: 'p-1',
						dateFrom: '2026-08-15',
						dateTo: '2026-08-10', // inverted!
						doctorSpecialty: 'Врач-стоматолог',
						doctorFio: 'Соколов А.М.',
						doctorSnils: '139-204-857 44',
						doctorRole: 'attending'
					}
				],
				closingCode: '31',
				workResumeDate: '2026-08-16',
				isVkRequired: false,
				organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
				organizationOgrn: '1187746123456',
				organizationAddress: 'г. Москва',
				medicalLicenceNumber: 'ЛО-77'
			};

			const val = validateSickLeaveDuration(form);
			assert.equal(val.isValid, false);
			assert.ok(val.errors.some((e) => e.includes('предшествует дате начала')));
		});
	});

	describe('4. Statutory XML / JSON Generation & SEMD Schema Compliance', () => {
		const samplePatient: SickLeavePatientData = {
			patientFio: 'Петров Петр Сергеевич',
			patientBirthDate: '1990-03-25',
			patientGender: 'male',
			patientSnils: '162-738-495 88',
			patientOmsNumber: '7753210984005678',
			employerName: 'ПАО Сбербанк & Ко',
			isPrimaryWorkplace: true
		};

		const sampleForm: SickLeaveFormState = {
			elnNumber: '999384910284',
			issueDate: '2026-08-10',
			isDuplicate: false,
			reasonCode: '01',
			regimeType: 'ambulatory',
			icd10Code: 'K01.1',
			diagnosisText: 'Атипичная экстракция ретинированного зуба 3.8',
			periods: [
				{
					id: 'p-1',
					dateFrom: '2026-08-10',
					dateTo: '2026-08-13',
					doctorSpecialty: 'Врач-стоматолог-хирург',
					doctorFio: 'Соколов А.М.',
					doctorSnils: '139-204-857 44',
					doctorRole: 'attending'
				}
			],
			closingCode: '31',
			workResumeDate: '2026-08-14',
			isVkRequired: false,
			organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
			organizationOgrn: '1187746123456',
			organizationAddress: 'г. Москва, ул. Тверская-Ямская, 18',
			medicalLicenceNumber: 'ЛО-77-01-020894'
		};

		it('generates valid SFR/FSS XML document with escaped characters', () => {
			const xml = generateElnXmlPayload(sampleForm, samplePatient);
			assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
			assert.ok(xml.includes('<eln:SickLeaveDocument xmlns:eln="http://www.fss.ru/eln/v2"'));
			assert.ok(xml.includes('<eln:ElnNumber>999384910284</eln:ElnNumber>'));
			assert.ok(xml.includes('<eln:Icd10Code>K01.1</eln:Icd10Code>'));
			assert.ok(xml.includes('&amp;')); // Escaped ampersand from employer name
			assert.ok(xml.includes('<eln:IncapacityPeriods TotalDays="4">'));
			assert.ok(xml.includes('<eln:ClosingCode>31</eln:ClosingCode>'));
			assert.ok(xml.includes('<eln:WorkResumeDate>2026-08-14</eln:WorkResumeDate>'));
		});

		it('generates typed JSON payload matching EGISZ gateway contract', () => {
			const json = generateElnJsonPayload(sampleForm, samplePatient);
			assert.equal(json.elnNumber, '999384910284');
			assert.equal(json.patient.fio, 'Петров Петр Сергеевич');
			assert.equal(json.clinicalData.totalIncapacityDays, 4);
			assert.equal(json.closing.code, '31');
			assert.equal(json.closing.workResumeDate, '2026-08-14');
		});
	});

	describe('5. Clinical Register Form 036/u, Patient Memo & EMR Snippet', () => {
		const samplePatient: SickLeavePatientData = {
			patientFio: 'Сидорова Анна Викторовна',
			patientBirthDate: '1995-11-03',
			patientGender: 'female',
			patientSnils: '173-902-841 77',
			employerName: 'ООО "АльфаТрейд"',
			isPrimaryWorkplace: true
		};

		const sampleForm: SickLeaveFormState = {
			elnNumber: '999847291039',
			issueDate: '2026-08-12',
			isDuplicate: false,
			reasonCode: '01',
			regimeType: 'ambulatory',
			icd10Code: 'T81.2',
			diagnosisText: 'Перфорация дна гайморовой пазухи, пластика соустья',
			periods: [
				{
					id: 'p-1',
					dateFrom: '2026-08-12',
					dateTo: '2026-08-19',
					doctorSpecialty: 'Врач-стоматолог-хирург',
					doctorFio: 'Соколов А.М.',
					doctorSnils: '139-204-857 44',
					doctorRole: 'attending'
				}
			],
			closingCode: '31',
			workResumeDate: '2026-08-20',
			isVkRequired: false,
			organizationName: 'ООО "ДЕНТЕ КЛИНИК"',
			organizationOgrn: '1187746123456',
			organizationAddress: 'г. Москва, ул. Тверская-Ямская, 18',
			medicalLicenceNumber: 'ЛО-77-01-020894'
		};

		it('formats Form 036/u clinical-expert journal record', () => {
			const entry = generateForm036uEntry(sampleForm, samplePatient, '043-у/2026-88');
			assert.equal(entry.patientFio, 'Сидорова Анна Викторовна');
			assert.equal(entry.snils, '173-902-841 77');
			assert.equal(entry.icd10, 'T81.2');
			assert.equal(entry.totalDays, 8);
			assert.equal(entry.medicalCardNumber, '043-у/2026-88');
			assert.ok(entry.incapacityPeriodText.includes('с 12.08.2026 по 19.08.2026'));
		});

		it('generates printable patient memo HTML with Gosuslugi reference', () => {
			const html = generateSickLeavePatientMemoHtml(sampleForm, samplePatient);
			assert.ok(html.includes('ПАМЯТКА ПАЦИЕНТУ О ВЫДАЧЕ ЭЛЕКТРОННОГО ЛИСТКА НЕТРУДОСПОСОБНОСТИ'));
			assert.ok(html.includes('№ 999847291039'));
			assert.ok(html.includes('Сидорова Анна Викторовна'));
			assert.ok(html.includes('Госуслуги'));
			assert.ok(html.includes('20.08.2026'));
		});

		it('generates clinical diary snippet for Form 043/u integration', () => {
			const snippet = generateEmrDiarySnippet(sampleForm, samplePatient);
			assert.ok(snippet.includes('[ЭКСПЕРТИЗА ВРЕМЕННОЙ НЕТРУДОСПОСОБНОСТИ (ЭЛН)]'));
			assert.ok(snippet.includes('Оформлен ЭЛН № 999847291039'));
			assert.ok(snippet.includes('T81.2'));
			assert.ok(snippet.includes('продолжительность: 8 кал. дн.'));
			assert.ok(snippet.includes('Приступить к работе с 20.08.2026'));
		});
	});
});
