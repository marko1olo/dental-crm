import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { CashShiftWidget } from "../../finance/CashShiftWidget";
import { PatientRecallsHubModal } from "../../recalls/PatientRecallsHubModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("Wave 111 — CashShiftWidget renders 1-click cash-in preset buttons", () => {
	const markup = renderToStaticMarkup(
		<CashShiftWidget initialIsOpen={true} initialCashFlowModalOpen={true} initialCashFlowMode="cash_in" shiftNumber={101} cashierName="Кассир" />,
	);
	assert.ok(markup.includes('data-testid="cash-shift-widget"'));
	assert.ok(markup.includes("Внесение ДС"));
});

test("Wave 111 — PatientRecallsHubModal renders honest empty state without DEFAULT_REGISTRY mocks", () => {
	const markup = renderToStaticMarkup(
		<PatientRecallsHubModal isOpen={true} onClose={() => {}} initialCandidates={[]} />,
	);
	assert.ok(markup.includes("recall-empty-state"));
	assert.ok(!markup.includes("Смирнов Алексей Викторович"));
	assert.ok(!markup.includes("Волкова Мария Сергеевна"));
});

test("Wave 111 — Static file verification: Zero synthetic mock patients in production components", () => {
	const webComponentsDir = path.resolve(__dirname, "../../");
	const consentPath = path.join(webComponentsDir, "consents/InformedConsentModal.tsx");
	const consentContent = fs.readFileSync(consentPath, "utf-8");
	assert.ok(!consentContent.includes("Иванова Анна Сергеевна"));
	assert.ok(!consentContent.includes("Барабаш Сергей Владимирович"));
	assert.ok(!consentContent.includes("4510 № 123456"));
	assert.ok(!consentContent.includes("A16.07.002.001"));

	const recallsPath = path.join(webComponentsDir, "recalls/PatientRecallsHubModal.tsx");
	const recallsContent = fs.readFileSync(recallsPath, "utf-8");
	assert.ok(!recallsContent.includes("DEFAULT_REGISTRY"));

	const cashModalPath = path.join(webComponentsDir, "finance/CashShiftWidget.tsx");
	const cashModalContent = fs.readFileSync(cashModalPath, "utf-8");
	assert.ok(!cashModalContent.includes("Смирновой"));

	const cashEnginePath = path.join(webComponentsDir, "billing/cashShiftClosingEngine.ts");
	const cashEngineContent = fs.readFileSync(cashEnginePath, "utf-8");
	assert.ok(!cashEngineContent.includes("Смирнов А. В."));
	assert.ok(!cashEngineContent.includes("Кузнецова Е. И."));
});
