/**
 * CtStudyViewer.tsx — Карточка и лаунчер исследования КЛКТ 3D
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState } from "react";
import { FileText } from "lucide-react";
import { DicomViewerModal } from "./DicomViewerModal.js";
import { CbctMprImplantStudioModal } from "../radiology/CbctMprImplantStudioModal.js";
import { CtStudySpecsGrid } from "./ctStudy/CtStudySpecsGrid.js";
import { CtStudyHeader } from "./ctStudy/CtStudyHeader.js";

export interface CtStudyViewerProps {
	studyId: string;
	title: string;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	modality?: string | null | undefined;
	manufacturer?: string | null | undefined;
	sliceCount?: number | null | undefined;
	dimensions?: string | null | undefined;
	voxelSpacing?: string | null | undefined;
	capturedAt?: string | null | undefined;
	storagePath?: string | null | undefined;
	bindingStatus?: string | null | undefined;
	bindingConfidence?: number | null | undefined;
	onAttachToVisit?: ((studyId: string) => void) | undefined;
	onOpenStudio?: ((studyId: string) => void) | undefined;
	onOpenControl?: ((studyId: string) => void) | undefined;
	className?: string | undefined;
	dataTestId?: string | undefined;
}

export const CtStudyViewer: React.FC<CtStudyViewerProps> = ({
	studyId, title, patientId, patientName, modality = "CBCT", manufacturer,
	sliceCount = 0, dimensions = "512x512", voxelSpacing = "0.2x0.2x0.2 мм",
	capturedAt, storagePath, bindingStatus = "auto_bound", bindingConfidence = 100,
	onAttachToVisit, onOpenStudio, onOpenControl, className = "", dataTestId,
}) => {
	const [isViewerOpen, setIsViewerOpen] = useState(false);
	const [isStudioOpen, setIsStudioOpen] = useState(false);
	const [selectedViewMode, setSelectedViewMode] = useState<"2d" | "3d_mpr" | "sectioning">("3d_mpr");

	const formattedDate = capturedAt
		? new Date(capturedAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })
		: "Дата не указана";

	return (
		<div
			data-testid={dataTestId || `patient-study-card-${studyId}`}
			className={`rounded-2xl border p-4 space-y-3.5 transition-all shadow-sm ${className}`}
			style={{ background: "var(--paper, #ffffff)", borderColor: "var(--line, #e2e8f0)", color: "var(--ink, #0f172a)" }}
		>
			<CtStudyHeader
				studyId={studyId}
				title={title}
				patientName={patientName}
				modality={modality}
				isAutoBound={bindingStatus === "auto_bound"}
				bindingConfidence={bindingConfidence}
				formattedDate={formattedDate}
				onOpenControl={onOpenControl}
				onOpenStudio={onOpenStudio}
				onLaunchStudioModal={() => setIsStudioOpen(true)}
				onOpenSectioning={() => { setSelectedViewMode("sectioning"); setIsViewerOpen(true); }}
				onOpen2d={() => { setSelectedViewMode("2d"); setIsViewerOpen(true); }}
			/>

			<CtStudySpecsGrid
				manufacturer={manufacturer}
				sliceCount={sliceCount}
				dimensions={dimensions}
				voxelSpacing={voxelSpacing}
			/>

			<div className="flex items-center justify-between pt-1 text-xs">
				<span className="text-xs text-[var(--muted)] truncate max-w-xs" title={storagePath ?? ""}>
					{storagePath ? `Путь: ${storagePath}` : ""}
				</span>
				{onAttachToVisit && (
					<button
						type="button"
						onClick={() => onAttachToVisit(studyId)}
						className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer shadow-2xs"
					>
						<FileText className="w-3.5 h-3.5 text-teal-600" />
						<span>В медицинскую карту</span>
					</button>
				)}
			</div>

			{isViewerOpen && (
				<DicomViewerModal
					isOpen={isViewerOpen}
					onClose={() => setIsViewerOpen(false)}
					title={title}
					patientName={patientName ?? undefined}
					patientId={patientId ?? undefined}
					studyDate={capturedAt ?? undefined}
					initialViewMode={selectedViewMode}
				/>
			)}

			{isStudioOpen && (
				<CbctMprImplantStudioModal
					isOpen={isStudioOpen}
					onClose={() => setIsStudioOpen(false)}
					patientName={patientName ?? undefined}
					patientId={patientId ?? undefined}
					initialStudioMode="implant"
				/>
			)}
		</div>
	);
};

export default CtStudyViewer;
