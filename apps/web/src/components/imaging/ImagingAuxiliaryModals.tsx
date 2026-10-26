/**
 * ImagingAuxiliaryModals.tsx — Дополнительные модальные окна лучевой диагностики
 * Mandate 8b: строго <= 120 строк.
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry.js";
import { RadiologyModule } from "../radiology/RadiologyModule.js";
import { ImagingExportModal } from "./ImagingExportModal.js";
import { VisiographComparisonModal } from "../visiograph/VisiographComparisonModal.js";
import { getActivePanoramicVolume } from "./panoramicVolumeResolver.js";

const PanoramicRendererWindow = lazyWithRetry(() =>
	import("../dicom/PanoramicRendererWindow.js").then((m) => ({
		default: m.PanoramicRendererWindow,
	})),
);

export interface ImagingAuxiliaryModalsProps {
	isPanoramicWindowOpen: boolean;
	setIsPanoramicWindowOpen: (open: boolean) => void;
	isRadiologyModuleOpen: boolean;
	setIsRadiologyModuleOpen: (open: boolean) => void;
	isExportModalOpen: boolean;
	setIsExportModalOpen: (open: boolean) => void;
	isComparisonOpen?: boolean;
	setIsComparisonOpen?: (open: boolean) => void;
	activeImagingStudies?: any[];
	selectedImagingStudy?: any;
	activePatient?: any;
	activeAppointment?: any;
	authClinicName?: string | undefined;
	effectivePreviewUrl?: string | null | undefined;
	selectedStudySummary?: string | null | undefined;
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
					<PanoramicRendererWindow
						splinePoints={[]}
						volume={getActivePanoramicVolume()}
						patientId={activePatient?.id}
						onClose={() => setIsPanoramicWindowOpen(false)}
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
							patient={activePatient ? {
								id: activePatient.id,
								fullName: activePatient.fullName || activePatient.name,
								birthDate: activePatient.birthDate,
								phone: activePatient.phone,
								cardNumber: activePatient.cardNumber,
								medicalCardNumber: activePatient.medicalCardNumber,
							} : null}
							doctorName={activeAppointment?.doctorName}
							clinicName={authClinicName || "ООО «ДЕНТЕ»"}
							onClose={() => setIsRadiologyModuleOpen(false)}
						/>
					</div>
				</div>
			)}

			<ImagingExportModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				study={selectedImagingStudy}
				patient={activePatient}
				doctorName={activeAppointment?.doctorName}
				clinicName={authClinicName}
				previewUrl={effectivePreviewUrl}
				reportSummary={selectedStudySummary ?? null}
			/>

			<VisiographComparisonModal
				isOpen={Boolean(isComparisonOpen)}
				onClose={() => setIsComparisonOpen?.(false)}
				patientName={activePatient?.fullName || activePatient?.name}
				patientCardNumber={activePatient?.cardNumber || activePatient?.medicalCardNumber}
				currentStudy={selectedImagingStudy}
				historyStudies={activeImagingStudies}
			/>
		</>
	);
}
