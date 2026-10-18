/**
 * apps/web/src/components/billing/cashRegisterDrawer/DrawerReceiptsTab.tsx
 *
 * Fiscal receipts journal for the current shift.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import type { ShiftReceiptEntry } from "../cashRegisterDrawerData.js";

interface DrawerReceiptsTabProps {
	readonly recentReceipts: readonly ShiftReceiptEntry[];
	readonly onSelectReceipt: (rec: ShiftReceiptEntry) => void;
}

export const DrawerReceiptsTab: React.FC<DrawerReceiptsTabProps> = ({
	recentReceipts,
	onSelectReceipt,
}) => {
	return (
		<div className="space-y-2">
			<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wide block">
				Журнал фискальных чеков смены № 14
			</span>
			<div className="space-y-2">
				{recentReceipts.map((rec) => (
					<div
						key={rec.id}
						onClick={() => onSelectReceipt(rec)}
						className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-500 flex items-center justify-between text-xs cursor-pointer transition-all shadow-2xs"
					>
						<div className="space-y-1">
							<div className="font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
								<span>Чек № {rec.number}</span>
								<span className="text-teal-600 font-normal">({rec.time})</span>
							</div>
							<div className="text-slate-600 dark:text-slate-300 font-medium">
								{rec.patientName}
							</div>
							<div className="text-[11px] text-[var(--muted,#64748b)]">
								{rec.items.length} услуги • Без НДС (54-ФЗ)
							</div>
						</div>
						<div className="text-right space-y-1">
							<div className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
								{rec.totalRub.toLocaleString("ru-RU")} ₽
							</div>
							<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 inline-block">
								{rec.method === "card" ? "Терминал" : rec.method === "sbp" ? "СБП QR" : "Наличные"}
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
