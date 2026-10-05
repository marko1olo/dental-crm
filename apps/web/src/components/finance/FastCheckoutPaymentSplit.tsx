import React from "react";
import {
	CreditCard,
	Banknote,
	QrCode,
	Coins,
	Layers,
	Sparkles,
	Users,
	Check,
	AlertCircle,
	RefreshCw,
	Zap,
	ShieldCheck,
} from "lucide-react";
import {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
} from "../payments/checkout/fastCheckoutPresets";
import type { SbpDynamicQrResult } from "@dental/shared/fiscal";

export interface FastCheckoutPaymentSplitProps {
	readonly isSimpleCashierMode: boolean;
	readonly activeMethod: CheckoutPaymentMethodType;
	readonly onSelectMethod: (method: CheckoutPaymentMethodType) => void;
	readonly targetBillRub: number;
	readonly targetBillKop: number;
	readonly cardAmountRub: number;
	readonly setCardAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashAmountRub: number;
	readonly setCashAmountRub: (val: number) => void;
	readonly sbpAmountRub: number;
	readonly setSbpAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly depositAmountRub: number;
	readonly setDepositAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly loyaltyAmountRub: number;
	readonly setLoyaltyAmountRub: React.Dispatch<React.SetStateAction<number>>;
	readonly cashTenderedRub: number;
	readonly setCashTenderedRub: React.Dispatch<React.SetStateAction<number>>;
	readonly remainingRub: number;
	readonly remainingKop: number;
	readonly cashChange: {
		readonly changeDueKop: number;
		readonly missingKop: number;
		readonly isUnderpaid: boolean;
	};
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly sbpStatus: "awaiting" | "paid" | "failed";
	readonly isCheckingSbp: boolean;
	readonly sbpCheckMessage: string | null;
	readonly sbpQrData: {
		readonly payload: SbpDynamicQrResult;
		readonly svg: string;
	} | null;
	readonly effectiveSbpAmountRub: number;
	readonly onCheckSbpStatus: (manual?: boolean) => void;
	readonly onConfirmSbpManual: () => void;
	readonly onInputEnterKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly onAddRemainingToCard: () => void;
	readonly onAddRemainingToCash: () => void;
	readonly onAddRemainingToSbp: () => void;
	readonly onAddRemainingToDeposit: () => void;
	readonly onAddRemainingToLoyalty: () => void;
	readonly onAddRemainingToFamily: () => void;
	readonly onAddRemaining5050: () => void;
	readonly onAddRemainingDepositPlusCard?: () => void;
	readonly onSwitchToSplitMode?: () => void;
}

