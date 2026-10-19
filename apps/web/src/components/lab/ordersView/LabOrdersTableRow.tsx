import React from "react";
import { Box, CalendarCheck, CheckCircle2, Layers, Printer, RotateCcw, Sparkles } from "lucide-react";
import { money } from "../../../AppHelpers";
import { formatLabConstructionTitle } from "../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../labMath";
import { is3DScanUrl } from "../LabAttachScanModal";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { renderLabDueBadge } from "./labDueBadges";
import { LabOrderRowActionsMenu, type LabOrderRowActionsMenuProps } from "./LabOrderRowActionsMenu";

export interface LabOrdersTableRowProps extends Omit<LabOrderRowActionsMenuProps, "isOpen" | "onToggle" | "onClose"> {
	readonly openMenuOrderId: string | null;
	readonly setOpenMenuOrderId: (id: string | null) => void;
	readonly onSelectTimelineOrder: (id: string) => void;
	readonly onOpenReadyInClinicPrompt: (order: DentalLabOrderData) => void;
	readonly onOpenTracking: (order: DentalLabOrderData) => void;
	readonly getStatusBadge: (status?: string) => React.ReactNode;
}

export function LabOrdersTableRow(props: LabOrdersTableRowProps): React.JSX.Element {
	const {
		order, openMenuOrderId, setOpenMenuOrderId, onSelectTimelineOrder,
		onOpenReadyInClinicPrompt, onOpenPrintOrder, onOpenTracking, onView3DScan,
		getStatusBadge, ...menuHandlers
	} = props;
	const isReady = ["ready", "ready_in_clinic", "shipped", "delivered", "received"].includes(order.status || "");
	const num = (order as unknown as { orderNumber?: string }).orderNumber || (order.id ? `ЗТЛ-${order.id.slice(-4).toUpperCase()}` : "ЗТЛ");
	const swatchBg = SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
	const title = formatLabConstructionTitle(order.constructionType, order.material ?? undefined);
	const showMaterial = Boolean(order.material) && order.material?.trim().toLowerCase() !== title.trim().toLowerCase();
	const isWarranty = (order as unknown as { isWarrantyRework?: boolean }).isWarrantyRework || order.status === "refitting" || order.priceRub === 0;

	return (
		<tr
			key={order.id}
			className="h-9 min-h-[36px] hover:bg-[var(--paper-soft)] transition-colors text-xs text-[var(--ink)] cursor-pointer"
			data-testid={`lab-order-table-row-${order.id}`}
			onClick={() => { if (order.id) onSelectTimelineOrder(order.id); }}
		>
			<td className="px-2.5 py-1.5 whitespace-nowrap align-middle">
				<span className="font-mono font-bold text-[11px] text-teal-600 dark:text-teal-400">{num}</span>
			</td>
			<td className="px-2.5 py-1.5 whitespace-nowrap align-middle">
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="font-bold text-xs text-[var(--ink)]" title={order.patientName}>{order.patientName || "Пациент"}</span>
					{order.stageNumber ? (
						<span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
							Этап {order.stageNumber}
						</span>
					) : null}
				</div>
			</td>
			<td className="px-2 py-1.5 whitespace-nowrap align-middle text-center">
				<span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border border-[var(--line)] font-mono">
					{order.toothFdi ? `№ ${order.toothFdi}` : "Челюсть"}
				</span>
			</td>
			<td className="px-2.5 py-1.5 align-middle">
				<div className="flex flex-col min-w-[160px] max-w-[340px] break-words">
					<span className="font-semibold text-xs text-[var(--ink)] leading-snug whitespace-normal break-words" title={`${order.constructionType || ""} ${order.material || ""}`}>{title}</span>
					{showMaterial && <span className="text-[10px] text-[var(--muted)] leading-tight whitespace-normal break-words">{order.material}</span>}
				</div>
			</td>
			<td className="px-2.5 py-0 whitespace-nowrap align-middle">
				{order.colorVita ? (
					<span className="inline-flex items-center gap-1 font-bold text-[11px]">
						<span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: swatchBg }} />
						<span>{order.colorVita}</span>
					</span>
				) : <span className="text-[var(--muted)] text-[11px]">—</span>}
			</td>
			<td className="px-2.5 py-0 whitespace-nowrap align-middle">{getStatusBadge(order.status)}</td>
			<td className="px-2.5 py-0 whitespace-nowrap align-middle">{renderLabDueBadge(order)}</td>
			<td className="px-2.5 py-0 whitespace-nowrap align-middle font-mono font-bold text-xs text-right">
				{isWarranty ? (
					<span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Гарантийная рекламация: 0 ₽ для пациента">0 ₽ (Гарантия)</span>
				) : order.priceRub != null ? (
					<div className="inline-flex items-center gap-1.5 justify-end">
						<span>{money(order.priceRub)}</span>
						{Boolean((order as unknown as { paidFromCashOperationId?: string }).paidFromCashOperationId) && (
							<span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
								<CheckCircle2 className="w-2.5 h-2.5" />Оплачен
							</span>
						)}
					</div>
				) : "—"}
			</td>
			<td className="px-2.5 py-0 whitespace-nowrap align-middle text-right" onClick={(e) => e.stopPropagation()}>
				<div className="inline-flex items-center gap-1">
					{isReady ? (
						<>
							<button type="button" onClick={() => onOpenReadyInClinicPrompt(order)} className="primary-button h-7 min-h-[28px] px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Работа готова в клинике! Записать пациента на прием" data-testid={`lab-order-table-schedule-btn-${order.id}`}>
								<CalendarCheck className="w-3 h-3" /><span>Запись</span>
							</button>
							{order.status !== "completed" && (order as unknown as { status?: string }).status !== "installed" && (
								<button type="button" onClick={() => menuHandlers.onMarkInstalled(order)} className="h-7 min-h-[28px] px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap" title="Сдать работу пациенту и зафиксировать в полости рта" data-testid={`lab-order-table-install-btn-${order.id}`}>
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
			</td>
		</tr>
	);
}
