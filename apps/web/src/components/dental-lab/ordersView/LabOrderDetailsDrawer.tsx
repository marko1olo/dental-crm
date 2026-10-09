import React, { lazy, Suspense } from "react";
import type { DentalLabOrderData } from "../../lab/DentalLabOrderModal";
import type { LabPriceMatrixItem } from "../DentalLabPriceMatrixModal";
import type { ReadyInClinicLabOrder } from "../../lab/DentalLabReadyInClinicModal";
import type { LabPromptDialogState } from "../../lab/LabActionPromptModal";
import { DentalLabWorkOrderModal } from "../DentalLabWorkOrderModal";
import { DentalLabPriceMatrixModal } from "../DentalLabPriceMatrixModal";
import { LabActionPromptModal } from "../../lab/LabActionPromptModal";
import { LabAttachScanModal } from "../../lab/LabAttachScanModal";
import { DentalLabReadyInClinicModal } from "../../lab/DentalLabReadyInClinicModal";
import { IntraoralScan3DViewerModal } from "../../radiology/IntraoralScan3DViewerModal";

const DentalLabOrdersTrackerModal = lazy(() =>
	import("../../lab/DentalLabOrdersTrackerModal").then((module) => ({
		default: module.DentalLabOrdersTrackerModal,
	})),
);

const LabTrackingDrawer = lazy(() =>
	import("../../lab/LabTrackingDrawer").then((module) => ({
		default: module.LabTrackingDrawer,
	})),
);

const DentalLabOrdersHubModal = lazy(() =>
	import("../../lab/DentalLabOrdersHubModal").then((module) => ({
		default: module.DentalLabOrdersHubModal,
	})),
);

export interface LabOrderDetailsDrawerProps {
	readonly isWorkOrderModalOpen: boolean;
	readonly onCloseWorkOrderModal: () => void;
	readonly selectedOrderForEdit: DentalLabOrderData | null;
	readonly modalInitialTab: "main" | "shades" | "stages" | "print";
	readonly onOrderSaved: () => void;

	readonly isPriceMatrixModalOpen: boolean;
	readonly onClosePriceMatrixModal: () => void;
	readonly onSelectWorkType: (item: LabPriceMatrixItem) => void;

	readonly isTrackingDrawerOpen: boolean;
	readonly onCloseTrackingDrawer: () => void;
	readonly selectedOrderForTracking: DentalLabOrderData | null;
	readonly onStageUpdate: (orderId: string, newStage: string) => Promise<void>;

	readonly promptState: LabPromptDialogState | null;
	readonly onClosePromptState: () => void;

	readonly isScanModalOpen: boolean;
	readonly onCloseScanModal: () => void;
	readonly scanAttachOrder: DentalLabOrderData | null;
	readonly scanAttachType: "stl" | "ply" | "photo";
	readonly onSaveAttachedFile: (url: string) => Promise<void>;

	readonly isTrackerModalOpen: boolean;
	readonly onCloseTrackerModal: () => void;

	readonly isReadyInClinicModalOpen: boolean;
	readonly onCloseReadyInClinicModal: () => void;
	readonly readyInClinicOrder: ReadyInClinicLabOrder | null;

	readonly view3DScanOrder: DentalLabOrderData | null;
	readonly onClose3DScanViewer: () => void;

	readonly isHubModalOpen: boolean;
	readonly onCloseHubModal: () => void;
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
	isTrackingDrawerOpen,
	onCloseTrackingDrawer,
	selectedOrderForTracking,
	onStageUpdate,
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
	view3DScanOrder,
	onClose3DScanViewer,
	isHubModalOpen,
	onCloseHubModal,
}: LabOrderDetailsDrawerProps): React.JSX.Element {
	return (
		<>
			{/* Модалка наряд-заказа DentalLabWorkOrderModal */}
			{isWorkOrderModalOpen && (
				<DentalLabWorkOrderModal
					isOpen={isWorkOrderModalOpen}
					onClose={onCloseWorkOrderModal}
					initialOrder={selectedOrderForEdit}
					initialTab={modalInitialTab}
					treatmentPlanId={selectedOrderForEdit?.treatmentPlanId ?? undefined}
					stageNumber={selectedOrderForEdit?.stageNumber ?? undefined}
					stageTitle={selectedOrderForEdit?.stageTitle ?? undefined}
					stageId={selectedOrderForEdit?.stageId ?? undefined}
					onOrderSaved={onOrderSaved}
				/>
			)}

			{/* Модалка прайс-матрицы DentalLabPriceMatrixModal */}
			<DentalLabPriceMatrixModal
				isOpen={isPriceMatrixModalOpen}
				onClose={onClosePriceMatrixModal}
				onSelectWorkType={onSelectWorkType}
			/>

			{/* Tracking Drawer Instance */}
			{isTrackingDrawerOpen && (
				<Suspense fallback={null}>
					<LabTrackingDrawer
						isOpen={isTrackingDrawerOpen}
						onClose={onCloseTrackingDrawer}
						order={selectedOrderForTracking}
						onStageUpdate={onStageUpdate}
					/>
				</Suspense>
			)}

			{/* Non-blocking Action Prompt Modal (Mandates 8e, 8n) */}
			<LabActionPromptModal
				state={promptState}
				onClose={onClosePromptState}
			/>

			{/* Dedicated 3D Scan & Photo Attachment Modal (Mandates 8e, 8n) */}
			<LabAttachScanModal
				isOpen={isScanModalOpen}
				onClose={onCloseScanModal}
				order={scanAttachOrder}
				initialType={scanAttachType}
				onSave={onSaveAttachedFile}
			/>

			{/* Dedicated Desktop ZTL Orders Tracker Modal */}
			{isTrackerModalOpen && (
				<Suspense fallback={null}>
					<DentalLabOrdersTrackerModal
						isOpen={isTrackerModalOpen}
						onClose={onCloseTrackerModal}
						onOrderSaved={onOrderSaved}
					/>
				</Suspense>
			)}

			{/* Ready in clinic 1-click booking modal */}
			<DentalLabReadyInClinicModal
				isOpen={isReadyInClinicModalOpen}
				onClose={onCloseReadyInClinicModal}
				order={readyInClinicOrder}
			/>

			{/* Просмотрщик интраорального 3D-скана (STL/PLY/OBJ) */}
			{view3DScanOrder && (
				<IntraoralScan3DViewerModal
					isOpen={Boolean(view3DScanOrder)}
					onClose={onClose3DScanViewer}
					modelUrl={view3DScanOrder.attachedImageUrl || undefined}
					modelFormat={
						view3DScanOrder.attachedImageUrl && /\.ply($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
							? "ply"
							: view3DScanOrder.attachedImageUrl && /\.obj($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
								? "obj"
								: "stl"
					}
					patientName={view3DScanOrder.patientName}
					scanTitle={`3D-скан челюсти: Наряд №${view3DScanOrder.id ? view3DScanOrder.id.slice(0, 8) : ""} (${view3DScanOrder.toothFdi ? `зуб ${view3DScanOrder.toothFdi}` : "челюсть"})`}
					toothCode={view3DScanOrder.toothFdi}
					orderId={view3DScanOrder.id}
				/>
			)}

			{/* Полноэкранный Канбан-хаб ЗТЛ */}
			{isHubModalOpen && (
				<Suspense fallback={null}>
					<DentalLabOrdersHubModal
						isOpen={isHubModalOpen}
						onClose={onCloseHubModal}
						onSaveOrder={onOrderSaved}
					/>
				</Suspense>
			)}
		</>
	);
}
