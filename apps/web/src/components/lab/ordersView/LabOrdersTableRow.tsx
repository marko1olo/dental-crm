import React from "react";
import { CheckCircle2 } from "lucide-react";
import { money } from "../../../AppHelpers";
import { formatLabConstructionTitle, formatLabMaterial } from "../../../pages/LabOrdersPage";
import { SHADE_SWATCH_MAP } from "../labMath";
import type { DentalLabOrderData } from "../DentalLabOrderModal";
import { renderLabDueBadge } from "./labDueBadges";
import type { LabOrderRowActionsMenuProps } from "./LabOrderRowActionsMenu";
import { LabOrdersTableRowButtons } from "./LabOrdersTableRowButtons";

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
	const num = (order as unknown as { orderNumber?: string }).orderNumber || (order.id ? `ЗТЛ-${order.id.slice(-4).toUpperCase()}` : "ЗТЛ");
	const swatchBg = SHADE_SWATCH_MAP[order.colorVita?.toUpperCase() ?? ""]?.bg || "#f4eedb";
	const title = formatLabConstructionTitle(order.constructionType, order.material ?? undefined);
	const displayMaterial = formatLabMaterial(order.material);
	const showMaterial = Boolean(displayMaterial) && displayMaterial.trim().toLowerCase() !== title.trim().toLowerCase();
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
					<span className="font-semibold text-xs text-[var(--ink)] leading-snug whitespace-normal break-words" title={`${order.constructionType || ""} ${displayMaterial}`}>{title}</span>
					{showMaterial && <span className="text-[10px] text-[var(--muted)] leading-tight whitespace-normal break-words">{displayMaterial}</span>}
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
				<LabOrdersTableRowButtons
					order={order} openMenuOrderId={openMenuOrderId} setOpenMenuOrderId={setOpenMenuOrderId}
					onOpenReadyInClinicPrompt={onOpenReadyInClinicPrompt} onOpenPrintOrder={onOpenPrintOrder}
					onOpenTracking={onOpenTracking} onView3DScan={onView3DScan} {...menuHandlers}
				/>
			</td>
		</tr>
	);
}
