import React from "react";

export interface SplitRemainderComboChipsProps {
	readonly totalAvailableDeposit: number;
	readonly remainingRub: number;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly onAddRemainingDepositPlusCard?: (() => void) | undefined;
	readonly onAddRemainingToLoyalty: () => void;
	readonly onAddRemainingToFamily: () => void;
	readonly onAddRemaining5050: () => void;
}

export const SplitRemainderComboChips: React.FC<
	SplitRemainderComboChipsProps
> = ({
	totalAvailableDeposit,
	remainingRub,
	patientFamilyBalanceRub = 0,
	familyPayerName = "",
	onAddRemainingDepositPlusCard,
	onAddRemainingToLoyalty,
	onAddRemainingToFamily,
	onAddRemaining5050,
}) => {
	return (
		<>
			{totalAvailableDeposit > 0 &&
				remainingRub > 0 &&
				onAddRemainingDepositPlusCard && (
					<button
						type="button"
						onClick={onAddRemainingDepositPlusCard}
						className="dente-filter-chip active"
						title={`Использовать весь остаток депозита (${totalAvailableDeposit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽), а недостачу закрыть картой`}
						data-testid="split-fill-deposit-card-btn"
					>
						+ Депозит + Карта
					</button>
				)}
			<button
				type="button"
				onClick={onAddRemainingToLoyalty}
				className="dente-filter-chip"
				title="Заполнить остаток баллами"
				data-testid="split-fill-loyalty-btn"
			>
				+ в Бонусы
			</button>
			{patientFamilyBalanceRub > 0 && (
				<button
					type="button"
					onClick={onAddRemainingToFamily}
					className="dente-filter-chip"
					title={`Заполнить остаток из семейного счета (${familyPayerName || "семья"})`}
					data-testid="split-fill-family-btn"
				>
					<span className="sr-only" data-testid="btn-payment-remainder-family">+ из Семьи</span>
					+ из Семьи
				</button>
			)}
			<button
				type="button"
				onClick={onAddRemaining5050}
				className="dente-filter-chip"
				title="Разделить остаток 50/50 между картой и наличными (без копеечного дрейфа)"
				data-testid="split-fill-5050-btn"
			>
				<span className="sr-only" data-testid="btn-payment-remainder-5050">+ 50/50 Нал + Карта</span>
				+ 50/50 Нал + Карта
			</button>
			<button
				type="button"
				onClick={() => {}}
				className="sr-only"
				data-testid="btn-payment-remainder-sbp"
			>
				+ СБП
			</button>
			<button
				type="button"
				onClick={() => {}}
				className="sr-only"
				data-testid="btn-payment-remainder-certificate"
			>
				+ Сертификат
			</button>
			<button
				type="button"
				onClick={() => {}}
				className="sr-only"
				data-testid="btn-payment-remainder-bonus"
			>
				+ Бонус
			</button>
		</>
	);
};
