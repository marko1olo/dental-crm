import { useMemo, useState } from "react";
import type { CashExpenseTypeAlias } from "@dental/shared";
import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import {
	mapTreatmentItemsToFiscalReceipt,
} from "../../../fiscalReceiptEngine";
import {
	selectAllRefundItems,
	deselectAllRefundItems,
	calculateRefundActiveItems,
} from "../fiscalModalRefundLogic";

export interface UseRefundItemsSelectionParams {
	readonly items: readonly TreatmentPlanItem[];
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly patientDepositRub?: number | undefined;
}

export function useRefundItemsSelection({
	items,
	activeItems,
	patientDepositRub = 0,
}: UseRefundItemsSelectionParams) {
	const [refundItemSelection, setRefundItemSelection] = useState<Record<string, boolean>>({});
	const [refundReason, setRefundReason] = useState<string>("Отказ пациента от части услуг плана лечения");
	const [originalReceiptNumberForRefund, setOriginalReceiptNumberForRefund] = useState<string>("");
	const [refundMode, setRefundMode] = useState<"items" | "advance">(
		items.length === 0 ? "advance" : "items",
	);
	const [refundAdvanceAmountRub, setRefundAdvanceAmountRub] = useState<number>(
		items.length === 0 && patientDepositRub && patientDepositRub > 0 ? patientDepositRub : 0,
	);
	const [refundAdvancePurpose, setRefundAdvancePurpose] = useState<string>("Возврат аванса / денежных средств");
	const [selectedExpenseAlias, setSelectedExpenseAlias] = useState<CashExpenseTypeAlias>("return_appointment");

	const handleSelectAllRefundItems = () => {
		setRefundItemSelection(selectAllRefundItems(activeItems));
	};

	const handleDeselectAllRefundItems = () => {
		setRefundItemSelection(deselectAllRefundItems());
	};

	const isAdvanceRefund = activeItems.length === 0 || refundMode === "advance";

	const refundActiveItems = useMemo<readonly TreatmentPlanItem[]>(() => {
		return calculateRefundActiveItems({
			items: activeItems,
			selection: refundItemSelection,
			isAdvanceRefund,
			advanceAmountRub: refundAdvanceAmountRub,
			advancePurpose: refundAdvancePurpose,
		});
	}, [isAdvanceRefund, activeItems, refundItemSelection, refundAdvanceAmountRub, refundAdvancePurpose]);

	const refundFiscalData = useMemo(() => {
		return mapTreatmentItemsToFiscalReceipt(refundActiveItems);
	}, [refundActiveItems]);

	return {
		refundItemSelection,
		setRefundItemSelection,
		refundReason,
		setRefundReason,
		originalReceiptNumberForRefund,
		setOriginalReceiptNumberForRefund,
		refundMode,
		setRefundMode,
		refundAdvanceAmountRub,
		setRefundAdvanceAmountRub,
		refundAdvancePurpose,
		setRefundAdvancePurpose,
		selectedExpenseAlias,
		setSelectedExpenseAlias,
		handleSelectAllRefundItems,
		handleDeselectAllRefundItems,
		isAdvanceRefund,
		refundActiveItems,
		refundFiscalData,
	};
}
