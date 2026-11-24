/**
 * ImagingAuxiliaryModals.tsx — Дополнительные модальные окна лучевой диагностики
 * Mandate 8b: строго <= 120 строк.
 */

import React, { Suspense } from "react";
import type { ImagingStudy as LocalImagingStudy } from "./types.js";
import { convertImagingStudyToRadiologyStudy } from "../radiology/archive/radiologyStudyAdapter.js";
import { lazyWithRetry } from "../../lib/lazyWithRetry.js";
import { RadiologyModule } from "../radiology/RadiologyModule.js";
import { ImagingExportModal } from "./ImagingExportModal.js";
import { RadiologyConsultationSplit } from "../radiology/RadiologyConsultationSplit.js";

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../radiology/CbctMprImplantStudioModal.js").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);

export interface ImagingAuxiliaryModalsProps {
	isPanoramicWindowOpen: boolean;
	setIsPanoramicWindowOpen: (open: boolean) => void;
	isRadiologyModuleOpen: boolean;
	setIsRadiologyModuleOpen: (open: boolean) => void;
	isExportModalOpen: boolean;
	setIsExportModalOpen: (open: boolean) => void;
	isComparisonOpen?: boolean | undefined;
	setIsComparisonOpen?: ((open: boolean) => void) | undefined;
	activeImagingStudies?: LocalImagingStudy[] | undefined;
	selectedImagingStudy?: LocalImagingStudy | null | undefined;
	activePatient?: { id?: string | null; fullName?: string | null; name?: string | null; birthDate?: string | null; phone?: string | null; cardNumber?: string | null; medicalCardNumber?: string | null; gender?: string | null } | null | undefined;
	activeAppointment?: { doctorName?: string | null; [key: string]: unknown } | null | undefined;
	authClinicName?: string | undefined;
	effectivePreviewUrl?: string | null | undefined;
	selectedStudySummary?: string | null | undefined;
	localImageIds?: string[] | undefined;
}

export function ImagingAuxiliaryModals({
	isPanoramicWindowOpen, setIsPanoramicWindowOpen,
	isRadiologyModuleOpen, setIsRadiologyModuleOpen,
	isExportModalOpen, setIsExportModalOpen,
	isComparisonOpen, setIsComparisonOpen,
	activeImagingStudies, selectedImagingStudy,
	activePatient, activeAppointment,
	authClinicName, effectivePreviewUrl,
	selectedStudySummary,
	localImageIds,
}: ImagingAuxiliaryModalsProps) {
	return (
		<>
			{isPanoramicWindowOpen && (
				<Suspense
					fallback={
						<div className="panoramic-recon-window-modal fixed inset-0 z-[100060] flex items-center justify-center bg-black/80">
							<div className="w-8 h-8 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
						</div>
					}
				>
					<CbctMprImplantStudioModal
						key={selectedImagingStudy?.id ?? activePatient?.id ?? "panoramic-studio"}
						isOpen={isPanoramicWindowOpen}
						onClose={() => setIsPanoramicWindowOpen(false)}
						study={selectedImagingStudy ? convertImagingStudyToRadiologyStudy(selectedImagingStudy) : undefined}
						patientId={activePatient?.id ?? undefined}
						patientName={activePatient?.name ?? activePatient?.fullName ?? undefined}
						initialStudioMode="panoramic"
						initialImageIds={localImageIds}
					/>
				</Suspense>
			)}

			{isRadiologyModuleOpen && (
				<div
					className="radiology-module-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4"
					onClick={() => setIsRadiologyModuleOpen(false)}
				>
					<div
						className="w-full max-w-7xl h-[92vh] overflow-hidden rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<RadiologyModule
							key={activePatient?.id ?? "radiology-module"}
							patient={activePatient ? {
								id: activePatient.id ?? null,
								fullName: activePatient.fullName || activePatient.name || null,
								birthDate: activePatient.birthDate ?? null,
								gender: activePatient.gender ?? null,
								phone: activePatient.phone ?? null,
								cardNumber: activePatient.cardNumber ?? null,
								medicalCardNumber: activePatient.medicalCardNumber ?? null,
							} : null}
							doctorName={activeAppointment?.doctorName ?? null}
							clinicName={authClinicName || "ООО «ДЕНТЕ»"}
							onClose={() => setIsRadiologyModuleOpen(false)}
						/>
					</div>
				</div>
			)}

			<ImagingExportModal
				key={selectedImagingStudy?.id ?? activePatient?.id ?? "imaging-export"}
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				study={selectedImagingStudy}
				patient={activePatient ? {
					fullName: activePatient.fullName || activePatient.name || undefined,
					name: activePatient.name || undefined,
					birthDate: activePatient.birthDate || undefined,
					medicalCardNumber: activePatient.medicalCardNumber || undefined,
					cardNumber: activePatient.cardNumber || undefined,
					phone: activePatient.phone || undefined,
				} : undefined}
				doctorName={activeAppointment?.doctorName ?? undefined}
				clinicName={authClinicName}
				previewUrl={effectivePreviewUrl}
				reportSummary={selectedStudySummary ?? null}
			/>

			<RadiologyConsultationSplit
				key={selectedImagingStudy?.id ?? activePatient?.id ?? "consultation-split"}
				isOpen={Boolean(isComparisonOpen)}
				asModal={true}
				onClose={() => setIsComparisonOpen?.(false)}
				patientName={activePatient?.fullName || activePatient?.name || undefined}
				patientCardNumber={activePatient?.cardNumber || activePatient?.medicalCardNumber || undefined}
				currentStudy={selectedImagingStudy ? convertImagingStudyToRadiologyStudy(selectedImagingStudy) : undefined}
				historyStudies={activeImagingStudies ? activeImagingStudies.map((s) => convertImagingStudyToRadiologyStudy(s)) : undefined}
			/>
		</>
	);
}
