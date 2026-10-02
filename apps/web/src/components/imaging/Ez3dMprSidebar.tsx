/**
 * DENTE CRM — VATECH Ez3D-i MPR Left Sidebar Component
 * Modular subcomponent for Ez3dMprCockpit.
 * Houses: Modeling tools, View mode, VR volume rendering presets, Window/Level sliders, Clipping ROI box.
 * Adheres strictly to Mandate 8b (<= 800 lines) and Mandate 8s (no bloat).
 */

import React from "react";
import {
	Box,
	RotateCcw,
	Sliders,
} from "lucide-react";
import {
	VR_PRESET_CONFIGS,
	type Ez3dVrPreset,
} from "./ez3dMprTypes.js";
import { showToast } from "../GlobalToast.js";

export interface Ez3dMprSidebarProps {
	readonly isCurveDrawingActive: boolean;
	readonly setIsCurveDrawingActive: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onAddImplant: () => void;
	readonly showAirway: boolean;
	readonly onAirwayToggle: () => void;
	readonly activeMode: "dim" | "overlay" | null;
	readonly setActiveMode: React.Dispatch<React.SetStateAction<"dim" | "overlay" | null>>;
	readonly vrPreset: Ez3dVrPreset;
	readonly setVrPreset: (preset: Ez3dVrPreset) => void;
	readonly windowWidth: number;
	readonly setWindowWidth: (val: number) => void;
	readonly windowLevel: number;
	readonly setWindowLevel: (val: number) => void;
	readonly clipPlane: string;
	readonly setClipPlane: (val: string) => void;
	readonly clipSide: "Справа" | "Слева";
	readonly setClipSide: (val: "Справа" | "Слева") => void;
	readonly isClippingApplied: boolean;
	readonly setIsClippingApplied: React.Dispatch<React.SetStateAction<boolean>>;
	readonly layoutMode: "4quad" | "single_3d" | "single_axial";
	readonly setLayoutMode: React.Dispatch<React.SetStateAction<"4quad" | "single_3d" | "single_axial">>;
}

