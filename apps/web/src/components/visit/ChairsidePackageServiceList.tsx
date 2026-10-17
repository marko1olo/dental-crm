/**
 * ChairsidePackageServiceList.tsx
 * Service items checklist with toggle checkboxes and prices.
 */

import React from "react";
import { money } from "../../AppHelpers";

interface ServiceItem {
	code804n: string;
	title: string;
	priceRub: number;
	checked: boolean;
}

interface ChairsidePackageServiceListProps {
	items: readonly ServiceItem[];
	onToggleCode: (code804n: string) => void;
}

export const ChairsidePackageServiceList: React.FC<ChairsidePackageServiceListProps> = ({
	items,
	onToggleCode,
}) => {
	return (
		<div className="space-y-1 mb-3 bg-white/90 dark:bg-slate-900/90 rounded-lg p-2 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60">
			{items.map((svc) => (
				<label
					key={svc.code804n}
					className="flex items-center justify-between gap-2.5 py-1.5 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer select-none min-h-[36px]"
				>
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<input
							type="checkbox"
							checked={svc.checked}
							onChange={() => onToggleCode(svc.code804n)}
							className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 shrink-0"
						/>
						<span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
							[{svc.code804n}]
						</span>
						<span
							className={`text-xs ${
								svc.checked
									? "text-slate-900 dark:text-slate-100 font-medium"
									: "text-slate-400 dark:text-slate-500 line-through"
							} truncate`}
						>
							{svc.title}
						</span>
					</div>
					<span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-200 shrink-0">
						{money(svc.priceRub)}
					</span>
				</label>
			))}
		</div>
	);
};
