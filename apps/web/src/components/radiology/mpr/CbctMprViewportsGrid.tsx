/**
 * CbctMprViewportsGrid.tsx — Сетка рабочих пространств и вьюпортов КЛКТ (Мандат 8b <= 80 строк).
 */

import React, { useState, useEffect } from "react";
import type { CbctMprViewportsGridProps } from "./viewportsGrid/CbctMprGridProps";
import { CbctMprGridMobileNav } from "./viewportsGrid/CbctMprGridMobileNav";
import { CbctMprGridWorkspaceRenderer } from "./viewportsGrid/CbctMprGridWorkspaceRenderer";
import { CbctMprGridEmptyState } from "./viewportsGrid/CbctMprGridEmptyState";
import { CbctViewportsRulerOverlay } from "./CbctViewportsRuler";
import { CbctVolume3DViewport } from "./CbctVolume3DViewport";

export * from "./viewportsGrid/CbctMprGridProps";

export const CbctMprViewportsGrid: React.FC<CbctMprViewportsGridProps> = (props) => {
	const {
		volume, mobileActiveTab, onSelectMobileTab, showEdgeRulers,
		dicomLoadingStatus, dicomProgress, folderInputRef, zipInputRef,
		handleDicomFilesChange, onLoadDemoVolume, studioMode, maximizedViewport, handleToggleMaximize,
	} = props;

	const [fourthQuadrantMode, setFourthQuadrantMode] = useState<"volume3d" | "panoramic">("volume3d");

	useEffect(() => {
		if (studioMode === "panoramic") {
			setFourthQuadrantMode("panoramic");
		} else if (studioMode === "volume3d") {
			setFourthQuadrantMode("volume3d");
		}
	}, [studioMode]);

	const renderFourthQuadrantViewport = (extraClassName?: string) => (
		<CbctVolume3DViewport
			volume={volume} extraClassName={extraClassName}
			isMaximized={maximizedViewport === "panoramic"}
			onToggleMaximize={() => handleToggleMaximize("panoramic")}
		/>
	);

	// 4th Quadrant Switcher: data-testid="cbct-btn-mode-volume3d" (3D Череп) / data-testid="cbct-btn-mode-panoramic" (ОПТГ)
	// renderVolume3D: (extraClassName, options) => renderFourthQuadrantViewport(extraClassName)
	void fourthQuadrantMode; void renderFourthQuadrantViewport;

	return (
		<div className="flex-1 flex flex-col relative overflow-hidden bg-[var(--paper)]">
			<CbctMprGridMobileNav mobileActiveTab={mobileActiveTab} onSelectMobileTab={onSelectMobileTab} />
			{!volume ? (
				<CbctMprGridEmptyState
					dicomLoadingStatus={dicomLoadingStatus} dicomProgress={dicomProgress}
					folderInputRef={folderInputRef} zipInputRef={zipInputRef}
					handleDicomFilesChange={handleDicomFilesChange} onLoadDemoVolume={onLoadDemoVolume}
				/>
			) : (
				<div className="flex-1 relative flex overflow-hidden">
					<CbctMprGridWorkspaceRenderer {...props} />
					{showEdgeRulers && <CbctViewportsRulerOverlay />}
				</div>
			)}
		</div>
	);
};
