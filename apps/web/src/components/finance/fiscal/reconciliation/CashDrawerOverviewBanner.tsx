/**
 * CashDrawerOverviewBanner.tsx — Expected Cash in Drawer Overview Banner.
 */

import React from "react";
import { Banknote } from "lucide-react";

export interface CashDrawerOverviewBannerProps {
	readonly shiftNumber: number;
	readonly expectedCashRub: number;
}

export const CashDrawerOverviewBanner: React.FC<CashDrawerOverviewBannerProps> = ({
	shiftNumber,
	expectedCashRub,
}) => (
	<div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
		<div className="flex items-center gap-3">
			<div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
				<Banknote className="w-5 h-5" />
			</div>
			<div>
				<h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100 m-0">
					Расчетный остаток наличных в кассовом ящике
				</h4>
				<p className="text-xs text-[var(--muted)] m-0">
					По данным кассовых операций за смену №{shiftNumber}
				</p>
			</div>
		</div>
		<div className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
			{expectedCashRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
		</div>
	</div>
);
