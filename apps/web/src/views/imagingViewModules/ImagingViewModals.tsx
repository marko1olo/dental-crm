import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { CtSelectorModal } from "../../components/radiology/CtSelectorModal";
import { ImagingAuxiliaryModals } from "../../components/imaging";

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../components/radiology/CbctMprImplantStudioModal.js").then((m) => ({
		default: m.CbctMprImplantStudioModal,
	})),
);

export interface ImagingViewModalsProps {
	isCbctStudioOpen: boolean;
	setIsCbctStudioOpen: (open: boolean) => void;
	isCtSelectorOpen: boolean;
	setIsCtSelectorOpen: (open: boolean) => void;
	isPanoramicWindowOpen: boolean;
	setIsPanoramicWindowOpen: (open: boolean) => void;
	isRadiologyModuleOpen: boolean;
	setIsRadiologyModuleOpen: (open: boolean) => void;
	isExportModalOpen: boolean;
	setIsExportModalOpen: (open: boolean) => void;
	isComparisonOpen: boolean;
	setIsComparisonOpen: (open: boolean) => void;
	selectedImagingStudy: any;
	activePatient: any;
	activeAppointment: any;
	activeImagingStudies: any[];
	authClinicName?: string | null;
	effectivePreviewUrl?: string | null;
	selectedStudySummary?: string | null;
	setSelectedImagingStudyId?: (id: string) => void;
	openPopoutStudio: (studyId?: string, imageIds?: string[]) => void;
}

export function ImagingViewModals({
	isCbctStudioOpen,
	setIsCbctStudioOpen,
	isCtSelectorOpen,
	setIsCtSelectorOpen,
	isPanoramicWindowOpen,
	setIsPanoramicWindowOpen,
	isRadiologyModuleOpen,
	setIsRadiologyModuleOpen,
	isExportModalOpen,
	setIsExportModalOpen,
	isComparisonOpen,
	setIsComparisonOpen,
	selectedImagingStudy,
	activePatient,
	activeAppointment,
	activeImagingStudies,
	authClinicName,
	effectivePreviewUrl,
	selectedStudySummary,
	setSelectedImagingStudyId,
	openPopoutStudio,
}: ImagingViewModalsProps) {
	return (
		<>
			{isCbctStudioOpen && (
				<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Загрузка 3D КТ...</div>}>
					<CbctMprImplantStudioModal
						isOpen={isCbctStudioOpen}
						onClose={() => setIsCbctStudioOpen(false)}
						study={selectedImagingStudy}
						patientId={activePatient?.id ?? null}
						patientName={activePatient?.name ?? activePatient?.fullName}
					/>
				</Suspense>
			)}

			{isCtSelectorOpen && (
				<CtSelectorModal
					isOpen={true}
					onClose={() => setIsCtSelectorOpen(false)}
					patientId={activePatient?.id}
					patientName={activePatient?.name ?? activePatient?.fullName}
					cardNumber={activePatient?.cardNumber ?? activePatient?.medicalCardNumber}
					studies={activeImagingStudies}
					onSelectStudy={(study) => study?.id && setSelectedImagingStudyId?.(study.id)}
					onOpenCbctStudio={(study, ids) => openPopoutStudio(study?.id, ids)}
					onImagesLoaded={(ids, meta) => openPopoutStudio(meta?.id, ids)}
				/>
			)}

			<ImagingAuxiliaryModals
				isPanoramicWindowOpen={isPanoramicWindowOpen}
				setIsPanoramicWindowOpen={setIsPanoramicWindowOpen}
				isRadiologyModuleOpen={isRadiologyModuleOpen}
				setIsRadiologyModuleOpen={setIsRadiologyModuleOpen}
				isExportModalOpen={isExportModalOpen}
				setIsExportModalOpen={setIsExportModalOpen}
				isComparisonOpen={isComparisonOpen}
				setIsComparisonOpen={setIsComparisonOpen}
				activeImagingStudies={activeImagingStudies}
				selectedImagingStudy={selectedImagingStudy}
				activePatient={activePatient}
				activeAppointment={activeAppointment}
				authClinicName={authClinicName || undefined}
				effectivePreviewUrl={effectivePreviewUrl || undefined}
				selectedStudySummary={selectedStudySummary || undefined}
			/>
		</>
	);
}
