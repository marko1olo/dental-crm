import React from "react";
import { Box, ExternalLink, Eye, Settings } from "lucide-react";
import type { ImagingStudy } from "@dental/shared";
import { openCbctPopoutWindow } from "../../../native/desktopBridge";

export interface PatientTimelineCardActionsProps {
	readonly study: ImagingStudy;
	readonly isCbct: boolean;
	readonly is3DScan: boolean;
	readonly onOpenStudio?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenScan3d?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenViewer?: ((study: ImagingStudy) => void) | undefined;
	readonly onOpenControl?: ((study: ImagingStudy) => void) | undefined;
}

export const PatientTimelineCardActions: React.FC<PatientTimelineCardActionsProps> = ({
	study,
	isCbct,
	is3DScan,
	onOpenStudio,
	onOpenScan3d,
	onOpenViewer,
	onOpenControl,
}) => {
	return (
		<div className="flex items-center gap-1.5 pt-1 border-t border-[#172338]">
			{isCbct ? (
				<div className="flex items-center gap-1 flex-1">
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); if (onOpenStudio) onOpenStudio(study); }}
						className="flex-1 h-6 px-1.5 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
						data-testid={`btn-timeline-launch-3d-${study.id}`}
						title="Открыть в 3D MPR Студии прямо в карте"
					>
						<Box className="w-3 h-3" />
						<span>3D КТ</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							openCbctPopoutWindow({
								studyId: study.id,
								patientId: study.patientId || undefined,
								patientName: study.patientFullName || undefined,
								title: `3D КТ - ${study.title || "Исследование"}`,
							});
						}}
						className="h-6 px-1.5 rounded text-[10px] font-bold bg-[#1e293b] hover:bg-[#334155] text-cyan-300 border border-cyan-500/30 inline-flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
						data-testid={`btn-timeline-launch-popout-${study.id}`}
						title="Открыть на 2-м мониторе (в отдельном окне)"
					>
						<ExternalLink className="w-2.5 h-2.5" />
						<span>В окно</span>
					</button>
				</div>
			) : is3DScan ? (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); if (onOpenScan3d) onOpenScan3d(study); else if (onOpenViewer) onOpenViewer(study); }}
					className="flex-1 h-6 px-2 rounded text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
					data-testid={`btn-timeline-launch-scan3d-${study.id}`}
					title="Открыть интраоральный 3D-скан (STL/PLY)"
				>
					<Box className="w-3 h-3 text-teal-200" />
					<span>3D-скан</span>
				</button>
			) : (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); if (onOpenViewer) onOpenViewer(study); }}
					className="flex-1 h-6 px-2 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
					data-testid={`btn-timeline-launch-viewer-${study.id}`}
					title="Открыть снимок в просмотрщике"
				>
					<Eye className="w-3 h-3" />
					<span>Вьюер</span>
				</button>
			)}

			{onOpenControl && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onOpenControl(study); }}
					className="h-6 w-6 rounded bg-[#131f33] hover:bg-[#1a2c47] text-slate-300 hover:text-white border border-[#233554] flex items-center justify-center cursor-pointer transition-colors"
					title="Контроль сопоставления"
				>
					<Settings className="w-3 h-3" />
				</button>
			)}
		</div>
	);
};
