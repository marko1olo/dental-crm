import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	STANDARD_DMS_FRANCHISE_RATES,
	DMS_FRANCHISE_PRESETS,
	isValidFranchiseRate,
	dmsFranchiseRateSchema,
	calculateItemDmsSplit,
	calculateInvoiceDmsSplit,
	type DmsInvoiceItem,
	dmsInvoiceItemSchema,
	dmsInvoiceSplitInputSchema,
} from "../insurance/dmsFranchiseEngine.js";

import {
	DMS_INSURANCE_COMPANIES_CATALOG,
	getDmsInsuranceCompanyById,
	findDmsInsuranceCompanyByInn,
	type DmsGuaranteeLetter,
	dmsGuaranteeLetterSchema,
	evaluateGuaranteeLetterCoverage,
	applyGuaranteeLetterDeduction,
} from "../insurance/dmsGuaranteeLetters.js";

import {
	type DmsRegistryData,
	calculateDmsRegistryTotals,
	generateDmsRegistryXml,
	generateDmsRegistryCsv,
	generateDmsRegistryA4Html,
	dmsRegistryDataSchema,
} from "../insurance/dmsRegistryExport.js";

describe("DMS Franchise & Billing Math Engine (dmsFranchiseEngine.ts)", () => {
	it("1.1 Validates standard and custom Russian franchise rates", () => {
		assert.deepEqual(STANDARD_DMS_FRANCHISE_RATES, [0, 10, 20, 30, 50, 80]);
		assert.equal(DMS_FRANCHISE_PRESETS.length, 6);

		for (const rate of [0, 10, 20, 30, 50, 80, 100]) {
			assert.equal(isValidFranchiseRate(rate), true);
			assert.equal(dmsFranchiseRateSchema.safeParse(rate).success, true);
		}

		assert.equal(isValidFranchiseRate(-1), false);
		assert.equal(isValidFranchiseRate(101), false);
		assert.equal(isValidFranchiseRate(20.5), false);
		assert.equal(dmsFranchiseRateSchema.safeParse(-5).success, false);
		assert.equal(dmsFranchiseRateSchema.safeParse(150).success, false);
	});

	it("1.2 Performs exact integer kopeck splits with zero rounding drift for single items", () => {
		// 0% Franchise (Full DMS coverage): 100% insurer, 0% patient
		const split0 = calculateItemDmsSplit(500000, 0); // 5,000.00 RUB
		assert.equal(split0.patientKopecks, 0);
		assert.equal(split0.insurerKopecks, 500000);
		assert.equal(split0.patientKopecks + split0.insurerKopecks, 500000);

		// 100% Franchise (Patient pays all): 100% patient, 0% insurer
		const split100 = calculateItemDmsSplit(500000, 100);
		assert.equal(split100.patientKopecks, 500000);
		assert.equal(split100.insurerKopecks, 0);
		assert.equal(split100.patientKopecks + split100.insurerKopecks, 500000);

		// 20% Standard Corporate Franchise on 15,433 kopecks (154.33 RUB)
		// 15433 * 0.20 = 3086.6 -> round = 3087 kop; insurer = 15433 - 3087 = 12346 kop
		const split20 = calculateItemDmsSplit(15433, 20);
		assert.equal(split20.patientKopecks, 3087);
		assert.equal(split20.insurerKopecks, 12346);
		assert.equal(split20.patientKopecks + split20.insurerKopecks, 15433);

		// 30% Extended Franchise on 77,777 kopecks (777.77 RUB)
		// 77777 * 0.30 = 23333.1 -> round = 23333 kop; insurer = 77777 - 23333 = 54444 kop
		const split30 = calculateItemDmsSplit(77777, 30);
		assert.equal(split30.patientKopecks, 23333);
		assert.equal(split30.insurerKopecks, 54444);
		assert.equal(split30.patientKopecks + split30.insurerKopecks, 77777);

		// 50% Parity Franchise on 99,999 kopecks
		// 99999 * 0.50 = 49999.5 -> round = 50000 kop; insurer = 49999 kop
		const split50 = calculateItemDmsSplit(99999, 50);
		assert.equal(split50.patientKopecks, 50000);
		assert.equal(split50.insurerKopecks, 49999);
		assert.equal(split50.patientKopecks + split50.insurerKopecks, 99999);

		// 80% Franchise on 125,000 kopecks (1,250.00 RUB)
		// 125000 * 0.80 = 100000 kop; insurer = 25000 kop
		const split80 = calculateItemDmsSplit(125000, 80);
		assert.equal(split80.patientKopecks, 100000);
		assert.equal(split80.insurerKopecks, 25000);
		assert.equal(split80.patientKopecks + split80.insurerKopecks, 125000);
	});

	it("1.3 Handles non-covered services and throws on invalid inputs", () => {
		const nonCovered = calculateItemDmsSplit(850000, 20, false);
		assert.equal(nonCovered.patientKopecks, 850000);
		assert.equal(nonCovered.insurerKopecks, 0);

		assert.throws(() => calculateItemDmsSplit(100.5, 20), /целым числом копеек/);
		assert.throws(() => calculateItemDmsSplit(10000, -10), /от 0 до 100/);
		assert.throws(() => calculateItemDmsSplit(10000, 150), /от 0 до 100/);
	});

	it("1.4 Splits multi-item invoices with per-item overrides and guarantees penny balance", () => {
		const items: DmsInvoiceItem[] = [
			{
				id: "item-1",
				serviceCode804n: "A16.07.002.001",
				serviceName: "Наложение пломбы светового отверждения",
				toothNumberFdi: 26,
				quantity: 1,
				unitPriceKopecks: 450000, // 4,500.00 RUB
				totalKopecks: 450000,
			},
			{
				id: "item-2",
				serviceCode804n: "A16.07.030.001",
				serviceName: "Инструментальная обработка корневого канала",
				toothNumberFdi: 26,
				quantity: 3,
				unitPriceKopecks: 120000, // 1,200.00 RUB * 3 = 3,600.00 RUB
				totalKopecks: 360000,
				franchisePercentOverride: 10, // 10% override instead of default 20%
			},
			{
				id: "item-3",
				serviceCode804n: "A16.07.050",
				serviceName: "Профессиональное отбеливание зубов (косметика)",
				quantity: 1,
				unitPriceKopecks: 1500000, // 15,000.00 RUB
				totalKopecks: 1500000,
				isCoveredByDms: false, // Non-covered cosmetic service
			},
		];

		const summary = calculateInvoiceDmsSplit({
			items,
			defaultFranchisePercent: 20,
		});

		// Total gross = 450000 + 360000 + 1500000 = 2,310,000 kopecks (23,100.00 RUB)
		assert.equal(summary.totalGrossKopecks, 2310000);

		// Item 1 (20%): Patient = 90,000, Insurer = 360,000
		assert.equal(summary.items[0]?.patientKopecks, 90000);
		assert.equal(summary.items[0]?.insurerKopecks, 360000);

		// Item 2 (10%): Patient = 36,000, Insurer = 324,000
		assert.equal(summary.items[1]?.patientKopecks, 36000);
		assert.equal(summary.items[1]?.insurerKopecks, 324000);

		// Item 3 (Non-covered): Patient = 1,500,000, Insurer = 0
		assert.equal(summary.items[2]?.patientKopecks, 1500000);
		assert.equal(summary.items[2]?.insurerKopecks, 0);

		// Calculated sums
		// Total Patient = 90000 + 36000 + 1500000 = 1,626,000 kop (16,260.00 RUB)
		// Total Insurer = 360000 + 324000 + 0 = 684,000 kop (6,840.00 RUB)
		assert.equal(summary.calculatedPatientKopecks, 1626000);
		assert.equal(summary.calculatedInsurerKopecks, 684000);
		assert.equal(summary.finalPatientKopecks, 1626000);
		assert.equal(summary.finalInsurerKopecks, 684000);
		assert.equal(summary.finalPatientKopecks + summary.finalInsurerKopecks, summary.totalGrossKopecks);
		assert.equal(summary.limitExceeded, false);
		assert.equal(summary.limitOverflowKopecks, 0);
	});

	it("1.5 Automatically redirects insurer excess to patient when guarantee letter limit is exceeded", () => {
		const items: DmsInvoiceItem[] = [
			{
				id: "item-1",
				serviceCode804n: "A16.07.054",
				serviceName: "Внутрикостная дентальная имплантация",
				quantity: 1,
				unitPriceKopecks: 4000000, // 40,000.00 RUB
				totalKopecks: 4000000,
			},
		];

		// Insurer portion at 20% franchise:
		// Patient pays 20% = 800,000 kop
		// Insurer pays 80% = 3,200,000 kop
		// Remaining guarantee letter limit is only 2,000,000 kop (20,000.00 RUB)
		const summary = calculateInvoiceDmsSplit({
			items,
			defaultFranchisePercent: 20,
			guaranteeLetterRemainingLimitKopecks: 2000000,
		});

		assert.equal(summary.totalGrossKopecks, 4000000);
		assert.equal(summary.calculatedPatientKopecks, 800000);
		assert.equal(summary.calculatedInsurerKopecks, 3200000);

		// Limit overflow = 3200000 - 2000000 = 1,200,000 kop
		assert.equal(summary.limitExceeded, true);
		assert.equal(summary.limitOverflowKopecks, 1200000);

		// Final Insurer = remaining limit = 2,000,000 kop
		// Final Patient = 800000 + 1200000 = 2,000,000 kop
		assert.equal(summary.finalInsurerKopecks, 2000000);
		assert.equal(summary.finalPatientKopecks, 2000000);

		// Penny-exact balance check
		assert.equal(summary.finalPatientKopecks + summary.finalInsurerKopecks, summary.totalGrossKopecks);
	});

	it("1.6 Validates Zod schemas for franchise and invoice split inputs", () => {
		const validItem: DmsInvoiceItem = {
			id: "it-1",
			serviceCode804n: "A16.07.004",
			serviceName: "Удаление зуба сложное",
			toothNumberFdi: 38,
			quantity: 1,
			unitPriceKopecks: 650000,
			totalKopecks: 650000,
			franchisePercentOverride: 30,
		};

		assert.equal(dmsInvoiceItemSchema.safeParse(validItem).success, true);

		const invalidItem = { ...validItem, quantity: -1 };
		assert.equal(dmsInvoiceItemSchema.safeParse(invalidItem).success, false);

		const validSplitInput = {
			items: [validItem],
			defaultFranchisePercent: 20,
			guaranteeLetterRemainingLimitKopecks: 5000000,
		};
		assert.equal(dmsInvoiceSplitInputSchema.safeParse(validSplitInput).success, true);
	});
});

