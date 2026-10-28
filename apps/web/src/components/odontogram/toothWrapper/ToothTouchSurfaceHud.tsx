/**
 * ToothTouchSurfaceHud.tsx — Мобильный сенсорный HUD зуба (Touch-Zoom).
 * Apple HIG: Тач-таргеты >= 44x44px, быстрый выбор анатомических поверхностей и клинических статусов.
 */

import React from "react";
import {
	type AnatomicalSurfaceKey,
	isSurfaceActive,
	ANATOMICAL_SURFACE_LABELS_RU,
} from "../anatomicalToothGeometries";
import {
	BOTTOM_SURFACE_KEYS,
	TOP_SURFACE_KEYS,
} from "../AnatomicalToothColors";
import type { ToothState } from "../ToothChart";
import { TOOTH_STATE_LABELS } from "../ToothChart";

export interface ToothTouchSurfaceHudProps {
	readonly number: number;
	readonly state: ToothState;
	readonly isTop: boolean;
	readonly surfaces?: readonly string[] | undefined;
	readonly useSurfaces?: boolean | undefined;
	readonly selectedTeeth?: number[] | undefined;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	readonly onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
}

export const ToothTouchSurfaceHud: React.FC<ToothTouchSurfaceHudProps> = ({
	number,
	state,
	isTop,
	surfaces,
	useSurfaces,
	selectedTeeth,
	onQuickStateChange,
	onClick,
}) => {
	const surfaceKeys = isTop ? TOP_SURFACE_KEYS : BOTTOM_SURFACE_KEYS;

	const handleQuickChange = (
		e: React.MouseEvent,
		targetState: ToothState,
		targetSurfaces?: readonly string[] | undefined,
	) => {
		e.stopPropagation();
		if (!onQuickStateChange) return;
		const targets =
			selectedTeeth?.includes(number) && selectedTeeth.length > 0
				? selectedTeeth
				: [number];
		onQuickStateChange(targets, targetState, targetSurfaces);
	};

	return (
		<div
			className={`tooth-touch-surface-hud ${isTop ? "bottom-pos" : "top-pos"}`}
			data-testid={`touch-zoom-hud-${number}`}
			onClick={(e) => e.stopPropagation()}
		>
			<div className="flex items-center justify-between w-full gap-2 px-1 pb-1 border-b border-[var(--odontogram-border-subtle)] text-[11px]">
				<span className="font-extrabold text-[var(--odontogram-ink)]">
					Зуб {number}
				</span>
				<span className="text-[10px] text-[var(--odontogram-ink-muted)] font-medium">
					{TOOTH_STATE_LABELS[state]}
				</span>
			</div>

			{useSurfaces && (
				<div className="flex items-center gap-1.5 flex-wrap justify-center py-1">
					{surfaceKeys.map((sKey) => {
						const geomKey = sKey === "P" ? "L" : sKey;
						const isActive = isSurfaceActive(geomKey as AnatomicalSurfaceKey, surfaces);
						const labelInfo = ANATOMICAL_SURFACE_LABELS_RU[geomKey as AnatomicalSurfaceKey];
						const shortLabel =
							sKey === "O"
								? "О (Жев)"
								: sKey === "V"
									? "В (Вест)"
									: sKey === "P"
										? "П (Небн)"
										: sKey === "L"
											? "Я (Язычн)"
											: sKey === "M"
												? "М (Медиал)"
												: sKey === "D"
													? "Д (Дистал)"
													: "C (Шеечн)";
						return (
							<button
								key={sKey}
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onClick(e, number, sKey);
								}}
								className={`touch-surface-btn ${isActive ? "active" : ""}`}
								title={`${labelInfo?.nameRu ?? sKey} зуба ${number}`}
								data-testid={`touch-surface-btn-${number}-${sKey}`}
							>
								<span>{shortLabel}</span>
							</button>
						);
					})}
				</div>
			)}

			{onQuickStateChange && (
				<div className="flex items-center gap-1.5 flex-wrap justify-center pt-1 border-t border-[var(--odontogram-border-subtle)]">
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Caries", useSurfaces ? surfaces : undefined)}
						className="touch-quick-state-btn bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40"
						title="Кариес"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
						<span>Кариес</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Filled", useSurfaces ? surfaces : undefined)}
						className="touch-quick-state-btn bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40"
						title="Пломба"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
						<span>Пломба</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Pulpitis", useSurfaces ? surfaces : undefined)}
						className="touch-quick-state-btn bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40"
						title="Пульпит"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
						<span>Пульпит</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Periodontitis", useSurfaces ? surfaces : undefined)}
						className="touch-quick-state-btn bg-orange-500/15 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/40"
						title="Периодонтит"
						data-testid={`touch-quick-periodontitis-${number}`}
					>
						<span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
						<span>Периодонтит</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Crown", useSurfaces ? surfaces : undefined)}
						className="touch-quick-state-btn bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40"
						title="Коронка"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
						<span>Коронка</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Implant", surfaces)}
						className="touch-quick-state-btn bg-indigo-500/15 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/40"
						title="Имплантат"
						data-testid={`touch-quick-implant-${number}`}
					>
						<span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
						<span>Имплант</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Missing", undefined)}
						className="touch-quick-state-btn bg-slate-500/15 hover:bg-slate-500 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/40"
						title="Удален"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
						<span>Удален</span>
					</button>
					<button
						type="button"
						onClick={(e) => handleQuickChange(e, "Healthy", [])}
						className="touch-quick-state-btn bg-teal-500/15 hover:bg-teal-500 text-teal-800 dark:text-teal-300 hover:text-white border border-teal-500/40"
						title="Здоров"
					>
						<span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
						<span>Здоров</span>
					</button>
				</div>
			)}
		</div>
	);
};

export default ToothTouchSurfaceHud;
