import React from "react";
import { LabOrderCard as CanonicalLabOrderCard } from "../../lab/LabOrderCard";
import type { LabOrderCardsGridProps } from "./types";

export { CanonicalLabOrderCard as LabOrderCard };

export function LabOrderCardsGrid({
	orders,
	openMenuOrderId,
	setOpenMenuOrderId,
	handleOpenPrintOrder,
	handleOpenTracking,
	handleAttach3DScan,
	handleAttachBitePhoto,
	handleTechnicianComment,
	handleRepeatFitting,
	handleReclamation,
	handleOpenEditOrder,
	copyPortalLink,
	getStatusBadge,
	handleOpenReadyInClinicPrompt,
	handlePayFromCashbox,
	handleMarkInstalled,
	handleView3DScan,
}: LabOrderCardsGridProps): React.JSX.Element {
	return (
		<div
			className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
			data-testid="lab-orders-cards-grid"
		>
			{orders.map((order) => (
				<CanonicalLabOrderCard
					key={order.id}
					order={order}
					openMenuOrderId={openMenuOrderId}
					setOpenMenuOrderId={setOpenMenuOrderId}
					handleOpenPrintOrder={handleOpenPrintOrder}
					handleOpenTracking={handleOpenTracking}
					handleAttach3DScan={handleAttach3DScan}
					handleAttachBitePhoto={handleAttachBitePhoto}
					handleTechnicianComment={handleTechnicianComment}
					handleRepeatFitting={handleRepeatFitting}
					handleReclamation={handleReclamation}
					handleOpenEditOrder={handleOpenEditOrder}
					copyPortalLink={copyPortalLink}
					getStatusBadge={getStatusBadge}
					handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
					handlePayFromCashbox={handlePayFromCashbox}
					handleMarkInstalled={handleMarkInstalled}
					handleView3DScan={handleView3DScan}
				/>
			))}
		</div>
	);
}
