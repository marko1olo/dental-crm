import React from "react";
import { Check } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { is3DScanUrl } from "../../lab/LabAttachScanModal";
import { formatStudyDateKey, getModalityColor } from "./types";
import { PatientTimelineThumbnail } from "./PatientTimelineThumbnail";
import { PatientTimelineCardActions } from "./PatientTimelineCardActions";

export interface PatientTimelineStudyCardProps {
	readonly study: ImagingStudy;
	readonly isSelected: boolean;
	readonly cardWidth: number;
	readonly onCardClick: (study: ImagingStudy) => void;
	readonly onCardDoubleClick: (study: ImagingStudy) => void;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenScan3d?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenControl?: ((study: ImagingStudy) => void) | undefined;
}

export const PatientTimelineStudyCard: React.FC<PatientTimelineStudyCardProps> = ({
	study,
	isSelected,
	cardWidth,
	onCardClick,
	onCardDoubleClick,
	onOpenStudio,
	onOpenScan3d,
	onOpenViewer,
	onOpenControl,
}) => {
	const is3DScan = Boolean(
		(study.kind as string) === "scan_3d" ||
		study.modality === "STL" ||
		study.modality === "PLY" ||
		study.modality === "OBJ" ||
		(study.previewUrl && is3DScanUrl(study.previewUrl)) ||
		(study.viewerUrl && is3DScanUrl(study.viewerUrl)) ||
		/\.(stl|ply|obj)($|[?#])/i.test(study.title || "")
	);
	const isCbct = !is3DScan && (study.kind === "cbct" || (study.sliceCount && study.sliceCount > 1));
	const { timeStr, formattedDate } = formatStudyDateKey(study.capturedAt || study.studyDate);
	const badge = getModalityColor(study.modality || study.kind);

	return (
		<div
			onClick={() => onCardClick(study)}
			onDoubleClick={() => onCardDoubleClick(study)}
			data-testid={`timeline-study-card-${study.id}`}
			data-study-card-id={study.id}
			data-active={isSelected ? "true" : "false"}
			style={{
				border: isSelected ? "3px solid #00C853" : "1px solid #1e2d47",
				boxShadow: isSelected ? "0 0 14px rgba(0, 200, 83, 0.45)" : "none",
			}}
			className={`patient-study-card group relative flex flex-col rounded-xl overflow-hidden bg-[#0c1424] cursor-pointer transition-all duration-150 shrink-0 ${
				isSelected ? "ring-2 ring-[#00C853] bg-[#0f1b31]" : "hover:border-[#384e72] hover:bg-[#111c33]"
			}`}
		>
			<PatientTimelineThumbnail
				imgSrc={study.previewUrl}
				formattedDate={formattedDate}
				cardWidth={cardWidth}
				is3DScan={is3DScan}
				isCbct={isCbct}
				badge={badge}
				toothCode={study.toothCode}
				isSelected={isSelected}
			/>

			<div className="flex flex-col p-2 bg-[#090f1d] border-t border-[#1a273e] text-[11px] leading-tight flex-1 justify-between gap-1.5">
				<div>
					<div className="flex items-center justify-between">
						<span
							className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
								isSelected ? "bg-[#00C853] text-[#012812] font-black" : "bg-[#142036] text-slate-300 font-semibold"
							}`}
							data-testid={`timeline-time-${study.id}`}
						>
							{timeStr || formattedDate}
						</span>
						{isSelected && (
							<span className="text-[#00C853] font-black text-[9px] uppercase flex items-center gap-0.5">
								<Check className="w-3 h-3 stroke-[3]" /> Активен
							</span>
						)}
					</div>
					<h5 className="text-xs font-bold text-white truncate mt-1" title={study.title || badge.label}>
						{study.title || badge.label}
					</h5>
				</div>

				<PatientTimelineCardActions
					study={study}
					isCbct={isCbct}
					is3DScan={is3DScan}
					onOpenStudio={onOpenStudio}
					onOpenScan3d={onOpenScan3d}
					onOpenViewer={onOpenViewer}
					onOpenControl={onOpenControl}
				/>
			</div>
		</div>
	);
};
