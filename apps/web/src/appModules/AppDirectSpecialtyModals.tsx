/**
 * DENTE Dental CRM — Direct Specialty & Task Modals (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";

const ClinicalTasksPanel = lazyWithRetry(() =>
	import("../ClinicalTasksPanel").then((m) => ({ default: m.ClinicalTasksPanel })),
);
const OrthodonticPhotoProtocolModal = lazyWithRetry(() =>
	import("../components/diagnostics/OrthodonticPhotoProtocolModal").then((m) => ({ default: m.OrthodonticPhotoProtocolModal })),
);
const OrthodonticVisitProtocolWidget = lazyWithRetry(() =>
	import("../components/orthodontics/OrthodonticVisitProtocolWidget").then((m) => ({ default: m.OrthodonticVisitProtocolWidget })),
);
const ToothContextDrawer = lazyWithRetry(() =>
	import("../components/diagnostics/ToothContextDrawer").then((m) => ({ default: m.ToothContextDrawer })),
);
const Form043PrintModal = lazyWithRetry(() =>
	import("../components/emr/Form043PrintModal").then((m) => ({ default: m.Form043PrintModal })),
);

interface AppDirectSpecialtyModalsProps {
	routing: AppHashRoutingState;
	sessionAuth: AppSessionAuthState;
	appLogic: any;
}

export function AppDirectSpecialtyModals({ routing, sessionAuth, appLogic }: AppDirectSpecialtyModalsProps) {
	const { activePatient, activeVisitPatient, activeDoctor } = appLogic;
	const staffUser = sessionAuth.activeStaffUser;
	const patient = activePatient || activeVisitPatient;

	return (
		<>
			{routing.isOrthoPhotoDirectModalOpen && (
				<Suspense fallback={null}>
					<OrthodonticPhotoProtocolModal isOpen={true} onClose={() => routing.setIsOrthoPhotoDirectModalOpen(false)} patientName="Воронов Дмитрий Игоревич" patientId="pat-demo-01" doctorName="Д-р Соколов А. В." clinicName="DENTE Clinic" />
				</Suspense>
			)}
			{routing.isOrthoProtocolDirectModalOpen && (
				<Suspense fallback={null}>
					<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => routing.setIsOrthoProtocolDirectModalOpen(false)} patientName="Смирнова Екатерина Андреевна" patientId="pat-demo-ortho-01" doctorName="Д-р Соколов А. В." clinicName="DENTE Clinic" />
				</Suspense>
			)}
			{routing.isToothDrawerDirectModalOpen && (
				<Suspense fallback={null}>
					<ToothContextDrawer isOpen={true} onClose={() => routing.setIsToothDrawerDirectModalOpen(false)} toothNumber={16} toothData={{ toothNumber: 16, state: "Healthy", surfaces: ["O", "M"], mobility: 0 }} />
				</Suspense>
			)}
			{routing.isClinicalTasksOpen && (
				<Suspense fallback={null}>
					<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-in fade-in duration-150" role="dialog" aria-modal="true">
						<div className="bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] w-full max-w-4xl max-h-[90vh] rounded-2xl p-5 shadow-2xl overflow-y-auto relative">
							<button type="button" onClick={() => routing.setIsClinicalTasksOpen(false)} className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer rounded-lg hover:bg-[var(--paper-soft)] font-bold text-sm" aria-label="Закрыть">✕</button>
							<ClinicalTasksPanel patientId={routing.clinicalTasksPatientId || patient?.id || (typeof window !== "undefined" && window.location.search.includes("demo=1") ? "demo-patient-1" : null)} assignedDoctorId={activeDoctor?.id || staffUser?.id || null} />
						</div>
					</div>
				</Suspense>
			)}
			{routing.isEmrCardDirectModalOpen && (
				<Suspense fallback={null}>
					<Form043PrintModal
						isOpen={true}
						onClose={() => routing.setIsEmrCardDirectModalOpen(false)}
						initialData={{
							patient: patient || { fullName: "Смирнова Екатерина Андреевна", birthDate: "1990-05-14", id: "pat-demo-01" },
							diary: {
								complaint: "Ноющая боль в области зуба 4.6 при накусывании",
								objectiveStatus: "Зуб 4.6: глубокая кариозная полость, зондирование болезненно по дну",
								diagnosis: "K04.0 Пульпит (зуб 4.6)",
								treatmentPlan: "Анестезия, препарирование кариозной полости, пломбирование каналов",
							},
						} as any}
						isLocked={false}
						isDraft={true}
					/>
				</Suspense>
			)}
		</>
	);
}
