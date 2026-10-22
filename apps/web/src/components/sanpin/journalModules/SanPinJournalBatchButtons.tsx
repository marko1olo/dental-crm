/**
 * apps/web/src/components/sanpin/journalModules/SanPinJournalBatchButtons.tsx
 *
 * Кнопки быстрого пакетного запуска автоклава и предстерилизационной очистки по стандарту DENTE.
 * 1-клик запуск цикла автоклава 134°C и пакетное закрытие смены по норме.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { CheckCircle2, Layers, ShieldCheck, Zap } from "lucide-react";

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
				<>
					<button
						type="button"
						onClick={() => onQuickBatchNorm(27, "134", `Автоклав №1 — ${defaultCycle} (134°C)`)}
						aria-busy={isAutofilling}
						className="primary-button h-9 min-h-[36px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center gap-2 cursor-pointer touch-manipulation transition-all"
						title="Пакетная стерилизация смены: Автоклав №1, 134°C, 2.1 бар, 5 мин, индикаторы норма, списание расходников со склада"
						aria-label="Пакетная стерилизация смены"
						data-testid="quick-shift-batch-btn"
					>
						<Zap size={15} />
						<span>Запустить цикл автоклава (134°C)</span>
					</button>

					<button
						type="button"
						onClick={() => {
							onQuickBatchNorm(27, "134", "Смена по норме: Автоклав №1 (134°C)");
							if (onQuickPsoNorm) onQuickPsoNorm();
						}}
						aria-busy={isAutofilling}
						className="secondary-button h-9 min-h-[36px] rounded-xl border border-[var(--teal,#0d9488)] bg-teal-500/10 hover:bg-teal-500/20 text-[var(--teal,#0d9488)] px-3 text-[13px] font-semibold inline-flex items-center gap-1.5 cursor-pointer touch-manipulation transition-all"
						title="Заполнить смену по норме: Автоклав №1, 134°C, 2.1 бар, индикаторы стерильно, предстерилизационная очистка: отрицательно"
						aria-label="Заполнить смену по норме"
						data-testid="fill-shift-norm-btn"
					>
						<CheckCircle2 size={15} />
						<span>Заполнить смену по норме</span>
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
					title="Контроль очистки инструментов: азопирам и фенолфталеин отрицательно (100% норма)"
					data-testid="quick-pso-norm-btn"
				>
					<ShieldCheck size={14} />
					<span>Очистка (Азопирам): норма</span>
				</button>
			)}
		</div>
	);
}

export default SanPinJournalBatchButtons;
