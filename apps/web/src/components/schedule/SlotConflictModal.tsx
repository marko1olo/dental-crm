import React from "react";
import { AlertTriangle, Clock, Calendar, X, Zap, ArrowRight, ShieldAlert } from "lucide-react";
import { createPortal } from "react-dom";
import { useModalA11y } from "../../hooks/useModalA11y";

export interface AlternativeChairOption {
	id: string;
	name: string;
	roomNumber?: string;
}

/**
 * Canonical half-open interval overlap check [startA, endA) and [startB, endB).
 * Strictly mirrors backend scheduleConflictService.ts SSOT:
 * Adjacent back-to-back slots (endA === startB) do NOT collide (returns false).
 */
export function hasTimeOverlap(
	startA: Date | string | number,
	endA: Date | string | number,
	startB: Date | string | number,
	endB: Date | string | number,
): boolean {
	const sA = typeof startA === "number" ? startA : new Date(startA).getTime();
	const eA = typeof endA === "number" ? endA : new Date(endA).getTime();
	const sB = typeof startB === "number" ? startB : new Date(startB).getTime();
	const eB = typeof endB === "number" ? endB : new Date(endB).getTime();

	if (Number.isNaN(sA) || Number.isNaN(eA) || Number.isNaN(sB) || Number.isNaN(eB)) {
		return false;
	}
	return sA < eB && eA > sB;
}

/**
 * Checks if two slots are back-to-back adjacent without overlap.
 */
export function areSlotsAdjacent(
	endA: Date | string | number,
	startB: Date | string | number,
): boolean {
	const eA = typeof endA === "number" ? endA : new Date(endA).getTime();
	const sB = typeof startB === "number" ? startB : new Date(startB).getTime();
	return Math.abs(eA - sB) <= 60_000; // within 1 minute tolerance
}

export interface SlotConflictModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly conflictMessage?: string | null | undefined;
	readonly conflictType?: "chair" | "doctor" | "patient" | "double_booking" | null | undefined;
	readonly suggestedSlots?: readonly (string | { timeDisplay?: string; label?: string; startsAt?: string; endsAt?: string })[] | undefined;
	readonly onSelectSlot?: ((slotTime: string) => void) | undefined;
	readonly onOverbook?: (() => void) | undefined;
	readonly onForceSave?: (() => void) | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly conflictingDoctorName?: string | null | undefined;
	readonly conflictingPatientName?: string | null | undefined;
	readonly conflictingTimeRange?: string | null | undefined;
	readonly inline?: boolean | undefined;
	readonly onShiftMinutes?: ((minutes: number) => void) | undefined;
	readonly shiftMinutesList?: readonly number[] | undefined;
	readonly alternativeChairs?: readonly AlternativeChairOption[] | undefined;
	readonly onMoveToChair?: ((chairId: string) => void) | undefined;
	readonly currentChairName?: string | null | undefined;
}

const DEFAULT_SHIFT_MINUTES = [15, 30, 45, 60] as const;

