import type React from "react";
import type {
	ToothData,
	ToothState,
	OdontogramQuadrantId,
	RootResorptionStage,
} from "../toothChartTypes";

export interface ToothArchGridProps {
	archContainerRef: React.RefObject<HTMLDivElement | null>;
	isQuadrantView: boolean;
	currentQuadrant: OdontogramQuadrantId;
	pediatricMode?: boolean | undefined;
	isPediatricEffective: boolean;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isTopQuadrant: boolean;
	activeQuadrantTeeth: number[];
	toothDataMap: Map<number, ToothData>;
	archScale: number;
	topSplit: { left: number[]; right: number[] };
	bottomSplit: { left: number[]; right: number[] };
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	selectedTeeth: number[];
	activeStamp?: ToothState | null | undefined;
	handleToothClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	carouselTooth?: number | undefined;
	onSelectCarouselTooth?: ((num: number) => void) | undefined;
	onOpenStatusSheet?: ((num: number, rect?: DOMRect) => void) | undefined;
	onSurfacesChange?: ((targets: number[], surfaces: readonly string[]) => void) | undefined;
}
