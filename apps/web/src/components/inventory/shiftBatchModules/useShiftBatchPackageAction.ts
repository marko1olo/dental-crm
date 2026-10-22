import { useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import {
	type ClinicalPackageId,
	handleOneClickPackageWriteOff,
	type OneClickPackageWriteOffResult,
} from "../warehousePackageWriteOffEngine.js";

export interface UseShiftBatchPackageActionParams {
	organizationId?: string | undefined;
	warehouseItems?: readonly InventoryItem[] | undefined;
	currentStockMap?: Record<string, number> | undefined;
	doctorName?: string | undefined;
	packageQuantityMultiplier: number;
	onDeductionComplete?: (() => void) | undefined;
}

export function useShiftBatchPackageAction({
	organizationId = "org-default",
	warehouseItems,
	currentStockMap,
	doctorName = "Кузнецов А.В.",
	packageQuantityMultiplier,
	onDeductionComplete,
}: UseShiftBatchPackageActionParams) {
	const inFlightRef = useRef(false);
	const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
	const [lastPackageResult, setLastPackageResult] = useState<OneClickPackageWriteOffResult | null>(null);

	const handlePackageClick = async (packageId: ClinicalPackageId) => {
		if (inFlightRef.current || submittingPackageId) return;
		inFlightRef.current = true;
		setSubmittingPackageId(packageId);
		try {
			const result = await handleOneClickPackageWriteOff({
				packageId,
				warehouseItems,
				currentStockMap,
				organizationId,
				doctorName,
				quantityMultiplier: packageQuantityMultiplier,
				allowSoftOverdraft: true,
			});
			setLastPackageResult(result);
			showToast(result.toastMessage, result.isOverdraft ? "warning" : "success");
			onDeductionComplete?.();
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка списания пакета", "error");
		} finally {
			inFlightRef.current = false;
			setTimeout(() => setSubmittingPackageId(null), 300);
		}
	};

	return {
		submittingPackageId,
		lastPackageResult,
		handlePackageClick,
	};
}
