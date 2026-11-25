import React, { useEffect, useRef } from "react";
import { useVisitStore } from "./store/visitStore";
import { useCopilotStore } from "./store/copilotStore";
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
	const autoMicTriggeredVisitRef = useRef<string | null>(null);

	// Zero-Leak Draft (Мандаты 8zq/8bn): очистка черновика визита при unmount
	useEffect(() => {
		return () => {
			useVisitStore.getState().resetDraft();
		};
	}, []);

	// Автоматический старт микрофона при открытии приёма согласно настройке Копайлота
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!s.activePatient || s.isQueueCockpitForced) return;
		const visitKey = s.activeAppointment?.id || s.activePatient.id;
		if (!visitKey || autoMicTriggeredVisitRef.current === visitKey) return;
		if (!useCopilotStore.getState().settings.autoMicOnAppointmentOpen) return;
		autoMicTriggeredVisitRef.current = visitKey;
		window.dispatchEvent(
			new CustomEvent("dente:open-voice-dictation", {
				detail: { source: "auto_mic_appointment", visitKey },
			}),
		);
	}, [s.activePatient, s.activeAppointment?.id, s.isQueueCockpitForced]);

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

	if (s.isMobile) {
		return <VisitViewMobileLayout s={s} />;
	}

	return (
		<>
			<VisitViewDesktopLayout s={s} />
		</>
	);
}

export default VisitView;
