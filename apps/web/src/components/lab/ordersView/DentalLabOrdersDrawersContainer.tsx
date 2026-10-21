import React from "react";
import { LabOrderDetailsDrawer } from "./LabOrderDetailsDrawer";
import type { useDentalLabOrders } from "./useDentalLabOrders";

export interface DentalLabOrdersDrawersContainerProps {
	readonly logic: ReturnType<typeof useDentalLabOrders>;
}

export function DentalLabOrdersDrawersContainer({ logic }: DentalLabOrdersDrawersContainerProps): React.JSX.Element {
	const {
		isWorkOrderModalOpen, setIsWorkOrderModalOpen, selectedOrderForEdit, modalInitialTab,
		fetchOrders, isPriceMatrixModalOpen, setIsPriceMatrixModalOpen, handleCreateOrderFromPriceMatrix,
		isTrackingDrawerOpen, setIsTrackingDrawerOpen, selectedOrderForTracking, handleStatusChange,
		promptState, setPromptState, isScanModalOpen, setIsScanModalOpen, scanAttachOrder,
		scanAttachType, handleSaveAttachedFile, isTrackerModalOpen, setIsTrackerModalOpen,
		isReadyInClinicModalOpen, setIsReadyInClinicModalOpen, readyInClinicOrder,
		view3DScanOrder, setView3DScanOrder, isHubModalOpen, setIsHubModalOpen,
		isOrderDrawerOpen, setIsOrderDrawerOpen,
	} = logic;

	return (
		<LabOrderDetailsDrawer
			isWorkOrderModalOpen={isWorkOrderModalOpen}
			onCloseWorkOrderModal={() => setIsWorkOrderModalOpen(false)}
			selectedOrderForEdit={selectedOrderForEdit}
			modalInitialTab={modalInitialTab}
			onOrderSaved={() => void fetchOrders()}
			isPriceMatrixModalOpen={isPriceMatrixModalOpen}
			onClosePriceMatrixModal={() => setIsPriceMatrixModalOpen(false)}
			onSelectWorkType={handleCreateOrderFromPriceMatrix}
			isTrackingDrawerOpen={isTrackingDrawerOpen}
			onCloseTrackingDrawer={() => setIsTrackingDrawerOpen(false)}
			selectedOrderForTracking={selectedOrderForTracking}
			onStageUpdate={async (orderId, newStage) => {
				await handleStatusChange(orderId, newStage);
			}}
			promptState={promptState}
			onClosePromptState={() => setPromptState(null)}
			isScanModalOpen={isScanModalOpen}
			onCloseScanModal={() => setIsScanModalOpen(false)}
			scanAttachOrder={scanAttachOrder}
			scanAttachType={scanAttachType}
			onSaveAttachedFile={handleSaveAttachedFile}
			isTrackerModalOpen={isTrackerModalOpen}
			onCloseTrackerModal={() => setIsTrackerModalOpen(false)}
			isReadyInClinicModalOpen={isReadyInClinicModalOpen}
			onCloseReadyInClinicModal={() => setIsReadyInClinicModalOpen(false)}
			readyInClinicOrder={readyInClinicOrder}
			view3DScanOrder={view3DScanOrder}
			onClose3DScanViewer={() => setView3DScanOrder(null)}
			isHubModalOpen={isHubModalOpen}
			onCloseHubModal={() => setIsHubModalOpen(false)}
			isOrderDrawerOpen={isOrderDrawerOpen}
			onCloseOrderDrawer={() => setIsOrderDrawerOpen(false)}
		/>
	);
}
