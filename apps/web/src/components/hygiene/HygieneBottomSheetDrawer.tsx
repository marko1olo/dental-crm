/**
 * HygieneBottomSheetDrawer.tsx — Нативный мобильный Bottom Sheet Drawer для индексов гигиены
 * в соответствии с Apple iOS HIG и DENTE Touch Ergonomics (Мандаты 8e, 8n).
 *
 * Инварианты:
 * - Скругления верхних углов 24px (rounded-t-[24px]).
 * - Тактильный хэндл перетаскивания 36x5px (Drag Handle).
 * - Сенсорные цели touch targets >= 44x44px.
 * - 0px горизонтального скролла (overflow-x: clip; max-width: 100vw).
 * - Поддержка закрытия по свайпу вниз / тапу на бэкдроп / кнопке «Готово».
 * - Учет safe area insets: env(safe-area-inset-bottom).
 */

import React, { memo, useEffect } from "react";
import { Check, ShieldCheck, X } from "lucide-react";

export interface HygieneBottomSheetDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly title?: string;
	readonly subtitle?: string;
	readonly children: React.ReactNode;
}

export const HygieneBottomSheetDrawer: React.FC<HygieneBottomSheetDrawerProps> = memo(({
	isOpen,
	onClose,
	title = "Индексы гигиены полости рта",
	subtitle = "OHI-S, PMA, КПИ, SBI и персональный уход",
	children,
}) => {
	// Блокировка фонового скролла при открытой шторке
	useEffect(() => {
		if (!isOpen) return;
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
			onClick={onClose}
			data-testid="hygiene-bottom-sheet-backdrop"
			role="dialog"
			aria-modal="true"
		>
			<div
				className="w-full max-h-[88vh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl transition-transform duration-200 animate-in slide-in-from-bottom max-w-[100vw] overflow-x-clip"
				onClick={(e) => e.stopPropagation()}
				data-testid="hygiene-bottom-sheet-content"
			>
				{/* Тактильный хэндл (Apple HIG: 36x5px) */}
				<div className="pt-2.5 pb-1 flex justify-center shrink-0">
					<div
						className="w-[36px] h-[5px] rounded-full bg-[var(--line-strong)] opacity-60"
						data-testid="hygiene-drag-handle"
					/>
				</div>

				{/* Шапка шторки (Touch target закрытия >= 44x44px) */}
				<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--line)] shrink-0 min-w-0">
					<div className="flex items-center gap-2 min-w-0 flex-1">
						<div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 shrink-0">
							<ShieldCheck size={18} />
						</div>
						<div className="min-w-0 flex-1">
							<h3 className="text-sm font-bold text-[var(--ink)] truncate">
								{title}
							</h3>
							{subtitle && (
								<p className="text-[11px] text-[var(--muted)] truncate">
									{subtitle}
								</p>
							)}
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50 active:scale-95 flex items-center justify-center transition-all cursor-pointer touch-manipulation shrink-0"
						title="Закрыть шторку"
						aria-label="Закрыть"
						data-testid="hygiene-bottom-sheet-close-btn"
					>
						<X size={20} />
					</button>
				</div>

				{/* Прокручиваемое содержимое шторки */}
				<div className="flex-1 overflow-y-auto p-3 sm:p-4 overscroll-contain flex flex-col gap-4">
					{children}
				</div>

				{/* Липкая нижняя планка подтверждения (Natural Thumb Zone) */}
				<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)]/90 backdrop-blur-md flex items-center justify-end gap-2 shrink-0 pb-[max(12px,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={onClose}
						className="w-full min-h-[48px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer touch-manipulation"
						data-testid="hygiene-bottom-sheet-done-btn"
					>
						<Check size={18} />
						<span>Готово</span>
					</button>
				</div>
			</div>
		</div>
	);
});

HygieneBottomSheetDrawer.displayName = "HygieneBottomSheetDrawer";
