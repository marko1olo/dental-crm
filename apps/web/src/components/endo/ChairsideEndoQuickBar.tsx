import React from "react";
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

			<div className="p-2.5 sm:p-3 divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800/80 space-y-2.5">
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

			<QuickBarFooter
				onAddCanal={handleAddCanal}
				onTransferToDiary={handleTransferToDiary}
			/>
		</div>
	);
}

export default ChairsideEndoQuickBar;

