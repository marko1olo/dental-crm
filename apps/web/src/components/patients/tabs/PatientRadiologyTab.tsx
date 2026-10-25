import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { PatientTimeline } from "../PatientTimeline";
import { usePatientRadiologyLogic } from "./radiology/usePatientRadiologyLogic";
import { PatientRadiologyToolbar } from "./radiology/PatientRadiologyToolbar";
import { PatientRadiologyEmptyState } from "./radiology/PatientRadiologyEmptyState";
import { PatientRadiologyModals } from "./radiology/PatientRadiologyModals";

export interface PatientRadiologyTabProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly cardNumber?: string | null | undefined;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenScan3d?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
}

export const PatientRadiologyTab: React.FC<PatientRadiologyTabProps> = ({
	patientId,
	patientName,
	patientBirthDate,
	cardNumber,
	onOpenStudio,
	onOpenViewer,
	onOpenScan3d,
}) => {
	const logic = usePatientRadiologyLogic({
		patientId,
		patientName,
		onOpenStudio,
		onOpenViewer,
		onOpenScan3d,
	});

	return (
		<div className="flex flex-col gap-4 text-[var(--ink)]" data-testid="patient-radiology-tab">
			<PatientRadiologyToolbar
				isLoading={logic.isLoading}
				onStudyBound={logic.loadPatientStudies}
				onOpenTactileSearch={() => logic.setShowTactileSearch(true)}
				onOpenCtSelector={() => logic.setShowCtSelector(true)}
				onOpenHotFolder={() => logic.setShowHotFolder(true)}
				onRefresh={logic.loadPatientStudies}
			/>

			{logic.isLoading ? (
				<div className="flex items-center justify-center p-12 text-[var(--muted)] gap-2">
					<RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
					<span className="text-xs font-semibold">Загрузка снимков пациента...</span>
				</div>
			) : logic.error ? (
				<div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0" />
						<span>{logic.error}</span>
					</div>
					<button
						type="button"
						onClick={logic.loadPatientStudies}
						className="h-7 px-2.5 rounded-md bg-[var(--paper)] border border-rose-500/30 font-semibold hover:bg-rose-500/20 text-xs"
					>
						Повторить
					</button>
				</div>
			) : logic.sortedStudies.length === 0 ? (
				<PatientRadiologyEmptyState onUpload={() => logic.setShowHotFolder(true)} />
			) : (
				<div className="flex flex-col gap-2.5 min-h-[460px]" data-testid="patient-radiology-list">
					<PatientTimeline
						studies={logic.filteredStudies}
						activeStudyId={logic.activeStudyId || logic.filteredStudies[0]?.id || null}
						onSelectStudy={(study) => logic.setActiveStudyId(study.id)}
						onOpenStudio={logic.handleOpen3d}
						onOpenScan3d={logic.handleOpenScan3d}
						onOpenViewer={logic.handleOpen2d}
						onOpenControl={(study) => logic.setActiveControlStudy(study)}
						onOpenTactileSearch={() => logic.setShowTactileSearch(true)}
					/>
				</div>
			)}

			<PatientRadiologyModals
				patientId={patientId}
				patientName={patientName}
				patientBirthDate={patientBirthDate}
				cardNumber={cardNumber}
				active2dStudy={logic.active2dStudy}
				setActive2dStudy={logic.setActive2dStudy}
				activeScan3dStudy={logic.activeScan3dStudy}
				setActiveScan3dStudy={logic.setActiveScan3dStudy}
				showHotFolder={logic.showHotFolder}
				setShowHotFolder={logic.setShowHotFolder}
				activeControlStudy={logic.activeControlStudy}
				setActiveControlStudy={logic.setActiveControlStudy}
				handleStudyUpdated={logic.handleStudyUpdated}
				showTactileSearch={logic.showTactileSearch}
				setShowTactileSearch={logic.setShowTactileSearch}
				tactileFilters={logic.tactileFilters}
				setTactileFilters={logic.setTactileFilters}
				sortedStudies={logic.sortedStudies}
				filteredStudies={logic.filteredStudies}
				showCtSelector={logic.showCtSelector}
				setShowCtSelector={logic.setShowCtSelector}
				handleOpen3d={logic.handleOpen3d}
				loadPatientStudies={logic.loadPatientStudies}
			/>
		</div>
	);
};

export default PatientRadiologyTab;
