/**
 * PerioModeSwitcher.tsx — Сегментный переключатель сенсорного и десктопного слоев пародонтограммы.
 * Архитектурный слой Layer 4: UI Subcomponent (Мандат 8b, <= 120 строк).
 */

import React from "react";

export interface PerioModeSwitcherProps {
	readonly viewModeOverride: "auto" | "touch" | "desktop";
	readonly setViewModeOverride: (mode: "auto" | "touch" | "desktop") => void;
}

export const PerioModeSwitcher: React.FC<PerioModeSwitcherProps> = React.memo(({
	viewModeOverride, setViewModeOverride,
}) => {
	const isTouchActive = viewModeOverride === "touch";
	const isDesktopActive = viewModeOverride === "desktop" || viewModeOverride === "auto";

	return (
		<div className="dente-segmented-bar flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 w-full shadow-2xs">
			<div className="grid grid-cols-2 gap-1 w-full sm:w-auto sm:flex sm:items-center">
				<button
					type="button"
					onClick={() => setViewModeOverride("touch")}
					className={`dente-segmented-item ${isTouchActive ? "active" : ""}`}
					data-testid="perio-mode-touch-btn"
				>
					<span>Сенсорный (Q1–Q4)</span>
				</button>
				<button
					type="button"
					onClick={() => setViewModeOverride("desktop")}
					className={`dente-segmented-item ${isDesktopActive ? "active" : ""}`}
					data-testid="perio-mode-desktop-btn"
				>
					<span>Полная сетка (18–48)</span>
				</button>
			</div>
			<div className="flex items-center justify-between sm:justify-end gap-2 px-1">
				{viewModeOverride !== "auto" && (
					<button
						type="button"
						onClick={() => setViewModeOverride("auto")}
						className="secondary-button text-xs !min-h-[28px] !h-7 !px-2.5"
					>
						Авто
					</button>
				)}
				<span className="text-[12px] text-[var(--muted)] hidden md:inline px-1 truncate">
					{viewModeOverride === "touch"
						? "Сенсорный режим (1–7+ мм, 6 точек на зуб)"
						: "Пародонтологическая карта приёма (32 зуба, 192 точки зондирования)"}
				</span>
			</div>
		</div>
	);
});

PerioModeSwitcher.displayName = "PerioModeSwitcher";
