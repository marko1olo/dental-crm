/**
 * StandaloneCashFlowLauncherHost — честный хост кассового ордера по deep-link.
 *
 * Остаток в ящике считается по реальным платежам дня из базы; внесение и изъятие
 * уходят в настоящие кассовые операции смены (/api/cash/cash-introduction,
 * /api/cash/cash-withdrawal). Никаких пустых заглушек onCashIn/onCashOut.
 */

import type React from "react";
import { useEffect, useState } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { showToast } from "../../../../GlobalToast";
import { fetchCashInDrawerRub, submitCashOperation } from "../launcherFinanceApi";

const CashFlowModal = lazyWithRetry(() =>
	import("../../../../finance/CashFlowModal").then((m) => ({ default: m.CashFlowModal })),
);

export const StandaloneCashFlowLauncherHost: React.FC<{ onClose: () => void; isOut: boolean }> = ({
	onClose,
	isOut,
}) => {
	const [cashInDrawerRub, setCashInDrawerRub] = useState<number | null>(null);

	useEffect(() => {
		let cancelled = false;
		void fetchCashInDrawerRub().then((sum) => {
			if (!cancelled) setCashInDrawerRub(sum);
		});
		return () => {
			cancelled = true;
		};
	}, []);

	const runOperation = async (
		direction: "in" | "out",
		amountRub: number,
		basis: string,
		extra: Record<string, unknown>,
	): Promise<void> => {
		const ok = await submitCashOperation(direction, {
			amountRub,
			reasonText: basis,
			...extra,
		});
		if (ok) {
			showToast(
				direction === "in"
					? `Внесение ${amountRub.toLocaleString("ru-RU")} ₽ записано в кассу.`
					: `Изъятие ${amountRub.toLocaleString("ru-RU")} ₽ записано в кассу.`,
				"success",
			);
			setCashInDrawerRub((prev) =>
				Math.round(((prev ?? 0) + (direction === "in" ? amountRub : -amountRub)) * 100) / 100,
			);
		} else {
			showToast("Кассовая операция не проведена — сервер вернул ошибку.", "error");
		}
	};

	if (cashInDrawerRub === null) {
		return <AppLoadingState message="Сверка наличных за день..." />;
	}

	return (
		<CashFlowModal
			isOpen={true}
			initialMode={isOut ? "cash_out" : "cash_in"}
			cashInDrawerRub={Math.max(0, cashInDrawerRub)}
			onClose={onClose}
			onCashIn={(amountRub, basis, typeAlias) =>
				runOperation("in", amountRub, basis || "Служебное внесение разменного фонда", { typeAlias })
			}
			onCashOut={(amountRub, basis, recipientFio, typeAlias) =>
				runOperation(
					"out",
					amountRub,
					basis || (recipientFio ? `Инкассация: ${recipientFio}` : "Служебное изъятие наличных средств"),
					{ recipientFio, typeAlias },
				)
			}
		/>
	);
};
