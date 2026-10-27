import React, { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import { CANAL_NAME_OPTIONS } from "./endoCanalConstants";
import type { EndoCanalTableProps } from "./table/types";
import { DesktopCanalTable } from "./table/DesktopCanalTable";
import { MobileCanalsList } from "./table/MobileCanalsList";
import { MobileSealerDrawer } from "./table/MobileSealerDrawer";

export type { EndoCanalTableProps } from "./table/types";

export const EndoCanalTable: React.FC<EndoCanalTableProps> = (props) => {
	const [activeCanalForSealer, setActiveCanalForSealer] = useState<EndoCanalData | null>(null);

	return (
		<details
			className="group border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/40 shadow-xs overflow-hidden"
			open
			data-testid="endo-full-table-accordion"
		>
			<summary className="flex items-center justify-between p-3 cursor-pointer select-none bg-[var(--surface,#f8fafc)] dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
				<div className="flex items-center gap-2">
					<SlidersHorizontal size={15} className="text-[var(--teal,#0d9488)]" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white">
						Детализация каналов (для эндодонтиста)
					</span>
					<span className="text-[11px] font-medium text-[var(--muted,#64748b)]">
						({props.canals.length} {props.canals.map((c) => c.canalName).join(", ")})
					</span>
				</div>
				<ChevronDown size={15} className="text-[var(--muted,#64748b)] transition-transform duration-200 group-open:rotate-180" />
			</summary>

			<div className="p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 space-y-3">
				<datalist id="endo-canal-names-list">
					{CANAL_NAME_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</datalist>

				<DesktopCanalTable {...props} />

				<MobileCanalsList
					{...props}
					onSelectSealer={setActiveCanalForSealer}
				/>

				<MobileSealerDrawer
					activeCanalForSealer={activeCanalForSealer}
					onClose={() => setActiveCanalForSealer(null)}
					onSelectSealer={(canalId, sealer) => {
						props.handleCanalChange(canalId, "sealer", sealer);
					}}
				/>
			</div>
		</details>
	);
};
