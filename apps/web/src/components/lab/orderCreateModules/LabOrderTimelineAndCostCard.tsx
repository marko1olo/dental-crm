/**
 * LabOrderTimelineAndCostCard.tsx — Карточка дедлайнов ЗТЛ, примерки в расписании и финансового расчета.
 * 
 * Врачебные инварианты:
 * 1. Расчет дедлайна готовности в ЗТЛ и авто-бронирование визита примерки в расписании врача.
 * 2. Детектор коллизии: предупреждение, если дата примерки назначена раньше готовности работы.
 * 3. Прозрачный расчет стоимости, себестоимости и технологического этапа (1..8).
 */

import React from "react";
import { AlertTriangle, Calendar, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import {
	type LabWorkflowStatus,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
	type OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
} from "../dentalLabWorkflowEngine";
import {
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	type LabTechnologicalStageId,
} from "../orders/labWorkOrderPresets";
import { formatRuDate } from "../dentalLabOrderEngine";

export interface LabOrderTimelineAndCostCardProps {
	readonly workType: OrthopedicWorkTypeId;
	readonly expectedLabDate: string;
	readonly onExpectedLabDateChange: (date: string) => void;
	readonly fittingDate: string;
	readonly onFittingDateChange: (date: string) => void;
	readonly hasCollision: boolean;
	readonly collisionWarningRu?: string | null | undefined;
	readonly autoBookFitting: boolean;
	readonly onAutoBookFittingChange: (val: boolean) => void;
	readonly techStage: LabTechnologicalStageId;
	readonly onTechStageChange: (stage: LabTechnologicalStageId) => void;
	readonly initialStatus: LabWorkflowStatus;
	readonly onInitialStatusChange: (status: LabWorkflowStatus) => void;
	readonly priceRub: number;
	readonly onPriceRubChange: (price: number) => void;
	readonly costRub: number;
	readonly onCostRubChange: (cost: number) => void;
	readonly toothCount: number;
}

export const LabOrderTimelineAndCostCard: React.FC<LabOrderTimelineAndCostCardProps> = ({
	workType,
	expectedLabDate,
	onExpectedLabDateChange,
	fittingDate,
	onFittingDateChange,
	hasCollision,
	collisionWarningRu,
	autoBookFitting,
	onAutoBookFittingChange,
	techStage,
	onTechStageChange,
	initialStatus,
	onInitialStatusChange,
	priceRub,
	onPriceRubChange,
	costRub,
	onCostRubChange,
	toothCount,
}) => {
	const count = Math.max(1, toothCount);
	const totalPrice = priceRub * count;
	const totalCost = costRub * count;
	const marginRub = totalPrice - totalCost;
	const marginPct = totalPrice > 0 ? Math.round((marginRub / totalPrice) * 100) : 0;
	const workPreset = ORTHOPEDIC_WORK_TYPES[workType];

	return (
		<div className="space-y-3.5">
			{/* Алерт коллизии сроков примерки */}
			{hasCollision && (
				<div
					className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-400/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shadow-xs"
					role="alert"
					data-testid="ztl-create-order-collision-banner"
				>
					<AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div>
						<strong className="block font-semibold">
							Внимание: визит на примерку назначен раньше или в день готовности ЗТЛ!
						</strong>
						<span className="text-[11px] opacity-90">{collisionWarningRu}</span>
					</div>
				</div>
			)}

			{/* Сроки ЗТЛ и примерки */}
			<div className="ztl-form-grid-2">
				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="input-expected-lab-date">
						План готовности из ЗТЛ *
					</label>
					<div className="relative">
						<input
							id="input-expected-lab-date"
							type="date"
							className="ztl-form-input w-full"
							value={expectedLabDate}
							onChange={(e) => onExpectedLabDateChange(e.target.value)}
							required
							data-testid="input-expected-lab-date"
						/>
					</div>
				</div>

				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="input-fitting-date">
						Дата примерки в расписании *
					</label>
					<div className="relative">
						<input
							id="input-fitting-date"
							type="date"
							className="ztl-form-input w-full"
							value={fittingDate}
							onChange={(e) => onFittingDateChange(e.target.value)}
							required
							data-testid="input-fitting-date"
						/>
					</div>
				</div>
			</div>

			{/* Чекбокс 1-Click автобронирования слота примерки */}
			<div
				className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 text-xs flex flex-col gap-1.5"
				data-testid="ztl-auto-book-fitting-wrap"
			>
				<label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
					<input
						type="checkbox"
						checked={autoBookFitting}
						onChange={(e) => onAutoBookFittingChange(e.target.checked)}
						className="w-4 h-4 accent-teal-600 cursor-pointer rounded"
						data-testid="ztl-auto-book-fitting-checkbox"
					/>
					<span>Автоматически забронировать визит на примерку в расписании врача</span>
				</label>
				{autoBookFitting && (
					<p className="ml-6 text-[11px] text-[var(--muted,#64748b)] dark:text-slate-300">
						Слот на примерку: <strong>{formatRuDate(fittingDate)}</strong> · Длительность: <strong>45 мин</strong> · Процедура: <em>Примерка и фиксация ({workPreset?.shortNameRu || "ортопедия"})</em>
					</p>
				)}
			</div>

			{/* Технологический этап ЗТЛ и начальный статус */}
			<div className="ztl-form-grid-2">
				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-tech-stage">
						Первичный технологический этап ЗТЛ (1..8)
					</label>
					<select
						id="select-tech-stage"
						className="ztl-select w-full"
						value={techStage}
						onChange={(e) => onTechStageChange(e.target.value as LabTechnologicalStageId)}
						data-testid="select-tech-stage"
					>
						{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
							const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
							return (
								<option key={stageKey} value={stageKey}>
									Этап {sDef.stepNumber}: {sDef.nameRu} ({sDef.departmentRu})
								</option>
							);
						})}
					</select>
				</div>

				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="select-initial-status">
						Начальный статус заказа
					</label>
					<select
						id="select-initial-status"
						className="ztl-select w-full"
						value={initialStatus}
						onChange={(e) => onInitialStatusChange(e.target.value as LabWorkflowStatus)}
						data-testid="select-initial-status"
					>
						{LAB_WORKFLOW_STATUS_ORDER.map((st) => (
							<option key={st} value={st}>
								{LAB_WORKFLOW_STATUSES[st].nameRu}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Финансовый расчет: себестоимость ЗТЛ и цена для пациента */}
			<div className="p-3 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/60 space-y-2">
				<div className="text-[11px] font-semibold text-[var(--ink,#1e293b)] dark:text-slate-200 flex items-center justify-between">
					<span>Финансовый расчет наряда {count > 1 ? `(${count} ед.)` : ""}</span>
					<span className="text-teal-600 dark:text-teal-400 font-bold">
						Маржа: {marginRub.toLocaleString("ru-RU")} ₽ ({marginPct}%)
					</span>
				</div>

				<div className="ztl-form-grid-2">
					<div className="ztl-form-group mb-0">
						<label className="ztl-form-label text-[11px]" htmlFor="input-price-rub">
							Стоимость за ед. для пациента (₽)
						</label>
						<input
							id="input-price-rub"
							type="number"
							min={0}
							step={100}
							className="ztl-form-input w-full"
							value={priceRub}
							onChange={(e) => onPriceRubChange(Math.max(0, Number(e.target.value)))}
							data-testid="input-price-rub"
						/>
					</div>

					<div className="ztl-form-group mb-0">
						<label className="ztl-form-label text-[11px]" htmlFor="input-cost-rub">
							Себестоимость ЗТЛ за ед. (₽)
						</label>
						<input
							id="input-cost-rub"
							type="number"
							min={0}
							step={100}
							className="ztl-form-input w-full"
							value={costRub}
							onChange={(e) => onCostRubChange(Math.max(0, Number(e.target.value)))}
							data-testid="input-cost-rub"
						/>
					</div>
				</div>

				{count > 1 && (
					<div className="pt-2 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 flex justify-between">
						<span>Итого с пациента: <strong>{totalPrice.toLocaleString("ru-RU")} ₽</strong></span>
						<span>Оплата в ЗТЛ: <strong>{totalCost.toLocaleString("ru-RU")} ₽</strong></span>
					</div>
				)}
			</div>
		</div>
	);
};
