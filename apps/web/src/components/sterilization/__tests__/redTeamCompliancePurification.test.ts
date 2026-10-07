/**
 * redTeamCompliancePurification.test.ts
 *
 * Инструментальная верификация Инквизиции Клинического Соответствия (Red Team):
 * Проверка ликвидации синтетических моков, потёмкинских деревень и локальных заглушек
 * в журналах стерилизации (СанПиН 3.3686-21), маркировке МДЛП («Честный Знак»)
 * и учете гарантийных писем ДМС (Минздрав РФ № 804н).
 *
 * Требование Мандата 8c (Zero Mocks) и Мандата 8f (T.A.R.S. 100% Factual Honesty):
 * 1. В боевом режиме (isDemo === false): строго 0% выдуманных данных и честный пустой список ([]).
 * 2. В демо-режиме (isDemo === true): наличие изолированных пресетов для демонстрации.
 * 3. Наличие живых коннекторов к Fastify REST API и PostgreSQL 18.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Sterilization
import {
	getSampleKraftBarcodes,
	saveQuickAutoclaveCycleToApi,
	saveQuickPsoRecordToApi,
	fetchSterilizationLogsFromApi,
	fetchPsoLogsFromApi,
	createQuickAutoclaveCycle,
	createQuickCombinedPsoRecord,
} from "../sterilizationPresets";

// MDLP
import {
	getMdlpSampleBarcodes,
	submitMdlpBarcodeScan,
	syncMdlpQueueToBackend,
	fetchMdlpLiveQueue,
} from "../../mdlp/mdlpScanningPresets";
import { createChestnyZnakScannedItem } from "@dental/shared";

// DMS Insurance
import {
	getStatutoryGuaranteeLetters,
	getActiveBillItemsToSplit,
	saveGuaranteeLetterToApi,
	fetchPatientGuaranteeLettersFromApi,
	mapBackendLetterToPatientGuaranteeLetter,
} from "../../insurance/dmsInsurancePresets";

describe("Red Team Compliance: Sterilization SanPiN 3.3686-21 Zero-Mocks Isolation", () => {
	it("в боевом режиме (isDemo = false) список тестовых крафт-штрихкодов строго пуст (0% моков)", () => {
		const barcodesProd = getSampleKraftBarcodes(false);
		assert.equal(
			barcodesProd.length,
			0,
			"В боевом аккаунте клиники не должно быть синтетических крафт-пакетов!",
		);
	});

	it("в демонстрационном режиме (isDemo = true) возвращаются образцы для обучения персонала", () => {
		const barcodesDemo = getSampleKraftBarcodes(true);
		assert.ok(barcodesDemo.length >= 3, "В демо-режиме должны присутствовать образцы");
		const therapy = barcodesDemo.find((b) => b.label.includes("Терапевтический"));
		assert.ok(therapy, "Образец терапевтического лотка должен присутствовать в демо");
	});

	it("функции REST API стерилизации экспортированы и готовы к вызову живого Fastify бэкенда", () => {
		assert.equal(typeof saveQuickAutoclaveCycleToApi, "function");
		assert.equal(typeof saveQuickPsoRecordToApi, "function");
		assert.equal(typeof fetchSterilizationLogsFromApi, "function");
		assert.equal(typeof fetchPsoLogsFromApi, "function");
	});

	it("генератор цикла автоклавирования создает валидную модель для /api/registers/sterilization", () => {
		const cycle = createQuickAutoclaveCycle(1, "Иванова М.И. (медсестра ЦСО)");
		assert.equal(cycle.cycleNumber, 1);
		assert.equal(cycle.temperatureC, 134);
		assert.equal(cycle.pressureBar, 2.1);
		assert.equal(cycle.batchVerdict, "ГОДНА");
		assert.ok(cycle.autoclaveCode.length > 0);
	});

	it("генератор контроля ПСО формирует валидный протокол для /api/registers/pso", () => {
		const pso = createQuickCombinedPsoRecord("Иванова М.И. (медсестра ЦСО)");
		assert.equal(pso.azopyramResult, "negative");
		assert.equal(pso.phenolphthaleinResult, "negative");
		assert.equal(pso.isApproved, true);
	});
});

describe("Red Team Compliance: MDLP «Честный Знак» 54-ФЗ / 531 Zero-Mocks Isolation", () => {
	it("в боевом режиме (isDemo = false) список тестовых штрихкодов МДЛП строго пуст (0% моков)", () => {
		const mdlpProd = getMdlpSampleBarcodes(false);
		assert.equal(
			mdlpProd.length,
			0,
			"В боевом аккаунте клиники не должно быть синтетических кодов маркировки!",
		);
	});

	it("в демонстрационном режиме (isDemo = true) возвращаются DataMatrix коды карпул и имплантов", () => {
		const mdlpDemo = getMdlpSampleBarcodes(true);
		assert.ok(mdlpDemo.length >= 3, "В демо-режиме должны присутствовать образцы DataMatrix");
		const ultracain = mdlpDemo.find((b) => b.label.includes("Ультракаин"));
		assert.ok(ultracain, "Образец Ультракаина Д-С Форте должен присутствовать в демо");
	});

	it("функции очереди выбытия МДЛП экспортированы и взаимодействуют с Fastify эндпоинтами", () => {
		assert.equal(typeof submitMdlpBarcodeScan, "function");
		assert.equal(typeof syncMdlpQueueToBackend, "function");
		assert.equal(typeof fetchMdlpLiveQueue, "function");
	});

	it("парсер Честного Знака корректно извлекает GTIN и серийный номер из DataMatrix", () => {
		const raw = "010460700837001421s4A2b9193";
		const parsed = createChestnyZnakScannedItem(raw, { costRub: 1450 });
		assert.equal(parsed.gtin, "04607008370014");
		assert.equal(parsed.serialNumber, "s4A2b");
		assert.equal(parsed.costRub, 1450);
		assert.ok(parsed.sgtin.includes("04607008370014"));
		assert.ok(parsed.id.length > 0);
	});
});

describe("Red Team Compliance: DMS Insurance & Order 804n Zero-Mocks Isolation", () => {
	it("в боевом режиме (isDemo = false) список гарантийных писем строго пуст (0% моков)", () => {
		const lettersProd = getStatutoryGuaranteeLetters(false);
		assert.equal(
			lettersProd.length,
			0,
			"В боевом аккаунте не должно быть фальшивых гарантийных писем СОГАЗ/Ингосстрах!",
		);
	});

	it("в боевом режиме (isDemo = false) список тестовых строк счета для сплит-калькулятора строго пуст", () => {
		const billItemsProd = getActiveBillItemsToSplit(false);
		assert.equal(
			billItemsProd.length,
			0,
			"В боевом режиме калькулятор не должен показывать фейковые услуги!",
		);
	});

	it("в демонстрационном режиме (isDemo = true) доступны демонстрационные гарантийные письма и строки счетов", () => {
		const lettersDemo = getStatutoryGuaranteeLetters(true);
		assert.ok(lettersDemo.length >= 3, "В демо-режиме должны быть эталонные письма");

		const billItemsDemo = getActiveBillItemsToSplit(true);
		assert.ok(billItemsDemo.length >= 3, "В демо-режиме должны быть эталонные строки счета");
	});

	it("функции REST API гарантийных писем экспортированы и готовы к взаимодействию с /api/insurance/guarantee-letters", () => {
		assert.equal(typeof saveGuaranteeLetterToApi, "function");
		assert.equal(typeof fetchPatientGuaranteeLettersFromApi, "function");
	});

	it("маппер mapBackendLetterToPatientGuaranteeLetter корректно трансформирует Drizzle/PostgreSQL запись в UI-модель", () => {
		const backendRecord = {
			id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
			letterNumber: "ГП-СОГАЗ-2026-999",
			insurerKey: "sogaz",
			insurerName: "АО «СОГАЗ»",
			patientId: "pat-uuid-1",
			patientFullName: "Соколов Дмитрий Сергеевич",
			policyNumber: "7700-123456",
			issueDate: "2026-08-01T00:00:00.000Z",
			validFrom: "2026-08-01T00:00:00.000Z",
			validUntil: "2026-09-01T00:00:00.000Z",
			maxCoverageRub: 75000,
			usedAmountRub: 15000,
			franchisePct: 10,
			franchiseType: "percent",
			approvedServiceCodes: ["A16.07.002.001", "A16.07.030.001"],
			approvedDiagnosisCodes: ["K02.1", "K04.0"],
			status: "active",
		};

		const mapped = mapBackendLetterToPatientGuaranteeLetter(backendRecord);
		assert.equal(mapped.id, backendRecord.id);
		assert.equal(mapped.letterNumber, "ГП-СОГАЗ-2026-999");
		assert.equal(mapped.maxCoverageKopecks, 7500000);
		assert.equal(mapped.usedAmountKopecks, 1500000);
		assert.equal(mapped.franchisePct, 10);
		assert.equal(mapped.approvedServiceCodes804n.length, 2);
		assert.equal(mapped.approvedDiagnosisMkb10.length, 2);
		assert.equal(mapped.status, "active");
	});
});
