import type React from "react";
import type { ToothState } from "../ToothChart";
import { getNextFocusedTooth, getToothStateFromHotkey } from "../classicGostTypes";

interface UseGostToothCellEventsParams {
	readonly toothNumber: number;
	readonly state: ToothState;
	readonly activeStamp?: ToothState | null | undefined;
	readonly pediatricMode?: boolean | undefined;
	readonly onToothClick?: ((toothNumber: number, rect?: DOMRect, surface?: string) => void) | undefined;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
}

export function useGostToothCellEvents({
	toothNumber,
	state,
	activeStamp,
	pediatricMode,
	onToothClick,
	onQuickStateChange,
}: UseGostToothCellEventsParams) {
	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		if (activeStamp && onQuickStateChange) {
			onQuickStateChange([toothNumber], activeStamp, undefined);
			return;
		}
		const rect = e.currentTarget.getBoundingClientRect();
		onToothClick?.(toothNumber, rect);
	};

	const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
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
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (activeStamp && onQuickStateChange) {
				onQuickStateChange([toothNumber], activeStamp, undefined);
				return;
			}
			const rect = e.currentTarget.getBoundingClientRect();
			onToothClick?.(toothNumber, rect);
			return;
		}

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
			const nextTooth = getNextFocusedTooth(toothNumber, dir, pediatricMode);
			const nextEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
			nextEl?.focus();
			return;
		}

		const quickState = getToothStateFromHotkey(e.key);
		if (quickState && onQuickStateChange) {
			e.preventDefault();
			onQuickStateChange([toothNumber], quickState, undefined);
		}
	};

	return { handleClick, handleContextMenu, handleKeyDown };
}
