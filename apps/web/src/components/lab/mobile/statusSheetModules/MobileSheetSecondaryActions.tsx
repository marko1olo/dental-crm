import React from "react";
import { Box, Link, MessageSquare, Printer } from "lucide-react";
import type { DentalLabOrderData } from "../../labMath";

export interface MobileSheetSecondaryActionsProps {
	order: DentalLabOrderData;
	onPrintOrder: (order: DentalLabOrderData) => void;
	onTechnicianComment: (order: DentalLabOrderData) => void;
	onAttachScan: (order: DentalLabOrderData) => void;
	copyPortalLink: (token?: string) => void;
	onClose: () => void;
}

export function MobileSheetSecondaryActions({
	order, onPrintOrder, onTechnicianComment, onAttachScan, copyPortalLink, onClose,
}: MobileSheetSecondaryActionsProps): React.JSX.Element {
	return (
		<div className="mobile-lab-secondary-actions">
			<button
				type="button"
				onClick={() => { onClose(); onPrintOrder(order); }}
				className="mobile-lab-secondary-btn"
				data-testid="mobile-sheet-print-btn"
			>
				<Printer size={16} className="text-teal-600 dark:text-teal-400" />
				<span>Печать наряда ЗТЛ (Бланк)</span>
			</button>

			<button
				type="button"
				onClick={() => { onClose(); onTechnicianComment(order); }}
				className="mobile-lab-secondary-btn"
				data-testid="mobile-sheet-comment-btn"
			>
				<MessageSquare size={16} className="text-amber-500" />
				<span>Комментарий технику</span>
			</button>

			<button
				type="button"
				onClick={() => { onClose(); onAttachScan(order); }}
				className="mobile-lab-secondary-btn"
				data-testid="mobile-sheet-scan-btn"
			>
				<Box size={16} className="text-sky-500" />
				<span>Прикрепить 3D-скан (STL / PLY)</span>
			</button>

			<button
				type="button"
				onClick={() => { onClose(); copyPortalLink((order as any).portalToken || order.id); }}
				className="mobile-lab-secondary-btn"
				data-testid="mobile-sheet-portal-link-btn"
			>
				<Link size={16} className="text-[var(--muted)]" />
				<span>Ссылка на веб-портал техника</span>
			</button>
		</div>
	);
}
