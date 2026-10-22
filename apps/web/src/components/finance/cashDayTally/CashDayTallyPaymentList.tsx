import React from "react";
import {
	Banknote,
	Coins,
	CreditCard,
	Globe,
	Landmark,
	ShieldCheck,
	Undo2,
	Wallet,
} from "lucide-react";
import type { Dashboard } from "@dental/shared";
import { countLabel } from "../../../lib/russianPlural";
import type { CashDaySummary } from "../cashDaySummary";

type PaymentMethod = Dashboard["payments"][number]["method"];

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
	cash: Banknote,
	card: CreditCard,
	bank_transfer: Landmark,
	online: Globe,
	insurance: ShieldCheck,
	family_wallet: Wallet,
	other: Coins,
};

function paymentsCountLabel(count: number): string {
	return countLabel(count, "оплата", "оплаты", "оплат");
}

interface CashDayTallyPaymentListProps {
	readonly summary: CashDaySummary;
	readonly methodLabels: Record<string, string>;
	readonly money: (val: number | null) => string;
}

export function CashDayTallyPaymentList({
	summary,
	methodLabels,
	money,
}: CashDayTallyPaymentListProps) {
	return (
		<div className="finance-list" style={{ border: "none", padding: 0, background: "transparent" }}>
			{(summary?.byMethod ?? []).map((row) => {
				const RowIcon = METHOD_ICONS[row.method] ?? Coins;
				return (
					<article className="finance-row" key={row.method}>
						<RowIcon aria-hidden="true" />
						<div>
							<h3>{methodLabels[row.method] ?? row.method}</h3>
							<p>{paymentsCountLabel(row.count)}</p>
						</div>
						<strong>{money(row.amountRub)}</strong>
					</article>
				);
			})}
			{summary.advanceRub > 0 && (
				<article className="finance-row" key="advance">
					<Wallet aria-hidden="true" />
					<div>
						<h3>Из них аванс на семейный счёт</h3>
						<p>деньги получены, но выручкой станут при оплате лечения</p>
					</div>
					<strong>{money(summary.advanceRub)}</strong>
				</article>
			)}
			{summary.familyWalletRub > 0 && (
				<article className="finance-row" key="family-wallet">
					<Wallet aria-hidden="true" />
					<div>
						<h3>Оплачено с семейных счетов</h3>
						<p>в приход не входит: эти деньги клиника получила раньше, когда счёт пополняли</p>
					</div>
					<strong>{money(summary.familyWalletRub)}</strong>
				</article>
			)}
			{summary.refundedRub > 0 && (
				<article className="finance-row" key="refunded">
					<Undo2 aria-hidden="true" />
					<div>
						<h3>Возвращено пациентам</h3>
						<p>{paymentsCountLabel(summary.refundedCount)}; в приход за день не входят — эти деньги вернули</p>
					</div>
					<strong>−{money(summary.refundedRub)}</strong>
				</article>
			)}
		</div>
	);
}
