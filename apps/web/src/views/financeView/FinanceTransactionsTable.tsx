import type { Dashboard, Payment, PaymentMethod } from "@dental/shared";
import { FinanceLedger } from "../../FinanceLedger";
import type { ServiceCatalogItem, TreatmentPlanItem } from "./types.js";

export interface FinanceTransactionsTableProps {
	categoryLabels: Record<ServiceCatalogItem["category"], string>;
	onCreateDocument?: (kind: string) => void;
	documents: Dashboard["documents"];
	formatDateTime: (value: string) => string;
	money: (value: number | null) => string;
	onFocusPaymentCapture: () => void;
	onGoToVisit: () => void;
	paymentFiscalReceiptLabel: (
		payment: Pick<Payment, "id" | "fiscalReceiptNumber" | "fiscalReceipt">,
	) => string;
	paymentMethodLabels: Record<PaymentMethod, string>;
	payments: Payment[];
	serviceCatalog: ServiceCatalogItem[];
	treatmentItems: TreatmentPlanItem[];
	treatmentStatusLabels: Record<TreatmentPlanItem["status"], string>;
}

export function FinanceTransactionsTable({
	categoryLabels,
	onCreateDocument,
	documents,
	formatDateTime,
	money,
	onFocusPaymentCapture,
	onGoToVisit,
	paymentFiscalReceiptLabel,
	paymentMethodLabels,
	payments,
	serviceCatalog,
	treatmentItems,
	treatmentStatusLabels,
}: FinanceTransactionsTableProps) {
	const createDocumentProp = onCreateDocument ? { onCreateDocument } : {};

	return (
		<FinanceLedger
			categoryLabels={categoryLabels}
			{...createDocumentProp}
			documents={documents}
			formatDateTime={formatDateTime}
			money={money}
			onFocusPaymentCapture={onFocusPaymentCapture}
			onGoToVisit={onGoToVisit}
			paymentFiscalReceiptLabel={paymentFiscalReceiptLabel}
			paymentMethodLabels={paymentMethodLabels}
			payments={payments}
			serviceCatalog={serviceCatalog}
			treatmentItems={treatmentItems}
			treatmentStatusLabels={treatmentStatusLabels}
		/>
	);
}
