import React from "react";
import { FamilyWalletPanel } from "../../components/finance/FamilyWalletPanel";
import { ServiceCatalogStrip } from "../../FinancePlanning";
import { FinanceTransactionsTable } from "./FinanceTransactionsTable";

export interface FinanceTransactionsSectionProps {
	readonly s: any;
}

export function FinanceTransactionsSection({ s }: FinanceTransactionsSectionProps): React.JSX.Element {
	return (
		<>
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

			<div className="mt-6">
				<FamilyWalletPanel
					patientId={s.effectivePatient?.id || s.documentPatient?.id || ""}
					remainingDebtRub={s.effectiveBillingSummary?.totalDueRub ?? s.billingSummary?.totalDueRub ?? 0}
					onPaymentSuccess={s.reloadAfterFamilyPayment}
				/>
			</div>
		</>
	);
}
