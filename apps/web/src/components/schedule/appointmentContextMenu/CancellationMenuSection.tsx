import React, { useState } from "react";
import { ChevronDown, Sparkles, UserX, XCircle } from "lucide-react";
import { APPOINTMENT_REFUSAL_REASONS_CATALOG, type Appointment } from "@dental/shared";

export function CancellationMenuSection({
	appointment,
	isQuickStatusUpdating,
	handleQuickStatusChange,
	onFreeSlotToWaitlist,
	onClose,
}: {
	appointment: Appointment;
	isQuickStatusUpdating: boolean;
	handleQuickStatusChange: (status: Appointment["status"], noteAppend?: string) => Promise<void>;
	onFreeSlotToWaitlist?: ((appointment: Appointment) => void) | undefined;
	onClose: () => void;
}) {
	const [isRefusalReasonsOpen, setIsRefusalReasonsOpen] = useState(false);

	return (
		<>
			<div className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--line)] mt-1 pt-1">
				Статус и отмена
			</div>
			<button
				type="button"
				disabled={false}
				aria-busy={isQuickStatusUpdating || undefined}
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-between cursor-pointer"
				role="menuitem"
				onClick={() => setIsRefusalReasonsOpen((prev) => !prev)}
				title="Отменить приём"
				data-testid="appointment-card-refusal-menu-trigger"
			>
				<div className="flex items-center gap-2">
					<XCircle size={14} className="text-[var(--bad-fg,var(--rose))] shrink-0" />
					<span>Отменить приём</span>
				</div>
				<ChevronDown size={14} className={`text-[var(--bad-fg,var(--rose))] shrink-0 transition-transform ${isRefusalReasonsOpen ? "rotate-180" : ""}`} />
			</button>
			{isRefusalReasonsOpen && (
				<div className="p-1 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-0.5 my-1 max-h-[190px] overflow-y-auto [scrollbar-width:thin]" data-testid="appointment-card-refusal-reasons-dropdown">
					<div className="text-[10px] font-bold text-rose-800 dark:text-rose-200 uppercase tracking-wider px-1">Причины отмены:</div>
					{APPOINTMENT_REFUSAL_REASONS_CATALOG.map((refuse) => (
						<button
							key={refuse.id}
							type="button"
							onClick={() => {
								onClose();
								setIsRefusalReasonsOpen(false);
								const statusToSet = refuse.code.startsWith("no_show") ? "no_show" : "cancelled";
								void handleQuickStatusChange(statusToSet, `[Отмена: ${refuse.nameRu}]`);
							}}
							className="w-full text-left px-2 py-1 h-7 min-h-[28px] sm:h-7 sm:min-h-[28px] touch:min-h-[36px] rounded-lg text-[11px] font-medium text-[var(--ink)] hover:bg-rose-500/15 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-between cursor-pointer"
							data-testid={`appointment-card-refusal-reason-${refuse.code}`}
							title={`${refuse.nameRu} (${refuse.responsibility === "clinic" ? "Клиника" : refuse.responsibility === "patient" ? "Пациент" : "Система"})`}
						>
							<span className="truncate">{refuse.nameRu}</span>
						</button>
					))}
				</div>
			)}
			<button
				type="button"
				disabled={isQuickStatusUpdating}
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-40"
				role="menuitem"
				data-testid="appointment-card-free-to-waitlist-btn"
				onClick={() => {
					onClose();
					void handleQuickStatusChange("cancelled", "Освобождено под лист ожидания");
					if (onFreeSlotToWaitlist) onFreeSlotToWaitlist(appointment);
				}}
				title="Отменить приём и подобрать пациента из листа ожидания"
			>
				<div className="flex items-center gap-2">
					<Sparkles size={14} className="text-[var(--teal)] shrink-0" />
					<span>В лист ожидания (отмена)</span>
				</div>
				<span className="text-[10px] font-bold text-[var(--teal)]">Авто</span>
			</button>
			<button
				type="button"
				disabled={isQuickStatusUpdating}
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
				role="menuitem"
				onClick={() => {
					onClose();
					void handleQuickStatusChange("cancelled");
				}}
				title="Отменить приём без указания причины"
			>
				<XCircle size={14} className="text-[var(--bad-fg,var(--rose))] shrink-0 opacity-60" />
				<span>Отменить без причины</span>
			</button>
			<button
				type="button"
				disabled={isQuickStatusUpdating}
				className="w-full text-left px-2.5 py-1.5 h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] touch:min-h-[44px] rounded-lg text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40"
				role="menuitem"
				onClick={() => {
					onClose();
					void handleQuickStatusChange("no_show");
				}}
				title="Отметить: пациент не явился"
			>
				<UserX size={14} className="text-[var(--warn-fg,var(--amber))] shrink-0" />
				<span>Не явился (No-show)</span>
			</button>
		</>
	);
}
