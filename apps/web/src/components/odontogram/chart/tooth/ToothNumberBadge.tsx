import type React from "react";
import { memo } from "react";
import type { ToothState, RootResorptionStage } from "../toothChartTypes";
import type { ToothVisualProps } from "../ToothColors";
import { ToothCardHud } from "../ToothCardHud";

export interface ToothNumberBadgeProps {
	number: number;
	isTop: boolean;
	isPrimary: boolean;
	state: ToothState;
	colors: ToothVisualProps;
	isSelected?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	resorptionVisual?: any | undefined;
	effectivePocketDepth?: number | undefined;
	activeStamp?: ToothState | null | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	stageBadge?: string | undefined;
}

export const ToothNumberBadge: React.FC<ToothNumberBadgeProps> = memo(({
	number,
	isTop,
	isPrimary,
	state,
	colors,
	isSelected,
	surfaces,
	useSurfaces,
	selectedTeeth,
	rootResorptionStage,
	resorptionVisual,
	effectivePocketDepth,
	activeStamp,
	onQuickStateChange,
	onResorptionChange,
	stageBadge,
}) => {
	return (
		<div className="relative flex flex-col items-center group/badge">
			{!activeStamp && onQuickStateChange && (
				<ToothCardHud
					number={number}
					isTop={isTop}
					isPrimary={isPrimary}
					state={state}
					surfaces={surfaces}
					useSurfaces={useSurfaces}
					selectedTeeth={selectedTeeth}
					rootResorptionStage={rootResorptionStage}
					onQuickStateChange={onQuickStateChange}
					onResorptionChange={onResorptionChange}
				/>
			)}

			<span
				className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
				data-testid={`presenter-fdi-tooth-${number}`}
				id={`presenter-fdi-tooth-${number}`}
			>
				<span className="tooth-status-dot" style={{ backgroundColor: colors.badgeColor }} />
				<span className="tooth-number-text font-black text-[13px] sm:text-[14px] leading-tight select-none">{number}</span>
				{stageBadge && (
					<span
						className="ml-1 px-1 py-0.5 rounded text-[10px] font-bold bg-teal-600 text-white shadow-2xs leading-tight"
						data-testid={`presenter-stage-badge-${number}`}
						title={`Этап лечения: ${stageBadge}`}
					>
						{stageBadge}
					</span>
				)}
				{resorptionVisual && resorptionVisual.stage > 0 && (
					<span
						className="ml-1 px-1 py-0.5 rounded text-xs font-black leading-none shadow-2xs"
						style={{ backgroundColor: resorptionVisual.badgeBg, color: resorptionVisual.badgeColor }}
						title={`Физиологическая резорбция корня: ${resorptionVisual.badgeText} (${resorptionVisual.descriptionRu})`}
						data-testid={`tooth-resorption-badge-${number}`}
					>
						R{resorptionVisual.stage}%
					</span>
				)}
				{effectivePocketDepth !== undefined && effectivePocketDepth > 4 && (
					<span
						className={`ml-1 px-1.5 py-0.5 rounded text-xs font-black text-white shadow-2xs leading-none ${
							effectivePocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
						}`}
						title={`Пародонтальный карман ${effectivePocketDepth} мм (Риск пародонтита K05.3)`}
					>
						P{effectivePocketDepth}
					</span>
				)}
			</span>
		</div>
	);
});
ToothNumberBadge.displayName = "ToothNumberBadge";
