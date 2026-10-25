import React, { memo } from "react";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols";
import type { CrmToothState } from "@dental/shared";
import type { ToothState } from "./ToothChart";
import { GOST_TOOTH_STATES, type GostStateDescriptor } from "./classicGostTypes";
import {
	type ClassicGostToothCellProps,
	areGostToothCellPropsEqual,
} from "./gost/classicGostToothCellEquality";
import { GostToothStatusBadge } from "./gost/GostToothStatusBadge";
import { GostToothSurfacesBadge } from "./gost/GostToothSurfacesBadge";
import { useGostToothCellEvents } from "./gost/useGostToothCellEvents";

export type { ClassicGostToothCellProps };
export { areGostToothCellPropsEqual };

export const ClassicGostToothCell: React.FC<ClassicGostToothCellProps> = memo(({
	toothNumber,
	isUpper: _isUpper,
	tooth,
	isSelected,
	selectedTeeth: _selectedTeeth,
	activeStamp,
	onToothClick,
	onQuickStateChange,
	useSurfaces,
	pediatricMode,
}) => {
	const state: ToothState = tooth ? tooth.state : "Healthy";
	const gost: GostStateDescriptor =
		(GOST_TOOTH_STATES[state as CrmToothState] as GostStateDescriptor | undefined) ??
		(GOST_TOOTH_STATES.Healthy as GostStateDescriptor);
	const surfaces = tooth?.surfaces;
	const pocketDepth = tooth?.pocketDepth ?? tooth?.pocketDepthMm ?? tooth?.maxPocketDepth;
	const anatomicalName = getToothAnatomicalNameRu(toothNumber);

	const { handleClick, handleContextMenu, handleKeyDown } = useGostToothCellEvents({
		toothNumber,
		state,
		activeStamp,
		pediatricMode,
		onToothClick,
		onQuickStateChange,
	});

	const cellThemeStyles = isSelected
		? "bg-indigo-500/15 border-indigo-500 shadow-md ring-2 ring-indigo-500/40"
		: pocketDepth && pocketDepth > 4
			? pocketDepth >= 6
				? "bg-rose-500/10 border-rose-500/60 ring-2 ring-rose-500/40 shadow-xs"
				: "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 shadow-xs"
			: "bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] border-[var(--odontogram-border-subtle)] shadow-xs";

	return (
		<button
			type="button"
			data-tooth-id={toothNumber}
			title={`${anatomicalName}: ${gost.nameRu}${surfaces && surfaces.length > 0 ? ` [${surfaces.join(",")}]` : ""}${pocketDepth && pocketDepth > 4 ? ` | Карман: ${pocketDepth}мм` : ""}`}
			aria-label={`Зуб ${toothNumber}, ${gost.nameRu}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={handleClick}
			onContextMenu={handleContextMenu}
			onKeyDown={handleKeyDown}
			className={`gost-cell-tooth relative flex flex-col items-center justify-between min-w-[44px] sm:min-w-[50px] min-h-[56px] p-1.5 sm:p-2 rounded-xl border transition-all duration-150 select-none text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 ${cellThemeStyles}`}
		>
			<span className="text-xs font-black tracking-tight text-[var(--odontogram-ink)] font-mono">
				{toothNumber}
			</span>

			<GostToothStatusBadge gost={gost} pocketDepth={pocketDepth} />

			<GostToothSurfacesBadge
				useSurfaces={useSurfaces}
				surfaces={surfaces}
				tooth={tooth}
			/>
		</button>
	);
}, areGostToothCellPropsEqual);
ClassicGostToothCell.displayName = "ClassicGostToothCell";
