import React from "react";
import { AlertTriangle, X, Zap } from "lucide-react";
import { createPortal } from "react-dom";

export interface SlotConflictDialogViewProps {
	readonly modalRef: React.RefObject<HTMLDivElement | null>;
	readonly isDoctorConflict: boolean;
	readonly isChairConflict: boolean;
	readonly onClose: () => void;
	readonly onOverbook?: (() => void) | undefined;
	readonly children: React.ReactNode;
}

export const SlotConflictDialogView: React.FC<SlotConflictDialogViewProps> = ({
	modalRef,
	isDoctorConflict,
	isChairConflict,
	onClose,
	onOverbook,
	children,
}) => {
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
						className="secondary-button min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
						aria-label="Закрыть окно"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="p-5 sm:p-6">{children}</div>

				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="secondary-button min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] text-xs font-bold transition-colors cursor-pointer"
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
							onClick={() => { onOverbook(); onClose(); }}
							className="primary-button dente-btn dente-btn-primary min-h-[44px] px-4 py-2 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
							title="Записать в это же время (совмещение слотов для острой боли)"
						>
							<Zap className="w-4 h-4 fill-current" />
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