export const FastCheckoutPaymentSplit: React.FC<FastCheckoutPaymentSplitProps> = ({
	isSimpleCashierMode,
	activeMethod,
	onSelectMethod,
	targetBillRub,
	cardAmountRub,
	setCardAmountRub,
	cashAmountRub,
	setCashAmountRub,
	sbpAmountRub,
	setSbpAmountRub,
	depositAmountRub,
	setDepositAmountRub,
	loyaltyAmountRub,
	setLoyaltyAmountRub,
	cashTenderedRub,
	setCashTenderedRub,
	remainingRub,
	cashChange,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	familyPayerName = "",
	sbpStatus,
	isCheckingSbp,
	sbpCheckMessage,
	sbpQrData,
	effectiveSbpAmountRub,
	onCheckSbpStatus,
	onConfirmSbpManual,
	onInputEnterKeyDown,
	onAddRemainingToCard,
	onAddRemainingToCash,
	onAddRemainingToSbp,
	onAddRemainingToDeposit,
	onAddRemainingToLoyalty,
	onAddRemainingToFamily,
	onAddRemaining5050,
	onAddRemainingDepositPlusCard,
	onSwitchToSplitMode,
}) => {
	const totalAvailableDeposit = (patientDepositRub || 0) + (patientFamilyBalanceRub || 0);

	return (
		<div className="space-y-3" data-testid="fast-checkout-payment-split-root">
			{/* 1-Click Method Toolbar — Strictly 1 Row 32–36px per Hick's Law */}
			<div className="space-y-1.5">
				<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
					Способ оплаты:
				</span>
				{isSimpleCashierMode ? (
					<div
						className={`grid gap-2 ${totalAvailableDeposit > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
						data-testid="simple-cashier-methods"
					>
						<button
							type="button"
							onClick={() => onSelectMethod("bank_card")}
							className={`min-h-[50px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
								activeMethod === "bank_card"
									? "border-blue-600 bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-xs ring-1 ring-blue-500/30"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="simple-card-btn"
						>
							<CreditCard size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
							<span className="truncate">Картой</span>
						</button>

						<button
							type="button"
							onClick={() => onSelectMethod("cash")}
							className={`min-h-[50px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
								activeMethod === "cash"
									? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="simple-cash-btn"
						>
							<Banknote size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="truncate">Наличными</span>
						</button>

						<button
							type="button"
							onClick={() => onSelectMethod("sbp_qr")}
							className={`min-h-[50px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
								activeMethod === "sbp_qr"
									? "border-teal-600 bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-xs ring-1 ring-teal-500/30"
									: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
							}`}
							data-testid="simple-sbp-btn"
						>
							<QrCode size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="truncate">СБП QR</span>
						</button>

						{totalAvailableDeposit > 0 && (
							<button
								type="button"
								onClick={() => onSelectMethod("patient_deposit")}
								className={`min-h-[50px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95 ${
									activeMethod === "patient_deposit"
										? "border-amber-600 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-amber-400 text-[var(--ink,#0f172a)]"
								}`}
								data-testid="simple-deposit-btn"
								title={`Списать с депозита пациента (${totalAvailableDeposit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`}
							>
								<Coins size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span className="truncate">Депозит</span>
							</button>
						)}

						{onSwitchToSplitMode && (
							<button
								type="button"
								onClick={onSwitchToSplitMode}
								className="min-h-[50px] sm:min-h-[44px] h-auto py-2.5 px-3 rounded-xl border border-dashed border-teal-500/60 bg-teal-500/5 hover:bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center gap-1.5 font-extrabold text-sm transition-all cursor-pointer select-none active:scale-95"
								data-testid="simple-split-toggle-btn"
								title="Разделить оплату между несколькими источниками (Нал + Карта + СБП + Депозит)"
							>
								<Layers size={18} className="text-teal-600 dark:text-teal-400 shrink-0" />
								<span className="truncate">Сплит</span>
							</button>
						)}
					</div>
				) : (
					<div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] overflow-x-auto">
						{CHECKOUT_PAYMENT_METHODS.map((m) => {
							const isSelected = activeMethod === m.id;
							return (
								<button
									key={m.id}
									type="button"
									onClick={() => onSelectMethod(m.id)}
									className={
										"min-h-[44px] sm:h-8.5 px-3 rounded-xl border flex items-center gap-1.5 font-bold text-xs transition-all cursor-pointer select-none active:scale-95 whitespace-nowrap shrink-0 " +
										(isSelected
											? "border-teal-600 bg-teal-600 text-white shadow-xs"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 text-[var(--ink,#0f172a)]")
									}
								>
									{m.id === "sbp_qr" && (
										<QrCode size={14} className={isSelected ? "text-white" : "text-teal-600 dark:text-teal-400"} />
									)}
									{m.id === "bank_card" && (
										<CreditCard size={14} className={isSelected ? "text-white" : "text-blue-600 dark:text-blue-400"} />
									)}
									{m.id === "cash" && (
										<Banknote size={14} className={isSelected ? "text-white" : "text-emerald-600 dark:text-emerald-400"} />
									)}
									{m.id === "patient_deposit" && (
										<Coins size={14} className={isSelected ? "text-white" : "text-amber-600 dark:text-amber-400"} />
									)}
									{m.id === "dms_insurance" && (
										<ShieldCheck size={14} className={isSelected ? "text-white" : "text-purple-600 dark:text-purple-400"} />
									)}
									{m.id === "loyalty_points" && (
										<Sparkles size={14} className={isSelected ? "text-white" : "text-indigo-600 dark:text-indigo-400"} />
									)}
									<span>{m.titleRu.split(" ")[0]}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>

			{/* Split Payment Inputs & 1-Click Remainder Balancer (Visible in Split Mode) */}
			{!isSimpleCashierMode && (
				<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3" data-testid="split-payment-section">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
							<Layers size={14} className="text-teal-600" />
							Разделение оплаты (Сплит):
						</span>

						{/* 1-Click Remainder Balancer Buttons */}
						{remainingRub > 0 ? (
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-xs text-[var(--muted,#64748b)]">
									Остаток <strong className="font-mono text-amber-600 dark:text-amber-400">{remainingRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</strong>:
								</span>
								<button
									type="button"
									onClick={onAddRemainingToCard}
									className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition-all cursor-pointer select-none active:scale-95"
									title="Заполнить остаток картой"
									data-testid="split-fill-card-btn"
								>
									+ на Карту
								</button>
								<button
									type="button"
									onClick={onAddRemainingToCash}
									className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer select-none active:scale-95"
									title="Заполнить остаток наличными"
									data-testid="split-fill-cash-btn"
								>
									+ в Нал
								</button>
								<button
									type="button"
									onClick={onAddRemainingToSbp}
									className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-all cursor-pointer select-none active:scale-95"
									title="Заполнить остаток через СБП"
									data-testid="split-fill-sbp-btn"
								>
									+ в СБП
								</button>
								<button
									type="button"
									onClick={onAddRemainingToDeposit}
									className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer select-none active:scale-95"
									title="Заполнить остаток из депозита"
									data-testid="split-fill-deposit-btn"
								>
									+ в Депозит
								</button>
								{totalAvailableDeposit > 0 && remainingRub > 0 && onAddRemainingDepositPlusCard && (
									<button
										type="button"
										onClick={onAddRemainingDepositPlusCard}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-500/40 transition-all cursor-pointer select-none active:scale-95"
										title={`Использовать весь остаток депозита (${totalAvailableDeposit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽), а недостачу закрыть картой`}
										data-testid="split-fill-deposit-card-btn"
									>
										+ Депозит + Карта
									</button>
								)}
								<button
									type="button"
									onClick={onAddRemainingToLoyalty}
									className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer select-none active:scale-95"
									title="Заполнить остаток баллами"
									data-testid="split-fill-loyalty-btn"
								>
									+ в Бонусы
								</button>
								{patientFamilyBalanceRub > 0 && (
									<button
										type="button"
										onClick={onAddRemainingToFamily}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 transition-all cursor-pointer select-none active:scale-95"
										title={`Заполнить остаток из семейного счета (${familyPayerName || "семья"})`}
										data-testid="split-fill-family-btn"
									>
										+ из Семьи
									</button>
								)}
								<button
									type="button"
									onClick={onAddRemaining5050}
									className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-all cursor-pointer select-none active:scale-95"
									title="Разделить остаток 50/50 между картой и наличными (без копеечного дрейфа)"
									data-testid="split-fill-5050-btn"
								>
									+ 50/50 Нал + Карта
								</button>
							</div>
						) : remainingRub === 0 ? (
							<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
								<Check size={14} className="text-emerald-600" />
								<span>Чек сбалансирован</span>
							</div>
						) : (
							<div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
								<AlertCircle size={14} />
								<span>Переплата: {Math.abs(remainingRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
							</div>
						)}
					</div>

					{/* Quick Split Input Fields Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{/* Card */}
						<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
								<CreditCard size={14} className="text-blue-600" />
								<span>Банковская карта</span>
							</label>
							<div className="relative">
								<input
									type="number"
									min={0}
									step="0.01"
									value={cardAmountRub || ""}
									onChange={(e) => setCardAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
									onKeyDown={onInputEnterKeyDown}
									className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
									placeholder="0.00 ₽"
									data-testid="split-input-card"
								/>
								<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>

						{/* Cash */}
						<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
								<Banknote size={14} className="text-emerald-600" />
								<span>Наличные</span>
							</label>
							<div className="relative">
								<input
									type="number"
									min={0}
									step="0.01"
									value={cashAmountRub || ""}
									onChange={(e) => {
										const val = Math.max(0, parseFloat(e.target.value) || 0);
										setCashAmountRub(val);
										if (cashTenderedRub < val) {
											setCashTenderedRub(val);
										}
									}}
									onKeyDown={onInputEnterKeyDown}
									className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
									placeholder="0.00 ₽"
									data-testid="split-input-cash"
								/>
								<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>

						{/* SBP QR */}
						<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
								<QrCode size={14} className="text-purple-600" />
								<span>СБП QR</span>
							</label>
							<div className="relative">
								<input
									type="number"
									min={0}
									step="0.01"
									value={sbpAmountRub || ""}
									onChange={(e) => setSbpAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
									onKeyDown={onInputEnterKeyDown}
									className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
									placeholder="0.00 ₽"
									data-testid="split-input-sbp"
								/>
								<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>

						{/* Deposit / Prepayment */}
						<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between gap-1.5">
								<div className="flex items-center gap-1.5">
									<Coins size={14} className="text-amber-600" />
									<span>Депозит / Аванс</span>
								</div>
								{totalAvailableDeposit > 0 && (
									<span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold" data-testid="deposit-balance-badge">
										Доступно: {totalAvailableDeposit.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										{patientFamilyBalanceRub > 0 && familyPayerName ? ` (${familyPayerName})` : ""}
									</span>
								)}
							</label>
							<div className="relative">
								<input
									type="number"
									min={0}
									step="0.01"
									value={depositAmountRub || ""}
									onChange={(e) => setDepositAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
									onKeyDown={onInputEnterKeyDown}
									className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
									placeholder="0.00 ₽"
									data-testid="split-input-deposit"
								/>
								<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>

						{/* Loyalty / Bonus Points */}
						<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
							<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
								<Sparkles size={14} className="text-indigo-600" />
								<span>Бонусные баллы</span>
							</label>
							<div className="relative">
								<input
									type="number"
									min={0}
									step="0.01"
									value={loyaltyAmountRub || ""}
									onChange={(e) => setLoyaltyAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
									onKeyDown={onInputEnterKeyDown}
									className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
									placeholder="0.00 ₽"
									data-testid="split-input-loyalty"
								/>
								<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* SBP Dynamic QR Display Panel (НСПК / ГОСТ Р 56042-2014 & Auto-Receipt) */}
			{(sbpAmountRub > 0 || activeMethod === "sbp_qr") && (
				<div
					className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-3"
					data-testid="sbp-qr-display-panel"
				>
					<div className="flex items-center justify-between w-full flex-wrap gap-2 px-1">
						<span className="text-xs font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
							<Zap size={14} className="text-teal-600 dark:text-teal-400" />
							<span>Динамический QR-код СБП (НСПК)</span>
						</span>
						<span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-teal-500/15 text-teal-700 dark:text-teal-300 rounded-full border border-teal-500/20 flex items-center gap-1">
							СБП • НСПК ГОСТ Р 56042
						</span>
					</div>

					{sbpStatus === "paid" ? (
						<div className="w-full py-5 px-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col items-center justify-center gap-2 text-emerald-800 dark:text-emerald-200">
							<div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
								<Check size={24} />
							</div>
							<p className="font-extrabold text-sm m-0">Оплачено по СБП (Безналичный расчет)</p>
							<p className="text-xs font-mono font-bold m-0 text-emerald-700 dark:text-emerald-300">
								Сумма: {effectiveSbpAmountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</p>
							<span className="text-[11px] text-emerald-600 dark:text-emerald-400">
								Транзакция подтверждена • Кассовый чек успешно сформирован
							</span>
						</div>
					) : (
						<>
							<div
								className="w-40 h-40 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-2 shadow-md flex items-center justify-center border border-teal-500/30 overflow-hidden"
								data-testid="sbp-dynamic-qr-svg"
							>
								{sbpQrData ? (
									<div
										className="w-full h-full flex items-center justify-center"
										dangerouslySetInnerHTML={{ __html: sbpQrData.svg }}
									/>
								) : (
									<QrCode className="w-full h-full text-teal-600 dark:text-teal-400" />
								)}
							</div>
							<div className="text-xs text-[var(--ink)] space-y-1">
								<p className="font-bold m-0 text-[var(--ink)]">
									Отсканируйте камерой телефона или в приложении любого банка
								</p>
								<p className="text-[var(--muted)] m-0 font-mono text-[11px]">
									Сумма СБП: {effectiveSbpAmountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ • Без комиссии для пациента
								</p>
								{sbpCheckMessage && (
									<p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium m-0">
										{sbpCheckMessage}
									</p>
								)}
							</div>

							{/* 1-Click Status Verification & Cashier Autonomy (Mandates 8e, 8k) */}
							<div className="flex items-center gap-2 flex-wrap justify-center pt-1">
								<button
									type="button"
									onClick={() => onCheckSbpStatus(true)}
									disabled={isCheckingSbp}
									className="h-8 px-3 rounded-lg text-xs font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
									data-testid="btn-check-sbp-status"
									title="Опросить банковский шлюз СБП"
								>
									<RefreshCw size={13} className={isCheckingSbp ? "animate-spin" : ""} />
									<span>{isCheckingSbp ? "Проверка..." : "Проверить оплату"}</span>
								</button>
								<button
									type="button"
									onClick={onConfirmSbpManual}
									disabled={isCheckingSbp}
									className="h-8 px-3 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
									data-testid="btn-manual-confirm-sbp"
									title="Подтвердить зачисление средств по выписке/СМС банка (Мандат 8e)"
								>
									<Check size={13} />
									<span>Подтвердить вручную</span>
								</button>
							</div>
						</>
					)}
				</div>
			)}

			{/* Cash Quick Tender Buttons & Giant Change Calculator ("БАБУШКА-PROOF") */}
			{(cashAmountRub > 0 || activeMethod === "cash") && (
				<div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col gap-4 shadow-sm" data-testid="cash-tender-panel">
					<div className="flex items-center justify-between flex-wrap gap-1">
						<span className="text-sm font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
							<Coins size={20} className="text-emerald-600" />
							<span>Расчет сдачи с наличных:</span>
						</span>
						<span className="text-sm font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
							К оплате: {(cashAmountRub > 0 ? cashAmountRub : targetBillRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
						</span>
					</div>

					{/* Direct Denomination Buttons (Без сдачи, 1 000, 2 000, 5 000, 10 000) */}
					<div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
						<button
							type="button"
							onClick={() => setCashTenderedRub(cashAmountRub > 0 ? cashAmountRub : targetBillRub)}
							className="min-h-[48px] min-w-0 px-2.5 rounded-xl border-2 border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-black text-[var(--ink,#0f172a)] hover:border-emerald-500 cursor-pointer transition-all active:scale-95 truncate shadow-xs flex items-center justify-center"
							data-testid="btn-cash-exact"
							title="Внесено ровно без сдачи"
						>
							Без сдачи
						</button>
						{[1000, 2000, 5000, 10000].map((rub) => (
							<button
								key={rub}
								type="button"
								onClick={() => setCashTenderedRub(rub)}
								className="min-h-[48px] min-w-0 px-2.5 rounded-xl border-2 border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-black font-mono text-[var(--ink,#0f172a)] hover:border-emerald-500 cursor-pointer transition-all active:scale-95 truncate shadow-xs flex items-center justify-center"
								data-testid={`btn-cash-${rub}`}
							>
								{rub.toLocaleString("ru-RU")} ₽
							</button>
						))}
					</div>

					{/* Giant Bill Buttons (+5000, +2000, +1000, +500, +100, Ровно, Сброс) */}
					<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
						{[5000, 2000, 1000, 500, 100].map((rub) => (
							<button
								key={rub}
								type="button"
								onClick={() => setCashTenderedRub((prev) => prev + rub)}
								className="min-h-[52px] min-w-0 px-2 rounded-xl border-2 border-emerald-500/40 bg-[var(--paper,#ffffff)] text-base font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center relative"
								data-testid={`cash-add-${rub}-btn`}
							>
								+{rub} ₽
								<span data-testid={`btn-cash-add-${rub}`} className="sr-only" aria-hidden="true" />
							</button>
						))}
						<button
							type="button"
							onClick={() => setCashTenderedRub(cashAmountRub > 0 ? cashAmountRub : targetBillRub)}
							className="min-h-[52px] min-w-0 px-2 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center"
							data-testid="cash-exact-btn"
						>
							Ровно
						</button>
						<button
							type="button"
							onClick={() => setCashTenderedRub(0)}
							className="min-h-[52px] min-w-0 px-2 rounded-xl border-2 border-rose-500/30 bg-[var(--paper,#ffffff)] text-rose-600 hover:bg-rose-500/10 text-sm font-extrabold cursor-pointer transition-all active:scale-95 flex items-center justify-center"
							data-testid="cash-reset-btn"
						>
							Сброс
						</button>
					</div>

					{/* Giant Change Calculation Display */}
					<div className="p-4 rounded-xl bg-[var(--paper,#ffffff)] border-2 border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-3">
						<div className="flex flex-col">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">Внесено наличных:</span>
							<span className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
								{cashTenderedRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
							</span>
						</div>

						<div className="flex flex-col items-end">
							{cashTenderedRub === 0 ? (
								<span className="text-sm font-bold text-[var(--muted,#64748b)]">
									Нажмите купюру или кнопку «Ровно»
								</span>
							) : !cashChange.isUnderpaid && cashChange.changeDueKop > 0 ? (
								<>
									<span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Сдача пациенту:</span>
									<span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400" data-testid="cash-change-due-amount">
										+{(cashChange.changeDueKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</span>
								</>
							) : !cashChange.isUnderpaid && cashChange.changeDueKop === 0 ? (
								<span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5" data-testid="cash-change-exact">
									<Check size={20} className="inline mr-1 shrink-0 text-emerald-500" />
									<span>БЕЗ СДАЧИ (РОВНО)</span>
								</span>
							) : (
								<>
									<span className="text-xs font-bold uppercase tracking-wider text-rose-600">Не хватает:</span>
									<span className="text-2xl sm:text-3xl font-black font-mono text-rose-600" data-testid="cash-missing-amount">
										-{(cashChange.missingKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</span>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
