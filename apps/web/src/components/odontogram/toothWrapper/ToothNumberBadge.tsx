/**
 * ToothNumberBadge.tsx — Номерной бейдж зуба и клинические индикаторы.
 * Включает статусную точку, подвижность (Миллер), фуркацию, пародонтальные карманы и резорбцию корня.
 */

import React from "react";
import { ROOT_RESORPTION_STAGES } from "../anatomicalToothGeometries";
import type { ToothState } from "../ToothChart";
import { ToothCardHud } from "../chart/ToothCardHud";

export interface ToothNumberBadgeProps {
	readonly number: number;
	readonly isSelected: boolean;
	readonly isTop: boolean;
	readonly isPontic?: boolean | undefined;
	readonly badgeColor: string;
	readonly mobility?: number | undefined;
	readonly furcation?: number | undefined;
	readonly pocketDepth?: number | undefined;
	readonly effectiveResorption: number;
	readonly activeStamp?: ToothState | null | undefined;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	readonly isTouchScreen: boolean;
	readonly isPrimary: boolean;
	readonly state: ToothState;
	readonly surfaces?: readonly string[] | undefined;
	readonly useSurfaces?: boolean | undefined;
	readonly selectedTeeth?: number[] | undefined;
}

export const ToothNumberBadge: React.FC<ToothNumberBadgeProps> = ({
	number,
	isSelected,
	isTop,
	isPontic,
	badgeColor,
	mobility,
	furcation,
	pocketDepth,
	effectiveResorption,
	activeStamp,
	onQuickStateChange,
	isTouchScreen,
	isPrimary,
	state,
	surfaces,
	useSurfaces,
	selectedTeeth,
}) => {
	return (
		<div className="relative flex flex-col items-center group/badge">
			{!activeStamp && onQuickStateChange && !isTouchScreen && (
				<ToothCardHud
					number={number}
					isTop={isTop}
					isPrimary={isPrimary}
					state={state}
					surfaces={surfaces}
					useSurfaces={useSurfaces}
					selectedTeeth={selectedTeeth}
					rootResorptionStage={effectiveResorption}
					onQuickStateChange={onQuickStateChange}
				/>
			)}

			<span
				className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
				style={{ fontSize: "12px" }}
			>
				<span
					className="tooth-status-dot"
					style={{ backgroundColor: isPontic ? "#2563eb" : badgeColor }}
				/>
				<span className="tooth-number-text font-black">{number}</span>
				{isPontic && (
					<span
						className="ml-0.5 px-1 py-0.2 rounded text-xs font-black bg-blue-600 text-white shadow-2xs leading-none"
						title="Тело мостовидного протеза (Bridge Pontic)"
					>
						BP
					</span>
				)}
				{mobility !== undefined && mobility > 0 && (
					<span
						className="ml-0.5 px-1 py-0.2 rounded text-xs font-black bg-indigo-600 text-white shadow-2xs leading-none"
						title={`Подвижность по Миллеру: ${mobility} ст.`}
					>
						M{mobility}
					</span>
				)}
				{furcation !== undefined && furcation > 0 && (
					<span
						className={`ml-0.5 px-1 py-0.2 rounded text-xs font-black text-white shadow-2xs leading-none ${
							furcation >= 3 ? "bg-rose-600" : "bg-amber-500"
						}`}
						title={`Поражение фуркации: ${furcation} ст.`}
					>
						F{furcation}
					</span>
				)}
				{pocketDepth !== undefined && pocketDepth > 4 && (
					<span
						className={`ml-0.5 px-1 py-0.2 rounded text-xs font-black text-white shadow-2xs leading-none ${
							pocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
						}`}
						title={`Пародонтальный карман ${pocketDepth} мм (Риск пародонтита K05.3)`}
					>
						P{pocketDepth}
					</span>
				)}
				{effectiveResorption > 0 && (
					<span
						className="ml-0.5 px-1 py-0.2 rounded text-xs font-black text-white shadow-2xs leading-none"
						data-testid={`tooth-resorption-badge-${number}`}
						style={{
							backgroundColor:
								ROOT_RESORPTION_STAGES[effectiveResorption]?.badgeColor ?? "#f59e0b",
						}}
						title={`Физиологическая резорбция корня: ${
							ROOT_RESORPTION_STAGES[effectiveResorption]?.nameRu ??
							`${effectiveResorption}%`
						}`}
					>
						{`R${effectiveResorption}%`}
					</span>
				)}
			</span>
		</div>
	);
};

export default ToothNumberBadge;
