import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { CtSelectorModal } from "../../components/radiology/CtSelectorModal";
import { DirectRvgCaptureModal } from "../../components/radiology/DirectRvgCaptureModal";
import { ImagingAuxiliaryModals } from "../../components/imaging";
import type { ImagingStudy } from "./imagingViewTypes";

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
	isRvgCaptureOpen?: boolean | undefined;
	setIsRvgCaptureOpen?: ((open: boolean) => void) | undefined;
	rvgInitialTooth?: string | null | undefined;
	onRvgSaveToEmr?: ((study: ImagingStudy) => void) | undefined;
	localImageIds?: string[] | undefined;
	selectedImagingStudy: ImagingStudy | null;
	activePatient: { id?: string; name?: string; fullName?: string; cardNumber?: string; medicalCardNumber?: string; [key: string]: unknown } | null | undefined;
	activeAppointment?: { doctorName?: string | null; [key: string]: unknown } | null | undefined;
	activeImagingStudies: ImagingStudy[];
	authClinicName?: string | null | undefined;
	effectivePreviewUrl?: string | null | undefined;
	selectedStudySummary?: string | null | undefined;
	setSelectedImagingStudyId?: ((id: string) => void) | undefined;
	openPopoutStudio: (studyId?: string, imageIds?: string[]) => void;
}

export function ImagingViewModals(props: ImagingViewModalsProps) {
	const {
		isCbctStudioOpen, setIsCbctStudioOpen, isCtSelectorOpen, setIsCtSelectorOpen,
		isPanoramicWindowOpen, setIsPanoramicWindowOpen, isRadiologyModuleOpen, setIsRadiologyModuleOpen,
		isExportModalOpen, setIsExportModalOpen, isComparisonOpen, setIsComparisonOpen,
		isRvgCaptureOpen, setIsRvgCaptureOpen, rvgInitialTooth, onRvgSaveToEmr, localImageIds,
		selectedImagingStudy, activePatient, activeAppointment, activeImagingStudies,
		authClinicName, effectivePreviewUrl, selectedStudySummary, setSelectedImagingStudyId, openPopoutStudio,
	} = props;

	return (
		<>
			{isRvgCaptureOpen && (
				<DirectRvgCaptureModal
					key={activePatient?.id ?? "rvg-capture"}
					isOpen={Boolean(isRvgCaptureOpen)}
					onClose={() => setIsRvgCaptureOpen?.(false)}
					patientId={activePatient?.id}
					patientName={activePatient?.name ?? activePatient?.fullName}
					patientCardNumber={activePatient?.cardNumber ?? activePatient?.medicalCardNumber}
					initialToothFdi={rvgInitialTooth ?? undefined}
					onSaveToEmr={(study) => {
						const mapped: ImagingStudy = {
							id: study.id,
							...(study.patientId !== undefined ? { patientId: study.patientId } : {}),
							kind: study.modality === "intraoral_rvg" ? "periapical" : "other",
							title: study.anatomicalArea ? `Снимок RVG ${study.anatomicalArea}` : "Прицельный снимок RVG",
							toothCode: study.teethFdi?.[0] ?? null,
							previewUrl: study.imageUrl ?? null,
							capturedAt: study.studyDate,
							status: study.status,
						};
						onRvgSaveToEmr?.(mapped);
						setIsRvgCaptureOpen?.(false);
					}}
				/>
			)}

			{isCbctStudioOpen && (
				<Suspense fallback={<div className="p-4 text-xs text-[var(--muted)]">Загрузка 3D КТ...</div>}>
					<CbctMprImplantStudioModal
						key={selectedImagingStudy?.id ?? activePatient?.id ?? "cbct-studio"}
						isOpen={isCbctStudioOpen}
						onClose={() => setIsCbctStudioOpen(false)}
						study={selectedImagingStudy}
						patientId={activePatient?.id ?? null}
						patientName={activePatient?.name ?? activePatient?.fullName}
						initialImageIds={localImageIds}
					/>
				</Suspense>
			)}

			{isCtSelectorOpen && (
				<CtSelectorModal
					key={activePatient?.id ?? "ct-selector"}
					isOpen={true}
					onClose={() => setIsCtSelectorOpen(false)}
					patientId={activePatient?.id}
					patientName={activePatient?.name ?? activePatient?.fullName}
					cardNumber={activePatient?.cardNumber ?? activePatient?.medicalCardNumber}
					studies={activeImagingStudies}
					onSelectStudy={(study) => {
						const studyId = (study as { id?: string } | null | undefined)?.id;
						if (studyId) setSelectedImagingStudyId?.(studyId);
					}}
					onOpenCbctStudio={(study, ids) => {
						const studyId = (study as { id?: string } | null | undefined)?.id;
						openPopoutStudio(studyId, ids);
					}}
					onImagesLoaded={(ids, meta) => {
						const metaId = (meta as { id?: string } | null | undefined)?.id;
						openPopoutStudio(metaId, ids);
					}}
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
				localImageIds={localImageIds}
			/>
		</>
	);
}
