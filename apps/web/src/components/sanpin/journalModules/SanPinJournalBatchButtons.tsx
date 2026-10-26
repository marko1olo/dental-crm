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
						onQuickBatchNorm(27, "134", `Автоклав №1 — ${defaultCycle} (134°C)`);
						if (onQuickPsoNorm) onQuickPsoNorm();
					}}
					disabled={isAutofilling}
					aria-busy={isAutofilling}
					className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-4 text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer touch-manipulation transition-all disabled:opacity-70"
					title="Пакетное автоклавирование смены: 134°C, 2.1 бар, 5 мин, азопирам норма, автоматическое списание расходников со склада"
					aria-label="Зафиксировать цикл автоклавирования смены (134°C)"
					data-testid="quick-shift-batch-btn"
				>
					{isAutofilling ? (
						<>
							<Loader2 size={16} className="animate-spin text-white" />
							<span>Фиксация смены...</span>
						</>
					) : (
						<>
							<CheckCircle2 size={16} className="text-white" />
							<span>Зафиксировать автоклавирование смены</span>
						</>
					)}
				</button>
			)}
		</div>
	);
}

export default SanPinJournalBatchButtons;
