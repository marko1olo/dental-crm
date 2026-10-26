import type React from "react";
import type { HuProfileStats } from "../rvgViewerEngine.js";
import type {
	ClippingDir,
	ClippingPlane,
	ClippingRef,
	DicomTabType,
	DicomViewportExtended,
} from "./types.js";

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
