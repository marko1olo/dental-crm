import type React from "react";
import { Box, Clock, Layers, MoreHorizontal, Printer } from "lucide-react";
import { type CanonicalLabOrderStatus, mapToCanonicalStatus } from "../lab/labMath";
import { is3DScanUrl } from "../lab/LabAttachScanModal";
import type { LabOrder } from "./LabOrdersPanel";
import { LabOrderCardHeader } from "./LabOrderCardHeader";
import { LabOrderCardMenu } from "./LabOrderCardMenu";
import { LabOrderStatusStrip } from "./LabOrderStatusStrip";

export interface LabOrderCardItemProps {
	order: LabOrder;
	openMenuOrderId: string | null;
	setOpenMenuOrderId: (id: string | null | ((prev: string | null) => string | null)) => void;
	cardMenuRef: React.RefObject<HTMLDivElement | null>;
	onStatusTransition: (orderId: string, targetStatus: CanonicalLabOrderStatus) => void;
	onOpenPrintOrder: (order: LabOrder) => void;
	onOpenTrackingDrawer: (order: LabOrder) => void;
	onScheduleAppointment: (order: LabOrder) => void;
	onEditOrder: (order: LabOrder) => void;
	onAttachBitePhoto: (order: LabOrder) => void;
	onTechnicianComment: (order: LabOrder) => void;
	onRepeatFitting: (order: LabOrder) => void;
	onReclamation: (order: LabOrder) => void;
	onCopyPortalLink: (token: string) => void;
	onDeleteOrder: (id: string) => void;
	onView3DScan?: (order: LabOrder) => void;
}

export const LabOrderCardItem: React.FC<LabOrderCardItemProps> = ({
	order, openMenuOrderId, setOpenMenuOrderId, cardMenuRef, onStatusTransition,
	onOpenPrintOrder, onOpenTrackingDrawer, onScheduleAppointment, onEditOrder,
	onAttachBitePhoto, onTechnicianComment, onRepeatFitting, onReclamation,
	onCopyPortalLink, onDeleteOrder, onView3DScan,
}) => {
	const canonicalStatus = mapToCanonicalStatus(order.status);
	const isMenuOpen = openMenuOrderId === order.id;

	return (
		<div className="lab-order-card">
			<LabOrderCardHeader order={order} />
			<LabOrderStatusStrip canonicalStatus={canonicalStatus} orderId={order.id} onStatusTransition={onStatusTransition} />

			{order.clinicalNotes && (
				<p className="text-xs text-[var(--muted)] italic line-clamp-1 m-0">«{order.clinicalNotes}»</p>
			)}

			{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
				<div className="flex items-center gap-1.5 pt-0.5">
					<button
						type="button"
						onClick={() => onView3DScan?.(order)}
						className="px-2 py-0.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 font-mono truncate cursor-pointer transition-colors active:scale-95 text-left"
						data-testid={`lab-order-card-view-scan-btn-${order.id}`}
						title={`Открыть 3D-скан: ${order.attachedImageUrl}`}
					>
						<Box className="w-3.5 h-3.5 text-teal-500 shrink-0" />
						<span className="truncate">3D: {order.attachedImageUrl.split("/").pop()}</span>
					</button>
				</div>
			)}

			<div className="lab-card-footer">
				<div className="flex items-center gap-1 text-xs text-[var(--muted)]">
					<Clock className="w-3 h-3" />
					<span>Создан: {new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
				</div>
				<div className="lab-card-actions">
					<button type="button" onClick={() => onOpenPrintOrder(order)} className="lab-btn-32 is-primary" title="Распечатать бланк заказа для лаборатории">
						<Printer className="w-3.5 h-3.5" />
						<span>Печать заказа</span>
					</button>
					<button type="button" onClick={() => onOpenTrackingDrawer(order)} className="lab-btn-32" title="Сменить этап/статус и открыть трекинг заказа">
						<Layers className="w-3.5 h-3.5 text-indigo-500" />
						<span>Этап/статус</span>
					</button>
					<div className="relative inline-flex" ref={isMenuOpen ? cardMenuRef : null}>
						<button
							type="button"
							onClick={() => setOpenMenuOrderId((prev) => (prev === order.id ? null : order.id))}
							className="lab-btn-32 !px-2"
							title="Дополнительные действия"
							aria-label="Меню действий"
							aria-haspopup="menu"
							aria-expanded={isMenuOpen}
						>
							<MoreHorizontal className="w-3.5 h-3.5" />
						</button>
						{isMenuOpen && (
							<LabOrderCardMenu
								order={order}
								setOpenMenuOrderId={setOpenMenuOrderId}
								onScheduleAppointment={onScheduleAppointment}
								onEditOrder={onEditOrder}
								onAttachBitePhoto={onAttachBitePhoto}
								onTechnicianComment={onTechnicianComment}
								onRepeatFitting={onRepeatFitting}
								onReclamation={onReclamation}
								onCopyPortalLink={onCopyPortalLink}
								onDeleteOrder={onDeleteOrder}
								onView3DScan={onView3DScan}
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
