import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { EmkToolbar } from "../emk/EmkToolbar.js";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm.js";
import { InstallmentsActionBar } from "../../billing/installments/InstallmentsActionBar.js";
import { DepositFooterActions } from "../../billing/depositModal/DepositFooterActions.js";
import { CheckoutDiscountAndPayerControls } from "../../cashbox/studioModules/checkout/CheckoutDiscountAndPayerControls.js";

import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_SRC = path.resolve(__dirname, "../../../");

describe("Red Team Clinical Inquisition: Mandates 8e & 8n Verification", () => {
	it("1.1 confirms btn-chairside-physiological-norm is visible, beautiful, and not hidden with sr-only in EmkToolbar", () => {
		const html = renderToString(
			<EmkToolbar
				activeEmkTab="all"
				setActiveEmkTab={() => {}}
				onApplyPhysiologicalNorm={() => {}}
				onApplyNorm={() => {}}
				onToggleStarProtocols={() => {}}
				onOpenConsent={() => {}}
				onPrintMedicalCard={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-chairside-physiological-norm"'), "Must render btn-chairside-physiological-norm");
		assert.ok(!html.includes('class="sr-only"'), "Must NOT hide physiological norm button with sr-only");
		assert.ok(html.includes("Соматически здоров") || html.includes("Норма"), "Must display human visible clinical label 'Соматически здоров / Норма'");
		assert.ok(!html.includes('data-testid="btn-chairside-physiological-norm" disabled'), "Physiological norm must not be disabled");
	});

	it("1.2 confirms btn-inline-diary-norm and btn-inline-diary-complaint-norm are visible in RecordNewDiaryInlineForm", () => {
		const html = renderToString(
			<RecordNewDiaryInlineForm
				selectedTooth="16"
				setSelectedTooth={() => {}}
				commonTeeth={[16, 26, 36, 46]}
				subjective=""
				setSubjective={() => {}}
				objective=""
				setObjective={() => {}}
				diagnosisText=""
				setDiagnosisText={() => {}}
				icd10Code=""
				setIcd10Code={() => {}}
				protocol=""
				setProtocol={() => {}}
				onApplyNorm={() => {}}
				onClear={() => {}}
				onSave={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-inline-diary-norm"'), "Must render btn-inline-diary-norm");
		assert.ok(html.includes("Интактный ряд"), "Must have physiological norm label 'Интактный ряд'");
		assert.ok(html.includes('data-testid="btn-inline-diary-complaint-norm"'), "Must render btn-inline-diary-complaint-norm");
		assert.ok(html.includes("Жалоб нет (плановый осмотр)"), "Must state 'Жалоб нет (плановый осмотр)'");
		assert.ok(!html.includes('class="sr-only"'), "Must not be sr-only");
	});

	it("2.1 confirms InstallmentsActionBar 'Принять очередной взнос' button is never disabled when plan is completed", () => {
		const html = renderToString(
			<InstallmentsActionBar
				activeSubView="schedule"
				setActiveSubView={() => {}}
				isPlanCompleted={true}
				onInitiateQuickPay={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-quick-pay-next"'), "Must render btn-quick-pay-next");
		assert.ok(!html.includes('disabled=""') && !html.includes("disabled"), "Button must not be dead disabled even when plan is completed");
		assert.ok(html.includes("Принять очередной взнос"), "Must have action text");
	});

	it("2.2 confirms DepositFooterActions 'Пополнить' button is never dead disabled when amount is 0", () => {
		const html = renderToString(
			<DepositFooterActions
				amountRub={0}
				isSubmitting={false}
				isCompleted={false}
				onClose={() => {}}
				onExecute={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-submit-deposit-topup"'), "Must render btn-submit-deposit-topup");
		assert.ok(!html.includes('disabled=""') && !html.includes("disabled="), "Button must not have disabled attribute when amount is 0 (shows soft guiding toast instead)");
	});

	it("3.1 confirms CheckoutDiscountAndPayerControls does not mandate INN for citizens and cleans statutory codes", () => {
		const html = renderToString(
			<CheckoutDiscountAndPayerControls
				isWarranty={false}
				setIsWarranty={() => {}}
				discountPercent={0}
				setDiscountPercent={() => {}}
				setCashReceivedRub={() => {}}
				setSplitCashRub={() => {}}
				setSplitCardRub={() => {}}
				setMethod={() => {}}
				payerType="physical_person"
				setPayerType={() => {}}
				buyerInn=""
				setBuyerInn={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'), "Must render physical person optional badge");
		assert.ok(html.includes("Пациент (физлицо)"), "Must state clearly that payer is citizen");
		assert.ok(!html.includes("54-ФЗ"), "Must not leak raw 54-FZ statute citation onto badge");
	});

	it("4.1 verifies source files purged of raw regulatory acronyms in UI strings", () => {
		const copilotFile = path.join(WEB_SRC, "components/copilot/CopilotStudioModal.tsx");
		const copilotContent = fs.readFileSync(copilotFile, "utf8");
		assert.ok(!copilotContent.includes("дневника 043/у"), "CopilotStudioModal must not contain 'дневника 043/у'");

		const usagePanelFile = path.join(WEB_SRC, "components/InventoryServiceUsagePanel.tsx");
		const usageContent = fs.readFileSync(usagePanelFile, "utf8");
		assert.ok(!usageContent.includes("Номенклатура 804н"), "InventoryServiceUsagePanel must not show 'Номенклатура 804н' in heading");
	});
});
