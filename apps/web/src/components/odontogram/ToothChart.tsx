import type React from "react";
import { useCallback, memo, useRef } from "react";
import { ToothRadialMenu } from "./ToothRadialMenu";
import {
	type ToothChartProps,
	areToothChartPropsEqual,
} from "./chart/toothChartTypes";
import { DenteToothSvgDefs } from "./chart/DenteToothSvgDefs";
import { ToothChartToolbar } from "./chart/ToothChartToolbar";
import { ToothArchGrid } from "./chart/ToothArchGrid";
import { useToothChartDentition } from "./chart/hooks/useToothChartDentition";
import { useToothChartScaling } from "./chart/hooks/useToothChartScaling";
import { useToothChartExpressActions } from "./chart/hooks/useToothChartExpressActions";

export * from "./chart/toothChartTypes";
export * from "./chart/ToothColors";
export * from "./chart/DenteToothSvgDefs";
export * from "./chart/SurfaceSelector";
export * from "./chart/ToothCardHud";
export * from "./chart/ToothImplantGraphic";
export * from "./chart/ToothStandardGraphic";
export * from "./chart/ToothSvg";
export * from "./chart/ToothChartToolbar";
export * from "./chart/ToothArchGrid";
export * from "./MobileQuadrantTabs";

export const ToothChart: React.FC<ToothChartProps> = memo(({
	teethData = [],
	patientId,
	pediatricMode,
	mixedDentition,
	dentitionMode,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	activeQuadrant: controlledQuadrant,
	onQuadrantChange,
	selectedTeeth = [],
	activeStamp,
	useSurfaces = false,
	showPulpAndCanals = true,
	showPeriapicalHalos = false,
	showPeriodontalBoneLoss = false,
	onToothClick,
	onQuickStateChange,
	onResorptionChange,
	onSurfacesChange,
	onMarkIntactDentition: externalMarkIntact,
	onMarkProHygieneDone,
	onApplyFastCariesK021,
	className = "",
	hideExpressActions = false,
	hideQuadrantSwitcher = false,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);

	const dentition = useToothChartDentition(
		teethData, patientId, pediatricMode, mixedDentition, dentitionMode,
		controlledQuadrant, onQuadrantChange, customTopTeeth, customBottomTeeth, selectedTeeth,
	);

	const archScale = useToothChartScaling(
		archContainerRef, dentition.currentQuadrant, dentition.topTeethList, dentition.bottomTeethList, dentition.isPediatricEffective,
	);

	const actions = useToothChartExpressActions({
		isMixedEffective: dentition.isMixedEffective,
		isPediatricEffective: dentition.isPediatricEffective,
		selectedTeeth,
		externalMarkIntact,
		onQuickStateChange,
		onMarkProHygieneDone,
		onApplyFastCariesK021,
	});

	const toothDataMapRef = useRef(dentition.toothDataMap);
	toothDataMapRef.current = dentition.toothDataMap;
	const onToothClickRef = useRef(onToothClick);
	onToothClickRef.current = onToothClick;
	const onSurfacesChangeRef = useRef(onSurfacesChange);
	onSurfacesChangeRef.current = onSurfacesChange;
	const useSurfacesRef = useRef(useSurfaces);
	useSurfacesRef.current = useSurfaces;

	const handleToothClick = useCallback((e: React.MouseEvent, num: number, surface?: string) => {
		const effectiveSurface = (useSurfacesRef.current || e?.shiftKey || e?.altKey) ? surface : undefined;
		if (effectiveSurface && onSurfacesChangeRef.current) {
			const current = toothDataMapRef.current.get(num)?.surfaces ?? [];
			const nextSurfaces = current.includes(effectiveSurface) ? current.filter((s) => s !== effectiveSurface) : [...current, effectiveSurface];
			onSurfacesChangeRef.current([num], nextSurfaces);
		}
		const el = ((e?.currentTarget || e?.target) as HTMLElement);
		const rect = el && typeof el.getBoundingClientRect === "function" ? el.getBoundingClientRect() : ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);
		if (onToothClickRef.current) {
			(onToothClickRef.current as any)(num, rect, effectiveSurface);
		} else if (!effectiveSurface) {
			dentition.setLocalRadialData({ toothNumber: num, anchorRect: { x: rect?.left ?? 0, y: rect?.top ?? 0, width: rect?.width || 48, height: rect?.height || 90 }, currentState: toothDataMapRef.current.get(num)?.state ?? "Healthy" });
		}
		dentition.setCarouselTooth(num);
	}, [dentition]);

	return (
		<div className={`tooth-chart-container ${className}`.trim()} ref={containerRef}>
			<DenteToothSvgDefs />
			<ToothChartToolbar hideExpressActions={hideExpressActions} hideQuadrantSwitcher={hideQuadrantSwitcher} currentQuadrant={dentition.currentQuadrant} isPediatricEffective={dentition.isPediatricEffective} isMixedEffective={dentition.isMixedEffective} pediatricMode={pediatricMode} {...actions} handleSelectQuadrant={dentition.handleSelectQuadrant} mobileDisplayMode={dentition.mobileDisplayMode} onToggleMobileDisplayMode={dentition.setMobileDisplayMode} />
			<ToothArchGrid archContainerRef={archContainerRef} isQuadrantView={dentition.isQuadrantView} currentQuadrant={dentition.currentQuadrant} pediatricMode={pediatricMode} isPediatricEffective={dentition.isPediatricEffective} handleSelectQuadrant={dentition.handleSelectQuadrant} isTopQuadrant={dentition.isTopQuadrant} activeQuadrantTeeth={dentition.activeQuadrantTeeth} toothDataMap={dentition.toothDataMap} archScale={archScale} topSplit={dentition.topSplit} bottomSplit={dentition.bottomSplit} useSurfaces={useSurfaces} showPulpAndCanals={showPulpAndCanals} showPeriapicalHalos={showPeriapicalHalos} showPeriodontalBoneLoss={showPeriodontalBoneLoss} selectedTeeth={selectedTeeth} activeStamp={activeStamp} handleToothClick={handleToothClick} onQuickStateChange={onQuickStateChange} onResorptionChange={onResorptionChange} mobileDisplayMode={dentition.mobileDisplayMode} carouselTooth={dentition.carouselTooth} onSelectCarouselTooth={dentition.setCarouselTooth} onOpenStatusSheet={(num, rect) => dentition.setLocalRadialData({ toothNumber: num, anchorRect: { x: rect?.left ?? 195, y: rect?.top ?? 400, width: rect?.width || 120, height: rect?.height || 140 }, currentState: dentition.toothDataMap.get(num)?.state ?? "Healthy" })} onSurfacesChange={onSurfacesChange} />
			{dentition.localRadialData && (
				<ToothRadialMenu toothNumber={dentition.localRadialData.toothNumber} anchorRect={dentition.localRadialData.anchorRect} currentState={dentition.localRadialData.currentState} surfaces={dentition.toothDataMap.get(dentition.localRadialData.toothNumber)?.surfaces} onSelectState={(state, surfs) => { onQuickStateChange?.([dentition.localRadialData!.toothNumber], state, surfs); dentition.setLocalRadialData(null); }} onSelectSurfaces={(surfs) => onSurfacesChange?.([dentition.localRadialData!.toothNumber], surfs)} onClose={() => dentition.setLocalRadialData(null)} />
			)}
		</div>
	);
}, areToothChartPropsEqual);
ToothChart.displayName = "ToothChart";
export default ToothChart;
