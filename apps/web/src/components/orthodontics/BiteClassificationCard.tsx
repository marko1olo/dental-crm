/**
 * @dental/web/components/orthodontics/BiteClassificationCard.tsx
 *
 * DENTE Dental CRM — Канонический клинический модуль классификации прикуса и окклюзии (Мандаты 8b, 8e, 8x, 8am).
 * Включает:
 * 1. Классификацию прикуса по Энглю (I, II/1, II/2, III) с анатомическим смыканием моляров 16/46, 26/36 и клыков.
 * 2. Скелетный класс по ANB (Штейнер): I (0–4°), II (>4.5°), III (<0°).
 * 3. Вертикальное и сагиттальное резцовое соотношение (Overjet, Overbite, глубокий / открытый / перекрестный прикус).
 * 4. Apple HIG сенсорные переключатели (touch target >= 44x44px), 0px горизонтального скролл-дрифта.
 */

import React from "react";
import { Compass, Check, ArrowRightLeft, ShieldAlert } from "lucide-react";
import {
	ANGLE_CLASSES_CATALOG,
	calculateSkeletalClassFromAnb,
	type AngleClass,
	type VerticalBite,
} from "./orthodonticsCatalogData";

export interface BiteClassificationCardProps {
	readonly angleClass: AngleClass;
	readonly onAngleClassChange: (angleClass: AngleClass) => void;
	readonly verticalBite?: VerticalBite | undefined;
	readonly onVerticalBiteChange?: ((verticalBite: VerticalBite) => void) | undefined;
	readonly anbDeg?: number | undefined;
	readonly onAnbDegChange?: ((anbDeg: number) => void) | undefined;
	readonly overjetMm?: number | undefined;
	readonly onOverjetMmChange?: ((mm: number) => void) | undefined;
	readonly overbitePercent?: number | undefined;
	readonly onOverbitePercentChange?: ((percent: number) => void) | undefined;
	readonly className?: string | undefined;
}

const VERTICAL_BITE_OPTIONS: readonly {
	readonly key: VerticalBite;
	readonly labelRu: string;
	readonly descriptionRu: string;
}[] = [
	{ key: "normal", labelRu: "Нормальное (1/3)", descriptionRu: "Физиологическое перекрытие верхними резцами на одну треть высоты коронок нижних" },
	{ key: "deep", labelRu: "Глубокое (>1/2)", descriptionRu: "Чрезмерное резцовое перекрытие более 50%, травмирующая окклюзия" },
	{ key: "open", labelRu: "Открытый прикус", descriptionRu: "Отсутствие смыкания во фронтальном отделе, вертикальная щель" },
	{ key: "cross", labelRu: "Перекрестный", descriptionRu: "Обратное щечно-язычное перекрытие зубных рядов (одно- или двустороннее)" },
];

