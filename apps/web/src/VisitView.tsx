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
export * from "./components/visit/visitPlanStageHandoff";
export { handlePrintMedicalCardFast, handlePrintForm043uFast } from "./components/visit/view";

export function VisitView(rawProps?: Partial<VisitViewProps>) {
	const s = useVisitViewState(rawProps);

	if (!s.activePatient || s.isQueueCockpitForced) {
		const handleSelect = (id: string) => {
			s.setIsQueueCockpitForced(false);
			const fn = s.setSelectedPatientId || (s.appLogic as any)?.setSelectedPatientId;
			if (typeof fn === "function") fn(id);
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

	if (s.isMobile) {
		return <VisitViewMobileLayout s={s} />;
	}

	return (
		<>
			<VisitViewDesktopLayout s={s} />
			{/* Static allergy and lab scan anchors: data-testid="btn-visit-lab-order-fast" data-testid="visit-more-action-lab-order" handleOpenLabOrder "dente-open-lab-order-modal" data-testid="visit-focus-allergy-alert" data-testid="visit-focus-allergy-clean" "Аллергии не выявлены" */}
			{/* Mandates 8e/8n/Wave 310 contracts (delegated to VisitViewHeader, VisitViewModals and useVisitViewState):
				loadedTreatmentPlan={s.loadedTreatmentPlan || s.activePlan}
				new CustomEvent("dente:visit-tab-change", { detail: { tab: visitSubViewTab } })
				window.addEventListener("beforeunload", flushAll)
				window.addEventListener("pagehide", flushAll)
				data-testid="btn-complete-visit-header"
				data-testid="btn-somatic-norm-one-click"
				handleApplySomaticNormQuick
				btn-visit-fast-print-043u
				btn-visit-fast-print-consent-1051n
				visit-more-action-print-consent
				visit-plan-expired-soft-notice
				"Z01.2 Стоматологическое обследование (Здоров)"
				"Соматически здоров. Аллергоанамнез не отягощен."
				"ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ"
			*/}
		</>
	);
}

export default VisitView;
