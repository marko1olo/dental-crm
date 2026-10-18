/**
 * apps/web/src/components/billing/cashRegisterDrawer/DrawerCashOperationsTab.tsx
 *
 * Cash introduction and encashment operations.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { LogOut } from "lucide-react";

interface DrawerCashOperationsTabProps {
	readonly cashInDrawerRub: number;
	readonly onCashDeposit: (amt: number) => void;
	readonly onCashEncashment: () => void;
}

export const DrawerCashOperationsTab: React.FC<DrawerCashOperationsTabProps> = ({
	cashInDrawerRub,
	onCashDeposit,
	onCashEncashment,
}) => {
	return (
		<div className="space-y-4">
			<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-3">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
					Быстрое внесение размена в кассу:
				</span>
				<div className="grid grid-cols-3 gap-2">
					{[1000, 2000, 5000].map((amt) => (
						<button
							key={amt}
							type="button"
							onClick={() => onCashDeposit(amt)}
							className="h-10 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold cursor-pointer hover:bg-emerald-100 transition-all font-mono"
							data-testid={`btn-deposit-${amt}`}
						>
							+{amt.toLocaleString("ru-RU")} ₽
						</button>
					))}
				</div>
			</div>

			<div className="p-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] space-y-3">
				<span className="text-xs font-bold text-[var(--ink,#0f172a)] block">
					Инкассация наличных (изъятие):
				</span>
				<p className="text-xs text-[var(--muted,#64748b)] m-0">
					Текущий остаток в ящике: <strong>{cashInDrawerRub.toLocaleString("ru-RU")} ₽</strong>
				</p>
				<button
					type="button"
					onClick={onCashEncashment}
					className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-98"
					data-testid="btn-encash-all"
				>
					<LogOut size={15} />
					<span>Инкассировать всю наличность ({cashInDrawerRub.toLocaleString("ru-RU")} ₽)</span>
				</button>
			</div>
		</div>
	);
};
