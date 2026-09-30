import React from "react";
import { Check, Sparkles, Layers, Sliders } from "lucide-react";
import { ToothShadeGuide } from "../icons/DentalIcons";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	VITA_CLASSICAL_GROUPS,
	VITA_3D_MASTER_GROUPS,
	VITA_BLEACH_SHADES_CLASSIFIED,
	SHADE_SWATCH_MAP,
	STUMP_NATURAL_DIE_SHADES,
	getStratificationPreset,
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
	opalescence?: boolean;
	setOpalescence?: (o: boolean) => void;
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
	opalescence,
	setOpalescence,
}: DentalLabShadeSelectorProps) {
	const currentPrimaryShade =
		shadeSystem === "3d_master"
			? shade3dMaster
			: shadeSystem === "bleach"
			? shadeBleach
			: shadeClassical;

	// 1-Click Stratification Preset Handler (Mandates 8e, 8k — 0 лишних кликов)
	const applyStratification = (mode: "natural" | "monochrome" | "youth_translucent") => {
		const preset = getStratificationPreset(currentPrimaryShade, mode);
		setShadeCervical(preset.cervical);
		setShadeBody(preset.body);
		setShadeIncisal(preset.incisal);
	};

	// 1-Click Primary Shade Selection with auto-sync of body shade
	const handleSelectShade = (shade: string) => {
		if (shadeSystem === "classical") {
			setShadeClassical(shade);
		} else if (shadeSystem === "3d_master") {
			setShade3dMaster(shade);
		} else {
			setShadeBleach(shade);
		}
		setShadeBody(shade);
	};

	const cervicalSwatch = SHADE_SWATCH_MAP[shadeCervical] || SHADE_SWATCH_MAP[currentPrimaryShade];
	const bodySwatch = SHADE_SWATCH_MAP[shadeBody] || SHADE_SWATCH_MAP[currentPrimaryShade];
	const incisalSwatch = SHADE_SWATCH_MAP[shadeIncisal] || SHADE_SWATCH_MAP[currentPrimaryShade];

	return (
		<div className="space-y-6">
			{/* ─── SHADE SYSTEM SWITCHER (VITA Classical, 3D-Master, Bleach) ─────── */}
			<div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit flex-wrap">
				<button
					type="button"
					onClick={() => setShadeSystem("classical")}
					data-testid="shade-system-classical-btn"
					className={`min-h-[44px] sm:min-h-9 sm:h-9 px-4 py-2 sm:py-0 text-xs font-bold rounded-lg transition-all cursor-pointer ${
						shadeSystem === "classical"
							? "bg-[var(--teal)] text-white shadow-sm"
							: "bg-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
					}`}
				>
					VITA Classical (A1–D4)
				</button>
				<button
					type="button"
					onClick={() => setShadeSystem("3d_master")}
					data-testid="shade-system-3dmaster-btn"
					className={`min-h-[44px] sm:min-h-9 sm:h-9 px-4 py-2 sm:py-0 text-xs font-bold rounded-lg transition-all cursor-pointer ${
						shadeSystem === "3d_master"
							? "bg-[var(--teal)] text-white shadow-sm"
							: "bg-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
					}`}
				>
					VITA 3D-Master (1M1–5M3)
				</button>
				<button
					type="button"
					onClick={() => setShadeSystem("bleach")}
					data-testid="shade-system-bleach-btn"
					className={`min-h-[44px] sm:min-h-9 sm:h-9 px-4 py-2 sm:py-0 text-xs font-bold rounded-lg transition-all cursor-pointer ${
						shadeSystem === "bleach"
							? "bg-[var(--teal)] text-white shadow-sm"
							: "bg-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
					}`}
				>
					Bleach (0M1–0M3, BL1–BL4)
				</button>
			</div>

			{/* ─── PRIMARY SHADE PALETTES ────────────────────────────────────────── */}
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div>
						<span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
							Основной оттенок: {currentPrimaryShade}{" "}
							<span className="text-xs font-normal text-slate-500">
								({shadeSystem === "3d_master" ? "VITA 3D-Master" : shadeSystem === "bleach" ? "Bleach" : "VITA Classical"})
							</span>
						</span>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							Клиническая шкала оттенков с образцами цвета (1 клик для выбора)
						</span>
					</div>
					{SHADE_SWATCH_MAP[currentPrimaryShade] && (
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
							<div
								className="w-4 h-4 rounded-full border border-slate-400 shadow-inner shrink-0"
								style={{ backgroundColor: SHADE_SWATCH_MAP[currentPrimaryShade]?.bg }}
							/>
							<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
								{currentPrimaryShade}: {SHADE_SWATCH_MAP[currentPrimaryShade]?.desc}
							</span>
						</div>
					)}
				</div>

				{/* ═══ 1. VITA CLASSICAL (A1–D4 C РАЗДЕЛЕНИЕМ ПО ТОНАМ) ══════════════ */}
				{shadeSystem === "classical" && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
						{VITA_CLASSICAL_GROUPS.map((grp) => (
							<div
								key={grp.id}
								className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5"
								data-testid={`vita-classical-group-${grp.id}`}
							>
								<div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
									<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
										{grp.name}
									</span>
									<span className="text-[11px] font-semibold text-[var(--teal)]">
										{grp.toneRu}
									</span>
								</div>
								<div className="grid grid-cols-4 gap-1.5">
									{grp.shades.map((shade) => {
										const isSelected = shadeClassical === shade;
										const swatch = SHADE_SWATCH_MAP[shade];
										return (
											<button
												key={shade}
												type="button"
												onClick={() => handleSelectShade(shade)}
												data-testid={`shade-chip-${shade}`}
												className={`vita-shade-chip min-h-[44px] ${isSelected ? "is-selected" : ""}`}
												title={`${shade}: ${swatch?.desc || ""}`}
											>
												<div
													className="vita-swatch-dot"
													style={{
														backgroundColor: swatch?.bg || "#f0eae0",
														borderColor: swatch?.border || "#ccc",
													}}
												/>
												<span className="text-xs font-bold">{shade}</span>
											</button>
										);
									})}
								</div>
								<p className="text-[10px] text-slate-500 dark:text-slate-400 m-0">
									{grp.descRu}
								</p>
							</div>
						))}
					</div>
				)}

				{/* ═══ 2. VITA 3D-MASTER (1M1–5M3 ПО УРОВНЯМ СВЕТЛОТЫ) ═══════════════ */}
				{shadeSystem === "3d_master" && (
					<div className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
							{VITA_3D_MASTER_GROUPS.map((grp) => (
								<div
									key={grp.level}
									className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-2"
									data-testid={`vita-3dmaster-group-l${grp.level}`}
								>
									<div className="border-b border-slate-200 dark:border-slate-700 pb-1">
										<div className="text-xs font-bold text-slate-900 dark:text-slate-100">
											{grp.name}
										</div>
										<div className="text-[10px] text-slate-500 truncate">
											{grp.descRu}
										</div>
									</div>
									<div className="grid grid-cols-3 gap-1.5">
										{grp.shades.map((shade) => {
											const isSelected = shade3dMaster === shade;
											const swatch = SHADE_SWATCH_MAP[shade];
											return (
												<button
													key={shade}
													type="button"
													onClick={() => handleSelectShade(shade)}
													data-testid={`shade-chip-${shade}`}
													className={`vita-shade-chip min-h-[44px] ${isSelected ? "is-selected" : ""}`}
													title={`${shade}: ${swatch?.desc || ""}`}
												>
													<div
														className="vita-swatch-dot"
														style={{
															backgroundColor: swatch?.bg || "#f0eae0",
															borderColor: swatch?.border || "#ccc",
														}}
													/>
													<span className="text-[11px] font-bold">{shade}</span>
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* ═══ 3. BLEACH SHADES (0M1–0M3 & BL1–BL4) ══════════════════════════ */}
				{shadeSystem === "bleach" && (
					<div className="space-y-3">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							{/* VITA 3D-Master Bleach (0M1, 0M2, 0M3) */}
							<div
								className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/30 dark:bg-teal-950/20 space-y-2.5"
								data-testid="bleach-3d-group"
							>
								<div className="flex items-center justify-between border-b border-teal-200 dark:border-teal-800 pb-1.5">
									<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
										VITA 3D-Master Bleach (0M1, 0M2, 0M3)
									</span>
									<span className="text-[10px] uppercase font-bold text-[var(--teal)]">
										Ультрасветлые 3D
									</span>
								</div>
								<div className="grid grid-cols-3 gap-2">
									{["0M1", "0M2", "0M3"].map((shade) => {
										const isSelected = shadeBleach === shade;
										const swatch = SHADE_SWATCH_MAP[shade];
										return (
											<button
												key={shade}
												type="button"
												onClick={() => handleSelectShade(shade)}
												data-testid={`shade-chip-${shade}`}
												className={`vita-shade-chip min-h-[48px] ${isSelected ? "is-selected" : ""}`}
												title={`${shade}: ${swatch?.desc || ""}`}
											>
												<div
													className="vita-swatch-dot"
													style={{
														backgroundColor: swatch?.bg || "#ffffff",
														borderColor: swatch?.border || "#ddd",
													}}
												/>
												<span className="text-xs font-bold">{shade}</span>
											</button>
										);
									})}
								</div>
								<p className="text-[10px] text-slate-500 m-0">
									Официальная шкала VITA 3D Bleach для отбеленных реставраций высокой светлоты.
								</p>
							</div>

							{/* Ivoclar Bleach (BL1, BL2, BL3, BL4) */}
							<div
								className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5"
								data-testid="bleach-ivoclar-group"
							>
								<div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
									<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
										Ivoclar IPS Bleach (BL1–BL4)
									</span>
									<span className="text-[10px] uppercase font-bold text-slate-500">
										Hollywood White
									</span>
								</div>
								<div className="grid grid-cols-4 gap-2">
									{["BL1", "BL2", "BL3", "BL4"].map((shade) => {
										const isSelected = shadeBleach === shade;
										const swatch = SHADE_SWATCH_MAP[shade];
										return (
											<button
												key={shade}
												type="button"
												onClick={() => handleSelectShade(shade)}
												data-testid={`shade-chip-${shade}`}
												className={`vita-shade-chip min-h-[48px] ${isSelected ? "is-selected" : ""}`}
												title={`${shade}: ${swatch?.desc || ""}`}
											>
												<div
													className="vita-swatch-dot"
													style={{
														backgroundColor: swatch?.bg || "#ffffff",
														borderColor: swatch?.border || "#ddd",
													}}
												/>
												<span className="text-xs font-bold">{shade}</span>
											</button>
										);
									})}
								</div>
								<p className="text-[10px] text-slate-500 m-0">
									Классическая шкала IPS e.max Bleach BL1 (Hollywood) — BL4 (Soft Natural Bleach).
								</p>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* ─── 3-ЗОННАЯ ГРАДИЕНТНАЯ СТРАТИФИКАЦИЯ ЦВЕТА ────────────────────── */}
			<div
				className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 space-y-4"
				data-testid="3zone-stratification-container"
			>
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<ToothShadeGuide className="w-5 h-5 text-[var(--teal)] shrink-0" />
						<div>
							<h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 m-0">
								3-Зонная стратификация цвета (Cervical / Body / Incisal)
							</h4>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0">
								Анатомическая раскладка естественного градиента: пришейка, тело зуба, режущий край
							</p>
						</div>
					</div>

					{/* 1-Click Fast Presets (Mandate 8e/8k) */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<button
							type="button"
							onClick={() => applyStratification("natural")}
							className="px-2.5 py-1 text-xs font-bold rounded-lg border border-teal-500 text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors inline-flex items-center gap-1 min-h-[32px] cursor-pointer"
							title="Шейка +1 тон насыщеннее, Тело основной оттенок, Край светлее/прозрачный"
						>
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
							Натуральный градиент
						</button>
						<button
							type="button"
							onClick={() => applyStratification("monochrome")}
							className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1 min-h-[32px] cursor-pointer"
							title="Одинаковый цвет для всех 3 зон"
						>
							<Layers className="w-3.5 h-3.5" />
							Монохром
						</button>
						<button
							type="button"
							onClick={() => applyStratification("youth_translucent")}
							className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1 min-h-[32px] cursor-pointer"
							title="Выраженная эмалевая прозрачность режущего края"
						>
							<Sliders className="w-3.5 h-3.5" />
							Прозрачный край
						</button>
					</div>
				</div>

				{/* Anatomical Schematic & 3 Selectors */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
					{/* SVG Anatomical Tooth Preview */}
					<div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
						<svg
							viewBox="0 0 80 120"
							width="80"
							height="120"
							className="drop-shadow-sm select-none"
							aria-label="Схема зон зуба"
						>
							{/* Cervical Third (Root/Gingival margin) */}
							<path
								d="M15,10 C25,2 55,2 65,10 C68,22 68,36 67,42 C50,42 30,42 13,42 C12,36 12,22 15,10 Z"
								fill={cervicalSwatch?.bg || "#efe2d0"}
								stroke={cervicalSwatch?.border || "#c7b296"}
								strokeWidth="1.5"
							/>
							{/* Body Third (Equator / Middle) */}
							<path
								d="M13,42 C30,42 50,42 67,42 C69,56 68,75 66,80 C48,80 32,80 14,80 C12,75 11,56 13,42 Z"
								fill={bodySwatch?.bg || "#f7f1e7"}
								stroke={bodySwatch?.border || "#dfd2c0"}
								strokeWidth="1.5"
							/>
							{/* Incisal Third (Edge / Translucency) */}
							<path
								d="M14,80 C32,80 48,80 66,80 C65,96 60,114 40,116 C20,114 15,96 14,80 Z"
								fill={incisalSwatch?.bg || "#fdfdfb"}
								stroke={incisalSwatch?.border || "#ded9cc"}
								strokeWidth="1.5"
							/>
						</svg>
						<span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
							Схема градиента
						</span>
					</div>

					{/* 3 Zone Selectors */}
					<div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
						{/* 1. Cervical */}
						<div className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
							<div className="flex items-center justify-between">
								<label htmlFor="shade-cervical-select" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
									1. Пришейка (Cervical)
								</label>
								<div
									className="w-3.5 h-3.5 rounded-full border border-slate-400"
									style={{ backgroundColor: cervicalSwatch?.bg || "#efe2d0" }}
								/>
							</div>
							<select
								id="shade-cervical-select"
								value={shadeCervical}
								onChange={(e) => setShadeCervical(e.target.value)}
								className="w-full h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
								title={`Пришеечный оттенок: ${shadeCervical}`}
							>
								<optgroup label="VITA Classical">
									{VITA_CLASSICAL_SHADES.map((s) => (
										<option key={s} value={s}>VITA {s}</option>
									))}
								</optgroup>
								<optgroup label="VITA 3D-Master">
									{VITA_3D_MASTER_SHADES.map((s) => (
										<option key={s} value={s}>3D-Master {s}</option>
									))}
								</optgroup>
								<optgroup label="Bleach">
									{VITA_BLEACH_SHADES.map((s) => (
										<option key={s} value={s}>Bleach {s}</option>
									))}
								</optgroup>
							</select>
							<span className="text-[10px] text-slate-500 block truncate">
								Более темный/насыщенный переход
							</span>
						</div>

						{/* 2. Body */}
						<div className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
							<div className="flex items-center justify-between">
								<label htmlFor="shade-body-select" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
									2. Тело зуба (Body)
								</label>
								<div
									className="w-3.5 h-3.5 rounded-full border border-slate-400"
									style={{ backgroundColor: bodySwatch?.bg || "#f7f1e7" }}
								/>
							</div>
							<select
								id="shade-body-select"
								value={shadeBody}
								onChange={(e) => setShadeBody(e.target.value)}
								className="w-full h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
								title={`Тело зуба: ${shadeBody}`}
							>
								<optgroup label="VITA Classical">
									{VITA_CLASSICAL_SHADES.map((s) => (
										<option key={s} value={s}>VITA {s}</option>
									))}
								</optgroup>
								<optgroup label="VITA 3D-Master">
									{VITA_3D_MASTER_SHADES.map((s) => (
										<option key={s} value={s}>3D-Master {s}</option>
									))}
								</optgroup>
								<optgroup label="Bleach">
									{VITA_BLEACH_SHADES.map((s) => (
										<option key={s} value={s}>Bleach {s}</option>
									))}
								</optgroup>
							</select>
							<span className="text-[10px] text-slate-500 block truncate">
								Основной дентинный тон
							</span>
						</div>

						{/* 3. Incisal */}
						<div className="space-y-1.5 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60">
							<div className="flex items-center justify-between">
								<label htmlFor="shade-incisal-select" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
									3. Режущий край (Incisal)
								</label>
								<div
									className="w-3.5 h-3.5 rounded-full border border-slate-400"
									style={{ backgroundColor: incisalSwatch?.bg || "#fdfdfb" }}
								/>
							</div>
							<select
								id="shade-incisal-select"
								value={shadeIncisal}
								onChange={(e) => setShadeIncisal(e.target.value)}
								className="w-full h-10 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-bold focus:ring-2 focus:ring-[var(--teal)] focus:outline-none"
								title={`Режущий край (эмаль): ${shadeIncisal}`}
							>
								<optgroup label="VITA Classical">
									{VITA_CLASSICAL_SHADES.map((s) => (
										<option key={s} value={s}>VITA {s}</option>
									))}
								</optgroup>
								<optgroup label="VITA 3D-Master">
									{VITA_3D_MASTER_SHADES.map((s) => (
										<option key={s} value={s}>3D-Master {s}</option>
									))}
								</optgroup>
								<optgroup label="Bleach">
									{VITA_BLEACH_SHADES.map((s) => (
										<option key={s} value={s}>Bleach {s}</option>
									))}
								</optgroup>
							</select>
							<span className="text-[10px] text-slate-500 block truncate">
								Эмалевая прозрачность и гало
							</span>
						</div>
					</div>
				</div>
			</div>

			{/* ─── ЦВЕТ КУЛЬТИ ЗУБА (IPS NATURAL DIE SHADES ND1–ND9) ─────────────── */}
			<div className="space-y-3" data-testid="stump-shade-container">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div>
						<span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
							Цвет культи препарированного зуба (IPS Natural Die ND1–ND9)
						</span>
						<span className="text-xs text-slate-500 dark:text-slate-400">
							Критично для безметалловой керамики IPS e.max и оксида циркония (просвечивание культи)
						</span>
					</div>
					{shadeStump && (
						<button
							type="button"
							onClick={() => setShadeStump("")}
							className="text-xs text-slate-500 hover:text-rose-600 underline cursor-pointer"
						>
							Сбросить выбор культи
						</button>
					)}
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
								data-testid={`stump-shade-${nd.id}`}
								className={`min-h-[48px] p-3 text-left rounded-xl border text-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
									isSelected
										? "bg-[var(--teal-surface)] border-[var(--teal)] font-bold text-[var(--teal)] ring-2 ring-[var(--teal-soft)] shadow-xs"
										: "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
								}`}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<div
										className="vita-swatch-dot shrink-0"
										style={{
											backgroundColor: swatch?.bg || "#ebdcc9",
											borderColor: swatch?.border || "#999",
										}}
									/>
									<div className="min-w-0">
										<div className="font-bold truncate">{nd.name}</div>
										<div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
											{nd.desc}
										</div>
									</div>
								</div>
								{isSelected && <Check className="w-4 h-4 text-[var(--teal)] shrink-0" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* ─── TRANSLUCENCY & SPECIAL CHARACTERIZATIONS ──────────────────────── */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div className="space-y-2">
					<span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Степень прозрачности (Translucency)
					</span>
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
								data-testid={`translucency-${t.id}`}
								className={`min-h-[44px] py-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
									translucency === t.id
										? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-sm"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[var(--teal)]"
								}`}
							>
								<span>{t.label}</span>
								<span className="text-[10px] font-normal opacity-80">{t.desc}</span>
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
						Индивидуальные оптические эффекты
					</span>
					<div className="flex gap-4 items-center pt-2 flex-wrap">
						<label className="min-h-[44px] inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
							<input
								type="checkbox"
								checked={mamelons}
								onChange={(e) => setMamelons(e.target.checked)}
								className="w-5 h-5 rounded accent-[var(--teal)] border-slate-300 dark:border-slate-700 cursor-pointer"
								data-testid="mamelons-checkbox"
							/>
							Выраженные мамелоны режущего края
						</label>
						<label className="min-h-[44px] inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
							<input
								type="checkbox"
								checked={calcifications}
								onChange={(e) => setCalcifications(e.target.checked)}
								className="w-5 h-5 rounded accent-[var(--teal)] border-slate-300 dark:border-slate-700 cursor-pointer"
								data-testid="calcifications-checkbox"
							/>
							Кальцификаты / белые пятна
						</label>
						{setOpalescence && (
							<label className="min-h-[44px] inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
								<input
									type="checkbox"
									checked={Boolean(opalescence)}
									onChange={(e) => setOpalescence(e.target.checked)}
									className="w-5 h-5 rounded accent-[var(--teal)] border-slate-300 dark:border-slate-700 cursor-pointer"
									data-testid="opalescence-checkbox"
								/>
								Опалесценция (эмалевый гало-эффект)
							</label>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
