import type React from "react";
import { memo } from "react";
import { ToothCarouselFocus } from "./ToothCarouselFocus";
import { QuadrantArchView } from "./arch/QuadrantArchView";
import { FullArchView } from "./arch/FullArchView";
import type { ToothArchGridProps } from "./arch/toothArchGridProps";

export type { ToothArchGridProps };

export const ToothArchGrid: React.FC<ToothArchGridProps> = memo(({
	archContainerRef,
	isQuadrantView,
	currentQuadrant,
	pediatricMode,
	isPediatricEffective,
	handleSelectQuadrant,
	isTopQuadrant,
	activeQuadrantTeeth,
	toothDataMap,
	archScale,
	topSplit,
	bottomSplit,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos,
	showPeriodontalBoneLoss,
	selectedTeeth,
	activeStamp,
	handleToothClick,
	onQuickStateChange,
	onResorptionChange,
	mobileDisplayMode,
	carouselTooth,
	onSelectCarouselTooth,
	onOpenStatusSheet,
	onSurfacesChange,
}) => (
	<div className="tooth-chart-arch-container" ref={archContainerRef}>
		{mobileDisplayMode === "carousel" ? (
			<ToothCarouselFocus
				toothNumber={
					carouselTooth ??
					(selectedTeeth.length > 0
						? selectedTeeth[0]!
						: (activeQuadrantTeeth[0] || (isPediatricEffective ? 55 : 16)))
				}
				toothDataMap={toothDataMap}
				isPediatricEffective={isPediatricEffective}
				pediatricMode={pediatricMode}
				onSelectTooth={(num) => onSelectCarouselTooth?.(num)}
				onOpenStatusSheet={(num, rect) => {
					if (onOpenStatusSheet) {
						onOpenStatusSheet(num, rect);
					} else {
						handleToothClick({} as any, num);
					}
				}}
				onQuickStateChange={onQuickStateChange}
				onSurfacesChange={onSurfacesChange}
				showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos}
				showPeriodontalBoneLoss={showPeriodontalBoneLoss}
				useSurfaces={useSurfaces}
			/>
		) : isQuadrantView ? (
			<QuadrantArchView
				currentQuadrant={currentQuadrant}
				pediatricMode={pediatricMode}
				isPediatricEffective={isPediatricEffective}
				handleSelectQuadrant={handleSelectQuadrant}
				isTopQuadrant={isTopQuadrant}
				activeQuadrantTeeth={activeQuadrantTeeth}
				toothDataMap={toothDataMap}
				archScale={archScale}
				useSurfaces={useSurfaces}
				showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos}
				showPeriodontalBoneLoss={showPeriodontalBoneLoss}
				selectedTeeth={selectedTeeth}
				activeStamp={activeStamp}
				handleToothClick={handleToothClick}
				onQuickStateChange={onQuickStateChange}
				onResorptionChange={onResorptionChange}
			/>
		) : (
			<FullArchView
				topSplit={topSplit}
				bottomSplit={bottomSplit}
				toothDataMap={toothDataMap}
				archScale={archScale}
				useSurfaces={useSurfaces}
				showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos}
				showPeriodontalBoneLoss={showPeriodontalBoneLoss}
				selectedTeeth={selectedTeeth}
				activeStamp={activeStamp}
				handleToothClick={handleToothClick}
				onQuickStateChange={onQuickStateChange}
				onResorptionChange={onResorptionChange}
				isPediatricEffective={isPediatricEffective}
			/>
		)}
	</div>
));
ToothArchGrid.displayName = "ToothArchGrid";
