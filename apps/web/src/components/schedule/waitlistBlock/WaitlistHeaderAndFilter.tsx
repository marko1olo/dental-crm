/**
 * Шапка и элементы управления блока подбора кандидатов листа ожидания.
 */
import React from "react";
import type { WaitlistMatchReport } from "./waitlistTypes";

export type WaitlistHeaderAndFilterProps = {
	compact: boolean;
	loading: boolean;
	report: WaitlistMatchReport | null;
	onRefresh: () => void;
};

export const WaitlistHeaderAndFilter: React.FC<WaitlistHeaderAndFilterProps> = ({
	compact,
	loading,
	report,
	onRefresh,
}) => {
	const matchesCount = (report?.matches ?? []).length;

	if (compact) {
		return (
			<div className="flex items-center justify-between gap-2 mb-2 min-w-0">
				<div className="flex items-center gap-2 min-w-0">
					<strong className="text-xs uppercase tracking-wider text-[var(--muted)] font-semibold truncate">
						Лист ожидания · кому звонить
					</strong>
					{report && (
						<span
							className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
								matchesCount > 0
									? "bg-[var(--teal-soft,#0d948815)] text-[var(--teal,#0d9488)]"
									: "bg-[var(--paper-soft)] text-[var(--muted)]"
							}`}
						>
							{matchesCount}
						</span>
					)}
				</div>
				<button
					type="button"
					className="link-button text-xs font-medium shrink-0 min-h-[36px] pointer-coarse:min-h-[44px] px-2 text-[var(--teal,#0d9488)] hover:underline"
					data-testid="waitlist-matches-refresh"
					onClick={() => {
						if (!loading) onRefresh();
					}}
					aria-busy={loading || undefined}
				>
					{loading ? "Обновляю…" : "Обновить"}
				</button>
			</div>
		);
	}

	return (
		<div className="panel-heading flex items-center justify-between gap-2 mb-3">
			<h3 className="m-0 text-sm font-bold text-[var(--ink)]">
				Кому предложить это окно
			</h3>
			{report && (
				<span
					className={`status-pill ${
						matchesCount > 0 ? "status-arrived" : "status-planned"
					}`}
				>
					{matchesCount}
				</span>
			)}
		</div>
	);
};
