import React from "react";
import {
	MobileToolPanButton, MobileToolRulerButton, MobileToolMagnifierButton,
	MobileToolInvertButton, MobileToolWlButton, MobileToolStudiesButton, MobileToolClearButton,
} from "./mobileBar/index.js";

export * from "./mobileBar/index.js";

export interface SensorStudyMobileBarProps {
	readonly activeTool: "pan" | "ruler" | "curved_canal" | "magnifier" | "lesion_contour";
	readonly onSelectTool: (tool: "pan" | "ruler" | "curved_canal" | "magnifier" | "lesion_contour") => void;
	readonly invert: boolean;
	readonly onToggleInvert: () => void;
	readonly onOpenWl: () => void;
	readonly isWlOpen: boolean;
	readonly hasActiveFilters: boolean;
	readonly onOpenStudies: () => void;
	readonly isStudiesOpen: boolean;
	readonly studiesCount: number;
	readonly measurementsCount: number;
	readonly onClearMeasurements?: () => void;
}

export const SensorStudyMobileBar: React.FC<SensorStudyMobileBarProps> = ({
	activeTool, onSelectTool, invert, onToggleInvert, onOpenWl, isWlOpen,
	hasActiveFilters, onOpenStudies, isStudiesOpen, studiesCount, measurementsCount, onClearMeasurements,
}) => {
	return (
		<div
			data-testid="sensor-viewer-mobile-bottom-bar"
			className="sensor-viewer-mobile-bottom-bar"
			style={{
				position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 45,
				display: "flex", alignItems: "center", justifyContent: "space-around",
				padding: "8px 10px max(12px, env(safe-area-inset-bottom))",
				backgroundColor: "rgba(7, 11, 20, 0.94)",
				backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
				borderTop: "1px solid rgba(255, 255, 255, 0.14)",
				boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.5)", userSelect: "none",
			}}
		>
			<MobileToolPanButton active={activeTool === "pan"} onSelect={() => onSelectTool("pan")} />
			<MobileToolRulerButton active={activeTool === "ruler"} count={measurementsCount} onSelect={() => onSelectTool(activeTool === "ruler" ? "pan" : "ruler")} />
			<MobileToolMagnifierButton active={activeTool === "magnifier"} onSelect={() => onSelectTool(activeTool === "magnifier" ? "pan" : "magnifier")} />
			<MobileToolInvertButton invert={invert} onToggle={onToggleInvert} />
			<MobileToolWlButton isOpen={isWlOpen} hasFilters={hasActiveFilters} onOpen={onOpenWl} />
			<MobileToolStudiesButton isOpen={isStudiesOpen} count={studiesCount} onOpen={onOpenStudies} />
			{measurementsCount > 0 && onClearMeasurements && <MobileToolClearButton onClear={onClearMeasurements} />}
		</div>
	);
};
