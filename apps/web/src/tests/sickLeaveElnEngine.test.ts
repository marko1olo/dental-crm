import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateDaysBetween,
	formatDateRu,
	addDays,
	calculateSickLeaveDates,
	validateSickLeaveDuration,
	generateElnXmlPayload,
	generateElnJsonPayload,
	generateForm036uEntry,
	generateEmrDiarySnippet,
	SINGLE_DOCTOR_MAX_DAYS,
	type SickLeaveFormState,
	type SickLeavePatientData,
} from "../components/documents/sickLeave/sickLeaveElnEngine";

const MOCK_PATIENT: SickLeavePatientData = {
	patientFio: "Ковалев Андрей Сергеевич",
	patientBirthDate: "1987-03-24",
	patientGender: "male",
	patientSnils: "154-890-123 45",
	patientOmsNumber: "7756123490871234",
	employerName: "ООО «ТехноПром»",
	isPrimaryWorkplace: true,
	patientPhone: "+7 (916) 111-22-33",
};

const BASE_ELN_FORM: SickLeaveFormState = {
	elnNumber: "999123456789",
	issueDate: "2026-08-01",
	isDuplicate: false,
	reasonCode: "01",
	regimeType: "ambulatory",
	icd10Code: "K04.7",
	diagnosisText: "Периостит челюсти острый гнойный (флегмона)",
	periods: [
		{
			id: "p1",
			dateFrom: "2026-08-01",
			dateTo: "2026-08-10",
			doctorSpecialty: "Врач-стоматолог-хирург",
			doctorFio: "Кузнецов Д.И.",
			doctorSnils: "123-456-789 00",
			doctorRole: "attending",
		},
	],
	closingCode: "31",
	workResumeDate: "2026-08-11",
	isVkRequired: false,
	organizationName: "ООО «ДЕНТЕ КЛИНИК»",
	organizationOgrn: "1187746123456",
	organizationAddress: "г. Москва, ул. Усачёва, д. 29",
	medicalLicenceNumber: "ЛО-77-01-021456",
};

