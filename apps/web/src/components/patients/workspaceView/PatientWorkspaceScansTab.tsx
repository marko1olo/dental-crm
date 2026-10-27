import { Camera } from "lucide-react";
import React from "react";
import type { ImagingStudyItem } from "./types";
import { PatientScansToolbar } from "./scans/PatientScansToolbar";
import { PatientScanCardItem } from "./scans/PatientScanCardItem";

export interface PatientWorkspaceScansTabProps {
	patientId: string;
	patientStudies: ImagingStudyItem[] | any[];
	appLogic?: any;
	setIsCbctModalOpen: (v: boolean) => void;
	setIsPhotoProtocolOpen: (v: boolean) => void;
	setSelectedScanForDicom: (scan: {
		url: string;
		tooth?: string | null;
		title?: string | null;
	} | null) => void;
	setIsDicomModalOpen: (v: boolean) => void;
	onOpenDirectRvg?: () => void;
	onOpenConsultationSplit?: () => void;
}

export const PatientWorkspaceScansTab: React.FC<PatientWorkspaceScansTabProps> = React.memo(
	({
		patientId,
		patientStudies,
		appLogic,
		setIsCbctModalOpen,
		setIsPhotoProtocolOpen,
		setSelectedScanForDicom,
		setIsDicomModalOpen,
		onOpenDirectRvg,
		onOpenConsultationSplit,
	}) => {
		const handleSelectStudy = (study: any, isCbct: boolean, thumbSrc: string) => {
			if (isCbct) {
				setIsCbctModalOpen(true);
			} else {
				setSelectedScanForDicom({
					url: thumbSrc,
					tooth: study.toothCode,
					title: study.title,
				});
				setIsDicomModalOpen(true);
			}
		};

		return (
			<div className="flex flex-col gap-3" data-testid="patient-scans-gallery">
				<PatientScansToolbar
					patientId={patientId}
					totalStudies={patientStudies.length}
					appLogic={appLogic}
					setIsCbctModalOpen={setIsCbctModalOpen}
					setIsPhotoProtocolOpen={setIsPhotoProtocolOpen}
					setIsDicomModalOpen={setIsDicomModalOpen}
					onOpenDirectRvg={onOpenDirectRvg}
					onOpenConsultationSplit={onOpenConsultationSplit}
				/>

				{patientStudies.length === 0 ? (
					<div
						data-testid="patient-scans-empty-state"
						className="p-8 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] flex flex-col items-center justify-center gap-2"
					>
						<Camera size={32} className="text-[var(--muted)] opacity-50" />
						<div className="font-bold text-[var(--ink)]">Снимки и КТ-исследования пока не прикреплены</div>
						<p className="max-w-md m-0">
							В карте пациента пока нет загруженных радиовизиографических или томографических снимков.
							Вы можете прикрепить снимок в приёме врача или импортировать DICOM через рентген-кокпит.
						</p>
					</div>
				) : (
					<div
						data-testid="patient-scans-grid"
						className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 flex-wrap sm:flex-nowrap"
					>
						{patientStudies.map((study: any) => (
							<PatientScanCardItem key={study.id} study={study} onSelect={handleSelectStudy} />
						))}
					</div>
				)}
			</div>
		);
	},
);
PatientWorkspaceScansTab.displayName = "PatientWorkspaceScansTab";
