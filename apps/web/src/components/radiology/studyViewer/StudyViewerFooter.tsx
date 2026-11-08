/**
 * StudyViewerFooter.tsx — Нижняя панель действий просмотрщика визиографии.
 * Содержит выбор зуба FDI, 1-клик биллинг в кассу и единственный Primary CTA привязки к приёму.
 * Mandate 8b: строго < 100 строк.
 */

import React from "react";
import { Check, CreditCard } from "lucide-react";

export interface StudyViewerFooterProps {
	readonly selectedTooth: string;
	readonly onSelectTooth: (tooth: string) => void;
	readonly isBilled: boolean;
	readonly onQuickBill: () => void;
	readonly isSaved: boolean;
	readonly onPrimaryAttach: () => void;
}

const FDI_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	38, 37, 36, 35, 34, 33, 32, 31,
	41, 42, 43, 44, 45, 46, 47, 48,
];

export const StudyViewerFooter: React.FC<StudyViewerFooterProps> = ({
	selectedTooth,
	onSelectTooth,
	isBilled,
	onQuickBill,
	isSaved,
	onPrimaryAttach,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between px-4 py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 gap-3">
			{/* Выбор зуба FDI 11-48 (Apple HIG тач-таргет >=44px) */}
			<div className="flex items-center gap-2">
				<label htmlFor="fdi-tooth-select" className="text-xs font-medium text-[var(--muted)]">
					Зуб FDI:
				</label>
				<select
					id="fdi-tooth-select"
					value={selectedTooth}
					onChange={(e) => onSelectTooth(e.target.value)}
					className="h-11 sm:h-8 min-h-[44px] sm:min-h-[32px] px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold focus:outline-none focus:border-[var(--teal,#0d9488)]"
					data-testid="select-tooth-fdi"
				>
					{FDI_TEETH.map((tooth) => (
						<option key={tooth} value={tooth}>
							{tooth}
						</option>
					))}
				</select>
			</div>

			<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
				{/* Вторичная кнопка: 1-Клик добавление в кассу / чек */}
				<button
					type="button"
					onClick={onQuickBill}
					className="flex items-center gap-1.5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-3.5 sm:px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] transition-all select-none shadow-xs active:scale-95 whitespace-nowrap shrink-0"
					data-testid="btn-quick-bill"
				>
					<CreditCard className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
					<span className="whitespace-nowrap">{isBilled ? "✓ В чеке (450 ₽)" : "+ В чек (450 ₽)"}</span>
				</button>

				{/* Единственная Primary CTA кнопка (#0d9488): Прикрепить к приёму */}
				<button
					type="button"
					onClick={onPrimaryAttach}
					className="flex items-center justify-center gap-1.5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs font-semibold text-white bg-[var(--teal,#0d9488)] hover:brightness-105 active:scale-95 transition-all shadow-sm select-none whitespace-nowrap shrink-0"
					data-testid="btn-primary-attach"
				>
					<Check className="h-4 w-4 stroke-[2.5] shrink-0" />
					<span className="whitespace-nowrap">
						{isSaved ? `Привязано к зубу ${selectedTooth}` : `Привязать к зубу ${selectedTooth}`}
					</span>
				</button>
			</div>
		</div>
	);
};
