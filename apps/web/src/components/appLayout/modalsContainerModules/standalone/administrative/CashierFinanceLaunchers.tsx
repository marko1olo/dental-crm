/**
 * CashierFinanceLaunchers — Касса, СБП и кассовые ордера (Мандат 8b, <= 120 строк).
 * Чистый доменный язык без бюрократического мусора (Мандат 8ap).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { renderFiscalReceiptLauncher } from "./FiscalReceiptLaunchers";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";

const FastCheckoutModal = lazyWithRetry(() =>
	import("../../../../finance/FastCheckoutModal").then((m) => ({ default: m.FastCheckoutModal })),
);
const PaymentModal = lazyWithRetry(() =>
	import("../../../../billing/PaymentModal").then((m) => ({ default: m.PaymentModal })),
);
const CashFlowModal = lazyWithRetry(() =>
	import("../../../../finance/CashFlowModal").then((m) => ({ default: m.CashFlowModal })),
);

export function renderCashierFinanceLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isSbpDirectModalOpen, setIsSbpDirectModalOpen, isReceiptDirectModalOpen, setIsReceiptDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (s.includes("fast_checkout") || s.includes("checkout") || h.includes("fast_checkout") || h.includes("checkout")) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка кассы..." />}>
				<FastCheckoutModal
					isOpen={true}
					totalBillRub={14500}
					patientName="Иванова Мария Сергеевна"
					patientPhone="+7 (999) 123-45-67"
					patientDepositRub={5000}
					patientFamilyBalanceRub={12000}
					familyPayerName="Иванов Сергей Петрович"
					orderId="ORD-2026-88"
					cashierFullName="Кассир-администратор Смирнова А.В."
					initialPaymentMethod="sbp_qr"
					initialSimpleCashierMode={false}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("fast_checkout");
						u.searchParams.delete("checkout");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("checkout") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	if (isSbpDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка оплаты СБП..." />}>
				<PaymentModal
					isOpen={true}
					amountRub={15400}
					amountKopecks={1540000}
					defaultMethod={s.includes("split") ? "split" : "sbp_qr"}
					patientId="pat_mikhailov"
					patientName="Михайлов Артем Евгеньевич"
					patientPhone="+7 (926) 345-67-89"
					patientDepositRub={5000}
					patientFamilyBalanceRub={18500}
					cashierName="Воронова А. В."
					doctorName="Д-р Воронов А. В."
					clinicLegalName="ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"
					items={[
						{ id: "item-1", name: "Восстановление зуба пломбой Filtek", serviceCode: "A16.07.002.001", quantity: 1, priceRub: 7500, discountRub: 0, amountRub: 7500 },
						{ id: "item-2", name: "Профессиональная гигиена полости рта AirFlow", serviceCode: "A16.07.051", quantity: 1, priceRub: 7900, discountRub: 0, amountRub: 7900 },
					]}
					onClose={() => {
						setIsSbpDirectModalOpen?.(false);
						const u = new URL(window.location.href);
						u.searchParams.delete("sbp");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("sbp") ? "" : u.hash));
					}}
				/>
			</Suspense>
		);
	}

	const receipt = renderFiscalReceiptLauncher({ isReceiptDirectModalOpen, setIsReceiptDirectModalOpen });
	if (receipt) return receipt;

	if (s.includes("cashflow") || s.includes("cash_flow") || h.includes("cashflow") || h.includes("cash_flow")) {
		const isOut = s.includes("cashflow=out") || s.includes("type=out") || h.includes("out");
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка кассового ордера..." />}>
				<CashFlowModal
					isOpen={true}
					initialMode={isOut ? "cash_out" : "cash_in"}
					cashInDrawerRub={38500}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("cashflow");
						u.searchParams.delete("cash_flow");
						u.searchParams.delete("type");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("cashflow") ? "" : u.hash));
					}}
					onCashIn={async () => {}}
					onCashOut={async () => {}}
				/>
			</Suspense>
		);
	}

	return null;
}
