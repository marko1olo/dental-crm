import React from "react";
import { EndoToothSelector } from "./toolbar/EndoToothSelector";
import { EndoPrimaryPresets } from "./toolbar/EndoPrimaryPresets";
import { EndoSecondaryPresetsMenu } from "./toolbar/EndoSecondaryPresetsMenu";
import { EndoToolbarActions } from "./toolbar/EndoToolbarActions";

export interface EndoQuickToolbarProps {
	readonly activeTooth: number;
	readonly handleSwitchTooth: (newTooth: number) => void;
	readonly handleApplyExpressApicalPreset: () => void;
	readonly handleApplyCaOh2Protocol: () => void;
	readonly handleApplyPulpitisPreset: () => void;
	readonly isPresetsMenuOpen: boolean;
	readonly setIsPresetsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleApplyPrimaryEndoPreset: () => void;
	readonly handleApplyRetreatmentPreset: () => void;
	readonly handleApplyObturationPreset: () => void;
	readonly handleApplyPulpitisObturationPreset: () => void;
	readonly handleApplyPeriodontitisDestructivePreset: () => void;
	readonly handleApplyStandardProtocol: () => void;
	readonly handleResetToDefaults: () => void;
	readonly handleApplyAnatomicalLengths: () => void;
	readonly handleAddCanal: () => void;
}

export const EndoQuickToolbar: React.FC<EndoQuickToolbarProps> = ({
	activeTooth,
	handleSwitchTooth,
	handleApplyExpressApicalPreset,
	handleApplyCaOh2Protocol,
	handleApplyPulpitisPreset,
	isPresetsMenuOpen,
	setIsPresetsMenuOpen,
	handleApplyPrimaryEndoPreset,
	handleApplyRetreatmentPreset,
	handleApplyObturationPreset,
	handleApplyPulpitisObturationPreset,
	handleApplyPeriodontitisDestructivePreset,
	handleApplyStandardProtocol,
	handleResetToDefaults,
	handleApplyAnatomicalLengths,
	handleAddCanal,
}) => (
	<div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-800 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] max-h-[36px] overflow-visible shrink-0 relative">
		<div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar flex-nowrap shrink min-w-0">
			<EndoToothSelector
				activeTooth={activeTooth}
				onSwitchTooth={handleSwitchTooth}
			/>
			<EndoPrimaryPresets
				onApplyExpressApical={handleApplyExpressApicalPreset}
				onApplyCaOh2={handleApplyCaOh2Protocol}
				onApplyRetreatment={handleApplyRetreatmentPreset}
				onApplyPulpitis={handleApplyPulpitisPreset}
			/>
			<EndoSecondaryPresetsMenu
				isOpen={isPresetsMenuOpen}
				setIsOpen={setIsPresetsMenuOpen}
				onApplyPrimaryEndo={handleApplyPrimaryEndoPreset}
				onApplyRetreatment={handleApplyRetreatmentPreset}
				onApplyObturation={handleApplyObturationPreset}
				onApplyPulpitisObturation={handleApplyPulpitisObturationPreset}
				onApplyPeriodontitisDestructive={handleApplyPeriodontitisDestructivePreset}
				onApplyStandardProtocol={handleApplyStandardProtocol}
				onResetToDefaults={handleResetToDefaults}
			/>
		</div>

		<EndoToolbarActions
			onApplyAnatomicalLengths={handleApplyAnatomicalLengths}
			onAddCanal={handleAddCanal}
		/>
	</div>
);
