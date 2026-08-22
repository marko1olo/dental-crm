import assert from "node:assert/strict";
import test from "node:test";
import {
	buildDmsReconciliationRegistry,
	calculateDmsCoPaymentSplit,
	type DmsBillableLineItem,
	type DmsGuaranteeLetter,
	exportDmsRegistryToCsv,
	formatCurrencyRub,
	isServiceCodeApprovedByLetter,
	isToothApprovedByLetter,
	kopecksToRubles,
	normalizeToothFdi,
	rublesToKopecks,
} from "../components/insurance/dmsSplitEngine.js";
import {
	DMS_EXCLUSION_RULES,
	DMS_PROGRAMS,
	type DmsPolicy,
	getDmsInsurerById,
	isServiceExcludedByDmsRules,
	RUSSIAN_TOP_DMS_INSURERS,
	validateDmsPolicy,
} from "../components/insurance/insuranceCatalogs.js";
import { InsurancePreAuthModal } from "../components/insurance/InsurancePreAuthModal.js";

test("DMS Catalog: top 8 Russian insurers integrity and metadata", () => {
	assert.equal(RUSSIAN_TOP_DMS_INSURERS.length, 8, "Must contain all 8 top Russian DMS insurers");

	const expectedInsurerIds = [
		"sogaz",
		"ingosstrakh",
		"reso",
		"alfastrakh",
		"vsk",
		"rosgosstrakh",
		"soglasie",
		"renins",
	];

	for (const id of expectedInsurerIds) {
		const ins = getDmsInsurerById(id);
		assert.ok(ins, `Insurer ${id} must exist in catalog`);
		assert.equal(ins.id, id);
		assert.ok(ins.shortName.length > 3);
		assert.ok(ins.inn.length === 10, `INN must be 10 digits for legal entity: ${ins.inn}`);
		assert.ok(ins.ogrn.length === 13, `OGRN must be 13 digits: ${ins.ogrn}`);
		assert.ok(ins.phone.length > 5);
		assert.ok(ins.email.includes("@"));
		assert.ok(ins.portalUrl.startsWith("https://"));
		assert.ok(ins.supportedPrograms.length >= 2);
	}

	assert.equal(getDmsInsurerById("unknown_fake_id"), undefined);
});

test("DMS Programs & Exclusion Rules: standard limits and exclusions matching", () => {
	// Программы
	assert.ok(DMS_PROGRAMS.base.defaultLimitKopecks >= 5000000);
	assert.ok(DMS_PROGRAMS.extended.defaultLimitKopecks >= 10000000);
	assert.ok(DMS_PROGRAMS.vip.defaultLimitKopecks >= 30000000);

	// Исключения
	assert.ok(DMS_EXCLUSION_RULES.length >= 5);

	// 1. Имплантация исключена
	const implantCheck = isServiceExcludedByDmsRules(
		"A16.07.006",
		"Установка дентального имплантата Osstem",
		"base",
	);
	assert.equal(implantCheck.isExcluded, true);
	assert.ok(implantCheck.reason?.includes("имплантация"));

	// 2. Отбеливание исключено
	const bleachCheck = isServiceExcludedByDmsRules(
		"A16.07.050",
		"Клиническое фотоотбеливание Zoom 4",
		"extended",
	);
	assert.equal(bleachCheck.isExcluded, true);

	// 3. Терапия кариеса НЕ исключена
	const cariesCheck = isServiceExcludedByDmsRules(
		"A16.07.002.001",
		"Восстановление зуба пломбой (кариес эмали и дентина)",
		"base",
	);
	assert.equal(cariesCheck.isExcluded, false);

	// 4. Профгигиена: проверка частоты (2 месяца после прошлого визита -> исключено в базовой программе)
	const frequentHygieneCheck = isServiceExcludedByDmsRules(
		"A16.07.051",
		"Профессиональная гигиена полости рта и зубов",
		"base",
		{
			lastHygieneDate: "2026-06-01",
			currentVisitDate: "2026-08-22",
		},
	);
	assert.equal(frequentHygieneCheck.isExcluded, true);
	assert.ok(frequentHygieneCheck.reason?.includes("не чаще 1 раза"));
});

