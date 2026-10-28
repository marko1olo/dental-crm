import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { escapeCsvCell, formatClinicalDateRu, sanitizeRegistryString } from "../insurance/registryModules/registrySanitizer.js";
import { validateRegistryData, assertValidRegistryData } from "../insurance/registryModules/registryValidator.js";
import { buildDmsRegistryData, filterRegistryRecordsByPeriod, groupRecordsByPatient } from "../insurance/registryModules/registryAggregator.js";
import type { DmsRegistryData, DmsRegistryRecord } from "../insurance/registryModules/registryTypes.js";

describe("Registry Modules Isolated Unit Tests (registryModules/)", () => {
	const sampleRecord: DmsRegistryRecord = {
		recordId: "rec_1",
		serviceDate: "2026-04-10",
		patientFullName: "Кузнецов Дмитрий Олегович",
		patientBirthDate: "1985-07-20",
		patientGender: "M",
		policyNumber: "POL-112233",
		guaranteeLetterNumber: "ГП-5544",
		icd10Code: "K02.1",
		icd10DescriptionRu: "Кариес дентина",
		toothNumberFdi: 26,
		serviceCode804n: "A16.07.002",
		serviceNameRu: "Пломбирование зуба",
		doctorFullName: "Врач Васильев В.В.",
		quantity: 1,
		unitPriceKopecks: 450000,
		totalGrossKopecks: 450000,
		franchisePercent: 20,
		patientPaidKopecks: 90000,
		insurerClaimKopecks: 360000,
	};

	const sampleRegistry: DmsRegistryData = {
		registryNumber: "РЕЕСТР-2026-001",
		registryDate: "2026-04-30",
		periodStart: "2026-04-01",
		periodEnd: "2026-04-30",
		clinic: {
			nameRu: "ООО «ДЕНТЕ Клиник»",
			inn: "7701122334",
			kpp: "770101001",
			ogrn: "1027700112233",
			addressRu: "г. Москва, ул. Лесная, д. 5",
			phone: "+7 495 123-45-67",
			medicalLicenseNumber: "ЛО-77-01-012345",
			chiefDoctorNameRu: "Иванов И.И.",
			chiefAccountantNameRu: "Петрова П.П.",
		},
		insuranceCompany: {
			companyId: "sogaz",
			nameRu: "АО «СОГАЗ»",
			inn: "7736035485",
			contractNumber: "ДОГ-ДМС-2026",
			contractDate: "2026-01-01",
		},
		records: [sampleRecord],
	};

	it("Sanitizer: escapes CSV values, formats clinical dates, strips invalid chars", () => {
		assert.equal(escapeCsvCell("обычный текст"), "обычный текст");
		assert.equal(escapeCsvCell("текст; с точкой с запятой"), '"текст; с точкой с запятой"');
		assert.equal(escapeCsvCell('слово "в кавычках"'), '"слово ""в кавычках"""');
		assert.equal(escapeCsvCell(undefined), "");

		assert.equal(formatClinicalDateRu("2026-04-10"), "10.04.2026");
		assert.equal(sanitizeRegistryString("  чистый текст \x00 "), "чистый текст");
	});

	it("Validator: asserts valid registry data and rejects invalid dates", () => {
		const validRes = validateRegistryData(sampleRegistry);
		assert.equal(validRes.isValid, true);
		assertValidRegistryData(sampleRegistry);

		const invalidDates: DmsRegistryData = {
			...sampleRegistry,
			periodStart: "2026-05-01",
			periodEnd: "2026-04-01", // Start > End
		};
		const invalidRes = validateRegistryData(invalidDates);
		assert.equal(invalidRes.isValid, false);
		assert.ok(invalidRes.issues.some((i) => i.field === "periodStart"));

		assert.throws(() => assertValidRegistryData(invalidDates), /Ошибка валидации реестра ДМС/);
	});

	it("Aggregator: sorts records, filters by period, groups by patient", () => {
		const recEarly = { ...sampleRecord, recordId: "rec_early", serviceDate: "2026-04-02" };
		const recLate = { ...sampleRecord, recordId: "rec_late", serviceDate: "2026-04-25" };
		const recOtherMonth = { ...sampleRecord, recordId: "rec_may", serviceDate: "2026-05-02" };

		const built = buildDmsRegistryData({
			registryNumber: "R-1",
			registryDate: "2026-05-01",
			periodStart: "2026-04-01",
			periodEnd: "2026-04-30",
			clinic: sampleRegistry.clinic,
			insuranceCompany: sampleRegistry.insuranceCompany,
			records: [recLate, recEarly],
		});
		assert.equal(built.records[0].recordId, "rec_early"); // Sorted earlier date first
		assert.equal(built.records[1].recordId, "rec_late");

		const filtered = filterRegistryRecordsByPeriod([recEarly, recLate, recOtherMonth], "2026-04-01", "2026-04-30");
		assert.equal(filtered.length, 2);

		const grouped = groupRecordsByPatient([recEarly, recLate]);
		const key = `${sampleRecord.patientFullName.trim()}|${sampleRecord.policyNumber.trim()}`;
		assert.equal(grouped.get(key)?.length, 2);
	});
});