describe("DMS Guarantee Letters & Coverage Limits (dmsGuaranteeLetters.ts)", () => {
	it("2.1 Catalogs major Russian health insurers with accurate INN, OGRN, and contact data", () => {
		assert.equal(DMS_INSURANCE_COMPANIES_CATALOG.length >= 8, true);

		const sogaz = getDmsInsuranceCompanyById("sogaz");
		assert.ok(sogaz);
		assert.equal(sogaz.inn, "7736035485");
		assert.equal(sogaz.shortNameRu, "АО «СОГАЗ»");

		const ingos = findDmsInsuranceCompanyByInn("7705042179");
		assert.ok(ingos);
		assert.equal(ingos.id, "ingosstrakh");

		const alfa = getDmsInsuranceCompanyById("alfastrakhovanie");
		assert.ok(alfa);
		assert.equal(alfa.inn, "7713056834");

		const reso = getDmsInsuranceCompanyById("reso_garantiya");
		assert.ok(reso);
		assert.equal(reso.inn, "7710045520");

		const vsk = getDmsInsuranceCompanyById("vsk");
		assert.ok(vsk);
		assert.equal(vsk.inn, "7710026574");

		const soglasie = getDmsInsuranceCompanyById("soglasie");
		assert.ok(soglasie);
		assert.equal(soglasie.inn, "7706070733");
	});

	it("2.2 Evaluates guarantee letter validity dates and active status", () => {
		const sampleLetter: DmsGuaranteeLetter = {
			id: "let-101",
			letterNumber: "ГП-2026/08-00124",
			issueDate: "2026-08-01",
			validFrom: "2026-08-01",
			validTo: "2026-08-31",
			companyId: "sogaz",
			companyName: "АО «СОГАЗ»",
			policyNumber: "7700-12345678-01",
			patientFullName: "Смирнова Елена Александровна",
			patientBirthDate: "1988-04-12",
			patientSnils: "123-456-789 00",
			limitKopecks: 10000000, // 100,000.00 RUB
			usedKopecks: 2000000, // 20,000.00 RUB
			remainingLimitKopecks: 8000000, // 80,000.00 RUB
			defaultFranchisePercent: 20,
			status: "active",
		};

		// 1. Valid date in range
		const resValid = evaluateGuaranteeLetterCoverage(sampleLetter, 3000000, {
			serviceDate: "2026-08-15",
		});
		assert.equal(resValid.isApproved, true);
		assert.equal(resValid.status, "approved");
		assert.equal(resValid.approvedInsurerKopecks, 3000000);
		assert.equal(resValid.overflowToPatientKopecks, 0);

		// 2. Expired date
		const resExpired = evaluateGuaranteeLetterCoverage(sampleLetter, 3000000, {
			serviceDate: "2026-09-05",
		});
		assert.equal(resExpired.isApproved, false);
		assert.equal(resExpired.status, "rejected_expired");
		assert.equal(resExpired.approvedInsurerKopecks, 0);
		assert.equal(resExpired.overflowToPatientKopecks, 3000000);

		// 3. Not yet valid date
		const resNotYet = evaluateGuaranteeLetterCoverage(sampleLetter, 3000000, {
			serviceDate: "2026-07-20",
		});
		assert.equal(resNotYet.isApproved, false);
		assert.equal(resNotYet.status, "rejected_not_yet_valid");

		// 4. Inactive letter status (cancelled)
		const cancelledLetter: DmsGuaranteeLetter = { ...sampleLetter, status: "cancelled" };
		const resCancelled = evaluateGuaranteeLetterCoverage(cancelledLetter, 3000000, {
			serviceDate: "2026-08-15",
		});
		assert.equal(resCancelled.isApproved, false);
		assert.equal(resCancelled.status, "rejected_letter_inactive");
	});

	it("2.3 Enforces 804n service inclusion and exclusion lists", () => {
		const restrictedLetter: DmsGuaranteeLetter = {
			id: "let-102",
			letterNumber: "ГП-ИНГОС-4491",
			issueDate: "2026-08-01",
			validFrom: "2026-08-01",
			validTo: "2026-12-31",
			companyId: "ingosstrakh",
			companyName: "СПАО «Ингосстрах»",
			policyNumber: "ИНГ-998822",
			patientFullName: "Иванов Петр Сергеевич",
			patientBirthDate: "1975-11-23",
			limitKopecks: 5000000,
			usedKopecks: 0,
			remainingLimitKopecks: 5000000,
			defaultFranchisePercent: 0,
			allowed804nPrefixes: ["A16.07.002", "A16.07.030", "A16.07.004"],
			excluded804nCodes: ["A16.07.050"], // Bleaching excluded
			status: "active",
		};

		// Allowed service: A16.07.002.001 (Filling)
		const resAllowed = evaluateGuaranteeLetterCoverage(restrictedLetter, 500000, {
			serviceDate: "2026-08-20",
			serviceCode804n: "A16.07.002.001",
		});
		assert.equal(resAllowed.isApproved, true);
		assert.equal(resAllowed.status, "approved");

		// Excluded service: A16.07.050 (Bleaching)
		const resExcluded = evaluateGuaranteeLetterCoverage(restrictedLetter, 1200000, {
			serviceDate: "2026-08-20",
			serviceCode804n: "A16.07.050",
		});
		assert.equal(resExcluded.isApproved, false);
		assert.equal(resExcluded.status, "rejected_service_excluded");
		assert.equal(resExcluded.overflowToPatientKopecks, 1200000);

		// Not in allowed list: A16.07.054 (Implantation)
		const resNotAllowed = evaluateGuaranteeLetterCoverage(restrictedLetter, 3000000, {
			serviceDate: "2026-08-20",
			serviceCode804n: "A16.07.054",
		});
		assert.equal(resNotAllowed.isApproved, false);
		assert.equal(resNotAllowed.status, "rejected_service_not_in_allowed_list");
	});

	it("2.4 Triggers soft warning when limit usage reaches or exceeds 80%", () => {
		const letter: DmsGuaranteeLetter = {
			id: "let-103",
			letterNumber: "ГП-АЛЬФА-5512",
			issueDate: "2026-08-01",
			validFrom: "2026-08-01",
			validTo: "2026-08-31",
			companyId: "alfastrakhovanie",
			companyName: "АО «АльфаСтрахование»",
			policyNumber: "АЛФ-112233",
			patientFullName: "Кузнецов Дмитрий Игоревич",
			patientBirthDate: "1992-06-18",
			limitKopecks: 10000000, // 100,000.00 RUB
			usedKopecks: 6000000, // 60,000.00 RUB (60%)
			remainingLimitKopecks: 4000000, // 40,000.00 RUB
			defaultFranchisePercent: 10,
			status: "active",
		};

		// 1. Adding 10,000 RUB -> total used 70,000 RUB (70%) -> no 80% warning
		const eval70 = evaluateGuaranteeLetterCoverage(letter, 1000000, { serviceDate: "2026-08-10" });
		assert.equal(eval70.warning80PercentReached, false);
		assert.equal(eval70.limitExceeded, false);

		// 2. Adding 25,000 RUB -> total used 85,000 RUB (85%) -> triggers 80% soft warning!
		const eval85 = evaluateGuaranteeLetterCoverage(letter, 2500000, { serviceDate: "2026-08-10" });
		assert.equal(eval85.warning80PercentReached, true);
		assert.equal(eval85.limitExceeded, false);
		assert.ok(eval85.warningMessageRu?.includes("85.0%"));
		assert.equal(eval85.approvedInsurerKopecks, 2500000);
		assert.equal(eval85.overflowToPatientKopecks, 0);

		// 3. Adding 50,000 RUB (requested > remaining 40,000 RUB) -> limit exceeded!
		const evalExcess = evaluateGuaranteeLetterCoverage(letter, 5000000, { serviceDate: "2026-08-10" });
		assert.equal(evalExcess.limitExceeded, true);
		assert.equal(evalExcess.status, "partial_limit_exceeded");
		assert.equal(evalExcess.approvedInsurerKopecks, 4000000); // capped at remaining
		assert.equal(evalExcess.overflowToPatientKopecks, 1000000); // 10,000 RUB surplus to patient
	});

	it("2.5 Deducts used amounts and maintains immutable ledger transactions", () => {
		const letter: DmsGuaranteeLetter = {
			id: "let-104",
			letterNumber: "ГП-РЕСО-7788",
			issueDate: "2026-08-01",
			validFrom: "2026-08-01",
			validTo: "2026-08-31",
			companyId: "reso_garantiya",
			companyName: "СПАО «РЕСО-Гарантия»",
			policyNumber: "РЕС-554433",
			patientFullName: "Васильева Ольга Николаевна",
			patientBirthDate: "1985-02-14",
			limitKopecks: 5000000, // 50,000.00 RUB
			usedKopecks: 0,
			remainingLimitKopecks: 5000000,
			defaultFranchisePercent: 20,
			status: "active",
		};

		// 1st Deduction: 30,000 RUB
		const step1 = applyGuaranteeLetterDeduction(letter, 3000000, {
			transactionRef: "VISIT-20260810-01",
			serviceDate: "2026-08-10",
			descriptionRu: "Лечение кариеса 2.6",
			doctorName: "Барабаш С.В.",
		});

		assert.equal(step1.actualDeductedKopecks, 3000000);
		assert.equal(step1.overflowToPatientKopecks, 0);
		assert.equal(step1.updatedLetter.usedKopecks, 3000000);
		assert.equal(step1.updatedLetter.remainingLimitKopecks, 2000000);
		assert.equal(step1.updatedLetter.status, "active");
		assert.equal(step1.updatedLetter.transactions?.length, 1);

		// 2nd Deduction: 25,000 RUB (exceeds remaining 20,000 RUB)
		const step2 = applyGuaranteeLetterDeduction(step1.updatedLetter, 2500000, {
			transactionRef: "VISIT-20260815-02",
			serviceDate: "2026-08-15",
			descriptionRu: "Эндодонтия 1.5",
			doctorName: "Смирнов А.П.",
		});

		assert.equal(step2.actualDeductedKopecks, 2000000);
		assert.equal(step2.overflowToPatientKopecks, 500000);
		assert.equal(step2.updatedLetter.usedKopecks, 5000000);
		assert.equal(step2.updatedLetter.remainingLimitKopecks, 0);
		assert.equal(step2.updatedLetter.status, "exhausted");
		assert.equal(step2.updatedLetter.transactions?.length, 2);
	});

	it("2.6 Validates guarantee letter Zod schemas", () => {
		const validLetter: DmsGuaranteeLetter = {
			id: "let-valid",
			letterNumber: "ГП-12345",
			issueDate: "2026-08-01",
			validFrom: "2026-08-01",
			validTo: "2026-08-31",
			companyId: "vsk",
			companyName: "САО «ВСК»",
			policyNumber: "ВСК-0099",
			patientFullName: "Морозов Игорь Дмитриевич",
			patientBirthDate: "1980-03-25",
			limitKopecks: 20000000,
			usedKopecks: 5000000,
			remainingLimitKopecks: 15000000,
			defaultFranchisePercent: 20,
			status: "active",
		};

		assert.equal(dmsGuaranteeLetterSchema.safeParse(validLetter).success, true);
	});
});

