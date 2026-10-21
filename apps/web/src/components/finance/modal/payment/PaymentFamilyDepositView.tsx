/**
 * apps/web/src/components/finance/modal/payment/PaymentFamilyDepositView.tsx
 *
 * Patient deposit balance, family wallet, and 1-click combo resolvers.
 */

import { kopecksToRub, rubToKopecks } from "@dental/shared";
import {
	Banknote,
	CheckCircle,
	CreditCard,
	QrCode,
	Sparkles,
	Users,
	Wallet,
	Zap,
} from "lucide-react";
import React from "react";
import {
	formatAvailableForDebitLabel,
	formatMoneyClean,
} from "../../familyWalletHelpers";
import type { PaymentMethodTab } from "./paymentModalTypes.js";

export interface PaymentFamilyDepositViewProps {
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyHeadName?: string | null | undefined;
	readonly familyGroupName?: string | null | undefined;
	readonly totalDueRub: number;
	readonly amountRub: string;
	readonly isSubmittingDeposit: boolean;
	readonly handleDepositOrPartialCombo: (source: "deposit" | "family") => void;
	readonly setSplitDepositRub: (v: number) => void;
	readonly setSplitCardRub: (v: number) => void;
	readonly setSplitCashRub: (v: number) => void;
	readonly setSplitSbpRub: (v: number) => void;
	readonly setActiveMethod: (m: PaymentMethodTab) => void;
}

export const PaymentFamilyDepositView: React.FC<
	PaymentFamilyDepositViewProps
