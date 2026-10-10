import { Sliders } from "lucide-react";
import React from "react";
import {
	CLINICAL_RADIOLOGY_PRESETS,
	type SlabProjectionMode,
} from "../cbctMprMath";

export interface CbctContrastPopoverProps {
	readonly isOpen: boolean;
	readonly activePresetId?: string | undefined;
	readonly onSelectClinicalPreset?: ((presetId: string) => void) | undefined;
	readonly windowWidth: number;
	readonly onChangeWindowWidth?: ((w: number) => void) | undefined;
	readonly windowLevel: number;
	readonly onChangeWindowLevel?: ((l: number) => void) | undefined;
	readonly slabThicknessMm: number;
	readonly onChangeSlabThicknessMm?: ((th: number) => void) | undefined;
	readonly slabMode: SlabProjectionMode;
	readonly onChangeSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;
	readonly panoThicknessMm: number;
	readonly onChangePanoThicknessMm?: ((th: number) => void) | undefined;
}

export const CbctContrastPopover: React.FC<CbctContrastPopoverProps> = ({
	isOpen,
	activePresetId,
	onSelectClinicalPreset,
	windowWidth,
	onChangeWindowWidth,
	windowLevel,
	onChangeWindowLevel,
	slabThicknessMm,
	onChangeSlabThicknessMm,
	slabMode,
	onChangeSlabMode,
	panoThicknessMm,
	onChangePanoThicknessMm,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="absolute right-0 top-full mt-1.5 w-[calc(100vw-24px)] sm:w-80 max-w-[340px] max-h-[calc(100vh-60px)] overflow-y-auto bg-zinc-900/98 border border-zinc-700/90 rounded-lg shadow-2xl p-2.5 z-50 flex flex-col gap-2.5 backdrop-blur-md text-zinc-300"
			data-testid="cbct-contrast-controls-popover"
		>
			<div className="flex items-center justify-between text-xs font-bold text-cyan-300 border-b border-zinc-800 pb-1.5">
				<span className="flex items-center gap-1.5">
					<Sliders className="w-3.5 h-3.5 text-cyan-400" />
					Настройка КЛКТ (W/L)
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => {
							const url = new URL(window.location.href);
							url.searchParams.set("cbct", "tuner");
							window.history.pushState({}, "", url.toString());
							window.dispatchEvent(new CustomEvent("dente:open-cbct-tuner"));
						}}
						className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
						title="Открыть интерактивный тюнер КЛКТ (?cbct=tuner)"
						data-testid="cbct-header-tuner-btn"
					>
						Тюнер
					</button>
					<button
						type="button"
						onClick={() => {
							onSelectClinicalPreset?.("standard");
							onChangeWindowWidth?.(4025);
							onChangeWindowLevel?.(525);
							onChangeSlabThicknessMm?.(1.0);
							onChangeSlabMode?.("single");
							onChangePanoThicknessMm?.(1.0);
						}}
						className="text-[10px] text-zinc-400 hover:text-cyan-300 underline cursor-pointer"
						title="Сбросить на базовый дефолт (W:4025, L:525, 1.0 мм)"
					>
						Дефолт (4025/525)
					</button>
				</div>
			</div>

			{/* Клинические базовые пресеты */}
			<div className="flex flex-col gap-1">
				<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
					Клинические пресеты
				</span>
				<div className="grid grid-cols-2 gap-1">
					{CLINICAL_RADIOLOGY_PRESETS.map((pr) => {
						const isSelected =
							activePresetId === pr.id ||
							(Math.abs(windowWidth - pr.windowWidth) <= 50 &&
								Math.abs(windowLevel - pr.windowLevel) <= 30);
						return (
							<button
								key={pr.id}
								type="button"
								onClick={() => {
									onSelectClinicalPreset?.(pr.id);
									onChangeWindowWidth?.(pr.windowWidth);
									onChangeWindowLevel?.(pr.windowLevel);
									onChangeSlabThicknessMm?.(pr.slabThicknessMm);
									onChangeSlabMode?.(pr.slabMode);
									onChangePanoThicknessMm?.(pr.panoThicknessMm);
								}}
								className={`px-2 py-1 rounded text-xs font-medium text-left transition-all border cursor-pointer ${
									isSelected
										? "bg-cyan-950/70 text-cyan-200 border-cyan-500/60 shadow-xs font-semibold"
										: "bg-zinc-850/80 text-zinc-400 border-zinc-750 hover:bg-zinc-800 hover:text-zinc-200"
								}`}
								title={pr.descriptionRu}
								data-testid={pr.testId}
							>
								<div className="truncate">{pr.label}</div>
								<div className="text-[9px] font-mono opacity-70">
									{pr.slabThicknessMm} мм • {pr.slabMode}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Толщина среза (MPR / Slab) */}
			{onChangeSlabThicknessMm && (
				<div className="flex flex-col gap-1">
					<div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
						<span>Толщина среза (MPR / Slab)</span>
						<span className="font-mono text-cyan-300">
							{slabThicknessMm} мм
						</span>
					</div>
					<div className="grid grid-cols-5 gap-1">
						{[1.0, 2.0, 3.0, 5.0, 10.0].map((th) => {
							const isCur = Math.abs(slabThicknessMm - th) < 0.1;
							return (
								<button
									key={th}
									type="button"
									onClick={() => onChangeSlabThicknessMm(th)}
									className={`py-1 px-1 rounded text-center text-xs font-medium font-mono border transition-all cursor-pointer ${
										isCur
											? "bg-amber-950/70 text-amber-200 border-amber-500/60 shadow-xs font-semibold"
											: "bg-zinc-850/80 text-zinc-400 border-zinc-750 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
									data-testid={`cbct-header-slab-thickness-${th}`}
									title={`Толщина среза ${th} мм`}
								>
									{th} мм
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Слой ОПТГ панорамы */}
			{onChangePanoThicknessMm && (
				<div className="flex flex-col gap-1">
					<div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
						<span>Слой ОПТГ (Focal Trough)</span>
						<span className="font-mono text-purple-300">
							{(panoThicknessMm ?? 1.0).toFixed(1)} мм
						</span>
					</div>
					<input
						type="range"
						aria-label="Слой ОПТГ (1.0-16.0 мм)"
						min={1.0}
						max={16.0}
						step={0.5}
						value={panoThicknessMm ?? 1.0}
						onChange={(e) => onChangePanoThicknessMm(Number(e.target.value))}
						className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
						data-testid="cbct-header-slider-pano-thickness"
					/>
					<div className="flex justify-between text-[9px] text-zinc-500 font-mono">
						<span>1.0 мм (тонкий)</span>
						<span>8.0 мм</span>
						<span>16.0 мм (широкий)</span>
					</div>
				</div>
			)}

			{/* Режим рендеринга среза */}
			{onChangeSlabMode && (
				<div className="flex flex-col gap-1">
					<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
						Режим рендеринга среза
					</span>
					<div className="grid grid-cols-3 gap-1">
						{[
							{
								id: "single",
								label: "Тонкий срез",
								title: "Одиночный тонкий чистый срез без наслоений",
							},
							{
								id: "average",
								label: "Ray-Sum / Интеграл",
								title: "Рентгеновский интеграл плотностей (Average IP)",
							},
							{
								id: "mip",
								label: "MIP",
								title:
									"Максимальная интенсивность (только для костных ориентиров)",
							},
						].map((m) => {
							const isCur = slabMode === m.id;
							return (
								<button
									key={m.id}
									type="button"
									onClick={() => onChangeSlabMode(m.id as SlabProjectionMode)}
									className={`py-1 px-1.5 rounded text-center text-xs font-medium border transition-all cursor-pointer ${
										isCur
											? "bg-purple-950/70 text-purple-200 border-purple-500/60 shadow-xs font-semibold"
											: "bg-zinc-850/80 text-zinc-400 border-zinc-750 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
									title={m.title}
									data-testid={`cbct-header-slab-mode-${m.id}`}
								>
									{m.label}
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Слайдеры Window Width / Window Level */}
			<div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
				<div className="flex flex-col gap-0.5">
					<div className="flex justify-between text-xs">
						<span className="text-zinc-400">Контраст (Window Width W):</span>
						<span className="font-mono font-bold text-amber-300">
							{windowWidth} HU
						</span>
					</div>
					<input
						type="range"
						min={400}
						max={6000}
						step={50}
						value={windowWidth}
						onChange={(e) => onChangeWindowWidth?.(Number(e.target.value))}
						className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
						data-testid="cbct-header-slider-ww"
					/>
					<div className="flex justify-between text-[9px] text-zinc-500 font-mono">
						<span>Контрастный (400)</span>
						<span>Широкий (6000)</span>
					</div>
				</div>

				<div className="flex flex-col gap-0.5">
					<div className="flex justify-between text-xs">
						<span className="text-zinc-400">Яркость (Window Level L):</span>
						<span className="font-mono font-bold text-cyan-300">
							{windowLevel} HU
						</span>
					</div>
					<input
						type="range"
						min={-200}
						max={1500}
						step={25}
						value={windowLevel}
						onChange={(e) => onChangeWindowLevel?.(Number(e.target.value))}
						className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
						data-testid="cbct-header-slider-wl"
					/>
					<div className="flex justify-between text-[9px] text-zinc-500 font-mono">
						<span>Темный (-200)</span>
						<span>Светлый (+1500)</span>
					</div>
				</div>
			</div>
		</div>
	);
};
