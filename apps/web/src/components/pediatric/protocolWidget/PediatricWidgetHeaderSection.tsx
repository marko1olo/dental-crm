import React from "react";
import { showToast } from "../../GlobalToast";
import { PEDIATRIC_TEETH_NAMES } from "./constants";
import { PediatricBehaviorCard } from "./PediatricBehaviorCard";
import { PediatricPrimaryTeethCard } from "./PediatricPrimaryTeethCard";
import { PediatricProtocolTopBar } from "./PediatricProtocolToolbar";
import { PediatricSedationProtocol } from "./PediatricSedationProtocol";
import type { VisitPediatricProtocolWidgetProps } from "./types";
import type { usePediatricWidgetActions } from "./usePediatricWidgetActions";
import type { usePediatricWidgetState } from "./usePediatricWidgetState";

interface PediatricWidgetHeaderSectionProps {
	readonly state: ReturnType<typeof usePediatricWidgetState>;
	readonly actions: ReturnType<typeof usePediatricWidgetActions>;
	readonly props: VisitPediatricProtocolWidgetProps;
}

export const PediatricWidgetHeaderSection: React.FC<PediatricWidgetHeaderSectionProps> = ({
	state,
	actions,
	props,
}) => {
	return (
		<>
			<PediatricProtocolTopBar
				currentTooth={state.currentTooth}
				anatomicalToothName={state.anatomicalToothName}
				activeFrankl={state.activeFrankl}
				showDetailsAccordion={state.showDetailsAccordion}
				onApplyPhysiologicalNorm={actions.handleApplyPhysiologicalNorm}
				onApplyAdaptationVisit={actions.handleApplyAdaptationVisit}
				onOpenDiplomaModal={() => state.setIsDiplomaModalOpen(true)}
				onCycleFrankl={actions.handleCycleFrankl}
				onToggleDetailsAccordion={() => state.setShowDetailsAccordion((p) => !p)}
			/>

			<PediatricBehaviorCard
				franklRating={state.franklRating}
				activeFrankl={state.activeFrankl}
				onSelectFrankl={actions.handleSelectFrankl}
			/>

			<PediatricPrimaryTeethCard
				currentTooth={state.currentTooth}
				onSelectTooth={(t) => {
					state.setCurrentTooth(t);
					props.onSelectActiveTooth?.(t);
					showToast(`Выбран зуб #${t} (${PEDIATRIC_TEETH_NAMES[t] ?? t})`, "info", 1500);
				}}
				dentitionMode={state.dentitionMode}
				onModeChange={state.setDentitionMode}
				toothFindings={state.toothFindings}
				resorptionStages={state.resorptionStages}
				onResorptionChange={(t, stage) => {
					state.setResorptionStages((prev) => ({ ...prev, [t]: stage }));
					showToast(`Зуб ${t}: стадия резорбции корня ${stage}%`, "info", 1500);
				}}
				onToothFindingChange={(t, finding) => {
					state.setToothFindings((prev) => ({ ...prev, [t]: finding }));
					showToast(`Зуб ${t}: статус изменен на «${finding}»`, "info", 1500);
				}}
				onSetAllHealthy={() => {
					state.setToothFindings({});
					state.setResorptionStages({});
					showToast("Все молочные зубы отмечены как интактные", "success", 2000);
				}}
				onApplyMixedDentitionPreset={actions.handleApplyMixedDentitionPreset}
				orthoFrenulumNormal={state.orthoFrenulumNormal}
				setOrthoFrenulumNormal={state.setOrthoFrenulumNormal}
				orthoNasalBreathing={state.orthoNasalBreathing}
				setOrthoNasalBreathing={state.setOrthoNasalBreathing}
				orthoNoHarmfulHabits={state.orthoNoHarmfulHabits}
				setOrthoNoHarmfulHabits={state.setOrthoNoHarmfulHabits}
			/>

			<PediatricSedationProtocol sedation={state.sedation} onSedationChange={state.setSedation} />
		</>
	);
};
