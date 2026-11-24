import React from "react";
import type { ImagingStudy } from "@dental/shared";
import { DicomViewerModal } from "../../../imaging/DicomViewerModal";
import { IntraoralScan3DViewerModal } from "../../../radiology/IntraoralScan3DViewerModal";
import { HotFolderIntakeModal } from "../../../radiology/HotFolderIntakeModal";
import { StudyPatientBindControlModal } from "../../../radiology/archive/StudyPatientBindControlModal";
import { RadiologyPatientSearchModal, DEFAULT_TACTILE_FILTERS } from "../../../radiology/RadiologyPatientSearchModal";
import { CtSelectorModal } from "../../../radiology/CtSelectorModal";
import type { PatientRadiologyModalsProps } from "./radiologyModalTypes";

export * from "./radiologyModalTypes";

function isImagingStudy(study: unknown): study is ImagingStudy {
	if (typeof study !== "object" || study === null) return false;
	const candidate = study as Record<string, unknown>;
	return typeof candidate.id === "string" && typeof candidate.kind === "string";
}

export const PatientRadiologyModals: React.FC<PatientRadiologyModalsProps> = ({
	patientId, patientName, patientBirthDate, cardNumber,
	active2dStudy, setActive2dStudy, activeScan3dStudy, setActiveScan3dStudy,
	showHotFolder, setShowHotFolder, activeControlStudy, setActiveControlStudy,
	handleStudyUpdated, showTactileSearch, setShowTactileSearch,
	tactileFilters, setTactileFilters, sortedStudies, filteredStudies,
	showCtSelector, setShowCtSelector, handleOpen3d, loadPatientStudies,
}) => {
	const resolveStudy = (candidate: unknown): ImagingStudy | undefined => {
		if (isImagingStudy(candidate)) return candidate;
		if (typeof candidate === "object" && candidate !== null) {
			const candidateId = (candidate as { readonly id?: unknown }).id;
			if (typeof candidateId === "string") {
				return sortedStudies.find((s) => s.id === candidateId);
			}
		}
		return undefined;
	};

	return (
		<>
			{active2dStudy && (
				<DicomViewerModal
					key={`${patientId || active2dStudy.patientId || "p"}_${active2dStudy.id}`}
					isOpen={Boolean(active2dStudy)}
					onClose={() => setActive2dStudy(null)}
					imageSrc={active2dStudy.previewUrl || undefined}
					title={active2dStudy.title}
					patientName={patientName || active2dStudy.patientFullName || undefined}
					patientId={patientId || active2dStudy.patientId || undefined}
					studyId={active2dStudy.id}
					toothFdiCode={active2dStudy.toothCode || undefined}
				/>
			)}

			{activeScan3dStudy && (
				<IntraoralScan3DViewerModal
					isOpen={Boolean(activeScan3dStudy)}
					onClose={() => setActiveScan3dStudy(null)}
					modelUrl={activeScan3dStudy.viewerUrl || activeScan3dStudy.previewUrl || undefined}
					modelFormat={(activeScan3dStudy.modality?.toLowerCase() as "stl" | "obj" | "ply") || "stl"}
					patientName={patientName || activeScan3dStudy.patientFullName || undefined}
					scanTitle={activeScan3dStudy.title || "Интраоральный 3D-скан челюсти"}
				/>
			)}

			{showHotFolder && (
				<HotFolderIntakeModal
					isOpen={showHotFolder}
					onClose={() => setShowHotFolder(false)}
					patientId={patientId || undefined}
					patientName={patientName || undefined}
					patientCardNumber={cardNumber || undefined}
					patientBirthDate={patientBirthDate || undefined}
					onAttachToEmr={() => { setShowHotFolder(false); loadPatientStudies(); }}
				/>
			)}

			{activeControlStudy && (
				<StudyPatientBindControlModal
					key={activeControlStudy.id}
					isOpen={Boolean(activeControlStudy)}
					onClose={() => setActiveControlStudy(null)}
					study={activeControlStudy}
					onStudyUpdated={handleStudyUpdated}
				/>
			)}

			<RadiologyPatientSearchModal
				isOpen={showTactileSearch}
				onClose={() => setShowTactileSearch(false)}
				initialFilters={tactileFilters}
				onApply={(newFilters) => setTactileFilters(newFilters)}
				onReset={() => setTactileFilters(DEFAULT_TACTILE_FILTERS)}
				totalStudiesCount={sortedStudies.length}
				matchedCount={filteredStudies.length}
				studies={sortedStudies}
			/>

			{showCtSelector && (
				<CtSelectorModal
					isOpen={showCtSelector}
					onClose={() => setShowCtSelector(false)}
					patientId={patientId || undefined}
					patientName={patientName || undefined}
					cardNumber={cardNumber || undefined}
					studies={sortedStudies}
					onSelectStudy={(study, launchMode) => {
						setShowCtSelector(false);
						const resolved = resolveStudy(study);
						if (launchMode === "crm_window" && resolved) handleOpen3d(resolved);
					}}
					onOpenCbctStudio={(study) => {
						setShowCtSelector(false);
						const resolved = resolveStudy(study);
						if (resolved) handleOpen3d(resolved);
					}}
					onImagesLoaded={(_imageIds, studyMeta) => {
						setShowCtSelector(false);
						loadPatientStudies();
						const resolved = resolveStudy(studyMeta);
						if (resolved) handleOpen3d(resolved);
					}}
				/>
			)}
		</>
	);
};
