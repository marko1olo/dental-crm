/**
 * CbctMprViewportsGrid.tsx — Сетка рабочих пространств и вьюпортов КЛКТ (Мандат 8b <= 120 строк).
 */

import React from "react";
import type { CbctMprViewportsGridProps } from "./viewportsGrid/CbctMprGridProps";
import { CbctMprGridMobileNav } from "./viewportsGrid/CbctMprGridMobileNav";
import { CbctMprGridWorkspaceRenderer } from "./viewportsGrid/CbctMprGridWorkspaceRenderer";
import { CbctMprGridEmptyState } from "./viewportsGrid/CbctMprGridEmptyState";
import { CbctViewportsRulerOverlay } from "./CbctViewportsRuler";

export * from "./viewportsGrid/CbctMprGridProps";

export const CbctMprViewportsGrid: React.FC<CbctMprViewportsGridProps> = (props) => {
	const {
		volume,
		mobileActiveTab,
		onSelectMobileTab,
		showEdgeRulers,
		dicomLoadingStatus,
		dicomProgress,
		folderInputRef,
		zipInputRef,
		handleDicomFilesChange,
		onLoadDemoVolume,
	} = props;

	return (
		<div className="flex-1 flex flex-col relative overflow-hidden bg-[var(--paper)]">
			<CbctMprGridMobileNav
				mobileActiveTab={mobileActiveTab}
				onSelectMobileTab={onSelectMobileTab}
			/>

			{!volume ? (
				<CbctMprGridEmptyState
					dicomLoadingStatus={dicomLoadingStatus}
					dicomProgress={dicomProgress}
					folderInputRef={folderInputRef}
					zipInputRef={zipInputRef}
					handleDicomFilesChange={handleDicomFilesChange}
					onLoadDemoVolume={onLoadDemoVolume}
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
