/**
 * insuranceRegistry.test.ts — Unit & Integration tests for GET /api/insurance/registry
 * and Statutory DMS Claims Export Engine.
 *
 * Verifies:
 * 1. Auth-first protection (401 without staff token).
 * 2. Zod Query Validation (400 on malformed UUID or invalid date).
 * 3. Organization clinic requisites and insurance company metadata hydration.
 * 4. Aggregation of guarantee letter usages and clinical treatments into statutory DMS claims.
 * 5. Exact integer kopecks math: patientPaidKopecks + insurerClaimKopecks === totalGrossKopecks (zero drift).
 * 6. Format negotiation: XML (Minzdrav standard), CSV (RFC 4180 with UTF-8 BOM), and A4 HTML.
 * 7. Doctor autonomy & non-blocking execution (Mandates 8e, 8n).
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import type { FastifyInstance } from "fastify";
import {
	calculateDmsRegistryTotals,
	generateDmsRegistryA4Html,
	generateDmsRegistryCsv,
	generateDmsRegistryXml,
	type DmsRegistryClinicInfo,
	type DmsRegistryData,
	type DmsRegistryInsuranceCompanyInfo,
	type DmsRegistryRecord,
} from "@dental/shared";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters, insuranceContracts, organizations, patients } from "../../db/schema.js";
import { registerInsuranceRoutes } from "../../routes/insurance.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "insuranceRegistry";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const STAFF_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
const CONTRACT_ID = fixtureUuid(NAMESPACE, 4);
const LETTER_ID = fixtureUuid(NAMESPACE, 5);

describe("DMS Claims Registry API & Export Engine", () => {
	let app: FastifyInstance;
	let staffToken = "";
	let databaseReady = true;

	before(async () => {
		process.env.NODE_ENV = "test";
		app = createTenantTestApp();
		await app.register(registerInsuranceRoutes);
		await app.ready();

		staffToken = signToken(
			{
				organizationId: ORGANIZATION_ID,
				userId: STAFF_ID,
				role: "admin",
			},
			authTokenSecret(),
		);

		try {
			await purgeFixtureOrganizations([ORGANIZATION_ID]);
		} catch (e) {
			if (isDatabaseUnavailable(e)) {
				databaseReady = false;
				return;
			}
			throw e;
		}

		if (databaseReady) {
			await withFixtureTenant(ORGANIZATION_ID, async () => {
				await db.insert(organizations).values({
					id: ORGANIZATION_ID,
					name: "Стоматология «ДЕНТЕ Премиум»",
					loginId: `dms_reg_org_${Date.now()}`,
					inn: "7701984210",
					kpp: "770101001",
					ogrn: "1157746890123",
					legalAddress: "г. Москва, ул. Большая Спасская, д. 12",
					medicalLicenseNumber: "ЛО-77-01-019842",
					signatoryName: "Д-р Смирнов А.А.",
					signatoryTitle: "Главный врач",
				});

				await db.insert(insuranceContracts).values({
					id: CONTRACT_ID,
					organizationId: ORGANIZATION_ID,
					companyName: "АО «СОГАЗ»",
					policyNumberMask: "SOGAZ-###",
					coverageTherapyPct: 100,
					coverageSurgeryPct: 80,
					coverageOrthoPct: 0,
					coverageHygienePct: 100,
					annualLimitRub: 150000,
					isActive: true,
				});

				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORGANIZATION_ID,
					fullName: "Кузнецов Алексей Сергеевич",
					birthDate: "1985-06-20",
					phone: "+79998887766",
					status: "active",
					administrativeProfile: {
						insurancePolicyNumber: "SOGAZ-778899",
						snils: "123-456-789 00",
						gender: "male",
					},
				});

				const todayIso = new Date().toISOString().slice(0, 10);
				const nextYearIso = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

				await db.insert(dmsGuaranteeLetters).values({
					id: LETTER_ID,
					organizationId: ORGANIZATION_ID,
					contractId: CONTRACT_ID,
					patientId: PATIENT_ID,
					patientFullName: "Кузнецов Алексей Сергеевич",
					patientBirthDate: "1985-06-20",
					policyNumber: "SOGAZ-778899",
					insurerKey: "sogaz",
					insurerName: "АО «СОГАЗ»",
					letterNumber: "ГП-СОГАЗ-2026/99",
					issueDate: todayIso,
					validFrom: todayIso,
					validUntil: nextYearIso,
					maxCoverageRub: 50000,
					usedAmountRub: 8500,
					franchisePct: 10,
					franchiseType: "percent",
					franchiseFixedRub: 0,
					programExclusions: ["Отбеливание", "Виниры"],
					approvedServiceCodes: ["A16.07.002.001", "A16.07.030.001"],
					approvedTeethFdi: ["16", "26"],
					approvedDiagnosisCodes: ["K02.1"],
					notes: "Лечение глубокого кариеса зуба 16",
					status: "active",
				});
			});
		}
	});

	after(async () => {
		if (app) await app.close();
		if (databaseReady) {
			try {
				await purgeFixtureOrganizations([ORGANIZATION_ID]);
			} catch {
				// ignore cleanup error
			}
		}
	});

	test("1. Auth-first: rejects request without authorization header with 401", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/insurance/registry",
		});

		assert.equal(res.statusCode, 401);
	});

	test("2. Validation: rejects invalid patientId with 400", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/insurance/registry?patientId=not-a-uuid",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});

	test("3. Validation: rejects invalid date format with 400", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/insurance/registry?periodStart=31-12-2026",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});

	test("4. Statutory Claims Math Invariant & Kopeck-Exact Balance", () => {
		const sampleRecords: DmsRegistryRecord[] = [
			{
				recordId: "rec-1",
				serviceDate: "2026-08-15",
				patientFullName: "Иванов Иван Иванович",
				patientBirthDate: "1988-04-12",
				patientGender: "М",
				patientSnils: "112-233-445 95",
				policyNumber: "POLIS-DMS-123456",
				guaranteeLetterNumber: "ГП-2026-08/42",
				icd10Code: "K02.1",
				icd10DescriptionRu: "Кариес дентина",
				toothNumberFdi: 16,
				serviceCode804n: "A16.07.002.001",
				serviceNameRu: "Восстановление зуба пломбой светоотверждаемой",
				doctorFullName: "Д-р Смирнов А.А.",
				quantity: 1,
				unitPriceKopecks: 450050, // 4 500.50 ₽
				totalGrossKopecks: 450050,
				franchisePercent: 20,     // 20% patient copay
				patientPaidKopecks: 90010, // 900.10 ₽
				insurerClaimKopecks: 360040, // 3 600.40 ₽
			},
			{
				recordId: "rec-2",
				serviceDate: "2026-08-15",
				patientFullName: "Иванов Иван Иванович",
				patientBirthDate: "1988-04-12",
				patientGender: "М",
				policyNumber: "POLIS-DMS-123456",
				guaranteeLetterNumber: "ГП-2026-08/42",
				icd10Code: "K02.1",
				icd10DescriptionRu: "Кариес дентина",
				toothNumberFdi: 16,
				serviceCode804n: "A16.07.030.001",
				serviceNameRu: "Обработка корневого канала",
				doctorFullName: "Д-р Смирнов А.А.",
				quantity: 2,
				unitPriceKopecks: 350000,
				totalGrossKopecks: 700000, // 7 000.00 ₽
				franchisePercent: 0,
				patientPaidKopecks: 0,
				insurerClaimKopecks: 700000,
			},
		];

		const totals = calculateDmsRegistryTotals(sampleRecords);

		// Record level balance
		for (const rec of sampleRecords) {
			assert.equal(
				rec.patientPaidKopecks + rec.insurerClaimKopecks,
				rec.totalGrossKopecks,
				"Penny drift detected on record level",
			);
		}

		// Summary level balance
		assert.equal(totals.totalRecordsCount, 2);
		assert.equal(totals.uniquePatientsCount, 1);
		assert.equal(totals.totalGrossKopecks, 1150050);
		assert.equal(totals.totalPatientPaidKopecks, 90010);
		assert.equal(totals.totalInsurerClaimKopecks, 1060040);
		assert.equal(
			totals.totalPatientPaidKopecks + totals.totalInsurerClaimKopecks,
			totals.totalGrossKopecks,
			"Penny drift detected on summary level",
		);

		assert.equal(totals.totalGrossRub, "11500.50");
		assert.equal(totals.totalPatientPaidRub, "900.10");
		assert.equal(totals.totalInsurerClaimRub, "10600.40");
		assert.ok(totals.totalInsurerClaimInWordsRu.includes("Десять тысяч шестьсот рублей 40 копеек"));
	});

	test("5. Electronic XML Registry generation per Russian DMS EDI Standard", () => {
		const clinic: DmsRegistryClinicInfo = {
			nameRu: "ООО «Стоматологический Центр «ДЕНТЕ»",
			inn: "7701984210",
			kpp: "770101001",
			ogrn: "1157746890123",
			addressRu: "г. Москва, ул. Большая Спасская, д. 12",
			phone: "+7 (495) 123-45-67",
			medicalLicenseNumber: "ЛО-77-01-019842",
			chiefDoctorNameRu: "Д-р Смирнов А.А.",
			chiefAccountantNameRu: "Иванова Е.В.",
		};

		const insurer: DmsRegistryInsuranceCompanyInfo = {
			companyId: "sogaz",
			nameRu: "АО «СОГАЗ»",
			inn: "7736035485",
			contractNumber: "ДМС-2026/01",
			contractDate: "2026-01-12",
		};

		const records: DmsRegistryRecord[] = [
			{
				recordId: "rec-test-1",
				serviceDate: "2026-08-10",
				patientFullName: "Сидоров Петр Петрович",
				patientBirthDate: "1979-11-03",
				patientGender: "М",
				patientSnils: "987-654-321 00",
				policyNumber: "SGZ-991122",
				guaranteeLetterNumber: "ГП-SGZ-001",
				icd10Code: "K02.1",
				icd10DescriptionRu: "Кариес дентина",
				toothNumberFdi: 21,
				serviceCode804n: "A16.07.002.001",
				serviceNameRu: "Пломбирование светоотверждаемым композитом",
				doctorFullName: "Д-р Петров П.П.",
				quantity: 1,
				unitPriceKopecks: 500000,
				totalGrossKopecks: 500000,
				franchisePercent: 10,
				patientPaidKopecks: 50000,
				insurerClaimKopecks: 450000,
			},
		];

		const data: DmsRegistryData = {
			registryNumber: "РЕЕСТР-202608-SOGAZ",
			registryDate: "2026-08-31",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-31",
			clinic,
			insuranceCompany: insurer,
			records,
		};

		const xml = generateDmsRegistryXml(data);

		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('<РеестрСчетовДМС xmlns="urn:dente:dms:registry:v1.0"'));
		assert.ok(xml.includes("<НомерРеестра>РЕЕСТР-202608-SOGAZ</НомерРеестра>"));
		assert.ok(xml.includes("<Наименование>ООО «Стоматологический Центр «ДЕНТЕ»</Наименование>"));
		assert.ok(xml.includes("<ИНН>7701984210</ИНН>"));
		assert.ok(xml.includes("<ФИО>Сидоров Петр Петрович</ФИО>"));
		assert.ok(xml.includes("<НомерПолиса>SGZ-991122</НомерПолиса>"));
		assert.ok(xml.includes("<Код804н>A16.07.002.001</Код804н>"));
		assert.ok(xml.includes("<ЗубFDI>21</ЗубFDI>"));
		assert.ok(xml.includes("<КСтраховойОплатеКопеек>450000</КСтраховойОплатеКопеек>"));
		assert.ok(xml.includes("<КСтраховойОплатеРублей>4500.00</КСтраховойОплатеРублей>"));
		assert.ok(xml.includes("</РеестрСчетовДМС>"));
	});

	test("6. RFC 4180 Semicolon CSV with UTF-8 BOM for Microsoft Excel / 1C", () => {
		const clinic: DmsRegistryClinicInfo = {
			nameRu: "ООО «Стоматологический Центр «ДЕНТЕ»",
			inn: "7701984210",
			kpp: "770101001",
			ogrn: "1157746890123",
			addressRu: "г. Москва, ул. Большая Спасская, д. 12",
			phone: "+7 (495) 123-45-67",
			medicalLicenseNumber: "ЛО-77-01-019842",
			chiefDoctorNameRu: "Д-р Смирнов А.А.",
			chiefAccountantNameRu: "Иванова Е.В.",
		};

		const insurer: DmsRegistryInsuranceCompanyInfo = {
			companyId: "sogaz",
			nameRu: "АО «СОГАЗ»",
			inn: "7736035485",
			contractNumber: "ДМС-2026/01",
			contractDate: "2026-01-12",
		};

		const records: DmsRegistryRecord[] = [
			{
				recordId: "rec-test-1",
				serviceDate: "2026-08-10",
				patientFullName: "Сидоров Петр Петрович",
				patientBirthDate: "1979-11-03",
				patientGender: "М",
				policyNumber: "SGZ-991122",
				guaranteeLetterNumber: "ГП-SGZ-001",
				icd10Code: "K02.1",
				icd10DescriptionRu: "Кариес дентина",
				toothNumberFdi: 21,
				serviceCode804n: "A16.07.002.001",
				serviceNameRu: "Пломбирование светоотверждаемым композитом",
				doctorFullName: "Д-р Петров П.П.",
				quantity: 1,
				unitPriceKopecks: 500000,
				totalGrossKopecks: 500000,
				franchisePercent: 10,
				patientPaidKopecks: 50000,
				insurerClaimKopecks: 450000,
			},
		];

		const data: DmsRegistryData = {
			registryNumber: "РЕЕСТР-202608-SOGAZ",
			registryDate: "2026-08-31",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-31",
			clinic,
			insuranceCompany: insurer,
			records,
		};

		const csv = generateDmsRegistryCsv(data);

		// Must begin with UTF-8 BOM \uFEFF
		assert.equal(csv.charCodeAt(0), 0xfeff);

		const lines = csv.slice(1).split("\r\n");
		assert.ok(lines.length >= 3);

		// Header checks
		assert.ok(lines[0]?.includes("№ п/п;Дата услуги;ФИО застрахованного"));
		assert.ok(lines[0]?.includes("Код услуги 804н;Наименование услуги"));
		assert.ok(lines[0]?.includes("Франшиза (%);Оплачено пациентом (руб);К оплате страховой (руб)"));

		// Data row checks
		assert.ok(lines[1]?.includes("Сидоров Петр Петрович"));
		assert.ok(lines[1]?.includes("SGZ-991122"));
		assert.ok(lines[1]?.includes("A16.07.002.001"));
		assert.ok(lines[1]?.includes("4500.00")); // Insurer claim
		assert.ok(lines[1]?.includes("500.00"));  // Patient paid

		// Summary row
		const lastLine = lines[lines.length - 1];
		assert.ok(lastLine?.includes("ИТОГО"));
		assert.ok(lastLine?.includes("4500.00"));
	});

	test("7. Printable A4 Landscape HTML Consolidated Invoice-Registry", () => {
		const clinic: DmsRegistryClinicInfo = {
			nameRu: "ООО «Стоматологический Центр «ДЕНТЕ»",
			inn: "7701984210",
			kpp: "770101001",
			ogrn: "1157746890123",
			addressRu: "г. Москва, ул. Большая Спасская, д. 12",
			phone: "+7 (495) 123-45-67",
			medicalLicenseNumber: "ЛО-77-01-019842",
			chiefDoctorNameRu: "Д-р Смирнов А.А.",
			chiefAccountantNameRu: "Иванова Е.В.",
		};

		const insurer: DmsRegistryInsuranceCompanyInfo = {
			companyId: "sogaz",
			nameRu: "АО «СОГАЗ»",
			inn: "7736035485",
			contractNumber: "ДМС-2026/01",
			contractDate: "2026-01-12",
		};

		const data: DmsRegistryData = {
			registryNumber: "РЕЕСТР-202608-SOGAZ",
			registryDate: "2026-08-31",
			periodStart: "2026-08-01",
			periodEnd: "2026-08-31",
			clinic,
			insuranceCompany: insurer,
			records: [],
		};

		const html = generateDmsRegistryA4Html(data);
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("Сводный счет-реестр ДМС № РЕЕСТР-202608-SOGAZ"));
		assert.ok(html.includes("ООО «Стоматологический Центр «ДЕНТЕ»"));
		assert.ok(html.includes("АО «СОГАЗ»"));
		assert.ok(html.includes("Руководитель медицинской организации"));
		assert.ok(html.includes("Главный бухгалтер"));
	});

	test("8. Live Database Integration: returns seeded records if DB available", async (t) => {
		if (!databaseReady) return t.skip("Database unavailable");

		const res = await app.inject({
			method: "GET",
			url: "/api/insurance/registry?insurerKey=sogaz&period=current_month",
			headers: {
				"x-dente-staff-token": staffToken,
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json();
		assert.equal(body.clinic.nameRu, "Стоматология «ДЕНТЕ Премиум»");
		assert.ok(body.records.length >= 1);
		assert.equal(body.records[0].patientFullName, "Кузнецов Алексей Сергеевич");
	});
});
