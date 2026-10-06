import React from "react";
import { Activity, CheckCircle2, Layers } from "lucide-react";
import { DentalArticulator } from "../icons/DentalIcons";
import {
	ANGLE_CLASS_OPTIONS,
	type AngleClass,
	type SagittalAnomaly,
	type VerticalAnomaly,
	type TransversalAnomaly,
	type TmjStatus,
} from "@dental/shared";

export interface OrthoDiagnosticsSectionProps {
	readonly angleClass: AngleClass;
	readonly setAngleClass: (c: AngleClass) => void;
	readonly onSetAngleClassNorm: () => void;
	readonly sagittalAnomaly: SagittalAnomaly;
	readonly setSagittalAnomaly: (s: SagittalAnomaly) => void;
	readonly sagittalGapMm: number;
	readonly setSagittalGapMm: (mm: number) => void;
	readonly verticalAnomaly: VerticalAnomaly;
	readonly setVerticalAnomaly: (v: VerticalAnomaly) => void;
	readonly transversalAnomaly: TransversalAnomaly;
	readonly setTransversalAnomaly: (t: TransversalAnomaly) => void;
	readonly onSetOcclusionNorm: () => void;
	readonly tmjStatus: TmjStatus;
	readonly setTmjStatus: (s: TmjStatus) => void;
	readonly onSetTmjNorm: () => void;
}

