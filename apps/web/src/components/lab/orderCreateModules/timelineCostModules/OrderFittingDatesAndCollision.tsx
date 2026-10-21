import React from "react";
import { AlertTriangle } from "lucide-react";
import { formatRuDate } from "../../dentalLabOrderEngine";
import { ORTHOPEDIC_WORK_TYPES, type OrthopedicWorkTypeId } from "../../dentalLabWorkflowEngine";

export interface OrderFittingDatesAndCollisionProps {
	workType: OrthopedicWorkTypeId;
	expectedLabDate: string;
	onExpectedLabDateChange: (date: string) => void;
	fittingDate: string;
	onFittingDateChange: (date: string) => void;
	hasCollision: boolean;
	collisionWarningRu?: string | null | undefined;
	autoBookFitting: boolean;
	onAutoBookFittingChange: (val: boolean) => void;
}

export function OrderFittingDatesAndCollision({
	workType, expectedLabDate, onExpectedLabDateChange, fittingDate, onFittingDateChange,
	hasCollision, collisionWarningRu, autoBookFitting, onAutoBookFittingChange,
}: OrderFittingDatesAndCollisionProps): React.JSX.Element {
	const workPreset = ORTHOPEDIC_WORK_TYPES[workType];

	return (
		<>
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

			<div className="ztl-form-grid-2">
				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="input-expected-lab-date">
						План готовности из ЗТЛ *
					</label>
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

				<div className="ztl-form-group">
					<label className="ztl-form-label" htmlFor="input-fitting-date">
						Дата примерки в расписании *
					</label>
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
		</>
	);
}
