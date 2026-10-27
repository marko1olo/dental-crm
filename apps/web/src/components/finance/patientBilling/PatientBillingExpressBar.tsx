import React from "react";
import { Banknote, CreditCard, QrCode, ShieldCheck, Zap } from "lucide-react";
import type { PatientBillingPaymentMethod } from "../PatientBillingTypes";

export interface PatientBillingExpressBarProps {
	readonly totalNetRub: number;
	readonly onSelectTender: (t: PatientBillingPaymentMethod) => void;
	readonly onSetReceivedCashRub: (rub: number) => void;
	readonly onFiscalizeAction: () => void;
}

export const PatientBillingExpressBar: React.FC<PatientBillingExpressBarProps> = ({
	totalNetRub,
	onSelectTender,
	onSetReceivedCashRub,
	onFiscalizeAction,
}) => {
	return (
		<div className="p-3.5 rounded-2xl border-2 border-teal-500/40 bg-teal-500/5 space-y-2.5" data-testid="express-payment-bar">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
					<span className="text-xs font-black text-[var(--ink)] uppercase tracking-wider">
						Экспресс-оплата (мгновенная фискализация чека):
					</span>
				</div>
				<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
					<ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
					<span>Для пациентов-физлиц не требуется</span>
				</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<button
					type="button"
					onClick={() => {
						onSelectTender("card");
						onFiscalizeAction();
					}}
					className="min-h-[44px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
					data-testid="btn-express-pay-card"
					title="Оплатить картой 100% суммы и пробить чек"
				>
					<CreditCard className="w-4 h-4 shrink-0" />
					<span>Оплатить картой (вся сумма)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onSelectTender("cash");
						onSetReceivedCashRub(totalNetRub);
						onFiscalizeAction();
					}}
					className="min-h-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
					data-testid="btn-express-pay-cash"
					title="Оплатить наличными 100% суммы и пробить чек"
				>
					<Banknote className="w-4 h-4 shrink-0" />
					<span>Оплатить наличными (вся сумма)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onSelectTender("sbp");
						onFiscalizeAction();
					}}
					className="min-h-[44px] px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
					data-testid="btn-express-pay-sbp"
					title="Оплатить через СБП QR 100% суммы и пробить чек"
				>
					<QrCode className="w-4 h-4 shrink-0" />
					<span>Оплатить через СБП</span>
				</button>
			</div>
		</div>
	);
};
