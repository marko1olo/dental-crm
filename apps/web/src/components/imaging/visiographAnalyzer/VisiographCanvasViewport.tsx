import { Loader2 } from "lucide-react";
import React from "react";
import { VisiographViewport } from "../VisiographViewport.js";
import {
	RadiologyFilmstripDock,
	type RadiologyFilmstripItem,
} from "../../radiology/RadiologyFilmstripDock.js";
import type { VisiographCanvasViewportProps } from "./types.js";

export function VisiographCanvasViewport({
	isStudioMode,
	currentImageUrl,
	effectivePatientId,
	currentScan,
	initialStudioTool,
	quickPreset,
	onCloseStudio,
	filmstripItems,
	onSelectStudy,
	onDoubleClickStudy,
	isSaving,
}: VisiographCanvasViewportProps) {
	return (
		<>
			{/* Viewport */}
			<VisiographViewport
				isStudioMode={isStudioMode}
				currentImageUrl={currentImageUrl}
				effectivePatientId={effectivePatientId}
				currentScan={currentScan}
				initialStudioTool={initialStudioTool}
				quickPreset={quickPreset}
				onCloseStudio={onCloseStudio}
			/>

			{/* Persistent EzDent-i Bottom Filmstrip Dock for 1-Click Patient X-Ray Switching */}
			{filmstripItems.length > 0 && !isStudioMode && (
				<div className="rounded-xl overflow-hidden border border-[var(--line)] shadow-xs">
					<RadiologyFilmstripDock
						studies={filmstripItems as RadiologyFilmstripItem[]}
						activeStudyId={currentScan?.id || null}
						onSelectStudy={onSelectStudy}
						onDoubleClickStudy={onDoubleClickStudy}
					/>
				</div>
			)}

			{/* Saving indicator */}
			{isSaving && (
				<div
					style={{
						fontSize: "0.8rem",
						color: "var(--muted)",
						display: "flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<Loader2 size={12} className="animate-spin" /> Сохранение в карту пациента...
				</div>
			)}
		</>
	);
}
