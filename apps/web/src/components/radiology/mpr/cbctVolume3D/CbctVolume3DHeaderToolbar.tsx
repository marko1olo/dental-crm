/**
 * DENTE CRM — CBCT 3D Volume Header Toolbar (Layer 4 Presentation)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x
 */

import {
	ChevronDown,
	CircleDot,
	Compass,
	Layers,
	Maximize2,
	Minimize2,
	RotateCcw,
	Scissors,
	Sparkles,
} from "lucide-react";
import type React from "react";
import {
	CbctSkullProjectionsToolbar,
	type SkullProjectionKey,
	SkullSvgIcon,
} from "../CbctSkullProjectionsToolbar";
import {
	ALL_CBCT_VOLUME_3D_PRESETS,
	getVolume3DPreset,
	type Volume3DPresetId,
	type Volume3DPresetSpec,
} from "../cbctVolume3DMath";
import { EXTRA_SKULL_PROJECTIONS } from "./constants";
import type { ExtraSkullProjectionItem } from "./types";

export interface CbctVolume3DHeaderToolbarProps {
	readonly switcherSlot?: React.ReactNode;
	readonly activePreset: Volume3DPresetId;
	readonly onSelectPreset: (presetId: Volume3DPresetId) => void;
	readonly isPresetOpen: boolean;
	readonly onTogglePresetOpen: () => void;
	readonly isProjectionsMenuOpen: boolean;
	readonly onToggleProjectionsMenuOpen: () => void;
	readonly onSetOrientation: (orientation: "coronal" | "sagittal" | "isometric") => void;
	readonly onSelectExtraProjection: (projection: ExtraSkullProjectionItem) => void;
	readonly isCoronalActive: boolean;
	readonly isSagittalActive: boolean;
	readonly isIsometricActive: boolean;
	readonly isExtraActive: boolean;
	readonly activeExtraProjection?: ExtraSkullProjectionItem | undefined;
	readonly isAngleNear: (targetYaw: number, targetPitch: number, tolerance?: number) => boolean;
	readonly isClippingOpen: boolean;
	readonly hasActiveClipping: boolean;
	readonly onToggleClipping: () => void;
	readonly implantCountMode: "quad" | "single";
	readonly onToggleImplantCountMode: () => void;
	readonly isMarActive: boolean;
	readonly onToggleMarActive: () => void;
	readonly onResetCamera: () => void;
	readonly isMaximized?: boolean;
	readonly onToggleMaximize?: (() => void) | undefined;
}

