import React, { memo } from "react";
import { getToothAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import type { CrmToothState } from "@dental/shared";
import type { ToothData, ToothState } from "./ToothChart";
import {
	GOST_TOOTH_STATES,
	type GostStateDescriptor,
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "./classicGostTypes";

export interface ClassicGostToothCellProps {
	readonly toothNumber: number;
	readonly isUpper: boolean;
	readonly tooth?: ToothData | undefined;
	readonly isSelected: boolean;
	readonly selectedTeeth: readonly number[];
	readonly activeStamp?: ToothState | null | undefined;
	readonly onToothClick: (toothNumber: number, rect: DOMRect) => void;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	readonly useSurfaces?: boolean | undefined;
	readonly pediatricMode?: boolean | undefined;
}

export function areGostToothCellPropsEqual(
	prev: ClassicGostToothCellProps,
	next: ClassicGostToothCellProps,
): boolean {
	if (prev.toothNumber !== next.toothNumber) return false;
	if (prev.isUpper !== next.isUpper) return false;
	if (prev.isSelected !== next.isSelected) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.onToothClick !== next.onToothClick) return false;
	if (prev.onQuickStateChange !== next.onQuickStateChange) return false;

	const prevTooth = prev.tooth;
	const nextTooth = next.tooth;
	if (prevTooth !== nextTooth) {
		if (!prevTooth || !nextTooth) return false;
		if (prevTooth.state !== nextTooth.state) return false;
		const prevPocket = prevTooth.pocketDepth ?? prevTooth.pocketDepthMm ?? prevTooth.maxPocketDepth;
		const nextPocket = nextTooth.pocketDepth ?? nextTooth.pocketDepthMm ?? nextTooth.maxPocketDepth;
		if (prevPocket !== nextPocket) return false;
		const prevSurfaces = prevTooth.surfaces;
		const nextSurfaces = nextTooth.surfaces;
		if (prevSurfaces !== nextSurfaces) {
			const pLen = prevSurfaces?.length ?? 0;
			const nLen = nextSurfaces?.length ?? 0;
			if (pLen !== nLen) return false;
			for (let i = 0; i < pLen; i++) {
				if (prevSurfaces![i] !== nextSurfaces![i]) return false;
			}
		}
		const prevCanals =
			prevTooth.clinicalData &&
			typeof prevTooth.clinicalData === "object" &&
			"canals" in prevTooth.clinicalData &&
			Array.isArray((prevTooth.clinicalData as { canals?: unknown[] }).canals)
				? (prevTooth.clinicalData as { canals?: unknown[] }).canals!.length
				: 0;
		const nextCanals =
			nextTooth.clinicalData &&
			typeof nextTooth.clinicalData === "object" &&
			"canals" in nextTooth.clinicalData &&
			Array.isArray((nextTooth.clinicalData as { canals?: unknown[] }).canals)
				? (nextTooth.clinicalData as { canals?: unknown[] }).canals!.length
				: 0;
		if (prevCanals !== nextCanals) return false;
	}

	if (
		(prev.isSelected || next.isSelected) &&
		prev.selectedTeeth !== next.selectedTeeth
	) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth[i] !== next.selectedTeeth[i]) return false;
		}
	}
	return true;
}

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
	const hasCanals =
		tooth?.clinicalData &&
		typeof tooth.clinicalData === "object" &&
		"canals" in tooth.clinicalData &&
		Array.isArray((tooth.clinicalData as { canals?: unknown[] }).canals) &&
		(tooth.clinicalData as { canals?: unknown[] }).canals!.length > 0;

	const anatomicalName = getToothAnatomicalNameRu(toothNumber);

	return (
		<button
			type="button"
			data-tooth-id={toothNumber}
			title={`${anatomicalName}: ${gost.nameRu}${surfaces && surfaces.length > 0 ? ` [${surfaces.join(",")}]` : ""}${pocketDepth && pocketDepth > 4 ? ` | Карман: ${pocketDepth}мм` : ""}`}
			aria-label={`Зуб ${toothNumber}, ${gost.nameRu}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={(e) => {
				if (activeStamp && onQuickStateChange) {
					onQuickStateChange([toothNumber], activeStamp, undefined);
					return;
				}
				const rect = e.currentTarget.getBoundingClientRect();
				onToothClick(toothNumber, rect);
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				window.dispatchEvent(
					new CustomEvent("dente-open-tooth-clinical-modal", {
						detail: {
							toothNumber,
							code: String(toothNumber),
							state,
						},
					}),
				);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (activeStamp && onQuickStateChange) {
						onQuickStateChange([toothNumber], activeStamp, undefined);
						return;
					}
					const rect = e.currentTarget.getBoundingClientRect();
					onToothClick(toothNumber, rect);
					return;
				}

				// Arrow key navigation across dental arches
				const navKeys: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
					ArrowLeft: "left",
					ArrowRight: "right",
					ArrowUp: "up",
					ArrowDown: "down",
					Home: "home",
					End: "end",
				};

				const dir = navKeys[e.key];
				if (dir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(
						toothNumber,
						dir,
						pediatricMode,
					);
					const nextEl = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${nextTooth}"]`,
					);
					nextEl?.focus();
					return;
				}

				// 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З, X, etc.) applied without surfaces
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState && onQuickStateChange) {
					e.preventDefault();
					onQuickStateChange([toothNumber], quickState, undefined);
				}
			}}
			className={`gost-cell-tooth relative flex flex-col items-center justify-between min-w-[44px] sm:min-w-[50px] min-h-[56px] p-1.5 sm:p-2 rounded-xl border transition-all duration-150 select-none text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0 ${
				isSelected
					? "bg-indigo-500/15 border-indigo-500 shadow-md ring-2 ring-indigo-500/40"
					: pocketDepth && pocketDepth > 4
						? pocketDepth >= 6
							? "bg-rose-500/10 border-rose-500/60 ring-2 ring-rose-500/40 shadow-xs"
							: "bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30 shadow-xs"
						: "bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] border-[var(--odontogram-border-subtle)] shadow-xs"
			}`}
		>
			{/* FDI Tooth Number */}
			<span className="text-xs font-black tracking-tight text-[var(--odontogram-ink)] font-mono">
				{toothNumber}
			</span>

			{/* GOST Code Badge + Pocket Depth Badge */}
			<div className="flex items-center justify-center gap-1 my-1">
				<span
					className={`inline-flex items-center justify-center min-w-[28px] sm:min-w-[32px] h-[24px] sm:h-[26px] px-1.5 rounded font-black text-xs sm:text-sm border transition-colors shadow-xs ${gost.badgeBg} ${gost.badgeText} ${gost.badgeBorder}`}
				>
					{gost.abbr}
				</span>
				{pocketDepth !== undefined && pocketDepth > 4 && (
					<span
						className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded text-2xs font-black text-white shadow-2xs leading-none ${
							pocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
						}`}
						title={`Пародонтальный карман ${pocketDepth} мм (Риск пародонтита K05.3)`}
					>
						P{pocketDepth}
					</span>
				)}
			</div>

			{/* Surfaces Chips or Canal Badge (clean, no cluttering в/ч / н/ч text) */}
			<div className="flex flex-wrap items-center justify-center gap-0.5 min-h-[14px]">
				{useSurfaces && surfaces && surfaces.length > 0 ? (
					<span
						className="text-xs font-bold px-1 py-0.2 rounded bg-teal-500/20 text-teal-800 dark:text-teal-200 border border-teal-500/30 font-mono"
						title={`Поверхности: ${surfaces.join(", ")}`}
					>
						{surfaces.join("")}
					</span>
				) : hasCanals ? (
					<span
						className="text-xs font-bold px-1 py-0.2 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono"
						title="Заполнены корневые каналы"
					>
						{
							(tooth?.clinicalData as { canals?: unknown[] })
								.canals?.length
						}
						к
					</span>
				) : null}
			</div>
		</button>
	);
}, areGostToothCellPropsEqual);
ClassicGostToothCell.displayName = "ClassicGostToothCell";
