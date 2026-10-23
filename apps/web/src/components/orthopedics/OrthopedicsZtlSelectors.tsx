import React, { useState } from "react";
import type { OrthopedicsZtlSelectorsProps } from "./selectors/orthopedicsSelectorsTypes.js";
import { ZtlPresetsGrid } from "./selectors/ZtlPresetsGrid.js";
import { ZtlPrepMarginSelector } from "./selectors/ZtlPrepMarginSelector.js";
import { ZtlFixationSelector } from "./selectors/ZtlFixationSelector.js";
import { ZtlManufacturingStageTracker } from "./selectors/ZtlManufacturingStageTracker.js";
import { ZtlStumpShadeSelector } from "./selectors/ZtlStumpShadeSelector.js";
import { ZtlSoloEconomicsCard } from "./selectors/ZtlSoloEconomicsCard.js";
import { ZtlOcclusionDrawer } from "./selectors/ZtlOcclusionDrawer.js";

export type { OrthopedicsZtlSelectorsProps };

export function OrthopedicsZtlSelectors({
	activeZtlPresetId,
	onSelectZtlPreset,
	preparationMargin,
	onSelectPreparationMargin,
	selectedStageId,
	onSelectStage,
	stumpShade = "ND2",
	onSelectStumpShade,
	fixationType = "cement",
	onSelectFixationType,
	hasAntagonists = true,
	onToggleAntagonists,
	grossPriceRub = 24000,
	ztlCostRub = 7500,
	materialsCostRub = 1200,
	netMarginRub = 15300,
	marginPercent = 64,
	dueDate,
	onChangeDueDate,
	articulatorType,
	onSelectArticulatorType,
	hasFacebow,
	onToggleFacebow,
}: OrthopedicsZtlSelectorsProps) {
	const [internalFixation, setInternalFixation] = useState<"cement" | "screw" | "clasp">(fixationType);
	const [internalAntagonists, setInternalAntagonists] = useState<boolean>(hasAntagonists);
	const [internalArticulator, setInternalArticulator] = useState<"bio_art" | "kavo_protar" | "average_anatomical">("bio_art");
	const [internalFacebow, setInternalFacebow] = useState<boolean>(false);

	const activeFixation = fixationType ?? internalFixation;
	const activeAntagonists = hasAntagonists ?? internalAntagonists;
	const activeArticulator = articulatorType ?? internalArticulator;
	const activeFacebow = hasFacebow ?? internalFacebow;

	return (
		<>
			<ZtlPresetsGrid activeZtlPresetId={activeZtlPresetId} onSelectZtlPreset={onSelectZtlPreset} />
			<ZtlPrepMarginSelector preparationMargin={preparationMargin} onSelectPreparationMargin={onSelectPreparationMargin} />
			<ZtlFixationSelector
				fixationType={activeFixation}
				onSelectFixationType={(type) => { setInternalFixation(type); onSelectFixationType?.(type); }}
				hasAntagonists={activeAntagonists}
				onToggleAntagonists={(checked) => { setInternalAntagonists(checked); onToggleAntagonists?.(checked); }}
			/>
			<ZtlManufacturingStageTracker selectedStageId={selectedStageId} onSelectStage={onSelectStage} />
			<ZtlStumpShadeSelector stumpShade={stumpShade} onSelectStumpShade={onSelectStumpShade} />
			<ZtlOcclusionDrawer
				activeArticulator={activeArticulator}
				onSelectArticulator={(type) => { setInternalArticulator(type); onSelectArticulatorType?.(type); }}
				activeFacebow={activeFacebow}
				onToggleFacebow={(checked) => { setInternalFacebow(checked); onToggleFacebow?.(checked); }}
			/>
			<ZtlSoloEconomicsCard
				grossPriceRub={grossPriceRub}
				ztlCostRub={ztlCostRub}
				materialsCostRub={materialsCostRub}
				netMarginRub={netMarginRub}
				marginPercent={marginPercent}
				dueDate={dueDate}
			/>
		</>
	);
}
