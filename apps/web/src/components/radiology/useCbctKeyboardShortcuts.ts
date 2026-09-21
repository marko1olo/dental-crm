/**
 * DENTE CRM — CBCT 3D MPR Keyboard Shortcuts & Hotkey Navigation Engine
 * Standards: Planmeca Romexis 6.x, Vatech Ez3D-i, DICOM Part 3
 *
 * Controls:
 * - Mouse:
 *   - Wheel: scroll slices
 *   - Ctrl+Wheel: cursor-anchored zoom
 *   - Right click (Drag): Window Width / Level (W/L) interactive brightness/contrast
 *   - Middle click (Drag): Pan / Canvas translation
 *   - Double click: Maximize viewport / reset rotation angle
 *   - Shift + Left click (Drag): Oblique MPR crosshair rotation
 * - Keyboard:
 *   - ArrowUp / ArrowDown / W / S: Scroll slices of active viewport (1 slice step = ~0.2-0.4 mm)
 *   - PageUp / PageDown: Fast slice paging (10 slices step = ~2.0-4.0 mm)
 *   - ArrowLeft / ArrowRight / A / D: Navigate cross-sections / horizontal axis
 *   - 1..5: HU Density Presets (1: Bone, 2: Endo, 3: Soft tissue, 4: Metal, 5: Sinus)
 *   - Tools: C (Crosshair), P (Pan), Z (Zoom), W (Window/Level), R (Rotate)
 *   - 0 / Home: Reset zoom, pan, rotation angles and center crosshair
 *   - Space / KeyF: Maximize / Restore active viewport (Fullscreen toggle)
 *   - KeyH: Clear View (temporarily hide vector overlays for micro-crack detection)
 *   - KeyM: Switch Studio Mode (Diagnostic <-> Implant Planning)
 *   - Tab / Shift+Tab: Cycle active viewport (Axial -> Coronal -> Sagittal -> Panoramic -> Cross-Section)
 *   - ? / Slash / F1: Toggle hotkey cheat sheet modal
 */

import { useCallback, useEffect, useState } from "react";
import type { CbctViewportType, ViewportTransform } from "./cbctMprMath";