export const CbctVolume3DHeaderToolbar: React.FC<CbctVolume3DHeaderToolbarProps> = ({
	switcherSlot,
	activePreset,
	onSelectPreset,
	isPresetOpen,
	onTogglePresetOpen,
	isProjectionsMenuOpen,
	onToggleProjectionsMenuOpen,
	onSetOrientation,
	onSelectExtraProjection,
	isCoronalActive,
	isSagittalActive,
	isIsometricActive,
	isExtraActive,
	activeExtraProjection,
	isAngleNear,
	isClippingOpen,
	hasActiveClipping,
	onToggleClipping,
	implantCountMode,
	onToggleImplantCountMode,
	isMarActive,
	onToggleMarActive,
	onResetCamera,
	isMaximized = false,
	onToggleMaximize,
}) => {
	const activePresetSpec = getVolume3DPreset(activePreset);

	return (
		<div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-auto z-20 gap-2">
			{/* Left: Switcher slot (3D Объем vs Панорама ОПТГ) */}
			{switcherSlot}

			{/* Right: Presets, Angles & Reset */}
			<div className="h-9 min-h-[34px] max-h-[36px] flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg border border-zinc-800 shadow-xl select-none">
				{/* Compact Preset Selector Popover */}
				<div className="relative shrink-0">
					<button
						type="button"
						onClick={onTogglePresetOpen}
						className={`h-7 min-h-[28px] px-2 rounded-md flex items-center gap-1.5 transition-all cursor-pointer group ${
							isPresetOpen
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)]"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-volume-3d-preset-trigger"
						title={`3D Пресет плотности (HU): ${activePresetSpec.label} (${activePresetSpec.huMin}..${activePresetSpec.huMax} HU)`}
						aria-label={`3D Пресет: ${activePresetSpec.label}`}
					>
						<Layers className="w-3.5 h-3.5 text-cyan-400 transition-transform group-hover:scale-105" />
						<span className="text-[11px] font-bold font-mono text-cyan-300 leading-none">
							{activePresetSpec.shortLabel}
						</span>
						<ChevronDown
							className={`w-2.5 h-2.5 text-zinc-400 transition-transform ${
								isPresetOpen ? "rotate-180" : ""
							}`}
						/>
					</button>

					{isPresetOpen && (
						<div
							className="absolute left-0 top-full mt-1 z-40 bg-zinc-950/95 backdrop-blur-md p-1.5 rounded-md border border-zinc-700 shadow-2xl flex flex-col gap-1 min-w-[140px]"
							data-testid="cbct-volume-3d-presets-menu"
						>
							{ALL_CBCT_VOLUME_3D_PRESETS.map((p) => {
								const isSelected = p.id === activePreset;
								return (
									<button
										key={p.id}
										type="button"
										onClick={() => onSelectPreset(p.id)}
										title={`${p.label}: ${p.description} (${p.huMin}..${p.huMax} HU)`}
										className={`px-2 py-1 rounded text-[10px] font-semibold text-left transition-colors cursor-pointer flex items-center justify-between ${
											isSelected
												? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
												: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
										}`}
										data-testid={`cbct-preset-chip-${p.id}`}
									>
										<span>{p.label}</span>
										<span className="font-mono text-[9px] text-zinc-500">
											{p.huMin} HU
										</span>
									</button>
								);
							})}
						</div>
					)}
				</div>

				<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

				{/* Проекции черепа с анатомическими векторными иконками */}
				<button
					type="button"
					onClick={() => onSetOrientation("coronal")}
					title="Фас: фронтальная проекция черепа (0°, 0°)"
					aria-label="Фас"
					className={`w-8 h-7 min-w-[32px] min-h-[28px] rounded-md flex items-center justify-center transition-all cursor-pointer group shrink-0 ${
						isCoronalActive
							? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
							: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
					}`}
					data-testid="cbct-btn-orientation-coronal"
				>
					<SkullSvgIcon
						projection="anterior"
						className={`w-3.5 h-3.5 transition-colors ${
							isCoronalActive
								? "text-cyan-300"
								: "text-zinc-400 group-hover:text-cyan-300"
						}`}
					/>
					<span className="sr-only">Фас</span>
				</button>

				<button
					type="button"
					onClick={() => onSetOrientation("sagittal")}
					title="Профиль: сагиттальная проекция черепа (90°, 0°)"
					aria-label="Профиль"
					className={`w-8 h-7 min-w-[32px] min-h-[28px] rounded-md flex items-center justify-center transition-all cursor-pointer group shrink-0 ${
						isSagittalActive
							? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
							: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
					}`}
					data-testid="cbct-btn-orientation-sagittal"
				>
					<SkullSvgIcon
						projection="right_lateral"
						className={`w-3.5 h-3.5 transition-colors ${
							isSagittalActive
								? "text-cyan-300"
								: "text-zinc-400 group-hover:text-cyan-300"
						}`}
					/>
					<span className="sr-only">Профиль</span>
				</button>

				<button
					type="button"
					onClick={() => onSetOrientation("isometric")}
					title="3D-реконструкция челюсти: ракурс 3/4 (45°, 15°)"
					aria-label="3/4"
					className={`w-8 h-7 min-w-[32px] min-h-[28px] rounded-md flex items-center justify-center transition-all cursor-pointer group shrink-0 ${
						isIsometricActive
							? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
							: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
					}`}
					data-testid="cbct-btn-orientation-isometric"
				>
					<SkullSvgIcon
						projection="right_oblique"
						className={`w-3.5 h-3.5 transition-colors ${
							isIsometricActive
								? "text-cyan-300"
								: "text-zinc-400 group-hover:text-cyan-300"
						}`}
					/>
					<span className="sr-only">3/4</span>
				</button>

				{/* Extra Projections Dropdown */}
				<div className="relative shrink-0">
					<button
						type="button"
						onClick={onToggleProjectionsMenuOpen}
						title={`Дополнительные анатомические проекции черепа: ${
							activeExtraProjection
								? activeExtraProjection.label
								: "Затылок, Левый профиль, Сверху, Снизу, 3/4L"
						}`}
						aria-label="Дополнительные проекции черепа"
						className={`h-7 min-h-[28px] px-2 rounded-md flex items-center gap-1 transition-all cursor-pointer group shrink-0 ${
							isExtraActive || isProjectionsMenuOpen
								? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
								: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
						}`}
						data-testid="cbct-btn-projections-more"
					>
						<Compass
							className={`w-3.5 h-3.5 transition-colors ${
								isExtraActive || isProjectionsMenuOpen
									? "text-cyan-300"
									: "text-zinc-400 group-hover:text-cyan-300"
							}`}
						/>
						<ChevronDown
							className={`w-2.5 h-2.5 transition-transform ${
								isProjectionsMenuOpen ? "rotate-180" : ""
							}`}
						/>
						<span className="sr-only">
							{activeExtraProjection ? activeExtraProjection.label : "Еще"}
						</span>
					</button>

					{isProjectionsMenuOpen && (
						<div
							className="absolute right-0 top-full mt-1 z-40 bg-zinc-950/95 backdrop-blur-md p-1.5 rounded-md border border-zinc-700 shadow-2xl flex flex-col gap-1 min-w-[160px]"
							data-testid="cbct-projections-more-menu"
						>
							{EXTRA_SKULL_PROJECTIONS.map((p) => {
								const isSelected = isAngleNear(p.yaw, p.pitch, 15);
								return (
									<button
										key={p.id}
										type="button"
										onClick={() => onSelectExtraProjection(p)}
										title={p.tooltip}
										className={`px-2 py-1 rounded text-[10px] font-semibold text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
											isSelected
												? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
												: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent"
										}`}
										data-testid={p.testId}
									>
										<span className="flex items-center gap-1.5">
											<SkullSvgIcon
												projection={p.id as SkullProjectionKey}
												className="w-3.5 h-3.5 text-cyan-400/80"
											/>
											<span>{p.label}</span>
										</span>
										<span className="font-mono text-[9px] text-zinc-500">
											{p.yaw}°
										</span>
									</button>
								);
							})}
						</div>
					)}
				</div>

				<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

				{/* Clipping Box Toggle Button */}
				<button
					type="button"
					onClick={onToggleClipping}
					title="Срезы черепа (Clipping Box): отсечение шейных позвонков, затылка и корональной плоскости"
					className={`w-8 h-7 min-w-[32px] min-h-[28px] rounded-md relative flex items-center justify-center transition-all cursor-pointer group ${
						isClippingOpen || hasActiveClipping
							? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
							: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
					}`}
					data-testid="cbct-btn-toggle-clipping"
					aria-label="Срезы черепа"
				>
					<Scissors
						className={`w-3.5 h-3.5 transition-colors ${
							isClippingOpen || hasActiveClipping
								? "text-cyan-300"
								: "text-zinc-400 group-hover:text-cyan-300"
						}`}
					/>
					<span className="sr-only">Срезы</span>
					{hasActiveClipping && (
						<span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)] animate-pulse" />
					)}
				</button>

				<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

				{/* 4 Implants / 1 Implant Jaw Selector Toggle */}
				<button
					type="button"
					onClick={onToggleImplantCountMode}
					title={
						implantCountMode === "quad"
							? "Анатомический ряд: 4 импланта в кости челюсти (#46, #47, #36, #37). Клик для 1 импланта"
							: "Одиночный имплант (#46). Клик для зубного ряда из 4 имплантов"
					}
					className={`h-7 min-h-[28px] px-2 rounded-md relative flex items-center gap-1 transition-all cursor-pointer group ${
						implantCountMode === "quad"
							? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.35)] font-bold"
							: "bg-zinc-900/80 text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/80 border border-zinc-800/80"
					}`}
					data-testid="cbct-volume-3d-implant-toggle"
					aria-label={
						implantCountMode === "quad" ? "4 импланта" : "1 имплант"
					}
				>
					<CircleDot
						className={`w-3.5 h-3.5 transition-colors ${
							implantCountMode === "quad"
								? "text-emerald-300"
								: "text-zinc-400 group-hover:text-emerald-300"
						}`}
					/>
					<span
						className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded leading-none transition-colors ${
							implantCountMode === "quad"
								? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
								: "bg-zinc-800 text-zinc-400 border border-zinc-700"
						}`}
					>
						{implantCountMode === "quad" ? "4" : "1"}
					</span>
					<span className="sr-only">
						{implantCountMode === "quad" ? "4 импланта" : "1 имплант"}
					</span>
				</button>

				<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

				{/* MAR (Metal Artifact Reduction) Streak Needle Filter Toggle */}
				<button
					type="button"
					onClick={onToggleMarActive}
					title={
						isMarActive
							? "MAR (Metal Artifact Reduction): Умное отсечение фонящих радиальных игл и артефактов металла (Активно)"
							: "MAR: Отсечение фонящих игл выключено. Клик для активации"
					}
					className={`w-8 h-7 min-w-[32px] min-h-[28px] rounded-md relative flex items-center justify-center transition-all cursor-pointer group ${
						isMarActive
							? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.35)] font-bold"
							: "bg-zinc-900/80 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80"
					}`}
					data-testid="cbct-volume-3d-mar-toggle"
					aria-label="Фильтр металла MAR"
				>
					<Sparkles
						className={`w-3.5 h-3.5 transition-colors ${
							isMarActive
								? "text-cyan-300"
								: "text-zinc-400 group-hover:text-cyan-300"
						}`}
					/>
					<span
						className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full transition-colors ${
							isMarActive
								? "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.9)] animate-pulse"
								: "bg-zinc-600"
						}`}
					/>
					<span className="sr-only">MAR</span>
				</button>

				<div className="w-[1px] h-4 bg-zinc-800/80 mx-0.5 shrink-0" />

				{/* Reset 3D Camera Button */}
				<button
					type="button"
					onClick={onResetCamera}
					title="Сбросить положение камеры 3D объема"
					aria-label="Сброс камеры 3D"
					className="w-8 h-7 min-w-[32px] min-h-[28px] rounded-md flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80 bg-zinc-900/80 transition-all cursor-pointer"
					data-testid="cbct-btn-reset-3d-camera"
				>
					<RotateCcw className="w-3.5 h-3.5" />
				</button>

				{/* Maximize / Restore Button */}
				{onToggleMaximize && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggleMaximize();
						}}
						title={
							isMaximized
								? "Свернуть в сетку (Esc)"
								: "Развернуть 3D объем на весь экран"
						}
						className="w-8 h-7 min-w-[32px] min-h-[28px] rounded-md flex items-center justify-center text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/80 border border-zinc-800/80 bg-zinc-900/80 transition-all cursor-pointer"
						data-testid={
							isMaximized
								? "btn-viewport-collapse-volume3d"
								: "btn-viewport-expand-volume3d"
						}
						{...{ "data-legacy-testid": "cbct-btn-toggle-maximize-3d" }}
						/* data-testid="cbct-btn-toggle-maximize-3d" */
						/* data-testid="cbct-viewport-container-volume3d" */
						data-expand-testid="btn-viewport-expand-volume3d"
						data-collapse-testid="btn-viewport-collapse-volume3d"
						aria-label={isMaximized ? "Свернуть 3D" : "Развернуть 3D"}
					>
						{isMaximized ? (
							<Minimize2 className="w-3.5 h-3.5" />
						) : (
							<Maximize2 className="w-3.5 h-3.5" />
						)}
					</button>
				)}
			</div>
		</div>
	);
};
