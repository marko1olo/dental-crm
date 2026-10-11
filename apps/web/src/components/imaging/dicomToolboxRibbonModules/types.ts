/**
 * DENTE CRM — DICOM Toolbox Ribbon Type Contracts (Layer 0)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import type React from "react";
import type {
	CalibratedRulerMeasurement,
	DicomViewportState,
	HuProfileStats,
} from "../rvgViewerEngine.js";

export type ClippingPlane = "sagittal" | "coronal" | "axial" | "custom";
export type ClippingRef = "user" | "arch_center" | "symphysis";
export type ClippingDir = "left" | "right";
export type DicomTabType = "2D" | "MPR" | "SECTION" | "3D_PANO" | "TMJ";

export type DicomViewportExtended = DicomViewportState & {
	smooth?: boolean;
	maxRes?: boolean;
	mip?: boolean;
	vr?: boolean;
	clippingActive?: boolean;
	clippingPlane?: ClippingPlane;
	clippingDirection?: ClippingDir;
};

export interface DicomToolboxRibbonProps {
	readonly activeTool: string;
	readonly onSelectTool: (tool: string) => void;
	readonly viewportState: DicomViewportExtended;
	readonly onViewportChange: (nextState: Partial<DicomViewportExtended>) => void;
	readonly measurements?: readonly CalibratedRulerMeasurement[] | undefined;
	readonly onResetView?: (() => void) | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly activeTab?: DicomTabType | undefined;
	readonly onTabChange?: ((tab: DicomTabType) => void) | undefined;
	readonly onNormaClick?: (() => void) | undefined;
	readonly isNormaApplied?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onAiAnalyze?: (() => void) | undefined;
	readonly isAiAnalyzing?: boolean | undefined;
	readonly aiReport?: string | null | undefined;
	readonly hasAiFindings?: boolean | undefined;
	readonly onToggleFindingsDrawer?: (() => void) | undefined;
}

export type Ez3dToolboxRibbonProps = DicomToolboxRibbonProps;

export interface DicomRibbonControllerResult {
	isMeasureMenuOpen: boolean;
	setIsMeasureMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isWindowPanelOpen: boolean;
	setIsWindowPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isClippingPanelOpen: boolean;
	setIsClippingPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isHuModalOpen: boolean;
	setIsHuModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
	isFullscreen: boolean;
	activeTab: DicomTabType;
	setTab: (tab: DicomTabType) => void;
	clippingPlane: ClippingPlane;
	setClippingPlane: (plane: ClippingPlane) => void;
	clippingRef: ClippingRef;
	setClippingRef: (ref: ClippingRef) => void;
	clippingDir: ClippingDir;
	setClippingDir: (dir: ClippingDir) => void;
	isClippingApplied: boolean;
	huProfileStats: HuProfileStats | null;
	measureMenuRef: React.RefObject<HTMLDivElement | null>;
	windowPanelRef: React.RefObject<HTMLDivElement | null>;
	clippingPanelRef: React.RefObject<HTMLDivElement | null>;
	handleInstantScreenCapture: (copyToClipboardOnly?: boolean) => Promise<void>;
	handleOpenHuProfile: () => void;
	handleInsertHuToProtocol: () => void;
	toggleFullscreen: () => void;
	handleApplyClippingToggle: () => void;
}

export interface DicomQuickAccessBarProps {
	readonly activeTool: string;
	readonly onSelectTool: (tool: string) => void;
	readonly activeTab: DicomTabType;
	readonly onTabChange: (tab: DicomTabType) => void;
	readonly viewportState: DicomViewportExtended;
	readonly onViewportChange: (nextState: Partial<DicomViewportExtended>) => void;
	readonly isMeasureMenuOpen: boolean;
	readonly onToggleMeasureMenu: () => void;
	readonly onCloseMeasureMenu: () => void;
	readonly measureMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly onOpenHuProfile: () => void;
	readonly onInstantScreenCapture: (copyToClipboardOnly?: boolean) => Promise<void>;
	readonly isWindowPanelOpen: boolean;
	readonly onToggleWindowPanel: () => void;
	readonly isClippingPanelOpen: boolean;
	readonly onToggleClippingPanel: () => void;
	readonly isClippingApplied: boolean;
	readonly onAiAnalyze?: (() => void) | undefined;
	readonly isAiAnalyzing?: boolean | undefined;
	readonly aiReport?: string | null | undefined;
	readonly hasAiFindings?: boolean | undefined;
	readonly onToggleFindingsDrawer?: (() => void) | undefined;
	readonly onNormaClick?: (() => void) | undefined;
	readonly isNormaApplied?: boolean | undefined;
	readonly patientName?: string | undefined;
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly onClose?: (() => void) | undefined;
}

export interface DicomWindowLevelPanelProps {
	readonly panelRef: React.RefObject<HTMLDivElement | null>;
	readonly viewportState: DicomViewportExtended;
	readonly onViewportChange: (nextState: Partial<DicomViewportExtended>) => void;
}

export interface DicomClippingRoiPanelProps {
	readonly panelRef: React.RefObject<HTMLDivElement | null>;
	readonly clippingPlane: ClippingPlane;
	readonly onChangeClippingPlane: (plane: ClippingPlane) => void;
	readonly clippingRef: ClippingRef;
	readonly onChangeClippingRef: (ref: ClippingRef) => void;
	readonly clippingDir: ClippingDir;
	readonly onChangeClippingDir: (dir: ClippingDir) => void;
	readonly isClippingApplied: boolean;
	readonly onToggleClipping: () => void;
	readonly onClose: () => void;
}

export interface DicomBoneDensityModalProps {
	readonly isOpen: boolean;
	readonly stats: HuProfileStats | null;
	readonly onClose: () => void;
	readonly onInsertToProtocol: () => void;
}
