import React from "react";
import { Banknote, Calendar, CreditCard, QrCode, ShieldCheck, Users, Wallet, Zap } from "lucide-react";
import { type PatientBillingPaymentMethod } from "./PatientBillingTypes";
import { PatientBillingDirectCustomPayment } from "./patientBilling/PatientBillingDirectCustomPayment";
import { PatientBillingTenderContext } from "./patientBilling/PatientBillingTenderContext";

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

export interface PatientBillingTenderButtonsProps {
	readonly selectedTender: PatientBillingPaymentMethod;
	readonly onSelectTender: (t: PatientBillingPaymentMethod) => void;
	readonly totalNetRub: number;
	readonly receivedCashRub: number;
	readonly onSetReceivedCashRub: (rub: number) => void;
}

export const PatientBillingTenderButtons: React.FC<PatientBillingTenderButtonsProps> = ({
	selectedTender,
	onSelectTender,
	totalNetRub,
	receivedCashRub,
	onSetReceivedCashRub,
}) => {
	return (
		<>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<CreditCard className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0 uppercase tracking-wider">
						Способ оплаты:
					</h4>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Итого к расчету: <strong className="text-[var(--ink)] font-mono font-bold">{totalNetRub.toLocaleString("ru-RU")} ₽</strong>
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
				<button
					type="button"
					onClick={() => onSelectTender("card")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "card"
							? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-card"
				>
					<CreditCard className="w-3.5 h-3.5 shrink-0" />
					<span>Терминал / Карта</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("sbp")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "sbp"
							? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-sbp"
				>
					<QrCode className="w-3.5 h-3.5 shrink-0" />
					<span>СБП QR (0.7%)</span>
				</button>

				<button
					type="button"
					onClick={() => {
						onSelectTender("cash");
						if (!receivedCashRub) onSetReceivedCashRub(totalNetRub);
					}}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "cash"
							? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-cash"
				>
					<Banknote className="w-3.5 h-3.5 shrink-0" />
					<span>Наличные</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("family")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "family"
							? "bg-pink-600 text-white shadow-xs ring-2 ring-pink-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-family"
				>
					<Users className="w-3.5 h-3.5 shrink-0" />
					<span>Семейный счет</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("deposit")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "deposit"
							? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-deposit"
				>
					<Wallet className="w-3.5 h-3.5 shrink-0" />
					<span>Личный депозит</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("installment")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "installment"
							? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-installment"
				>
					<Calendar className="w-3.5 h-3.5 shrink-0" />
					<span>Рассрочка 0%</span>
				</button>
			</div>
		</>
	);
};

export interface PatientBillingTenderPanelProps {
	readonly selectedTender: PatientBillingPaymentMethod;
	readonly onSelectTender: (t: PatientBillingPaymentMethod) => void;
	readonly onFiscalizeAction: () => void;
	readonly totalNetRub: number;
	readonly receivedCashRub: number;
	readonly onSetReceivedCashRub: (rub: number) => void;
	readonly cashChangeResult: {
		readonly changeRub: number;
		readonly isShortage: boolean;
		readonly shortageRub: number;
	};
	readonly primaryInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	readonly onInputEnterKeyDown?: ((e: React.KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly installmentSchedule: {
		readonly stage1Rub: number;
		readonly stage2Rub: number;
		readonly stage3Rub: number;
		readonly stage4Rub: number;
	};
	readonly effectiveDeposit: number;
	readonly effectiveFamilyBalance: number;
	readonly initialServicesCount: number;
	readonly customServiceName: string;
	readonly onSetCustomServiceName: (name: string) => void;
	readonly customAmountRub: number;
	readonly onSetCustomAmountRub: (rub: number) => void;
}

export const PatientBillingTenderPanel: React.FC<PatientBillingTenderPanelProps> = (p) => {
	return (
		<div className="space-y-4">
			<PatientBillingExpressBar
				totalNetRub={p.totalNetRub}
				onSelectTender={p.onSelectTender}
				onSetReceivedCashRub={p.onSetReceivedCashRub}
				onFiscalizeAction={p.onFiscalizeAction}
			/>

			<div className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3.5" data-testid="patient-billing-payment-panel">
				<PatientBillingTenderButtons
					selectedTender={p.selectedTender}
					onSelectTender={p.onSelectTender}
					totalNetRub={p.totalNetRub}
					receivedCashRub={p.receivedCashRub}
					onSetReceivedCashRub={p.onSetReceivedCashRub}
				/>

				<PatientBillingTenderContext
					selectedTender={p.selectedTender}
					totalNetRub={p.totalNetRub}
					receivedCashRub={p.receivedCashRub}
					onSetReceivedCashRub={p.onSetReceivedCashRub}
					cashChangeResult={p.cashChangeResult}
					primaryInputRef={p.primaryInputRef}
					onInputEnterKeyDown={p.onInputEnterKeyDown}
					installmentSchedule={p.installmentSchedule}
					effectiveDeposit={p.effectiveDeposit}
					effectiveFamilyBalance={p.effectiveFamilyBalance}
				/>
			</div>

			<PatientBillingDirectCustomPayment
				initialServicesCount={p.initialServicesCount}
				customServiceName={p.customServiceName}
				onSetCustomServiceName={p.onSetCustomServiceName}
				customAmountRub={p.customAmountRub}
				onSetCustomAmountRub={p.onSetCustomAmountRub}
			/>
		</div>
	);
};
