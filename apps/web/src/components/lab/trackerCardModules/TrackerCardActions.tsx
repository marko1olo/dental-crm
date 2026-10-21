import React from "react";
import { AlertOctagon, CalendarCheck, ChevronRight, MoreHorizontal, Printer, RotateCcw } from "lucide-react";
import type { DentalLabOrderRecord, LabDeadlineAlertResult } from "../dentalLabOrderEngine";
import { showToast } from "../../GlobalToast";

export interface TrackerCardActionsProps {
	order: DentalLabOrderRecord;
	alert: LabDeadlineAlertResult;
	nextStatus: string | null;
	openActionMenuId: string | null;
	setOpenActionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
	handleOpenReadyInClinicPrompt: (order: DentalLabOrderRecord) => void;
	handleAdvanceStatus: (orderId: string) => void;
	handleOpenEditOrder: (order: DentalLabOrderRecord) => void;
	handleWarrantyRework: (orderId: string) => void;
}

export function TrackerCardActions({
	order, alert, nextStatus, openActionMenuId, setOpenActionMenuId,
	handleOpenReadyInClinicPrompt, handleAdvanceStatus, handleOpenEditOrder, handleWarrantyRework,
}: TrackerCardActionsProps): React.JSX.Element {
	const isActionMenuOpen = openActionMenuId === order.id;

	return (
		<div className="space-y-2 pt-1 border-t border-[var(--line-subtle,#e2e8f0)]">
			{/* Alert Banner */}
			{alert.hasAlert && (
				<div className={`p-2 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${alert.badgeClass}`}>
					<AlertOctagon className="w-3.5 h-3.5 shrink-0" />
					<span className="truncate">{alert.messageRu}</span>
				</div>
			)}

			{/* Main Actions Row */}
			<div className="flex items-center gap-1.5">
				{order.status === "in_progress" ? (
					<button
						type="button"
						onClick={() => handleOpenReadyInClinicPrompt(order)}
						className="flex-1 h-8 px-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
					>
						<CalendarCheck size={13} />
						<span>В клинике</span>
					</button>
				) : nextStatus ? (
					<button
						type="button"
						onClick={() => handleAdvanceStatus(order.id)}
						className="flex-1 h-8 px-2.5 rounded-lg bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] font-bold text-xs inline-flex items-center justify-center gap-1 transition cursor-pointer"
					>
						<span>Далее</span>
						<ChevronRight size={13} />
					</button>
				) : null}

				{/* Action Menu */}
				<div className="relative">
					<button
						type="button"
						onClick={() => setOpenActionMenuId(isActionMenuOpen ? null : order.id)}
						className="w-8 h-8 rounded-lg border border-[var(--line,#cbd5e1)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] flex items-center justify-center transition cursor-pointer"
						aria-label="Действия с нарядом"
					>
						<MoreHorizontal size={14} />
					</button>

					{isActionMenuOpen && (
						<div className="absolute right-0 bottom-full mb-1 z-30 w-44 p-1 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] shadow-xl flex flex-col gap-0.5 text-xs">
							<button
								type="button"
								onClick={() => { setOpenActionMenuId(null); handleOpenEditOrder(order); }}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-medium cursor-pointer"
							>
								Открыть наряд
							</button>
							<button
								type="button"
								onClick={() => { setOpenActionMenuId(null); showToast(`Печать бланка ЗТЛ для наряда ${order.orderNumber}`); }}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-medium inline-flex items-center gap-1.5 cursor-pointer"
							>
								<Printer size={13} className="text-teal-600" />
								<span>Печать бланка</span>
							</button>
							{order.status !== "warranty_rework" && (
								<button
									type="button"
									onClick={() => { setOpenActionMenuId(null); handleWarrantyRework(order.id); }}
									className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-300 font-bold inline-flex items-center gap-1.5 cursor-pointer"
								>
									<RotateCcw size={13} />
									<span>На переделку (0 ₽)</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