describe("Sick Leave (ЭЛН) & Medical Commission (ВК) Engine — Order 1089n", () => {
	it("calculates calendar days and date spans correctly", () => {
		assert.equal(calculateDaysBetween("2026-08-01", "2026-08-10"), 10);
		assert.equal(calculateDaysBetween("2026-08-01", "2026-08-01"), 1);
		assert.equal(formatDateRu("2026-08-01"), "01.08.2026");
		assert.equal(addDays("2026-08-01", 9), "2026-08-10");
	});

	it("approves single doctor ELN duration within 15-day limit without Medical Commission", () => {
		const result = validateSickLeaveDuration(BASE_ELN_FORM);
		assert.equal(result.isValid, true);
		assert.equal(result.totalDays, 10);
		assert.equal(result.singleDoctorLimitExceeded, false);
		assert.equal(result.isVkRequired, false);
		assert.equal(result.errors.length, 0);
	});

	it("strictly requires Medical Commission (ВК) protocol when duration exceeds 15 days", () => {
		const longForm: SickLeaveFormState = {
			...BASE_ELN_FORM,
			periods: [
				{
					id: "p1",
					dateFrom: "2026-08-01",
					dateTo: "2026-08-15", // 15 days
					doctorSpecialty: "Врач-стоматолог-хирург",
					doctorFio: "Кузнецов Д.И.",
					doctorSnils: "123-456-789 00",
					doctorRole: "attending",
				},
				{
					id: "p2",
					dateFrom: "2026-08-16",
					dateTo: "2026-08-25", // 10 days, total = 25 days
					doctorSpecialty: "Врач-стоматолог-хирург",
					doctorFio: "Кузнецов Д.И.",
					doctorSnils: "123-456-789 00",
					doctorRole: "vk_member",
				},
			],
			workResumeDate: "2026-08-26",
			isVkRequired: false, // Not set yet
		};

		const result = validateSickLeaveDuration(longForm);
		assert.equal(result.isValid, false);
		assert.equal(result.totalDays, 25);
		assert.equal(result.singleDoctorLimitExceeded, true);
		assert.equal(result.isVkRequired, true);
		assert.ok(result.errors.some((e) => e.includes("превышает установленный законом 15-дневный лимит")));
	});

	it("validates Medical Commission (ВК) extension when complete protocol is supplied", () => {
		const longFormWithVk: SickLeaveFormState = {
			...BASE_ELN_FORM,
			periods: [
				{
					id: "p1",
					dateFrom: "2026-08-01",
					dateTo: "2026-08-15",
					doctorSpecialty: "Врач-стоматолог-хирург",
					doctorFio: "Кузнецов Д.И.",
					doctorSnils: "123-456-789 00",
					doctorRole: "attending",
				},
				{
					id: "p2",
					dateFrom: "2026-08-16",
					dateTo: "2026-08-25",
					doctorSpecialty: "Врач-стоматолог-хирург",
					doctorFio: "Кузнецов Д.И.",
					doctorSnils: "123-456-789 00",
					doctorRole: "vk_member",
					vkChairpersonFio: "Иванова Е.В.",
					vkChairpersonSnils: "111-222-333 44",
					vkProtocolNumber: "ВК-2026/89",
					vkProtocolDate: "2026-08-15",
				},
			],
			isVkRequired: true,
			vkProtocol: {
				protocolNumber: "ВК-2026/89",
				protocolDate: "2026-08-15",
				chairpersonFio: "Иванова Елена Владимировна",
				chairpersonSpecialty: "Главный врач / Председатель ВК",
				chairpersonSnils: "111-222-333 44",
				memberFios: ["Кузнецов Д.И.", "Волкова Е.С."],
				attendingDoctorFio: "Кузнецов Д.И.",
				clinicalDiagnosis: "Одонтогенный остеомиелит нижней челюсти в стадии реконвалесценции",
				icd10Code: "K10.2",
				clinicalSubstantiation: "Тяжелое течение одонтогенного воспалительного процесса после вскрытия абсцесса, выраженная контрактура жевательных мышц III степени, сохранение интоксикационного синдрома.",
				expertDecision: "Продлить листок нетрудоспособности единогласно решением Врачебной комиссии на 10 календарных дней.",
				extensionDays: 10,
				extensionDateFrom: "2026-08-16",
				extensionDateTo: "2026-08-25",
				nextReviewDate: "2026-08-25",
			},
			workResumeDate: "2026-08-26",
		};

		const result = validateSickLeaveDuration(longFormWithVk);
		assert.equal(result.isValid, true);
		assert.equal(result.totalDays, 25);
		assert.equal(result.singleDoctorLimitExceeded, true);
		assert.equal(result.isVkRequired, true);
		assert.ok(result.infoMessages.some((m) => m.includes("Протокол ВК № ВК-2026/89")));
	});

	it("generates statutory Form 036/u entry (Журнал учета КЭР / ВК)", () => {
		const formWithVk: SickLeaveFormState = {
			...BASE_ELN_FORM,
			isVkRequired: true,
			vkProtocol: {
				protocolNumber: "ВК-2026/102",
				protocolDate: "2026-08-15",
				chairpersonFio: "Иванова Е.В.",
				chairpersonSpecialty: "Главный врач",
				chairpersonSnils: "111-222-333 44",
				memberFios: ["Смирнов П.А.", "Кузнецов Д.И."],
				attendingDoctorFio: "Кузнецов Д.И.",
				clinicalDiagnosis: "Периостит челюсти",
				icd10Code: "K04.7",
				clinicalSubstantiation: "Послеоперационный период",
				expertDecision: "Продлить ЭЛН на 10 дней",
				extensionDays: 10,
				extensionDateFrom: "2026-08-16",
				extensionDateTo: "2026-08-25",
			},
		};

		const entry = generateForm036uEntry(formWithVk, MOCK_PATIENT, "043-у/2026-102");
		assert.equal(entry.entryNumber, "ВК-2026/102");
		assert.equal(entry.patientFio, "Ковалев Андрей Сергеевич");
		assert.equal(entry.medicalCardNumber, "043-у/2026-102");
		assert.ok(entry.vkReason.includes("Продление временной нетрудоспособности свыше 15 дней"));
		assert.equal(entry.chairpersonSign, "Иванова Е.В.");
		assert.equal(entry.membersSign.length, 2);
	});

	it("generates EMR diary 043/u snippet with full VK decision and statutory references", () => {
		const formWithVk: SickLeaveFormState = {
			...BASE_ELN_FORM,
			isVkRequired: true,
			vkProtocol: {
				protocolNumber: "ВК-2026/102",
				protocolDate: "2026-08-15",
				chairpersonFio: "Иванова Е.В.",
				chairpersonSpecialty: "Главный врач",
				chairpersonSnils: "111-222-333 44",
				memberFios: ["Кузнецов Д.И."],
				attendingDoctorFio: "Кузнецов Д.И.",
				clinicalDiagnosis: "Периостит челюсти",
				icd10Code: "K04.7",
				clinicalSubstantiation: "Тяжелое течение, необходимость антибактериальной терапии",
				expertDecision: "Продлить ЭЛН",
				extensionDays: 10,
				extensionDateFrom: "2026-08-16",
				extensionDateTo: "2026-08-25",
			},
		};

		const snippet = generateEmrDiarySnippet(formWithVk, MOCK_PATIENT);
		assert.ok(snippet.includes("[ЭКСПЕРТИЗА ВРЕМЕННОЙ НЕТРУДОСПОСОБНОСТИ (ЭЛН)]"));
		assert.ok(snippet.includes("Приказ Минздрава РФ № 1089н"));
		assert.ok(snippet.includes("Решение Врачебной комиссии (ВК): Протокол № ВК-2026/102"));
		assert.ok(snippet.includes("Председатель ВК: Иванова Е.В."));
	});

	it("generates compliant XML and JSON payloads for SFR / EGISZ gateway", () => {
		const xml = generateElnXmlPayload(BASE_ELN_FORM, MOCK_PATIENT);
		assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
		assert.ok(xml.includes("<eln:SickLeaveDocument"));
		assert.ok(xml.includes("<eln:ElnNumber>999123456789</eln:ElnNumber>"));
		assert.ok(xml.includes("<eln:Fio>Ковалев Андрей Сергеевич</eln:Fio>"));

		const json = generateElnJsonPayload(BASE_ELN_FORM, MOCK_PATIENT);
		assert.equal(json.schemaVersion, "2.0-1089n");
		assert.equal(json.elnNumber, "999123456789");
		assert.equal(json.patient.fio, "Ковалев Андрей Сергеевич");
		assert.equal(json.clinicalData.icd10Code, "K04.7");
	});
});
