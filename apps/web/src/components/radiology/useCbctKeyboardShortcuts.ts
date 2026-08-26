/**
 * DENTE CRM — CBCT 3D MPR Keyboard Shortcuts & Hotkey Navigation Engine
 * Standards: Planmeca Romexis 6.x, Vatech Ez3D-i, DICOM Part 3
 *
 * Controls:
 * - ArrowUp / ArrowDown / W / S: Scroll slices of active viewport (1 slice step = ~0.2-0.4 mm)
 * - PageUp / PageDown: Fast slice paging (10 slices step = ~2.0-4.0 mm)
 * - ArrowLeft / ArrowRight / A / D: Navigate cross-sections / horizontal axis
 * - + / - / Equal / Minus / Numpad: Zoom active viewport in/out (+/-10%)
 * - 0 / Home / KeyR: Reset zoom, pan, rotation angles and center crosshair
 * - Space / KeyF: Maximize / Restore active viewport (Fullscreen)
 * - KeyP: Toggle Right Inspector / Planner Panel visibility
 * - KeyM: Switch Studio Mode (Diagnostic <-> Implant Planning)
 * - KeyB / KeyE / KeyS / KeyT: Quick Hounsfield Presets (Bone / Endo / Soft Tissue)
 * - Tab / Shift+Tab: Cycle active viewport (Axial -> Coronal -> Sagittal -> Panoramic -> Cross-Section)
 * - ? / Slash / F1: Toggle hotkey cheat sheet modal
 */

import { useCallback, useEffect, useState } from "react";
import type { CbctViewportType, ViewportTransform } from "./cbctMprMath";

export type CbctNavViewport = CbctViewportType;

export interface CbctHotkeyItem {
	readonly keyLabel: string;
	readonly actionLabel: string;
	readonly descriptionRu: string;
	readonly category: "slices" | "zoom_pan" | "viewports" | "presets_modes";
}

export const CBCT_HOTKEY_DEFINITIONS: readonly CbctHotkeyItem[] = [
	// 1. Slices & Navigation
	{
		keyLabel: "↑ / ↓ или W / S",
		actionLabel: "Срез ±1",
		descriptionRu: "Прокрутка срезов активного окна с шагом 1 срез (0.2–0.4 мм)",
		category: "slices",
	},
	{
		keyLabel: "PgUp / PgDn",
		actionLabel: "Срезы ±10",
		descriptionRu: "Быстрая прокрутка срезов с шагом 10 срезов (2.0–4.0 мм)",
		category: "slices",
	},
	{
		keyLabel: "← / → или A / D",
		actionLabel: "Кросс-секция ±1",
		descriptionRu: "Переход к предыдущей / следующей трансверзальной кросс-секции",
		category: "slices",
	},

	// 2. Zoom & Pan
	{
		keyLabel: "+ / - или = / _",
		actionLabel: "Зум ±10%",
		descriptionRu: "Плавное масштабирование активного окна с шагом 10%",
		category: "zoom_pan",
	},
	{
		keyLabel: "Колесо мыши",
		actionLabel: "Зум к курсору",
		descriptionRu: "Масштабирование в точку под курсором с сохранением фокуса",
		category: "zoom_pan",
	},
	{
		keyLabel: "0 / Home / R",
		actionLabel: "Сброс зума",
		descriptionRu: "Сброс масштаба до 1.0x, сброс панорамы и центрирование",
		category: "zoom_pan",
	},
	{
		keyLabel: "СКМ / Shift+ЛКМ",
		actionLabel: "Панорамирование",
		descriptionRu: "Перемещение холста активного окна (Pan)",
		category: "zoom_pan",
	},
	{
		keyLabel: "ПКМ (Drag)",
		actionLabel: "Яркость / Контраст",
		descriptionRu: "Интерактивная регулировка окна W/L (Window Width / Level)",
		category: "zoom_pan",
	},

	// 3. Viewports & Layout
	{
		keyLabel: "Tab / Shift+Tab",
		actionLabel: "Смена окна",
		descriptionRu: "Циклическое переключение активного фокуса окон: Аксиал → Коронал → Сагиттал → ОПТГ",
		category: "viewports",
	},
	{
		keyLabel: "Пробел / F",
		actionLabel: "Развернуть окно",
		descriptionRu: "Развернуть активное окно на весь экран / вернуть сетку 2x2",
		category: "viewports",
	},
	{
		keyLabel: "P",
		actionLabel: "Панель планера",
		descriptionRu: "Скрыть / показать правую панель диагностики и планирования",
		category: "viewports",
	},

	// 4. Presets & Modes
	{
		keyLabel: "M",
		actionLabel: "Режим студии",
		descriptionRu: "Переключение между режимами «Диагностика» и «Имплантация»",
		category: "presets_modes",
	},
	{
		keyLabel: "B",
		actionLabel: "Пресет: Кость",
		descriptionRu: "Переключение пресета HU: Зубы и кортикальная кость (Bone)",
		category: "presets_modes",
	},
	{
		keyLabel: "E",
		actionLabel: "Пресет: Эндо",
		descriptionRu: "Переключение пресета HU: Корневые каналы и эмаль (Endo)",
		category: "presets_modes",
	},
	{
		keyLabel: "S / T / Shift+S",
		actionLabel: "Пресет: Мягкие ткани",
		descriptionRu: "Переключение пресета HU: Слизистая и мягкие ткани (Soft Tissue)",
		category: "presets_modes",
	},
	{
		keyLabel: "? / F1",
		actionLabel: "Подсказки",
		descriptionRu: "Открыть / закрыть шпаргалку по горячим клавишам",
		category: "presets_modes",
	},
];

