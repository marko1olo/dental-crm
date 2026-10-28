import React, { memo } from "react";
import {
	type ToothState,
	type RootResorptionStage,
	TOOTH_STATE_LABELS,
} from "./toothChartTypes";
import { ToothCardHudPrimaryButtons } from "./hud/ToothCardHudPrimaryButtons";
import { ToothCardHudAdultButtons } from "./hud/ToothCardHudAdultButtons";

export interface ToothCardHudProps {
	number: number;
	isTop: boolean;
	isPrimary: boolean;
	state?: ToothState | undefined;
	surfaces?: readonly string[] | undefined;
	selectedTeeth?: number[] | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	useSurfaces?: boolean | undefined;
	onQuickStateChange: (
		targets: number[],
		state: ToothState,
		surfaces?: readonly string[] | undefined,
	) => void;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
}

export const ToothCardHud: React.FC<ToothCardHudProps> = memo(({
	number,
	isTop,
	isPrimary,
	state,
	surfaces,
	selectedTeeth,
	rootResorptionStage,
	useSurfaces,
	onQuickStateChange,
	onResorptionChange,
}) => {
	const isLeftMolar =
		(number >= 16 && number <= 18) ||
		(number >= 46 && number <= 48) ||
		(number >= 54 && number <= 55) ||
		(number >= 84 && number <= 85);
	const isRightMolar =
		(number >= 26 && number <= 28) ||
		(number >= 36 && number <= 38) ||
		(number >= 64 && number <= 65) ||
		(number >= 74 && number <= 75);

	const hudAlignClass = isLeftMolar
		? "left-0"
		: isRightMolar
		? "right-0"
		: "left-1/2 -translate-x-1/2";

	const getTargets = () =>
		selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];

	const surfaceBadge = surfaces && surfaces.length > 0 ? surfaces.join("") : null;
	const stateLabel = state
		? TOOTH_STATE_LABELS[state] ?? TOOTH_STATE_LABELS[String(state).toLowerCase()] ?? "интактный"
		: "интактный";

	return (
		<div
			className={`tooth-hover-quick-hud absolute tooth-card-hud-compact ${hudAlignClass} hidden group-hover/badge:flex flex-col transition-all duration-150 z-50 p-1.5 rounded-xl bg-[var(--odontogram-paper)]/95 border border-[var(--odontogram-border-strong)] shadow-xl backdrop-blur-md pointer-events-auto whitespace-nowrap w-[216px] min-w-[216px] max-w-[226px] overflow-x-clip box-border ${
				isTop ? "top-full mt-1.5" : "bottom-full mb-1.5"
			}`}
			onClick={(e) => e.stopPropagation()}
			data-testid={`tooth-card-hud-${number}`}
		>
			<div className="flex items-center justify-between gap-1 px-1 pb-1 mb-1 border-b border-[var(--line,#e2e8f0)] text-left select-none">
				<div className="flex items-center gap-1 min-w-0">
					<span className="font-mono font-black text-xs text-[var(--odontogram-ink,#0f172a)]">
						{`Зуб ${number}`}
					</span>
					<span className="text-[10px] font-semibold text-[var(--odontogram-ink-muted,#64748b)] truncate capitalize max-w-[120px]">
						{`· ${stateLabel}`}
					</span>
				</div>
				{surfaceBadge && (
					<span className="px-1 py-0.2 rounded text-[9px] font-mono font-black bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30 shrink-0">
						{surfaceBadge}
					</span>
				)}
			</div>

			{isPrimary ? (
				<ToothCardHudPrimaryButtons
					number={number}
					surfaces={surfaces}
					rootResorptionStage={rootResorptionStage}
					useSurfaces={useSurfaces}
					getTargets={getTargets}
					onQuickStateChange={onQuickStateChange}
					onResorptionChange={onResorptionChange}
				/>
			) : (
				<ToothCardHudAdultButtons
					number={number}
					surfaces={surfaces}
					useSurfaces={useSurfaces}
					getTargets={getTargets}
					onQuickStateChange={onQuickStateChange}
				/>
			)}
		</div>
	);
});
ToothCardHud.displayName = "ToothCardHud";
