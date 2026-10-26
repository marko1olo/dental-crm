/**
 * apps/web/src/components/billing/cashRegisterDrawer/DrawerShiftTelemetryTab.tsx
 *
 * Shift telemetry overview: Revenue cards, cash in drawer, X/Z reports, and recent activity.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Banknote, FileText, Lock } from "lucide-react";
import type { ShiftReceiptEntry } from "../cashRegisterDrawerData.js";

interface DrawerShiftTelemetryTabProps {
	readonly grandTotalRub: number;
	readonly cardTotalRub: number;
	readonly sbpTotalRub: number;
	readonly cashTotalRub: number;
	readonly cashInDrawerRub: number;
	readonly recentReceipts: readonly ShiftReceiptEntry[];
	readonly onSelectReceipt: (rec: ShiftReceiptEntry) => void;
	readonly onGoToAllReceipts: () => void;
	readonly onXReport: () => void;
	readonly onZReport: () => void;
}

export const DrawerShiftTelemetryTab: React.FC<DrawerShiftTelemetryTabProps> = ({
	grandTotalRub,
	cardTotalRub,
	sbpTotalRub,
	cashTotalRub,
	cashInDrawerRub,
	recentReceipts,
	onSelectReceipt,
	onGoToAllReceipts,
	onXReport,
	onZReport,
}) => {
	return (
		<div className="space-y-4">
			<div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border border-teal-500/20 space-y-3">
				<span className="text-xs font-bold text-[var(--teal-dark,#0f766e)] dark:text-teal-300 block">
					Выручка за смену ({recentReceipts.length} чеков)
				</span>
				<div className="text-2xl sm:text-3xl font-black font-mono text-[var(--ink,#0f172a)]" data-testid="shift-grand-total">
					{grandTotalRub.toLocaleString("ru-RU")} ₽
				</div>
				<div className="grid grid-cols-3 gap-2 pt-2 border-t border-teal-500/20 text-xs">
					<div className="space-y-0.5">
						<span className="text-[11px] text-[var(--muted,#64748b)] block">Карты</span>
						<strong className="font-mono text-blue-600 dark:text-blue-400">{cardTotalRub.toLocaleString("ru-RU")} ₽</strong>
					</div>
					<div className="space-y-0.5">
						<span className="text-[11px] text-[var(--muted,#64748b)] block">СБП QR</span>
						<strong className="font-mono text-teal-600 dark:text-teal-400">{sbpTotalRub.toLocaleString("ru-RU")} ₽</strong>
					</div>
					<div className="space-y-0.5">
						<span className="text-[11px] text-[var(--muted,#64748b)] block">Наличные</span>
						<strong className="font-mono text-emerald-600 dark:text-emerald-400">{cashTotalRub.toLocaleString("ru-RU")} ₽</strong>
					</div>
				</div>
			</div>

			<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<Banknote size={20} className="text-emerald-600" />
					<div>
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">В денежном ящике (нал)</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">С учетом размена на начало смены</span>
					</div>
				</div>
				<span className="text-lg font-mono font-black text-emerald-700 dark:text-emerald-400" data-testid="cash-in-drawer-amount">
					{cashInDrawerRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			<div className="space-y-2">
				<span className="text-xs font-bold text-[var(--muted,#64748b)] block">Операции кассира</span>
				<div className="grid grid-cols-2 gap-2">
					<button type="button" onClick={onXReport} className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-98" data-testid="btn-x-report">
						<FileText size={16} className="text-teal-600" />
						<span>Сверка смены (X-отчёт)</span>
					</button>
					<button type="button" onClick={onZReport} className="p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-98" data-testid="btn-z-report">
						<Lock size={16} className="text-rose-600" />
						<span>Закрыть смену (Z-отчёт)</span>
					</button>
				</div>
			</div>

			<div className="space-y-2 pt-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--muted,#64748b)]">Последние чеки смены</span>
					<button type="button" onClick={onGoToAllReceipts} className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer">Все чеки →</button>
				</div>
				<div className="space-y-1.5">
					{recentReceipts.map((rec) => (
						<div key={rec.id} onClick={() => onSelectReceipt(rec)} className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 flex items-center justify-between text-xs cursor-pointer transition-all" data-testid={`shift-receipt-item-${rec.number}`}>
							<div className="space-y-0.5">
								<div className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
									<span>Чек № {rec.number}</span>
									<span className="text-[10px] text-[var(--muted,#64748b)] font-normal">{rec.time}</span>
								</div>
								<div className="text-[11px] text-[var(--muted,#64748b)] truncate max-w-[220px]">{rec.patientName}</div>
							</div>
							<div className="text-right">
								<div className="font-mono font-bold text-slate-900 dark:text-slate-100">{rec.totalRub.toLocaleString("ru-RU")} ₽</div>
								<span className="text-[10px] font-bold text-[var(--teal-dark,#0f766e)] dark:text-teal-400">
									{rec.method === "card" ? "Карта" : rec.method === "sbp" ? "СБП" : rec.method === "deposit" ? "Депозит" : rec.method === "split" ? "Сплит" : "Наличные"}
								</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
