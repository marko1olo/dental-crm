import React from "react";
import { FamilyWalletModal } from "../../components/patients/family/FamilyWalletModal";
import { ServiceCatalogStrip } from "../../FinancePlanning";
import { FinanceTransactionsTable } from "./FinanceTransactionsTable";
import type { FinanceViewState } from "./useFinanceView";

export interface FinanceTransactionsSectionProps {
	readonly s: FinanceViewState;
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
				<FamilyWalletModal
					isOpen={Boolean(s.effectivePatient?.id || s.documentPatient?.id)}
					onClose={() => {}}
					inline={true}
					patientId={s.effectivePatient?.id || s.documentPatient?.id || ""}
					patientName={s.effectivePatient?.fullName || s.documentPatient?.fullName || ""}
					onFamilyDataChanged={s.reloadAfterFamilyPayment}
				/>
			</div>
		</>
	);
}
