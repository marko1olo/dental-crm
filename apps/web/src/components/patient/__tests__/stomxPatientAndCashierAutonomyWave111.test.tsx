/**
 * apps/web/src/components/patient/__tests__/stomxPatientAndCashierAutonomyWave111.test.tsx
 *
 * Wave 111 Unit Test Suite:
 * 1. PatientGeneralInfoTab — StomX Marketing Sources & Statutory Legal Representatives (СК РФ ст. 64 / 323-ФЗ ст. 20)
 * 2. CashShiftClosingModal — 1-click StomX Cash In Presets (Внесение для размена, аванс, подотчет)
 * 3. Total eradication of synthetic mock patients from ChairsideTabletConsentModal, CmoEmrAuditModal, PatientRecallsHubModal
 */

import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";
import { CashShiftClosingModal } from "../../billing/CashShiftClosingModal";
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

test("Wave 111 — CashShiftClosingModal renders 1-click StomX cash-in preset buttons", () => {
	const markup = renderToStaticMarkup(
		<CashShiftClosingModal
			isOpen={true}
			onClose={() => {}}
			shiftNumber={101}
			cashierFullName="Кассир"
			operations={[]}
		/>,
	);

	assert.ok(
		markup.includes("data-testid=\"cash-shift-closing-modal\""),
		"Must render cash shift closing modal",
	);
	assert.ok(
		markup.includes("Сверка фактической наличности"),
		"Must render cash reconciliation section",
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

	// 1. ChairsideTabletConsentModal
	const consentPath = path.join(webComponentsDir, "chairside/ChairsideTabletConsentModal.tsx");
	const consentContent = fs.readFileSync(consentPath, "utf-8");
	assert.ok(
		!consentContent.includes("Иванова Анна Сергеевна"),
		"ChairsideTabletConsentModal must not contain synthetic Ivanova Anna",
	);
	assert.ok(
		!consentContent.includes("Барабаш Сергей Владимирович"),
		"ChairsideTabletConsentModal must not contain synthetic Barabash",
	);
	assert.ok(
		!consentContent.includes("4510 № 123456"),
		"ChairsideTabletConsentModal must not contain hardcoded fake passport 4510",
	);
	assert.ok(
		!consentContent.includes("043/у-7842"),
		"ChairsideTabletConsentModal must not contain hardcoded card 043/у-7842",
	);
	assert.ok(
		!consentContent.includes("A16.07.002.001"),
		"ChairsideTabletConsentModal must not contain mock treatmentItems with serviceCode A16.07.002.001",
	);

	// 2. CmoEmrAuditModal
	const cmoPath = path.join(webComponentsDir, "emr/audit/CmoEmrAuditModal.tsx");
	const cmoContent = fs.readFileSync(cmoPath, "utf-8");
	assert.ok(
		!cmoContent.includes("Смирнов Алексей Владимирович"),
		"CmoEmrAuditModal must not contain synthetic Smirnov Alexey",
	);
	assert.ok(
		!cmoContent.includes("Прохоров Константин Игоревич"),
		"CmoEmrAuditModal must not contain synthetic Prokhorov Konstantin",
	);
	assert.ok(
		cmoContent.includes("INITIAL_DEMO_RECORDS: EmrAuditRecord[] = []"),
		"CmoEmrAuditModal must have empty INITIAL_DEMO_RECORDS",
	);

	// 3. PatientRecallsHubModal
	const recallsPath = path.join(webComponentsDir, "recalls/PatientRecallsHubModal.tsx");
	const recallsContent = fs.readFileSync(recallsPath, "utf-8");
	assert.ok(
		!recallsContent.includes("DEFAULT_REGISTRY"),
		"PatientRecallsHubModal must not contain DEFAULT_REGISTRY",
	);

	// 4. CashShiftClosingModal & cashShiftClosingEngine
	const cashModalPath = path.join(webComponentsDir, "billing/CashShiftClosingModal.tsx");
	const cashModalContent = fs.readFileSync(cashModalPath, "utf-8");
	assert.ok(
		!cashModalContent.includes("Смирновой"),
		"CashShiftClosingModal must not contain synthetic Smirnov in explanation placeholder",
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