export const SlotConflictModal: React.FC<SlotConflictModalProps> = ({
	isOpen,
	onClose,
	conflictMessage,
	conflictType,
	suggestedSlots = [],
	onSelectSlot = () => {},
	onOverbook: propOnOverbook,
	onForceSave,
	patientName: propPatientName,
	doctorName: propDoctorName,
	conflictingDoctorName,
	conflictingPatientName,
	conflictingTimeRange: _conflictingTimeRange,
	inline = false,
	onShiftMinutes,
	shiftMinutesList = DEFAULT_SHIFT_MINUTES,
	alternativeChairs,
	onMoveToChair,
	currentChairName,
}) => {
	const patientName = propPatientName || conflictingPatientName;
	const doctorName = propDoctorName || conflictingDoctorName;
	const onOverbook = propOnOverbook || onForceSave;
	const { modalRef } = useModalA11y<HTMLDivElement>({
		isOpen: isOpen && !inline,
		onClose,
		initialFocusSelector: "[data-autofocus='true'], button[data-slot-btn='true']",
		enableEscape: true,
		enableFocusTrap: !inline,
	});

	if (!isOpen) return null;

	const isDoctorConflict =
		conflictType === "doctor" ||
		conflictType === "double_booking" ||
		/врач|доктор|одновремен|двойная запись/i.test(conflictMessage || "");

	const isChairConflict =
		conflictType === "chair" ||
		/кресло|кабинет/i.test(conflictMessage || "");

	// Reusable conflict resolution sections
	const renderResolutionControls = () => (
		<div className="space-y-3.5">
			{/* Conflict Summary Card */}
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

			{/* Doctor Double-Booking Strict Clinical Warning */}
			{isDoctorConflict && (
				<div
					className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-start gap-2 animate-fade-in"
					data-testid="doctor-double-booking-warning"
					role="alert"
				>
					<ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
					<div>
						<p className="m-0 font-bold">
							Врачебная коллизия (двойная занятость):
						</p>
						<p className="m-0 text-[11px] font-normal opacity-90">
							Врач уже ведёт приём в другом кабинете. Одновременное ведение двух инвазивных приёмов строго запрещено медицинским регламентом клиники.
						</p>
					</div>
				</div>
			)}

			{/* Option 1: Quick Time Shift (+15, +30, +45, +60 min) */}
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
								onClick={() => {
									onShiftMinutes(mins);
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs touch-manipulation select-none active:scale-[0.98]"
								title={`Сдвинуть запись на +${mins} минут`}
								aria-label={`Сдвинуть время на ${mins} минут`}
							>
								<span>+{mins} мин</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Option 2: Move to Alternative Free Chair */}
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
								onClick={() => {
									onMoveToChair(chair.id);
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs touch-manipulation select-none active:scale-[0.98]"
								title={`Перенести приём на ${chair.name}`}
								aria-label={`Перенести приём на кресло ${chair.name}`}
							>
								<span>{`Перенести на ${chair.name}`}</span>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Option 3: Choose Suggested Doctor Free Slot */}
			<div className="space-y-1.5" data-testid="slot-conflict-suggested-slots-section">
				<label className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Calendar className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary,#0d9488))]" />
					<span>Выбрать другое свободное окно:</span>
				</label>

				{suggestedSlots && suggestedSlots.length > 0 ? (
					<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
						{suggestedSlots.map((rawSlot, idx) => {
							const slotLabel =
								typeof rawSlot === "string"
									? rawSlot
									: rawSlot?.timeDisplay || rawSlot?.label || "Свободное окно";
							const slotValue =
								typeof rawSlot === "string"
									? rawSlot
									: rawSlot?.timeDisplay ||
										(rawSlot?.startsAt ? new Date(rawSlot.startsAt).toISOString().slice(11, 16) : "") ||
										rawSlot?.label ||
										"";
							const key =
								typeof rawSlot === "string"
									? rawSlot
									: rawSlot?.startsAt || rawSlot?.timeDisplay || `slot-${idx}`;
							return (
								<button
									key={key}
									type="button"
									data-slot-btn="true"
									data-testid="suggested-slot-btn"
									data-autofocus={idx === 0 ? "true" : undefined}
									onClick={() => {
										onSelectSlot(slotValue);
										onClose();
									}}
									className="min-h-[44px] sm:min-h-[38px] px-3 py-2 rounded-xl border border-[var(--teal,var(--brand-primary,#0d9488))]/40 bg-[var(--teal-soft,var(--paper-soft,#f0fdfa))] hover:bg-[var(--teal,var(--brand-primary,#0d9488))] hover:text-white text-[var(--teal-dark,var(--teal,#0d9488))] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs group touch-manipulation select-none active:scale-[0.98]"
									title={`Записать на ${slotLabel}`}
									aria-label={`Выбрать альтернативное время ${slotLabel}`}
								>
									<Calendar className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
									<span>{slotLabel}</span>
								</button>
							);
						})}
					</div>
				) : (
					<p className="text-xs text-[var(--muted,#64748b)] italic">
						Ближайшие окна не найдены. Выберите время вручную в сетке расписания.
					</p>
				)}
			</div>
		</div>
	);

	if (inline) {
		return (
			<div
				className="w-full bg-[var(--paper,#ffffff)] border-2 border-amber-500/50 rounded-2xl shadow-md text-[var(--ink,#0f172a)] flex flex-col overflow-hidden animate-fade-in"
				data-testid="slot-conflict-modal"
				role="region"
				aria-label="Конфликт времени записи"
			>
				{/* Header */}
				<div className="p-3 sm:p-4 border-b border-[var(--line,#e2e8f0)] bg-amber-500/15 flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0">
							<AlertTriangle className="w-4 h-4" />
						</div>
						<div>
							<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
								{isDoctorConflict
									? "Врач занят в это время"
									: isChairConflict
										? "Кресло занято в это время"
										: "Выбранное время уже занято"}
							</h4>
							<p className="text-[11px] text-[var(--muted,#64748b)] m-0">
								Сдвиньте время, перенесите на свободное кресло или запишите внахлёст (острая боль)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[36px] min-w-[36px] rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть предупреждение"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Body */}
				<div className="p-3 sm:p-4">
					{renderResolutionControls()}
				</div>

				{/* Footer */}
				<div className="p-3 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-2">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[40px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold transition-colors cursor-pointer"
					>
						Закрыть
					</button>

					{onOverbook && (
						<button
							type="button"
							data-testid="slot-conflict-overbook-btn"
							onClick={() => {
								onOverbook();
								onClose();
							}}
							className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
							title="Записать в это же время (совмещение слотов для острой боли)"
						>
							<Zap className="w-4 h-4" />
							<span>Записать всё равно (острая боль)</span>
						</button>
					)}
				</div>
			</div>
		);
	}

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
			data-testid="slot-conflict-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Конфликт времени записи"
		>
			<button
				type="button"
				className="absolute inset-0 cursor-default bg-transparent border-0"
				onClick={onClose}
				aria-label="Закрыть окно коллизии"
			/>

			<div
				ref={modalRef}
				className="relative w-full max-w-lg bg-[var(--paper,#ffffff)] border border-[var(--line-strong,#cbd5e1)] rounded-2xl shadow-2xl z-10 text-[var(--ink,#0f172a)] flex flex-col overflow-hidden animate-scale-in"
			>
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] bg-amber-500/10 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
							<AlertTriangle className="w-5 h-5" />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
								{isDoctorConflict
									? "Врач занят в это время"
									: isChairConflict
										? "Кресло занято в это время"
										: "Выбранное время уже занято"}
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Сдвиньте время, перенесите на свободное кресло или запишите внахлёст (острая боль)
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body */}
				<div className="p-5 sm:p-6">
					{renderResolutionControls()}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<span className="text-[11px] text-[var(--muted,#64748b)] hidden sm:inline">
							Выберите действие для быстрого разрешения
						</span>
					</div>

					{onOverbook && (
						<button
							type="button"
							data-testid="slot-conflict-overbook-btn"
							onClick={() => {
								onOverbook();
								onClose();
							}}
							className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
							title="Записать в это же время (совмещение слотов для острой боли)"
						>
							<Zap className="w-4 h-4" />
							<span>Записать всё равно (острая боль)</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
