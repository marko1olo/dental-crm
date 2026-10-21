import React from "react";
import type { DentalLabOrderData } from "./DentalLabOrderModal";
import { LabOrderCardHeader } from "./orderCardModules/LabOrderCardHeader";
import { LabOrderCardDetails } from "./orderCardModules/LabOrderCardDetails";
import { LabOrderCardActions } from "./orderCardModules/LabOrderCardActions";

export interface LabOrderCardProps {
	order: DentalLabOrderData;
	openMenuOrderId: string | null;
	setOpenMenuOrderId: React.Dispatch<React.SetStateAction<string | null>> | ((id: string | null) => void);
	handleOpenPrintOrder: (order: DentalLabOrderData) => void;
	handleOpenTracking: (order: DentalLabOrderData) => void;
	handleAttach3DScan: (order: DentalLabOrderData) => void;
	handleAttachBitePhoto: (order: DentalLabOrderData) => void;
	handleTechnicianComment: (order: DentalLabOrderData) => void;
	handleRepeatFitting: (order: DentalLabOrderData) => void;
	handleReclamation: (order: DentalLabOrderData) => void;
	handleOpenEditOrder: (order: DentalLabOrderData) => void;
	copyPortalLink: (token?: string) => void;
	getStatusBadge: (status?: string) => React.ReactNode;
	handleOpenReadyInClinicPrompt?: ((order: DentalLabOrderData) => void) | undefined;
	handlePayFromCashbox?: ((order: DentalLabOrderData) => void) | undefined;
	handleMarkInstalled?: ((order: DentalLabOrderData) => void) | undefined;
	handleView3DScan?: ((order: DentalLabOrderData) => void) | undefined;
}

/**
 * Карточка заказ-наряда зуботехнической лаборатории (Мандат 8b: <= 120 строк).
 * Эргономика: кнопки min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 для тача у кресла и плотного десктопа.
 */
export function LabOrderCard(props: LabOrderCardProps): React.JSX.Element {
	const {
		order, openMenuOrderId, setOpenMenuOrderId, handleOpenPrintOrder, handleOpenTracking,
		handleAttach3DScan, handleAttachBitePhoto, handleTechnicianComment, handleRepeatFitting,
		handleReclamation, handleOpenEditOrder, copyPortalLink, getStatusBadge,
		handleOpenReadyInClinicPrompt, handlePayFromCashbox, handleMarkInstalled, handleView3DScan,
	} = props;

	return (
		<div
			className="lab-order-card bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 220px", contain: "content" }}
		>
			<div className="space-y-3">
				<LabOrderCardHeader order={order} getStatusBadge={getStatusBadge} />
				<LabOrderCardDetails order={order} />
			</div>

			<LabOrderCardActions
				order={order} openMenuOrderId={openMenuOrderId} setOpenMenuOrderId={setOpenMenuOrderId}
				handleOpenPrintOrder={handleOpenPrintOrder} handleOpenTracking={handleOpenTracking}
				handleAttach3DScan={handleAttach3DScan} handleAttachBitePhoto={handleAttachBitePhoto}
				handleTechnicianComment={handleTechnicianComment} handleRepeatFitting={handleRepeatFitting}
				handleReclamation={handleReclamation} handleOpenEditOrder={handleOpenEditOrder}
				copyPortalLink={copyPortalLink} handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt}
				handlePayFromCashbox={handlePayFromCashbox} handleMarkInstalled={handleMarkInstalled}
				handleView3DScan={handleView3DScan}
			/>
		</div>
	);
}
