/**
 * TreatmentPlanPresenterDentalFormula.tsx — Интерактивная анатомическая формула FDI (11..48)
 * для студии презентации планов лечения пациенту у кресла (Chairside Presenter).
 *
 * ВОЗМОЖНОСТИ:
 * 1. Верхняя (18..11, 21..28) и нижняя (48..41, 31..38) дуги постоянного прикуса по стандарту ISO 3950 / FDI.
 * 2. Визуальная подсветка зубов, задействованных в выбранном сценарии («Эконом», «Оптимум», «Премиум»).
 * 3. Цветовые индикаторы клинических этапов (Этап 1: терапия/гигиена, Этап 2: хирургия/имплантация, Этап 3: ортопедия).
 * 4. 1-кликовая карточка инспекции зуба с перечнем процедур по номенклатуре 804н и ценой.
 * 5. Нулевой визуальный мусор, строгий медицинский стиль, сенсорные тач-таргеты Apple HIG.
 */

import React, { useState, useMemo } from "react";
import { Info, X, Check, ShieldAlert, Sparkles } from "lucide-react";
import type { TreatmentPlanTier, TreatmentPlanItem } from "../types";
import type { ToothData } from "../../odontogram/ToothChart";
import { formatChairsidePrice } from "../treatmentPlanMath";

export interface TreatmentPlanPresenterDentalFormulaProps {
	readonly tier: TreatmentPlanTier;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly onToothClick?: ((toothNumber: number) => void) | undefined;
	readonly className?: string | undefined;
}

const UPPER_RIGHT_QUADRANT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const UPPER_LEFT_QUADRANT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_RIGHT_QUADRANT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const LOWER_LEFT_QUADRANT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

function getToothRussianName(toothNumber: number): string {
	const q = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const jaw = q === 1 || q === 2 ? "верхний" : "нижний";
	const side = q === 1 || q === 4 ? "правый" : "левый";

	const names: Record<number, string> = {
		1: "центральный резец",
		2: "боковой резец",
		3: "клык",
		4: "первый премоляр",
		5: "второй премоляр",
		6: "первый моляр",
		7: "второй моляр",
		8: "третий моляр (зуб мудрости)",
	};

	return `${pos ? names[pos] : "зуб"} ${jaw} ${side}`;
}

