import type React from "react";
import { Tooth16Container } from "./Tooth16Container";
import { Tooth16PresetStrip } from "./Tooth16PresetStrip";
import { Tooth16ProstheticBar } from "./Tooth16ProstheticBar";
import { Tooth16StandHeader } from "./Tooth16StandHeader";
import { Tooth16StandHud } from "./Tooth16StandHud";
import { Tooth16StandToggles } from "./Tooth16StandToggles";
import { useTooth16StandState } from "./useTooth16StandState";

/**
 * DENTE Dental CRM — Master Clinical Inspection Stand for Upper Molars 16 / 26 (Gate 1)
 * Mandate 8b <= 120 lines.
 */
export const Tooth16InspectionStand: React.FC = () => {
	const s = useTooth16StandState();

	return (
		<div
			data-testid="tooth-16-gate1-stand"
			className="min-h-screen w-full p-2.5 sm:p-4 flex flex-col items-center select-none overflow-x-clip max-w-[100vw] bg-[var(--paper)] text-[var(--ink)]"
		>
			<Tooth16StandHeader
				toothNumber={s.toothNumber}
				onToothNumberChange={s.handleToothChange}
				zoom={s.zoom}
				onZoomChange={s.setZoom}
				isDark={s.isDark}
				onToggleTheme={() => s.setIsDark((d) => !d)}
			/>
			<div className="w-full max-w-5xl flex flex-col gap-1.5 py-2">
				<Tooth16PresetStrip
					activePreset={s.activePreset}
					onApplyPreset={s.applyPreset}
				/>
				<Tooth16ProstheticBar
					crownMaterial={s.layers.crownMaterial ?? "zirconia"}
					onCrownMaterialChange={s.setCrownMaterial}
					crownCondition={s.layers.crownCondition ?? "adequate"}
					onCrownConditionChange={s.setCrownCondition}
					isCrownActive={Boolean(s.layers.zirconiaCrown)}
					onToggleCrownActive={s.toggleCrown}
					compositeCondition={s.layers.compositeCondition ?? "adequate"}
					isCompositeActive={Boolean(s.layers.composite)}
					onToggleCompositeCondition={s.toggleComposite}
				/>
				<Tooth16StandToggles layers={s.layers} onToggle={s.toggleLayer} />
			</div>
			<main className="flex-1 w-full max-w-5xl rounded-2xl border border-[var(--line)] p-3 sm:p-6 flex flex-col items-center justify-center relative overflow-auto min-h-[420px]">
				<Tooth16StandHud
					toothNumber={s.toothNumber}
					zoom={s.zoom}
					activePresetTitle={s.presetTitle}
					isDark={s.isDark}
				/>
				<div className="p-4 sm:p-8 pt-8 pb-40 transition-transform duration-200">
					<Tooth16Container
						toothNumber={s.toothNumber}
						isDark={s.isDark}
						zoom={s.zoom}
						layers={s.layers}
					/>
				</div>
			</main>
		</div>
	);
};
