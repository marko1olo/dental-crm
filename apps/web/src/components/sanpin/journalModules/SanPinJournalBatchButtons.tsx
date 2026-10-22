/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalBatchButtons.tsx
 *
 * Кнопки быстрого пакетного запуска автоклава и предстерилизационной очистки по стандарту DENTE.
 * 1-клик запуск цикла автоклава 134°C и пакетное закрытие смены по норме.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";

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
					aria-busy={isAutofilling}
					className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--teal,#0d9488)] bg-teal-500/10 hover:bg-teal-500/20 text-[var(--teal,#0d9488)] px-3.5 text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer touch-manipulation transition-all"
					title="Пакетное автоклавирование смены: 134°C, 2.1 бар, 5 мин, азопирам 100% норма, списание расходников со склада"
					aria-label="Пакетная стерилизация смены"
					data-testid="quick-shift-batch-btn"
				>
					<CheckCircle2 size={15} />
					<span>{isAutofilling ? "Фиксация..." : "Зафиксировать цикл автоклавирования смены"}</span>
				</button>
			)}
		</div>
	);
}

export default SanPinJournalBatchButtons;
