/**
 * PeriodontogramModalView.tsx — Модальная оболочка и шторка пародонтограммы (Apple HIG Touch Ergonomics).
 */

import React from "react";
import { Check, Save, X } from "lucide-react";

export interface PeriodontogramModalViewProps {
	readonly patientName?: string | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onSave?: (() => void) | undefined;
	readonly syncStatus?: string | undefined;
	readonly children: React.ReactNode;
}

export const PeriodontogramModalView: React.FC<PeriodontogramModalViewProps> = ({
	patientName, onClose, onSave, syncStatus = "idle", children,
}) => {
	return (
		<div
			className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 perio-chart-root"
			role="dialog" aria-modal="true" aria-labelledby="perio-modal-heading" data-testid="perio-chart-modal"
		>
			<div className="absolute inset-0 cursor-pointer hidden md:block" onClick={onClose} aria-hidden="true" />
			<div className="relative z-10 w-full md:max-w-6xl max-h-[94vh] md:max-h-[90vh] flex flex-col bg-[var(--paper)] rounded-t-[24px] md:rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden perio-modal-container">
				<div className="block md:hidden">
					<div className="perio-drag-handle" onClick={onClose} title="Потяните вниз для закрытия" />
				</div>
				<header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" aria-hidden="true" />
						<div className="min-w-0">
							<h2 id="perio-modal-heading" className="text-sm md:text-base font-bold text-[var(--ink)] truncate">Пародонтологическая карта приёма</h2>
							{patientName && (
								<p className="text-xs text-[var(--muted)] truncate">Пациент: <span className="font-semibold text-[var(--ink)]">{patientName}</span></p>
							)}
						</div>
					</div>
					{onClose && (
						<button type="button" onClick={onClose} className="icon-button min-h-[44px] min-w-[44px] shrink-0" data-testid="perio-modal-close-btn" aria-label="Закрыть пародонтограмму">
							<X size={20} />
						</button>
					)}
				</header>
				<div className="flex-1 overflow-y-auto p-2 md:p-4 overscroll-contain">
					{children}
				</div>
				<footer className="perio-floating-bottom-bar flex items-center justify-between">
					<span className="text-xs text-[var(--muted)] hidden sm:inline">Клинический скрининг пародонта • Индексы PSR/CPITN • Экспресс-статусы</span>
					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						{onClose && (
							<button type="button" onClick={onClose} className="secondary-button button-lg min-h-[44px] px-5" data-testid="perio-modal-done-bottom-btn">
								<Check size={16} className="text-slate-600 dark:text-slate-300" />
								<span>Закрыть</span>
							</button>
						)}
						{onSave && (
							<button type="button" onClick={onSave} aria-busy={syncStatus === "saving"} className="primary-button button-lg min-h-[44px] px-6 font-bold shadow-md flex items-center gap-2" data-testid="perio-modal-save-primary-btn">
								<Save size={16} className={syncStatus === "saving" ? "animate-spin text-white" : "text-white"} />
								<span>✓ Сохранить пародонтограмму</span>
							</button>
						)}
					</div>
				</footer>
			</div>
		</div>
	);
};
