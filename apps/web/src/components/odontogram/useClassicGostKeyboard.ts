import { useEffect, useRef } from "react";
import type { ToothData, ToothState } from "./ToothChart";
import { getNextFocusedTooth, getToothStateFromHotkey } from "./classicGostTypes";

export interface UseClassicGostKeyboardParams {
	selectedTeeth: number[];
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	pediatricMode?: boolean | undefined;
	teethData: readonly ToothData[];
}

export function useClassicGostKeyboard({
	selectedTeeth,
	onQuickStateChange,
	pediatricMode,
}: UseClassicGostKeyboardParams) {
	const digitBufferRef = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
		buffer: "",
		timer: null,
	});

	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;

			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					onQuickStateChange(selectedTeeth, quickState, undefined);
					return;
				}
			}

			if (/^[1-8]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
				const digit = Number.parseInt(e.key, 10);
				const firstTooth = selectedTeeth[0];
				if (digitBufferRef.current.timer) clearTimeout(digitBufferRef.current.timer);

				const prevBuffer = digitBufferRef.current.buffer;
				if (prevBuffer.length === 1) {
					const firstDigit = Number.parseInt(prevBuffer, 10);
					const fdiCandidate = firstDigit * 10 + digit;
					digitBufferRef.current.buffer = "";
					const targetBtn = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${fdiCandidate}"]`);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
						return;
					}
				}

				const quadrant = firstTooth ? Math.floor(firstTooth / 10) : 1;
				const isPediatricQuad = quadrant >= 5 && quadrant <= 8;
				if (!isPediatricQuad || digit <= 5) {
					const targetTooth = quadrant * 10 + digit;
					const targetBtn = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${targetTooth}"]`);
					if (targetBtn) {
						e.preventDefault();
						targetBtn.focus();
						targetBtn.click();
					}
				}

				digitBufferRef.current.buffer = e.key;
				digitBufferRef.current.timer = setTimeout(() => { digitBufferRef.current.buffer = ""; }, 750);
				return;
			}

			const firstTooth = selectedTeeth[0];
			if (firstTooth !== undefined) {
				const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
					ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", Home: "home", End: "end",
				};
				const navDir = dirMap[e.key];
				if (navDir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(firstTooth, navDir, pediatricMode);
					const nextEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
					if (nextEl) { nextEl.focus(); nextEl.click(); }
				}
			} else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
				e.preventDefault();
				const initialTooth = pediatricMode ? 55 : 18;
				const initialEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${initialTooth}"]`);
				if (initialEl) { initialEl.focus(); initialEl.click(); }
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			if (digitBufferRef.current.timer) {
				clearTimeout(digitBufferRef.current.timer);
				digitBufferRef.current.timer = null;
			}
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [selectedTeeth, onQuickStateChange, pediatricMode]);
}