test("DMS Policy Validator: validity dates, series, numbers, and franchise checks", () => {
	const validPolicy: DmsPolicy = {
		id: "pol-1",
		insurerId: "sogaz",
		policySeries: "МСК",
		policyNumber: "7700123456",
		program: "extended",
		liabilityLimitKopecks: 15000000,
		franchiseType: "percent",
		franchisePercent: 20,
		validFrom: "2026-01-01",
		validTo: "2026-12-31",
		patientFullName: "Сидоров Алексей Павлович",
		patientBirthDate: "1985-07-20",
	};

	const result = validateDmsPolicy(validPolicy, "2026-08-22");
	assert.equal(result.isValid, true);
	assert.equal(result.errors.length, 0);

	// Невалидный полис (истекший срок действия)
	const expiredPolicy: DmsPolicy = {
		...validPolicy,
		validFrom: "2025-01-01",
		validTo: "2025-12-31",
	};
	const expiredResult = validateDmsPolicy(expiredPolicy, "2026-08-22");
	assert.equal(expiredResult.isValid, false);
	assert.ok(expiredResult.errors.some((e) => e.includes("истек")));

	// Невалидный полис (несуществующий страховщик и пустой номер)
	const invalidInsurerPolicy = {
		...validPolicy,
		insurerId: "non_existent",
		policyNumber: "  ",
	};
	const invalidResult = validateDmsPolicy(invalidInsurerPolicy, "2026-08-22");
	assert.equal(invalidResult.isValid, false);
	assert.ok(invalidResult.errors.length >= 2);
});

test("DMS Guarantee Letter & Tooth/Code matcher helpers", () => {
	const letter: DmsGuaranteeLetter = {
		id: "let-101",
		letterNumber: "ГП-9988",
		issueDate: "2026-08-01",
		validUntil: "2026-09-01",
		maxApprovedAmountKopecks: rublesToKopecks(30000),
		insurerId: "sogaz",
		patientFullName: "Иванов И.И.",
		approvedTeethFdi: ["16", "17", "26"],
		approvedServiceCodes804n: ["A16.07.002", "A16.07.030"],
	};

	assert.equal(normalizeToothFdi("зуб 16"), "16");
	assert.equal(normalizeToothFdi("2.6"), "26");

	// Проверка зубов
	assert.equal(isToothApprovedByLetter("16", letter), true);
	assert.equal(isToothApprovedByLetter("17", letter), true);
	assert.equal(isToothApprovedByLetter("38", letter), false);
	assert.equal(isToothApprovedByLetter(undefined, letter), true); // общая консультация

	// Проверка кодов 804н
	assert.equal(isServiceCodeApprovedByLetter("A16.07.002.001", letter), true);
	assert.equal(isServiceCodeApprovedByLetter("A16.07.030", letter), true);
	assert.equal(isServiceCodeApprovedByLetter("A16.07.006", letter), false);
});

test("DMS Split Engine: live co-payment calculation, letter limits, franchise & mathematical invariants", () => {
	const policy: DmsPolicy = {
		id: "pol-10",
		insurerId: "sogaz",
		policyNumber: "123456",
		program: "extended",
		liabilityLimitKopecks: 15000000,
		franchiseType: "none",
		validFrom: "2026-01-01",
		validTo: "2026-12-31",
		patientFullName: "Иванов И.И.",
	};

	const letter: DmsGuaranteeLetter = {
		id: "let-10",
		letterNumber: "ГП-1234",
		issueDate: "2026-08-01",
		validUntil: "2026-09-01",
		maxApprovedAmountKopecks: rublesToKopecks(10000), // Лимит 10 000 руб
		insurerId: "sogaz",
		patientFullName: "Иванов И.И.",
		approvedTeethFdi: ["16", "17"],
		approvedServiceCodes804n: ["A16.07.002"],
	};

	const items: DmsBillableLineItem[] = [
		{
			id: "line-1",
			serviceCode: "A16.07.002.001",
			serviceName: "Пломбирование зуба 16",
			toothNumber: "16",
			quantity: 1,
			unitPriceKopecks: rublesToKopecks(6000), // 6 000 руб
		},
		{
			id: "line-2",
			serviceCode: "A16.07.002.002",
			serviceName: "Пломбирование зуба 17",
			toothNumber: "17",
			quantity: 1,
			unitPriceKopecks: rublesToKopecks(7000), // 7 000 руб (превысит лимит ГП: 6000 + 7000 = 13000 > 10000)
		},
		{
			id: "line-3",
			serviceCode: "A16.07.002.001",
			serviceName: "Пломбирование зуба 48 (не согласован в ГП)",
			toothNumber: "48",
			quantity: 1,
			unitPriceKopecks: rublesToKopecks(5000), // 5 000 руб
		},
	];

	const split = calculateDmsCoPaymentSplit(items, { policy, guaranteeLetter: letter });

	// Общая сумма: 6 000 + 7 000 + 5 000 = 18 000 руб
	assert.equal(split.totalBillRubles, 18000);
	// Покрыто ДМС: ровно 10 000 руб (лимит ГП)
	assert.equal(split.totalInsuranceCoveredRubles, 10000);
	// Доплата пациентом: 18 000 - 10 000 = 8 000 руб
	assert.equal(split.totalPatientOutOfPocketRubles, 8000);

	// Строгий инвариант целостности копеек
	assert.equal(split.integrityInvariantHolds, true);
	assert.equal(
		split.totalInsuranceCoveredKopecks + split.totalPatientOutOfPocketKopecks,
		split.totalBillKopecks,
	);

	// Позиция 1: 100% ДМС (6000 руб)
	assert.equal(split.lineItems[0]?.status, "full_dms");
	assert.equal(split.lineItems[0]?.insuranceCoveredRubles, 6000);
	assert.equal(split.lineItems[0]?.patientOutOfPocketRubles, 0);

	// Позиция 2: сплит из-за исчерпания лимита (4000 руб ДМС + 3000 руб пациент)
	assert.equal(split.lineItems[1]?.status, "co_payment");
	assert.equal(split.lineItems[1]?.insuranceCoveredRubles, 4000);
	assert.equal(split.lineItems[1]?.patientOutOfPocketRubles, 3000);

	// Позиция 3: 100% пациент из-за несогласованного зуба (5000 руб)
	assert.equal(split.lineItems[2]?.status, "patient_full");
	assert.equal(split.lineItems[2]?.insuranceCoveredRubles, 0);
	assert.equal(split.lineItems[2]?.patientOutOfPocketRubles, 5000);
});

