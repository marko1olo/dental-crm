import React from "react";
import { RadiologyFilmstripDock } from "../RadiologyFilmstripDock.js";
import { SensorStudyMobileBar } from "../SensorStudyMobileBar.js";
import { SensorStudyMobileWlDrawer } from "../SensorStudyMobileWlDrawer.js";
import { SensorStudyMobileStudiesDrawer } from "../SensorStudyMobileStudiesDrawer.js";
import { RadiologyConsultationSplit } from "../RadiologyConsultationSplit.js";
import { ViewerToolbar } from "./ViewerToolbar.js";
import { ViewerCanvasViewport } from "./ViewerCanvasViewport.js";
import type { SensorViewerState, SensorStudyViewerProps } from "./types.js";

export interface SensorStudyViewerLayoutProps {
	readonly state: SensorViewerState;
	readonly props: SensorStudyViewerProps;
}

export const SensorStudyViewerLayout: React.FC<SensorStudyViewerLayoutProps> = ({ state, props }) => {
	const {
		isFullscreen,
		isMobile,
		effectiveStudiesHistory,
		activeStudy,
		setActiveStudy,
		activeTool,
		setActiveTool,
		filters,
		setFilters,
		brightnessPct,
		contrastPct,
		setBrightnessPct,
		setContrastPct,
		handleResetFilters,
		handleClearMeasurements,
		isMobileWlDrawerOpen,
		setIsMobileWlDrawerOpen,
		isMobileFilmstripDrawerOpen,
		setIsMobileFilmstripDrawerOpen,
		handleProcessUploadedFile,
		showConsultationSplit,
		setShowConsultationSplit,
		effectiveTooth,
		measurementsCount,
	} = state;

	const {
		onSelectStudy,
		onInsertToProtocol,
		patientName,
		patientAge,
		patientGender,
		medicalCardNumber,
		className = "",
	} = props;

	return (
		<div
			data-testid="sensor-study-viewer"
			style={{
				position: isFullscreen ? "fixed" : "relative",
				inset: isFullscreen ? 0 : "auto",
				zIndex: isFullscreen ? 99999 : "auto",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#020617",
				color: "#f8fafc",
				userSelect: "none",
				overflow: "hidden",
			}}
			className={`sensor-study-viewer ${className}`}
		>
			{/* Top Clinical Toolbar (Desktop Toolbar or Mobile-First Top Bar) */}
			<ViewerToolbar state={state} props={props} />

			{/* Main Canvas Viewport Area */}
			<ViewerCanvasViewport state={state} props={props} />

			{/* Bottom EzDent-i Filmstrip Dock (Hidden in 100% fullscreen HUD mode) */}
			{!isFullscreen && (
				!isMobile ? (
					<RadiologyFilmstripDock
						studies={effectiveStudiesHistory}
						activeStudyId={activeStudy?.id || null}
						onSelectStudy={(selected) => {
							setActiveStudy(selected);
							if (onSelectStudy) onSelectStudy(selected);
						}}
					/>
				) : (
					<SensorStudyMobileBar
						activeTool={activeTool}
						onSelectTool={setActiveTool}
						invert={filters.invert}
						onToggleInvert={() => setFilters((prev) => ({ ...prev, invert: !prev.invert }))}
						onOpenWl={() => setIsMobileWlDrawerOpen(true)}
						isWlOpen={isMobileWlDrawerOpen}
						hasActiveFilters={
							filters.sharpness ||
							filters.maxSharpness ||
							filters.pseudoRelief ||
							brightnessPct !== 0 ||
							contrastPct !== 0
						}
						onOpenStudies={() => setIsMobileFilmstripDrawerOpen(true)}
						isStudiesOpen={isMobileFilmstripDrawerOpen}
						studiesCount={effectiveStudiesHistory.length}
						measurementsCount={measurementsCount}
						onClearMeasurements={handleClearMeasurements}
					/>
				)
			)}

			{/* Native iOS Bottom Sheet Drawers (Apple HIG) */}
			<SensorStudyMobileWlDrawer
				isOpen={isMobileWlDrawerOpen}
				onClose={() => setIsMobileWlDrawerOpen(false)}
				brightnessPct={brightnessPct}
				contrastPct={contrastPct}
				onBrightnessChange={setBrightnessPct}
				onContrastChange={setContrastPct}
				filters={filters}
				onFilterChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
				onReset={handleResetFilters}
			/>

			<SensorStudyMobileStudiesDrawer
				isOpen={isMobileFilmstripDrawerOpen}
				onClose={() => setIsMobileFilmstripDrawerOpen(false)}
				studies={effectiveStudiesHistory}
				activeStudyId={activeStudy?.id || null}
				onSelectStudy={(selected) => {
					setActiveStudy(selected);
					if (onSelectStudy) onSelectStudy(selected);
					setIsMobileFilmstripDrawerOpen(false);
				}}
				onUploadFile={handleProcessUploadedFile}
			/>

			{showConsultationSplit && (
				<div className="fixed inset-0 z-[100000] bg-[#020617] flex flex-col">
					<RadiologyConsultationSplit
						patientName={(activeStudy as any)?.patientName || patientName}
						patientCardNumber={(activeStudy as any)?.medicalCardNumber || medicalCardNumber}
						patientAge={patientAge}
						patientGender={patientGender}
						activeToothFdi={effectiveTooth}
						initialLeftStudy={activeStudy || undefined}
						patientStudiesHistory={effectiveStudiesHistory}
						onClose={() => setShowConsultationSplit(false)}
						onInsertProtocol={onInsertToProtocol}
					/>
				</div>
			)}
		</div>
	);
};
