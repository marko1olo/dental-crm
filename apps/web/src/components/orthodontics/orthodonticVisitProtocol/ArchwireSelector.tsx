import React from "react";
import { Sliders, Zap } from "lucide-react";
import {
	WORKHORSE_ARCHWIRES,
	type WorkhorseArchwireOption,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type {
	ArchwireMaterial,
	ArchwireSection,
	ArchwireSelectorProps,
	TorquePresetOption,
	AngulationPresetOption,
} from "./types";

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

export const TORQUE_PRESETS: TorquePresetOption[] = [
	{ id: "mbt", label: "Стандарт MBT (+17° / -6°)", shortLabel: "MBT (+17°/-6°)", u1Torque: "+17°", l1Torque: "-6°", desc: "Универсальный стандарт прописи MBT" },
	{ id: "damon_std", label: "Стандарт Damon (+12° / -1°)", shortLabel: "Damon Std (+12°/-1°)", u1Torque: "+12°", l1Torque: "-1°", desc: "Стандартный торк резцов Damon Q2 / Clear" },
	{ id: "damon_high", label: "Высокий High (+17° / +7°)", shortLabel: "High (+17°/+7°)", u1Torque: "+17°", l1Torque: "+7°", desc: "Компенсация ретрузии и потери торка" },
	{ id: "damon_low", label: "Низкий Low (+2° / -6°)", shortLabel: "Low (+2°/-6°)", u1Torque: "+2°", l1Torque: "-6°", desc: "Предотвращение протрузии при скученности" },
	{ id: "roth", label: "Классический Roth (+12° / -1°)", shortLabel: "Roth (+12°/-1°)", u1Torque: "+12°", l1Torque: "-1°", desc: "Классическая пропись Рота" },
];

export const ANGULATION_PRESETS: AngulationPresetOption[] = [
	{ id: "norm", label: "Норма (резцы 5°, клыки 9°)", shortLabel: "Норма" },
	{ id: "canine_upright", label: "Вертикализация клыков (7°)", shortLabel: "Вертикализация" },
];

export const ArchwireSelector: React.FC<ArchwireSelectorProps> = ({
	archwireMaterial,
	setArchwireMaterial,
	archwireSection,
	setArchwireSection,
	onSelectWorkhorseArchwire,
	torquePreset,
	setTorquePreset,
	angulationPreset,
	setAngulationPreset,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-archwire-selector">
			{/* 1. Материал ортодонтической дуги (Segmented Bar) */}
			<div>
				<span className="block text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 mb-1.5">
					Материал дуги
				</span>
				<div className="bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-900/80 p-1 rounded-xl border border-[var(--line-subtle,#e2e8f0)] dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-1">
					{ARCHWIRE_MATERIALS.map((mat) => {
						const isSelected = archwireMaterial === mat.id;
						return (
							<button
								key={mat.id}
								type="button"
								onClick={() => setArchwireMaterial(mat.id)}
								className={`h-9 px-2.5 py-1 rounded-lg text-xs font-medium border flex flex-col items-center justify-center transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-300 font-bold shadow-xs"
										: "bg-transparent border-transparent text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--line-subtle,#e2e8f0)]/50"
								}`}
							>
								<span className="text-[12.5px] font-bold leading-tight">{mat.badge}</span>
								<span className="text-[11.5px] text-[var(--muted,#64748b)] dark:text-slate-400 truncate w-full text-center leading-tight">
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
					<span className="text-[12px] font-bold text-teal-700 dark:text-teal-300">
						Выбрано: {archwireSection}"
					</span>
				</div>

				<div className="flex flex-col gap-2">
					{/* Круглые сечения */}
					<div className="bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-900/80 p-1 rounded-lg border border-[var(--line-subtle,#e2e8f0)] dark:border-slate-800 flex items-center gap-1 flex-wrap">
						<span className="text-[12px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400 px-2 shrink-0">Круглые:</span>
						{ROUND_SECTIONS.map((sec) => {
							const isSelected = archwireSection === sec;
							return (
								<button
									key={sec}
									type="button"
									onClick={() => setArchwireSection(sec)}
									className={`h-7 px-2.5 rounded-md text-[12.5px] font-medium transition-all cursor-pointer ${
										isSelected
											? "bg-[var(--teal,#0d9488)] text-white font-semibold shadow-xs"
											: "bg-transparent text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-slate-800"
									}`}
								>
									{sec}"
								</button>
							);
						})}
					</div>

					{/* Прямоугольные сечения */}
					<div className="bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-900/80 p-1 rounded-lg border border-[var(--line-subtle,#e2e8f0)] dark:border-slate-800 flex items-center gap-1 flex-wrap">
						<span className="text-[12px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400 px-2 shrink-0">Прямоуг.:</span>
						{RECT_SECTIONS.map((sec) => {
							const isSelected = archwireSection === sec;
							return (
								<button
									key={sec}
									type="button"
									onClick={() => setArchwireSection(sec)}
									className={`h-7 px-2 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
										isSelected
											? "bg-[var(--teal,#0d9488)] text-white font-semibold shadow-xs"
											: "bg-transparent text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-slate-800"
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
						className="mt-1 p-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-950/30 border border-teal-500/30 flex flex-col gap-1.5"
					>
						<div className="flex items-center justify-between">
							<span className="text-[12px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1">
								<Zap size={14} className="text-teal-600 dark:text-teal-400" />
								Рабочие дуги ортодонта
							</span>
							<span className="text-[12px] text-teal-700/90 dark:text-teal-400/90 font-medium">
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
										className={`h-10 px-2.5 py-1 rounded-lg border text-left flex flex-col justify-center min-w-0 transition-all cursor-pointer ${
											isSelected
												? "bg-[var(--teal,#0d9488)] text-white border-teal-700 font-bold shadow-xs"
												: "bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-teal-300/60 dark:border-teal-800/80 hover:border-teal-500 text-[var(--ink,#0f172a)] dark:text-slate-100"
										}`}
										title={wire.desc}
									>
										<span className="text-[12.5px] font-bold leading-tight truncate w-full">{wire.label}</span>
										<span className={`text-[11.5px] truncate w-full ${isSelected ? "text-teal-100" : "text-[var(--muted,#64748b)] dark:text-slate-400"}`}>
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
						<Sliders size={14} className="text-teal-600 dark:text-teal-400" />
						Расчет торка и ангуляции
					</span>
					<span className="text-[12px] font-bold text-teal-700 dark:text-teal-300">
						{TORQUE_PRESETS.find((t) => t.id === torquePreset)?.shortLabel}
					</span>
				</div>

				{/* Торк-пресеты */}
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
								className={`h-10 px-2.5 py-1 rounded-lg border text-left flex flex-col justify-center min-w-0 transition-all cursor-pointer ${
									isSelected
										? "bg-[var(--teal,#0d9488)] text-white border-teal-700 font-bold shadow-xs"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--paper-soft,#f1f5f9)]"
								}`}
								title={tOpt.desc}
							>
								<span className="text-[12.5px] font-bold leading-tight truncate w-full">{tOpt.shortLabel}</span>
								<span className={`text-[11.5px] truncate w-full ${isSelected ? "text-teal-100" : "text-[var(--muted,#64748b)] dark:text-slate-400"}`}>
									ВЧ {tOpt.u1Torque} / НЧ {tOpt.l1Torque}
								</span>
							</button>
						);
					})}
				</div>

				{/* Ангуляция резцов и клыков (Segmented Bar) */}
				<div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800/60">
					<span className="text-[12px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
						Ангуляция резцов/клыков:
					</span>
					<div className="bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-900/80 p-0.5 rounded-lg border border-[var(--line-subtle,#e2e8f0)] dark:border-slate-800 flex items-center gap-1">
						{ANGULATION_PRESETS.map((aOpt) => {
							const isSelected = angulationPreset === aOpt.id;
							return (
								<button
									key={aOpt.id}
									type="button"
									onClick={() => setAngulationPreset(aOpt.id)}
									data-testid={`angulation-preset-${aOpt.id}-btn`}
									className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-all cursor-pointer ${
										isSelected
											? "bg-[var(--teal,#0d9488)] text-white font-semibold shadow-xs"
											: "bg-transparent text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper,#ffffff)] dark:hover:bg-slate-800"
									}`}
								>
									{aOpt.shortLabel}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};
