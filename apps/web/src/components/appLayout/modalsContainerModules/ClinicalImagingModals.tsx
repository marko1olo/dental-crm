/**
 * ClinicalImagingModals — Модалки визиографа, экспорта снимков и КЛКТ (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { RadiologyConsultationSplit } from "../../radiology/RadiologyConsultationSplit";
import { ImagingExportModal } from "../../imaging/ImagingExportModal";
import type { ImagingStudy } from "../../imaging/types";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";
import { useAppStore } from "../../../store/appStore";
import { useImagingStore } from "../../../store/imagingStore";
import { useDocumentBrandingStore } from "../../../store/documentBrandingStore";
import type { StaffUser } from "../../auth/staffPinPad/staffPinPadTypes";

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../radiology/CbctMprImplantStudioModal").then((m) => ({ default: m.CbctMprImplantStudioModal })),
);

export interface ClinicalImagingModalsProps {
	isGlobalVisiographOpen: boolean;
	setIsGlobalVisiographOpen: (open: boolean) => void;
	isGlobalImagingExportOpen: boolean;
	setIsGlobalImagingExportOpen: (open: boolean) => void;
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: (open: boolean) => void;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: (open: boolean) => void;
	activeStaffUser?: StaffUser | null | undefined;
}

export function ClinicalImagingModals({
	isGlobalVisiographOpen,
	setIsGlobalVisiographOpen,
	isGlobalImagingExportOpen,
	setIsGlobalImagingExportOpen,
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	activeStaffUser,
}: ClinicalImagingModalsProps) {
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber);
	const clinicName = useDocumentBrandingStore((s) => s.clinicName) || "Стоматологическая клиника";
	const allStudies = useAppStore((s) => s.dashboard?.imagingStudies) ?? [];
	const selectedImagingStudyId = useImagingStore((s) => s.selectedImagingStudyId);

	const effectivePatientName = patientCoreDraft?.fullName?.trim() || (selectedPatientId ? `Пациент #${selectedPatientId.slice(0, 8)}` : "");
	const effectiveToothFdi = activeToothNumber ? String(activeToothNumber) : undefined;
	const doctorDisplayName =
		(typeof activeStaffUser?.name === "string" && activeStaffUser.name) ||
		(typeof activeStaffUser?.fullName === "string" && activeStaffUser.fullName) ||
		"Лечащий врач";

	const exportStudy: ImagingStudy | undefined = React.useMemo(() => {
		if (selectedImagingStudyId) {
			const found = allStudies.find((st) => String(st.id) === String(selectedImagingStudyId));
			if (found) return found as unknown as ImagingStudy;
		}
		if (selectedPatientId) {
			const patientStudies = allStudies.filter((st) => String(st.patientId) === String(selectedPatientId));
			if (patientStudies.length > 0) {
				if (effectiveToothFdi) {
					const toothStudy = patientStudies.find((st) => String(st.toothCode) === String(effectiveToothFdi));
					if (toothStudy) return toothStudy as unknown as ImagingStudy;
				}
				return patientStudies[0] as unknown as ImagingStudy;
			}
			return {
				id: `study-patient-${selectedPatientId}`,
				patientId: selectedPatientId,
				title: effectiveToothFdi ? `Прицельный снимок визиографа (зуб ${effectiveToothFdi})` : "Прицельный снимок визиографа",
				toothCode: effectiveToothFdi,
				capturedAt: new Date().toISOString(),
				date: new Date().toISOString(),
				kind: "rvg",
			};
		}
		return undefined;
	}, [allStudies, selectedImagingStudyId, selectedPatientId, effectiveToothFdi]);

	return (
		<>
			{isGlobalVisiographOpen && (
				<RadiologyConsultationSplit
					isOpen={isGlobalVisiographOpen}
					asModal={true}
					onClose={() => setIsGlobalVisiographOpen(false)}
					patientName={effectivePatientName || undefined}
					activeToothFdi={effectiveToothFdi}
				/>
			)}

			{isGlobalImagingExportOpen && (
				<ImagingExportModal
					isOpen={isGlobalImagingExportOpen}
					onClose={() => setIsGlobalImagingExportOpen(false)}
					study={exportStudy}
					patient={{
						fullName: effectivePatientName || "Пациент не выбран",
						medicalCardNumber: "",
					}}
					doctorName={doctorDisplayName}
					clinicName={clinicName}
					patientId={selectedPatientId || undefined}
					toothCode={effectiveToothFdi}
				/>
			)}

			{isCbctDirectModalOpen && (
				<Suspense fallback={null}>
					<CbctMprImplantStudioModal
						isOpen={true}
						onClose={() => {
							setIsCbctDirectModalOpen(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("cbct");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("cbct") ? "" : u.hash));
						}}
						patientName={effectivePatientName || undefined}
						patientId={selectedPatientId || undefined}
						autoLoadDemo={false}
					/>
				</Suspense>
			)}
		</>
	);
}
