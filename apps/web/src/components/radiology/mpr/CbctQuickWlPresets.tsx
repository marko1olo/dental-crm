/**
 * DENTE CRM — CBCT Quick Window/Level & WebGL2 Colormap Presets Module
 * Decomposed from CbctViewportsRuler.tsx per Mandate 8b.
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px, Zero-Bloat)
 */

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Check, Palette, Sparkles } from "lucide-react";
import {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	getSharedCbctGlContext,
} from "./webgl/CbctVolumeGlContext";

export { CBCT_COLORMAP_MODES, type CbctColorMapMode };

/** Quick WebGL2 Colormap Presets */
export interface CbctQuickColormapPreset {
	readonly id: CbctColorMapMode;
	readonly code: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CBCT_QUICK_COLORMAP_PRESETS: readonly CbctQuickColormapPreset[] = [
	{
		id: "grayscale",
		code: 0,
		label: "Серый (DICOM)",
		shortLabel: "Серый",
		descriptionRu: "Стандартный монохромный рентген DICOM PS 3.3",
		testId: "cbct-quick-colormap-grayscale",
	},
	{
		id: "bone_density",
		code: 1,
		label: "Плотность кости (Миш D1-D4)",
		shortLabel: "Миш D1-D4",
		descriptionRu: "Клиническая карта плотности кости Misch D1-D4",
		testId: "cbct-quick-colormap-bone-density",
	},
	{
		id: "endo",
		code: 2,
		label: "Эндо (Микротрещины)",
		shortLabel: "Эндо",
		descriptionRu: "Высококонтрастный режим для поиска скрытых каналов (MB2) и микротрещин",
		testId: "cbct-quick-colormap-endo",
	},
	{
		id: "inverted",
		code: 3,
		label: "Белая бумага (Печать)",
		shortLabel: "Печать",
		descriptionRu: "Инвертированный рентген (негатив) для качественной печати",
		testId: "cbct-quick-colormap-inverted",
	},
] as const;

/** Cycles sharpness amount in 1-click: Off (0.0) -> 50% (0.5) -> 100% (1.0) -> Off (0.0) */
export function getNextSharpenAmount(current: number): number {
	if (current < 0.25) return 0.5;
	if (current < 0.75) return 1.0;
	return 0.0;
}

/** Quick W/L Contrast Presets according to Clinical Protocol */
export interface CbctQuickWlPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CBCT_QUICK_WL_PRESETS: readonly CbctQuickWlPreset[] = [
	{
		id: "bone",
		label: "Кость (W2500/L500)",
		shortLabel: "Кость",
		windowWidth: 2500,
		windowLevel: 500,
		descriptionRu: "Костная ткань челюстей и альвеолярного гребня (W2500 / L500)",
		testId: "cbct-quick-wl-bone",
	},
	{
		id: "enamel_dentin",
		label: "Эмаль/Дентин (W4000/L1200)",
		shortLabel: "Эмаль/Дентин",
		windowWidth: 4000,
		windowLevel: 1200,
		descriptionRu: "Зубные ряды, эмаль, дентин и эндодонтические каналы (W4000 / L1200)",
		testId: "cbct-quick-wl-enamel",
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани (W400/L40)",
		shortLabel: "Мягкие ткани",
		windowWidth: 400,
		windowLevel: 40,
		descriptionRu: "Слизистая оболочка, десна и мягкотканные структуры (W400 / L40)",
		testId: "cbct-quick-wl-soft",
	},
	{
		id: "ez3d_bone",
		label: "DENTE Кость (W5031/L1039)",
		shortLabel: "DENTE",
		windowWidth: 5031,
		windowLevel: 1039,
		descriptionRu: "Клинический стандарт костной ткани DENTE: W5031 / L1039",
		testId: "cbct-quick-wl-ez3d-bone",
	},
] as const;

/**
 * Props for Quick W/L Contrast Presets Bar
 */
export interface CbctQuickWlBarProps {
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly onSelectPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * 1-Click W/L Contrast Presets Bar (Strict 28px height, 0-clutter)
 * «Кость (W2500/L500)», «Эмаль/Дентин (W4000/L1200)», «Мягкие ткани (W400/L40)»
 */
export const CbctQuickWlBar: React.FC<CbctQuickWlBarProps> = ({
	windowWidth = 4400,
	windowLevel = 1300,
	onSelectPreset,
	className = "",
}) => {
	return (
		<div
			className={`inline-flex items-center gap-1 pointer-events-auto select-none bg-zinc-950/85 backdrop-blur-md p-0.5 rounded-md border border-zinc-800 shadow-md ${className}`}
			role="group"
			aria-label="Быстрые пресеты W/L контрастности"
			data-testid="cbct-quick-wl-bar"
		>
			{CBCT_QUICK_WL_PRESETS.map((preset) => {
				const isCurrent =
					Math.abs(windowWidth - preset.windowWidth) <= 50 &&
					Math.abs(windowLevel - preset.windowLevel) <= 25;

				return (
					<button
						key={preset.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onSelectPreset?.({
								windowWidth: preset.windowWidth,
								windowLevel: preset.windowLevel,
							});
						}}
						className={`h-6 min-h-[24px] max-h-[24px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
							isCurrent
								? "bg-cyan-950/70 text-cyan-200 font-medium border border-cyan-500/50 shadow-xs"
								: "bg-zinc-900/80 border border-zinc-700/70 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
						}`}
						title={preset.descriptionRu}
						data-testid={preset.testId}
					>
						{isCurrent && <Check className="w-3 h-3 text-cyan-200 shrink-0" />}
						<span className="truncate">{preset.shortLabel}</span>
					</button>
				);
			})}
		</div>
	);
};

/**
 * Props for Quick Colormap & Sharpening HUD Bar
 */
export interface CbctQuickColormapBarProps {
	readonly colorMap?: CbctColorMapMode | number | undefined;
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * 1-Click WebGL2 Colormap & Sharpening HUD Bar (Strict 24–28px height, 0-clutter)
 * «Серый (DICOM)», «Плотность кости (Миш D1-D4)», «Эндо», «Печать», «Резкость балочек»
 */
export const CbctQuickColormapBar: React.FC<CbctQuickColormapBarProps> = ({
	colorMap,
	onSelectColorMap,
	sharpenAmount,
	onChangeSharpenAmount,
	className = "",
}) => {
	const [localColorMap, setLocalColorMap] = useState<CbctColorMapMode>(() => {
		if (colorMap !== undefined) {
			if (typeof colorMap === "number") {
				return colorMap === 1 ? "bone_density" : colorMap === 2 ? "endo" : colorMap === 3 ? "inverted" : "grayscale";
			}
			return colorMap;
		}
		try {
			const gl = getSharedCbctGlContext();
			const code = gl.getColorMap();
			return code === 1 ? "bone_density" : code === 2 ? "endo" : code === 3 ? "inverted" : "grayscale";
		} catch {
			return "grayscale";
		}
	});

	const [localSharpen, setLocalSharpen] = useState<number>(() => {
		if (sharpenAmount !== undefined) return sharpenAmount;
		try {
			return getSharedCbctGlContext().getSharpenAmount();
		} catch {
			return 0.0;
		}
	});

	useEffect(() => {
		if (colorMap !== undefined) {
			const resolved: CbctColorMapMode =
				typeof colorMap === "number"
					? colorMap === 1 ? "bone_density" : colorMap === 2 ? "endo" : colorMap === 3 ? "inverted" : "grayscale"
					: colorMap;
			setLocalColorMap(resolved);
		}
	}, [colorMap]);

	useEffect(() => {
		if (sharpenAmount !== undefined) {
			setLocalSharpen(sharpenAmount);
		}
	}, [sharpenAmount]);

	const activeColorMap: CbctColorMapMode = useMemo(() => {
		const cm = colorMap !== undefined ? colorMap : localColorMap;
		if (typeof cm === "number") {
			return cm === 1 ? "bone_density" : cm === 2 ? "endo" : cm === 3 ? "inverted" : "grayscale";
		}
		return cm;
	}, [colorMap, localColorMap]);

	const currentSharpen = sharpenAmount !== undefined ? sharpenAmount : localSharpen;

	const handleSelectColormap = useCallback(
		(mode: CbctColorMapMode) => {
			setLocalColorMap(mode);
			try {
				getSharedCbctGlContext().setColorMap(mode);
			} catch {
				/* safe */
			}
			onSelectColorMap?.(mode);
		},
		[onSelectColorMap],
	);

	const handleToggleSharpen = useCallback(() => {
		const next = getNextSharpenAmount(currentSharpen);
		setLocalSharpen(next);
		try {
			getSharedCbctGlContext().setSharpenAmount(next);
		} catch {
			/* safe */
		}
		onChangeSharpenAmount?.(next);
	}, [currentSharpen, onChangeSharpenAmount]);

	return (
		<div
			className={`inline-flex items-center gap-1 pointer-events-auto select-none bg-zinc-950/85 backdrop-blur-md p-0.5 rounded-md border border-zinc-800 shadow-md ${className}`}
			role="group"
			aria-label="Цветовые карты и резкость балочек WebGL2"
			data-testid="cbct-quick-colormap-bar"
		>
			<Palette className="w-3.5 h-3.5 text-purple-400 ml-1 mr-0.5 shrink-0 hidden sm:inline-block" />

			{CBCT_QUICK_COLORMAP_PRESETS.map((preset) => {
				const isCurrent = activeColorMap === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleSelectColormap(preset.id);
						}}
						className={`h-6 min-h-[24px] max-h-[24px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
							isCurrent
								? "bg-purple-950/70 text-purple-200 font-medium border border-purple-500/50 shadow-xs"
								: "bg-zinc-900/80 border border-zinc-700/70 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
						}`}
						title={preset.descriptionRu}
						data-testid={preset.testId}
					>
						{isCurrent && <Check className="w-3 h-3 text-purple-200 shrink-0" />}
						<span className="truncate">{preset.shortLabel}</span>
					</button>
				);
			})}

			<div className="w-px h-4 bg-zinc-700/80 mx-0.5 shrink-0" role="separator" />

			{/* 1-Click Trabecular Bone Sharpening Toggle */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					handleToggleSharpen();
				}}
				className={`h-6 min-h-[24px] max-h-[24px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
					currentSharpen > 0
						? "bg-emerald-950/70 text-emerald-200 font-medium border border-emerald-500/50 shadow-xs ring-1 ring-emerald-400/30"
						: "bg-zinc-900/80 border border-zinc-700/70 text-zinc-300 hover:text-white hover:bg-zinc-800"
				}`}
				title={`Резкость балочек кости (Лапласиан): ${currentSharpen <= 0.05 ? "Выкл" : currentSharpen <= 0.55 ? "50%" : "100%"}`}
				data-testid="cbct-quick-sharpen-toggle"
			>
				<Sparkles className={`w-3 h-3 shrink-0 ${currentSharpen > 0 ? "text-emerald-200" : "text-zinc-400"}`} />
				<span className="truncate">
					Резкость: {currentSharpen <= 0.05 ? "Выкл" : currentSharpen <= 0.55 ? "50%" : "100%"}
				</span>
			</button>
		</div>
	);
};
