/**
 * DENTE Dental CRM — Direct Specialty & Task Modals (Layer 4)
 * Mandate 8b (Layer 4 UI Subcomponents), Mandate 8e (Doctor Autonomy).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../lib/lazyWithRetry";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { showToast } from "../components/GlobalToast";
import { useVisitStore } from "../store/visitStore";
import type { AppHashRoutingState, AppSessionAuthState } from "./appStateTypes";

const ClinicalTasksPanel = lazyWithRetry(() =>
	import("../ClinicalTasksPanel").then((m) => ({ default: m.ClinicalTasksPanel })),
);
const ClinicalPhotoProtocolModal = lazyWithRetry(() =>
	import("../components/photography/ClinicalPhotoProtocolModal").then((m) => ({ default: m.ClinicalPhotoProtocolModal })),
);
const OrthodonticsStudioModal = lazyWithRetry(() =>
	import("../components/orthodontics/OrthodonticsStudioModal").then((m) => ({ default: m.OrthodonticsStudioModal })),
);
const ToothContextDrawer = lazyWithRetry(() =>
	import("../components/diagnostics/ToothContextDrawer").then((m) => ({ default: m.ToothContextDrawer })),
);
const MedicalRecordStudioModal = lazyWithRetry(() =>
	import("../components/emr/MedicalRecordStudioModal").then((m) => ({ default: m.MedicalRecordStudioModal })),
);
const CtSelectorModal = lazyWithRetry(() =>
	import("../components/radiology/CtSelectorModal").then((m) => ({ default: m.CtSelectorModal })),
);
const DirectRvgCaptureModal = lazyWithRetry(() =>
	import("../components/radiology/DirectRvgCaptureModal").then((m) => ({ default: m.DirectRvgCaptureModal })),
);
const ConsentStudioModal = lazyWithRetry(() =>
	import("../components/consents/ConsentStudioModal").then((m) => ({ default: m.ConsentStudioModal })),
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
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber) ?? (typeof appLogic?.activeTooth === "number" ? appLogic.activeTooth : 11);
	const visitToothRecord = useVisitStore((s) => s.visitToothRecordsByCode[String(activeToothNumber)]);
	const reactiveToothData = visitToothRecord
		? { toothNumber: activeToothNumber, state: visitToothRecord.state ?? "Healthy", surfaces: visitToothRecord.surfaces ?? [] }
		: { toothNumber: activeToothNumber, state: "Healthy", surfaces: [] };

	return (
		<>
			{routing.isOrthoPhotoDirectModalOpen && (
				<Suspense fallback={null}>
					<ClinicalPhotoProtocolModal
						isOpen={true}
						onClose={() => routing.setIsOrthoPhotoDirectModalOpen(false)}
						patientName="Воронов Дмитрий Игоревич"
						patientId="pat-demo-01"
						initialPresetId="orthodontic_8"
					/>
				</Suspense>
			)}
			{routing.isOrthoProtocolDirectModalOpen && (
				<Suspense fallback={null}>
					<OrthodonticsStudioModal
						isOpen={true}
						onClose={() => routing.setIsOrthoProtocolDirectModalOpen(false)}
						patientName={patient?.fullName || patient?.name}
						patientId={patient?.id}
						doctorName={staffUser?.name || activeDoctor?.fullName || activeDoctor?.name}
						clinicName="DENTE Clinic"
					/>
				</Suspense>
			)}
			{routing.isToothDrawerDirectModalOpen && (
				<Suspense fallback={null}>
					<ToothContextDrawer
						isOpen={true}
						onClose={() => routing.setIsToothDrawerDirectModalOpen(false)}
						toothNumber={activeToothNumber}
						toothData={reactiveToothData as any}
					/>
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
					<MedicalRecordStudioModal
						isOpen={true}
						onClose={() => routing.setIsEmrCardDirectModalOpen(false)}
						patientId={patient?.id || "pat-demo-01"}
						onSave={async () => {
							showToast("Медицинская карта приёма сохранена в базу данных", "success", 3000);
						}}
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
			{routing.isCtSelectorDirectModalOpen && (
				<Suspense fallback={null}>
					<CtSelectorModal
						isOpen={true}
						onClose={() => routing.setIsCtSelectorDirectModalOpen(false)}
						patientName={patient?.fullName || patient?.name || "Захаров Иван Дмитриевич"}
						cardNumber={patient?.cardNumber || patient?.cardId || "КТ-2026-0814"}
					/>
				</Suspense>
			)}
			{routing.isVisiographDirectModalOpen && (
				<Suspense fallback={null}>
					<DirectRvgCaptureModal
						isOpen={true}
						onClose={() => routing.setIsVisiographDirectModalOpen(false)}
						patientName={patient?.fullName || patient?.name || "Захаров Иван Дмитриевич"}
						patientCardNumber={patient?.cardNumber || "ЭМК №2026/891"}
						doctorName={staffUser?.fullName || activeDoctor?.fullName || "Д-р Захаров А. В."}
						initialToothFdi="16"
					/>
				</Suspense>
			)}
			{routing.isConsentDirectModalOpen && (
				<Suspense fallback={null}>
					<ConsentStudioModal
						isOpen={true}
						onClose={() => routing.setIsConsentDirectModalOpen(false)}
						patient={patient || { fullName: "Иванов Иван Иванович", birthDate: "1988-04-12", id: "pat-demo-01" }}
						patientName={patient?.fullName || patient?.name || "Иванов Иван Иванович"}
						patientContext={{
							patientName: patient?.fullName || patient?.name || "Иванов Иван Иванович",
							birthDate: patient?.birthDate || "12.04.1988",
							doctorName: staffUser?.fullName || activeDoctor?.fullName || "Д-р Смирнова Е. С.",
							clinicName: "Клиника «DENTE»",
						}}
					/>
				</Suspense>
			)}
		</>
	);
}
