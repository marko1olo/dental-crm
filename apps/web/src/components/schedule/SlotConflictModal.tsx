import React from "react";
import { AlertTriangle, Clock, Calendar, X, Zap } from "lucide-react";
import { createPortal } from "react-dom";
import { useModalA11y } from "../../hooks/useModalA11y";

export interface SlotConflictModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly conflictMessage?: string | null | undefined;
	readonly suggestedSlots: readonly string[];
	readonly onSelectSlot: (slotTime: string) => void;
	readonly onOverbook?: (() => void) | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
}

export const SlotConflictModal: React.FC<SlotConflictModalProps> = ({
	isOpen,
	onClose,
	conflictMessage,
	suggestedSlots,
	onSelectSlot,
	onOverbook,
	patientName,
	doctorName,
}) => {
	const { modalRef } = useModalA11y<HTMLDivElement>({
		isOpen,
		onClose,
		initialFocusSelector: "[data-autofocus='true'], button[data-slot-btn='true']",
		enableEscape: true,
		enableFocusTrap: true,
	});

	if (!isOpen) return null;

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
								Слот уже занят (HTTP 409)
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								Коллизия записи в расписании
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
				<div className="p-5 sm:p-6 space-y-4">
					<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium space-y-1">
						<p className="m-0 font-bold">
							⛔ {conflictMessage || "Выбранное время уже занято другой записью."}
						</p>
						<p className="m-0 text-xs opacity-90">
							{patientName ? `Пациент: ${patientName}. ` : ""}
							{doctorName ? `Врач: ${doctorName}. ` : ""}
							Сервер зафиксировал одновременную запись на это время.
						</p>
					</div>

					<div className="space-y-2">
						<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
							<Clock className="w-4 h-4 text-[var(--teal,var(--brand-primary,#0d9488))]" />
							<span>Предложенные свободные окна у врача:</span>
						</label>

						{suggestedSlots && suggestedSlots.length > 0 ? (
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
								{suggestedSlots.map((slot, idx) => (
									<button
										key={slot}
										type="button"
										data-slot-btn="true"
										data-autofocus={idx === 0 ? "true" : undefined}
										onClick={() => {
											onSelectSlot(slot);
											onClose();
										}}
										className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--teal,var(--brand-primary,#0d9488))]/40 bg-[var(--teal-soft,var(--paper-soft,#f0fdfa))] hover:bg-[var(--teal,var(--brand-primary,#0d9488))] hover:text-white text-[var(--teal-dark,var(--teal,#0d9488))] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs group"
										title={`Записать на ${slot}`}
										aria-label={`Выбрать альтернативное время ${slot}`}
									>
										<Calendar className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
										<span>{slot}</span>
									</button>
								))}
							</div>
						) : (
							<p className="text-xs text-[var(--muted,#64748b)] italic">
								Ближайшие окна не найдены. Выберите время вручную в сетке расписания.
							</p>
						)}
					</div>
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
							Нажмите на слот для быстрого выбора
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
							title="Записать в это же время в режиме овербукинга для острой боли"
						>
							<Zap className="w-4 h-4" />
							<span>Записать всё равно (овербукинг / CITO)</span>
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