export const Ez3dMprSidebar: React.FC<Ez3dMprSidebarProps> = ({
	isCurveDrawingActive,
	setIsCurveDrawingActive,
	onAddImplant,
	showAirway,
	onAirwayToggle,
	activeMode,
	setActiveMode,
	vrPreset,
	setVrPreset,
	windowWidth,
	setWindowWidth,
	windowLevel,
	setWindowLevel,
	clipPlane,
	setClipPlane,
	clipSide,
	setClipSide,
	isClippingApplied,
	setIsClippingApplied,
	layoutMode,
	setLayoutMode,
}) => {
	return (
		<div
			className="w-56 flex-shrink-0 flex flex-col border-r overflow-y-auto text-xs"
			style={{ backgroundColor: "#0e1726", borderColor: "#1e293b" }}
		>
			{/* Main Menu Button */}
			<button
				type="button"
				onClick={() => showToast("Главное меню томографа Ez3D-i", "info")}
				className="w-full text-center py-2 bg-slate-800 hover:bg-slate-700 font-bold uppercase tracking-wider text-slate-200 border-b border-slate-700 cursor-pointer"
			>
				ГЛАВНОЕ МЕНЮ
			</button>

			<div className="p-2 space-y-3">
				{/* БЛОК: МОДЕЛИРОВАНИЕ */}
				<div className="space-y-1">
					<div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						МОДЕЛИРОВАНИЕ
					</div>
					<div className="space-y-1">
						<button
							type="button"
							onClick={() => {
								setIsCurveDrawingActive((p) => !p);
								showToast(
									!isCurveDrawingActive
										? "Режим рисования кривой дуги челюсти активирован"
										: "Кривая дуги зафиксирована",
									"info",
								);
							}}
							className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors cursor-pointer font-medium ${
								isCurveDrawingActive
									? "bg-amber-900/40 border-amber-600 text-amber-200"
									: "bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700"
							}`}
						>
							Нарисовать кривую
						</button>
						<button
							type="button"
							onClick={onAddImplant}
							className="w-full text-left px-2.5 py-1.5 rounded bg-slate-800/90 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer font-medium"
						>
							Вставить имплантат
						</button>
						<button
							type="button"
							onClick={onAirwayToggle}
							className={`w-full text-left px-2.5 py-1.5 rounded border transition-colors cursor-pointer font-medium ${
								showAirway
									? "bg-cyan-900/40 border-cyan-600 text-cyan-200"
									: "bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700"
							}`}
						>
							Измерить дыхательный путь
						</button>
					</div>
				</div>

				{/* БЛОК: РЕЖИМ */}
				<div className="space-y-1">
					<div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						РЕЖИМ
					</div>
					<div className="grid grid-cols-2 gap-1">
						<button
							type="button"
							onClick={() => setActiveMode(activeMode === "dim" ? null : "dim")}
							className={`py-1 rounded text-center border font-medium cursor-pointer transition-colors ${
								activeMode === "dim"
									? "bg-emerald-800 border-emerald-600 text-white"
									: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
							}`}
						>
							Затемнить
						</button>
						<button
							type="button"
							onClick={() => setActiveMode(activeMode === "overlay" ? null : "overlay")}
							className={`py-1 rounded text-center border font-medium cursor-pointer transition-colors ${
								activeMode === "overlay"
									? "bg-emerald-800 border-emerald-600 text-white"
									: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
							}`}
						>
							Наложение
						</button>
					</div>
				</div>

				{/* БЛОК: ЦВЕТА VR (6 пресетов объема + Дыхательный путь) */}
				<div className="space-y-1">
					<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
						<span>ЦВЕТА VR</span>
						<button
							type="button"
							onClick={() => setVrPreset("bone")}
							title="Сброс цветового пресета VR"
							className="text-slate-400 hover:text-emerald-400 cursor-pointer"
						>
							<RotateCcw size={11} />
						</button>
					</div>

					{/* 6 VR Volume Presets Grid (2 cols x 3 rows) */}
					<div className="grid grid-cols-3 gap-1.5">
						{(Object.keys(VR_PRESET_CONFIGS) as Ez3dVrPreset[]).map((key) => {
							const conf = VR_PRESET_CONFIGS[key];
							const isSelected = vrPreset === key;
							return (
								<button
									key={key}
									type="button"
									onClick={() => {
										setVrPreset(key);
										showToast(`Цвет VR: ${conf.labelRu}`, "info");
									}}
									title={`${conf.labelRu}: ${conf.descRu}`}
									className={`h-11 rounded-md border flex flex-col items-center justify-center p-1 cursor-pointer transition-all relative overflow-hidden ${
										isSelected
											? "border-emerald-400 ring-2 ring-emerald-500/50 scale-102"
											: "border-slate-700 opacity-75 hover:opacity-100"
									}`}
									style={{ background: conf.bgStyle }}
								>
									<Box size={14} className="text-white drop-shadow-md" />
									<span className="text-[9px] font-bold text-white drop-shadow truncate w-full text-center mt-0.5">
										{key}
									</span>
								</button>
							);
						})}
					</div>

					<label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer text-[11px]">
						<input
							type="checkbox"
							checked={showAirway}
							onChange={(e) => onAirwayToggle()}
							className="rounded border-slate-700 text-emerald-600 focus:ring-0 bg-slate-900 cursor-pointer"
						/>
						<span>Дыхательный путь</span>
					</label>
				</div>

				{/* БЛОК: УПРАВЛЕНИЕ ОКНАМИ (Window Width / Level) */}
				<div className="space-y-1.5 pt-1 border-t border-slate-800">
					<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
						<span>УПРАВЛЕНИЕ ОКНАМИ</span>
						<Sliders size={11} />
					</div>

					<div className="space-y-1">
						<div className="flex justify-between text-[11px]">
							<span className="text-slate-400">Ширина</span>
							<span className="font-mono text-emerald-400 font-bold">{windowWidth}</span>
						</div>
						<input
							type="range"
							min={500}
							max={8000}
							value={windowWidth}
							onChange={(e) => setWindowWidth(Number(e.target.value))}
							className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
						/>
					</div>

					<div className="space-y-1">
						<div className="flex justify-between text-[11px]">
							<span className="text-slate-400">Уровень</span>
							<span className="font-mono text-emerald-400 font-bold">{windowLevel}</span>
						</div>
						<input
							type="range"
							min={-500}
							max={3000}
							value={windowLevel}
							onChange={(e) => setWindowLevel(Number(e.target.value))}
							className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
						/>
					</div>
				</div>

				{/* БЛОК: ОБРЕЗКА (Clipping Plane) */}
				<div className="space-y-1.5 pt-1 border-t border-slate-800">
					<div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						ОБРЕЗКА
					</div>

					<select
						value={clipPlane}
						onChange={(e) => setClipPlane(e.target.value)}
						className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs cursor-pointer"
					>
						<option value="Сагиттальн.">Сагиттальн.</option>
						<option value="Корональн.">Корональн.</option>
						<option value="Аксиальн.">Аксиальн.</option>
					</select>

					<div className="grid grid-cols-2 gap-1 text-[11px]">
						<button
							type="button"
							onClick={() => setClipSide("Справа")}
							className={`py-1 rounded text-center border font-medium cursor-pointer ${
								clipSide === "Справа"
									? "bg-emerald-800 border-emerald-600 text-white"
									: "bg-slate-800 border-slate-700 text-slate-300"
							}`}
						>
							Справа
						</button>
						<button
							type="button"
							onClick={() => setClipSide("Слева")}
							className={`py-1 rounded text-center border font-medium cursor-pointer ${
								clipSide === "Слева"
									? "bg-emerald-800 border-emerald-600 text-white"
									: "bg-slate-800 border-slate-700 text-slate-300"
							}`}
						>
							Слева
						</button>
					</div>

					<button
						type="button"
						onClick={() => {
							setIsClippingApplied((p) => !p);
							showToast(
								!isClippingApplied
									? `Обрезка применена по оси ${clipPlane} (${clipSide})`
									: "Обрезка отключена",
								"info",
							);
						}}
						className={`w-full py-1.5 rounded font-bold transition-colors cursor-pointer ${
							isClippingApplied
								? "bg-amber-600 text-white"
								: "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
						}`}
					>
						{isClippingApplied ? "Отменить обрезку" : "Применить обрезку"}
					</button>
				</div>

				{/* Нижние сервисные кнопки: Изменить макет, МЕДИКОМ */}
				<div className="space-y-1.5 pt-2 border-t border-slate-800">
					<button
						type="button"
						onClick={() => {
							setLayoutMode(layoutMode === "4quad" ? "single_3d" : "4quad");
							showToast("Макет переключен", "info");
						}}
						className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
					>
						Изменить макет
					</button>

					<button
						type="button"
						onClick={() => showToast("Запуск режима глубокого исследования", "info")}
						className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium cursor-pointer truncate"
					>
						Запустить режим исс...
					</button>

					{/* Брендинг Медиком (Parity with Screen 1) */}
					<div className="p-2 rounded bg-slate-900/60 border border-slate-800 text-center space-y-1">
						<div className="flex items-center justify-center gap-1 font-bold text-xs tracking-wider">
							<span className="text-red-500 text-sm">♦</span>
							<span className="text-slate-100 font-extrabold">МЕДИКОМ</span>
						</div>
						<button
							type="button"
							onClick={() => showToast("Открытие архива проектов Ez3D-i...", "info")}
							className="text-[10px] text-emerald-400 hover:underline cursor-pointer block w-full"
						>
							Открыть проект
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
