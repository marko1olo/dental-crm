/**
 * apps/web/src/components/inventory/ConsumablesDeductionModal.tsx
 *
 * Канонический тонкий фасад к SSOT ConsumablesBatchWriteoffModal (Мандаты 8b, 8e, 8n, 8s).
 * Консолидация 7 раздутых модалок списания в единый эргономичный эталон.
 */

import React from "react";
import {
	ConsumablesBatchWriteoffModal,
	type ConsumablesBatchWriteoffModalProps,
} from "./ConsumablesBatchWriteoffModal.js";

export type ConsumablesDeductionModalProps = ConsumablesBatchWriteoffModalProps & {
	procedureTitle?: string | undefined;
	service804nCode?: string | undefined;
	serviceCode?: string | undefined;
	doctorName?: string | undefined;
	patientName?: string | undefined;
	toothNumber?: number | string | null | undefined;
	currentStockMap?: Record<string, number> | undefined;
	onConfirmDeduction?: ((items?: any) => void | Promise<void>) | undefined;
};

export const ConsumablesDeductionModal: React.FC<ConsumablesDeductionModalProps> = (props) => {
	return (
		<ConsumablesBatchWriteoffModal
			{...props}
			procedureTitle={props.procedureTitle || "Расходные материалы приёма"}
			confirmTestId="btn-confirm-deduction"
			confirmLabel="✓ Списать расходные материалы"
		/>
	);
};

export {
	type ConsumablesDeductionModalItem,
} from "./deductionModalModules/deductionModalTypes.js";

export default ConsumablesDeductionModal;
