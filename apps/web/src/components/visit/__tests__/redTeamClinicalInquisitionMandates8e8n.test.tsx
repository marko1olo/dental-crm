import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { EmkToolbar } from "../emk/EmkToolbar.js";
import { RecordNewDiaryInlineForm } from "../../emr/record/tabs/RecordNewDiaryInlineForm.js";
import { InstallmentsActionBar } from "../../billing/installments/InstallmentsActionBar.js";
import { RefundModalFooter } from "../../finance/refunds/refundServiceModalModules/RefundModalFooter.js";
import { CheckoutDiscountAndPayerControls } from "../../cashbox/studioModules/checkout/CheckoutDiscountAndPayerControls.js";
import { CopilotStudioModal } from "../../copilot/CopilotStudioModal.js";
import { InventoryServiceUsagePanel } from "../../InventoryServiceUsagePanel.js";

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

	it("2.2 confirms RefundModalFooter 'Провести возврат' button is never dead disabled when !hasSelection (Mandate 8e)", () => {
		const html = renderToString(
			<RefundModalFooter
				activeTab="form"
				setActiveTab={() => {}}
				onClose={() => {}}
				handleExecuteRefund={async () => {}}
				isProcessing={false}
				hasSelection={false}
				calculation={{
					totalRefundRub: 0,
					totalRefundKopecks: 0,
					refundCashRub: 0,
					refundElectronicRub: 0,
					refundPrepaidRub: 0,
					remainingInvoiceDueRub: 0,
					itemsToRefund: [],
				}}
			/>,
		);

		assert.ok(html.includes("Провести возврат"), "Must render refund button");
		assert.ok(!html.includes("disabled") && !html.includes("disabled:cursor-not-allowed"), "Button must not be dead disabled when !hasSelection (guides with toast instead)");
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

		assert.ok(html.includes('data-testid="payer-selection-section"'), "Must render payer selection section");
		assert.ok(html.includes("Пациент (физлицо)"), "Must state clearly that payer is citizen");
		assert.ok(!html.includes("54-ФЗ"), "Must not leak raw 54-FZ statute citation onto badge");
	});

	it("4.1 verifies rendered CopilotStudioModal and InventoryServiceUsagePanel purge raw regulatory acronyms", () => {
		const copilotHtml = renderToString(
			<CopilotStudioModal isOpen={true} onClose={() => {}} />,
		);
		assert.ok(!copilotHtml.includes("дневника 043/у"), "CopilotStudioModal must not render 'дневника 043/у'");
		assert.ok(!copilotHtml.includes("043/у"), "CopilotStudioModal must not render raw 043/у");

		const usageHtml = renderToString(
			<InventoryServiceUsagePanel organizationId="org-1" />,
		);
		assert.ok(!usageHtml.includes("Номенклатура 804н"), "InventoryServiceUsagePanel must not render 'Номенклатура 804н'");
		assert.ok(usageHtml.includes("Технологические карты процедур"), "Must render plain Russian heading");
	});
});
