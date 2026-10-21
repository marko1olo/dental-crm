import React from "react";
import { Box, CalendarCheck, CheckCircle2, Layers, Printer, RotateCcw, Sparkles } from "lucide-react";
import { is3DScanUrl } from "../LabAttachScanModal";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { LabOrderRowActionsMenu, type LabOrderRowActionsMenuProps } from "./LabOrderRowActionsMenu";

export interface LabOrdersTableRowButtonsProps extends Omit<LabOrderRowActionsMenuProps, "isOpen" | "onToggle" | "onClose"> {
	readonly openMenuOrderId: string | null;
	readonly setOpenMenuOrderId: (id: string | null) => void;
	readonly onOpenReadyInClinicPrompt: (order: DentalLabOrderData) => void;
	readonly onOpenTracking: (order: DentalLabOrderData) => void;
}

export function LabOrdersTableRowButtons(props: LabOrdersTableRowButtonsProps): React.JSX.Element {
	const {
		order, openMenuOrderId, setOpenMenuOrderId, onOpenReadyInClinicPrompt,
		onOpenPrintOrder, onOpenTracking, onView3DScan, ...menuHandlers
	} = props;
	const isReady = ["ready", "ready_in_clinic", "shipped", "delivered", "received"].includes(order.status || "");

	return (
		<div className="inline-flex items-center gap-1">
			{isReady ? (
				<>
					<button type="button" onClick={() => onOpenReadyInClinicPrompt(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Работа готова в клинике! Записать пациента на прием" data-testid={`lab-order-table-schedule-btn-${order.id}`}>
						<CalendarCheck className="w-3 h-3 text-teal-600 dark:text-teal-400" /><span>Запись</span>
					</button>
					{order.status !== "completed" && (order as unknown as { status?: string }).status !== "installed" && (
						<button type="button" onClick={() => menuHandlers.onMarkInstalled(order)} className="primary-button h-7 min-h-[28px] px-2.5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Сдать работу пациенту и зафиксировать в полости рта" data-testid={`lab-order-table-install-btn-${order.id}`}>
							<Sparkles className="w-3 h-3" /><span>Сдать</span>
						</button>
					)}
				</>
			) : order.status === "refitting" ? (
				<>
					<button type="button" onClick={() => menuHandlers.onRepeatFitting(order)} className="h-7 min-h-[28px] px-2 rounded-lg border border-purple-500/30 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Припасовка / Повторная примерка" data-testid={`lab-order-table-fitting-btn-${order.id}`}>
						<RotateCcw className="w-3 h-3" /><span>Припасовка</span>
					</button>
					<button type="button" onClick={() => onOpenPrintOrder(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-teal-600/30 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Распечатать наряд в зуботехническую лабораторию" data-testid={`lab-order-table-print-btn-${order.id}`}>
						<Printer className="w-3 h-3 text-teal-600 dark:text-teal-400" /><span>Печать</span>
					</button>
				</>
			) : (
				<>
					<button type="button" onClick={() => onOpenReadyInClinicPrompt(order)} className="h-7 min-h-[28px] px-2 rounded-lg border border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Принять готовую работу в клинику" data-testid={`lab-order-table-receive-btn-${order.id}`}>
						<CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /><span>Принять</span>
					</button>
					<button type="button" onClick={() => onOpenPrintOrder(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-teal-600/30 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Распечатать наряд в зуботехническую лабораторию" data-testid={`lab-order-table-print-btn-${order.id}`}>
						<Printer className="w-3 h-3 text-teal-600 dark:text-teal-400" /><span>Печать</span>
					</button>
				</>
			)}
			<button type="button" onClick={() => onOpenTracking(order)} className="icon-button h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer" title="Этапы изготовления в лаборатории" data-testid={`lab-order-table-track-btn-${order.id}`}>
				<Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
			</button>
			{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
				<button type="button" onClick={() => onView3DScan(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-teal-500/30 bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Открыть прикрепленный 3D-скан (STL/PLY)" data-testid={`lab-order-table-view-scan-btn-${order.id}`}>
					<Box className="w-3.5 h-3.5 text-teal-500" /><span>3D-скан</span>
				</button>
			)}
			<LabOrderRowActionsMenu order={order} isOpen={openMenuOrderId === order.id} onToggle={() => setOpenMenuOrderId(openMenuOrderId === order.id ? null : (order.id ?? null))} onClose={() => setOpenMenuOrderId(null)} onView3DScan={onView3DScan} onOpenPrintOrder={onOpenPrintOrder} {...menuHandlers} />
		</div>
	);
}
