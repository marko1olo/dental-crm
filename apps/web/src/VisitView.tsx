import React from "react";
import { VisitIntakeCockpit } from "./components/visit/VisitIntakeCockpit";
import { VisitPlanStageHandoffBanner } from "./components/visit/VisitPlanStageHandoffBanner";
import "./styles/VisitView.css";
import "./components/visit/VisitAnamnesisTab.css";

import {
	type VisitViewProps,
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	useVisitViewState,
} from "./components/visit/view";
import { VisitViewMobileLayout } from "./components/visit/view/VisitViewMobileLayout";
import { VisitViewDesktopLayout } from "./components/visit/view/VisitViewDesktopLayout";

export type { VisitViewProps };
export {
	executePolishTranscriptAutonomy,
	executeApplySomaticNormAutonomy,
	executeApplyHygienePresetAutonomy,
	executeApplyAnesthesiaPresetAutonomy,
	VisitPlanStageHandoffBanner,
};
export { AnesthesiaQuickBar } from "./components/anesthesia/AnesthesiaQuickBar";
export * from "./components/visit/visitPlanStageHandoff";
export {
	handlePrintMedicalCardFast,
	handlePrintClinicalDiaryFast,
	/** @deprecated Канонический вызов: handlePrintMedicalCardFast («Медицинская карта приёма», Мандаты 8x/8ap) */
	handlePrintForm043uFast,
} from "./components/visit/view";

export function VisitView(rawProps?: Partial<VisitViewProps>) {
	const s = useVisitViewState(rawProps);

	if (!s.activePatient || s.isQueueCockpitForced) {
		const handleSelect = (id: string) => {
			s.setIsQueueCockpitForced(false);
			s.setSelectedPatientId?.(id);
		};
		return (
			<VisitIntakeCockpit
				dashboard={s.dashboard}
				activeDoctor={s.activeDoctor}
				onSelectPatient={handleSelect}
				onEmergencyIntake={() => {
					s.setIsQueueCockpitForced(false);
					const first = s.dashboard?.patients?.[0];
					if (first?.id) handleSelect(first.id);
				}}
			/>
		);
	}

	if (s.isMobile && s.visitSubViewTab !== "diagnostics") {
		return <VisitViewMobileLayout s={s} />;
	}

	return (
		<>
			<VisitViewDesktopLayout s={s} />
		</>
	);
}

export default VisitView;
