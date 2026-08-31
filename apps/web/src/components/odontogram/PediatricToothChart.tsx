import type React from "react";
import {
	type ToothData,
	type ToothState,
	type OdontogramQuadrantId,
	type RootResorptionStage,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	ToothSVG,
	splitArchAtMidline,
	getQuadrantTeeth,
	isQuadrantTop,
	getQuadrantTitle,
	getAdjacentQuadrant,
} from "./ToothChart";

export interface PediatricToothChartProps {
	teethData: ToothData[];
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	archScale?: number | undefined;
	className?: string | undefined;
}

export const PediatricToothChart: React.FC<PediatricToothChartProps> = ({
	teethData = [],
	mixedDentition = false,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp = null,
	onToothClick,
	onQuickStateChange,
	onResorptionChange,
	useSurfaces,
	showPulpAndCanals = false,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
	activeQuadrant = "all",
	onQuadrantChange,
	archScale = 1,
	className = "",
}) => {
	const topTeethList =
		customTopTeeth ?? (mixedDentition ? MIXED_TOP_TEETH : PEDIATRIC_TOP_TEETH);
	const bottomTeethList =
		customBottomTeeth ?? (mixedDentition ? MIXED_BOTTOM_TEETH : PEDIATRIC_BOTTOM_TEETH);

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
		? getQuadrantTeeth(activeQuadrant, topTeethList, bottomTeethList, true)
		: [];
	const isTopQuadrant = isQuadrantTop(activeQuadrant);

	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		onQuadrantChange?.(q);
	};

	return (
		<div
			className={`pediatric-tooth-chart-wrapper select-none ${className}`.trim()}
			data-testid="pediatric-tooth-chart"
		>
			{isQuadrantView ? (
				/* Focused Single Quadrant View (Q5, Q6, Q7, Q8) */
				<div
					className="tooth-chart-arch-wrapper quadrant-view-wrapper"
					data-testid="pediatric-quadrant-focused-view"
					style={{
						minWidth: "max-content",
						margin: "0 auto",
						position: "relative",
					}}
				>
					<div className="flex items-center justify-between w-full max-w-lg px-3 py-2 rounded-xl bg-[var(--odontogram-surface)] border border-[var(--odontogram-border-subtle)] mb-2">
						<button
							type="button"
							onClick={() => handleSelectQuadrant(getAdjacentQuadrant(activeQuadrant, "prev", true))}
							className="min-h-[36px] min-w-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center gap-1 cursor-pointer transition-colors"
							title="Предыдущий квадрант"
							data-testid="pediatric-quadrant-prev-btn"
						>
							← Пред.
						</button>
						<span className="text-xs sm:text-sm font-black text-[var(--odontogram-ink)] text-center px-2">
							{getQuadrantTitle(activeQuadrant, true)}
						</span>
						<button
							type="button"
							onClick={() => handleSelectQuadrant(getAdjacentQuadrant(activeQuadrant, "next", true))}
							className="min-h-[36px] min-w-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] text-[var(--odontogram-ink)] border border-[var(--odontogram-border-subtle)] flex items-center gap-1 cursor-pointer transition-colors"
							title="Следующий квадрант"
							data-testid="pediatric-quadrant-next-btn"
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
										onResorptionChange={onResorptionChange}
										pediatricMode={true}
									/>
								);
							})}
						</div>
					</div>
				</div>
			) : (
				/* Full Dual-Arch Pediatric/Mixed View */
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
						{/* Left Half (Q5: 55..51 or Mixed Left) */}
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
										onResorptionChange={onResorptionChange}
										pediatricMode={true}
									/>
								);
							})}
						</div>

						{/* Midline Vertical Guide Line Notch */}
						<div className="tooth-arch-midline-guide top-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						{/* Right Half (Q6: 61..65 or Mixed Right) */}
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
										onResorptionChange={onResorptionChange}
										pediatricMode={true}
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
						{/* Left Half (Q8: 85..81 or Mixed Lower Left) */}
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
										onResorptionChange={onResorptionChange}
										pediatricMode={true}
									/>
								);
							})}
						</div>

						{/* Midline Vertical Guide Line Notch */}
						<div className="tooth-arch-midline-guide bottom-guide" title="Сагиттальная линия (Midline)">
							<div className="midline-notch" />
						</div>

						{/* Right Half (Q7: 71..75 or Mixed Lower Right) */}
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
										onResorptionChange={onResorptionChange}
										pediatricMode={true}
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
