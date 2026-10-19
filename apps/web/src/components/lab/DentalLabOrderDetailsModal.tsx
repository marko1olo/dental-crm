import React from "react";
import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";
import {
	type ActionPromptState,
	DentalLabOrderActionPrompt,
} from "./orderDetailsModules/DentalLabOrderActionPrompt";
import { DentalLabOrderInspectCard } from "./orderDetailsModules/DentalLabOrderInspectCard";
import { DentalLabWarrantyReworkModal } from "./orderDetailsModules/DentalLabWarrantyReworkModal";
import type { LabTechnologicalStageId } from "./orders/labWorkOrderPresets";

export type { ActionPromptState };

export interface DentalLabOrderDetailsModalProps {
	readonly inspectingOrder: DentalLabWorkflowOrder | null;
	readonly onCloseInspect: () => void;
	readonly onPrintBlank: (order: DentalLabWorkflowOrder) => void;
	readonly onAdvanceTechStage: (
		order: DentalLabWorkflowOrder,
		targetTechStage?: LabTechnologicalStageId | undefined,
	) => void;
	readonly onOpenWarrantyRework: (order: DentalLabWorkflowOrder) => void;
	readonly onView3DScan?: ((order: DentalLabWorkflowOrder) => void) | undefined;

	readonly warrantyReworkOrder: DentalLabWorkflowOrder | null;
	readonly onCloseWarrantyRework: () => void;
	readonly onWarrantyReworkSubmit: (
		order: DentalLabWorkflowOrder,
		reason: string,
	) => void;

	readonly actionPrompt: ActionPromptState | null;
	readonly onCloseActionPrompt: () => void;
	readonly onActionPromptSubmit: (
		order: DentalLabWorkflowOrder,
		type: "bite_photo" | "technician_comment",
		value: string,
	) => void;
}

export const DentalLabOrderDetailsModal: React.FC<
	DentalLabOrderDetailsModalProps
> = ({
	inspectingOrder,
	onCloseInspect,
	onPrintBlank,
	onAdvanceTechStage,
	onOpenWarrantyRework,
	onView3DScan,
	warrantyReworkOrder,
	onCloseWarrantyRework,
	onWarrantyReworkSubmit,
	actionPrompt,
	onCloseActionPrompt,
	onActionPromptSubmit,
}) => {
	return (
		<>
			{inspectingOrder && (
				<DentalLabOrderInspectCard
					order={inspectingOrder}
					onClose={onCloseInspect}
					onPrintBlank={onPrintBlank}
					onAdvanceTechStage={onAdvanceTechStage}
					onOpenWarrantyRework={onOpenWarrantyRework}
					onView3DScan={onView3DScan}
				/>
			)}

			{warrantyReworkOrder && (
				<DentalLabWarrantyReworkModal
					order={warrantyReworkOrder}
					onClose={onCloseWarrantyRework}
					onSubmit={onWarrantyReworkSubmit}
				/>
			)}

			{actionPrompt && (
				<DentalLabOrderActionPrompt
					actionPrompt={actionPrompt}
					onClose={onCloseActionPrompt}
					onSubmit={onActionPromptSubmit}
				/>
			)}
		</>
	);
};

export default DentalLabOrderDetailsModal;
