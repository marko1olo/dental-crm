import React from "react";
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from "lucide-react";
import type { AlternativeChairOption } from "./slotConflictMath";
import { SlotConflictSuggestedSlots } from "./SlotConflictSuggestedSlots";

export interface SlotConflictControlsProps {
	readonly conflictMessage?: string | null | undefined;
	readonly isDoctorConflict: boolean;
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly currentChairName?: string | null | undefined;
	readonly onShiftMinutes?: ((minutes: number) => void) | undefined;
	readonly shiftMinutesList: readonly number[];
	readonly alternativeChairs?: readonly AlternativeChairOption[] | undefined;
	readonly onMoveToChair?: ((chairId: string) => void) | undefined;
	readonly suggestedSlots: readonly (string | { timeDisplay?: string; label?: string; startsAt?: string; endsAt?: string })[];
	readonly onSelectSlot: (slotTime: string) => void;
	readonly onClose: () => void;
}

export const SlotConflictControls: React.FC<SlotConflictControlsProps> = ({
	conflictMessage,
	isDoctorConflict,
	patientName,
	doctorName,
	currentChairName,
	onShiftMinutes,
	shiftMinutesList,
	alternativeChairs,
	onMoveToChair,
	suggestedSlots,
	onSelectSlot,
	onClose,
}) => (
	<div className="space-y-3.5">
		<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs font-medium space-y-1">
			<p className="m-0 font-bold flex items-center gap-1.5">
				<AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
				<span>{conflictMessage || "Выбранное время уже занято другой записью."}</span>
			</p>
			<p className="m-0 text-[11px] opacity-90">
				{patientName ? `Пациент: ${patientName}. ` : ""}
				{doctorName ? `Врач: ${doctorName}. ` : ""}
				{currentChairName ? `Кресло: ${currentChairName}. ` : ""}
				Сервер зафиксировал одновременную запись на этот ресурс.
			</p>
		</div>

		{isDoctorConflict && (
			<div
				className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2 animate-fade-in"
				data-testid="doctor-double-booking-warning"
				role="alert"
			>
				<ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
				<div>
					<p className="m-0 font-bold">Врачебная коллизия (двойная занятость):</p>
					<p className="m-0 text-[11px] font-normal opacity-90">
						Врач уже ведёт приём в другом кабинете. Одновременное ведение двух инвазивных приёмов строго запрещено медицинским регламентом клиники.
					</p>
				</div>
			</div>
		)}

		{onShiftMinutes && (
			<div className="space-y-1.5" data-testid="slot-conflict-shift-section">
				<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
					<span>Сдвинуть время приёма:</span>
				</label>
				<div className="flex flex-wrap gap-1.5 pt-0.5">
					{shiftMinutesList.map((mins) => (
						<button
							key={mins}
							type="button"
							data-testid={`shift-minutes-${mins}`}
							onClick={() => { onShiftMinutes(mins); onClose(); }}
							className="secondary-button min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs touch-manipulation select-none active:scale-[0.98]"
							title={`Сдвинуть запись на +${mins} минут`}
							aria-label={`Сдвинуть время на ${mins} минут`}
						>
							<span>+{mins} мин</span>
						</button>
					))}
				</div>
			</div>
		)}

		{alternativeChairs && alternativeChairs.length > 0 && onMoveToChair && (
			<div className="space-y-1.5" data-testid="slot-conflict-alternative-chairs-section">
				<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
					<span>Свободные кресла на это время:</span>
				</label>
				<div className="flex flex-wrap gap-1.5 pt-0.5">
					{alternativeChairs.map((chair) => (
						<button
							key={chair.id}
							type="button"
							data-testid="move-to-chair-btn"
							data-chair-id={chair.id}
							onClick={() => { onMoveToChair(chair.id); onClose(); }}
							className="secondary-button min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs touch-manipulation select-none active:scale-[0.98]"
							title={`Перенести приём на ${chair.name}`}
							aria-label={`Перенести приём на кресло ${chair.name}`}
						>
							<span>{`Перенести на ${chair.name}`}</span>
						</button>
					))}
				</div>
			</div>
		)}

		<SlotConflictSuggestedSlots
			suggestedSlots={suggestedSlots}
			onSelectSlot={onSelectSlot}
			onClose={onClose}
		/>
	</div>
);
