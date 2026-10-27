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
					<button type="button" onClick={() => onOpenReadyInClinicPrompt(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] hover:text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Работа готова в клинике! Записать пациента на прием" data-testid={`lab-order-table-schedule-btn-${order.id}`}>
						<CalendarCheck className="w-3 h-3 text-[var(--muted)]" /><span>Запись</span>
					</button>
					{order.status !== "completed" && (order as unknown as { status?: string }).status !== "installed" && (
						<button type="button" onClick={() => menuHandlers.onMarkInstalled(order)} className="primary-button h-7 min-h-[28px] px-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Сдать работу пациенту и зафиксировать в полости рта" data-testid={`lab-order-table-install-btn-${order.id}`}>
							<Sparkles className="w-3 h-3" /><span>Сдать</span>
						</button>
					)}
				</>
			) : order.status === "refitting" ? (
				<>
					<button type="button" onClick={() => menuHandlers.onRepeatFitting(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] hover:text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Припасовка / Повторная примерка" data-testid={`lab-order-table-fitting-btn-${order.id}`}>
						<RotateCcw className="w-3 h-3 text-[var(--muted)]" /><span>Припасовка</span>
					</button>
					<button type="button" onClick={() => onOpenPrintOrder(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] hover:text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Распечатать наряд в зуботехническую лабораторию" data-testid={`lab-order-table-print-btn-${order.id}`}>
						<Printer className="w-3 h-3 text-[var(--muted)]" /><span>Печать</span>
					</button>
				</>
			) : (
				<>
					<button type="button" onClick={() => onOpenReadyInClinicPrompt(order)} className="primary-button h-7 min-h-[28px] px-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Принять готовую работу в клинику" data-testid={`lab-order-table-receive-btn-${order.id}`}>
						<CheckCircle2 className="w-3 h-3" /><span>Принять</span>
					</button>
					<button type="button" onClick={() => onOpenPrintOrder(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] hover:text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Распечатать наряд в зуботехническую лабораторию" data-testid={`lab-order-table-print-btn-${order.id}`}>
						<Printer className="w-3 h-3 text-[var(--muted)]" /><span>Печать</span>
					</button>
				</>
			)}
			<button type="button" onClick={() => onOpenTracking(order)} className="icon-button h-7 min-h-[28px] w-7 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer" title="Этапы изготовления в лаборатории" data-testid={`lab-order-table-track-btn-${order.id}`}>
				<Layers className="w-3.5 h-3.5" />
			</button>
			{order.attachedImageUrl && is3DScanUrl(order.attachedImageUrl) && (
				<button type="button" onClick={() => onView3DScan(order)} className="secondary-button h-7 min-h-[28px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] hover:text-[var(--ink)] font-semibold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]" title="Открыть прикрепленный 3D-скан (STL/PLY)" data-testid={`lab-order-table-view-scan-btn-${order.id}`}>
					<Box className="w-3.5 h-3.5 text-[var(--muted)]" /><span>3D-скан</span>
				</button>
			)}
			<LabOrderRowActionsMenu order={order} isOpen={openMenuOrderId === order.id} onToggle={() => setOpenMenuOrderId(openMenuOrderId === order.id ? null : (order.id ?? null))} onClose={() => setOpenMenuOrderId(null)} onView3DScan={onView3DScan} onOpenPrintOrder={onOpenPrintOrder} {...menuHandlers} />
		</div>
	);
}
