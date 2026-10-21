import React from "react";
import { DentalLabOrderModal } from "../DentalLabOrderModal";
import { DentalLabOrderDrawer } from "../DentalLabOrderDrawer";
import type { DentalLabOrderData } from "../dentalLabDefinitions";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import { DentalLabPriceMatrixModal } from "../DentalLabPriceMatrixModal";
import { IntraoralScan3DViewerModal } from "../../radiology/IntraoralScan3DViewerModal";

export interface LabOrderDetailsDrawerProps {
	readonly isWorkOrderModalOpen?: boolean;
	readonly onCloseWorkOrderModal?: () => void;
	readonly selectedOrderForEdit: DentalLabOrderData | null;
	readonly modalInitialTab?: "main" | "shades" | "stages" | "print";
	readonly onOrderSaved: () => void;
	readonly isPriceMatrixModalOpen: boolean;
	readonly onClosePriceMatrixModal: () => void;
	readonly onSelectWorkType: (item: LabPriceMatrixItem) => void;
	readonly isTrackingDrawerOpen?: boolean;
	readonly onCloseTrackingDrawer?: () => void;
	readonly selectedOrderForTracking?: DentalLabOrderData | null;
	readonly onStageUpdate?: (orderId: string, newStage: string) => Promise<void>;
	readonly promptState?: any;
	readonly onClosePromptState?: () => void;
	readonly isScanModalOpen?: boolean;
	readonly onCloseScanModal?: () => void;
	readonly scanAttachOrder?: DentalLabOrderData | null;
	readonly scanAttachType?: "stl" | "ply" | "photo";
	readonly onSaveAttachedFile?: (url: string) => Promise<void>;
	readonly isTrackerModalOpen?: boolean;
	readonly onCloseTrackerModal?: () => void;
	readonly isReadyInClinicModalOpen?: boolean;
	readonly onCloseReadyInClinicModal?: () => void;
	readonly readyInClinicOrder?: any;
	readonly view3DScanOrder: DentalLabOrderData | null;
	readonly onClose3DScanViewer: () => void;
	readonly isHubModalOpen?: boolean;
	readonly onCloseHubModal?: () => void;
	readonly isOrderDrawerOpen?: boolean;
	readonly onCloseOrderDrawer?: () => void;
}

export function LabOrderDetailsDrawer({
	isWorkOrderModalOpen, onCloseWorkOrderModal, selectedOrderForEdit,
	modalInitialTab, onOrderSaved, isPriceMatrixModalOpen, onClosePriceMatrixModal,
	onSelectWorkType, isOrderDrawerOpen, onCloseOrderDrawer, view3DScanOrder, onClose3DScanViewer,
}: LabOrderDetailsDrawerProps): React.JSX.Element {
	const scanModelFormat = view3DScanOrder?.attachedImageUrl && /\.ply($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
		? "ply"
		: view3DScanOrder?.attachedImageUrl && /\.obj($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
			? "obj"
			: "stl";

	return (
		<>
			{isOrderDrawerOpen && (
				<DentalLabOrderDrawer
					isOpen={Boolean(isOrderDrawerOpen)} onClose={onCloseOrderDrawer || (() => {})}
					initialOrder={selectedOrderForEdit} editingOrder={selectedOrderForEdit}
					treatmentPlanId={selectedOrderForEdit?.treatmentPlanId ?? undefined}
					stageNumber={selectedOrderForEdit?.stageNumber ?? undefined}
					stageTitle={selectedOrderForEdit?.stageTitle ?? undefined}
					stageId={selectedOrderForEdit?.stageId ?? undefined}
					patientId={selectedOrderForEdit?.patientId ?? undefined}
					patientName={selectedOrderForEdit?.patientName ?? undefined}
					doctorId={selectedOrderForEdit?.doctorId ?? undefined}
					doctorName={selectedOrderForEdit?.doctorName ?? undefined}
					currentToothNumber={selectedOrderForEdit?.toothFdi ?? undefined}
					initialToothFdi={selectedOrderForEdit?.toothFdi ?? undefined}
					onSaveOrder={() => onOrderSaved()} onOrderSaved={onOrderSaved}
				/>
			)}

			{isWorkOrderModalOpen && !isOrderDrawerOpen && (
				<DentalLabOrderModal
					isOpen={Boolean(isWorkOrderModalOpen)} onClose={onCloseWorkOrderModal || (() => {})}
					initialOrder={selectedOrderForEdit} initialTab={modalInitialTab}
					treatmentPlanId={selectedOrderForEdit?.treatmentPlanId ?? undefined}
					stageNumber={selectedOrderForEdit?.stageNumber ?? undefined}
					stageTitle={selectedOrderForEdit?.stageTitle ?? undefined}
					stageId={selectedOrderForEdit?.stageId ?? undefined}
					patientId={selectedOrderForEdit?.patientId ?? undefined}
					patientName={selectedOrderForEdit?.patientName ?? undefined}
					doctorId={selectedOrderForEdit?.doctorId ?? undefined}
					doctorName={selectedOrderForEdit?.doctorName ?? undefined}
					onSaveOrder={() => onOrderSaved()} onOrderSaved={onOrderSaved}
				/>
			)}

			<DentalLabPriceMatrixModal
				isOpen={isPriceMatrixModalOpen} onClose={onClosePriceMatrixModal} onSelectWorkType={onSelectWorkType}
			/>

			{view3DScanOrder && (
				<IntraoralScan3DViewerModal
					isOpen={Boolean(view3DScanOrder)} onClose={onClose3DScanViewer}
					modelUrl={view3DScanOrder.attachedImageUrl || undefined} modelFormat={scanModelFormat}
					patientName={view3DScanOrder.patientName}
					scanTitle={`3D-скан челюсти: Наряд #${view3DScanOrder.id ? view3DScanOrder.id.slice(0, 8) : ""} (${view3DScanOrder.toothFdi ? `зуб ${view3DScanOrder.toothFdi}` : "челюсть"})`}
					toothCode={view3DScanOrder.toothFdi ?? undefined} orderId={view3DScanOrder.id}
				/>
			)}
		</>
	);
}
