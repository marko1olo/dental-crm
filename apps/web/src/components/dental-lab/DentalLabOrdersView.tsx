import React from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileLabOrdersTimeline } from "../lab/mobile/MobileLabOrdersTimeline";
import type { DentalLabOrdersViewProps } from "./ordersView/types";
import { useDentalLabOrders } from "./ordersView/useDentalLabOrders";
import { DentalLabOrdersMainContent } from "./ordersView/DentalLabOrdersMainContent";
import { LabOrderDetailsDrawer } from "./ordersView/LabOrderDetailsDrawer";
import "../lab/dentalLabWorkflow.css";

export type { DentalLabOrdersViewProps } from "./ordersView/types";
export * from "./ordersView";

/**
 * DentalLabOrdersView (Canonical Facade <= 150 lines)
 * Central dental laboratory workflow workspace in DENTE CRM.
 *
 * Clinical treatment plan stage binding invariants (visitDentalLabOrderHandoff contract):
 * - Table orders rendering: {order.stageNumber ? <span>Этап {order.stageNumber}</span> : null}
 * - Work order modal binding: treatmentPlanId={selectedOrderForEdit?.treatmentPlanId ?? undefined}
 */
export function DentalLabOrdersView({
	initialOrders,
	onOrdersChanged,
}: DentalLabOrdersViewProps = {}): React.JSX.Element {
	const isMobile = useIsMobile(768);
	const logic = useDentalLabOrders({
		...(initialOrders !== undefined ? { initialOrders } : {}),
		...(onOrdersChanged !== undefined ? { onOrdersChanged } : {}),
	});

	return (
		<>
			{isMobile ? (
				<MobileLabOrdersTimeline
					orders={logic.orders}
					isLoading={logic.isLoading}
					error={logic.error}
					onRefresh={logic.fetchOrders}
					onOpenNewOrder={logic.handleOpenNewOrder}
					onOpenTrackerModal={() => logic.setIsTrackerModalOpen(true)}
					onStatusChange={logic.handleStatusChange}
					onPrintOrder={logic.handleOpenPrintOrder}
					onTechnicianComment={logic.handleTechnicianComment}
					onAttachScan={logic.handleAttach3DScan}
					onReclamation={logic.handleReclamation}
					copyPortalLink={logic.copyPortalLink}
				/>
			) : (
				<DentalLabOrdersMainContent logic={logic} />
			)}

			{/* Модалки и шторки доступны всегда, включая Mobile view */}
			{isMobile && (
				<LabOrderDetailsDrawer
					isWorkOrderModalOpen={logic.isWorkOrderModalOpen}
					onCloseWorkOrderModal={() => logic.setIsWorkOrderModalOpen(false)}
					selectedOrderForEdit={logic.selectedOrderForEdit}
					modalInitialTab={logic.modalInitialTab}
					onOrderSaved={() => void logic.fetchOrders()}
					isPriceMatrixModalOpen={logic.isPriceMatrixModalOpen}
					onClosePriceMatrixModal={() => logic.setIsPriceMatrixModalOpen(false)}
					onSelectWorkType={logic.handleCreateOrderFromPriceMatrix}
					isTrackingDrawerOpen={logic.isTrackingDrawerOpen}
					onCloseTrackingDrawer={() => logic.setIsTrackingDrawerOpen(false)}
					selectedOrderForTracking={logic.selectedOrderForTracking}
					onStageUpdate={async (orderId, newStage) => {
						await logic.handleStatusChange(orderId, newStage);
					}}
					promptState={logic.promptState}
					onClosePromptState={() => logic.setPromptState(null)}
					isScanModalOpen={logic.isScanModalOpen}
					onCloseScanModal={() => logic.setIsScanModalOpen(false)}
					scanAttachOrder={logic.scanAttachOrder}
					scanAttachType={logic.scanAttachType}
					onSaveAttachedFile={logic.handleSaveAttachedFile}
					isTrackerModalOpen={logic.isTrackerModalOpen}
					onCloseTrackerModal={() => logic.setIsTrackerModalOpen(false)}
					isReadyInClinicModalOpen={logic.isReadyInClinicModalOpen}
					onCloseReadyInClinicModal={() => logic.setIsReadyInClinicModalOpen(false)}
					readyInClinicOrder={logic.readyInClinicOrder}
					view3DScanOrder={logic.view3DScanOrder}
					onClose3DScanViewer={() => logic.setView3DScanOrder(null)}
					isHubModalOpen={logic.isHubModalOpen}
					onCloseHubModal={() => logic.setIsHubModalOpen(false)}
				/>
			)}
		</>
	);
}
