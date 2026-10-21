import type React from "react";
import { LiveInvoiceCategoryBreakdown } from "./LiveInvoiceCategoryBreakdown";
import { LiveInvoiceDiscountToolbar } from "./LiveInvoiceDiscountToolbar";
import { LiveInvoiceFiscalBridge } from "./LiveInvoiceFiscalBridge";
import { LiveInvoiceHeader } from "./LiveInvoiceHeader";
import { LiveInvoiceItemsList } from "./LiveInvoiceItemsList";
import { LiveInvoiceSummaryFooter } from "./LiveInvoiceSummaryFooter";
import type {
	LiveInvoiceCashierExport,
	LiveInvoiceItem,
} from "./odontogramLiveInvoiceCalculations";
import type { ToothData } from "./ToothChart";
import { useLiveInvoiceState } from "./useLiveInvoiceState";

export * from "./odontogramLiveInvoiceCalculations";

export interface OdontogramLiveInvoiceProps {
	teethData: readonly ToothData[];
	isOpen: boolean;
	onClose: () => void;
	onGenerateTreatmentPlan?: ((items: LiveInvoiceItem[]) => void) | undefined;
	onCreateInvoice?: ((invoice: LiveInvoiceCashierExport) => void) | undefined;
	onPrintEstimate?: (() => void) | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	className?: string | undefined;
}

export const OdontogramLiveInvoice: React.FC<OdontogramLiveInvoiceProps> = ({
	teethData,
	isOpen,
	onClose,
	onGenerateTreatmentPlan,
	onCreateInvoice,
	onPrintEstimate,
	patientId,
	patientName = "Пациент",
	className = "",
}) => {
	const invoice = useLiveInvoiceState({
		teethData,
		patientId,
		patientName,
		onGenerateTreatmentPlan,
		onCreateInvoice,
	});

	if (!isOpen) return null;

	return (
		<aside
			className={`odontogram-live-invoice-panel flex flex-col bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] rounded-2xl shadow-2xl transition-all duration-300 w-full sm:max-w-md overflow-hidden ${className}`.trim()}
			data-testid="odontogram-live-invoice"
			aria-label="Живая смета и план лечения"
		>
			<LiveInvoiceHeader
				itemsCount={invoice.baseItems.length}
				onClose={onClose}
			/>
			<LiveInvoiceCategoryBreakdown
				categoryBreakdown={invoice.categoryBreakdown}
			/>
			{invoice.baseItems.length > 0 && (
				<LiveInvoiceDiscountToolbar
					discountPercent={invoice.discountPercent}
					isDiscountCustom={false}
					onSetQuickDiscount={invoice.setDiscountPercent}
				/>
			)}
			<LiveInvoiceItemsList
				baseItems={invoice.baseItems}
				visibleBaseItems={invoice.visibleBaseItems}
				visibleItemsLimit={invoice.visibleItemsLimit}
				onSetVisibleItemsLimit={invoice.setVisibleItemsLimit}
				onUpdateQty={invoice.handleUpdateQty}
				onExcludeItem={invoice.handleExcludeItem}
			/>
			<LiveInvoiceSummaryFooter
				grossTotalPrice={invoice.grossTotalPrice}
				totalDiscountRub={invoice.totalDiscountRub}
				netTotalPrice={invoice.netTotalPrice}
				discountPercent={invoice.discountPercent}
				onCreateInvoice={invoice.handleCreateInvoice}
				onOpenFiscalModal={() => invoice.setIsFiscalModalOpen(true)}
				onExportToPlan={invoice.handleExportToPlan}
				onPrint={() => (onPrintEstimate ? onPrintEstimate() : window.print())}
			/>
			<LiveInvoiceFiscalBridge
				isOpen={invoice.isFiscalModalOpen}
				baseItems={invoice.baseItems}
				patientId={patientId}
				patientName={patientName}
				netTotalPrice={invoice.netTotalPrice}
				onClose={() => invoice.setIsFiscalModalOpen(false)}
			/>
		</aside>
	);
};
