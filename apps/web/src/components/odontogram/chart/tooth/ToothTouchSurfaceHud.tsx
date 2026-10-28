import type React from "react";
import { memo } from "react";
import type { ToothState } from "../toothChartTypes";

export interface ToothTouchSurfaceHudProps {
	number: number;
	isTop: boolean;
	state: ToothState;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
}

export const ToothTouchSurfaceHud: React.FC<ToothTouchSurfaceHudProps> = memo(({
	number,
	isTop,
	state,
	surfaces,
	useSurfaces,
	selectedTeeth,
	onQuickStateChange,
}) => {
	const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
	const surfaceItems = [
		{ key: "O", label: "O", full: "Окклюзионная" },
		{ key: "V", label: "V", full: "Вестибулярная" },
		{ key: isTop ? "P" : "L", label: isTop ? "P" : "L", full: isTop ? "Небная" : "Язычная" },
		{ key: "M", label: "M", full: "Медиальная" },
		{ key: "D", label: "D", full: "Дистальная" },
		{ key: "C", label: "C", full: "Пришеечная" },
	] as const;

	return (
		<div
			className={`tooth-touch-surface-hud absolute z-[999] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-teal-600/40 dark:border-teal-500/60 rounded-xl shadow-2xl ${
				isTop ? "top-full mt-2" : "bottom-full mb-2"
			}`}
			onClick={(e) => e.stopPropagation()}
			onPointerDown={(e) => e.stopPropagation()}
		>
			{useSurfaces && (
				<div className="flex items-center gap-1">
					{surfaceItems.map((surf) => {
						const currSurfaces = surfaces ?? [];
						const isSurfActive = currSurfaces.includes(surf.key) || (surf.key === "P" && currSurfaces.includes("L")) || (surf.key === "L" && currSurfaces.includes("P"));
						return (
							<button
								key={surf.key}
								type="button"
								className={`touch-surface-btn px-2.5 py-2 min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold border transition-all touch-manipulation flex items-center justify-center ${
									isSurfActive
										? "bg-teal-500 text-white border-teal-400 shadow-md scale-105"
										: "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
								}`}
								title={`${surf.full} поверхность`}
								onClick={(e) => {
									e.stopPropagation();
									const nextSurfaces = isSurfActive
										? currSurfaces.filter((s) => s !== surf.key && s !== (surf.key === "P" ? "L" : surf.key === "L" ? "P" : ""))
										: [...currSurfaces, surf.key];
									const nextState = nextSurfaces.length > 0 ? (state === "Healthy" ? "Caries" : state) : state;
									onQuickStateChange?.(targets, nextState, nextSurfaces);
								}}
							>
								{surf.label}
							</button>
						);
					})}
				</div>
			)}
			{onQuickStateChange && (
				<div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[340px] py-0.5 overflow-x-clip box-border">
					{[
						{ label: "Кариес", state: "Caries" as ToothState, color: "bg-amber-500", bg: "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40", useSurf: true },
						{ label: "Пломба", state: "Filled" as ToothState, color: "bg-blue-500", bg: "bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-500/40", useSurf: true },
						{ label: "Пульпит", state: "Pulpitis" as ToothState, color: "bg-rose-500", bg: "bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/40", useSurf: true },
						{ label: "Периодонтит", state: "Periodontitis" as ToothState, color: "bg-[#ea580c]", bg: "bg-orange-600/15 text-orange-950 dark:text-orange-200 border-[#ea580c]/40", useSurf: true },
						{ label: "Коронка", state: "Crown" as ToothState, color: "bg-amber-500", bg: "bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40", useSurf: false },
						{ label: "Удален", state: "Missing" as ToothState, color: "bg-red-600", bg: "bg-red-600/15 text-red-900 dark:text-red-200 border-red-500/40", useSurf: false },
						{ label: "Здоров", state: "Healthy" as ToothState, color: "bg-teal-400", bg: "bg-teal-500/15 text-teal-900 dark:text-teal-200 border-teal-500/40", useSurf: false },
					].map((b) => (
						<button
							key={b.state}
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onQuickStateChange(targets, b.state, b.useSurf && useSurfaces ? surfaces : []);
							}}
							className={`touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg border text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95 ${b.bg}`}
						>
							<span className={`w-2 h-2 rounded-full ${b.color}`} />
							{b.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
});
ToothTouchSurfaceHud.displayName = "ToothTouchSurfaceHud";
