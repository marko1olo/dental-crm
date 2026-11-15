/**
 * @dental/web/components/orthodontics/OrthodonticTimeline.tsx
 *
 * DENTE Dental CRM — Канонический таймлайн этапов ортодонтического лечения (Мандаты 8b, 8e, 8am).
 * Прозрачный график активаций дуг, смены лигатур, ношения эластиков и контрольных визитов.
 */

import React from "react";
import { Check, Clock, Calendar, Activity, ChevronRight } from "lucide-react";

export interface OrthodonticTimelineStage {
	readonly month: number;
	readonly title: string;
	readonly archwireSummary: string;
	readonly elasticsSummary?: string;
	readonly isCompleted: boolean;
	readonly isCurrent: boolean;
	readonly plannedDate?: string;
}

export interface OrthodonticTimelineProps {
	readonly currentMonth: number;
	readonly totalMonths: number;
	readonly stages?: readonly OrthodonticTimelineStage[] | undefined;
	readonly applianceCategory?: ("brackets" | "aligners" | "plate") | undefined;
	readonly startDate?: string | undefined;
	readonly onSelectMonth?: ((month: number) => void) | undefined;
}

function formatPlannedStageDate(startDateIso: string | undefined, monthOffset: number): string {
	const base = startDateIso ? new Date(startDateIso) : new Date();
	const validBase = isNaN(base.getTime()) ? new Date() : base;
	const target = new Date(validBase);
	target.setMonth(target.getMonth() + monthOffset);

	return new Intl.DateTimeFormat("ru-RU", {
		month: "short",
		year: "numeric",
	}).format(target);
}

