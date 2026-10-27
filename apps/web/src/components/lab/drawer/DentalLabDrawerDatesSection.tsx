import React from "react";
import { Calendar, AlertTriangle } from "lucide-react";
import type { DentalLabOrderStatus } from "../dentalLabDefinitions";
import type { FittingCollisionGuardResult } from "../dentalLabOrderEngine";

export interface DentalLabDrawerDatesSectionProps {
	readonly formSentDate: string;
	readonly setFormSentDate: (d: string) => void;
	readonly formDeadlineDate: string;
	readonly setFormDeadlineDate: (d: string) => void;
	readonly formScheduledVisit: string;
	readonly setFormScheduledVisit: (d: string) => void;
	readonly formStatus: DentalLabOrderStatus;
	readonly setFormStatus: (st: DentalLabOrderStatus) => void;
	readonly collision: FittingCollisionGuardResult;
	readonly onSetWorkingDays: (days: number) => void;
	readonly onAutoBookFitting: () => void;
}

export const DentalLabDrawerDatesSection: React.FC<DentalLabDrawerDatesSectionProps> = ({
	formSentDate, setFormSentDate, formDeadlineDate, setFormDeadlineDate,
	formScheduledVisit, setFormScheduledVisit, formStatus, setFormStatus,
	collision, onSetWorkingDays, onAutoBookFitting,
}) => {
	return (
		<div className="space-y-2">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<div>
					<label className="font-semibold block mb-1">Отправка:</label>
					<input
						type="date" required value={formSentDate} onChange={(e) => setFormSentDate(e.target.value)}
						className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
					/>
				</div>
				<div>
					<label className="font-semibold block mb-1 text-teal-800 dark:text-teal-200">Срок готовности:</label>
					<input
						type="date" required value={formDeadlineDate} onChange={(e) => setFormDeadlineDate(e.target.value)}
						className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-teal-700 dark:text-teal-300"
						data-testid="form-deadline-input"
					/>
				</div>
				<div>
					<label className="font-semibold block mb-1 text-amber-800 dark:text-amber-200">Примерка:</label>
					<input
						type="date" value={formScheduledVisit} onChange={(e) => setFormScheduledVisit(e.target.value)}
						className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-amber-700 dark:text-amber-300"
						data-testid="form-scheduled-visit-input"
					/>
				</div>
			</div>

			<div className="flex items-center justify-between gap-1 flex-wrap">
				<div className="flex items-center gap-1 flex-wrap">
					<span className="text-[10px] text-[var(--muted,#64748b)]">Срок:</span>
					{[{ label: "+3 раб. дн.", days: 3 }, { label: "+5 раб. дн.", days: 5 }, { label: "+7 раб. дн.", days: 7 }, { label: "+10 раб. дн.", days: 10 }].map((btn) => (
						<button
							key={btn.days} type="button" onClick={() => onSetWorkingDays(btn.days)}
							className="min-h-[28px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] hover:border-[var(--teal)] text-[11px] font-bold shadow-2xs transition"
						>
							{btn.label}
						</button>
					))}
				</div>
				<button
					type="button" onClick={onAutoBookFitting}
					className="min-h-[28px] px-2.5 py-0.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition"
					data-testid="btn-auto-schedule-fitting"
				>
					<Calendar size={12} /><span>Визит (+1 раб. день)</span>
				</button>
			</div>

			{collision.hasCollision && (
				<div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-100 flex items-start justify-between gap-2 text-xs" data-testid="drawer-fitting-collision-alert">
					<div className="flex items-start gap-1.5 min-w-0">
						<AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
						<div className="min-w-0">
							<div className="font-bold leading-tight">Приём назначен раньше готовности лаборатории!</div>
							<div className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-0.5 truncate">{collision.warningRu}</div>
						</div>
					</div>
					<button type="button" onClick={onAutoBookFitting} className="dente-btn-pill text-[11px] font-bold shrink-0 cursor-pointer">
						Сдвинуть визит
					</button>
				</div>
			)}

			<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-1.5">
				<label className="font-semibold block text-xs">Статус наряда (5 канонических этапов):</label>
				<select
					value={formStatus} onChange={(e) => setFormStatus(e.target.value as DentalLabOrderStatus)}
					className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold focus:ring-1 focus:ring-teal-500"
					data-testid="form-status-select"
				>
					<option value="draft">Черновик</option>
					<option value="sent_to_lab">Отправлен технику</option>
					<option value="in_progress">В работе у техника</option>
					<option value="ready_in_clinic">Поступил в клинику (Готов к примерке)</option>
					<option value="delivered_to_patient">Сдан пациенту</option>
				</select>
			</div>
		</div>
	);
};
