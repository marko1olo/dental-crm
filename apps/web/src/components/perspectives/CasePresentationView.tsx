import React, { useMemo } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { TreatmentPlanModule } from "../treatment-plans/TreatmentPlanModule";

/**
 * CasePresentationView — чистый фасад режима презентации плана лечения пациенту (2-й экран).
 * Делегирует рендер каноническому TreatmentPlanModule (Мандат 8s: Закон Единого Неделимого Авторитета).
 */
export function CasePresentationView() {
	const { dashboard } = useAppLogicContext();
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);

	const activePatient = useMemo(() => {
		if (!dashboard?.patients || dashboard.patients.length === 0) return null;
		if (selectedPatientId) {
			const found = dashboard.patients.find((p) => p.id === selectedPatientId);
			if (found) return found;
		}
		return dashboard.patients[0] ?? null;
	}, [dashboard?.patients, selectedPatientId]);

	return (
		<TreatmentPlanModule
			patientId={activePatient?.id || "anonymous"}
			patientName={activePatient?.fullName || "Пациент"}
			teethData={[]}
		/>
	);
}
