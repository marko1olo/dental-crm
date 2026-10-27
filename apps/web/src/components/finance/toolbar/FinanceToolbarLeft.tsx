import React from "react";
import type { Patient } from "@dental/shared";

export interface FinanceToolbarLeftProps {
	readonly documentPatient: Patient | null;
	readonly isCashShiftOpen: boolean;
	readonly onToggleCashShift: () => void;
	readonly isShiftOpen: boolean;
}

export function FinanceToolbarLeft({
	documentPatient,
	isCashShiftOpen,
	onToggleCashShift,
	isShiftOpen,
}: FinanceToolbarLeftProps): React.JSX.Element {
	return (
		<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
			<span className="text-xs sm:text-sm font-bold text-[var(--ink)] shrink-0 whitespace-nowrap">
				<span className="sm:hidden">Оплаты</span>
				<span className="hidden sm:inline">Оплаты и план</span>
			</span>
			<span
				className="text-[11px] sm:text-xs text-[var(--muted)] min-w-0 flex-1 truncate font-normal hidden sm:inline"
				title={documentPatient?.fullName ?? "пациент не выбран"}
			>
				· {documentPatient?.fullName ?? "пациент не выбран"}
			</span>
			<button
				type="button"
				onClick={onToggleCashShift}
				className={`inline-flex items-center gap-1.5 px-2 py-1 sm:py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 select-none ${
					isCashShiftOpen
						? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
						: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,rgba(0,0,0,0.15))]"
				}`}
				title={
					isCashShiftOpen
						? "Скрыть панель кассовой смены"
						: "Открыть управление кассовой сменой"
				}
				aria-expanded={isCashShiftOpen}
				data-testid="btn-toggle-cash-shift"
			>
				<span
					className={`w-1.5 h-1.5 rounded-full shrink-0 ${
						isShiftOpen ? "bg-emerald-500" : "bg-rose-500"
					}`}
				/>
				<span className="sm:hidden">Касса</span>
				<span className="hidden sm:inline">Касса онлайн</span>
			</button>
		</div>
	);
}
