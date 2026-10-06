import React from "react";
import { Sliders, Zap } from "lucide-react";
import {
	WORKHORSE_ARCHWIRES,
	type WorkhorseArchwireOption,
} from "@dental/shared";
export type { WorkhorseArchwireOption };
import { showToast } from "../GlobalToast";

export type ArchwireMaterial = "NiTi" | "CuNiTi" | "SS" | "TMA";
export type ArchwireSection =
	| ".012"
	| ".014"
	| ".016"
	| ".018"
	| ".020"
	| ".014x.025"
	| ".016x.022"
	| ".016x.025"
	| ".017x.025"
	| ".018x.025"
	| ".019x.025"
	| ".021x.025";

export const ARCHWIRE_MATERIALS: Array<{
	id: ArchwireMaterial;
	label: string;
	desc: string;
	badge: string;
}> = [
	{ id: "NiTi", label: "NiTi SuperElastic", desc: "Никель-титан · Первичное нивелирование", badge: "NiTi" },
	{ id: "CuNiTi", label: "CuNiTi 27°C / 35°C", desc: "Медь-никель-титан · Термоактивная", badge: "CuNiTi" },
	{ id: "SS", label: "SS (Stainless Steel)", desc: "Медицинская сталь · Закрытие промежутков", badge: "SS" },
	{ id: "TMA", label: "TMA (Beta-Titanium)", desc: "Бета-титан · Юстировка и финишные торки", badge: "TMA" },
];

export const ROUND_SECTIONS: ArchwireSection[] = [".012", ".014", ".016", ".018", ".020"];
export const RECT_SECTIONS: ArchwireSection[] = [
	".014x.025",
	".016x.022",
	".016x.025",
	".017x.025",
	".018x.025",
	".019x.025",
	".021x.025",
];

export interface TorquePresetOption {
	id: string;
	label: string;
	shortLabel: string;
	u1Torque: string;
	l1Torque: string;
	desc: string;
}

export const TORQUE_PRESETS: TorquePresetOption[] = [
	{ id: "mbt", label: "Стандарт MBT (+17° / -6°)", shortLabel: "MBT (+17°/-6°)", u1Torque: "+17°", l1Torque: "-6°", desc: "Универсальный стандарт прописи MBT" },
	{ id: "damon_std", label: "Стандарт Damon (+12° / -1°)", shortLabel: "Damon Std (+12°/-1°)", u1Torque: "+12°", l1Torque: "-1°", desc: "Стандартный торк резцов Damon Q2 / Clear" },
	{ id: "damon_high", label: "Высокий High (+17° / +7°)", shortLabel: "High (+17°/+7°)", u1Torque: "+17°", l1Torque: "+7°", desc: "Компенсация ретрузии и потери торка" },
	{ id: "damon_low", label: "Низкий Low (+2° / -6°)", shortLabel: "Low (+2°/-6°)", u1Torque: "+2°", l1Torque: "-6°", desc: "Предотвращение протрузии при скученности" },
	{ id: "roth", label: "Классический Roth (+12° / -1°)", shortLabel: "Roth (+12°/-1°)", u1Torque: "+12°", l1Torque: "-1°", desc: "Классическая пропись Рота" },
];

export const ANGULATION_PRESETS = [
	{ id: "norm", label: "Норма (резцы 5°, клыки 9°)", shortLabel: "Норма" },
	{ id: "canine_upright", label: "Вертикализация клыков (7°)", shortLabel: "Вертикализация" },
];

export const ELASTIC_SCHEMES = [
	{ id: "none", label: "Без эластиков", desc: "Межчелюстная тяга не назначена" },
	{ id: "class_ii", label: "II класс (дистализирующая)", desc: "Клык ВЧ — 6 зуб НЧ" },
	{ id: "class_iii", label: "III класс (мезиализирующая)", desc: "6 зуб ВЧ — клык НЧ" },
	{ id: "vertical_box", label: "Вертикальные (коробчатые)", desc: "Устранение открытого прикуса" },
	{ id: "cross", label: "Перекрестные (Cross-bite)", desc: "Устранение перекрестной окклюзии" },
	{ id: "asymmetric", label: "Асимметричные", desc: "Коррекция косметического центра" },
];

