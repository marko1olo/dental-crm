import React, { useState } from "react";
import type { OrthopedicsZtlSelectorsProps } from "./selectors/orthopedicsSelectorsTypes.js";
import { ZtlPresetsGrid } from "./selectors/ZtlPresetsGrid.js";
import { ZtlPrepMarginSelector } from "./selectors/ZtlPrepMarginSelector.js";
import { ZtlFixationSelector } from "./selectors/ZtlFixationSelector.js";
import { ZtlManufacturingStageTracker } from "./selectors/ZtlManufacturingStageTracker.js";
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
	cementBrand,
	onSelectCementBrand,
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
	guidanceType,
	onSelectGuidanceType,
	sagittalCondylarAngleDeg,
	onChangeSagittalAngle,
	bennettAngleDeg,
	onChangeBennettAngle,
}: OrthopedicsZtlSelectorsProps) {
	const [internalFixation, setInternalFixation] = useState<"cement" | "screw" | "clasp">(fixationType);
	const [internalCementBrand, setInternalCementBrand] = useState<string>("relyx_u200");
	const [internalAntagonists, setInternalAntagonists] = useState<boolean>(hasAntagonists);
	const [internalArticulator, setInternalArticulator] = useState<"bio_art" | "kavo_protar" | "average_anatomical">("bio_art");
	const [internalFacebow, setInternalFacebow] = useState<boolean>(false);
	const [internalGuidance, setInternalGuidance] = useState<"canine_guidance" | "group_function" | "mutually_protected" | "balanced_articulation">("canine_guidance");
	const [internalSagittal, setInternalSagittal] = useState<number>(33);
	const [internalBennett, setInternalBennett] = useState<number>(15);

	const activeFixation = fixationType ?? internalFixation;
	const activeCementBrand = cementBrand ?? internalCementBrand;
	const activeAntagonists = hasAntagonists ?? internalAntagonists;
	const activeArticulator = articulatorType ?? internalArticulator;
	const activeFacebow = hasFacebow ?? internalFacebow;
	const activeGuidance = guidanceType ?? internalGuidance;
	const activeSagittal = sagittalCondylarAngleDeg ?? internalSagittal;
	const activeBennett = bennettAngleDeg ?? internalBennett;

	return (
		<>
			<ZtlPresetsGrid activeZtlPresetId={activeZtlPresetId} onSelectZtlPreset={onSelectZtlPreset} />
			<ZtlPrepMarginSelector preparationMargin={preparationMargin} onSelectPreparationMargin={onSelectPreparationMargin} />
			<ZtlFixationSelector
				fixationType={activeFixation}
				onSelectFixationType={(type) => { setInternalFixation(type); onSelectFixationType?.(type); }}
				cementBrand={activeCementBrand}
				onSelectCementBrand={(b) => { setInternalCementBrand(b); onSelectCementBrand?.(b); }}
				hasAntagonists={activeAntagonists}
				onToggleAntagonists={(checked) => { setInternalAntagonists(checked); onToggleAntagonists?.(checked); }}
			/>
			<ZtlManufacturingStageTracker selectedStageId={selectedStageId} onSelectStage={onSelectStage} />
			<ZtlOcclusionDrawer
				activeArticulator={activeArticulator}
				onSelectArticulator={(type) => { setInternalArticulator(type); onSelectArticulatorType?.(type); }}
				activeFacebow={activeFacebow}
				onToggleFacebow={(checked) => { setInternalFacebow(checked); onToggleFacebow?.(checked); }}
				guidanceType={activeGuidance}
				onChangeGuidanceType={(g) => { setInternalGuidance(g); onSelectGuidanceType?.(g); }}
				sagittalCondylarAngleDeg={activeSagittal}
				onChangeSagittalAngle={(s) => { setInternalSagittal(s); onChangeSagittalAngle?.(s); }}
				bennettAngleDeg={activeBennett}
				onChangeBennettAngle={(b) => { setInternalBennett(b); onChangeBennettAngle?.(b); }}
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
