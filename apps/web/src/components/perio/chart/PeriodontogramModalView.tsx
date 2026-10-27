/**
 * PeriodontogramModalView.tsx — Модальная оболочка и шторка пародонтограммы (Apple HIG Touch Ergonomics).
 */

import React from "react";
import { Check, X } from "lucide-react";

export interface PeriodontogramModalViewProps {
	readonly patientName?: string | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly children: React.ReactNode;
}

export const PeriodontogramModalView: React.FC<
	PeriodontogramModalViewProps
> = ({ patientName, onClose, children }) => {
	return (
		<div
			className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs p-0 md:p-4 perio-chart-root"
			role="dialog"
			aria-modal="true"
			aria-labelledby="perio-modal-heading"
			data-testid="perio-chart-modal"
		>
			{/* Backdrop click area for desktop */}
			<div
				className="absolute inset-0 cursor-pointer hidden md:block"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Modal Window / Mobile Bottom Sheet */}
			<div className="relative z-10 w-full md:max-w-6xl max-h-[94vh] md:max-h-[90vh] flex flex-col bg-[var(--paper)] rounded-t-[24px] md:rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden perio-modal-container">
				{/* Apple iOS Tactile Drag Handle (Mobile only) */}
				<div className="block md:hidden">
					<div
						className="perio-drag-handle"
						onClick={onClose}
						title="Потяните вниз для закрытия"
					/>
				</div>

				{/* Header Toolbar: 1 row, 44-48px height, clean clinical styling */}
				<header className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<span
							className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"
							aria-hidden="true"
						/>
						<div className="min-w-0">
							<h2
								id="perio-modal-heading"
								className="text-sm md:text-base font-bold text-[var(--ink)] truncate"
							>
								Пародонтологическая карта приёма
							</h2>
							{patientName && (
								<p className="text-xs text-[var(--muted)] truncate">
									Пациент:{" "}
									<span className="font-semibold text-[var(--ink)]">
										{patientName}
									</span>
								</p>
							)}
						</div>
					</div>

					{/* Close Button: min 44x44px touch ergonomics */}
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="icon-button min-h-[44px] min-w-[44px] shrink-0"
							data-testid="perio-modal-close-btn"
							aria-label="Закрыть пародонтограмму"
						>
							<X size={20} />
						</button>
					)}
				</header>

				{/* Content Body: Scrollable Cockpit */}
				<div className="flex-1 overflow-y-auto p-2 md:p-4 overscroll-contain">
					{children}
				</div>

				{/* Floating Bottom Bar (Natural Thumb Zone) */}
				<footer className="perio-floating-bottom-bar flex items-center justify-between">
					<span className="text-xs text-[var(--muted)] hidden sm:inline">
						Клинический скрининг пародонта • Индексы PSR/CPITN • Экспресс-статусы
					</span>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end">
						{onClose && (
							<button
								type="button"
								onClick={onClose}
								className="secondary-button button-lg min-h-[44px] px-6"
								data-testid="perio-modal-done-bottom-btn"
							>
								<Check size={16} className="text-white" />
								<span>Готово</span>
							</button>
						)}
					</div>
				</footer>
			</div>
		</div>
	);
};