export const TreatmentPlanPresenterDentalFormula: React.FC<TreatmentPlanPresenterDentalFormulaProps> = ({
	tier,
	teeth = [],
	onToothClick,
	className = "",
}) => {
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

	// Карта патологий из исходного осмотра пациента (ToothData)
	const teethMap = useMemo(() => {
		const map = new Map<number, ToothData>();
		for (const t of teeth) {
			const num = t.toothNumber ?? (t as any).id ?? (t as any).number;
			if (typeof num === "number") {
				map.set(num, t);
			}
		}
		return map;
	}, [teeth]);

	// Карта процедур, запланированных в текущем варианте лечения
	const planTeethMap = useMemo(() => {
		const map = new Map<number, { stages: number[]; items: (TreatmentPlanItem & { stageNumber: number; stageTitle: string })[] }>();
		for (const stage of tier.stages) {
			for (const item of stage.items) {
				if (item.toothNumber && item.toothNumber > 0) {
					const existing = map.get(item.toothNumber) || { stages: [], items: [] };
					if (!existing.stages.includes(stage.stageNumber)) {
						existing.stages.push(stage.stageNumber);
					}
					existing.items.push({
						...item,
						stageNumber: stage.stageNumber,
						stageTitle: stage.title,
					});
					map.set(item.toothNumber, existing);
				}
			}
		}
		return map;
	}, [tier.stages]);

	const totalTreatedTeeth = planTeethMap.size;

	const handleToothSelect = (num: number) => {
		setSelectedTooth((prev) => (prev === num ? null : num));
		onToothClick?.(num);
	};

	const renderToothCell = (num: number) => {
		const planInfo = planTeethMap.get(num);
		const initialToothData = teethMap.get(num);
		const isInPlan = Boolean(planInfo && planInfo.items.length > 0);
		const isSelected = selectedTooth === num;
		const hasPathology = Boolean(initialToothData && initialToothData.state && initialToothData.state !== "Healthy");

		// Определяем цвет стадии
		const primaryStage = planInfo?.stages[0];
		const stageBadgeText = planInfo && planInfo.stages.length > 0 ? `Э${planInfo.stages.join(",")}` : null;

		let cellBorderClass = "border-[var(--tp-border)]";
		let cellBgClass = "bg-[var(--tp-bg)]";
		let cellTextClass = "text-[var(--tp-text-muted)]";

		if (isInPlan) {
			cellBorderClass = "border-teal-500 shadow-2xs";
			cellBgClass = "bg-teal-500/15";
			cellTextClass = "text-teal-700 dark:text-teal-300 font-bold";
		} else if (hasPathology) {
			cellBorderClass = "border-amber-400/80";
			cellBgClass = "bg-amber-500/10";
			cellTextClass = "text-amber-700 dark:text-amber-300";
		}

		if (isSelected) {
			cellBorderClass = "border-[var(--tp-primary)] ring-2 ring-[var(--tp-primary)] ring-offset-1";
		}

		return (
			<button
				key={num}
				type="button"
				onClick={() => handleToothSelect(num)}
				className={`min-w-[32px] sm:min-w-[36px] h-10 px-1 py-0.5 rounded-lg border text-center flex flex-col items-center justify-between cursor-pointer transition-all duration-150 touch-manipulation select-none relative ${cellBorderClass} ${cellBgClass} ${cellTextClass}`}
				title={`Зуб FDI ${num}: ${getToothRussianName(num)}${isInPlan ? ` (В плане: ${planInfo?.items.length} процедур)` : ""}`}
				data-testid={`presenter-fdi-tooth-${num}`}
				aria-pressed={isSelected}
			>
				<span className="text-[11px] sm:text-[12px] font-mono leading-none">{num}</span>
				{stageBadgeText ? (
					<span className="text-[9px] font-bold px-1 rounded-sm bg-teal-600 text-white leading-tight">
						{stageBadgeText}
					</span>
				) : hasPathology ? (
					<span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
				) : (
					<span className="text-[9px] opacity-40 leading-none">·</span>
				)}
			</button>
		);
	};

	const selectedToothPlan = selectedTooth ? planTeethMap.get(selectedTooth) : null;
	const selectedToothInitial = selectedTooth ? teethMap.get(selectedTooth) : null;

	return (
		<div className={`treatment-dental-formula-wrap rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] p-3 sm:p-4 shadow-2xs ${className}`} data-testid="treatment-plan-fdi-formula">
			{/* Header Strip */}
			<div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
				<div className="flex items-center gap-2">
					<span className="text-xs font-bold text-[var(--tp-text-main)] uppercase tracking-wider">
						Анатомическая зубная формула FDI (11–48)
					</span>
					<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/20">
						В тарифе задействовано: {totalTreatedTeeth} зубов
					</span>
				</div>

				<div className="flex items-center gap-3 text-[11px] text-[var(--tp-text-muted)]">
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-xs bg-teal-500/20 border border-teal-500" />
						<span>В плане лечения</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-xs bg-amber-500/20 border border-amber-400" />
						<span>Патология</span>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-xs bg-[var(--tp-bg)] border border-[var(--tp-border)]" />
						<span>Здоров / Интактный</span>
					</div>
				</div>
			</div>

			{/* Formula Grid (Upper and Lower Arches) */}
			<div className="overflow-x-auto pb-1 scrollbar-none">
				<div className="min-w-[620px] flex flex-col gap-1.5 items-center">
					{/* Верхняя челюсть */}
					<div className="flex items-center justify-center gap-1 sm:gap-1.5">
						<span className="text-[10px] font-bold text-[var(--tp-text-muted)] w-10 text-right mr-1">Верх:</span>
						{/* Правый квадрант 1 (18..11) */}
						<div className="flex items-center gap-1">
							{UPPER_RIGHT_QUADRANT.map(renderToothCell)}
						</div>
						<div className="w-[2px] h-9 bg-[var(--tp-border)] mx-1" />
						{/* Левый квадрант 2 (21..28) */}
						<div className="flex items-center gap-1">
							{UPPER_LEFT_QUADRANT.map(renderToothCell)}
						</div>
					</div>

					{/* Нижняя челюсть */}
					<div className="flex items-center justify-center gap-1 sm:gap-1.5">
						<span className="text-[10px] font-bold text-[var(--tp-text-muted)] w-10 text-right mr-1">Низ:</span>
						{/* Правый квадрант 4 (48..41) */}
						<div className="flex items-center gap-1">
							{LOWER_RIGHT_QUADRANT.map(renderToothCell)}
						</div>
						<div className="w-[2px] h-9 bg-[var(--tp-border)] mx-1" />
						{/* Левый квадрант 3 (31..38) */}
						<div className="flex items-center gap-1">
							{LOWER_LEFT_QUADRANT.map(renderToothCell)}
						</div>
					</div>
				</div>
			</div>

			{/* Selected Tooth Detail Inspection Card */}
			{selectedTooth && (
				<div
					className="mt-3 p-3 rounded-xl bg-[var(--tp-surface-soft)] border border-[var(--tp-border)] animate-in fade-in duration-150 flex flex-col gap-2"
					data-testid="fdi-tooth-inspection-card"
				>
					<div className="flex items-center justify-between gap-2 border-b border-[var(--tp-border)]/60 pb-2">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2 py-0.5 rounded-lg bg-[var(--tp-primary)] text-white font-mono font-bold text-xs">
								Зуб FDI {selectedTooth}
							</span>
							<span className="font-bold text-xs text-[var(--tp-text-main)]">
								{getToothRussianName(selectedTooth)}
							</span>
							{selectedToothInitial?.state && (
								<span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">
									Клинический диагноз: {selectedToothInitial.state} {selectedToothInitial.notes ? `(${selectedToothInitial.notes})` : ""}
								</span>
							)}
						</div>

						<button
							type="button"
							onClick={() => setSelectedTooth(null)}
							className="p-1 rounded-md text-[var(--tp-text-muted)] hover:text-[var(--tp-text-main)] hover:bg-[var(--tp-border)]/30 cursor-pointer"
							title="Закрыть информацию о зубе"
							data-testid="close-fdi-inspection-btn"
						>
							<X size={15} />
						</button>
					</div>

					{selectedToothPlan && selectedToothPlan.items.length > 0 ? (
						<div className="space-y-1.5">
							<div className="text-[11px] font-bold text-[var(--tp-text-muted)]">
								Запланированные манипуляции в тарифе «{tier.title}»:
							</div>
							<div className="flex flex-col gap-1">
								{selectedToothPlan.items.map((it, idx) => (
									<div
										key={it.id || idx}
										className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--tp-surface)] border border-[var(--tp-border)]/40 text-xs"
									>
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<span className="px-1.5 py-0.5 rounded-sm bg-teal-600/15 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold shrink-0">
												Этап {it.stageNumber}
											</span>
											<span className="font-mono text-[11px] text-[var(--tp-text-muted)] shrink-0">
												{it.code804n}
											</span>
											<span className="font-medium text-[var(--tp-text-main)] truncate">
												{it.name}
											</span>
										</div>
										<div className="font-mono font-bold text-[var(--tp-text-main)] shrink-0">
											{formatChairsidePrice(it.priceRub)}
										</div>
									</div>
								))}
							</div>
						</div>
					) : (
						<div className="py-1 text-xs text-[var(--tp-text-muted)]">
							В варианте лечения «{tier.title}» отдельные процедуры для зуба {selectedTooth} не предусмотрены.
						</div>
					)}
				</div>
			)}
		</div>
	);
};
