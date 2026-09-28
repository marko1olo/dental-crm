import React from "react";
import {
	Crosshair,
	Eye,
	Layers,
	RotateCcw,
	Ruler,
	Sliders,
	Sparkles,
	Trash2,
	UploadCloud,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import {
	CEPHALOMETRIC_LANDMARKS,
	type LandmarkKey,
	type LandmarkMap,
} from "./cephalometricMath";

export type XrayFilterMode = "normal" | "invert" | "bone" | "edge";

export interface CephalometricHudStripProps {
	filterMode: XrayFilterMode;
	onFilterModeChange?: ((mode: XrayFilterMode) => void) | undefined;
	zoom: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetView: () => void;
	isCalibrating: boolean;
	onToggleCalibrating: () => void;
	showPolygon: boolean;
	onTogglePolygon?: (() => void) | undefined;
	showPlanes: boolean;
	onTogglePlanes?: (() => void) | undefined;
	showLabels: boolean;
	onToggleLabels?: (() => void) | undefined;
	imageUrl: string | null;
	isAllLandmarksPlaced: boolean;
	activeTargetKey: LandmarkKey | null;
	landmarks: LandmarkMap;
	onSelectTargetKey: (key: LandmarkKey | null) => void;
	onFileProcess: (file: File) => void;
	onLoadPreset?: (() => void) | undefined;
	onResetLandmarks?: (() => void) | undefined;
}

export function CephalometricHudStrip({
	filterMode,
	onFilterModeChange,
	zoom,
	onZoomIn,
	onZoomOut,
	onResetView,
	isCalibrating,
	onToggleCalibrating,
	showPolygon,
	onTogglePolygon,
	showPlanes,
	onTogglePlanes,
	showLabels,
	onToggleLabels,
	imageUrl,
	isAllLandmarksPlaced,
	activeTargetKey,
	landmarks,
	onSelectTargetKey,
	onFileProcess,
	onLoadPreset,
	onResetLandmarks,
}: CephalometricHudStripProps) {
	return (
		<div
			data-testid="ceph-unified-hud-strip"
			className="absolute top-2 sm:top-2.5 left-2 sm:left-3 right-2 sm:right-3 z-30 flex items-center gap-1 sm:gap-1.5 bg-slate-900/95 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md min-h-[36px] h-9 select-none overflow-x-auto flex-nowrap whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pointer-events-auto max-w-full"
		>
			{/* 1. [Пресеты WW/WL] */}
			<div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0 flex-nowrap">
				{(
					[
						{ id: "normal", label: "Стандарт" },
						{ id: "invert", label: "Инверсия" },
						{ id: "bone", label: "Костный (Bone+)" },
						{ id: "edge", label: "Контуры" },
					] as const
				).map((flt) => (
					<button
						key={flt.id}
						type="button"
						onClick={() => onFilterModeChange?.(flt.id)}
						className={`h-7 px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center whitespace-nowrap shrink-0 ${
							filterMode === flt.id
								? "bg-teal-950/80 border border-teal-400 text-teal-200 shadow-xs"
								: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700"
						}`}
						title={`Фильтр рентгенограммы: ${flt.label}`}
					>
						{flt.label}
					</button>
				))}
			</div>

			<div className="w-[1px] h-5 bg-slate-700 shrink-0 mx-0.5" />

			{/* 2. [Зум/Сброс] */}
			<div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0 flex-nowrap">
				<button
					type="button"
					disabled={false}
					onClick={onZoomOut}
					className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-md flex items-center justify-center bg-slate-800 text-slate-100 hover:text-white hover:bg-slate-700 border border-slate-600 transition-colors cursor-pointer"
					title="Отдалить (Масштаб -)"
					aria-label="Отдалить масштаб"
				>
					<ZoomOut size={14} />
				</button>
				<span className="text-xs font-mono font-bold text-teal-300 px-1 min-w-[36px] text-center">
					{Math.round(zoom * 100)}%
				</span>
				<button
					type="button"
					disabled={false}
					onClick={onZoomIn}
					className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-md flex items-center justify-center bg-slate-800 text-slate-100 hover:text-white hover:bg-slate-700 border border-slate-600 transition-colors cursor-pointer"
					title="Приблизить (Масштаб +)"
					aria-label="Приблизить масштаб"
				>
					<ZoomIn size={14} />
				</button>
				<button
					type="button"
					disabled={false}
					onClick={onResetView}
					className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] rounded-md flex items-center justify-center bg-slate-800 text-slate-100 hover:text-white hover:bg-slate-700 border border-slate-600 transition-colors cursor-pointer"
					title="Сбросить масштаб и положение (0)"
					aria-label="Сбросить масштаб"
				>
					<RotateCcw size={13} />
				</button>
				<button
					type="button"
					disabled={false}
					onClick={onToggleCalibrating}
					className={`min-h-[32px] sm:min-h-[36px] min-w-[96px] px-2.5 rounded-md flex items-center gap-1.5 text-xs font-bold shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
						isCalibrating
							? "bg-amber-500 text-slate-950 font-black border border-amber-300 shadow-sm"
							: "bg-slate-800 text-slate-100 hover:text-white hover:bg-slate-700 border border-slate-600 shadow-sm"
					}`}
					style={{ minWidth: "96px", flexShrink: 0, whiteSpace: "nowrap" }}
					title="Калибровка масштаба по линейке (мм/px)"
					aria-label="Калибровка масштаба"
				>
					<Ruler size={13} className="shrink-0 text-teal-400" />
					<span style={{ whiteSpace: "nowrap", flexShrink: 0, fontWeight: 700 }}>Линейка</span>
				</button>
			</div>

			<div className="w-[1px] h-5 bg-slate-700 shrink-0 mx-0.5" />

			{/* 3. [Скрыть плоскости/полигон] */}
			<div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 shrink-0 flex-nowrap">
				<button
					type="button"
					onClick={onTogglePolygon}
					className={`h-7 min-w-max px-2 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						showPolygon
							? "bg-teal-950/80 border border-teal-400 text-teal-200 shadow-xs"
							: "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
					}`}
					title="Включить / отключить цефалометрический полигон"
				>
					<Layers size={13} />
					<span>Полигон</span>
				</button>
				<button
					type="button"
					onClick={onTogglePlanes}
					className={`h-7 min-w-max px-2 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						showPlanes
							? "bg-teal-950/80 border border-teal-400 text-teal-200 shadow-xs"
							: "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
					}`}
					title="Включить / отключить плоскости (SN, FH, MP, OP)"
				>
					<Sliders size={13} />
					<span>Плоскости</span>
				</button>
				<button
					type="button"
					onClick={onToggleLabels}
					className={`h-7 min-w-max px-2 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						showLabels
							? "bg-teal-950/80 border border-teal-400 text-teal-200 shadow-xs"
							: "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700"
					}`}
					title="Включить / отключить подписи анатомических точек"
				>
					<Eye size={13} />
					<span>Подписи</span>
				</button>
			</div>

			<div className="w-[1px] h-5 bg-slate-700 shrink-0 mx-0.5" />

			{/* 4. [Статус] */}
			<div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-bold text-slate-100 shrink-0 min-w-0 max-w-[280px]">
				<Crosshair size={14} className="text-teal-400 animate-pulse shrink-0" />
				<div className="text-xs font-bold text-slate-100 min-w-0 truncate">
					{!imageUrl ? (
						<span className="text-slate-300 font-medium">
							Ожидание загрузки ТРГ
						</span>
					) : isAllLandmarksPlaced ? (
						<span className="text-emerald-300 font-bold">
							Все 16 точек заданы. Расчет углов готов
						</span>
					) : activeTargetKey ? (
						<span className="flex items-center gap-1">
							<span className="text-slate-400 font-normal mr-1">
								{landmarks[activeTargetKey] ? "Точка задана:" : "Установите точку:"}
							</span>
							<span className="text-teal-300 font-extrabold uppercase">
								{CEPHALOMETRIC_LANDMARKS.find((l) => l.key === activeTargetKey)?.nameRu}
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onSelectTargetKey(null);
								}}
								className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer ml-1"
								title="Отменить выбор ориентира (Esc)"
								aria-label="Отменить выбор ориентира"
							>
								<X size={12} />
							</button>
						</span>
					) : (
						<span className="text-slate-300 font-medium">
							16 ориентиров ТРГ
						</span>
					)}
				</div>
			</div>

			<div className="w-[1px] h-5 bg-slate-700 shrink-0 mx-0.5" />

			{/* 5. [Действия (Загрузить, Эталон, Сбросить)] */}
			<div className="flex items-center gap-1 shrink-0 flex-nowrap">
				<label
					className="h-7 min-w-max px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border border-slate-600 shadow-sm whitespace-nowrap shrink-0"
					title="Загрузить пользовательский снимок ТРГ"
				>
					<UploadCloud size={13} />
					<span>Загрузить снимок ТРГ</span>
					<input
						type="file"
						accept="image/*,.dcm"
						className="hidden"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) {
								onFileProcess(file);
							}
						}}
					/>
				</label>
				{onLoadPreset && (
					<button
						type="button"
						onClick={onLoadPreset}
						className="h-7 min-w-max px-2 rounded-md bg-teal-900/80 hover:bg-teal-800 text-teal-200 text-xs font-bold flex items-center gap-1 transition-colors border border-teal-500 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
						title="Загрузить эталонную анатомическую разметку со снимком"
					>
						<Sparkles size={13} />
						<span>Эталонная разметка</span>
					</button>
				)}
				{onResetLandmarks && (
					<button
						type="button"
						onClick={onResetLandmarks}
						className="h-7 min-w-max px-2 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-bold flex items-center gap-1 transition-colors border border-rose-700 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
						title="Сбросить все точки"
					>
						<Trash2 size={12} />
						<span>Сбросить</span>
					</button>
				)}
			</div>
		</div>
	);
}
