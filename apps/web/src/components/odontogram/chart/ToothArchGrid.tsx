import type React from "react";
import { memo } from "react";
import type {
	ToothData,
	ToothState,
	OdontogramQuadrantId,
	RootResorptionStage,
} from "./toothChartTypes";
import {
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
} from "./toothChartTypes";
import { ToothSVG } from "./ToothSvg";

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
}

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
}) => (
	<div className="tooth-chart-arch-container" ref={archContainerRef}>
		{isQuadrantView ? (
			/* Focused Single Quadrant Large Mobile View */
			<div
				className="tooth-chart-arch-wrapper quadrant-view-wrapper"
				data-testid="quadrant-focused-view"
				style={{
					minWidth: "max-content",
					margin: "0 auto",
					position: "relative",
				}}
			>
				<div className="flex items-center justify-between w-full max-w-lg px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] mb-2 gap-1.5">
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
								{isQuadrantTop(currentQuadrant) ? "В/Ч" : "Н/Ч"} ({currentQuadrant}) • {currentQuadrant === "Q1" ? "18–11" : currentQuadrant === "Q2" ? "21–28" : currentQuadrant === "Q3" ? "31–38" : currentQuadrant === "Q4" ? "48–41" : currentQuadrant === "Q5" ? "55–51" : currentQuadrant === "Q6" ? "61–65" : currentQuadrant === "Q7" ? "71–75" : "85–81"}
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
					<div className="tooth-quadrant-group focused-quadrant-group">
						{(Array.isArray(activeQuadrantTeeth) ? activeQuadrantTeeth : []).map((num) => {
							const tData = toothDataMap.get(num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={Math.max(0.85, archScale)}
									state={tData ? tData.state : "Healthy"}
									material={tData?.material}
									canalObturation={tData?.canalObturation}
									hasPost={tData?.hasPost}
									postType={tData?.postType}
									boneLossLevel={tData?.boneLossLevel}
									boneLossType={tData?.boneLossType}
									rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
									periapicalLesion={tData?.periapicalLesion}
									pocketDepth={tData?.pocketDepth}
									pocketDepthMm={tData?.pocketDepthMm}
									maxPocketDepth={tData?.maxPocketDepth}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									showPulpAndCanals={showPulpAndCanals}
									showPeriapicalHalos={showPeriapicalHalos}
									showPeriodontalBoneLoss={showPeriodontalBoneLoss}
									isSelected={selectedTeeth.includes(num)}
									selectedTeeth={selectedTeeth}
									activeStamp={activeStamp}
									onClick={handleToothClick}
									onQuickStateChange={onQuickStateChange}
									onResorptionChange={onResorptionChange}
									pediatricMode={isPediatricEffective}
								/>
							);
						})}
					</div>
				</div>
			</div>
		) : (
			/* Full Dual-Arch View */
			<div
				className="tooth-chart-arch-wrapper"
				style={{
					minWidth: "max-content",
					margin: "0 auto",
					position: "relative",
				}}
			>
				{/* Upper Arch (Maxilla) */}
				<div className="teeth-row top-row">
					<div className="tooth-quadrant-group top-left-quad">
						{topSplit.left.map((num) => {
							const tData = toothDataMap.get(num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={archScale}
									state={tData ? tData.state : "Healthy"}
									material={tData?.material}
									canalObturation={tData?.canalObturation}
									hasPost={tData?.hasPost}
									postType={tData?.postType}
									boneLossLevel={tData?.boneLossLevel}
									boneLossType={tData?.boneLossType}
									rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
									periapicalLesion={tData?.periapicalLesion}
									pocketDepth={tData?.pocketDepth}
									pocketDepthMm={tData?.pocketDepthMm}
									maxPocketDepth={tData?.maxPocketDepth}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									showPulpAndCanals={showPulpAndCanals}
									showPeriapicalHalos={showPeriapicalHalos}
									showPeriodontalBoneLoss={showPeriodontalBoneLoss}
									isSelected={selectedTeeth.includes(num)}
									selectedTeeth={selectedTeeth}
									activeStamp={activeStamp}
									onClick={handleToothClick}
									onQuickStateChange={onQuickStateChange}
									onResorptionChange={onResorptionChange}
									pediatricMode={isPediatricEffective}
								/>
							);
						})}
					</div>

					<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
						<div className="midline-notch" />
					</div>

					<div className="tooth-quadrant-group top-right-quad">
						{topSplit.right.map((num) => {
							const tData = toothDataMap.get(num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={archScale}
									state={tData ? tData.state : "Healthy"}
									material={tData?.material}
									canalObturation={tData?.canalObturation}
									hasPost={tData?.hasPost}
									postType={tData?.postType}
									boneLossLevel={tData?.boneLossLevel}
									boneLossType={tData?.boneLossType}
									rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
									periapicalLesion={tData?.periapicalLesion}
									pocketDepth={tData?.pocketDepth}
									pocketDepthMm={tData?.pocketDepthMm}
									maxPocketDepth={tData?.maxPocketDepth}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									showPulpAndCanals={showPulpAndCanals}
									showPeriapicalHalos={showPeriapicalHalos}
									showPeriodontalBoneLoss={showPeriodontalBoneLoss}
									isSelected={selectedTeeth.includes(num)}
									selectedTeeth={selectedTeeth}
									activeStamp={activeStamp}
									onClick={handleToothClick}
									onQuickStateChange={onQuickStateChange}
									onResorptionChange={onResorptionChange}
									pediatricMode={isPediatricEffective}
								/>
							);
						})}
					</div>
				</div>

				{/* Horizontal Dental Occlusal Plane Guide */}
				<div className="tooth-arch-occlusal-plane" title="Окклюзионная плоскость" />

				{/* Lower Arch (Mandible) */}
				<div className="teeth-row bottom-row">
					<div className="tooth-quadrant-group bottom-left-quad">
						{bottomSplit.left.map((num) => {
							const tData = toothDataMap.get(num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={archScale}
									state={tData ? tData.state : "Healthy"}
									material={tData?.material}
									canalObturation={tData?.canalObturation}
									hasPost={tData?.hasPost}
									postType={tData?.postType}
									boneLossLevel={tData?.boneLossLevel}
									boneLossType={tData?.boneLossType}
									rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
									periapicalLesion={tData?.periapicalLesion}
									pocketDepth={tData?.pocketDepth}
									pocketDepthMm={tData?.pocketDepthMm}
									maxPocketDepth={tData?.maxPocketDepth}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									showPulpAndCanals={showPulpAndCanals}
									showPeriapicalHalos={showPeriapicalHalos}
									showPeriodontalBoneLoss={showPeriodontalBoneLoss}
									isSelected={selectedTeeth.includes(num)}
									selectedTeeth={selectedTeeth}
									activeStamp={activeStamp}
									onClick={handleToothClick}
									onQuickStateChange={onQuickStateChange}
									onResorptionChange={onResorptionChange}
									pediatricMode={isPediatricEffective}
								/>
							);
						})}
					</div>

					<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
						<div className="midline-notch" />
					</div>

					<div className="tooth-quadrant-group bottom-right-quad">
						{bottomSplit.right.map((num) => {
							const tData = toothDataMap.get(num);
							return (
								<ToothSVG
									key={num}
									number={num}
									scale={archScale}
									state={tData ? tData.state : "Healthy"}
									material={tData?.material}
									canalObturation={tData?.canalObturation}
									hasPost={tData?.hasPost}
									postType={tData?.postType}
									boneLossLevel={tData?.boneLossLevel}
									boneLossType={tData?.boneLossType}
									rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
									periapicalLesion={tData?.periapicalLesion}
									pocketDepth={tData?.pocketDepth}
									pocketDepthMm={tData?.pocketDepthMm}
									maxPocketDepth={tData?.maxPocketDepth}
									surfaces={tData?.surfaces}
									useSurfaces={useSurfaces}
									showPulpAndCanals={showPulpAndCanals}
									showPeriapicalHalos={showPeriapicalHalos}
									showPeriodontalBoneLoss={showPeriodontalBoneLoss}
									isSelected={selectedTeeth.includes(num)}
									selectedTeeth={selectedTeeth}
									activeStamp={activeStamp}
									onClick={handleToothClick}
									onQuickStateChange={onQuickStateChange}
									onResorptionChange={onResorptionChange}
									pediatricMode={isPediatricEffective}
								/>
							);
						})}
					</div>
				</div>
			</div>
		)}
	</div>
));
ToothArchGrid.displayName = "ToothArchGrid";
