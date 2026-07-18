import type { Dashboard, Patient, PaymentMethod } from "@dental/shared";
import { useState } from "react";
import { motion } from "framer-motion";
import { ClinicalRulePanel } from "./ClinicalRulePanel";
import { CheckoutDrawer } from "./components/finance/CheckoutDrawer";
import { FamilyWalletPanel } from "./components/finance/FamilyWalletPanel";
import { InstallmentScheduler } from "./components/InstallmentScheduler";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { FinanceLedger } from "./FinanceLedger";
import {
	FinancePlanningOverview,
	ServiceCatalogStrip,
} from "./FinancePlanning";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";
import { motionSafeScrollIntoView } from "./motionPreference";
import { PaymentCapture } from "./PaymentCapture";
import { formatCurrencyNumeric } from "./utils/inputSanitation";

type ClinicalRuleEvaluation = Dashboard["clinicalRuleEvaluations"][number];
type Payment = Dashboard["payments"][number];
type ServiceCatalogItem = Dashboard["serviceCatalog"][number];
type TreatmentPlanItem = Dashboard["treatmentPlanItems"][number];
type TreatmentPlanScenario = Dashboard["treatmentPlanScenarios"][number];
type TaxDeductionCode = "" | "1" | "2";

export function FinanceView() {
	const {
		activePayments,
		activeTreatmentPlanItems,
		activeTreatmentPlanScenarios,
		patientBillingSummary: billingSummary,
		patientClinicalRuleEvaluations: clinicalRuleEvaluations,
		clinicalRuleActionLabels,
		clinicalRuleSeverityLabels,
		patientClinicalRuleSummary: clinicalRuleSummary,
		dashboard,
		documentPatient,
		formatDateTime,
		isPaymentSaving,
		money,
		createDocument: onCreateDocument,
		recordPayment: onRecordPayment,
		paymentAmount,
		paymentFeedback,
		paymentFiscalCashierName,
		paymentFiscalFd,
		paymentFiscalFn,
		paymentFiscalFpd,
		paymentFiscalReceiptIssuedAt,
		paymentFiscalReceiptNumber,
		paymentFiscalReceiptUrl,
		paymentFiscalReceiptLabelForUi: paymentFiscalReceiptLabel,
		paymentMethod,
		paymentMethodLabels,
		paymentPatientContextMessage,
		paymentPatientContextReady,
		paymentPayerBirthDate,
		paymentPayerFullName,
		paymentPayerIdentityDocument,
		paymentPayerInn,
		paymentPayerRelationship,
		paymentTaxDeductionCode,
		scenarioPriorityLabels,
		scenarioStrategyLabels,
		serviceCategoryLabels,
		serviceTitle,
		setPaymentAmount,
		setPaymentFiscalCashierName,
		setPaymentFiscalFd,
		setPaymentFiscalFn,
		setPaymentFiscalFpd,
		setPaymentFiscalReceiptIssuedAt,
		setPaymentFiscalReceiptNumber,
		setPaymentFiscalReceiptUrl,
		setPaymentMethod,
		setPaymentPayerBirthDate,
		setPaymentPayerFullName,
		setPaymentPayerIdentityDocument,
		setPaymentPayerInn,
		setPaymentPayerRelationship,
		setPaymentTaxDeductionCode,
		staffRoleLabels,
		treatmentStatusLabels,
		loadDashboard,
		setSettingsTab,
		selectRefundOriginalPayment,
	} = useAppLogicContext();
	const onFamilyWalletPayment = () => loadDashboard();
	const onGoToDocuments = () => {
		window.location.hash = "documents";
	};
	const onRefundPayment = (paymentId: string) => {
		if (!window.confirm("Вы действительно хотите начать процедуру возврата/коррекции этого платежа?")) {
			return;
		}
		selectRefundOriginalPayment(paymentId);
		if (onCreateDocument) {
			onCreateDocument("payment_refund_correction_request");
			window.location.hash = "documents";
		}
	};
	const onGoToPrices = () => {
		setSettingsTab("prices");
		window.location.hash = "settings/prices";
	};
	const onGoToVisit = () => {
		window.location.hash = "visit";
	};
	const workspaceFlags = useWorkspaceProfile();
	const [isCheckoutDrawerOpen, setIsCheckoutDrawerOpen] = useState(false);

	const focusPaymentCapture = () => {
		setIsCheckoutDrawerOpen(true);
	};

	return (
		<motion.div
			className="panel finance-panel glass-panel"
			id="finance"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
		>
			<div className="panel-heading">
				<div>
					<h2>Оплаты, план лечения и вычет</h2>
					<p className="finance-scope-label">
						Сводка по пациенту:{" "}
						{documentPatient?.fullName ?? "пациент не выбран"}
					</p>
				</div>
				<div style={{ display: "flex", gap: "12px" }}>
					<button className="primary-button" type="button" onClick={() => setIsCheckoutDrawerOpen(true)}>
						💳 Принять оплату
					</button>
					<button className="text-button" type="button" onClick={onGoToDocuments}>
						Документы
					</button>
				</div>
			</div>

			<FinancePlanningOverview
				activePaymentsCount={activePayments.length}
				billingSummary={billingSummary}
				money={money}
				onGoToVisit={onGoToVisit}
				priorityLabels={scenarioPriorityLabels}
				scenarios={activeTreatmentPlanScenarios}
				strategyLabels={scenarioStrategyLabels}
				treatmentItems={activeTreatmentPlanItems}
			/>

			{workspaceFlags.hasClinicalRules && (
				<ClinicalRulePanel
					actionLabels={clinicalRuleActionLabels}
					context="finance"
					evaluations={clinicalRuleEvaluations}
					serviceTitle={serviceTitle}
					severityLabels={clinicalRuleSeverityLabels}
					staffRoleLabels={staffRoleLabels}
					summary={clinicalRuleSummary}
				/>
			)}

			{documentPatient?.id && (
				<FamilyWalletPanel
					patientId={documentPatient.id}
					remainingDebtRub={billingSummary?.totalDueRub ?? 0}
					onPaymentSuccess={onFamilyWalletPayment}
				/>
			)}

			<CheckoutDrawer isOpen={isCheckoutDrawerOpen} onClose={() => setIsCheckoutDrawerOpen(false)}>
				<PaymentCapture
					remainingDebt={billingSummary?.totalDueRub}
					amount={paymentAmount}
					feedback={paymentFeedback}
					fiscalCashierName={paymentFiscalCashierName}
					fiscalFd={paymentFiscalFd}
					fiscalFn={paymentFiscalFn}
					fiscalFpd={paymentFiscalFpd}
					fiscalReceiptIssuedAt={paymentFiscalReceiptIssuedAt}
					fiscalReceiptNumber={paymentFiscalReceiptNumber}
					fiscalReceiptUrl={paymentFiscalReceiptUrl}
					isSaving={isPaymentSaving}
					method={paymentMethod}
					methodLabels={paymentMethodLabels}
					onAmountChange={(v) => setPaymentAmount(formatCurrencyNumeric(v))}
					onFiscalCashierNameChange={setPaymentFiscalCashierName}
					onFiscalFdChange={setPaymentFiscalFd}
					onFiscalFnChange={setPaymentFiscalFn}
					onFiscalFpdChange={setPaymentFiscalFpd}
					onFiscalReceiptIssuedAtChange={setPaymentFiscalReceiptIssuedAt}
					onFiscalReceiptNumberChange={setPaymentFiscalReceiptNumber}
					onFiscalReceiptUrlChange={setPaymentFiscalReceiptUrl}
					onMethodChange={setPaymentMethod}
					onPayerBirthDateChange={setPaymentPayerBirthDate}
					onPayerFullNameChange={setPaymentPayerFullName}
					onPayerIdentityDocumentChange={setPaymentPayerIdentityDocument}
					onPayerInnChange={setPaymentPayerInn}
					onPayerRelationshipChange={setPaymentPayerRelationship}
					onSubmit={onRecordPayment}
					onTaxDeductionCodeChange={setPaymentTaxDeductionCode}
					patientContextMessage={paymentPatientContextMessage}
					patientContextReady={paymentPatientContextReady}
					patientId={documentPatient?.id}
					patientDefaults={{
						birthDate: documentPatient?.birthDate ?? null,
						fullName: documentPatient?.fullName ?? null,
						identityDocument:
							documentPatient?.administrativeProfile?.identityDocument ?? null,
						taxpayerInn:
							documentPatient?.administrativeProfile?.taxpayerInn ?? null,
					}}
					payerBirthDate={paymentPayerBirthDate}
					payerFullName={paymentPayerFullName}
					payerIdentityDocument={paymentPayerIdentityDocument}
					payerInn={paymentPayerInn}
					payerRelationship={paymentPayerRelationship}
					taxDeductionCode={paymentTaxDeductionCode}
				/>

				{workspaceFlags.hasInstallments && (
					<InstallmentScheduler
						totalEstimate={billingSummary?.totalDueRub || 0}
						patientId={documentPatient?.id}
					/>
				)}
			</CheckoutDrawer>

			<FinanceLedger
				categoryLabels={serviceCategoryLabels}
				documents={dashboard.documents}
				formatDateTime={formatDateTime}
				money={money}
				onFocusPaymentCapture={focusPaymentCapture}
				onGoToVisit={onGoToVisit}
				onRefundPayment={onRefundPayment}
				paymentFiscalReceiptLabel={paymentFiscalReceiptLabel}
				paymentMethodLabels={paymentMethodLabels}
				payments={activePayments}
				serviceCatalog={dashboard.serviceCatalog}
				treatmentItems={activeTreatmentPlanItems}
				treatmentStatusLabels={treatmentStatusLabels}
				{...(onCreateDocument ? { onCreateDocument } : {})}
			/>

			<ServiceCatalogStrip
				categoryLabels={serviceCategoryLabels}
				money={money}
				onGoToPrices={onGoToPrices}
				services={dashboard.serviceCatalog}
			/>
		</motion.div>
	);
}