export type CbctNavViewport = CbctViewportType;
export type CbctPresetType = "bone" | "endo" | "soft" | "tissue" | "metal" | "sinus";
export type CbctToolModeShortcut = "crosshair" | "pan" | "zoom" | "window_level" | "rotate";

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
		keyLabel: "Колесо мыши",
		actionLabel: "Срезы (прокрутка)",
		descriptionRu: "Листание срезов активного окна колесом мыши",
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
		keyLabel: "Ctrl+Колесо",
		actionLabel: "Зум к курсору",
		descriptionRu: "Масштабирование в точку под курсором с зажатой клавишей Ctrl",
		category: "zoom_pan",
	},
	{
		keyLabel: "+ / - или = / _",
		actionLabel: "Зум ±10%",
		descriptionRu: "Плавное масштабирование активного окна с шагом 10%",
		category: "zoom_pan",
	},
	{
		keyLabel: "0 / Home",
		actionLabel: "Сброс масштаба",
		descriptionRu: "Сброс масштаба до 1.0x, сброс панорамы и центрирование (0 / Home)",
		category: "zoom_pan",
	},
	{
		keyLabel: "ПКМ (Drag)",
		actionLabel: "Яркость / Контраст (W/L)",
		descriptionRu: "Интерактивная регулировка окна W/L (Window Width / Level)",
		category: "zoom_pan",
	},
	{
		keyLabel: "СКМ (Drag)",
		actionLabel: "Панорамирование",
		descriptionRu: "Перемещение холста активного окна (Pan)",
		category: "zoom_pan",
	},
	{
		keyLabel: "2-клик",
		actionLabel: "Развернуть / сброс",
		descriptionRu: "Двойной клик: развернуть активное окно на весь экран или сбросить наклон осей",
		category: "zoom_pan",
	},
	{
		keyLabel: "Shift+ЛКМ",
		actionLabel: "Вращение осей",
		descriptionRu: "Вращение осей косого среза (Oblique MPR) с зажатым Shift",
		category: "zoom_pan",
	},

	// 3. Viewports & Tools
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
		keyLabel: "C / P / Z / W / R",
		actionLabel: "Инструменты дока",
		descriptionRu: "Выбор инструментов: C (Перекрестие), P (Панорама), Z (Зум), W (Окно W/L), R (Вращение)",
		category: "viewports",
	},
	{
		keyLabel: "H",
		actionLabel: "Режим «Clear View»",
		descriptionRu: "Временное скрытие всех оверлеев и сеток для осмотра тонких трещин кости",
		category: "viewports",
	},

	// 4. Presets & Modes
	{
		keyLabel: "1 / B",
		actionLabel: "Пресет: Кость",
		descriptionRu: "Переключение пресета HU: Зубы и кортикальная кость (Bone / Dental)",
		category: "presets_modes",
	},
	{
		keyLabel: "2 / E",
		actionLabel: "Пресет: Эндо",
		descriptionRu: "Переключение пресета HU: Корневые каналы и эмаль (Endo)",
		category: "presets_modes",
	},
	{
		keyLabel: "3 / T / S",
		actionLabel: "Пресет: Мягкие ткани",
		descriptionRu: "Переключение пресета HU: Слизистая и мягкие ткани (Soft Tissue)",
		category: "presets_modes",
	},
	{
		keyLabel: "4",
		actionLabel: "Пресет: Металл",
		descriptionRu: "Переключение пресета HU: Подавление металл-артефактов имплантатов",
		category: "presets_modes",
	},
	{
		keyLabel: "5",
		actionLabel: "Пресет: Пазухи",
		descriptionRu: "Переключение пресета HU: Верхнечелюстные синусы и ЛОР (Airways / Sinus)",
		category: "presets_modes",
	},
	{
		keyLabel: "M",
		actionLabel: "Режим студии",
		descriptionRu: "Переключение между режимами «Диагностика» и «Имплантация»",
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

export interface CbctKeyboardShortcutsOptions<TPreset extends string = CbctPresetType> {
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
	readonly onToggleClearView?: () => void;
	readonly onSelectTool?: (tool: CbctToolModeShortcut) => void;
	readonly onSelectPreset?: (preset: TPreset) => void;
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
export function handleCbctKeyDown<TPreset extends string = CbctPresetType>(
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
	options: CbctKeyboardShortcutsOptions<TPreset>,
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

	// 1. Numeric 1..5 Presets (Bone, Endo, Soft tissue, Metal, Sinus)
	if (key === "1" || code === "Digit1" || code === "Numpad1") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("bone");
		return true;
	}
	if (key === "2" || code === "Digit2" || code === "Numpad2") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("endo");
		return true;
	}
	if (key === "3" || code === "Digit3" || code === "Numpad3") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("soft");
		return true;
	}
	if (key === "4" || code === "Digit4" || code === "Numpad4") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("metal");
		return true;
	}
	if (key === "5" || code === "Digit5" || code === "Numpad5") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("sinus");
		return true;
	}

	// 2. Slices: ArrowUp / ArrowDown (Step 1)
	if (key === "ArrowUp") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("next", 1);
		return true;
	}
	if (key === "ArrowDown") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("prev", 1);
		return true;
	}

	// 3. Fast Slices: PageUp / PageDown (Step 10)
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

	// 4. Tools vs Navigation Keys: W, Z, P, R, C
	// W: Slices Next (W/S navigation pair) or Tool Window/Level [W]
	if (code === "KeyW" || lowerKey === "w" || lowerKey === "ц") {
		event.preventDefault?.();
		event.stopPropagation?.();
		if (options.onScrollSlice) {
			options.onScrollSlice("next", 1);
		} else if (options.onSelectTool) {
			options.onSelectTool("window_level");
		}
		return true;
	}

	// Z: Tool Zoom [Z] or Step Zoom In
	if (code === "KeyZ" || lowerKey === "z" || lowerKey === "я") {
		event.preventDefault?.();
		event.stopPropagation?.();
		if (options.onSelectTool) {
			options.onSelectTool("zoom");
		} else if (options.onZoom) {
			options.onZoom("in", 10);
		}
		return true;
	}

	// P: Toggle Panel [P] or Tool Pan [P]
	if (code === "KeyP" || lowerKey === "p" || lowerKey === "з") {
		event.preventDefault?.();
		event.stopPropagation?.();
		if (options.onTogglePanel) {
			options.onTogglePanel();
		} else if (options.onSelectTool) {
			options.onSelectTool("pan");
		}
		return true;
	}

	// R: Tool Rotate [R] or Reset Transform (if no tool selector)
	if (code === "KeyR" || lowerKey === "r" || lowerKey === "к") {
		event.preventDefault?.();
		event.stopPropagation?.();
		if (options.onSelectTool) {
			options.onSelectTool("rotate");
		} else if (options.onResetTransform) {
			options.onResetTransform();
		}
		return true;
	}

	// C: Tool Crosshair [C]
	if (code === "KeyC" || lowerKey === "c" || lowerKey === "с") {
		if (options.onSelectTool) {
			event.preventDefault?.();
			event.stopPropagation?.();
			options.onSelectTool("crosshair");
			return true;
		}
	}

	// S: Slices Down (KeyS / s / ы, when Shift is not held for preset)
	if (!event.shiftKey && (code === "KeyS" || lowerKey === "s" || lowerKey === "ы")) {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onScrollSlice?.("prev", 1);
		return true;
	}

	// 5. Cross-sections: ArrowLeft / ArrowRight / A / D
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

	// 6. Zoom: + / - / Equal / Minus / Numpad
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

	// 7. Reset Transform / Center: 0 / Home / Digit0 / Numpad0
	if (key === "0" || key === "Home" || code === "Digit0" || code === "Numpad0") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onResetTransform?.();
		return true;
	}

	// 8. Maximize / Restore Viewport: Space / KeyF
	if (key === " " || key === "Spacebar" || code === "Space" || code === "KeyF" || lowerKey === "f" || lowerKey === "а") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onToggleMaximize?.();
		return true;
	}

	// 9. Toggle Mode: KeyM
	if (code === "KeyM" || lowerKey === "m" || lowerKey === "ь") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onToggleMode?.();
		return true;
	}

	// 10. Toggle Clear View (Hide Overlays for Fracture Inspection): KeyH
	if (code === "KeyH" || lowerKey === "h" || lowerKey === "р") {
		event.preventDefault?.();
		event.stopPropagation?.();
		options.onToggleClearView?.();
		return true;
	}

	// 11. Legacy Preset Hotkeys: KeyB (Bone), KeyE (Endo), KeyT / Shift+S (Soft tissue)
	if (code === "KeyB" || lowerKey === "b" || lowerKey === "и") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("bone");
		return true;
	}

	if (code === "KeyE" || lowerKey === "e" || lowerKey === "у") {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("endo");
		return true;
	}

	if (code === "KeyT" || lowerKey === "t" || lowerKey === "е" || (event.shiftKey && (code === "KeyS" || lowerKey === "s" || lowerKey === "ы"))) {
		event.preventDefault?.();
		event.stopPropagation?.();
		(options.onSelectPreset as ((p: CbctPresetType) => void) | undefined)?.("soft");
		return true;
	}

	// 12. Viewport Cycling: Tab (Forward) / Shift+Tab (Backward)
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

	// 13. Help / Cheat sheet: ? / / / F1
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
export function useCbctKeyboardShortcuts<TPreset extends string = CbctPresetType>(
	options: CbctKeyboardShortcutsOptions<TPreset>,
) {
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
