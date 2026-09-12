import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	computeElnCheckDigit,
	validateElnNumber,
	generateElnNumber,
	validateSickLeaveDuration,
	ELN_MOD11_WEIGHTS,
	calculateDaysBetween,
	formatDateRu,
	addDays,
	generateElnXmlPayload,
	generateElnJsonPayload,
	generateForm036uEntry,
	generateEmrDiarySnippet,
	type SickLeaveFormState,
	type SickLeavePatientData,
} from "../sickLeaveElnEngine";

describe("Statutory ELN Engine: MOD 11 Checksum, Verification & Deterministic Generation", () => {
	describe("1. computeElnCheckDigit (SFR / FSS EIIS Socstrakh Algorithm)", () => {
		it("has exactly 11 regulatory weights conforming to MOD 11 specification", () => {
			assert.equal(ELN_MOD11_WEIGHTS.length, 11);
			assert.deepEqual([...ELN_MOD11_WEIGHTS], [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
		});

		it("throws an error if fewer than 11 digits are passed", () => {
			assert.throws(
				() => computeElnCheckDigit("9991234567"),
				/ELN check digit calculation requires at least 11 digits/
			);
		});

		it("correctly computes weighted check digit for known prefixes", () => {
			// Test known 11-digit vector:
			// '99900000001':
			// 9*3 + 9*7 + 9*2 + 0 + 0 + 0 + 0 + 0 + 0 + 0 + 1*8 = 27 + 63 + 18 + 8 = 116
			// 116 % 11 = 6. Expected check digit: 6
			assert.equal(computeElnCheckDigit("99900000001"), 6);

			// Test vector:
			// '99900000009':
			// 9*3 + 9*7 + 9*2 + 9*8 = 108 + 72 = 180.
			// 180 % 11 = 180 - 11*16 = 180 - 176 = 4.
			assert.equal(computeElnCheckDigit("99900000009"), 4);
		});

		it("cleans non-digit characters before calculating checksum", () => {
			const cleanRes = computeElnCheckDigit("999-0000-0001");
			assert.equal(cleanRes, 6);
		});
	});

	describe("2. validateElnNumber (Regulatory FFLC check)", () => {
		it("validates correct 12-digit ELN with matching check digit", () => {
			const validEln = "999000000016";
			assert.equal(validateElnNumber(validEln), true);
		});

		it("rejects ELN with tampered check digit", () => {
			const tamperedEln = "999000000017"; // check digit should be 6, not 7
			assert.equal(validateElnNumber(tamperedEln), false);
		});

		it("rejects ELN with invalid length or non-digit characters", () => {
			assert.equal(validateElnNumber("9990000001"), false); // 10 digits
			assert.equal(validateElnNumber("9990000000166"), false); // 13 digits
			assert.equal(validateElnNumber(""), false);
			assert.equal(validateElnNumber("ABCDEFGHIJKL"), false);
		});
	});

	describe("3. generateElnNumber (Deterministic Generator without Math.random)", () => {
		it("generates a strictly 12-digit ELN conforming to validateElnNumber", () => {
			for (let i = 0; i < 50; i++) {
				const eln = generateElnNumber("999");
				assert.equal(eln.length, 12, `ELN must be 12 digits: ${eln}`);
				assert.ok(eln.startsWith("999"), `ELN must start with prefix 999: ${eln}`);
				assert.equal(validateElnNumber(eln), true, `Generated ELN must pass check digit: ${eln}`);
			}
		});

		it("supports explicit sequence number parameter", () => {
			const elnSeq1 = generateElnNumber("999", 1);
			assert.equal(elnSeq1, "999000000016");
			assert.equal(validateElnNumber(elnSeq1), true);

			const elnSeq42 = generateElnNumber("770", 42);
			assert.ok(elnSeq42.startsWith("77000000042"));
			assert.equal(elnSeq42.length, 12);
			assert.equal(validateElnNumber(elnSeq42), true);
		});

		it("generates monotonic unique sequences across consecutive calls", () => {
			const eln1 = generateElnNumber("999");
			const eln2 = generateElnNumber("999");
			assert.notEqual(eln1, eln2, "Consecutive generated numbers must be distinct");
			assert.equal(validateElnNumber(eln1), true);
			assert.equal(validateElnNumber(eln2), true);
		});
	});

	describe("4. validateSickLeaveDuration Integration with MOD 11 Checksum", () => {
		const baseForm: SickLeaveFormState = {
			elnNumber: generateElnNumber("999", 100),
			issueDate: "2026-09-01",
			isDuplicate: false,
			reasonCode: "01",
			regimeType: "ambulatory",
			icd10Code: "K04.0",
			diagnosisText: "Острый пульпит зуба 3.6",
			periods: [
				{
					id: "p1",
					dateFrom: "2026-09-01",
					dateTo: "2026-09-05",
					doctorSpecialty: "Врач-стоматолог-терапевт",
					doctorFio: "Ковалева Н.С.",
					doctorSnils: "123-456-789 00",
					doctorRole: "attending",
				},
			],
			closingCode: "31",
			workResumeDate: "2026-09-06",
			isVkRequired: false,
			organizationName: "ООО «ДЕНТЕ КЛИНИК»",
			organizationOgrn: "1187746123456",
			organizationAddress: "г. Москва",
			medicalLicenceNumber: "ЛО-77-01-020894",
		};

		it("produces no checksum warnings for valid generated ELN", () => {
			const result = validateSickLeaveDuration(baseForm);
			assert.equal(result.isValid, true);
			assert.ok(
				!result.warnings.some((w) => w.includes("Контрольный разряд номера ЭЛН не совпадает")),
				"Must not emit checksum warning for valid ELN"
			);
		});

		it("warns about invalid checksum when ELN number has mismatched check digit", () => {
			const invalidForm: SickLeaveFormState = {
				...baseForm,
				elnNumber: "999000000010", // Check digit should be 6
			};
			const result = validateSickLeaveDuration(invalidForm);
			assert.ok(
				result.warnings.some((w) => w.includes("Контрольный разряд номера ЭЛН не совпадает")),
				"Must emit warning when check digit is mismatched"
			);
		});
	});

	describe("5. Sick Leave (ЭЛН) & Medical Commission (ВК) Engine — Order 1089n", () => {
		const mockPatient: SickLeavePatientData = {
			patientFio: "Ковалев Андрей Сергеевич",
			patientBirthDate: "1987-03-24",
			patientGender: "male",
			patientSnils: "154-890-123 45",
			patientOmsNumber: "7756123490871234",
			employerName: "ООО «ТехноПром»",
			isPrimaryWorkplace: true,
			patientPhone: "+7 (916) 111-22-33",
		};

		const baseOrder1089nForm: SickLeaveFormState = {
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

		it("calculates calendar days and date spans correctly", () => {
			assert.equal(calculateDaysBetween("2026-08-01", "2026-08-10"), 10);
			assert.equal(calculateDaysBetween("2026-08-01", "2026-08-01"), 1);
			assert.equal(formatDateRu("2026-08-01"), "01.08.2026");
			assert.equal(addDays("2026-08-01", 9), "2026-08-10");
		});

		it("approves single doctor ELN duration within 15-day limit without Medical Commission", () => {
			const result = validateSickLeaveDuration(baseOrder1089nForm);
			assert.equal(result.isValid, true);
			assert.equal(result.totalDays, 10);
			assert.equal(result.singleDoctorLimitExceeded, false);
			assert.equal(result.isVkRequired, false);
			assert.equal(result.errors.length, 0);
		});

		it("strictly requires Medical Commission (ВК) protocol when duration exceeds 15 days", () => {
			const longForm: SickLeaveFormState = {
				...baseOrder1089nForm,
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
				...baseOrder1089nForm,
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
				...baseOrder1089nForm,
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

			const entry = generateForm036uEntry(formWithVk, mockPatient, "043-у/2026-102");
			assert.equal(entry.entryNumber, "ВК-2026/102");
			assert.equal(entry.patientFio, "Ковалев Андрей Сергеевич");
			assert.equal(entry.medicalCardNumber, "043-у/2026-102");
			assert.ok(entry.vkReason.includes("Продление временной нетрудоспособности свыше 15 дней"));
			assert.equal(entry.chairpersonSign, "Иванова Е.В.");
			assert.equal(entry.membersSign.length, 2);
		});

		it("generates EMR diary 043/u snippet with full VK decision and statutory references", () => {
			const formWithVk: SickLeaveFormState = {
				...baseOrder1089nForm,
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

			const snippet = generateEmrDiarySnippet(formWithVk, mockPatient);
			assert.ok(snippet.includes("[ЭКСПЕРТИЗА ВРЕМЕННОЙ НЕТРУДОСПОСОБНОСТИ (ЭЛН)]"));
			assert.ok(snippet.includes("Приказ Минздрава РФ № 1089н"));
			assert.ok(snippet.includes("Решение Врачебной комиссии (ВК): Протокол № ВК-2026/102"));
			assert.ok(snippet.includes("Председатель ВК: Иванова Е.В."));
		});

		it("generates compliant XML and JSON payloads for SFR / EGISZ gateway", () => {
			const xml = generateElnXmlPayload(baseOrder1089nForm, mockPatient);
			assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"));
			assert.ok(xml.includes("<eln:SickLeaveDocument"));
			assert.ok(xml.includes("<eln:ElnNumber>999123456789</eln:ElnNumber>"));
			assert.ok(xml.includes("<eln:Fio>Ковалев Андрей Сергеевич</eln:Fio>"));

			const json = generateElnJsonPayload(baseOrder1089nForm, mockPatient);
			assert.equal(json.schemaVersion, "2.0-1089n");
			assert.equal(json.elnNumber, "999123456789");
			assert.equal(json.patient.fio, "Ковалев Андрей Сергеевич");
			assert.equal(json.clinicalData.icd10Code, "K04.7");
		});
	});
});

