import type { Appointment } from "@dental/shared";
import { CheckCircle2, User, UserCheck, UserX } from "lucide-react";

interface GridAppointmentHudStatusActionsProps {
	appointment: Appointment;
	onQuickStatusChange?: (id: string, status: any) => void;
}

export function GridAppointmentHudStatusActions({
	appointment: a,
	onQuickStatusChange,
}: GridAppointmentHudStatusActionsProps) {
	if (!onQuickStatusChange) return null;

	return (
		<div className="space-y-1.5 pt-1 border-t border-[var(--line)]">
			<span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Сменить статус в 1 клик
			</span>
			<div className="grid grid-cols-2 gap-1.5">
				{a.status !== "in_treatment" && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStatusChange(a.id, "in_treatment");
						}}
						className="secondary-button min-h-[32px] sm:min-h-[32px] pointer-coarse:min-h-[44px] px-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all"
					>
						<UserCheck className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span>В кресле</span>
					</button>
				)}
				{a.status !== "completed" && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStatusChange(a.id, "completed");
						}}
						className="secondary-button min-h-[32px] sm:min-h-[32px] pointer-coarse:min-h-[44px] px-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all"
					>
						<CheckCircle2 className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
						<span>Завершён</span>
					</button>
				)}
				{a.status !== "arrived" && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStatusChange(a.id, "arrived");
						}}
						className="secondary-button min-h-[32px] sm:min-h-[32px] pointer-coarse:min-h-[44px] px-2 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)]/50 text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all"
					>
						<User className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span>Прибыл</span>
					</button>
				)}
				{a.status !== "no_show" && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStatusChange(a.id, "no_show");
						}}
						className="danger-button min-h-[32px] sm:min-h-[32px] pointer-coarse:min-h-[44px] px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-rose-500/20 cursor-pointer transition-all"
					>
						<UserX className="w-3.5 h-3.5 shrink-0" />
						<span>Неявка</span>
					</button>
				)}
			</div>
		</div>
	);
}