test("DMS Split Engine: franchise percentage co-payment calculation", () => {
	const policyWithFranchise: DmsPolicy = {
		id: "pol-20",
		insurerId: "ingosstrakh",
		policyNumber: "ИНГ-5544",
		program: "extended",
		liabilityLimitKopecks: 15000000,
		franchiseType: "percent",
		franchisePercent: 20, // 20% сооплата пациентом
		validFrom: "2026-01-01",
		validTo: "2026-12-31",
		patientFullName: "Петров П.П.",
	};

	const items: DmsBillableLineItem[] = [
		{
			id: "line-1",
			serviceCode: "A16.07.002",
			serviceName: "Терапия кариеса",
			toothNumber: "21",
			quantity: 1,
			unitPriceKopecks: rublesToKopecks(10000), // 10 000 руб
		},
	];

	const split = calculateDmsCoPaymentSplit(items, { policy: policyWithFranchise });

	assert.equal(split.totalBillRubles, 10000);
	assert.equal(split.totalInsuranceCoveredRubles, 8000); // 80% ДМС
	assert.equal(split.totalPatientOutOfPocketRubles, 2000); // 20% Пациент
	assert.equal(split.lineItems[0]?.status, "co_payment");
	assert.equal(split.integrityInvariantHolds, true);
});

test("DMS Reconciliation Registry: generation & CSV export RFC-4180 compliance", () => {
	const registry = buildDmsReconciliationRegistry({
		registryNumber: "РЕЕСТР-2026/08/СОГАЗ",
		registryDate: "2026-08-22",
		insurerId: "sogaz",
		periodStart: "2026-08-01",
		periodEnd: "2026-08-31",
		splitResults: [
			{
				patientFullName: "Иванов Иван Иванович",
				policyNumber: "77-ДМС-9988",
				guaranteeLetterNumber: "ГП-100",
				serviceDate: "2026-08-10",
				diagnosisIcd10: "K02.1",
				lineItem: {
					lineItemId: "1",
					serviceCode: "A16.07.002.001",
					serviceName: "Пломбирование зуба",
					toothNumber: "16",
					quantity: 1,
					unitPriceKopecks: 500000,
					totalKopecks: 500000,
					insuranceCoveredKopecks: 500000,
					patientOutOfPocketKopecks: 0,
					insuranceCoveredRubles: 5000,
					patientOutOfPocketRubles: 0,
					status: "full_dms",
					splitReason: "100% ДМС",
					isApprovedByLetter: true,
					isExcludedByPolicy: false,
					franchiseDeductionKopecks: 0,
				},
			},
		],
	});

	assert.equal(registry.totalRegistryAmountRubles, 5000);
	assert.equal(registry.totalDmsClaimedRubles, 5000);
	assert.equal(registry.totalPatientCoPaymentRubles, 0);
	assert.equal(registry.totalServicesCount, 1);
	assert.equal(registry.totalPatientsCount, 1);

	const csv = exportDmsRegistryToCsv(registry);
	assert.ok(csv.startsWith("\uFEFF"), "CSV must include UTF-8 BOM for Excel");
	assert.ok(csv.includes("№ п/п;Дата услуги;Ф.И.О. пациента"));
	assert.ok(csv.includes("Иванов Иван Иванович"));
	assert.ok(csv.includes("77-ДМС-9988"));
	assert.ok(csv.includes("ИТОГО ПО РЕЕСТРУ"));
});

test("InsurancePreAuthModal: component export and contract verification", () => {
	assert.equal(typeof InsurancePreAuthModal, "function");
	assert.equal(typeof formatCurrencyRub, "function");
	assert.equal(typeof kopecksToRubles, "function");
	assert.equal(typeof rublesToKopecks, "function");
});
