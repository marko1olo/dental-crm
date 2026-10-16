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
		<div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
			{onQuickBatchNorm && (
				<>
					<button
						type="button"
						onClick={() => onQuickBatchNorm(27, "134")}
						aria-busy={isAutofilling}
						className="primary-button"
						title="Пакетная стерилизация смены: запуск регламентного цикла автоклавирования (134°C, 2.15 бар, 5 мин, азопирам норма, списание со склада)"
						aria-label="Пакетная стерилизация смены"
						data-testid="quick-shift-batch-btn"
						style={{ height: 32, padding: "0 12px", fontSize: "0.78125rem" }}
					>
						<CheckCircle2 size={14} />
						<span>Запустить цикл автоклавирования (134°C, 2.1 бар, 5 мин)</span>
					</button>

					<button
						type="button"
						onClick={() => onQuickBatchNorm(15, "121")}
						aria-busy={isAutofilling}
						className="secondary-button"
						style={{ height: 32, padding: "0 10px", fontSize: "0.78125rem" }}
						title="Щадящая стерилизация: 15 наборов оптики и наконечников (121°C, 1.15 бар, 20 мин)"
						data-testid="quick-delicate-batch-btn"
					>
						<Layers size={13} />
						<span>Щадящий цикл (121°C, 20 мин)</span>
					</button>
				</>
			)}

			{onQuickPsoNorm && (
				<button
					type="button"
					onClick={onQuickPsoNorm}
					aria-busy={isAutofilling}
					className="secondary-button"
					style={{ height: 32, padding: "0 10px", fontSize: "0.78125rem", color: "var(--emerald-600, #059669)", borderColor: "rgba(16, 185, 129, 0.35)" }}
					title="Контроль предстерилизационной очистки: азопирам и фенолфталеин отрицательно (100% норма)"
					data-testid="quick-pso-norm-btn"
				>
					<ShieldCheck size={13} />
					<span>Очистка (азопирам): норма</span>
				</button>
			)}
		</div>
	);
};
