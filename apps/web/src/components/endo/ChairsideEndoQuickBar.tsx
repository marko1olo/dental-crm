import React from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ChairsideEndoQuickBarProps } from "./quickbar/types";
import { useChairsideQuickBarLogic } from "./quickbar/useChairsideQuickBarLogic";
import { QuickBarHeader } from "./quickbar/QuickBarHeader";
import { QuickBarCanalRow } from "./quickbar/QuickBarCanalRow";
import { QuickBarFooter } from "./quickbar/QuickBarFooter";

export * from "./quickbar/types";
export * from "./quickbar/anatomyPresets";
export * from "./quickbar/soapGenerator";

export function ChairsideEndoQuickBar(props: ChairsideEndoQuickBarProps) {
	const {
		activeTooth,
		toothAnatomicalName,
		canals,
		handleUpdateCanal,
		handleAdjustLength,
		handleToggleObliterated,
		handleAddCanal,
		handleRemoveCanal,
		handleApplyPulpitis1VisitPreset,
		handleApplyPeriodontitisBioceramicPreset,
		handleApplyCaOh2Preset,
		handleApplyAnatomicalNorm,
		handleTransferToDiary,
	} = useChairsideQuickBarLogic(props);

	return (
		<div
			className={`border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900/90 shadow-xs overflow-hidden ${props.className || ""}`}
			data-testid="chairside-endo-quickbar"
		>
			<QuickBarHeader
				activeTooth={activeTooth}
				toothState={props.toothState}
				toothAnatomicalName={toothAnatomicalName}
				onApplyPulpitis1Visit={handleApplyPulpitis1VisitPreset}
				onApplyBioceramic={handleApplyPeriodontitisBioceramicPreset}
				onApplyCaOh2={handleApplyCaOh2Preset}
				onApplyNorm={handleApplyAnatomicalNorm}
				onOpenFullModal={props.onOpenFullModal}
			/>

			<details
				className="group border-t border-[var(--line,#e2e8f0)] dark:border-slate-800"
				open
				data-testid="endo-canals-accordion"
			>
				<summary className="flex items-center justify-between p-2.5 sm:p-3 cursor-pointer select-none bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors list-none">
					<div className="flex items-center gap-2 min-w-0">
						<SlidersHorizontal size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white truncate">
							Детализация каналов (для эндодонтиста)
						</span>
						<span className="text-[11px] font-medium text-[var(--muted,#64748b)] hidden sm:inline">
							({canals.length} {canals.map((c) => c.name).join(", ")})
						</span>
					</div>
					<ChevronDown size={14} className="text-[var(--muted,#64748b)] transition-transform duration-200 group-open:rotate-180 shrink-0" />
				</summary>

				<div className="p-2.5 sm:p-3 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800/80 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/80 space-y-2.5">
					{canals.map((c) => (
						<QuickBarCanalRow
							key={c.id}
							canal={c}
							totalCanals={canals.length}
							onUpdateCanal={handleUpdateCanal}
							onAdjustLength={handleAdjustLength}
							onToggleObliterated={handleToggleObliterated}
							onRemoveCanal={handleRemoveCanal}
						/>
					))}
				</div>
			</details>

			<QuickBarFooter
				onAddCanal={handleAddCanal}
				onTransferToDiary={handleTransferToDiary}
			/>
		</div>
	);
}

export default ChairsideEndoQuickBar;
