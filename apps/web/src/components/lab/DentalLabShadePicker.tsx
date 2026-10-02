/**
 * DentalLabShadePicker.tsx — Канонический Single Source of Truth (SSOT) селектор расцветки VITA
 * (VITA Classical A1-D4, VITA 3D-Master 1M1-5M3, Bleach 0M1-0M3/BL1-BL4, IPS Natural Die Stump ND1-ND9).
 *
 * Mandate 8s: Закон Единого Неделимого Авторитета (The Best of Breed SSOT).
 * Mandate 8e: 1-клик выбор у кресла, сенсорные тач-таргеты min-h-[48px].
 * Mandate 8d: Ноль мультяшных эмодзи (строго векторные иконки Lucide и анатомические превью).
 */

import React from "react";
import { Check } from "lucide-react";
import { ToothShadeGuide } from "../icons/DentalIcons";
import {
	VITA_CLASSICAL_GROUPS,
	VITA_3D_MASTER_GROUPS,
	VITA_BLEACH_SHADES_CLASSIFIED,
	STUMP_NATURAL_DIE_SHADES,
	SHADE_SWATCH_MAP,
} from "./labShadesData";

export interface DentalLabShadePickerProps {
	readonly shadeSystem?: "classical" | "3d_master" | "bleach";
	readonly onShadeSystemChange?: (system: "classical" | "3d_master" | "bleach") => void;
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
	readonly selectedStumpShade?: string | null;
	readonly onSelectStumpShade?: (stumpShade: string) => void;
	readonly showStumpSelector?: boolean;
	readonly showBleachTab?: boolean;
	readonly compact?: boolean;
}

