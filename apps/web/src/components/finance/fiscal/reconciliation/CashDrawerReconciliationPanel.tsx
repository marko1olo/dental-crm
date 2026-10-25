/**
 * CashDrawerReconciliationPanel.tsx — 1-Click Cash Drawer Matcher & Soft Discrepancy Panel.
 * Mandate 8e: Doctor & Cashier Autonomy (0 disabled buttons, soft discrepancy explanation).
 * Mandate 8k: No denomination counting simulator.
 */

import React, { useState } from "react";
import { AlertTriangle, Check, CheckCircle2 } from "lucide-react";
import type { CashDrawerReconciliationPanelProps } from "./types";
import { CashDrawerOverviewBanner } from "./CashDrawerOverviewBanner";

export const CashDrawerReconciliationPanel: React.FC<CashDrawerReconciliationPanelProps> = ({
	shiftNumber,
	expectedCashRub,
	countedCashInput,
	onCountedCashChange,
	differenceRub,
	onMatchClick,
	variant = "standard",
	inputTestId,
}) => {
	const [discrepancyNote, setDiscrepancyNote] = useState("");
	const resolvedInputTestId =
		inputTestId || (variant === "zreport" ? "input-drawer-actual-cash" : "input-actual-drawer-cash");

	const matchTestId = variant === "zreport" ? "msg-reconciliation-match" : "msg-drawer-match";
	const surplusTestId = variant === "zreport" ? "msg-reconciliation-surplus" : "msg-drawer-surplus";
	const deficitTestId = variant === "zreport" ? "msg-reconciliation-deficit" : "msg-drawer-deficit";

	return (
		<div className="space-y-4">
			<CashDrawerOverviewBanner shiftNumber={shiftNumber} expectedCashRub={expectedCashRub} />

			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3.5">
				<div>
					<label htmlFor="cash-drawer-actual-input" className="block text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-1">
						Фактическая сумма наличных в ящике (₽):
					</label>
					<div className="flex items-center gap-2 flex-wrap">
						<input
							id="cash-drawer-actual-input"
							type="text"
							inputMode="decimal"
							value={countedCashInput}
							onChange={(e) => onCountedCashChange(e.target.value)}
							placeholder={expectedCashRub.toString()}
							className="min-h-[44px] px-3.5 py-2 font-mono text-sm font-bold bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none w-56"
							data-testid={resolvedInputTestId}
						/>
						<button
							type="button"
							onClick={onMatchClick}
							className="min-h-[44px] px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
							title="Подставить расчетную сумму кассы"
							data-testid="btn-match-drawer-cash"
						>
							<Check size={14} className="text-emerald-600 shrink-0" />
							<span>Совпадает с кассой ({expectedCashRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
					</div>
				</div>

				<div>
					{differenceRub === null ? (
						<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
							<span>Введите сумму в денежном ящике или нажмите «Совпадает с кассой»</span>
						</div>
					) : differenceRub === 0 ? (
						<div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2" data-testid={matchTestId}>
							<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>Сверка успешна: сумма в ящике сходится копейка в копейку с данными кассы ({expectedCashRub.toLocaleString("ru-RU")} ₽)</span>
						</div>
					) : (
						<div className="space-y-2">
							<div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${differenceRub > 0 ? "bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-teal-300" : "bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300"}`} data-testid={differenceRub > 0 ? surplusTestId : deficitTestId}>
								<AlertTriangle className={`w-4 h-4 shrink-0 ${differenceRub > 0 ? "text-teal-600" : "text-rose-600"}`} />
								<span>
									{differenceRub > 0 ? `Обнаружен излишек в ящике: +${differenceRub.toLocaleString("ru-RU")} ₽` : `Обнаружена недостача в ящике: −${Math.abs(differenceRub).toLocaleString("ru-RU")} ₽`}
									{variant === "zreport" ? (differenceRub > 0 ? " (проверьте неотмеченные операции)" : " (проверьте сдачи и возвраты)") : ""}
								</span>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<input type="text" value={discrepancyNote} onChange={(e) => setDiscrepancyNote(e.target.value)} placeholder="Пояснение расхождения (например: разменная монета)" className="text-xs px-3 py-1.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] flex-1 min-w-[200px]" />
								<button type="button" onClick={() => setDiscrepancyNote("Разменная монета")} className="text-[11px] px-2 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">Размен</button>
								<button type="button" onClick={() => setDiscrepancyNote("Округление сдачи")} className="text-[11px] px-2 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer">Округление</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