export const OrthodonticTimeline: React.FC<OrthodonticTimelineProps> = ({
	currentMonth,
	totalMonths,
	stages,
	applianceCategory = "brackets",
	startDate,
	onSelectMonth,
}) => {
	const defaultStages: readonly OrthodonticTimelineStage[] = React.useMemo(() => {
		if (stages && stages.length > 0) return stages;

		if (applianceCategory === "aligners") {
			return [
				{
					month: 1,
					title: "Диагностика, 3D-сетап и фиксация аттачментов",
					archwireSummary: "Каппы серии 1 (шаги 1–4, 22 ч/сутки)",
					isCompleted: currentMonth > 1,
					isCurrent: currentMonth === 1,
					plannedDate: formatPlannedStageDate(startDate, 0),
				},
				{
					month: 3,
					title: "Контроль трекинга и выдача партии 2",
					archwireSummary: "Каппы серии 2 (шаги 5–8, смена раз в 14 дней)",
					isCompleted: currentMonth > 3,
					isCurrent: currentMonth === 3,
					plannedDate: formatPlannedStageDate(startDate, 2),
				},
				{
					month: 6,
					title: "Сепарация (IPR) и партия 3",
					archwireSummary: "Каппы серии 3 (шаги 9–14, контроль смыкания)",
					elasticsSummary: "Тяги по показаниям",
					isCompleted: currentMonth > 6,
					isCurrent: currentMonth === 6,
					plannedDate: formatPlannedStageDate(startDate, 5),
				},
				{
					month: 10,
					title: "Финишная юстировка контактов",
					archwireSummary: "Каппы серии 4 (шаги 15–20, детализация)",
					isCompleted: currentMonth > 10,
					isCurrent: currentMonth === 10,
					plannedDate: formatPlannedStageDate(startDate, 9),
				},
				{
					month: Math.max(12, totalMonths),
					title: "Снятие аттачментов и ретенция",
					archwireSummary: "Ретенционные каппы на ночь + несъемный ретейнер",
					isCompleted: currentMonth >= totalMonths,
					isCurrent: currentMonth === totalMonths,
					plannedDate: formatPlannedStageDate(startDate, Math.max(1, totalMonths - 1)),
				},
			];
		}

		if (applianceCategory === "plate") {
			return [
				{
					month: 1,
					title: "Припасовка пластинки и активация винта",
					archwireSummary: "Съемный аппарат с винтом (1/4 оборота в 5–7 дней)",
					isCompleted: currentMonth > 1,
					isCurrent: currentMonth === 1,
					plannedDate: formatPlannedStageDate(startDate, 0),
				},
				{
					month: 2,
					title: "Контроль трансверзального расширения",
					archwireSummary: "Контроль прилегания базиса и окклюзионных накладок",
					isCompleted: currentMonth > 2,
					isCurrent: currentMonth === 2,
					plannedDate: formatPlannedStageDate(startDate, 1),
				},
				{
					month: 4,
					title: "Коррекция вестибулярной дуги",
					archwireSummary: "Активация кламмеров и пружин аппарата",
					isCompleted: currentMonth > 4,
					isCurrent: currentMonth === 4,
					plannedDate: formatPlannedStageDate(startDate, 3),
				},
				{
					month: 6,
					title: "Стабилизация ширины зубных рядов",
					archwireSummary: "Фиксация расширяющего винта композитом",
					isCompleted: currentMonth > 6,
					isCurrent: currentMonth === 6,
					plannedDate: formatPlannedStageDate(startDate, 5),
				},
				{
					month: Math.max(8, totalMonths),
					title: "Ретенционный период аппарата",
					archwireSummary: "Ночное ношение пластинки для закрепления результата",
					isCompleted: currentMonth >= totalMonths,
					isCurrent: currentMonth === totalMonths,
					plannedDate: formatPlannedStageDate(startDate, Math.max(1, totalMonths - 1)),
				},
			];
		}

		// Брекет-система (по умолчанию): динамический расчет этапов от даты начала лечения
		return [
			{
				month: 1,
				title: "Нивелирование и выравнивание",
				archwireSummary: "NiTi .014 (ВЧ + НЧ)",
				isCompleted: currentMonth > 1,
				isCurrent: currentMonth === 1,
				plannedDate: formatPlannedStageDate(startDate, 0),
			},
			{
				month: 2,
				title: "Круглые термоактивные дуги",
				archwireSummary: "CuNiTi .016 (ВЧ + НЧ)",
				isCompleted: currentMonth > 2,
				isCurrent: currentMonth === 2,
				plannedDate: formatPlannedStageDate(startDate, 1),
			},
			{
				month: 4,
				title: "Переход на прямоугольные дуги",
				archwireSummary: "CuNiTi 16×22 (ВЧ + НЧ)",
				elasticsSummary: "Класс II (Fox 3.5 oz)",
				isCompleted: currentMonth > 4,
				isCurrent: currentMonth === 4,
				plannedDate: formatPlannedStageDate(startDate, 3),
			},
			{
				month: 8,
				title: "Стальные дуги и закрытие промежутков",
				archwireSummary: "Сталь SS 19×25 + цепочка",
				isCompleted: currentMonth > 8,
				isCurrent: currentMonth === 8,
				plannedDate: formatPlannedStageDate(startDate, 7),
			},
			{
				month: 14,
				title: "Юстировка и детализация окклюзии",
				archwireSummary: "TMA 19×25 изгибы I–III порядка",
				elasticsSummary: "Коробочные тяги",
				isCompleted: currentMonth > 14,
				isCurrent: currentMonth === 14,
				plannedDate: formatPlannedStageDate(startDate, 13),
			},
			{
				month: Math.max(16, totalMonths),
				title: "Снятие аппаратуры и ретенция",
				archwireSummary: "Нереверсивный ретейнер 33–43 + капы",
				isCompleted: currentMonth >= totalMonths,
				isCurrent: currentMonth === totalMonths,
				plannedDate: formatPlannedStageDate(startDate, Math.max(1, totalMonths - 1)),
			},
		];
	}, [stages, applianceCategory, startDate, currentMonth, totalMonths]);

	return (
		<div className="ortho-card" data-testid="orthodontic-timeline">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Calendar className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<h4 className="text-sm font-bold text-[var(--ink)]">
						Клинический план активаций ({currentMonth} из {totalMonths} мес.)
					</h4>
				</div>
				<span className="text-xs text-[var(--ink-muted)]">
					Курс ~{Math.round((totalMonths / 12) * 10) / 10} года
				</span>
			</div>

			<div className="flex flex-col gap-2 pt-1">
				{defaultStages.map((stage) => {
					const isDone = stage.isCompleted;
					const isNow = stage.isCurrent;

					return (
						<div
							key={stage.month}
							onClick={() => onSelectMonth && onSelectMonth(stage.month)}
							className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs transition-all ${
								isNow
									? "bg-[var(--teal-subtle,rgba(13,148,136,0.12))] border-[var(--teal,#0d9488)] shadow-sm"
									: isDone
									? "bg-[var(--paper-strong)] border-[var(--line)] opacity-80"
									: "bg-[var(--paper)] border-[var(--line)] opacity-60"
							} ${onSelectMonth ? "cursor-pointer hover:border-[var(--teal,#0d9488)]" : ""}`}
						>
							<div className="flex items-center gap-2.5 min-w-0">
								<div
									className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
										isDone
											? "bg-[var(--teal,#0d9488)] text-white"
											: isNow
											? "border-2 border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper-strong)]"
											: "border border-[var(--line)] text-[var(--ink-muted)] bg-[var(--paper-strong)]"
									}`}
								>
									{isDone ? <Check className="w-3.5 h-3.5" /> : stage.month}
								</div>

								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className={`font-semibold truncate ${isNow ? "text-[var(--teal,#0d9488)] font-bold" : "text-[var(--ink)]"}`}>
											Месяц {stage.month}: {stage.title}
										</span>
										{isNow && (
											<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--teal,#0d9488)] text-white font-bold">
												Текущий
											</span>
										)}
									</div>
									<div className="text-[11px] text-[var(--ink-muted)] flex items-center gap-2 flex-wrap">
										{stage.plannedDate && (
											<span className="font-medium text-[var(--ink)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line)]">
												{stage.plannedDate}
											</span>
										)}
										<span>{stage.archwireSummary}</span>
										{stage.elasticsSummary && (
											<span className="text-[var(--teal,#0d9488)] font-medium">· {stage.elasticsSummary}</span>
										)}
									</div>
								</div>
							</div>

							<div className="shrink-0 flex items-center text-[var(--ink-muted)]">
								{isDone ? (
									<span className="text-[10px] font-medium text-[var(--teal,#0d9488)]">Выполнено</span>
								) : isNow ? (
									<span className="text-[10px] font-bold text-[var(--teal,#0d9488)] flex items-center gap-1">
										<Activity className="w-3 h-3" /> Приём
									</span>
								) : (
									<span className="text-[10px] text-[var(--ink-muted)] flex items-center gap-1">
										<Clock className="w-3 h-3" /> План
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default OrthodonticTimeline;
