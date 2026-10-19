import { Box, X } from "lucide-react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";

export function LabAttachHeader({
	order,
	onClose,
}: {
	readonly order: DentalLabOrderData;
	readonly onClose: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border bg-teal-500/10 border-teal-500/25 text-teal-600 dark:text-teal-400">
					<Box className="w-4 h-4" />
				</div>
				<div className="min-w-0">
					<h3
						id="lab-attach-modal-title"
						className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0 truncate"
					>
						Прикрепление 3D-скана / фото (ЗТЛ)
					</h3>
					<p className="text-[11px] text-[var(--muted,#64748b)] m-0 truncate">
						Наряд #{order.id ? order.id.slice(0, 8) : ""} ·{" "}
						{order.patientName || "Пациент"} (зуб {order.toothFdi || "—"})
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[32px] min-w-[32px] rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center transition-colors cursor-pointer"
				aria-label="Закрыть"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}
