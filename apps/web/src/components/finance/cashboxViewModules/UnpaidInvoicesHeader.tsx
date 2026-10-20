import type React from "react";
import { Clock, RotateCw, User } from "lucide-react";

export interface UnpaidInvoicesHeaderProps {
	readonly count: number;
	readonly currentPatientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly filterCurrentPatient: boolean;
	readonly onToggleFilterCurrentPatient: () => void;
	readonly onRefresh: () => void;
	readonly isLoading: boolean;
}

export function UnpaidInvoicesHeader({
	count,
	currentPatientId,
	currentPatientName,
	filterCurrentPatient,
	onToggleFilterCurrentPatient,
	onRefresh,
	isLoading,
}: UnpaidInvoicesHeaderProps): React.JSX.Element {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
					<Clock className="w-4 h-4" />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h3 className="text-sm font-semibold text-[var(--ink)]">Очередь счетов к оплате</h3>
						<span data-testid="unpaid-invoices-count-badge" className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
							{count}
						</span>
					</div>
					<p className="text-xs text-[var(--muted)]">Автоматически поступают из утвержденных планов лечения</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{currentPatientId && (
					<button
						type="button"
						onClick={onToggleFilterCurrentPatient}
						className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 min-h-[36px] ${
							filterCurrentPatient ? "bg-[var(--primary)] text-[var(--paper)] border-[var(--primary)]" : "bg-[var(--surface,var(--paper))] text-[var(--ink)] border-[var(--line)]"
						}`}
						title={currentPatientName ? `Только ${currentPatientName}` : "Фильтр по текущему пациенту"}
					>
						<User className="w-3.5 h-3.5" />
						<span>{filterCurrentPatient ? "Все счета" : "Текущий пациент"}</span>
					</button>
				)}
				<button
					type="button"
					onClick={onRefresh}
					disabled={isLoading}
					className="p-2 rounded-lg border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line-subtle)] disabled:opacity-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
					title="Обновить очередь счетов"
					aria-label="Обновить очередь счетов"
				>
					<RotateCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
				</button>
			</div>
		</div>
	);
}
