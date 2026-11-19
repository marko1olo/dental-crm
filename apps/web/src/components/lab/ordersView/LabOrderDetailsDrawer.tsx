import React from "react";
import { DentalLabStudioModal } from "../DentalLabStudioModal";
import type { DentalLabOrderData } from "../dentalLabDefinitions";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import { DentalLabPriceMatrixModal } from "../DentalLabPriceMatrixModal";
import { IntraoralScan3DViewerModal } from "../../radiology/IntraoralScan3DViewerModal";
import { LabTrackingDrawer } from "../LabTrackingDrawer";
import { LabAttachScanModal } from "../LabAttachScanModal";
import { DentalLabReadyInClinicModal, type ReadyInClinicLabOrder } from "../DentalLabReadyInClinicModal";
import { LabActionPromptModal, type LabPromptDialogState } from "../LabActionPromptModal";

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
	readonly onFittingDateUpdate?: ((orderId: string, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => Promise<void> | void) | undefined;
	readonly promptState?: LabPromptDialogState | null;
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
	readonly readyInClinicOrder?: ReadyInClinicLabOrder | null;
	readonly view3DScanOrder: DentalLabOrderData | null;
	readonly onClose3DScanViewer: () => void;
	readonly isHubModalOpen?: boolean;
	readonly onCloseHubModal?: () => void;
	readonly isOrderDrawerOpen?: boolean;
	readonly onCloseOrderDrawer?: () => void;
}

export function LabOrderDetailsDrawer({
	isWorkOrderModalOpen,
	onCloseWorkOrderModal,
	selectedOrderForEdit,
	modalInitialTab,
	onOrderSaved,
	isPriceMatrixModalOpen,
	onClosePriceMatrixModal,
	onSelectWorkType,
	isOrderDrawerOpen,
	onCloseOrderDrawer,
	view3DScanOrder,
	onClose3DScanViewer,
	isHubModalOpen,
	onCloseHubModal,
	isTrackingDrawerOpen,
	onCloseTrackingDrawer,
	selectedOrderForTracking,
	onStageUpdate,
	onFittingDateUpdate,
	promptState,
	onClosePromptState,
	isScanModalOpen,
	onCloseScanModal,
	scanAttachOrder,
	scanAttachType,
	onSaveAttachedFile,
	isTrackerModalOpen,
	onCloseTrackerModal,
	isReadyInClinicModalOpen,
	onCloseReadyInClinicModal,
	readyInClinicOrder,
}: LabOrderDetailsDrawerProps): React.JSX.Element {
	const scanModelFormat = view3DScanOrder?.attachedImageUrl && /\.ply($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
		? "ply"
		: view3DScanOrder?.attachedImageUrl && /\.obj($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
			? "obj"
			: "stl";

	return (
		<>
			{(isOrderDrawerOpen || isWorkOrderModalOpen || isHubModalOpen) && (
				<DentalLabStudioModal
					isOpen={Boolean(isOrderDrawerOpen || isWorkOrderModalOpen || isHubModalOpen)}
					onClose={
						isHubModalOpen
							? (onCloseHubModal || (() => {}))
							: isOrderDrawerOpen
								? (onCloseOrderDrawer || (() => {}))
								: (onCloseWorkOrderModal || (() => {}))
					}
					initialOrder={isHubModalOpen ? null : selectedOrderForEdit}
					editingOrder={isHubModalOpen ? null : selectedOrderForEdit}
					treatmentPlanId={isHubModalOpen ? undefined : (selectedOrderForEdit?.treatmentPlanId ?? undefined)}
					stageNumber={isHubModalOpen ? undefined : (selectedOrderForEdit?.stageNumber ?? undefined)}
					stageTitle={isHubModalOpen ? undefined : (selectedOrderForEdit?.stageTitle ?? undefined)}
					stageId={isHubModalOpen ? undefined : (selectedOrderForEdit?.stageId ?? undefined)}
					patientId={isHubModalOpen ? undefined : (selectedOrderForEdit?.patientId ?? undefined)}
					patientName={isHubModalOpen ? undefined : (selectedOrderForEdit?.patientName ?? undefined)}
					doctorId={isHubModalOpen ? undefined : (selectedOrderForEdit?.doctorId ?? undefined)}
					doctorName={isHubModalOpen ? undefined : (selectedOrderForEdit?.doctorName ?? undefined)}
					currentToothNumber={isHubModalOpen ? undefined : (selectedOrderForEdit?.toothFdi ?? undefined)}
					initialToothFdi={isHubModalOpen ? undefined : (selectedOrderForEdit?.toothFdi ?? undefined)}
					initialTeeth={isHubModalOpen ? undefined : (selectedOrderForEdit?.selectedTeeth ?? selectedOrderForEdit?.teeth ?? undefined)}
					onSaveOrder={() => onOrderSaved()}
					onOrderSaved={onOrderSaved}
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
					scanTitle={`3D-скан челюсти: ${view3DScanOrder.orderNumber || (view3DScanOrder.id ? `ЗТЛ-${view3DScanOrder.id.slice(0, 8).toUpperCase()}` : "Наряд")} (${view3DScanOrder.toothFdi ? `зуб ${view3DScanOrder.toothFdi}` : "челюсть"})`}
					toothCode={view3DScanOrder.toothFdi ?? undefined} orderId={view3DScanOrder.id}
				/>
			)}

			{(isTrackingDrawerOpen || isTrackerModalOpen) && selectedOrderForTracking && (
				<LabTrackingDrawer
					isOpen={Boolean(isTrackingDrawerOpen || isTrackerModalOpen)}
					onClose={onCloseTrackingDrawer || onCloseTrackerModal || (() => {})}
					order={selectedOrderForTracking}
					onStageUpdate={onStageUpdate}
					onFittingDateUpdate={onFittingDateUpdate ?? (async (orderId, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => {
						const res = await fetch(`/api/clinical/lab-orders/${encodeURIComponent(orderId)}/status`, {
							method: "PATCH",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								frameworkTrialDate: dates.frameworkTrialDate ?? null,
								ceramicTrialDate: dates.ceramicTrialDate ?? null,
								deliveryDate: dates.deliveryDate ?? null,
							}),
						});
						if (!res.ok) {
							const err = await res.json().catch(() => ({}));
							throw new Error(err.message || "Ошибка обновления дат примерки");
						}
					})}
				/>
			)}

			{isScanModalOpen && scanAttachOrder && (
				<LabAttachScanModal
					isOpen={Boolean(isScanModalOpen)}
					onClose={onCloseScanModal || (() => {})}
					order={scanAttachOrder}
					initialType={scanAttachType ?? "stl"}
					onSave={onSaveAttachedFile || (async () => {})}
				/>
			)}

			{isReadyInClinicModalOpen && readyInClinicOrder && (
				<DentalLabReadyInClinicModal
					isOpen={Boolean(isReadyInClinicModalOpen)}
					onClose={onCloseReadyInClinicModal || (() => {})}
					order={readyInClinicOrder}
				/>
			)}

			{promptState && (
				<LabActionPromptModal
					state={promptState}
					onClose={onClosePromptState || (() => {})}
				/>
			)}
		</>
	);
}
