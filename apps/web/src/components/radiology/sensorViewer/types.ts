import type React from "react";
import type { RadiologyStudy } from "../types.js";
import type { RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import type { RadiologyQuickFilterState } from "../RadiologyQuickFiltersPanel.js";
import type {
	ViewerPoint2D,
	ViewerRulerMeasurement,
	ViewerCurvedMeasurement,
	ViewerAreaMeasurement,
} from "../dentalViewerMath.js";
import type { RADIOLOGY_STANDARD_PROTOCOLS } from "../radiologyProtocols.js";

export type ViewerTool = "pan" | "ruler" | "curved_canal" | "magnifier" | "lesion_contour";

export interface SensorStudyViewerProps {
	readonly study?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly studiesHistory?: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly onSelectStudy?: ((study: RadiologyStudy | RadiologyFilmstripItem) => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly className?: string;
}

export interface SensorViewerState {
	// Active study and image source
	readonly activeStudy: RadiologyStudy | RadiologyFilmstripItem | null;
	readonly setActiveStudy: React.Dispatch<React.SetStateAction<RadiologyStudy | RadiologyFilmstripItem | null>>;
	readonly activeImageUrl: string;
	readonly effectiveStudiesHistory: readonly (RadiologyStudy | RadiologyFilmstripItem)[];
	readonly effectiveTooth: string;

	// Viewport refs
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly uploadInputRef: React.RefObject<HTMLInputElement | null>;
	readonly protocolsDropdownRef: React.RefObject<HTMLDivElement | null>;

	// Zoom & Pan state
	readonly zoom: number;
	readonly setZoom: React.Dispatch<React.SetStateAction<number>>;
	readonly panX: number;
	readonly setPanX: React.Dispatch<React.SetStateAction<number>>;
	readonly panY: number;
	readonly setPanY: React.Dispatch<React.SetStateAction<number>>;
	readonly activeTool: ViewerTool;
	readonly setActiveTool: React.Dispatch<React.SetStateAction<ViewerTool>>;
	readonly isFullscreen: boolean;
	readonly setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showConsultationSplit: boolean;
	readonly setShowConsultationSplit: React.Dispatch<React.SetStateAction<boolean>>;

	// Quick Filters State
	readonly filters: RadiologyQuickFilterState;
	readonly setFilters: React.Dispatch<React.SetStateAction<RadiologyQuickFilterState>>;
	readonly brightnessPct: number;
	readonly setBrightnessPct: React.Dispatch<React.SetStateAction<number>>;
	readonly contrastPct: number;
	readonly setContrastPct: React.Dispatch<React.SetStateAction<number>>;

	// Protocols & 1-Click Norma
	readonly isNormaApplied: boolean;
	readonly isProtocolsOpen: boolean;
	readonly setIsProtocolsOpen: React.Dispatch<React.SetStateAction<boolean>>;

	// Measurements
	readonly measurements: readonly ViewerRulerMeasurement[];
	readonly draftStart: ViewerPoint2D | null;
	readonly draftCurrent: ViewerPoint2D | null;
	readonly curvedCanals: readonly ViewerCurvedMeasurement[];
	readonly draftCurvedPoints: readonly ViewerPoint2D[];
	readonly lesionContours: readonly ViewerAreaMeasurement[];
	readonly draftLesionPoints: readonly ViewerPoint2D[];
	readonly measurementsCount: number;

	// Magnifier & Export
	readonly magnifierPos: ViewerPoint2D | null;
	readonly isExporting: boolean;

	// Mobile adaptive
	readonly isMobile: boolean;
	readonly isMobileWlDrawerOpen: boolean;
	readonly setIsMobileWlDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isMobileFilmstripDrawerOpen: boolean;
	readonly setIsMobileFilmstripDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;

	// Calibration
	readonly calibratedMmPerPx: number;
	readonly pixelPitchMicrons: number;

	// Actions
	readonly handleResetView: () => void;
	readonly handleResetFilters: () => void;
	readonly handleInsertNorma: () => void;
	readonly handleApplyStandardProtocol: (preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => void;
	readonly handleFinishCurvedCanal: () => void;
	readonly handleFinishLesionContour: () => void;
	readonly handleClearMeasurements: () => void;
	readonly handleExportImage: () => Promise<void>;
	readonly handleProcessUploadedFile: (file: File) => void;
	readonly handleDirectFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly handleClose: () => void;

	// Canvas Event Handlers
	readonly handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleMouseLeave: () => void;
	readonly handleMouseUp: () => void;
	readonly handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly handleTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly handleTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly handleTouchCancel: () => void;
}
