import React from "react";
import { AlertCircle, FlaskConical, Loader2, Plus } from "lucide-react";
import { LabOrdersTable } from "./LabOrdersTable";
import { LabOrderCardsGrid } from "./LabOrderCard";
import { getStatusBadge } from "./constants";
import type { useDentalLabOrders } from "./useDentalLabOrders";
import { DentalLabOrdersKanbanView } from "./DentalLabOrdersKanbanView";

export interface DentalLabOrdersViewSwitchProps {
	readonly logic: ReturnType<typeof useDentalLabOrders>;
}

export function DentalLabOrdersViewSwitch({ logic }: DentalLabOrdersViewSwitchProps): React.JSX.Element {
	const {
		isLoading, error, viewMode, filteredOrders,
		openMenuOrderId, setOpenMenuOrderId, setSelectedTimelineOrderId,
		handleOpenNewOrder, handleOpenEditOrder, handleOpenPrintOrder,
		handleAttachBitePhoto, handleTechnicianComment, handleRepeatFitting, handleReclamation,
		handleOpenReadyInClinicPrompt, handleOpenTracking, handleView3DScan, handlePayFromCashbox,
		handleMarkInstalled, handleAttach3DScan, copyPortalLink,
	} = logic;

	if (isLoading) {
		return (
			<div className="p-12 text-center text-[var(--muted)] flex items-center justify-center gap-2">
				<Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
				<span>Загрузка нарядов лаборатории...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl text-rose-700 dark:text-rose-300 flex items-center gap-3">
				<AlertCircle className="w-5 h-5 shrink-0" />
				<div>
					<div className="font-bold">Не удалось загрузить наряды лаборатории</div>
					<div className="text-xs">{error}</div>
				</div>
			</div>
		);
	}

	if (viewMode === "kanban") {
		return <DentalLabOrdersKanbanView logic={logic} />;
	}

	if (filteredOrders.length === 0) {
		return (
			<div className="p-12 text-center bg-[var(--paper)] rounded-2xl border border-dashed border-[var(--line)] text-[var(--muted)] text-xs space-y-3">
				<FlaskConical className="w-10 h-10 mx-auto text-[var(--primary)]" />
				<p className="font-bold text-sm text-[var(--ink)]" data-testid="lab-orders-empty-state-title">
					Нет активных заказов в лабораторию
				</p>
				<p className="max-w-md mx-auto text-[var(--muted)]">
					Оформите новый заказ-наряд на коронки, элайнеры, бюгели или виниры с расцветкой VITA и расчетом удержания с врача.
				</p>
				<button
					type="button" onClick={handleOpenNewOrder}
					className="min-h-[44px] h-11 px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white font-medium inline-flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 text-xs"
					data-testid="empty-state-add-first-lab-order-btn"
				>
					<Plus className="w-4 h-4" />
					<span>+ Заказ в лабораторию</span>
				</button>
			</div>
		);
	}

	if (viewMode === "table") {
		return (
			<LabOrdersTable
				orders={filteredOrders} openMenuOrderId={openMenuOrderId} setOpenMenuOrderId={setOpenMenuOrderId}
				onSelectTimelineOrder={(id) => setSelectedTimelineOrderId((prev) => (prev === id ? null : id))}
				onOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt} onOpenPrintOrder={handleOpenPrintOrder}
				onOpenTracking={handleOpenTracking} onView3DScan={handleView3DScan} onPayFromCashbox={handlePayFromCashbox}
				onMarkInstalled={handleMarkInstalled} onAttach3DScan={handleAttach3DScan} onAttachBitePhoto={handleAttachBitePhoto}
				onTechnicianComment={handleTechnicianComment} onRepeatFitting={handleRepeatFitting} onReclamation={handleReclamation}
				onOpenEditOrder={handleOpenEditOrder} copyPortalLink={copyPortalLink} getStatusBadge={getStatusBadge}
			/>
		);
	}

	return (
		<LabOrderCardsGrid
			orders={filteredOrders} openMenuOrderId={openMenuOrderId} setOpenMenuOrderId={setOpenMenuOrderId}
			handleOpenPrintOrder={handleOpenPrintOrder} handleOpenTracking={handleOpenTracking}
			handleAttach3DScan={handleAttach3DScan} handleAttachBitePhoto={handleAttachBitePhoto}
			handleTechnicianComment={handleTechnicianComment} handleRepeatFitting={handleRepeatFitting}
			handleReclamation={handleReclamation} handleOpenEditOrder={handleOpenEditOrder}
			copyPortalLink={copyPortalLink} getStatusBadge={getStatusBadge}
			handleOpenReadyInClinicPrompt={handleOpenReadyInClinicPrompt} handlePayFromCashbox={handlePayFromCashbox}
			handleMarkInstalled={handleMarkInstalled} handleView3DScan={handleView3DScan}
		/>
	);
}
