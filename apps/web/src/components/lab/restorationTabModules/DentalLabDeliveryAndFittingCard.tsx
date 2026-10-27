import React from "react";
import { Calendar, Truck, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { addWorkingDays } from "../labMath";
import { formatRuDate, checkFittingAppointmentCollision } from "../dentalLabOrderEngine";

export interface DentalLabDeliveryAndFittingCardProps {
	dueDate: string;
	setDueDate: (date: string) => void;
	fittingDate?: string | undefined;
	setFittingDate?: ((date: string) => void) | undefined;
	labType: "in_house" | "external";
	courierDays: number;
	scheduledVisitDate?: string | undefined;
}

export function DentalLabDeliveryAndFittingCard({
	dueDate,
	setDueDate,
	fittingDate,
	setFittingDate,
	labType,
	courierDays,
	scheduledVisitDate,
}: DentalLabDeliveryAndFittingCardProps) {
	const collision = checkFittingAppointmentCollision(dueDate, scheduledVisitDate);
	const calculatedFitting = dueDate
		? addWorkingDays(new Date(dueDate), 1).toISOString().slice(0, 10)
		: "";
	const effectiveFittingDate = fittingDate || calculatedFitting;

	return (
		<div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3" data-testid="delivery-and-fitting-card">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
					<label className="text-xs font-bold text-[var(--ink)]">
						4. Срок сдачи и резервирование примерки:
					</label>
				</div>
				<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 flex items-center gap-1">
					<Clock className="w-3.5 h-3.5" />
					<span>Авто-резерв слота (Мандат 8n)</span>
				</span>
			</div>

			{collision.hasCollision && (
				<div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2">
					<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
					<div>
						<div className="font-bold">Внимание: визит в расписании назначен раньше готовности!</div>
						<div className="text-[11px]">{collision.warningRu}</div>
					</div>
				</div>
			)}

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<div className="flex items-center justify-between text-xs text-[var(--muted)]">
						<span className="flex items-center gap-1">
							<Truck className="w-3.5 h-3.5" />
							<span>Готовность изделия:</span>
						</span>
						<span className="font-semibold">
							{labType === "in_house" ? "Своя (0 дн. курьера)" : `Курьер +${courierDays} дн.`}
						</span>
					</div>
					<input
						type="date"
						value={dueDate}
						onChange={(e) => {
							setDueDate(e.target.value);
							if (setFittingDate && e.target.value) {
								setFittingDate(addWorkingDays(new Date(e.target.value), 1).toISOString().slice(0, 10));
							}
						}}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-teal-500"
						data-testid="lab-order-due-date-input"
					/>
				</div>

				<div className="p-2.5 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-1">
					<div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-200">
						<span className="flex items-center gap-1 font-bold">
							<CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
							<span>Слот примерки в расписании:</span>
						</span>
						<span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">Следующий раб. день</span>
					</div>
					<div className="h-9 px-2.5 rounded-lg bg-[var(--paper)] border border-teal-500/30 flex items-center justify-between text-xs font-bold text-[var(--ink)]">
						<span>{effectiveFittingDate ? formatRuDate(effectiveFittingDate) : "—"}</span>
						<span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md">
							Автобронь
						</span>
					</div>
				</div>
			</div>

			<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-900 dark:text-teal-100 flex items-center gap-2">
				<CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
				<span className="text-[11px] leading-tight">
					Слот клинической примерки и фиксации будет автоматически зарезервирован в расписании врача на{" "}
					<strong>{effectiveFittingDate ? formatRuDate(effectiveFittingDate) : "следующий рабочий день"}</strong> без ручных действий.
				</span>
			</div>
		</div>
	);
}

export default DentalLabDeliveryAndFittingCard;