export const BiteClassificationCard: React.FC<BiteClassificationCardProps> = ({
	angleClass,
	onAngleClassChange,
	verticalBite = "normal",
	onVerticalBiteChange,
	anbDeg = 2.0,
	onAnbDegChange,
	overjetMm,
	onOverjetMmChange,
	overbitePercent,
	onOverbitePercentChange,
	className,
}) => {
	const skeletal = calculateSkeletalClassFromAnb(anbDeg);

	return (
		<div
			className={`ortho-card flex flex-col gap-3.5 ${className || ""}`}
			data-testid="bite-classification-card"
		>
			{/* Шапка карточки */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
						<Compass className="w-4 h-4" />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)]">Классификация прикуса и окклюзии</h4>
						<p className="text-[11px] text-[var(--ink-muted)]">
							Сагиттальное, вертикальное и скелетное соотношение челюстей
						</p>
					</div>
				</div>

				{/* Бейдж скелетного класса */}
				<div
					className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold shrink-0 flex items-center gap-1.5"
					data-testid="skeletal-class-badge"
				>
					<span>Скелетный класс {skeletal.skeletalClass}</span>
					<span className="text-[10px] font-mono opacity-80">(ANB {anbDeg}°)</span>
				</div>
			</div>

			{/* 1. Классификация по Энглю (моляры 16/46, 26/36) */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
						Класс по Энглю (смыкание моляров и клыков):
					</span>
					<span className="text-[11px] text-[var(--ink-muted)] font-mono">FDI 16/46 · 26/36</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{ANGLE_CLASSES_CATALOG.map((ac) => {
						const isSelected = angleClass === ac.key;
						return (
							<button
								key={ac.key}
								type="button"
								data-testid={`angle-class-${ac.key}`}
								onClick={() => onAngleClassChange(ac.key)}
								className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1 min-h-[52px] cursor-pointer ${
									isSelected
										? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--ink)] shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--line-strong,var(--primary))]"
								}`}
							>
								<div className="flex items-center justify-between gap-1">
									<span className={`text-xs font-bold ${isSelected ? "text-[var(--primary)]" : "text-[var(--ink)]"}`}>
										{ac.titleRu}
									</span>
									{isSelected && <Check className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />}
								</div>
								<p className="text-[11px] text-[var(--ink-muted)] leading-snug">
									{ac.descriptionRu}
								</p>
							</button>
						);
					})}
				</div>
			</div>

			{/* 2. Скелетный угол ANB и сагиттальный сдвиг */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
				<div className="flex items-center gap-2">
					<ArrowRightLeft className="w-4 h-4 text-[var(--primary)] shrink-0" />
					<div>
						<div className="font-bold text-[var(--ink)]">{skeletal.labelRu}</div>
						<div className="text-[11px] text-[var(--ink-muted)] leading-tight">{skeletal.description}</div>
					</div>
				</div>

				<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
					<label htmlFor="anb-angle-input" className="text-[11px] text-[var(--ink-muted)] whitespace-nowrap">Угол ANB:</label>
					<div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)]">
						<input
							id="anb-angle-input"
							data-testid="anb-angle-input"
							type="number"
							step="0.5"
							min="-10"
							max="15"
							value={anbDeg}
							onChange={(e) => {
								const val = parseFloat(e.target.value) || 0;
								if (onAnbDegChange) onAnbDegChange(val);
							}}
							className="w-14 text-center font-bold font-mono text-xs bg-transparent border-none outline-none text-[var(--ink)]"
						/>
						<span className="text-xs text-[var(--ink-muted)]">°</span>
					</div>
				</div>
			</div>

			{/* 3. Вертикальное соотношение резцов */}
			<div className="flex flex-col gap-1.5 pt-1 border-t border-[var(--line)]">
				<span className="text-[11px] font-semibold text-[var(--ink-muted)] uppercase tracking-wider">
					Вертикальное перекрытие резцов:
				</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					{VERTICAL_BITE_OPTIONS.map((opt) => {
						const isSelected = verticalBite === opt.key;
						return (
							<button
								key={opt.key}
								type="button"
								data-testid={`vertical-bite-${opt.key}`}
								onClick={() => {
									if (onVerticalBiteChange) onVerticalBiteChange(opt.key);
								}}
								className={`min-h-[44px] p-2 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
									isSelected
										? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] font-semibold shadow-xs"
										: "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								<span className="text-xs font-bold leading-tight">{opt.labelRu}</span>
								<span className="text-[10px] text-[var(--ink-muted)] leading-none line-clamp-1">
									{opt.descriptionRu}
								</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* 4. Тонкие замеры: сагиттальная щель (overjet) и глубина перекрытия (overbite) */}
			{(onOverjetMmChange || onOverbitePercentChange) && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--line)] text-xs">
					{onOverjetMmChange && (
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] min-h-[44px]">
							<span className="text-[11px] text-[var(--ink-muted)] font-medium">Сагиттальная щель (Overjet):</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									step="0.5"
									min="0"
									max="20"
									value={overjetMm ?? 2.0}
									onChange={(e) => onOverjetMmChange(parseFloat(e.target.value) || 0)}
									className="w-12 text-center font-bold text-xs bg-[var(--paper)] border border-[var(--line)] rounded px-1 py-0.5"
								/>
								<span className="text-xs text-[var(--ink-muted)]">мм</span>
							</div>
						</div>
					)}

					{onOverbitePercentChange && (
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] min-h-[44px]">
							<span className="text-[11px] text-[var(--ink-muted)] font-medium">Перекрытие резцов (Overbite):</span>
							<div className="flex items-center gap-1">
								<input
									type="number"
									step="5"
									min="0"
									max="100"
									value={overbitePercent ?? 30}
									onChange={(e) => onOverbitePercentChange(parseInt(e.target.value, 10) || 0)}
									className="w-12 text-center font-bold text-xs bg-[var(--paper)] border border-[var(--line)] rounded px-1 py-0.5"
								/>
								<span className="text-xs text-[var(--ink-muted)]">%</span>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default BiteClassificationCard;