export const DEFAULT_VIEWPORT_CYCLE: readonly CbctNavViewport[] = [
	"axial",
	"coronal",
	"sagittal",
	"panoramic",
];

export interface CbctKeyboardShortcutsOptions {
	readonly enabled?: boolean;
	readonly activeViewport: CbctNavViewport;
	readonly setActiveViewport?: ((viewport: CbctNavViewport) => void) | undefined;
	readonly viewports?: readonly CbctNavViewport[];
	readonly onScrollSlice?: (direction: "prev" | "next", stepCount: number) => void;
	readonly onNavigateCrossSection?: (direction: "prev" | "next", stepCount: number) => void;
	readonly onZoom?: (direction: "in" | "out", percent?: number) => void;
	readonly onResetTransform?: () => void;
	readonly onToggleMaximize?: () => void;
	readonly onTogglePanel?: () => void;
	readonly onToggleMode?: () => void;
	readonly onSelectPreset?: (preset: "bone" | "endo" | "soft") => void;
	readonly onToggleHelp?: () => void;
}

/**
 * Checks if keyboard event originated from an editable form element
 */
export function isEditableElement(target: unknown): boolean {
	if (!target || typeof target !== "object") return false;
	const el = target as HTMLElement;
	if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
		return true;
	}
	if (el.isContentEditable) {
		return true;
	}
	return false;
}

/**
 * Pure handler for CBCT keyboard hotkeys. Returns true if hotkey was captured and handled.
 */
