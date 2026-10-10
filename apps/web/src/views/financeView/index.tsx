import { lazy, Suspense } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { ClinicalAiPersonalizePanel } from "../../ClinicalAiPersonalizePanel";
import { ClinicalRulePanel } from "../../ClinicalRulePanel";
import { FamilyWalletPanel } from "../../components/finance/FamilyWalletPanel";
import { FinanceInvoicesModal } from "../../components/finance/FinanceInvoicesModal";
import { FinanceCashboxModal } from "../../components/finance/FinanceCashboxModal";
import { PatientBillingModal } from "../../components/finance/PatientBillingModal";
import { QuickExpenseModal } from "../../components/finance/QuickExpenseModal";
import { TaxDeductionCertificateModal } from "../../components/finance/TaxDeductionCertificateModal";
import { ServiceCatalogStrip } from "../../FinancePlanning";
import { PaymentCapture } from "../../PaymentCapture";
import { FinanceOperationsToolbar } from "./FinanceOperationsToolbar";
import { FinanceSummaryCards } from "./FinanceSummaryCards";
import { FinanceTransactionsTable } from "./FinanceTransactionsTable";
import type { FinanceViewComponentProps } from "./types.js";
import { useFinanceView } from "./useFinanceView";

const ManagerialPnlDashboardModal = lazy(() =>
	import("../../components/finance/pnl/ManagerialPnlDashboardModal").then((m) => ({
		default: m.ManagerialPnlDashboardModal,
	})),
);

