/**
 * CbctHeaderTypes.ts — Пропсы и типы шапки просмотрщика КЛКТ (Мандат 8b).
 */

import type React from "react";
import type { CbctViewportType, CbctVoxelVolume, SlabProjectionMode } from "../../cbctMprMath";
import type { StudioMode, ViewLayoutMode } from "../cbctStudioTypes";

export interface CbctHeaderBarProps {
	readonly modalId: string;
	readonly patientDisplayName: string;
	readonly resolvedPatientName: string;
	readonly loadedSliceCount: number;
	readonly volume: CbctVoxelVolume | null;
	readonly studioMode: StudioMode;
	readonly handleSelectStudioMode: (mode: StudioMode) => void;
	readonly handleExportToEmr: () => void;
	readonly handleExportCbctToFinance?: (() => void) | undefined;
	readonly handleExportToPlan?: (() => void) | undefined;
	readonly handleExportToLab?: (() => void) | undefined;
	readonly isSidebarOpen: boolean;
	readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isStudioMenuOpen: boolean;
	readonly setIsStudioMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly studioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly handleResetAll: () => void;
	readonly handleAutoDetectArch: () => void;
	readonly showDentalArch: boolean;
	readonly setShowDentalArch: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showEdgeRulers?: boolean | undefined;
	readonly setShowEdgeRulers?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	readonly handleExportPdfReport: () => void;
	readonly maximizedViewport: CbctViewportType | null;
	readonly setMaximizedViewport: (viewport: CbctViewportType | null) => void;
	readonly viewLayout: ViewLayoutMode;
	readonly setViewLayout: (layout: ViewLayoutMode) => void;
	readonly isFullscreen: boolean;
	readonly handleToggleFullscreenModal: () => void;
	readonly onClose: () => void;
	readonly activePresetId?: string | undefined;
	readonly onSelectPreset?: ((presetId: string) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined;
	readonly onChangeCrossSectionStepMm?: ((stepMm: number) => void) | undefined;
	readonly isUnsharpActive?: boolean | undefined;
	readonly onToggleUnsharp?: (() => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly onChangeWindowWidth?: ((w: number) => void) | undefined;
	readonly windowLevel?: number | undefined;
	readonly onChangeWindowLevel?: ((l: number) => void) | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly onChangeSlabThicknessMm?: ((th: number) => void) | undefined;
	readonly slabMode?: SlabProjectionMode | undefined;
	readonly onChangeSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;
	readonly panoThicknessMm?: number | undefined;
	readonly onChangePanoThicknessMm?: ((th: number) => void) | undefined;
	readonly onSelectClinicalPreset?: ((presetId: string) => void) | undefined;
	readonly onCopySnapshotToClipboard?: (() => void) | undefined;
	readonly onOpenComparisonSplit?: (() => void) | undefined;
	readonly onOpenPopoutWindow?: (() => void) | undefined;
	readonly isStandaloneWindow?: boolean | undefined;
	readonly studyId?: string | undefined;
	readonly patientId?: string | undefined;
}
