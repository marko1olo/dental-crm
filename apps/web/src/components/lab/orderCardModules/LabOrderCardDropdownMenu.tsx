import React from "react";
import { Box, CalendarCheck, CheckCircle2, DollarSign, Layers, Link, MessageSquare, RotateCcw } from "lucide-react";
import { DentalLabOrder } from "../../icons/DentalIcons";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { is3DScanUrl } from "../LabAttachScanModal";

export interface LabOrderCardDropdownMenuProps {
	order: DentalLabOrderData;
	handleOpenReadyInClinicPrompt?: ((order: DentalLabOrderData) => void) | undefined;
	handlePayFromCashbox?: ((order: DentalLabOrderData) => void) | undefined;
	handleMarkInstalled?: ((order: DentalLabOrderData) => void) | undefined;
	handleOpenTracking: (order: DentalLabOrderData) => void;
	handleView3DScan?: ((order: DentalLabOrderData) => void) | undefined;
	handleAttach3DScan: (order: DentalLabOrderData) => void;
	handleAttachBitePhoto: (order: DentalLabOrderData) => void;
	handleTechnicianComment: (order: DentalLabOrderData) => void;
	handleRepeatFitting: (order: DentalLabOrderData) => void;
	handleReclamation: (order: DentalLabOrderData) => void;
	handleOpenEditOrder: (order: DentalLabOrderData) => void;
	copyPortalLink: (token?: string) => void;
	onCloseMenu: () => void;
}

export function LabOrderCardDropdownMenu({
	order, handleOpenReadyInClinicPrompt, handlePayFromCashbox, handleMarkInstalled,
	handleOpenTracking, handleView3DScan, handleAttach3DScan, handleAttachBitePhoto,
	handleTechnicianComment, handleRepeatFitting, handleReclamation, handleOpenEditOrder,
	copyPortalLink, onCloseMenu,
}: LabOrderCardDropdownMenuProps): React.JSX.Element {
	const is3D = Boolean(order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl));
	const isPaid = Boolean((order as unknown as { paidFromCashOperationId?: string }).paidFromCashOperationId);

	return (
		<div className="absolute right-0 bottom-full mb-1 z-50 w-56 p-1.5 bg-[var(--paper-strong)] border border-[var(--line)] rounded-xl shadow-lg flex flex-col gap-1 text-xs">
			{handleOpenReadyInClinicPrompt && (
				<button type="button" onClick={() => { onCloseMenu(); handleOpenReadyInClinicPrompt(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-menu-ready-schedule-btn-${order.id}`}>
					<CalendarCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /><span>Запись на примерку / SMS</span>
				</button>
			)}
			{handlePayFromCashbox && !isPaid && (
				<button type="button" onClick={() => { onCloseMenu(); handlePayFromCashbox(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-card-pay-cashbox-btn-${order.id}`}>
					<DollarSign className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /><span>Оплатить из кассы</span>
				</button>
			)}
			{handleMarkInstalled && order.status !== "completed" && (
				<button type="button" onClick={() => { onCloseMenu(); handleMarkInstalled(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-card-mark-installed-btn-${order.id}`}>
					<CheckCircle2 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /><span>Сдать работу пациенту</span>
				</button>
			)}
			<button type="button" onClick={() => { onCloseMenu(); handleOpenTracking(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer">
				<Layers className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" /><span>Сменить этап/статус</span>
			</button>
			{is3D && (
				<button type="button" onClick={() => { onCloseMenu(); (handleView3DScan || handleAttach3DScan)(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-menu-view-scan-btn-${order.id}`}>
					<Box className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /><span>Открыть 3D-скан (STL/PLY)</span>
				</button>
			)}
			<button type="button" onClick={() => { onCloseMenu(); handleAttach3DScan(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-attach-scan-btn-${order.id}`}>
				<Box className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" /><span>Прикрепить 3D-скан</span>
			</button>
			<button type="button" onClick={() => { onCloseMenu(); handleAttachBitePhoto(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-attach-photo-btn-${order.id}`}>
				<span>Фото прикуса</span>
			</button>
			<button type="button" onClick={() => { onCloseMenu(); handleTechnicianComment(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-tech-comment-btn-${order.id}`}>
				<MessageSquare className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" /><span>Указание технику</span>
			</button>
			<button type="button" onClick={() => { onCloseMenu(); handleRepeatFitting(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-semibold text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-repeat-fitting-btn-${order.id}`}>
				<RotateCcw className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" /><span>Повторная примерка</span>
			</button>
			<button type="button" onClick={() => { onCloseMenu(); handleReclamation(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400 inline-flex items-center gap-2 cursor-pointer" data-testid={`lab-order-reclamation-btn-${order.id}`}>
				<span>Отправить на переделку (0 ₽)</span>
			</button>
			<button type="button" onClick={() => { onCloseMenu(); handleOpenEditOrder(order); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer">
				<DentalLabOrder className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" /><span>Подробные параметры</span>
			</button>
			{order.secureToken && (
				<button type="button" onClick={() => { onCloseMenu(); copyPortalLink(order.secureToken!); }} className="w-full text-left px-2.5 py-1.5 min-h-[36px] rounded-lg hover:bg-[var(--paper-soft)] font-medium text-[var(--ink)] inline-flex items-center gap-2 cursor-pointer">
					<Link className="w-3.5 h-3.5 text-emerald-500" /><span>Копировать ссылку</span>
				</button>
			)}
		</div>
	);
}
