import React, { useState, useMemo } from "react";
import {
	QrCode,
	CreditCard,
	Banknote,
	Coins,
	ShieldCheck,
	Sparkles,
	X,
	Printer,
	Check,
	AlertCircle,
} from "lucide-react";
import {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
} from "./fastCheckoutPresets";
import {
	validateCheckoutSplit,
	generate54FzFiscalPayload,
	type CheckoutSplitItem,
	type Ffd12FiscalPayload,
} from "./fastCheckoutEngine";
import "./fastCheckout.css";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly orderId?: string | undefined;
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = ({
	isOpen,
	onClose,
	totalBillKop = 1960000,
	patientName = "Смирнова Екатерина Васильевна",
	patientPhone = "+7 (999) 123-45-67",
	orderId = "CHK-2026-891",
	onPaymentComplete,
}) => {
	const [activeMethod, setActiveMethod] = useState<CheckoutPaymentMethodType>("sbp_qr");
	const [payments, setPayments] = useState<readonly CheckoutSplitItem[]>([
		{ method: "sbp_qr", amountKop: totalBillKop },
	]);
	const [cashTenderedRub, setCashTenderedRub] = useState<number>(0);
	const [isPrinting, setIsPrinting] = useState<boolean>(false);

	const validation = useMemo(() => {
		return validateCheckoutSplit({
			orderId,
			totalBillKop,
			payments,
			cashTenderedKop: Math.round(cashTenderedRub * 100),
			patientPhone,
		});
	}, [orderId, totalBillKop, payments, cashTenderedRub, patientPhone]);

	if (!isOpen) return null;

	const handleSingle100Percent = (method: CheckoutPaymentMethodType) => {
		setActiveMethod(method);
		setPayments([{ method, amountKop: totalBillKop }]);
	};

	const handleExecutePayment = () => {
		if (!validation.isValid) return;
		setIsPrinting(true);
		const payload = generate54FzFiscalPayload({
			orderId,
			totalBillKop,
			payments,
			patientPhone,
		});
		if (onPaymentComplete) {
			onPaymentComplete(payload);
		}
		setTimeout(() => {
			setIsPrinting(false);
			onClose();
		}, 1000);
	};

	return (
		<div className="fast-checkout-modal-overlay" data-testid="fast-checkout-modal">
			<div className="fast-checkout-modal-container">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2">
								1-Клик Оплата приема & Фискализация 54-ФЗ
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{patientName} • Заказ #{orderId} • К оплате: <span className="font-bold text-[var(--ink,#0f172a)]">{(totalBillKop / 100).toLocaleString("ru-RU")} ₽</span>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* 1-Click Method Tiles (Elevated to 56px) */}
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
						{CHECKOUT_PAYMENT_METHODS.map((m) => {
							const isSelected = activeMethod === m.id;
							return (
								<button
									key={m.id}
									type="button"
									onClick={() => handleSingle100Percent(m.id)}
									className={"min-h-[56px] p-2 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 font-bold transition-all cursor-pointer select-none active:scale-95 " + (
										isSelected
											? "border-teal-600 bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-md ring-2 ring-teal-500/30"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
									)}
								>
									{m.id === "sbp_qr" && <QrCode size={16} className="text-teal-600 dark:text-teal-400" />}
									{m.id === "bank_card" && <CreditCard size={16} className="text-blue-600 dark:text-blue-400" />}
									{m.id === "cash" && <Banknote size={16} className="text-emerald-600 dark:text-emerald-400" />}
									{m.id === "patient_deposit" && <Coins size={16} className="text-amber-600 dark:text-amber-400" />}
									{m.id === "dms_insurance" && <ShieldCheck size={16} className="text-purple-600 dark:text-purple-400" />}
									{m.id === "loyalty_points" && <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />}
									<span className="text-xs font-bold whitespace-nowrap">{m.titleRu.split(" ")[0]}</span>
									<span className="text-[10px] opacity-75 font-normal leading-none">(100%)</span>
								</button>
							);
						})}
					</div>

					{/* SBP QR Display Panel */}
					{activeMethod === "sbp_qr" && (
						<div className="p-5 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-3">
							<div className="w-44 h-44 rounded-2xl bg-white p-3 shadow-md flex items-center justify-center border border-teal-500/20">
								<QrCode className="w-full h-full text-slate-900" />
							</div>
							<div className="text-xs text-[var(--ink,#0f172a)]">
								<p className="font-bold">Отсканируйте камерой телефона или в приложении любого банка</p>
								<p className="text-[var(--muted,#64748b)]">Сумма: {(totalBillKop / 100).toLocaleString("ru-RU")} ₽ • Без комиссии для пациента</p>
							</div>
						</div>
					)}

					{/* Cash Quick Tender Buttons */}
					{activeMethod === "cash" && (
						<div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 flex flex-col gap-3">
							<span className="text-xs font-bold text-[var(--ink,#0f172a)]">Быстрый расчет сдачи:</span>
							<div className="flex items-center gap-2 flex-wrap">
								{[5000, 2000, 1000, 500].map((rub) => (
									<button
										key={rub}
										type="button"
										onClick={() => setCashTenderedRub((prev) => prev + rub)}
										className="h-9 px-3 rounded-xl border border-emerald-500/40 bg-[var(--paper,#ffffff)] text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
									>
										+{rub} ₽
									</button>
								))}
								<button
									type="button"
									onClick={() => setCashTenderedRub((totalBillKop || 1960000) / 100)}
									className="h-9 px-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-medium text-[var(--muted,#64748b)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
								>
									Без сдачи
								</button>
							</div>
							{cashTenderedRub > (totalBillKop || 1960000) / 100 && (
								<div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
									Сдача пациенту: {((cashTenderedRub * 100 - (totalBillKop || 1960000)) / 100).toFixed(2)} ₽
								</div>
							)}
						</div>
					)}

					{/* Validation Alert */}
					{!validation.isValid && (
						<div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
							<AlertCircle className="w-4 h-4 shrink-0" />
							<span>{validation.errorMessageRu}</span>
						</div>
					)}
				</div>

				{/* Footer Actions */}
				<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between flex-wrap gap-3">
					<div className="text-xs text-[var(--muted,#64748b)]">
						ФФД 1.2 • Чек будет отправлен на {patientPhone}
					</div>
					<button
						type="button"
						onClick={handleExecutePayment}
						disabled={!validation.isValid || isPrinting}
						className="h-11 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
					>
						{isPrinting ? (
							<>
								<Printer className="w-4 h-4 animate-spin" />
								Печать фискального чека 54-ФЗ...
							</>
						) : (
							<>
								<Check className="w-4 h-4" />
								Пробить чек 54-ФЗ ({((totalBillKop || 1960000) / 100).toLocaleString("ru-RU")} ₽)
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};