export const ELASTIC_SIZES = [
	{ id: "fox_3_16", label: "3/16\" 3.5 oz (Лиса)", strength: "Light" },
	{ id: "rabbit_3_16", label: "3/16\" 4.5 oz (Кролик)", strength: "Medium" },
	{ id: "kangaroo_1_4", label: "1/4\" 4.5 oz (Кенгуру)", strength: "Medium" },
	{ id: "buffalo_1_4", label: "1/4\" 6.0 oz (Буйвол)", strength: "Heavy" },
	{ id: "bear_5_16", label: "5/16\" 6.0 oz (Медведь)", strength: "Heavy" },
	{ id: "monkey_3_8", label: "3/8\" 4.5 oz (Обезьяна)", strength: "Medium" },
];

export interface OrthoArchwireSelectorProps {
	readonly archwireMaterial: ArchwireMaterial;
	readonly setArchwireMaterial: (material: ArchwireMaterial) => void;
	readonly archwireSection: ArchwireSection;
	readonly setArchwireSection: (section: ArchwireSection) => void;
	readonly onSelectWorkhorseArchwire: (wire: WorkhorseArchwireOption) => void;
	readonly torquePreset: string;
	readonly setTorquePreset: (presetId: string) => void;
	readonly angulationPreset: string;
	readonly setAngulationPreset: (presetId: string) => void;
	readonly elasticScheme: string;
	readonly setElasticScheme: (scheme: string) => void;
	readonly elasticSize: string;
	readonly setElasticSize: (size: string) => void;
	readonly onElasticSizeInteraction?: () => void;
}

