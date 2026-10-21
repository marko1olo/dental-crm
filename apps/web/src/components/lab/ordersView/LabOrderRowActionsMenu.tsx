import React from "react";
import {
	AlertOctagon, Box, Camera, CheckCircle2, DollarSign,
	ExternalLink, Link, MessageSquare, MoreVertical, Printer, RotateCcw,
} from "lucide-react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { is3DScanUrl } from "../LabAttachScanModal";

export interface LabOrderRowActionsMenuProps {
	readonly order: DentalLabOrderData;
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly onClose: () => void;
	readonly onView3DScan: (order: DentalLabOrderData) => void;
	readonly onPayFromCashbox: (order: DentalLabOrderData) => void;
	readonly onMarkInstalled: (order: DentalLabOrderData) => void;
	readonly onAttach3DScan: (order: DentalLabOrderData) => void;
	readonly onAttachBitePhoto: (order: DentalLabOrderData) => void;
	readonly onTechnicianComment: (order: DentalLabOrderData) => void;
	readonly onOpenPrintOrder: (order: DentalLabOrderData) => void;
	readonly onRepeatFitting: (order: DentalLabOrderData) => void;
	readonly onReclamation: (order: DentalLabOrderData) => void;
	readonly onOpenEditOrder: (order: DentalLabOrderData) => void;
	readonly copyPortalLink: (token?: string) => void;
}

export function LabOrderRowActionsMenu(props: LabOrderRowActionsMenuProps): React.JSX.Element {
	const {
		order, isOpen, onToggle, onClose, onView3DScan, onPayFromCashbox,
		onMarkInstalled, onAttach3DScan, onAttachBitePhoto, onTechnicianComment,
		onOpenPrintOrder, onRepeatFitting, onReclamation, onOpenEditOrder, copyPortalLink,
	} = props;
	const isScan = order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl);
	const isPaid = Boolean((order as unknown as { paidFromCashOperationId?: string }).paidFromCashOperationId);
	const canInstall = order.status !== "installed" && order.status !== "completed";

	return (
		<div className="relative">
			<button
				type="button"
				onClick={onToggle}
				className="icon-button h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Вторичные действия"
				data-testid={`lab-order-table-menu-btn-${order.id}`}
			>
				<MoreVertical className="w-3.5 h-3.5" />
			</button>

			{isOpen && (
				<div
					className="absolute right-0 top-full mt-1 w-52 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl z-30 py-1 text-xs text-[var(--ink)] animate-in fade-in-50 duration-100 text-left"
					onClick={(e) => e.stopPropagation()}
				>
					{isScan && (
						<button
							type="button"
							onClick={() => { onClose(); onView3DScan(order); }}
							className="w-full px-3 py-1.5 hover:bg-teal-500/10 flex items-center gap-2 cursor-pointer text-[11px] text-teal-700 dark:text-teal-300 font-bold"
							data-testid={`lab-order-table-menu-view-scan-btn-${order.id}`}
						>
							<Box className="w-3.5 h-3.5 text-teal-500" />
							<span>Открыть 3D-скан</span>
						</button>
					)}
					{!isPaid && (
						<button type="button" onClick={() => onPayFromCashbox(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
							<DollarSign className="w-3.5 h-3.5" />
							<span>Оплатить из кассы</span>
						</button>
					)}
					{canInstall && (
						<button type="button" onClick={() => onMarkInstalled(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-teal-700 dark:text-teal-400 font-semibold">
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>Сдать работу пациенту</span>
						</button>
					)}
					<button type="button" onClick={() => onAttach3DScan(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]">
						<Box className="w-3.5 h-3.5 text-teal-500" />
						<span>Прикрепить 3D-скан (STL/PLY)</span>
					</button>
					<button type="button" onClick={() => onAttachBitePhoto(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]">
						<Camera className="w-3.5 h-3.5 text-sky-500" />
						<span>Прикрепить фото прикуса</span>
					</button>
					<button type="button" onClick={() => onTechnicianComment(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]">
						<MessageSquare className="w-3.5 h-3.5 text-amber-500" />
						<span>Комментарий технику</span>
					</button>
					<button type="button" onClick={() => onOpenPrintOrder(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]">
						<Printer className="w-3.5 h-3.5 text-teal-600" />
						<span>Печать наряда в ЗТЛ</span>
					</button>
					<button type="button" onClick={() => onRepeatFitting(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-purple-600 dark:text-purple-400">
						<RotateCcw className="w-3.5 h-3.5" />
						<span>Повторная примерка</span>
					</button>
					<button type="button" onClick={() => onReclamation(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px] text-rose-600 dark:text-rose-400">
						<AlertOctagon className="w-3.5 h-3.5" />
						<span>Отправить на переделку (0 ₽)</span>
					</button>
					<button type="button" onClick={() => onOpenEditOrder(order)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]">
						<ExternalLink className="w-3.5 h-3.5" />
						<span>Редактировать параметры</span>
					</button>
					<button type="button" onClick={() => copyPortalLink((order as unknown as { portalToken?: string }).portalToken || order.id)} className="w-full px-3 py-1.5 hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[11px]">
						<Link className="w-3.5 h-3.5" />
						<span>Ссылка для техника</span>
					</button>
				</div>
			)}
		</div>
	);
}
