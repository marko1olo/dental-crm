import type React from "react";
import { ClinicalDiaryAndVoiceButtons } from "./ClinicalDiaryAndVoiceButtons";
import { ClinicalExamButtons } from "./ClinicalExamButtons";
import { ClinicalPlanningButtons } from "./ClinicalPlanningButtons";
import {
	MoreMenuAiAnalysisModules,
	type MoreMenuAiAnalysisModulesProps,
} from "./MoreMenuAiAnalysisModules";

export interface MoreMenuClinicalModulesProps
	extends MoreMenuAiAnalysisModulesProps {
	readonly onSyncAllToDiary?: (() => void) | undefined;
	readonly onOpenVoiceDictation?: (() => void) | undefined;
	readonly toggleVoiceEngine: () => void;
	readonly isVoiceListening: boolean;
	readonly onOneClickLabOrder?: ((teeth: number[]) => void) | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly isPediatricEffective: boolean;
	readonly setContextDrawerTooth: (tooth: number) => void;
	readonly setIsPlanWizardOpen: (open: boolean) => void;
	readonly onToggleEstimator?: (() => void) | undefined;
	readonly isEstimatorOpen?: boolean | undefined;
	readonly onTogglePerio?: (() => void) | undefined;
	readonly isPerioOpen?: boolean | undefined;
}

export const MoreMenuClinicalModules: React.FC<MoreMenuClinicalModulesProps> = (
	props,
) => {
	return (
		<div>
			<div className="text-[11px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
				Клинические модули
			</div>
			<div className="flex flex-col gap-1">
				<ClinicalDiaryAndVoiceButtons
					onSyncAllToDiary={props.onSyncAllToDiary}
					onOpenVoiceDictation={props.onOpenVoiceDictation}
					toggleVoiceEngine={props.toggleVoiceEngine}
					isVoiceListening={props.isVoiceListening}
					onCloseMenu={props.onCloseMenu}
				/>
				<ClinicalPlanningButtons
					onOneClickLabOrder={props.onOneClickLabOrder}
					selectedTeeth={props.selectedTeeth}
					setIsPlanWizardOpen={props.setIsPlanWizardOpen}
					onToggleEstimator={props.onToggleEstimator}
					isEstimatorOpen={props.isEstimatorOpen}
					onCloseMenu={props.onCloseMenu}
				/>
				<ClinicalExamButtons
					onTogglePerio={props.onTogglePerio}
					isPerioOpen={props.isPerioOpen}
					selectedTeeth={props.selectedTeeth}
					isPediatricEffective={props.isPediatricEffective}
					setContextDrawerTooth={props.setContextDrawerTooth}
					onCloseMenu={props.onCloseMenu}
				/>
				<MoreMenuAiAnalysisModules {...props} />
			</div>
		</div>
	);
};
