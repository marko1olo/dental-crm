import React from "react";
import type { EndoCanalTableProps } from "./types";
import { DesktopCanalRow } from "./DesktopCanalRow";

export const DesktopCanalTable: React.FC<EndoCanalTableProps> = ({
	canals,
	suggestedCanalNames,
	stageStamp,
	handleCanalChange,
	handleAdjustCanalLength,
	handleCanalLengthInputChange,
	handleSetCanalLength,
	handleRemoveCanal,
	renderIsoColorBadge,
	handleToggleCanalObliteration,
}) => (
	<div className="hidden md:block border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-[var(--paper,#ffffff)] dark:bg-slate-900/60">
		<div className="overflow-x-auto">
			<table className="w-full text-left border-collapse text-xs">
				<thead className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 text-[var(--muted,#64748b)] text-[11px] font-bold border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<tr>
						<th className="py-2 px-3 truncate min-w-0">Канал</th>
						<th className="py-2 px-3 truncate min-w-0">Ориентир</th>
						<th className="py-2 px-3 min-w-[200px] truncate">
							Рабочая длина (WL, мм)
						</th>
						<th className="py-2 px-3 truncate min-w-0">Мастер-файл (MAF)</th>
						<th className="py-2 px-3 truncate min-w-0">Конусность</th>
						<th className="py-2 px-3 truncate min-w-0">Метод обтурации</th>
						<th className="py-2 px-3 truncate min-w-0">Силер</th>
						<th className="py-2 px-2 text-center w-10" />
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/60">
					{canals.map((c, index) => (
						<DesktopCanalRow
							key={c.id}
							canal={c}
							index={index}
							suggestedCanalNames={suggestedCanalNames}
							stageStamp={stageStamp}
							handleCanalChange={handleCanalChange}
							handleAdjustCanalLength={handleAdjustCanalLength}
							handleCanalLengthInputChange={handleCanalLengthInputChange}
							handleSetCanalLength={handleSetCanalLength}
							handleRemoveCanal={handleRemoveCanal}
							renderIsoColorBadge={renderIsoColorBadge}
							handleToggleCanalObliteration={handleToggleCanalObliteration}
						/>
					))}
				</tbody>
			</table>
		</div>
	</div>
);
