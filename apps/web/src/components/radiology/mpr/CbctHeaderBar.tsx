/**
 * CbctHeaderBar.tsx — Верхняя панель управления просмотрщика КЛКТ (Мандаты 8e, 8b <= 120 строк).
 */

import React from "react";
import type { CbctHeaderBarProps } from "./header/CbctHeaderTypes";
import { CbctHeaderPatientInfo } from "./header/CbctHeaderPatientInfo";
import { CbctHeaderModeTabs } from "./header/CbctHeaderModeTabs";
import { CbctHeaderExportActions } from "./header/CbctHeaderExportActions";
import { CbctHeaderLayoutButtons } from "./header/CbctHeaderLayoutButtons";
import { CbctHeaderStudioMenu } from "./header/CbctHeaderStudioMenu";
import { CbctContrastPopover } from "./CbctContrastPopover";

export * from "./header/CbctHeaderTypes";

export const CbctHeaderBar: React.FC<CbctHeaderBarProps> = (props) => {
	const {
		resolvedPatientName, loadedSliceCount, volume, studioMode, handleSelectStudioMode,
		handleExportToEmr, handleExportCbctToFinance, handleExportPdfReport, onCopySnapshotToClipboard,
		viewLayout, setViewLayout, isFullscreen, handleToggleFullscreenModal, onClose,
		isStudioMenuOpen, setIsStudioMenuOpen, studioMenuRef, handleResetAll, handleAutoDetectArch,
		showDentalArch, setShowDentalArch, showEdgeRulers, setShowEdgeRulers,
		windowWidth, windowLevel, onChangeWindowWidth, onChangeWindowLevel,
		slabThicknessMm, onChangeSlabThicknessMm, slabMode, onChangeSlabMode,
		isUnsharpActive, onToggleUnsharp, onSelectPreset,
	} = props;

	return (
		<header className="h-12 px-3 bg-[var(--paper-strong)] border-b border-[var(--line)] flex items-center justify-between gap-3 select-none flex-shrink-0 z-30">
			<CbctHeaderPatientInfo resolvedPatientName={resolvedPatientName} loadedSliceCount={loadedSliceCount} volume={volume} />
			<CbctHeaderModeTabs studioMode={studioMode} onSelectStudioMode={handleSelectStudioMode} />

			<div className="flex items-center gap-2">
				{onChangeWindowWidth && onChangeWindowLevel && (
					<CbctContrastPopover
						windowWidth={windowWidth ?? 1500}
						windowLevel={windowLevel ?? 300}
						onChangeWindowWidth={onChangeWindowWidth}
						onChangeWindowLevel={onChangeWindowLevel}
						slabThicknessMm={slabThicknessMm ?? 1.0}
						onChangeSlabThicknessMm={onChangeSlabThicknessMm}
						slabMode={slabMode ?? "single"}
						onChangeSlabMode={onChangeSlabMode}
						isUnsharpActive={isUnsharpActive}
						onToggleUnsharp={onToggleUnsharp}
						onSelectPreset={onSelectPreset}
					/>
				)}

				<CbctHeaderExportActions
					handleExportToEmr={handleExportToEmr} handleExportCbctToFinance={handleExportCbctToFinance}
					handleExportPdfReport={handleExportPdfReport} onCopySnapshotToClipboard={onCopySnapshotToClipboard}
				/>

				<CbctHeaderStudioMenu
					isStudioMenuOpen={isStudioMenuOpen}
					setIsStudioMenuOpen={setIsStudioMenuOpen}
					studioMenuRef={studioMenuRef}
					handleResetAll={handleResetAll}
					handleAutoDetectArch={handleAutoDetectArch}
					showDentalArch={showDentalArch}
					setShowDentalArch={setShowDentalArch}
					showEdgeRulers={showEdgeRulers}
					setShowEdgeRulers={setShowEdgeRulers}
				/>

				<CbctHeaderLayoutButtons
					viewLayout={viewLayout}
					setViewLayout={setViewLayout}
					isFullscreen={isFullscreen}
					handleToggleFullscreenModal={handleToggleFullscreenModal}
					onClose={onClose}
				/>
			</div>
		</header>
	);
};