export function DentalLabShadePicker({
	shadeSystem = "classical",
	onShadeSystemChange,
	selectedShade,
	onSelectShade,
	selectedStumpShade,
	onSelectStumpShade,
	showStumpSelector = false,
	showBleachTab = true,
	compact = false,
}: DentalLabShadePickerProps) {
	const currentSystem = shadeSystem || "classical";
	const currentSwatch = SHADE_SWATCH_MAP[selectedShade];

	const handleSystemTabClick = (sys: "classical" | "3d_master" | "bleach") => {
		if (onShadeSystemChange) {
			onShadeSystemChange(sys);
		}
	};

	return (
		<div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 sm:p-3 space-y-3">
			{/* Верхняя строка: переключатель шкал и текущий выбранный оттенок */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 flex-wrap">
					<ToothShadeGuide size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
						Шкала VITA:
					</span>
					<div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => handleSystemTabClick("classical")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors ${
								currentSystem === "classical"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							data-testid="vita-classical-tab"
						>
							VITA Classical
						</button>
						<button
							type="button"
							onClick={() => handleSystemTabClick("3d_master")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
								currentSystem === "3d_master"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							data-testid="vita-3d-master-tab"
						>
							VITA 3D-Master
						</button>
						{showBleachTab && (
							<button
								type="button"
								onClick={() => handleSystemTabClick("bleach")}
								className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
									currentSystem === "bleach"
										? "bg-teal-600 text-white"
										: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
								}`}
								data-testid="vita-bleach-tab"
							>
								Bleach
							</button>
						)}
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
						Выбранный оттенок:
					</span>
					<span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-teal-600 text-white shadow-xs inline-flex items-center gap-1.5">
						{currentSwatch && (
							<span
								className="w-2.5 h-2.5 rounded-full border border-white/60 shrink-0"
								style={{ backgroundColor: currentSwatch.bg }}
								aria-hidden="true"
							/>
						)}
						<span>{selectedShade || "—"}</span>
					</span>
				</div>
			</div>

			{/* 1. Сетка VITA Classical (Группы A, B, C, D + Bleach пресеты) */}
			{currentSystem === "classical" && (
				<div className="space-y-2">
					{VITA_CLASSICAL_GROUPS.map((grp) => (
						<div
							key={grp.id}
							className="flex flex-wrap items-center gap-1.5"
							data-testid={`vita-classical-group-${grp.id}`}
						>
							<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-16 shrink-0">
								Гр. {grp.id}:
							</span>
							<div className="flex flex-wrap items-center gap-1.5 flex-1">
								{grp.shades.map((shade) => {
									const isSelected = selectedShade === shade;
									const swatch = SHADE_SWATCH_MAP[shade];

									return (
										<button
											key={shade}
											type="button"
											onClick={() => onSelectShade(shade)}
											aria-label={`Оттенок ${shade}`}
											title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок ${shade}`}
											className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
												isSelected
													? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
													: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
											}`}
											data-testid={`vita-shade-${shade}`}
										>
											<span
												className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
												style={{
													backgroundColor: swatch?.bg || "#f5f0eb",
													borderColor: swatch?.border || "#d1c7bd",
												}}
												aria-hidden="true"
											/>
											<span>{shade}</span>
										</button>
									);
								})}
							</div>
						</div>
					))}

					{/* Дополнительная строка Bleach (BL1..BL4) прямо в Classical для быстрой доступности */}
					<div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
						<span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 w-16 shrink-0">
							Bleach:
						</span>
						<div className="flex flex-wrap items-center gap-1.5 flex-1">
							{["BL1", "BL2", "BL3", "BL4"].map((shade) => {
								const isSelected = selectedShade === shade;
								const swatch = SHADE_SWATCH_MAP[shade];

								return (
									<button
										key={shade}
										type="button"
										onClick={() => onSelectShade(shade)}
										aria-label={`Оттенок Bleach ${shade}`}
										title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок ${shade}`}
										className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
											isSelected
												? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
												: "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
										}`}
										data-testid={`vita-shade-${shade}`}
									>
										<span
											className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
											style={{
												backgroundColor: swatch?.bg || "#ffffff",
												borderColor: swatch?.border || "#ded9cc",
											}}
											aria-hidden="true"
										/>
										<span>{shade}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* 2. Сетка VITA 3D-Master (Уровни L1..L5) */}
			{currentSystem === "3d_master" && (
				<div className="space-y-2">
					{VITA_3D_MASTER_GROUPS.map((grp) => (
						<div
							key={grp.level}
							className="flex flex-wrap items-center gap-1.5"
							data-testid={`vita-3dmaster-group-l${grp.level}`}
						>
							<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-24 shrink-0">
								{grp.name}:
							</span>
							<div className="flex flex-wrap items-center gap-1.5 flex-1">
								{grp.shades.map((shade) => {
									const isSelected = selectedShade === shade;
									const swatch = SHADE_SWATCH_MAP[shade];

									return (
										<button
											key={shade}
											type="button"
											onClick={() => onSelectShade(shade)}
											aria-label={`Оттенок 3D-Master ${shade}`}
											title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок 3D-Master ${shade}`}
											className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
												isSelected
													? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
													: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
											}`}
											data-testid={`vita-shade-${shade}`}
										>
											<span
												className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
												style={{
													backgroundColor: swatch?.bg || "#f5f0eb",
													borderColor: swatch?.border || "#d1c7bd",
												}}
												aria-hidden="true"
											/>
											<span>{shade}</span>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}

			{/* 3. Сетка Bleach (0M1-0M3 и BL1-BL4) */}
			{currentSystem === "bleach" && (
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 w-28 shrink-0">
							3D Bleach:
						</span>
						<div className="flex flex-wrap items-center gap-1.5 flex-1">
							{["0M1", "0M2", "0M3"].map((shade) => {
								const isSelected = selectedShade === shade;
								const swatch = SHADE_SWATCH_MAP[shade];

								return (
									<button
										key={shade}
										type="button"
										onClick={() => onSelectShade(shade)}
										aria-label={`Оттенок 3D Bleach ${shade}`}
										title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок ${shade}`}
										className={`min-h-[48px] min-w-[64px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
											isSelected
												? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
												: "bg-teal-50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/50"
										}`}
										data-testid={`vita-shade-${shade}`}
									>
										<span
											className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
											style={{
												backgroundColor: swatch?.bg || "#ffffff",
												borderColor: swatch?.border || "#ded9cc",
											}}
											aria-hidden="true"
										/>
										<span>{shade}</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-28 shrink-0">
							Ivoclar Bleach:
						</span>
						<div className="flex flex-wrap items-center gap-1.5 flex-1">
							{["BL1", "BL2", "BL3", "BL4"].map((shade) => {
								const isSelected = selectedShade === shade;
								const swatch = SHADE_SWATCH_MAP[shade];

								return (
									<button
										key={shade}
										type="button"
										onClick={() => onSelectShade(shade)}
										aria-label={`Оттенок Ivoclar Bleach ${shade}`}
										title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок ${shade}`}
										className={`min-h-[48px] min-w-[64px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
											isSelected
												? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
												: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
										}`}
										data-testid={`vita-shade-${shade}`}
									>
										<span
											className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
											style={{
												backgroundColor: swatch?.bg || "#ffffff",
												borderColor: swatch?.border || "#ded9cc",
											}}
											aria-hidden="true"
										/>
										<span>{shade}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{/* 4. Опциональный селектор оттенка культи (IPS Natural Die ND1–ND9) */}
			{showStumpSelector && (
				<div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-2" data-testid="stump-shade-container">
					<div className="flex items-center justify-between flex-wrap gap-1">
						<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
							Цвет культи препарированного зуба (IPS Natural Die ND1–ND9):
						</span>
						{selectedStumpShade && onSelectStumpShade && (
							<button
								type="button"
								onClick={() => onSelectStumpShade("")}
								className="text-[11px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
							>
								Сбросить культю
							</button>
						)}
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
						{STUMP_NATURAL_DIE_SHADES.map((nd) => {
							const isSelected = selectedStumpShade === nd.id;
							const swatch = SHADE_SWATCH_MAP[nd.id];

							return (
								<button
									key={nd.id}
									type="button"
									onClick={() => onSelectStumpShade?.(isSelected ? "" : nd.id)}
									data-testid={`stump-shade-${nd.id}`}
									className={`min-h-[48px] px-2.5 py-1.5 text-left rounded-lg border text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
										isSelected
											? "bg-teal-50 dark:bg-teal-950/40 border-teal-600 font-bold text-teal-900 dark:text-teal-100 ring-2 ring-teal-500/30"
											: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
									}`}
								>
									<div className="flex items-center gap-2 min-w-0">
										<span
											className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-400"
											style={{ backgroundColor: swatch?.bg || "#ebdcc9" }}
											aria-hidden="true"
										/>
										<span className="truncate font-semibold">{nd.id}</span>
									</div>
									{isSelected && <Check size={14} className="text-teal-600 shrink-0" />}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
