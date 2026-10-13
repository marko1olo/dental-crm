import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { RadiologyModule } from "../radiology/RadiologyModule.js";
import { ImagingExportModal } from "./ImagingExportModal";
import { VisiographComparisonModal } from "../visiograph/VisiographComparisonModal";

const PanoramicRendererWindow = lazyWithRetry(() =>
	import("../dicom/PanoramicRendererWindow").then((m) => ({
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
	isPanoramicWindowOpen,
	setIsPanoramicWindowOpen,
	isRadiologyModuleOpen,
	setIsRadiologyModuleOpen,
	isExportModalOpen,
	setIsExportModalOpen,
	isComparisonOpen,
	setIsComparisonOpen,
	activeImagingStudies,
	selectedImagingStudy,
	activePatient,
	activeAppointment,
	authClinicName,
	effectivePreviewUrl,
	selectedStudySummary,
}: ImagingAuxiliaryModalsProps) {
	return (
		<>
			{isPanoramicWindowOpen && (
				<div
					className="panoramic-recon-window-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
					onClick={() => setIsPanoramicWindowOpen(false)}
				>
					<div
						className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 max-w-md w-full shadow-2xl text-center space-y-4"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-base font-semibold text-[var(--ink)]">Панорамная реконструкция (ОПТГ)</h3>
						<p className="text-xs text-[var(--muted)] leading-relaxed">
							Для построения панорамной кривой зубной дуги и кросс-секций выберите или загрузите исследование КЛКТ 3D в кабинете снимков.
						</p>
						<div className="flex justify-center pt-2">
							<button
								type="button"
								className="px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-90 transition-opacity cursor-pointer"
								onClick={() => setIsPanoramicWindowOpen(false)}
							>
								Закрыть
							</button>
						</div>
					</div>
				</div>
			)}

			{isRadiologyModuleOpen && (
				<div
					className="radiology-module-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4"
					onClick={() => setIsRadiologyModuleOpen(false)}
				>
					<div
						className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] p-4 shadow-2xl"
						onClick={(e) => e.stopPropagation()}
					>
						<RadiologyModule
							patient={
								activePatient
									? {
											id: activePatient.id,
											fullName: activePatient.fullName || activePatient.name,
											birthDate: activePatient.birthDate,
											phone: activePatient.phone,
											cardNumber: activePatient.cardNumber,
											medicalCardNumber: activePatient.medicalCardNumber,
										}
									: null
							}
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