describe("DMS Claim Registry Generator (dmsRegistryExport.ts)", () => {
	const sampleRegistryData: DmsRegistryData = {
		registryNumber: "РЕЕСТР-2026/08-01",
		registryDate: "2026-08-28",
		periodStart: "2026-08-01",
		periodEnd: "2026-08-28",
		clinic: {
			nameRu: "ООО «Стоматологический центр ДЕНТЕ»",
			inn: "7707123456",
			kpp: "770701001",
			ogrn: "1027700123456",
			addressRu: "г. Москва, ул. Большая Дмитровка, д. 12, стр. 1",
			phone: "+7 (495) 777-88-99",
			email: "billing@dente.ru",
			medicalLicenseNumber: "ЛО-77-01-019842 от 15.06.2021",
			bankNameRu: "ПАО Сбербанк",
			bankBik: "044525225",
			bankAccount: "40702810938000012345",
			bankCorrAccount: "30101810400000000225",
			chiefDoctorNameRu: "Барабаш С.В.",
			chiefAccountantNameRu: "Ковалева Н.В.",
		},
		insuranceCompany: {
			companyId: "sogaz",
			nameRu: "АО «СОГАЗ»",
			inn: "7736035485",
			kpp: "770801001",
			contractNumber: "ДМС-2026/ДЕНТЕ-04",
			contractDate: "2026-01-10",
		},
		records: [
			{
				recordId: "REC-001",
				serviceDate: "2026-08-10",
				patientFullName: "Смирнова Елена Александровна",
				patientBirthDate: "1988-04-12",
				patientGender: "Ж",
				patientSnils: "123-456-789 00",
				policyNumber: "7700-12345678-01",
				guaranteeLetterNumber: "ГП-2026/08-00124",
				guaranteeLetterDate: "2026-08-01",
				icd10Code: "K02.1",
				icd10DescriptionRu: "Кариес дентина",
				toothNumberFdi: 26,
				serviceCode804n: "A16.07.002.001",
				serviceNameRu: "Наложение пломбы светового отверждения (Filtek Z350 XT)",
				doctorFullName: "Барабаш С.В.",
				doctorSpecialtyRu: "Врач-стоматолог терапевт",
				quantity: 1,
				unitPriceKopecks: 450000, // 4,500.00 RUB
				totalGrossKopecks: 450000,
				franchisePercent: 20,
				patientPaidKopecks: 90000, // 900.00 RUB
				insurerClaimKopecks: 360000, // 3,600.00 RUB
			},
			{
				recordId: "REC-002",
				serviceDate: "2026-08-12",
				patientFullName: "Иванов Петр Сергеевич",
				patientBirthDate: "1975-11-23",
				patientGender: "М",
				patientSnils: "987-654-321 99",
				policyNumber: "ИНГ-998822",
				guaranteeLetterNumber: "ГП-ИНГОС-4491",
				guaranteeLetterDate: "2026-08-05",
				icd10Code: "K04.0",
				icd10DescriptionRu: "Пульпит острый очаговый",
				toothNumberFdi: 15,
				serviceCode804n: "A16.07.030.001",
				serviceNameRu: "Инструментальная и медикаментозная обработка корневого канала",
				doctorFullName: "Смирнов А.П.",
				doctorSpecialtyRu: "Врач-стоматолог терапевт",
				quantity: 2,
				unitPriceKopecks: 120000, // 1,200.00 * 2 = 2,400.00 RUB
				totalGrossKopecks: 240000,
				franchisePercent: 0, // 0% franchise
				patientPaidKopecks: 0,
				insurerClaimKopecks: 240000, // 2,400.00 RUB
			},
		],
	};

	it("3.1 Aggregates claim registry totals accurately", () => {
		const totals = calculateDmsRegistryTotals(sampleRegistryData.records);
		assert.equal(totals.totalRecordsCount, 2);
		assert.equal(totals.uniquePatientsCount, 2);

		// Total gross = 450,000 + 240,000 = 690,000 kop (6,900.00 RUB)
		assert.equal(totals.totalGrossKopecks, 690000);
		assert.equal(totals.totalGrossRub, "6900.00");

		// Total patient = 90,000 + 0 = 90,000 kop (900.00 RUB)
		assert.equal(totals.totalPatientPaidKopecks, 90000);
		assert.equal(totals.totalPatientPaidRub, "900.00");

		// Total insurer = 360,000 + 240,000 = 600,000 kop (6,000.00 RUB)
		assert.equal(totals.totalInsurerClaimKopecks, 600000);
		assert.equal(totals.totalInsurerClaimRub, "6000.00");
		assert.ok(totals.totalInsurerClaimInWordsRu.includes("Шесть тысяч рублей"));
	});

	it("3.2 Generates official XML DMS claim registry with strict escaping and XML standards", () => {
		const xml = generateDmsRegistryXml(sampleRegistryData);

		assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes("<РеестрСчетовДМС"));
		assert.ok(xml.includes("<НомерРеестра>РЕЕСТР-2026/08-01</НомерРеестра>"));
		assert.ok(xml.includes("<Наименование>ООО &quot;Стоматологический центр ДЕНТЕ&quot;</Наименование>") || xml.includes("<Наименование>ООО «Стоматологический центр ДЕНТЕ»</Наименование>"));
		assert.ok(xml.includes("<ИНН>7707123456</ИНН>"));
		assert.ok(xml.includes("<КодМКБ10>K02.1</КодМКБ10>"));
		assert.ok(xml.includes("<Код804н>A16.07.002.001</Код804н>"));
		assert.ok(xml.includes("<КСтраховойОплатеКопеек>360000</КСтраховойОплатеКопеек>"));
		assert.ok(xml.includes("<КСтраховойОплатеКопеек>240000</КСтраховойОплатеКопеек>"));
		assert.ok(xml.includes("<КСтраховойОплатеКопеек>600000</КСтраховойОплатеКопеек>"));
	});

	it("3.3 Generates semicolon CSV registry with UTF-8 BOM for Microsoft Excel & ARM Strakhovshchik", () => {
		const csv = generateDmsRegistryCsv(sampleRegistryData);

		// Must start with UTF-8 BOM (\uFEFF)
		assert.equal(csv.charCodeAt(0), 0xfeff);

		const lines = csv.slice(1).split("\r\n");
		assert.ok(lines.length >= 4); // header, 2 data rows, summary row

		// Header check
		assert.ok(lines[0]?.includes("№ п/п;Дата услуги;ФИО застрахованного"));
		assert.ok(lines[0]?.includes("Код услуги 804н;Наименование услуги"));
		assert.ok(lines[0]?.includes("К оплате страховой (руб)"));

		// Row 1 check
		assert.ok(lines[1]?.includes("Смирнова Елена Александровна"));
		assert.ok(lines[1]?.includes("A16.07.002.001"));
		assert.ok(lines[1]?.includes("3600.00"));

		// Summary row check
		assert.ok(lines[lines.length - 1]?.startsWith("ИТОГО"));
		assert.ok(lines[lines.length - 1]?.includes("6000.00"));
	});

	it("3.4 Generates A4 Landscape Printable HTML Consolidated Invoice-Registry", () => {
		const html = generateDmsRegistryA4Html(sampleRegistryData);

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("size: A4 landscape"));
		assert.ok(html.includes("Сводный счет-реестр оказанных медицинских услуг ДМС"));
		assert.ok(html.includes("ООО «Стоматологический центр ДЕНТЕ»") || html.includes("ООО &quot;Стоматологический центр ДЕНТЕ&quot;"));
		assert.ok(html.includes("АО «СОГАЗ»") || html.includes("АО &quot;СОГАЗ&quot;"));
		assert.ok(html.includes("K02.1"));
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("Шесть тысяч рублей"));
		assert.ok(html.includes("Барабаш С.В."));
		assert.ok(html.includes("Ковалева Н.В."));
		assert.ok(html.includes("М.П."));
	});

	it("3.5 Validates Zod schema for DMS registry payload", () => {
		assert.equal(dmsRegistryDataSchema.safeParse(sampleRegistryData).success, true);
	});
});
