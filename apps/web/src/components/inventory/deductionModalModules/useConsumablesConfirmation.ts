import { useRef, useState } from "react";
import { useInventoryStore } from "../../../store/inventoryStore.js";
import type { ConsumablesDeductionModalItem } from "./deductionModalTypes.js";

export function useConsumablesConfirmation(
	procedureTitle: string,
	service804nCode: string,
	onConfirmDeduction?: (items: readonly ConsumablesDeductionModalItem[]) => void | Promise<void>,
	onClose?: () => void,
) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const inFlightRef = useRef(false);

	const handleConfirm = async (deductionItems: readonly ConsumablesDeductionModalItem[]) => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);
		try {
			if (onConfirmDeduction) await onConfirmDeduction(deductionItems);
			try {
				useInventoryStore.getState().deductStock(
					"org-default",
					deductionItems.map((d) => ({
						inventoryItemId: d.inventoryItemId,
						itemName: d.itemName,
						quantity: d.deductedQty,
						reason: `Списание по протоколу: ${procedureTitle}`,
						unitCostRub: d.unitCostRub,
					})),
					{ allowOverdraft: true, reason: `Списание по протоколу: ${procedureTitle}` },
				).catch(() => {});
				if (typeof window !== "undefined") {
					window.dispatchEvent(
						new CustomEvent("dente-inventory-reload", {
							detail: { procedureTitle, service804nCode },
						}),
					);
				}
			} catch {
				// Ошибки не блокируют приём врача
			}
			onClose?.();
		} catch {
			// Ошибки логируются, врач не блокируется
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	return { isSubmitting, handleConfirm };
}
