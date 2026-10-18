import type React from "react";
import { memo } from "react";
import type {
	ToothData,
	ToothState,
	OdontogramQuadrantId,
	RootResorptionStage,
} from "../toothChartTypes";
import {
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
} from "../toothChartTypes";
import { ToothArchGroup } from "./ToothArchGroup";

export interface QuadrantArchViewProps {
	currentQuadrant: OdontogramQuadrantId;
	pediatricMode?: boolean | undefined;
	isPediatricEffective: boolean;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isTopQuadrant: boolean;
	activeQuadrantTeeth: number[];
	toothDataMap: Map<number, ToothData>;
	archScale: number;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	selectedTeeth: number[];
	activeStamp?: ToothState | null | undefined;
	handleToothClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
}

export const QuadrantArchView: React.FC<QuadrantArchViewProps> = memo(({
	currentQuadrant,
	pediatricMode,
	isPediatricEffective,
	handleSelectQuadrant,
	isTopQuadrant,
	activeQuadrantTeeth,
	toothDataMap,
	archScale,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos,
	showPeriodontalBoneLoss,
	selectedTeeth,
	activeStamp,
	handleToothClick,
	onQuickStateChange,
	onResorptionChange,
}) => {
	const quadTeethMap: Record<string, string> = {
		Q1: "18–11", Q2: "21–28", Q3: "31–38", Q4: "48–41",
		Q5: "55–51", Q6: "61–65", Q7: "71–75", Q8: "85–81",
	};

	return (
		<div className="tooth-chart-arch-wrapper quadrant-view-wrapper w-full max-w-full" data-testid="quadrant-focused-view" style={{ width: "100%", maxWidth: "100%", margin: "0 auto", position: "relative" }}>
			<div className="hidden sm:flex items-center justify-between w-full max-w-lg px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] mb-2 gap-1.5">
				<button
					type="button"
					onClick={() => handleSelectQuadrant(getAdjacentQuadrant(currentQuadrant, "prev", pediatricMode))}
					className="min-h-[36px] sm:min-h-[32px] min-w-[36px] sm:min-w-[44px] px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
					title="Предыдущий квадрант"
					data-testid="quadrant-prev-btn"
				>
					<span>←</span>
					<span className="hidden sm:inline"> Пред.</span>
				</button>
				<div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1 text-center">
					<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink)] leading-tight text-center">
						<span className="sm:hidden">
							{isQuadrantTop(currentQuadrant) ? "В/Ч" : "Н/Ч"} ({currentQuadrant}) • {quadTeethMap[currentQuadrant] ?? ""}
						</span>
						<span className="hidden sm:inline">
							{getQuadrantTitle(currentQuadrant, pediatricMode)}
						</span>
					</span>
				</div>
				<button
					type="button"
					onClick={() => handleSelectQuadrant(getAdjacentQuadrant(currentQuadrant, "next", pediatricMode))}
					className="min-h-[36px] sm:min-h-[32px] min-w-[36px] sm:min-w-[44px] px-2 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0 shadow-2xs"
					title="Следующий квадрант"
					data-testid="quadrant-next-btn"
				>
					<span className="hidden sm:inline">След. </span>
					<span>→</span>
				</button>
			</div>

			<div className={`teeth-row ${isTopQuadrant ? "top-row" : "bottom-row"} quadrant-row`}>
				<ToothArchGroup
					teeth={activeQuadrantTeeth}
					toothDataMap={toothDataMap}
					scale={Math.max(1.0, archScale)}
					useSurfaces={useSurfaces}
					showPulpAndCanals={showPulpAndCanals}
					showPeriapicalHalos={showPeriapicalHalos}
					showPeriodontalBoneLoss={showPeriodontalBoneLoss}
					selectedTeeth={selectedTeeth}
					activeStamp={activeStamp}
					handleToothClick={handleToothClick}
					onQuickStateChange={onQuickStateChange}
					onResorptionChange={onResorptionChange}
					pediatricMode={isPediatricEffective}
					className="tooth-quadrant-group focused-quadrant-group"
				/>
			</div>
		</div>
	);
});
QuadrantArchView.displayName = "QuadrantArchView";
