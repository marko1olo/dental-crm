import React from "react";
import { Check, CheckCircle2, ChevronRight, RotateCcw, Sparkles } from "lucide-react";
import type { DentalLabOrderData } from "../../labMath";

export interface MobileSheetStatusButtonsProps {
	order: DentalLabOrderData;
	currentStatus: string;
	onStatusChange: (orderId: string, newStatus: string) => void;
	onReclamation: (order: DentalLabOrderData) => void;
	onClose: () => void;
}

export function MobileSheetStatusButtons({
	order, currentStatus, onStatusChange, onReclamation, onClose,
}: MobileSheetStatusButtonsProps): React.JSX.Element {
	return (
		<div className="space-y-1.5">
			<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] px-1">
				Сменить статус наряда:
			</div>
			<div className="mobile-lab-status-grid">
				<button
					type="button"
					onClick={() => { onStatusChange(order.id!, "ready_in_clinic"); onClose(); }}
					className={`mobile-lab-status-action-btn variant-ready ${
						currentStatus === "ready" || currentStatus === "ready_in_clinic" || currentStatus === "shipped"
							? "is-active ring-2 ring-[var(--teal,#0d9488)] font-black" : ""
					}`}
					data-testid="mobile-status-btn-ready-in-clinic"
				>
					<div className="flex items-center gap-2.5">
						<CheckCircle2 size={18} className="text-[var(--teal)]" />
						<span>Принят в клинику</span>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>

				<button
					type="button"
					onClick={() => { onStatusChange(order.id!, "fitting"); onClose(); }}
					className={`mobile-lab-status-action-btn variant-fitting ${
						currentStatus === "fitting" || currentStatus === "try_in"
							? "is-active ring-2 ring-[var(--teal,#0d9488)] font-black" : ""
					}`}
					data-testid="mobile-status-btn-fitting"
				>
					<div className="flex items-center gap-2.5">
						<Sparkles size={18} className="text-[var(--muted)]" />
						<span>Передан на примерку</span>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>

				<button
					type="button"
					onClick={() => { onClose(); onReclamation(order); }}
					className="mobile-lab-status-action-btn variant-correction"
					data-testid="mobile-status-btn-correction"
				>
					<div className="flex items-center gap-2.5">
						<RotateCcw size={18} className="text-[var(--bad-fg,#e11d48)]" />
						<span>Отправить на переделку (0 ₽)</span>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>

				<button
					type="button"
					onClick={() => { onStatusChange(order.id!, "completed"); onClose(); }}
					className={`mobile-lab-status-action-btn variant-completed ${
						currentStatus === "completed" ? "is-active ring-2 ring-[var(--teal,#0d9488)] font-black" : ""
					}`}
					data-testid="mobile-status-btn-completed"
				>
					<div className="flex items-center gap-2.5">
						<Check size={18} className="text-[var(--teal)]" />
						<span>Зафиксирован в полости рта</span>
					</div>
					<ChevronRight size={16} className="text-[var(--muted)]" />
				</button>
			</div>
		</div>
	);
}
