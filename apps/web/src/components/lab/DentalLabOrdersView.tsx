import React from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileLabOrdersTimeline } from "./mobile/MobileLabOrdersTimeline";
import type { DentalLabOrdersViewProps } from "./ordersView/types";
import { useDentalLabOrders } from "./ordersView/useDentalLabOrders";
import { DentalLabOrdersMainContent } from "./ordersView/DentalLabOrdersMainContent";
import { DentalLabStudioModal } from "./DentalLabStudioModal";
import { DentalLabPriceMatrixModal } from "./DentalLabPriceMatrixModal";
import { IntraoralScan3DViewerModal } from "../radiology/IntraoralScan3DViewerModal";
import { LabTrackingDrawer } from "./LabTrackingDrawer";
import { LabAttachScanModal } from "./LabAttachScanModal";
import { DentalLabReadyInClinicModal } from "./DentalLabReadyInClinicModal";
import { LabActionPromptModal } from "./LabActionPromptModal";
if (typeof document !== "undefined") { void import("./dentalLab.css"); }

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

	React.useEffect(() => {
		const handleOpenDrawer = () => logic.setIsOrderDrawerOpen(true);
		window.addEventListener("dente-open-lab-order-drawer", handleOpenDrawer);
		return () => window.removeEventListener("dente-open-lab-order-drawer", handleOpenDrawer);
	}, [logic]);

	const scanModelFormat = logic.view3DScanOrder?.attachedImageUrl && /\.ply($|[?#])/i.test(logic.view3DScanOrder.attachedImageUrl)
		? "ply"
		: logic.view3DScanOrder?.attachedImageUrl && /\.obj($|[?#])/i.test(logic.view3DScanOrder.attachedImageUrl)
			? "obj"
			: "stl";

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

			{/* Модалки и шторки монтируются строго один раз (Канонический SSOT) */}
			<DentalLabStudioModal
				key={logic.selectedOrderForEdit?.id ? `edit-${logic.selectedOrderForEdit.id}` : "new-lab-order"}
				isOpen={Boolean(logic.isOrderDrawerOpen || logic.isWorkOrderModalOpen || logic.isHubModalOpen)}
				onClose={() => {
					logic.setIsHubModalOpen(false);
					logic.setIsOrderDrawerOpen(false);
					logic.setIsWorkOrderModalOpen(false);
				}}
				initialOrder={logic.isHubModalOpen ? null : logic.selectedOrderForEdit}
				editingOrder={logic.isHubModalOpen ? null : logic.selectedOrderForEdit}
				treatmentPlanId={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.treatmentPlanId ?? undefined)}
				stageNumber={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.stageNumber ?? undefined)}
				stageTitle={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.stageTitle ?? undefined)}
				stageId={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.stageId ?? undefined)}
				patientId={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.patientId ?? undefined)}
				patientName={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.patientName ?? undefined)}
				doctorId={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.doctorId ?? undefined)}
				doctorName={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.doctorName ?? undefined)}
				currentToothNumber={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.toothFdi ?? undefined)}
				initialToothFdi={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.toothFdi ?? undefined)}
				initialTeeth={logic.isHubModalOpen ? undefined : (logic.selectedOrderForEdit?.selectedTeeth ?? logic.selectedOrderForEdit?.teeth ?? undefined)}
				onSaveOrder={() => void logic.fetchOrders()}
				onOrderSaved={() => void logic.fetchOrders()}
			/>

			<DentalLabPriceMatrixModal
				isOpen={logic.isPriceMatrixModalOpen}
				onClose={() => logic.setIsPriceMatrixModalOpen(false)}
				onSelectWorkType={logic.handleCreateOrderFromPriceMatrix}
			/>

			{logic.view3DScanOrder && (
				<IntraoralScan3DViewerModal
					isOpen={Boolean(logic.view3DScanOrder)}
					onClose={() => logic.setView3DScanOrder(null)}
					modelUrl={logic.view3DScanOrder.attachedImageUrl || undefined}
					modelFormat={scanModelFormat}
					patientName={logic.view3DScanOrder.patientName}
					scanTitle={`3D-скан челюсти: ${logic.view3DScanOrder.orderNumber || (logic.view3DScanOrder.id ? `ЗТЛ-${logic.view3DScanOrder.id.slice(0, 8).toUpperCase()}` : "Наряд")} (${logic.view3DScanOrder.toothFdi ? `зуб ${logic.view3DScanOrder.toothFdi}` : "челюсть"})`}
					toothCode={logic.view3DScanOrder.toothFdi ?? undefined}
					orderId={logic.view3DScanOrder.id}
				/>
			)}

			{(logic.isTrackingDrawerOpen || logic.isTrackerModalOpen) && logic.selectedOrderForTracking && (
				<LabTrackingDrawer
					isOpen={Boolean(logic.isTrackingDrawerOpen || logic.isTrackerModalOpen)}
					onClose={() => {
						logic.setIsTrackingDrawerOpen(false);
						logic.setIsTrackerModalOpen(false);
					}}
					order={logic.selectedOrderForTracking}
					onStageUpdate={async (orderId, newStage) => {
						await logic.handleStatusChange(orderId, newStage);
					}}
					onFittingDateUpdate={async (orderId, dates) => {
						const res = await fetch(`/api/lab/orders/${encodeURIComponent(orderId)}/status`, {
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
					}}
				/>
			)}

			{logic.isScanModalOpen && logic.scanAttachOrder && (
				<LabAttachScanModal
					isOpen={Boolean(logic.isScanModalOpen)}
					onClose={() => logic.setIsScanModalOpen(false)}
					order={logic.scanAttachOrder}
					initialType={logic.scanAttachType ?? "stl"}
					onSave={logic.handleSaveAttachedFile}
				/>
			)}

			{logic.isReadyInClinicModalOpen && logic.readyInClinicOrder && (
				<DentalLabReadyInClinicModal
					isOpen={Boolean(logic.isReadyInClinicModalOpen)}
					onClose={() => logic.setIsReadyInClinicModalOpen(false)}
					order={logic.readyInClinicOrder}
				/>
			)}

			{logic.promptState && (
				<LabActionPromptModal
					state={logic.promptState}
					onClose={() => logic.setPromptState(null)}
				/>
			)}
		</>
	);
}
