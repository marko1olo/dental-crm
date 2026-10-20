import { describe, it } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";
import { VisitDiaryHeaderActions } from "../diary/section/VisitDiaryHeaderActions.js";
import { VisitDiaryPresetsAccordion } from "../diary/section/VisitDiaryPresetsAccordion.js";
import { InstallmentsActionBar } from "../../billing/installments/InstallmentsActionBar.js";
import { DepositFooterActions } from "../../billing/depositModal/DepositFooterActions.js";
import { PaymentBuyerRequisitesSection } from "../../finance/paymentModalModules/PaymentBuyerRequisitesSection.js";

const WEB_SRC = path.resolve(__dirname, "../../../");

describe("Red Team Clinical Inquisition: Mandates 8e & 8n Verification", () => {
	it("1.1 confirms diary-norm-direct-btn is visible, beautiful, and not hidden with sr-only in VisitDiaryHeaderActions", () => {
		const html = renderToString(
			<VisitDiaryHeaderActions
				isLocked={false}
				isRevising={false}
				beginRevise={() => {}}
				onApplyNorm={() => {}}
				onOpenTemplates={() => {}}
				onOpenPrintPreview={() => {}}
				onOpenSummary={() => {}}
				onOpenPrescription={() => {}}
				onOpenRadiology={() => {}}
				onOpenTier3Perio={() => {}}
				onOpenEgisz={() => {}}
				onOpenBranding={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="diary-norm-direct-btn"'), "Must render diary-norm-direct-btn");
		assert.ok(!html.includes('id="diary-norm-direct-btn" data-testid="diary-norm-direct-btn" onClick="undefined" class="sr-only"'), "Must NOT hide diary-norm-direct-btn with sr-only");
		assert.ok(html.includes("Норма (здоров)"), "Must display human visible clinical label 'Норма (здоров)'");
		assert.ok(!html.includes('class="sr-only" tabIndex="-1" aria-hidden="true"'), "Must not be blind screen-reader only stub");
	});

	it("1.2 confirms diary-norm-043-btn is visible in VisitDiaryPresetsAccordion", () => {
		const html = renderToString(
			<VisitDiaryPresetsAccordion
				fieldsDisabled={false}
				onPopulateFromOdontogram={() => {}}
				onApplyNorm={() => {}}
				handleInsertPerioStatus={() => {}}
				handleApplyPerioPathology={() => {}}
				handleInsertPediatricStatus={() => {}}
				applyClinicalPreset={() => {}}
				onOpenTemplatesModal={() => {}}
				isLocked={false}
				isRevising={false}
				beginRevise={() => {}}
				setDiary={() => {}}
				setIcdSearch={() => {}}
				scheduleDebouncedSave={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="diary-norm-043-btn"'), "Must render diary-norm-043-btn");
		assert.ok(html.includes("Физиологическая норма"), "Must have physiological norm label");
		assert.ok(!html.includes('data-testid="diary-norm-043-btn" class="sr-only"'), "Must not be sr-only");
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

	it("3.1 confirms PaymentBuyerRequisitesSection does not mandate INN for citizens and cleans statutory codes", () => {
		const dummyTendersHook: any = {
			payerType: "physical",
			buyerInn: "",
			handleInnChange: () => {},
			buyerInnError: null,
			setPayerType: () => {},
		};

		const html = renderToString(
			<PaymentBuyerRequisitesSection tendersHook={dummyTendersHook} />,
		);

		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'), "Must render physical person optional badge");
		assert.ok(html.includes("Для физлиц не требуется"), "Must state clearly that INN is not required for citizens");
		assert.ok(!html.includes("По 54-ФЗ для физлиц"), "Must not leak raw 54-FZ statute citation onto badge");
	});

	it("4.1 verifies source files purged of raw regulatory acronyms in UI strings", () => {
		const cockpitFile = path.join(WEB_SRC, "components/ai/DentalAgentCockpit.tsx");
		const cockpitContent = fs.readFileSync(cockpitFile, "utf8");
		assert.ok(!cockpitContent.includes("дневника 043/у"), "DentalAgentCockpit must not contain 'дневника 043/у'");

		const usagePanelFile = path.join(WEB_SRC, "components/InventoryServiceUsagePanel.tsx");
		const usageContent = fs.readFileSync(usagePanelFile, "utf8");
		assert.ok(!usageContent.includes("Номенклатура 804н"), "InventoryServiceUsagePanel must not show 'Номенклатура 804н' in heading");
	});
});
