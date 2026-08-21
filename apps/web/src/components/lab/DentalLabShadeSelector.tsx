import React from "react";
import { Check, Palette } from "lucide-react";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
} from "./labMath";

export interface DentalLabShadeSelectorProps {
	shadeSystem: "classical" | "3d_master" | "bleach";
	setShadeSystem: (system: "classical" | "3d_master" | "bleach") => void;
	shadeClassical: string;
	setShadeClassical: (s: string) => void;
	shade3dMaster: string;
	setShade3dMaster: (s: string) => void;
	shadeBleach: string;
	setShadeBleach: (s: string) => void;
	shadeCervical: string;
	setShadeCervical: (s: string) => void;
	shadeBody: string;
	setShadeBody: (s: string) => void;
	shadeIncisal: string;
	setShadeIncisal: (s: string) => void;
	shadeStump: string;
	setShadeStump: (s: string) => void;
	translucency: string;
	setTranslucency: (t: string) => void;
	mamelons: boolean;
	setMamelons: (m: boolean) => void;
	calcifications: boolean;
	setCalcifications: (c: boolean) => void;
}

export function DentalLabShadeSelector({
	shadeSystem,
	setShadeSystem,
	shadeClassical,
	setShadeClassical,
	shade3dMaster,
	setShade3dMaster,
	shadeBleach,
	setShadeBleach,
	shadeCervical,
	setShadeCervical,
	shadeBody,
	setShadeBody,
	shadeIncisal,
	setShadeIncisal,
	shadeStump,
	setShadeStump,
	translucency,
	setTranslucency,
	mamelons,
	setMamelons,
	calcifications,
	setCalcifications,
}: DentalLabShadeSelectorProps) {
	return (
		<div className="space-y-6">
			{/* Shade System Switcher */}
			<div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit flex-wrap">
				<button
					type="button"
					onClick={() => setShadeSystem("classical")}
					className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-all ${
						shadeSystem === "classical"
							? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
					}`}
				>
					VITA Classical (A1–D4)
				</button>
				<button
					type="button"
					onClick={() => setShadeSystem("3d_master")}
					className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-all ${
						shadeSystem === "3d_master"
							? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
					}`}
				>
					VITA 3D-Master (1M1–5M3)
				</button>
				<button
					type="button"
					onClick={() => setShadeSystem("bleach")}
					className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-lg transition-all ${
						shadeSystem === "bleach"
							? "bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 shadow-sm"
							: "text-slate-600 dark:text-slate-400 hover:text-slate-900"
					}`}
				>
					Bleach Shades (BL1–BL4, 0M1–0M3)
				</button>
			</div>

			{/* Primary Shade Palette Grid with Crisp Color Swatches */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
						Основной оттенок реставрации (Шкала {shadeSystem === "3d_master" ? "VITA 3D-Master" : shadeSystem === "bleach" ? "Bleach" : "VITA Classical"})
					</label>
					<span className="text-xs text-slate-400 font-medium">
						Touch target: min-h-[44px] с образцом цвета
					</span>
				</div>

				{shadeSystem === "classical" && (
					<div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
						{VITA_CLASSICAL_SHADES.map((shade) => {
							const isSelected = shadeClassical === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => {
										setShadeClassical(shade);
										setShadeBody(shade);
									}}
									className={`vita-shade-chip ${isSelected ? "is-selected" : ""}`}
								>
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#f0eae0", borderColor: swatch?.border || "#ccc" }}
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				)}

				{shadeSystem === "3d_master" && (
					<div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-9 gap-2">
						{VITA_3D_MASTER_SHADES.map((shade) => {
							const isSelected = shade3dMaster === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => {
										setShade3dMaster(shade);
										setShadeBody(shade);
									}}
									className={`vita-shade-chip ${isSelected ? "is-selected" : ""}`}
								>
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#f0eae0", borderColor: swatch?.border || "#ccc" }}
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				)}

				{shadeSystem === "bleach" && (
					<div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5">
						{VITA_BLEACH_SHADES.map((shade) => {
							const isSelected = shadeBleach === shade;
							const swatch = SHADE_SWATCH_MAP[shade];
							return (
								<button
									key={shade}
									type="button"
									onClick={() => {
										setShadeBleach(shade);
										setShadeBody(shade);
									}}
									className={`vita-shade-chip ${isSelected ? "is-selected" : ""}`}
								>
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#ffffff", borderColor: swatch?.border || "#eee" }}
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* 3-Zone Shade Selection (Cervical, Body, Incisal) */}
			<div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-4">
				<div className="flex items-center gap-2">
					<Palette className="w-5 h-5 text-teal-600 dark:text-teal-400" />
					<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
						3-Зонная стратификация цвета (Cervical / Body / Incisal)
					</h4>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{/* Cervical */}
					<div className="space-y-1.5">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							1. Пришеечная треть (Cervical)
						</label>
						<select
							value={shadeCervical}
							onChange={(e) => setShadeCervical(e.target.value)}
							className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							{VITA_CLASSICAL_SHADES.map((s) => (
								<option key={s} value={s}>VITA {s} (Насыщенный пришеечный)</option>
							))}
							{VITA_3D_MASTER_SHADES.map((s) => (
								<option key={s} value={s}>3D-Master {s}</option>
							))}
						</select>
						<span className="text-xs text-slate-500 block">Более темный/насыщенный переход</span>
					</div>

					{/* Body */}
					<div className="space-y-1.5">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							2. Тело зуба (Body / Middle)
						</label>
						<select
							value={shadeBody}
							onChange={(e) => setShadeBody(e.target.value)}
							className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							{VITA_CLASSICAL_SHADES.map((s) => (
								<option key={s} value={s}>VITA {s}</option>
							))}
							{VITA_3D_MASTER_SHADES.map((s) => (
								<option key={s} value={s}>3D-Master {s}</option>
							))}
							{VITA_BLEACH_SHADES.map((s) => (
								<option key={s} value={s}>Bleach {s}</option>
							))}
						</select>
						<span className="text-xs text-slate-500 block">Основной дентинный цвет</span>
					</div>

					{/* Incisal */}
					<div className="space-y-1.5">
						<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
							3. Режущий край (Incisal / Enamel)
						</label>
						<select
							value={shadeIncisal}
							onChange={(e) => setShadeIncisal(e.target.value)}
							className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
						>
							{VITA_CLASSICAL_SHADES.map((s) => (
								<option key={s} value={s}>VITA {s} (Опалесценция)</option>
							))}
							{VITA_3D_MASTER_SHADES.map((s) => (
								<option key={s} value={s}>3D-Master {s}</option>
							))}
							{VITA_BLEACH_SHADES.map((s) => (
								<option key={s} value={s}>Bleach {s}</option>
							))}
						</select>
						<span className="text-xs text-slate-500 block">Эмалевая прозрачность</span>
					</div>
				</div>
			</div>

			{/* Stump Shade (IPS Natural Die ND1–ND9) */}
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<label className="block text-sm font-bold text-slate-900 dark:text-slate-100">
						Цвет культи препарированного зуба (IPS Natural Die Material ND1–ND9)
					</label>
					<span className="text-xs text-slate-500">
						Критично для виниров и коронок E.max
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
					{STUMP_NATURAL_DIE_SHADES.map((nd) => {
						const isSelected = shadeStump === nd.id;
						const swatch = SHADE_SWATCH_MAP[nd.id];
						return (
							<button
								key={nd.id}
								type="button"
								onClick={() => setShadeStump(isSelected ? "" : nd.id)}
								className={`min-h-[48px] p-3 text-left rounded-xl border text-xs transition-all flex items-center justify-between gap-2.5 ${
									isSelected
										? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 font-bold text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
								}`}
							>
								<div className="flex items-center gap-2.5">
									<div
										className="vita-swatch-dot"
										style={{ backgroundColor: swatch?.bg || "#ebdcc9", borderColor: swatch?.border || "#999" }}
									/>
									<span className="font-bold">{nd.name}</span>
								</div>
								{isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Translucency & Special Characterizations */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Степень прозрачности (Translucency)
					</label>
					<div className="grid grid-cols-5 gap-2">
						{[
							{ id: "UTML", label: "UTML", desc: "Ультра" },
							{ id: "STML", label: "STML", desc: "Супер" },
							{ id: "HT", label: "HT", desc: "Высокая" },
							{ id: "MT", label: "MT", desc: "Средняя" },
							{ id: "LT", label: "LT", desc: "Низкая" },
						].map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => setTranslucency(t.id)}
								className={`min-h-[44px] py-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all ${
									translucency === t.id
										? "bg-teal-600 text-white border-teal-600 shadow-sm"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500"
								}`}
							>
								<span>{t.label}</span>
								<span className="text-[10px] font-normal opacity-80">{t.desc}</span>
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Индивидуальные оптические эффекты
					</label>
					<div className="flex gap-4 items-center pt-2 flex-wrap">
						<label className="min-h-[44px] inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
							<input
								type="checkbox"
								checked={mamelons}
								onChange={(e) => setMamelons(e.target.checked)}
								className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
							/>
							Выраженные мамелоны режущего края
						</label>
						<label className="min-h-[44px] inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
							<input
								type="checkbox"
								checked={calcifications}
								onChange={(e) => setCalcifications(e.target.checked)}
								className="w-5 h-5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700"
							/>
							Кальцификаты / белые пятна
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}