export function FinanceView(rawProps?: FinanceViewComponentProps) {
	const s = useFinanceView(rawProps);

	return (
		<div className="finance-panel border-0 bg-transparent p-0 shadow-none pb-32 max-sm:pb-48 max-w-full min-w-0 overflow-x-hidden" id="finance">
			<FinanceOperationsToolbar
				pendingCheckout={s.pendingCheckout}
				onResetPendingCheckout={() => {
					sessionStorage.removeItem("dente_pending_checkout");
					localStorage.removeItem("dente_pending_checkout");
					s.setPendingCheckout(null);
				}}
				effectivePatient={s.effectivePatient}
				effectiveBillingSummary={s.effectiveBillingSummary}
				isCashShiftOpen={s.isCashShiftOpen}
				onToggleCashShift={() => s.setIsCashShiftOpen((prev) => !prev)}
				isShiftOpen={s.isShiftOpen}
				onPayDebtQuick={() => {
					if (s.effectiveBillingSummary?.totalDueRub) {
						s.setPaymentAmount(String(s.effectiveBillingSummary.totalDueRub));
						s.focusPaymentCapture();
					}
				}}
				money={s.money}
				onOpenInvoices={() => s.setIsInvoicesOpen(true)}
				isFinanceOptionsOpen={s.isFinanceOptionsOpen}
				onToggleFinanceOptions={() => s.setIsFinanceOptionsOpen((prev) => !prev)}
				onCloseFinanceOptions={() => s.setIsFinanceOptionsOpen(false)}
				onOpenPnl={() => s.setIsPnlOpen(true)}
				onGoToDocuments={s.onGoToDocuments}
				onOpenCashbox={() => s.setIsCashboxOpen(true)}
				onOpenBillingAct={() => s.setIsBillingActOpen(true)}
				onOpenQuickExpense={() => s.setIsQuickExpenseOpen(true)}
				onOpenTaxCertificate={() => s.setIsTaxModalOpen(true)}
				shiftNumber={s.shiftNumber}
				paymentFiscalCashierName={s.paymentFiscalCashierName}
				cashInDrawerRub={s.cashInDrawerRub}
				cardSumRub={s.cardSumRub}
				sbpSumRub={s.sbpSumRub}
				advanceOffsetRub={s.advanceOffsetRub}
				onOpenShift={s.handleOpenShift}
				onCloseShift={s.handleCloseShift}
				onCashIn={s.handleCashIn}
				onCashOut={s.handleCashOut}
				onPrintXReport={s.handlePrintXReport}
			/>

			<FinanceSummaryCards
				activePaymentsCount={(s.activePayments ?? []).length}
				billingSummary={s.effectiveBillingSummary}
				money={s.money}
				onGoToVisit={s.onGoToVisit}
				priorityLabels={s.scenarioPriorityLabels}
				scenarios={s.activeTreatmentPlanScenarios ?? []}
				strategyLabels={s.scenarioStrategyLabels}
				onOpenTaxCertificateModal={() => s.setIsTaxModalOpen(true)}
				dayPayments={s.dashboard?.payments ?? s.activePayments ?? []}
				methodLabels={s.paymentMethodLabels}
			/>

			{/* Сворачиваемый блок клинических рекомендаций и правил (отображается только при наличии активных правил или замечаний) */}
			{s.hasActiveClinicalRules && (
				<details
					className="clinical-recommendations-accordion group rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs shadow-xs my-0.5 sm:my-1 select-none"
					data-testid="clinical-recommendations-accordion"
				>
					<summary className="flex items-center justify-between cursor-pointer font-medium text-[var(--ink)] list-none hover:text-[var(--teal)] transition-colors min-h-[26px]">
						<div className="flex items-center gap-1.5">
							<FileText size={13} className="text-[var(--teal)] shrink-0" />
							<span className="text-[11px] sm:text-xs">Клинические рекомендации и правила</span>
							{s.clinicalRuleSummary && (
								<span className="text-[10px] sm:text-[11px] text-[var(--muted)] font-normal">
									{((s.clinicalRuleSummary.unresolved ?? 0) > 0
										? `${s.clinicalRuleSummary.unresolved} нерешённых`
										: s.clinicalRuleSummary.activeRules ?? 0)}
								</span>
							)}
						</div>
						<ChevronDown
							size={13}
							className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180 shrink-0"
						/>
					</summary>
					<div className="pt-2 space-y-2">
						<ClinicalRulePanel
							actionLabels={s.clinicalRuleActionLabels}
							context="finance"
							evaluations={s.clinicalRuleEvaluations ?? []}
							patientId={s.documentPatient?.id ?? null}
							serviceTitle={s.serviceTitle}
							severityLabels={s.clinicalRuleSeverityLabels}
							staffRoleLabels={s.staffRoleLabels}
							summary={s.clinicalRuleSummary}
						/>

						<ClinicalAiPersonalizePanel
							context="finance"
							patientId={s.documentPatient?.id ?? null}
						/>
					</div>
				</details>
			)}

			{/* Контейнер кассового модуля с отступом pb-28 для исключения перекрытия интерактивных кнопок плавающим баром (Мандаты 8d, 8p) */}
			<div className="finance-cashbox-container pb-28 sm:pb-24">
				<PaymentCapture
					{...s.remainingDebtProp}
					amount={s.paymentAmount}
					feedback={s.paymentFeedback}
					fiscalCashierName={s.paymentFiscalCashierName}
					fiscalFd={s.paymentFiscalFd}
					fiscalFn={s.paymentFiscalFn}
					fiscalFpd={s.paymentFiscalFpd}
					fiscalReceiptIssuedAt={s.paymentFiscalReceiptIssuedAt}
					fiscalReceiptNumber={s.paymentFiscalReceiptNumber}
					fiscalReceiptUrl={s.paymentFiscalReceiptUrl}
					isSaving={s.isPaymentSaving}
					method={s.paymentMethod}
					methodLabels={s.paymentMethodLabels}
					onAmountChange={s.setPaymentAmount}
					onFiscalCashierNameChange={s.setPaymentFiscalCashierName}
					onFiscalFdChange={s.setPaymentFiscalFd}
					onFiscalFnChange={s.setPaymentFiscalFn}
					onFiscalFpdChange={s.setPaymentFiscalFpd}
					onFiscalReceiptIssuedAtChange={s.setPaymentFiscalReceiptIssuedAt}
					onFiscalReceiptNumberChange={s.setPaymentFiscalReceiptNumber}
					onFiscalReceiptUrlChange={s.setPaymentFiscalReceiptUrl}
					onMethodChange={s.setPaymentMethod}
					onPayerBirthDateChange={s.setPaymentPayerBirthDate}
					onPayerFullNameChange={s.setPaymentPayerFullName}
					onPayerIdentityDocumentChange={s.setPaymentPayerIdentityDocument}
					onPayerInnChange={s.setPaymentPayerInn}
					onPayerRelationshipChange={s.setPaymentPayerRelationship}
					onSubmit={s.onRecordPayment}
					onTaxDeductionCodeChange={s.setPaymentTaxDeductionCode}
					patientContextMessage={s.effectivePatient ? "" : s.paymentPatientContextMessage}
					patientContextReady={Boolean(s.effectivePatient)}
					patientDefaults={{
						birthDate: s.effectivePatient?.birthDate ?? null,
						fullName: s.effectivePatient?.fullName ?? null,
						identityDocument:
							s.effectivePatient?.administrativeProfile?.identityDocument ?? null,
						taxpayerInn:
							s.effectivePatient?.administrativeProfile?.taxpayerInn ?? null,
					}}
					patientId={s.effectivePatient?.id ?? null}
					payerBirthDate={s.paymentPayerBirthDate}
					payerFullName={s.paymentPayerFullName}
					payerIdentityDocument={s.paymentPayerIdentityDocument}
					payerInn={s.paymentPayerInn}
					payerRelationship={s.paymentPayerRelationship}
					taxDeductionCode={s.paymentTaxDeductionCode}
				/>
			</div>

			<FinanceTransactionsTable
				categoryLabels={s.serviceCategoryLabels}
				{...s.createDocumentProp}
				documents={s.dashboard?.documents ?? []}
				formatDateTime={s.formatDateTime}
				money={s.money}
				onFocusPaymentCapture={s.focusPaymentCapture}
				onGoToVisit={s.onGoToVisit}
				paymentFiscalReceiptLabel={s.paymentFiscalReceiptLabel}
				paymentMethodLabels={s.paymentMethodLabels}
				payments={s.activePayments ?? []}
				serviceCatalog={s.dashboard?.serviceCatalog ?? []}
				treatmentItems={s.activeTreatmentPlanItems ?? []}
				treatmentStatusLabels={s.treatmentStatusLabels}
			/>

			<ServiceCatalogStrip
				categoryLabels={s.serviceCategoryLabels}
				money={s.money}
				onGoToPrices={s.onGoToPrices}
				services={s.dashboard?.serviceCatalog ?? []}
			/>

			<div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<FamilyWalletPanel
					patientId={s.documentPatient?.id ?? ""}
					remainingDebtRub={s.billingSummary?.totalDueRub ?? 0}
					onPaymentSuccess={s.reloadAfterFamilyPayment}
				/>
			</div>

			{s.isPnlOpen && (
				<Suspense fallback={null}>
					<ManagerialPnlDashboardModal
						isOpen={s.isPnlOpen}
						onClose={() => s.setIsPnlOpen(false)}
					/>
				</Suspense>
			)}

			<FinanceInvoicesModal
				isOpen={s.isInvoicesOpen}
				onClose={() => {
					s.setIsInvoicesOpen(false);
					if (typeof window !== "undefined" && window.location.hash.toLowerCase().includes("invoices")) {
						window.location.hash = "finance";
					}
				}}
				patientId={s.documentPatient?.id}
				patientName={s.documentPatient?.fullName}
			/>

			<FinanceCashboxModal
				isOpen={s.isCashboxOpen}
				onClose={() => s.setIsCashboxOpen(false)}
				isShiftOpen={s.isShiftOpen}
				cashierName={s.paymentFiscalCashierName || "Врач-стоматолог / Кассир"}
				clinicName={s.dashboard?.clinicSettings?.name || "Стоматология ДЕНТЕ Премиум"}
				clinicInn={s.dashboard?.clinicSettings?.inn}
				patientId={s.documentPatient?.id}
				patientName={s.documentPatient?.fullName}
				patientPhone={s.documentPatient?.phone ?? undefined}
				patientDepositRub={s.documentPatient && typeof s.documentPatient.balanceRub === "number" && s.documentPatient.balanceRub > 0 ? s.documentPatient.balanceRub : 0}
				onPaymentComplete={() => {
					void s.loadDashboard?.();
					s.setIsCashboxOpen(false);
				}}
			/>

			{s.isBillingActOpen && (
				<PatientBillingModal
					isOpen={s.isBillingActOpen}
					onClose={() => s.setIsBillingActOpen(false)}
					patient={s.documentPatient ? {
						id: s.documentPatient.id,
						fullName: s.documentPatient.fullName,
						birthDate: s.documentPatient.birthDate,
						phone: s.documentPatient.phone,
						address: s.documentPatient.address,
						medicalCardNumber: s.documentPatient.medicalCardNumber,
						depositRub: s.documentPatient.depositRub,
						familyBalanceRub: s.documentPatient.familyBalanceRub,
					} : null}
					patientDepositRub={s.documentPatient?.depositRub ?? 0}
					patientFamilyBalanceRub={s.documentPatient?.familyBalanceRub ?? 0}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
				/>
			)}

			{s.isQuickExpenseOpen && (
				<QuickExpenseModal
					isOpen={s.isQuickExpenseOpen}
					onClose={() => s.setIsQuickExpenseOpen(false)}
					onSuccess={() => {
						void s.loadDashboard?.();
					}}
				/>
			)}

			{s.isTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={s.isTaxModalOpen}
					onClose={() => s.setIsTaxModalOpen(false)}
					patientName={s.activePatient?.fullName || s.documentPatient?.fullName || ""}
					patientBirthDate={s.activePatient?.birthDate || s.documentPatient?.birthDate || undefined}
					patientInn={s.activePatient?.inn || s.documentPatient?.inn || ""}
					patientSnils={s.activePatient?.snils || s.documentPatient?.snils || ""}
					patientId={s.activePatient?.id || s.documentPatient?.id}
					clinicName={s.dashboard?.clinicSettings?.name}
					clinicInn={s.dashboard?.clinicSettings?.inn}
					payments={s.taxDeductionPayments}
				/>
			)}
		</div>
	);
}

export * from "./types.js";
export { useFinanceView } from "./useFinanceView.js";
export { FinanceOperationsToolbar } from "./FinanceOperationsToolbar.js";
export { FinanceSummaryCards } from "./FinanceSummaryCards.js";
export { FinanceTransactionsTable } from "./FinanceTransactionsTable.js";
export default FinanceView;
