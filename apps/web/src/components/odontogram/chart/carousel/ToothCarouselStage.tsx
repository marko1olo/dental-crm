import type React from "react";
import { memo } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { ToothSVG } from "../ToothSvg";
import type { ToothData, ToothState } from "../toothChartTypes";

export interface ToothCarouselStageProps {
	stageRef: React.RefObject<HTMLDivElement | null>;
	toothNumber: number;
	prevTooth: number;
	nextTooth: number;
	currentState: ToothState;
	currentToothData?: ToothData | undefined;
	currentSurfaces: readonly string[];
	useSurfaces: boolean;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	isPediatricEffective: boolean;
	handlePrev: () => void;
	handleNext: () => void;
	handleStageClick: (e: React.MouseEvent) => void;
}

export const ToothCarouselStage: React.FC<ToothCarouselStageProps> = memo(({
	stageRef, toothNumber, prevTooth, nextTooth, currentState, currentToothData,
	currentSurfaces, useSurfaces, showPulpAndCanals, showPeriapicalHalos, showPeriodontalBoneLoss,
	isPediatricEffective, handlePrev, handleNext, handleStageClick,
}) => {
	const navBtnCls = "min-h-[48px] min-w-[48px] w-12 h-12 rounded-2xl bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] flex flex-col items-center justify-center text-[var(--odontogram-ink)] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0";
	return (
		<div className="tooth-carousel-focal-viewport flex items-center justify-between w-full max-w-sm px-1 gap-2">
			<button type="button" onClick={handlePrev} className={navBtnCls} title={`Предыдущий зуб (${prevTooth})`} aria-label={`Перейти к зубу ${prevTooth}`} data-testid="carousel-prev-tooth-btn">
				<ChevronLeft size={22} />
				<span className="text-[10px] font-black font-mono leading-none text-[var(--odontogram-ink-muted)]">{prevTooth}</span>
			</button>

			<div
				ref={stageRef} role="button" tabIndex={0} onClick={handleStageClick}
				onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleStageClick(e as any); } }}
				className="tooth-carousel-stage flex-1 max-w-[160px] min-h-[140px] flex flex-col items-center justify-center p-2 rounded-2xl bg-[var(--odontogram-paper)] border-2 border-teal-500/40 shadow-sm cursor-pointer hover:border-teal-500 transition-all active:scale-[0.98]"
				title="Нажмите для открытия меню патологий (Bottom Sheet)" data-testid={`carousel-focal-tooth-${toothNumber}`}
			>
				<div className="w-full flex items-center justify-center py-1">
					<ToothSVG
						number={toothNumber} scale={1.65} state={currentState} material={currentToothData?.material}
						canalObturation={currentToothData?.canalObturation} hasPost={currentToothData?.hasPost}
						postType={currentToothData?.postType} boneLossLevel={currentToothData?.boneLossLevel}
						boneLossType={currentToothData?.boneLossType} rootResorptionStage={currentToothData?.rootResorptionStage ?? currentToothData?.rootResorption}
						periapicalLesion={currentToothData?.periapicalLesion} pocketDepth={currentToothData?.pocketDepth}
						pocketDepthMm={currentToothData?.pocketDepthMm} maxPocketDepth={currentToothData?.maxPocketDepth}
						surfaces={currentSurfaces} useSurfaces={useSurfaces} showPulpAndCanals={showPulpAndCanals}
						showPeriapicalHalos={showPeriapicalHalos} showPeriodontalBoneLoss={showPeriodontalBoneLoss}
						isSelected={true} onClick={(e) => { e.stopPropagation(); handleStageClick(e); }} pediatricMode={isPediatricEffective}
					/>
				</div>
				<span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
					<Sparkles size={12} /> Шторка статуса
				</span>
			</div>

			<button type="button" onClick={handleNext} className={navBtnCls} title={`Следующий зуб (${nextTooth})`} aria-label={`Перейти к зубу ${nextTooth}`} data-testid="carousel-next-tooth-btn">
				<ChevronRight size={22} />
				<span className="text-[10px] font-black font-mono leading-none text-[var(--odontogram-ink-muted)]">{nextTooth}</span>
			</button>
		</div>
	);
});
ToothCarouselStage.displayName = "ToothCarouselStage";