export const OrthoArchwireSelector: React.FC<OrthoArchwireSelectorProps> = ({
	archwireMaterial,
	setArchwireMaterial,
	archwireSection,
	setArchwireSection,
	onSelectWorkhorseArchwire,
	torquePreset,
	setTorquePreset,
	angulationPreset,
	setAngulationPreset,
	elasticScheme,
	setElasticScheme,
	elasticSize,
	setElasticSize,
	onElasticSizeInteraction,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-archwire-selector">
			{/* 1. Материал ортодонтической дуги */}
			<div>
				<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
					Материал дуги
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
					{ARCHWIRE_MATERIALS.map((mat) => {
						const isSelected = archwireMaterial === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => setArchwireMaterial(mat.id)}
								className={`min-h-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center transition-all cursor-pointer ${
									isSelected
										? "bg-teal-500/20 border-teal-500 text-teal-800 dark:text-teal-300 font-black shadow-xs"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
								}`}
							>
								<span className="text-sm">{mat.badge}</span>
								<span className="text-[10px] text-slate-500 truncate w-full text-center">
									{mat.id === "NiTi" ? "Нивелирование" : mat.id === "CuNiTi" ? "Термо" : mat.id === "SS" ? "Сталь" : "Бета-титан"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. Сечение ортодонтической дуги */}
			<div>
				<div className="flex items-center justify-between mb-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400">
						Сечение дуги
					</span>
					<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
						Выбрано: {archwireSection}"
					</span>
				</div>

				<div className="flex flex-col gap-2">
					{/* Круглые сечения */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">Круглые:</span>
						{ROUND_SECTIONS.map((sec) => {
							const isSelected = archwireSection === sec;
							return (
								<button
									key={sec}
									type="button"
									onClick={() => setArchwireSection(sec)}
									className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
										isSelected
											? "bg-amber-500 text-white border-amber-600 font-black shadow-xs"
											: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
									}`}
								>
									{sec}"
								</button>
							);
						})}
					</div>

					{/* Прямоугольные сечения */}
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[11px] font-bold text-slate-400 w-16 shrink-0">Прямоуг.:</span>
						{RECT_SECTIONS.map((sec) => {
							const isSelected = archwireSection === sec;
							return (
								<button
									key={sec}
									type="button"
									onClick={() => setArchwireSection(sec)}
									className={`min-h-[36px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
										isSelected
											? "bg-amber-500 text-white border-amber-600 font-black shadow-xs"
											: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
									}`}
								>
									{sec}"
								</button>
							);
						})}
					</div>

					{/* Рабочие дуги ортодонта */}
					<div
						data-testid="ortho-workhorse-wires-strip"
						className="mt-2 p-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/30 flex flex-col gap-1.5"
					>
						<div className="flex items-center justify-between">
							<span className="text-[11px] font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1">
								<Zap size={13} className="text-teal-600 dark:text-teal-400" />
								Рабочие дуги ортодонта
							</span>
							<span className="text-[10px] text-teal-700/80 dark:text-teal-400/80 font-bold">
								Мгновенный выбор материала и сечения
							</span>
						</div>

						<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
							{WORKHORSE_ARCHWIRES.map((wire) => {
								const isSelected = archwireMaterial === wire.material && archwireSection === wire.section;
								return (
									<button
										key={wire.id}
										type="button"
										onClick={() => onSelectWorkhorseArchwire(wire)}
										data-testid={`quick-wire-${wire.id}-btn`}
										className={`min-h-[44px] px-2 py-1 rounded-lg border text-left flex flex-col justify-center min-w-0 transition-all cursor-pointer ${
											isSelected
												? "bg-teal-600 text-white border-teal-700 font-black shadow-xs ring-1 ring-teal-400"
												: "bg-white dark:bg-slate-900 border-teal-300/60 dark:border-teal-800 hover:border-teal-500 text-slate-800 dark:text-slate-100"
										}`}
										title={wire.desc}
									>
										<span className="text-xs font-bold leading-tight truncate w-full">{wire.label}</span>
										<span className={`text-[10px] truncate w-full ${isSelected ? "text-teal-100" : "text-slate-500 dark:text-slate-400"}`}>
											{wire.material === "SS" ? "Рабочая сталь" : "Нивелирование"}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* 3. Расчет торка и ангуляции резцов и клыков */}
			<div
				data-testid="ortho-torque-angulation-panel"
				className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2.5"
			>
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
						<Sliders size={14} className="text-blue-500" />
						Расчет торка и ангуляции
					</span>
					<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
						{TORQUE_PRESETS.find((t) => t.id === torquePreset)?.shortLabel}
					</span>
				</div>

				{/* 4 Торк-пресета */}
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					{TORQUE_PRESETS.map((tOpt) => {
						const isSelected = torquePreset === tOpt.id;
						return (
							<button
								key={tOpt.id}
								type="button"
								onClick={() => {
									setTorquePreset(tOpt.id);
									showToast(`Выбран торк: ${tOpt.label}`, "info");
								}}
								data-testid={`torque-preset-${tOpt.id}-btn`}
								className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-left flex flex-col justify-center min-w-0 transition-all cursor-pointer ${
									isSelected
										? "bg-blue-600 text-white border-blue-700 font-black shadow-xs ring-1 ring-blue-400"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
								}`}
								title={tOpt.desc}
							>
								<span className="text-xs font-bold leading-tight truncate w-full">{tOpt.shortLabel}</span>
								<span className={`text-[10px] truncate w-full ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
									ВЧ {tOpt.u1Torque} / НЧ {tOpt.l1Torque}
								</span>
							</button>
						);
					})}
				</div>

				{/* Ангуляция резцов и клыков */}
				<div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800/60">
					<span className="text-[11px] font-bold text-slate-500">
						Ангуляция резцов/клыков:
					</span>
					<div className="flex items-center gap-1.5">
						{ANGULATION_PRESETS.map((aOpt) => {
							const isSelected = angulationPreset === aOpt.id;
							return (
								<button
									key={aOpt.id}
									type="button"
									onClick={() => setAngulationPreset(aOpt.id)}
									data-testid={`angulation-preset-${aOpt.id}-btn`}
									className={`h-7 px-2 py-0.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
										isSelected
											? "bg-blue-600 text-white border-blue-700 font-black shadow-xs"
											: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
									}`}
								>
									{aOpt.shortLabel}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* 4. Межчелюстные эластики (тяга) */}
			<div className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2.5">
				<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
					<Zap size={14} className="text-purple-500" />
					Межчелюстные эластики (тяга)
				</span>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div>
						<label htmlFor="elastic-scheme-select" className="block text-[11px] font-bold text-slate-500 mb-1">
							Схема фиксации
						</label>
						<select
							id="elastic-scheme-select"
							aria-label="Схема эластиков"
							value={elasticScheme}
							onChange={(e) => setElasticScheme(e.target.value)}
							className="w-full min-h-[38px] px-2.5 py-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
						>
							{ELASTIC_SCHEMES.map((e) => (
								<option key={e.id} value={e.id}>
									{e.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label htmlFor="elastic-size-select" className="block text-[11px] font-bold text-slate-500 mb-1">
							Размер и сила (калибр)
						</label>
						<select
							id="elastic-size-select"
							aria-label="Размер эластиков"
							disabled={false}
							value={elasticSize}
							onClick={onElasticSizeInteraction}
							onFocus={onElasticSizeInteraction}
							onChange={(e) => {
								if (onElasticSizeInteraction) onElasticSizeInteraction();
								setElasticSize(e.target.value);
							}}
							className="w-full min-h-[38px] px-2.5 py-1 bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] dark:text-slate-100 outline-none"
						>
							{ELASTIC_SIZES.map((s) => (
								<option key={s.id} value={s.id}>
									{s.label} ({s.strength})
								</option>
							))}
						</select>
					</div>
				</div>
			</div>
		</div>
	);
};
