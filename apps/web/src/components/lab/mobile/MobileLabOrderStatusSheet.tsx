import React, { useEffect } from "react";
import type { DentalLabOrderData } from "../labMath";
import { MobileSheetHeader } from "./statusSheetModules/MobileSheetHeader";
import { MobileSheetSummary } from "./statusSheetModules/MobileSheetSummary";
import { MobileSheetStatusButtons } from "./statusSheetModules/MobileSheetStatusButtons";
import { MobileSheetSecondaryActions } from "./statusSheetModules/MobileSheetSecondaryActions";

export interface MobileLabOrderStatusSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly onStatusChange: (orderId: string, newStatus: string) => void;
	readonly onPrintOrder: (order: DentalLabOrderData) => void;
	readonly onTechnicianComment: (order: DentalLabOrderData) => void;
	readonly onAttachScan: (order: DentalLabOrderData) => void;
	readonly onReclamation: (order: DentalLabOrderData) => void;
	readonly copyPortalLink: (token?: string) => void;
}

export const MobileLabOrderStatusSheet: React.FC<MobileLabOrderStatusSheetProps> = React.memo(
	function MobileLabOrderStatusSheet({
		isOpen, onClose, order, onStatusChange, onPrintOrder,
		onTechnicianComment, onAttachScan, onReclamation, copyPortalLink,
	}) {
		useEffect(() => {
			if (isOpen) {
				document.body.style.overflow = "hidden";
			} else {
				document.body.style.overflow = "";
			}
			return () => {
				document.body.style.overflow = "";
			};
		}, [isOpen]);

		if (!isOpen || !order) return null;

		const currentStatus = (order.status || "").toLowerCase();

		return (
			<div
				className="mobile-lab-sheet-backdrop"
				onClick={onClose}
				role="dialog"
				aria-modal="true"
				aria-label="Смена статуса наряда ЗТЛ"
				data-testid="mobile-lab-order-status-sheet"
			>
				<div className="mobile-lab-sheet-surface" onClick={(e) => e.stopPropagation()}>
					<MobileSheetHeader order={order} onClose={onClose} />
					<div className="mobile-lab-sheet-body">
						<MobileSheetSummary order={order} />
						<MobileSheetStatusButtons
							order={order} currentStatus={currentStatus}
							onStatusChange={onStatusChange} onReclamation={onReclamation} onClose={onClose}
						/>
						<MobileSheetSecondaryActions
							order={order} onPrintOrder={onPrintOrder} onTechnicianComment={onTechnicianComment}
							onAttachScan={onAttachScan} copyPortalLink={copyPortalLink} onClose={onClose}
						/>
					</div>
				</div>
			</div>
		);
	},
);
