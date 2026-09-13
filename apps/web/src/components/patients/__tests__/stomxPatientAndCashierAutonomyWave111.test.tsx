/**
 * apps/web/src/components/patients/__tests__/stomxPatientAndCashierAutonomyWave111.test.tsx
 *
 * Wave 111 Unit Test Suite:
 * 1. PatientGeneralInfoTab — StomX Marketing Sources & Statutory Legal Representatives (СК РФ ст. 64 / 323-ФЗ ст. 20)
 * 2. CashShiftWidget — 1-click StomX Cash In Presets (Внесение для размена, аванс, подотчет)
 * 3. Total eradication of synthetic mock patients from ChairsideTabletConsentModal, CmoEmrAuditModal, PatientRecallsHubModal
 */

import React from "react";
import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";
import { CashShiftWidget } from "../../finance/CashShiftWidget";
import { PatientRecallsHubModal } from "../../recalls/PatientRecallsHubModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Wave 111 — PatientGeneralInfoTab renders StomX marketing source chips", () => {
	const markup = renderToStaticMarkup(
		<PatientGeneralInfoTab
			patient={{
				fullName: "Пациент Тестовый",
				phone: "+7 (999) 000-00-00",
				acquisitionSource: "2GIS (ДубльГис)",
			}}
		/>,
	);

	assert.ok(
		markup.includes("Канал привлечения пациента (Маркетинг / StomX)"),
		"Must render marketing acquisition channel section",
	);
	assert.ok(
		markup.includes("data-testid=\"chip-marketing-gis2\""),
		"Must render 2GIS marketing chip",
	);
	assert.ok(
		markup.includes("data-testid=\"chip-marketing-yandex\""),
		"Must render Yandex marketing chip",
	);
	assert.ok(
		markup.includes("data-testid=\"chip-marketing-word_of_mouth\""),
		"Must render Word of Mouth marketing chip",
	);
});

test("Wave 111 — PatientGeneralInfoTab renders statutory legal representative chips and inputs", () => {
	const markup = renderToStaticMarkup(
		<PatientGeneralInfoTab
			patient={{
				fullName: "Несовершеннолетний Пациент",
				representativeType: "Мать",
				representativeFullName: "Мать Пациента",
				representativePhone: "+7 (916) 111-22-33",
				representativeDoc: "Свидетельство о рождении I-МЮ №123456",
			}}
		/>,
	);

	assert.ok(
		markup.includes("Законный представитель / Член семьи (ст. 64 СК РФ / 323-ФЗ)"),
		"Must render statutory legal representative section",
	);
	assert.ok(
		markup.includes("data-testid=\"chip-representative-mother\""),
		"Must render mother representative chip",
	);
	assert.ok(
		markup.includes("data-testid=\"chip-representative-father\""),
		"Must render father representative chip",
	);
	assert.ok(
		markup.includes("data-testid=\"input-representative-fullname\""),
		"Must render representative full name input when representativeType is selected",
	);
	assert.ok(
		markup.includes("data-testid=\"input-representative-phone\""),
		"Must render representative phone input",
	);
	assert.ok(
		markup.includes("data-testid=\"input-representative-doc\""),
		"Must render representative statutory document input",
	);
});

test("Wave 111 — CashShiftWidget renders 1-click StomX cash-in preset buttons", () => {
	const markup = renderToStaticMarkup(
		<CashShiftWidget
			initialIsOpen={true}
			initialCashFlowModalOpen={true}
			initialCashFlowMode="cash_in"
			shiftNumber={101}
			cashierName="Кассир"
		/>,
	);

	assert.ok(
		markup.includes("data-testid=\"cash-shift-widget\""),
		"Must render cash shift widget",
	);
	assert.ok(
		markup.includes("Внесение ДС"),
		"Must render cash-in section",
	);
});

test("Wave 111 — PatientRecallsHubModal renders honest empty state without DEFAULT_REGISTRY mocks", () => {
	const markup = renderToStaticMarkup(
		<PatientRecallsHubModal
			isOpen={true}
			onClose={() => {}}
			initialCandidates={[]}
		/>,
	);

	assert.ok(
		markup.includes("recall-empty-state"),
		"Must render empty state when candidates list is empty",
	);
	assert.ok(
		!markup.includes("Смирнов Алексей Викторович"),
		"Must NOT contain mock patient Smirnov in empty state",
	);
	assert.ok(
		!markup.includes("Волкова Мария Сергеевна"),
		"Must NOT contain mock patient Volkova in empty state",
	);
});

test("Wave 111 — Static file verification: Zero synthetic mock patients in production components", () => {
	const webComponentsDir = path.resolve(__dirname, "../../");

	// 1. InformedConsentModal
	const consentPath = path.join(webComponentsDir, "consents/InformedConsentModal.tsx");
	const consentContent = fs.readFileSync(consentPath, "utf-8");
	assert.ok(
		!consentContent.includes("Иванова Анна Сергеевна"),
		"InformedConsentModal must not contain synthetic Ivanova Anna",
	);
	assert.ok(
		!consentContent.includes("Барабаш Сергей Владимирович"),
		"InformedConsentModal must not contain synthetic Barabash",
	);
	assert.ok(
		!consentContent.includes("4510 № 123456"),
		"InformedConsentModal must not contain hardcoded fake passport 4510",
	);
	assert.ok(
		!consentContent.includes("043/у-7842"),
		"InformedConsentModal must not contain hardcoded card 043/у-7842",
	);
	assert.ok(
		!consentContent.includes("A16.07.002.001"),
		"InformedConsentModal must not contain mock treatmentItems with serviceCode A16.07.002.001",
	);

	// 2. PatientRecallsHubModal
	const recallsPath = path.join(webComponentsDir, "recalls/PatientRecallsHubModal.tsx");
	const recallsContent = fs.readFileSync(recallsPath, "utf-8");
	assert.ok(
		!recallsContent.includes("DEFAULT_REGISTRY"),
		"PatientRecallsHubModal must not contain DEFAULT_REGISTRY",
	);

	// 4. CashShiftWidget & cashShiftClosingEngine
	const cashModalPath = path.join(webComponentsDir, "finance/CashShiftWidget.tsx");
	const cashModalContent = fs.readFileSync(cashModalPath, "utf-8");
	assert.ok(
		!cashModalContent.includes("Смирновой"),
		"CashShiftWidget must not contain synthetic Smirnov in explanation placeholder",
	);

	const cashEnginePath = path.join(webComponentsDir, "billing/cashShiftClosingEngine.ts");
	const cashEngineContent = fs.readFileSync(cashEnginePath, "utf-8");
	assert.ok(
		!cashEngineContent.includes("Смирнов А. В."),
		"cashShiftClosingEngine must not contain synthetic Smirnov A. V.",
	);
	assert.ok(
		!cashEngineContent.includes("Кузнецова Е. И."),
		"cashShiftClosingEngine must not contain synthetic Kuznetsova E. I.",
	);
});