export function handleCbctKeyDown(
	event: {
		readonly key: string;
		readonly code?: string;
		readonly shiftKey?: boolean;
		readonly ctrlKey?: boolean;
		readonly metaKey?: boolean;
		readonly altKey?: boolean;
		readonly target?: unknown;
		preventDefault?: () => void;
		stopPropagation?: () => void;
	},
	options: CbctKeyboardShortcutsOptions,
): boolean {
	if (options.enabled === false) return false;

	// Do not intercept hotkeys if user is typing inside an input/textarea
	if (isEditableElement(event.target)) {
		return false;
	}

	// Avoid colliding with system browser shortcuts (Ctrl+C, Ctrl+V, etc.)
	if (event.ctrlKey || event.metaKey || event.altKey) {
		return false;
	}

	const key = event.key;
	const code = event.code ?? "";
	const lowerKey = key.toLowerCase();
	const viewports = options.viewports ?? DEFAULT_VIEWPORT_CYCLE;

	// 1. Slices: ArrowUp / ArrowDown / W / S (Step 1)
	if (key === "ArrowUp" || code === "KeyW" || lowerKey === "w" || lowerKey === "ц") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("next", 1);
		return true;
	}

	// 2. Fast Slices: PageUp / PageDown (Step 10)
	if (key === "PageUp") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("next", 10);
		return true;
	}
	if (key === "PageDown") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("prev", 10);
		return true;
	}

	// 3. Cross-sections: ArrowLeft / ArrowRight / A / D
	if (key === "ArrowLeft" || code === "KeyA" || lowerKey === "a" || lowerKey === "ф") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onNavigateCrossSection?.("prev", 1);
		return true;
	}
	if (key === "ArrowRight" || code === "KeyD" || lowerKey === "d" || lowerKey === "в") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onNavigateCrossSection?.("next", 1);
		return true;
	}

	// 4. Zoom: + / - / Equal / Minus / Numpad
	if (key === "+" || key === "=" || code === "Equal" || code === "NumpadAdd") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onZoom?.("in", 10);
		return true;
	}
	if (key === "-" || key === "_" || code === "Minus" || code === "NumpadSubtract") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onZoom?.("out", 10);
		return true;
	}

	// 5. Reset Transform / Center: 0 / Home / KeyR
	if (key === "0" || key === "Home" || code === "Digit0" || code === "Numpad0" || code === "KeyR" || lowerKey === "r" || lowerKey === "к") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onResetTransform?.();
		return true;
	}

	// 6. Maximize / Restore Viewport: Space / KeyF
	if (key === " " || key === "Spacebar" || code === "Space" || code === "KeyF" || lowerKey === "f" || lowerKey === "а") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onToggleMaximize?.();
		return true;
	}

	// 7. Toggle Mode: KeyM
	if (code === "KeyM" || lowerKey === "m" || lowerKey === "ь") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onToggleMode?.();
		return true;
	}

	// 8. Toggle Panel: KeyP
	if (code === "KeyP" || lowerKey === "p" || lowerKey === "з") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onTogglePanel?.();
		return true;
	}

	// 9. Presets: KeyB (Bone), KeyE (Endo), KeyT / Shift+S / KeyS (Soft tissue)
	if (code === "KeyB" || lowerKey === "b" || lowerKey === "и") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onSelectPreset?.("bone");
		return true;
	}

	if (code === "KeyE" || lowerKey === "e" || lowerKey === "у") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onSelectPreset?.("endo");
		return true;
	}

	if (code === "KeyT" || lowerKey === "t" || lowerKey === "е" || (event.shiftKey && (code === "KeyS" || lowerKey === "s" || lowerKey === "ы"))) {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onSelectPreset?.("soft");
		return true;
	}

	// Slices Down: ArrowDown / KeyS / S / ы (when Shift is not held for preset)
	if (key === "ArrowDown" || code === "KeyS" || lowerKey === "s" || lowerKey === "ы") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("prev", 1);
		return true;
	}

	// 10. Viewport Cycling: Tab (Forward) / Shift+Tab (Backward)
	if (key === "Tab") {
		event.preventDefault?.();
		event.stopPropagation?.();
		const currentIdx = viewports.indexOf(options.activeViewport);
		const total = viewports.length;
		if (total > 0) {
			const delta = event.shiftKey ? -1 : 1;
			const nextIdx = (currentIdx + delta + total) % total;
			const nextViewport = viewports[nextIdx];
			if (nextViewport) {
				options.setActiveViewport?.(nextViewport);
			}
		}
		return true;
	}

	// 11. Help / Cheat sheet: ? / / / F1
	if (key === "?" || key === "/" || code === "Slash" || key === "F1") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onToggleHelp?.();
		return true;
	}

	return false;
}

/**
 * React Hook for CBCT Keyboard Navigation & Shortcuts
 */
export function useCbctKeyboardShortcuts(options: CbctKeyboardShortcutsOptions) {
	const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

	const toggleHelp = useCallback(() => {
		setIsHelpOpen((prev) => !prev);
	}, []);

	useEffect(() => {
		if (options.enabled === false) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			handleCbctKeyDown(e, {
				...options,
				onToggleHelp: options.onToggleHelp ?? toggleHelp,
			});
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [options, toggleHelp]);

	return {
		isHelpOpen,
		setIsHelpOpen,
		toggleHelp,
	};
}

/**
 * Calculates updated ViewportTransform with a stepped zoom (+10% or -10%) centered on viewport.
 */
export function applyStepZoom(
	currentTransform: ViewportTransform,
	direction: "in" | "out",
	stepPercent = 10,
	viewportDimensions = { width: 300, height: 300 },
	minZoom = 0.5,
	maxZoom = 5.0,
): ViewportTransform {
	const safeMin = Math.max(0.1, minZoom);
	const safeMax = Math.max(safeMin, maxZoom);
	const curZoom = Number.isFinite(currentTransform?.zoom) && currentTransform.zoom >= safeMin
		? Math.min(safeMax, currentTransform.zoom)
		: 1.0;
	const panX = Number.isFinite(currentTransform?.panX) ? currentTransform.panX : 0;
	const panY = Number.isFinite(currentTransform?.panY) ? currentTransform.panY : 0;

	const factor = direction === "in" ? 1 + stepPercent / 100 : 1 - stepPercent / 100;
	const newZoom = Math.max(safeMin, Math.min(safeMax, curZoom * factor));

	const centerX = viewportDimensions.width / 2;
	const centerY = viewportDimensions.height / 2;

	const worldX = (centerX - panX) / curZoom;
	const worldY = (centerY - panY) / curZoom;

	const newPanX = centerX - worldX * newZoom;
	const newPanY = centerY - worldY * newZoom;

	return {
		zoom: Number(newZoom.toFixed(3)),
		panX: Number(newPanX.toFixed(1)),
		panY: Number(newPanY.toFixed(1)),
	};
}