export const OrthoDiagnosticsSection: React.FC<OrthoDiagnosticsSectionProps> = ({
	angleClass,
	setAngleClass,
	onSetAngleClassNorm,
	sagittalAnomaly,
	setSagittalAnomaly,
	sagittalGapMm,
	setSagittalGapMm,
	verticalAnomaly,
	setVerticalAnomaly,
	transversalAnomaly,
	setTransversalAnomaly,
	onSetOcclusionNorm,
	tmjStatus,
	setTmjStatus,
	onSetTmjNorm,
}) => {
	return (
		<div className="space-y-4" data-testid="ortho-diagnostics-section">
			{/* 1. Прикус по Энглю */}
			<div
				data-testid="ortho-angle-class-selector"
				className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2"
			>
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
						<Activity size={14} className="text-blue-500" />
						Прикус по Энглю
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onSetAngleClassNorm}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer min-h-[36px]"
							data-testid="angle-class-norm-1click-btn"
							title="Класс I по Энглю / Физиологический прикус (Норма СтАР)"
						>
							<CheckCircle2 size={12} />
							<span>Норма (Класс I)</span>
						</button>
						<span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
							{ANGLE_CLASS_OPTIONS.find((a) => a.id === angleClass)?.shortLabel}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					{ANGLE_CLASS_OPTIONS.map((opt) => {
						const isSelected = angleClass === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => setAngleClass(opt.id)}
								data-testid={`angle-class-${opt.id}-btn`}
								className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
									isSelected
										? "bg-blue-600 text-white border-blue-700 font-black shadow-xs ring-1 ring-blue-400"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
								}`}
								title={opt.desc}
							>
								<span className="text-xs font-bold leading-tight">{opt.shortLabel}</span>
								<span className={`text-[10px] truncate w-full ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
									{opt.id === "class_1" ? "Нейтральный" : opt.id === "class_2_div_1" ? "Протрузия" : opt.id === "class_2_div_2" ? "Ретрузия" : "Мезиальный"}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. Резцовые и окклюзионные соотношения (Sagittal, Vertical, Transversal) */}
			<div
				data-testid="ortho-occlusion-anomaly-selector"
				className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2.5"
			>
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
						<Layers size={14} className="text-teal-500" />
						Резцовые и окклюзионные соотношения
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onSetOcclusionNorm}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 cursor-pointer min-h-[36px]"
							data-testid="occlusion-norm-1click-btn"
							title="Физиологическая окклюзия резцов и моляров (Норма)"
						>
							<CheckCircle2 size={12} />
							<span>Норма окклюзии</span>
						</button>
					</div>
				</div>

				{/* Сагиттальная щель */}
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
						<span>Сагиттальная щель (оверджет):</span>
						{sagittalAnomaly === "overjet" && (
							<span className="font-bold text-teal-600 dark:text-teal-400">{sagittalGapMm} мм</span>
						)}
					</div>
					<div className="grid grid-cols-3 gap-1.5">
						<button
							type="button"
							onClick={() => {
								setSagittalAnomaly("norm");
								setSagittalGapMm(2);
							}}
							data-testid="sagittal-norm-btn"
							className={`min-h-[40px] px-2 py-1 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
								sagittalAnomaly === "norm"
									? "bg-teal-600 text-white border-teal-700 shadow-xs"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
							}`}
						>
							Норма (1–2 мм)
						</button>
						<button
							type="button"
							onClick={() => {
								setSagittalAnomaly("overjet");
								setSagittalGapMm(sagittalGapMm <= 2 ? 4 : sagittalGapMm);
							}}
							data-testid="sagittal-overjet-btn"
							className={`min-h-[40px] px-2 py-1 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
								sagittalAnomaly === "overjet"
									? "bg-teal-600 text-white border-teal-700 shadow-xs"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
							}`}
						>
							Оверджет (&gt;2 мм)
						</button>
						<button
							type="button"
							onClick={() => setSagittalAnomaly("reverse")}
							data-testid="sagittal-reverse-btn"
							className={`min-h-[40px] px-2 py-1 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
								sagittalAnomaly === "reverse"
									? "bg-teal-600 text-white border-teal-700 shadow-xs"
									: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
							}`}
						>
							Обратный прикус
						</button>
					</div>
				</div>

				{/* Вертикальное и трансверзальное соотношения */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div className="flex flex-col gap-1">
						<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
							Вертикальное перекрытие:
						</span>
						<div className="grid grid-cols-3 gap-1">
							<button
								type="button"
								onClick={() => setVerticalAnomaly("norm")}
								data-testid="vertical-norm-btn"
								className={`min-h-[38px] px-1.5 py-1 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
									verticalAnomaly === "norm"
										? "bg-teal-600 text-white border-teal-700"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
								}`}
							>
								Норма (1/3)
							</button>
							<button
								type="button"
								onClick={() => setVerticalAnomaly("deep")}
								data-testid="vertical-deep-btn"
								className={`min-h-[38px] px-1.5 py-1 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
									verticalAnomaly === "deep"
										? "bg-teal-600 text-white border-teal-700"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
								}`}
							>
								Глубокий
							</button>
							<button
								type="button"
								onClick={() => setVerticalAnomaly("open")}
								data-testid="vertical-open-btn"
								className={`min-h-[38px] px-1.5 py-1 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
									verticalAnomaly === "open"
										? "bg-teal-600 text-white border-teal-700"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
								}`}
							>
								Открытый
							</button>
						</div>
					</div>

					<div className="flex flex-col gap-1">
						<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
							Трансверзальное соотношение:
						</span>
						<div className="grid grid-cols-2 gap-1">
							<button
								type="button"
								onClick={() => setTransversalAnomaly("norm")}
								data-testid="transversal-norm-btn"
								className={`min-h-[38px] px-2 py-1 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
									transversalAnomaly === "norm"
										? "bg-teal-600 text-white border-teal-700"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
								}`}
							>
								Норма
							</button>
							<button
								type="button"
								onClick={() => setTransversalAnomaly("crossbite")}
								data-testid="transversal-crossbite-btn"
								className={`min-h-[38px] px-2 py-1 rounded-lg border text-center text-[11px] font-bold transition-all cursor-pointer ${
									transversalAnomaly === "crossbite"
										? "bg-teal-600 text-white border-teal-700"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
								}`}
							>
								Перекрестный
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* 3. Гнатология и статус ВНЧС */}
			<div
				data-testid="ortho-gnathology-tmj-selector"
				className="bg-[var(--surface,#f8fafc)] dark:bg-slate-800/40 p-3 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-2"
			>
				<div className="flex items-center justify-between flex-wrap gap-1.5">
					<span className="text-xs font-black uppercase tracking-wider text-[var(--muted,#64748b)] dark:text-slate-400 flex items-center gap-1.5">
						<DentalArticulator size={14} className="text-amber-500" />
						Гнатология и статус ВНЧС
					</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onSetTmjNorm}
							className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer min-h-[36px]"
							data-testid="tmj-norm-1click-btn"
							title="Пальпация безболезненная, девиации нет, шум отсутствует"
						>
							<CheckCircle2 size={12} />
							<span>Норма ВНЧС</span>
						</button>
						<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
							{tmjStatus === "norm"
								? "Норма"
								: tmjStatus === "clicking"
									? "Щелчки"
									: tmjStatus === "pain"
										? "Пальпация +"
										: tmjStatus === "deviation"
											? "Девиация"
											: "Сплинт"}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
					{[
						{ id: "norm" as const, label: "Норма", desc: "Безболезненно, шума нет" },
						{ id: "clicking" as const, label: "Щелчок ВНЧС", desc: "Суставной щелчок" },
						{ id: "pain" as const, label: "Боль / пальпация", desc: "Болезненность пальпации" },
						{ id: "deviation" as const, label: "Девиация", desc: "Смещение челюсти" },
						{ id: "splint" as const, label: "Сплинт-шина", desc: "Окклюзионная сплинт-терапия" },
					].map((opt) => {
						const isSelected = tmjStatus === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => setTmjStatus(opt.id)}
								data-testid={`tmj-status-${opt.id}-btn`}
								className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
									isSelected
										? "bg-amber-600 text-white border-amber-700 font-black shadow-xs ring-1 ring-amber-400"
										: "bg-[var(--paper,#ffffff)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
								}`}
								title={opt.desc}
							>
								<span className="text-xs font-bold leading-tight">{opt.label}</span>
								<span className={`text-[10px] truncate w-full ${isSelected ? "text-amber-100" : "text-slate-400"}`}>
									{opt.desc}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
