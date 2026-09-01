import type React from "react";
import {
	type ToothData,
	type ToothState,
	type OdontogramQuadrantId,
	TOP_TEETH,
	BOTTOM_TEETH,
	ToothSVG,
	splitArchAtMidline,
	getQuadrantTeeth,
	isQuadrantTop,
	getQuadrantTitle,
	getAdjacentQuadrant,
} from "./ToothChart";

export interface AdultToothChartProps {
	teethData: ToothData[];
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	archScale?: number | undefined;
	className?: string | undefined;
}

export const AdultToothChart: React.FC<AdultToothChartProps> = ({
	teethData = [],
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp = null,
	onToothClick,
	onQuickStateChange,
	useSurfaces,
	showPulpAndCanals = false,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
	activeQuadrant = "all",
	onQuadrantChange,
	archScale = 1,
	className = "",
}) => {
	const topTeethList = customTopTeeth ?? TOP_TEETH;
	const bottomTeethList = customBottomTeeth ?? BOTTOM_TEETH;

	const handleToothClick = (
		e: React.MouseEvent,
		num: number,
		surface?: string,
	) => {
		const rect = e.currentTarget.getBoundingClientRect();
		onToothClick(num, rect, surface);
	};

	const topSplit = splitArchAtMidline(topTeethList);
	const bottomSplit = splitArchAtMidline(bottomTeethList);

	const isQuadrantView = activeQuadrant !== "all";
	const activeQuadrantTeeth = isQuadrantView
		? getQuadrantTeeth(activeQuadrant, topTeethList, bottomTeethList, false)
		: [];
	const isTopQuadrant = isQuadrantTop(activeQuadrant);

	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		onQuadrantChange?.(q);
	};

	return (
		<div className={`adult-tooth-chart-wrapper select-none ${className}`.trim()} data-testid="adult-tooth-chart">
			{isQuadrantView ? (
				/* Focused Single Quadrant Large View */
				<div
					className="tooth-chart-arch-wrapper quadrant-view-wrapper"
					data-testid="adult-quadrant-focused-view"
					style={{
						minWidth: "max-content",
						margin: "0 auto",
						position: "relative",
					}}
				>
					<div className="flex items-center justify-between w-full max-w-lg px-3 py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] mb-2">
						<button
							type="button"
							onClick={() => handleSelectQuadrant(getAdjacentQuadrant(activeQuadrant, "prev", false))}
							className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center gap-1 cursor-pointer transition-colors touch-manipulation"
							title="Предыдущий квадрант"
							data-testid="adult-quadrant-prev-btn"
						>
							← Пред.
						</button>
						<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink)] text-center px-2">
							{getQuadrantTitle(activeQuadrant, false)}
						</span>
						<button
							type="button"
							onClick={() => handleSelectQuadrant(getAdjacentQuadrant(activeQuadrant, "next", false))}
							className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center gap-1 cursor-pointer transition-colors touch-manipulation"
							title="Следующий квадрант"
							data-testid="adult-quadrant-next-btn"
						>
							След. →
						</button>
					</div>

					<div className={`teeth-row ${isTopQuadrant ? "top-row" : "bottom-row"} quadrant-row`}>
						<div className="tooth-quadrant-group focused-quadrant-group">
							{activeQuadrantTeeth.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
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
										pediatricMode={false}
									/>
								);
							})}
						</div>
					</div>
				</div>
			) : (
				/* Full Dual-Arch Adult View (All 32 adult teeth 11–48) */
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
						{/* Left Half (Q1: 18..11) */}
						<div className="tooth-quadrant-group top-left-quad">
							{topSplit.left.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
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
										pediatricMode={false}
									/>
								);
							})}
						</div>

						{/* Midline Vertical Guide Line Notch */}
						<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						{/* Right Half (Q2: 21..28) */}
						<div className="tooth-quadrant-group top-right-quad">
							{topSplit.right.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
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
										pediatricMode={false}
									/>
								);
							})}
						</div>
					</div>

					{/* Horizontal Occlusal Arch Divider */}
					<div className="teeth-divider">
						<div className="divider-line" />
						<div className="divider-center" title="Центр окклюзионной плоскости">
							<div className="divider-diamond" />
						</div>
					</div>

					{/* Lower Arch (Mandible) */}
					<div className="teeth-row bottom-row">
						{/* Left Half (Q4: 48..41) */}
						<div className="tooth-quadrant-group bottom-left-quad">
							{bottomSplit.left.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
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
										pediatricMode={false}
									/>
								);
							})}
						</div>

						{/* Midline Vertical Guide Line Notch */}
						<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						{/* Right Half (Q3: 31..38) */}
						<div className="tooth-quadrant-group bottom-right-quad">
							{bottomSplit.right.map((num) => {
								const tData = (teethData ?? []).find((t) => t.toothNumber === num);
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
										pediatricMode={false}
									/>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
