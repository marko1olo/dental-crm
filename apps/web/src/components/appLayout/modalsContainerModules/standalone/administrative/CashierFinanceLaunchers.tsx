/**
 * CashierFinanceLaunchers — Касса, СБП и кассовые ордера (Мандат 8b, <= 120 строк).
 *
 * Тонкий URL-роутер: все данные модалок приходят из базы через честные хосты
 * (patientId из ссылки → API). Никаких вбитых пациентов, сумм и кассиров.
 */

import type React from "react";
import { renderFiscalReceiptLauncher } from "./FiscalReceiptLaunchers";
import { StandaloneCashFlowLauncherHost } from "./StandaloneCashFlowLauncherHost";
import { StandaloneFastCheckoutHost, StandaloneSbpPaymentHost } from "./CashierPaymentLauncherHosts";
import { ManagerialPnlDashboardModal } from "../../../../finance/pnl";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";

export function renderCashierFinanceLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isSbpDirectModalOpen, setIsSbpDirectModalOpen, isReceiptDirectModalOpen, setIsReceiptDirectModalOpen } = props;

	if (hasUrlToken(["pnl", "managerial_pnl"])) {
		return (
			<ManagerialPnlDashboardModal
				isOpen={true}
				onClose={() => clearUrlTokens(["pnl", "managerial_pnl"])}
			/>
		);
	}

	if (hasUrlToken(["fast_checkout", "checkout"])) {
		return (
			<StandaloneFastCheckoutHost
				onClose={() => clearUrlTokens(["fast_checkout", "checkout"])}
			/>
		);
	}

	if (isSbpDirectModalOpen) {
		return (
			<StandaloneSbpPaymentHost
				onClose={() => {
					setIsSbpDirectModalOpen?.(false);
					clearUrlTokens(["sbp"]);
				}}
			/>
		);
	}

	const receipt = renderFiscalReceiptLauncher({ isReceiptDirectModalOpen, setIsReceiptDirectModalOpen });
	if (receipt) return receipt;

	if (hasUrlToken(["cashflow", "cash_flow"])) {
		const isOut = /cashflow=out|type=out/i.test(window.location.search || "");
		return (
			<StandaloneCashFlowLauncherHost
				isOut={isOut}
				onClose={() => clearUrlTokens(["cashflow", "cash_flow", "type"], ["cashflow", "cash_flow"])}
			/>
		);
	}

	return null;
}
