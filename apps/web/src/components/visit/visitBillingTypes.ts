/**
 * apps/web/src/components/visit/visitBillingTypes.ts
 * Types, contracts and default presets for Chairside Visit Service Billing.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useVisitStore } from "../../store/visitStore.js";
export * from "./visitBillingPresets.js";

export interface VisitBillingServiceItem {
	id: string;
	code804n: string;
	title: string;
	toothCode?: string | undefined;
	quantity: number;
	unitPriceRub: number;
	discountPercent?: number | undefined;
	discountRub?: number | undefined;
	isWarranty?: boolean | undefined;
	warrantyReason?: string | undefined;
	labCostRub?: number | undefined;
	labOrderId?: string | undefined;
	labOrderNumber?: string | undefined;
	technicianName?: string | undefined;
	materialName?: string | undefined;
	warrantyPassport?: string | undefined;
	fittingConfirmed?: boolean | undefined;
}

export interface VisitBillingTotals {
	rawTotalRub: number;
	discountRub: number;
	totalDueRub: number;
	effectiveDiscountPercent: number;
	isWarranty100: boolean;
	itemsCount: number;
	totalLabCostRub?: number | undefined;
}

export interface VisitServiceBillingWidgetProps {
	readonly visitId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly cashierName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly initialServices?: readonly VisitBillingServiceItem[] | undefined;
	readonly onServicesChange?: ((services: VisitBillingServiceItem[]) => void) | undefined;
	readonly onSave?: ((services: VisitBillingServiceItem[], totals: VisitBillingTotals) => void) | undefined;
	readonly onOpenPayment?: ((totals: VisitBillingTotals) => void) | undefined;
	readonly onPaymentSuccess?: ((result?: unknown) => void) | undefined;
	readonly onAddBillingItem?: ((item: { code804n?: string | undefined; title: string; priceRub: number; toothNumber?: number | undefined; quantity?: number | undefined }) => void) | undefined;
	readonly dmsGuaranteeLetterId?: string | undefined;
	readonly dmsGuaranteeLetterNumber?: string | undefined;
	readonly dmsInsurerName?: string | undefined;
	readonly availableDmsCoverageRub?: number | undefined;
	readonly initialSplitDmsRub?: number | undefined;
	readonly readOnly?: boolean | undefined;
	readonly className?: string | undefined;
}

export function syncBillingItemsToVisitStore(items: VisitBillingServiceItem[]) {
	useVisitStore.getState().setCompletedServices(
		items.map((it) => {
			const toothNum = it.toothCode ? Number.parseInt(String(it.toothCode), 10) : undefined;
			const netUnitRub = it.isWarranty ? 0 : Math.max(0, it.unitPriceRub - (it.discountRub || 0));
			return {
				serviceId: it.id,
				code804n: it.code804n || "A16.07.002",
				name: it.title,
				priceRub: netUnitRub,
				priceKopecks: Math.round(netUnitRub * 100),
				quantity: it.quantity || 1,
				category: "therapy",
				...(Number.isFinite(toothNum) ? { toothNumber: toothNum } : {}),
				...(it.toothCode ? { toothCode: String(it.toothCode) } : {}),
				...(it.labCostRub ? { labCostRub: it.labCostRub, labCostKopecks: Math.round(it.labCostRub * 100) } : {}),
			};
		}),
	);
}
