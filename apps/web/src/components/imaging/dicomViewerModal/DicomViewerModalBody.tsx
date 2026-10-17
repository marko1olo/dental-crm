import React, { Suspense } from "react";
import { DicomViewport } from "../DicomViewport.js";
import { RadiologyClinicalHud } from "../../radiology/RadiologyClinicalHud.js";
import { RadiologyCalibratedScaleRuler } from "../../radiology/RadiologyCalibratedScaleRuler.js";
import { DicomAiFindingsDrawer } from "../DicomAiFindingsDrawer.js";
import { RadiologyFilmstripDock, type RadiologyFilmstripItem } from "../../radiology/RadiologyFilmstripDock.js";
import type { CalibratedRulerMeasurement, DicomViewportState } from "../rvgViewerEngine.js";

export interface DicomViewerModalBodyProps {
	readonly currentImageSrc: string;
	readonly viewportState: DicomViewportState;
	readonly onViewportChange: (next: Partial<DicomViewportState>) => void;
	readonly measurements: CalibratedRulerMeasurement[];
	readonly onAddMeasurement: (m: CalibratedRulerMeasurement) => void;
	readonly patientName?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly showFindingsDrawer: boolean;
	readonly onToggleFindingsDrawer: () => void;
	readonly plan: any;
	readonly selectedFindingCodes: Set<string>;
	readonly setSelectedFindingCodes: React.Dispatch<React.SetStateAction<Set<string>>>;
	readonly appliedToothCodes: string[];
	readonly formulaFailure: string | null;
	readonly aiReport: string | null;
	readonly isApplyingToChart: boolean;
	readonly onApplyFindingsToChart: () => void;
	readonly filmstripStudies: readonly RadiologyFilmstripItem[];
	readonly activeStudyId: string;
	readonly onSelectFilmstripStudy: (s: any) => void;
}

export const DicomViewerModalBody: React.FC<DicomViewerModalBodyProps> = ({
	currentImageSrc, viewportState, onViewportChange, measurements, onAddMeasurement,
	patientName, toothFdiCode, studyDate, showFindingsDrawer, onToggleFindingsDrawer,
	plan, selectedFindingCodes, setSelectedFindingCodes, appliedToothCodes,
	formulaFailure, aiReport, isApplyingToChart, onApplyFindingsToChart,
	filmstripStudies, activeStudyId, onSelectFilmstripStudy,
}) => {
	return (
		<div className="flex-1 relative flex flex-col overflow-hidden">
			<div className="flex-1 relative flex overflow-hidden">
				<div className="flex-1 relative h-full">
					<Suspense fallback={<div className="flex items-center justify-center w-full h-full text-xs text-slate-400">Загрузка просмотрщика...</div>}>
						<DicomViewport
							imageSrc={currentImageSrc}
							viewportState={viewportState}
							onViewportChange={onViewportChange}
							measurements={measurements}
							onAddMeasurement={onAddMeasurement}
						/>
					</Suspense>

					<RadiologyClinicalHud
						patientName={patientName || "—"}
						toothFdi={toothFdiCode}
						modalityLabel="IO-СЕНСОР"
						studyDate={studyDate || "сегодня"}
					/>

					<RadiologyCalibratedScaleRuler
						zoom={viewportState.zoom}
						pixelPitchMicrons={35.0}
						targetLengthMm={5.0}
						position="left"
					/>
				</div>

				<DicomAiFindingsDrawer
					data-testid="dicom-ai-findings-drawer"
					isOpen={showFindingsDrawer}
					onClose={onToggleFindingsDrawer}
					plan={plan}
					selectedFindingCodes={selectedFindingCodes}
					setSelectedFindingCodes={setSelectedFindingCodes}
					appliedToothCodes={appliedToothCodes}
					formulaFailure={formulaFailure}
					aiReport={aiReport}
					isApplyingToChart={isApplyingToChart}
					onApplyFindingsToChart={onApplyFindingsToChart}
				/>

				<button
					type="button"
					data-testid="btn-dicom-apply-findings"
					onClick={onApplyFindingsToChart}
					style={{ display: "none" }}
					aria-hidden="true"
				>
					Применить к зубной формуле
				</button>
			</div>

			<RadiologyFilmstripDock
				studies={filmstripStudies}
				activeStudyId={activeStudyId}
				onSelectStudy={onSelectFilmstripStudy}
			/>
		</div>
	);
};
