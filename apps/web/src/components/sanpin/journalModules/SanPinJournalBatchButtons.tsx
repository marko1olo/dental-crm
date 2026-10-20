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
	readonly onQuickBatchNorm?: ((batchSize: number, regime: "134" | "121", cycleName?: string) => void) | undefined;
	readonly onQuickPsoNorm?: (() => void) | undefined;
}

export const SanPinJournalBatchButtons: React.FC<SanPinJournalBatchButtonsProps> = ({
	isAutofilling,
	onQuickBatchNorm,
	onQuickPsoNorm,
}) => {
	const currentHour = new Date().getHours();
	const defaultCycle = currentHour < 12 ? "Утренний цикл" : currentHour < 17 ? "Дневной цикл" : "Вечерний цикл";

	return (
		<div className="flex items-center gap-2 flex-wrap">
			{onQuickBatchNorm && (
				<>
					<button
						type="button"
						onClick={() => onQuickBatchNorm(27, "134", defaultCycle)}
						aria-busy={isAutofilling}
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer touch-manipulation transition-all"
						title={`Пакетная стерилизация: зафиксировать ${defaultCycle} автоклавирования (134°C, 2.1 бар, 5 мин, индикатор 5 класса норма, списание расходников)`}
						aria-label="Подтвердить цикл стерилизации смены"
						data-testid="quick-shift-batch-btn"
					>
						<CheckCircle2 size={15} />
						<span>Пакетная стерилизация смены</span>
					</button>

					<div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 gap-1">
						{(["Утренний цикл", "Дневной цикл", "Вечерний цикл"] as const).map((cycle) => (
							<button
								key={cycle}
								type="button"
								onClick={() => onQuickBatchNorm(27, "134", cycle)}
								className="secondary-button text-[12px] font-medium px-2.5 py-1 rounded-lg border-0 bg-transparent hover:bg-[var(--paper)] text-[var(--ink)] cursor-pointer touch-manipulation transition-all"
								title={`Зафиксировать ${cycle} (134°C, 2.1 бар, 5 мин)`}
							>
								{cycle.replace(" цикл", "")}
							</button>
						))}
					</div>

					<button
						type="button"
						onClick={() => onQuickBatchNorm(15, "121", "Щадящий цикл")}
						aria-busy={isAutofilling}
						className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						title="Щадящая стерилизация: 15 наборов оптики и наконечников (121°C, 1.15 бар, 20 мин)"
						data-testid="quick-delicate-batch-btn"
					>
						<Layers size={14} />
						<span>Щадящий (121°C)</span>
					</button>
				</>
			)}

			{onQuickPsoNorm && (
				<button
					type="button"
					onClick={onQuickPsoNorm}
					aria-busy={isAutofilling}
					className="secondary-button h-9 min-h-[36px] rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
					title="Предстерилизационная очистка: азопирам и фенолфталеин отрицательно (100% норма)"
					data-testid="quick-pso-norm-btn"
				>
					<ShieldCheck size={14} />
					<span>Предстерилизационная очистка (азопирам): норма</span>
				</button>
			)}
		</div>
	);
};

export default SanPinJournalBatchButtons;
