/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalBatchButtons.tsx
 *
 * Кнопки быстрого пакетного запуска автоклава и ПСО по стандарту DENTE.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2, Layers, ShieldCheck } from "lucide-react";

export interface SanPinJournalBatchButtonsProps {
	readonly isAutofilling: boolean;
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121") => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

export const SanPinJournalBatchButtons: React.FC<SanPinJournalBatchButtonsProps> = ({
	isAutofilling,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	return (
		<div className="flex items-center gap-2 flex-wrap">
			{onQuickBatchNorm && (
				<>
					<button
						type="button"
						onClick={() => onQuickBatchNorm(27, "134")}
						aria-busy={isAutofilling}
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer touch-manipulation transition-all"
						title="Пакетная стерилизация смены: запуск регламентного цикла автоклавирования (134°C, 2.1 бар, 5 мин, ИнтеТЕСТ 5 класс норма, списание со склада)"
						aria-label="Зафиксировать цикл автоклава за смену"
						data-testid="quick-shift-batch-btn"
					>
						<CheckCircle2 size={15} />
						<span>Зафиксировать цикл автоклава за смену</span>
					</button>

					<button
						type="button"
						onClick={() => onQuickBatchNorm(15, "121")}
						aria-busy={isAutofilling}
						className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						title="Щадящая стерилизация: 15 наборов оптики и наконечников (121°C, 1.15 бар, 20 мин)"
						data-testid="quick-delicate-batch-btn"
					>
						<Layers size={14} />
						<span>Щадящий цикл (121°C)</span>
					</button>
				</>
			)}

			{onQuickPsoNorm && (
				<button
					type="button"
					onClick={onQuickPsoNorm}
					aria-busy={isAutofilling}
					className="secondary-button h-9 min-h-[36px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
					title="Проверка качества очистки: азопирам и фенолфталеин отрицательно (100% норма)"
					data-testid="quick-pso-norm-btn"
				>
					<ShieldCheck size={14} />
					<span>Качество очистки (азопирам): норма</span>
				</button>
			)}
		</div>
	);
};

export default SanPinJournalBatchButtons;
