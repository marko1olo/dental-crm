import React from "react";
import { useIsMobile } from "../../hooks/useIsMobile";
import { MobileLabOrdersTimeline } from "../lab/mobile/MobileLabOrdersTimeline";
import type { DentalLabOrdersViewProps } from "./ordersView/types";
import { useDentalLabOrders } from "./ordersView/useDentalLabOrders";
import { DentalLabOrdersMainContent } from "./ordersView/DentalLabOrdersMainContent";
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
	const logic = useDentalLabOrders({ initialOrders, onOrdersChanged });

	if (isMobile) {
		return (
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
		);
	}

	return <DentalLabOrdersMainContent logic={logic} />;
}
