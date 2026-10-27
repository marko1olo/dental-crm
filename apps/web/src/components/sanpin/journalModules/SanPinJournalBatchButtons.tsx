/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalBatchButtons.tsx
 * 1-кликовый запуск цикла автоклавирования смены по стандарту DENTE CRM.
 * Мандаты 8am (ровно 1 Primary CTA), 8e (автономия), 8n (пакетная обработка), 8b (<= 120 строк).
 */

import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export interface SanPinJournalBatchButtonsProps {
	readonly isAutofilling: boolean;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121", cycleName?: string) => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

export function SanPinJournalBatchButtons({
	isAutofilling,
	onQuickBatchNorm,
	onQuickPsoNorm,
}: SanPinJournalBatchButtonsProps) {
	const currentHour = new Date().getHours();
	const defaultCycle = currentHour < 12 ? "Утренний цикл" : currentHour < 17 ? "Дневной цикл" : "Вечерний цикл";

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{onQuickBatchNorm && (
				<button
					type="button"
					onClick={() => {
						if (isAutofilling) return;
						onQuickBatchNorm(27, "134", `Автоклав №1 — ${defaultCycle} (134°C)`);
						if (onQuickPsoNorm) onQuickPsoNorm();
					}}
					aria-busy={isAutofilling}
					className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
					title="Пакетное автоклавирование смены: 134°C, 2.1 бар, 5 мин, азопирам норма, автоматическое списание расходников со склада"
					aria-label="Зафиксировать цикл автоклавирования смены (134°C)"
					data-testid="quick-shift-batch-btn"
				>
					{isAutofilling ? (
						<>
							<Loader2 size={15} className="animate-spin text-[var(--teal,#0d9488)]" />
							<span>Фиксация смены...</span>
						</>
					) : (
						<>
							<CheckCircle2 size={15} color="var(--teal,#0d9488)" />
							<span>Зафиксировать автоклавирование смены</span>
						</>
					)}
				</button>
			)}
		</div>
	);
}

export default SanPinJournalBatchButtons;
