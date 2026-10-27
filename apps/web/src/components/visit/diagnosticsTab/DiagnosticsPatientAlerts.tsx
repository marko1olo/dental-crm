import React from "react";

export interface DiagnosticsPatientAlertsProps {
	readonly target: string;
	readonly visitPatientId: string | null;
	readonly visitPatientName: string | null;
	readonly selectedPatientName: string | null;
	readonly setSelectedPatientId: (id: string) => void;
}

export function DiagnosticsPatientAlerts({
	target,
	visitPatientId,
	visitPatientName,
	selectedPatientName,
	setSelectedPatientId,
}: DiagnosticsPatientAlertsProps) {
	if (target === "another-patient") {
		return (
			<div
				role="alert"
				aria-live="assertive"
				data-testid="visit-imaging-target-warning"
				className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-3 flex-wrap"
			>
				<div>
					<strong className="font-bold">Снимок сохранится в карту другого пациента: </strong>
					<span>
						Приём у {visitPatientName ?? "пациента приёма"}, а открыта карта{" "}
						{selectedPatientName ?? "другого человека"}.
					</span>
				</div>
				<button
					type="button"
					onClick={() => visitPatientId && setSelectedPatientId(visitPatientId)}
					className="h-7 px-3 rounded-lg text-xs font-medium border border-rose-400 bg-[var(--paper)] text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
				>
					Писать в карту {visitPatientName ?? "пациента приёма"}
				</button>
			</div>
		);
	}

	if (target === "nobody") {
		return (
			<div
				role="status"
				aria-live="polite"
				className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 flex-wrap"
			>
				<span>Карта пациента не открыта: заключение потеряется после закрытия страницы.</span>
				<button
					type="button"
					onClick={() => visitPatientId && setSelectedPatientId(visitPatientId)}
					className="secondary-button h-7 px-3 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0"
				>
					Открыть карту {visitPatientName ?? "пациента приёма"}
				</button>
			</div>
		);
	}

	if (target === "no-visit" && !visitPatientName && !selectedPatientName) {
		return (
			<div
				role="status"
				aria-live="polite"
				className="p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-soft)] text-xs text-[var(--muted)]"
			>
				Выберите пациента в расписании или картотеке для сохранения снимков и заключений в ЭМК.
			</div>
		);
	}

	return null;
}
