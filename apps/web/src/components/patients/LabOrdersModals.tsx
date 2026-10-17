import React, { Suspense, lazy } from "react";
import type { LabOrder } from "./LabOrdersPanel";
import type { useLabOrdersPanelLogic } from "./useLabOrdersPanelLogic";

const DentalLabOrderDrawer = lazy(() =>
	import("../lab/DentalLabOrderDrawer").then((m) => ({ default: m.DentalLabOrderDrawer }))
);
const IntraoralScan3DViewerModal = lazy(() =>
	import("../radiology/IntraoralScan3DViewerModal").then((m) => ({ default: m.IntraoralScan3DViewerModal }))
);

interface LabOrdersModalsProps {
	logic: ReturnType<typeof useLabOrdersPanelLogic>;
	patientId?: string;
	view3DScanOrder: LabOrder | null;
	setView3DScanOrder: (order: LabOrder | null) => void;
}

export const LabOrdersModals: React.FC<LabOrdersModalsProps> = ({
	logic,
	patientId,
	view3DScanOrder,
	setView3DScanOrder,
}) => (
	<>
		{(logic.isOrderModalOpen || logic.isTrackingDrawerOpen || logic.isLabHubOpen || logic.isTrackerModalOpen) && (
			<Suspense fallback={null}>
				<DentalLabOrderDrawer
					isOpen={Boolean(logic.isOrderModalOpen || logic.isTrackingDrawerOpen || logic.isLabHubOpen || logic.isTrackerModalOpen)}
					onClose={() => {
						logic.setIsOrderModalOpen(false);
						logic.setIsTrackingDrawerOpen(false);
						logic.setIsLabHubOpen(false);
						logic.setIsTrackerModalOpen(false);
						logic.setSelectedOrderForEdit(null);
					}}
					editingOrder={logic.selectedOrderForEdit}
					initialTab={logic.modalInitialTab}
					patientId={patientId}
					patientName={logic.orders[0]?.patientName}
					doctorId={logic.appLogic?.activeDoctor?.id}
					doctorName={logic.appLogic?.activeDoctor?.fullName || logic.appLogic?.activeDoctor?.name}
					onSaveOrder={() => { void logic.fetchOrders(); }}
					onOrderSaved={() => { void logic.fetchOrders(); }}
				/>
			</Suspense>
		)}

		{view3DScanOrder && (
			<Suspense fallback={null}>
				<IntraoralScan3DViewerModal
					isOpen={Boolean(view3DScanOrder)}
					onClose={() => setView3DScanOrder(null)}
					modelUrl={view3DScanOrder.attachedImageUrl || undefined}
					patientName={view3DScanOrder.patientName}
					scanTitle={`3D-скан челюсти: Наряд №${view3DScanOrder.id ? view3DScanOrder.id.slice(0, 8) : ""}`}
				/>
			</Suspense>
		)}
	</>
);