> = ({
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	familyHeadName,
	familyGroupName,
	totalDueRub,
	amountRub,
	isSubmittingDeposit,
	handleDepositOrPartialCombo,
	setSplitDepositRub,
	setSplitCardRub,
	setSplitCashRub,
	setSplitSbpRub,
	setActiveMethod,
}) => {
	const displayAmount =
		amountRub && amountRub.trim() && amountRub !== "NaN"
			? `${amountRub} ₽`
			: formatMoneyClean(totalDueRub);

	return (
		<div className="space-y-3" data-testid="payment-family-deposit-view">
			<div className="space-y-2.5">
				<div className="flex items-center justify-between pb-0.5">
					<div className="flex items-center gap-2">
						<Wallet className="w-4 h-4 text-teal-600" />
						<h3 className="font-bold text-xs sm:text-sm m-0 text-[var(--ink,#0f172a)]">
							Оплата с депозита / семейного баланса
						</h3>
					</div>
					<span className="text-xs font-mono font-bold text-[var(--muted,#64748b)]">
						К списанию: {displayAmount}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
					{/* Personal Deposit Card */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2 flex flex-col justify-between">
						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)]">
									<Wallet size={14} className="text-teal-600" />
									<span>Лицевой счет (Аванс)</span>
								</div>
								<span className="font-mono text-xs font-extrabold text-teal-700 dark:text-teal-300">
									{patientDepositRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
								{patientDepositRub >= totalDueRub
									? "Средств на лицевом счете достаточно для полной оплаты."
									: patientDepositRub > 0
										? `Доступно ${formatMoneyClean(patientDepositRub)}. Недостает ${formatMoneyClean(Math.max(0, totalDueRub - patientDepositRub))}.`
										: "На лицевом счете пациента нет авансовых средств."}
							</p>
						</div>
						<button
							type="button"
							disabled={isSubmittingDeposit}
							onClick={() => handleDepositOrPartialCombo("deposit")}
							title={
								isSubmittingDeposit
									? "Выполняется списание с депозита..."
									: patientDepositRub >= totalDueRub
										? `Списать ${displayAmount} с личного депозита пациента`
										: patientDepositRub > 0
											? `Зачесть ${formatMoneyClean(patientDepositRub)} с аванса + остаток ${formatMoneyClean(Math.max(0, totalDueRub - patientDepositRub))} оплатить картой`
											: "Нажмите для проверки баланса или пополнения"
							}
							style={{
								padding: "7px 10px",
								fontSize: "11.5px",
								backgroundColor: "var(--paper-soft)",
								color: "var(--ink)",
								borderRadius: "8px",
								border: "1px solid var(--line)",
							}}
							className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold hover:border-teal-600 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
							data-testid="btn-pay-deposit-full"
						>
							{patientDepositRub >= totalDueRub ? (
								<>
									<CheckCircle size={13} className="text-teal-600 shrink-0" />
									<span>Списать {displayAmount} с депозита</span>
								</>
							) : patientDepositRub > 0 ? (
								<>
									<Zap size={13} className="text-teal-600 shrink-0" />
									<span>
										Зачесть аванс {formatMoneyClean(patientDepositRub)} +
										остаток картой
									</span>
								</>
							) : (
								<span>На депозите нет средств (0 ₽)</span>
							)}
						</button>
					</div>

					{/* Family Wallet Card */}
					<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] space-y-2 flex flex-col justify-between">
						<div className="space-y-1">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)]">
									<Users size={14} className="text-teal-600" />
									<span>Семейный общий баланс</span>
								</div>
								<span className="font-mono text-xs font-extrabold text-teal-700 dark:text-teal-300">
									{patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
								{patientFamilyBalanceRub >= totalDueRub
									? familyHeadName
										? `Баланс семьи: ${formatMoneyClean(patientFamilyBalanceRub)}, Глава: ${familyHeadName}. Покрывает 100% стоимости счета.`
										: "Семейный баланс покрывает 100% стоимости счета."
									: patientFamilyBalanceRub > 0
										? `${formatAvailableForDebitLabel(patientFamilyBalanceRub)}. Недостает ${formatMoneyClean(Math.max(0, totalDueRub - patientFamilyBalanceRub))}.`
										: "Семейный баланс пуст или не подключен."}
							</p>
						</div>
						<button
							type="button"
							disabled={isSubmittingDeposit}
							onClick={() => handleDepositOrPartialCombo("family")}
							title={
								isSubmittingDeposit
									? "Выполняется списание с семейного баланса..."
									: patientFamilyBalanceRub >= totalDueRub
										? familyHeadName
											? `Списать с семейного депозита (Баланс семьи: ${formatMoneyClean(patientFamilyBalanceRub)}, Глава: ${familyHeadName})`
											: `Списать ${displayAmount} с семейного депозита`
										: patientFamilyBalanceRub > 0
											? `Зачесть ${formatMoneyClean(patientFamilyBalanceRub)} из семьи + остаток ${formatMoneyClean(Math.max(0, totalDueRub - patientFamilyBalanceRub))} оплатить картой`
											: "Нажмите для проверки семейного счета или пополнения"
							}
							style={{
								padding: "7px 10px",
								fontSize: "11.5px",
								backgroundColor: "#0d9488",
								color: "#ffffff",
								borderRadius: "8px",
								border: "1px solid #0d9488",
							}}
							className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
							data-testid="btn-pay-family-full"
						>
							{patientFamilyBalanceRub >= totalDueRub ? (
								<>
									<CheckCircle size={13} className="shrink-0" />
									<span>
										{familyHeadName
											? `Списать с семейного депозита (Баланс семьи: ${formatMoneyClean(patientFamilyBalanceRub)}, Глава: ${familyHeadName})`
											: `Списать ${displayAmount} с семейного счета`}
									</span>
								</>
							) : patientFamilyBalanceRub > 0 ? (
								<>
									<Zap size={13} className="shrink-0" />
									<span>
										Зачесть из семьи {formatMoneyClean(patientFamilyBalanceRub)}{" "}
										+ остаток картой
									</span>
								</>
							) : (
								<span>Семейный баланс пуст (0 ₽)</span>
							)}
						</button>
					</div>
				</div>

				{/* Quick Combo Resolvers for Partial Balances */}
				{patientDepositRub < totalDueRub &&
					patientFamilyBalanceRub < totalDueRub &&
					(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
						<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
							<div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
								<Sparkles size={14} className="shrink-0" />
								<span>
									Недостаточно средств для 100% оплаты со счета. Выберите
									комбинированный вариант:
								</span>
							</div>

							<div className="flex items-center gap-2 flex-wrap">
								{/* Личный аванс + остаток Картой */}
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const depKop = Math.min(
												totalKop,
												rubToKopecks(patientDepositRub),
											);
											const remKop = Math.max(0, totalKop - depKop);
											setSplitDepositRub(kopecksToRub(depKop));
											setSplitCardRub(kopecksToRub(remKop));
											setSplitCashRub(0);
											setSplitSbpRub(0);
											setActiveMethod("split");
										}}
										className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-combo-deposit-card"
									>
										<CreditCard size={13} />
										<span>
											Зачесть аванс {formatMoneyClean(patientDepositRub)} +
											остаток Картой
										</span>
									</button>
								)}

								{/* Личный аванс + остаток Наличными */}
								{patientDepositRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const depKop = Math.min(
												totalKop,
												rubToKopecks(patientDepositRub),
											);
											const remKop = Math.max(0, totalKop - depKop);
											setSplitDepositRub(kopecksToRub(depKop));
											setSplitCashRub(kopecksToRub(remKop));
											setSplitCardRub(0);
											setSplitSbpRub(0);
											setActiveMethod("split");
										}}
										className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-combo-deposit-cash"
									>
										<Banknote size={13} />
										<span>
											Зачесть аванс {formatMoneyClean(patientDepositRub)} +
											остаток Наличными
										</span>
									</button>
								)}

								{/* Семейный баланс + остаток Картой */}
								{patientFamilyBalanceRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const famKop = Math.min(
												totalKop,
												rubToKopecks(patientFamilyBalanceRub),
											);
											const remKop = Math.max(0, totalKop - famKop);
											setSplitDepositRub(kopecksToRub(famKop));
											setSplitCardRub(kopecksToRub(remKop));
											setSplitCashRub(0);
											setSplitSbpRub(0);
											setActiveMethod("split");
										}}
										className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-combo-family-card"
									>
										<CreditCard size={13} />
										<span>
											Зачесть из семьи{" "}
											{formatMoneyClean(patientFamilyBalanceRub)} + остаток
											Картой
										</span>
									</button>
								)}

								{/* Семейный баланс + остаток Наличными */}
								{patientFamilyBalanceRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const famKop = Math.min(
												totalKop,
												rubToKopecks(patientFamilyBalanceRub),
											);
											const remKop = Math.max(0, totalKop - famKop);
											setSplitDepositRub(kopecksToRub(famKop));
											setSplitCashRub(kopecksToRub(remKop));
											setSplitCardRub(0);
											setSplitSbpRub(0);
											setActiveMethod("split");
										}}
										className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-combo-family-cash"
									>
										<Banknote size={13} />
										<span>
											Зачесть из семьи{" "}
											{formatMoneyClean(patientFamilyBalanceRub)} + остаток
											Наличными
										</span>
									</button>
								)}

								{/* Семейный баланс + остаток СБП QR */}
								{patientFamilyBalanceRub > 0 && (
									<button
										type="button"
										onClick={() => {
											const totalKop = rubToKopecks(totalDueRub);
											const famKop = Math.min(
												totalKop,
												rubToKopecks(patientFamilyBalanceRub),
											);
											const remKop = Math.max(0, totalKop - famKop);
											setSplitDepositRub(kopecksToRub(famKop));
											setSplitSbpRub(kopecksToRub(remKop));
											setSplitCardRub(0);
											setSplitCashRub(0);
											setActiveMethod("split");
										}}
										className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
										data-testid="btn-combo-family-sbp"
									>
										<QrCode size={13} />
										<span>
											Зачесть из семьи{" "}
											{formatMoneyClean(patientFamilyBalanceRub)} + остаток СБП
											QR
										</span>
									</button>
								)}
							</div>
						</div>
					)}
			</div>
		</div>
	);
};
