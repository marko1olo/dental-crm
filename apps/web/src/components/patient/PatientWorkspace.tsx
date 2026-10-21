/**
 * apps/web/src/components/patient/PatientWorkspace.tsx
 *
 * Главная медицинская рабочая область пациента (PatientWorkspace / PatientWorkspaceView).
 * Канонический экспорт для путей модулей в единственном числе (components/patient/PatientWorkspace).
 * Мандат 8za (Anti-Duplicates SSOT) и Мандат 8e (Автономия врача).
 */
import {
	PatientWorkspaceView,
	type PatientWorkspaceViewProps,
} from "../patients/PatientWorkspaceView";

export type { PatientWorkspaceViewProps };
export { PatientWorkspaceView, PatientWorkspaceView as PatientWorkspace };
export default PatientWorkspaceView;
