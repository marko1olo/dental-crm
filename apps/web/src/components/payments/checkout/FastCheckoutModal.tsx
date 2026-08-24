import React, { useState, useMemo, useEffect } from "react";
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
	WifiOff,
	Layers,
	RefreshCw,
} from "lucide-react";
import {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
} from "./fastCheckoutPresets";
import {
	validateCheckoutSplit,
	generate54FzFiscalPayload,
	DEFAULT_TREATMENT_STAGES,
	type CheckoutSplitItem,
	type Ffd12FiscalPayload,
	type TreatmentPlanStageOption,
} from "./fastCheckoutEngine";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager";
import { showToast } from "../../GlobalToast";
import "./fastCheckout.css";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly orderId?: string | undefined;
	readonly stages?: readonly TreatmentPlanStageOption[] | undefined;
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = ({
	isOpen,
	onClose,
	totalBillKop: initialTotalBillKop = 1960000,
	patientName = "Смирнова Екатерина Васильевна",
	patientPhone = "+7 (999) 123-45-67",
	orderId = "CHK-2026-891",
	stages = DEFAULT_TREATMENT_STAGES,
	onPaymentComplete,
}) => {
	const [selectedStageId, setSelectedStageId] = useState<string>("full_plan");
	const [activeMethod, setActiveMethod] = useState<CheckoutPaymentMethodType>("sbp_qr");
	const [cashTenderedRub, setCashTenderedRub] = useState<number>(0);
	const [isPrinting, setIsPrinting] = useState<boolean>(false);
	const [isOfflineBuffered, setIsOfflineBuffered] = useState<boolean>(false);
	const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
	const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);

	// Compute effective bill in kopecks from selected stage or fallback
	const effectiveBillKop = useMemo(() => {
		if (selectedStageId === "full_plan") {
			return initialTotalBillKop;
		}
		const stage = stages.find((s) => s.id === selectedStageId);
		return stage ? stage.amountKop : initialTotalBillKop;
	}, [selectedStageId, initialTotalBillKop, stages]);

	const [payments, setPayments] = useState<readonly CheckoutSplitItem[]>([
		{ method: "sbp_qr", amountKop: initialTotalBillKop },
	]);

	// Keep payments in sync when effectiveBillKop or activeMethod changes
	useEffect(() => {
		setPayments([{ method: activeMethod, amountKop: effectiveBillKop }]);
	}, [effectiveBillKop, activeMethod]);

	// Subscribe to offline fiscal queue manager
	useEffect(() => {
		const unsubscribe = FiscalReceiptQueueManager.subscribe((items) => {
			const pending = items.filter(
				(i) => i.status === "pending_print" || i.status === "hardware_offline"
			).length;
			setPendingOfflineCount(pending);
		});
		return unsubscribe;
	}, []);

	const validation = useMemo(() => {
		return validateCheckoutSplit({
			orderId,
			totalBillKop: effectiveBillKop,
			payments,
			cashTenderedKop: Math.round(cashTenderedRub * 100),
			patientPhone,
		});
	}, [orderId, effectiveBillKop, payments, cashTenderedRub, patientPhone]);

	if (!isOpen) return null;

	const handleStageSelect = (stageId: string) => {
		setSelectedStageId(stageId);
		setCashTenderedRub(0);
	};

	const handleSingle100Percent = (method: CheckoutPaymentMethodType) => {
		setActiveMethod(method);
		setPayments([{ method, amountKop: effectiveBillKop }]);
	};

	const handleExecutePayment = async () => {
		if (!validation.isValid) return;
		setIsPrinting(true);
		const payload = generate54FzFiscalPayload({
			orderId,
			totalBillKop: effectiveBillKop,
			payments,
			patientPhone,
		});

		try {
			// If offline or simulated KKT issue, enqueue safely
			if (!navigator.onLine) {
				FiscalReceiptQueueManager.enqueueReceipt(
					{
						operationType: "income",
						customerContact: patientPhone || "",
						cashierFullName: "Кассир",
						totalRub: effectiveBillKop / 100,
						items: [
							{
								name: "Стоматологические услуги по плану лечения",
								priceRub: effectiveBillKop / 100,
								quantity: 1,
								amountRub: effectiveBillKop / 100,
								paymentMethod: "full_payment",
								paymentSubject: "service",
							},
						],
						cashRub: payload.paymentsDistribution.cashKop / 100,
						electronicRub: payload.paymentsDistribution.electronicKop / 100,
						prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
						taxationSystem: "usn_income_expense",
					},
					"Офлайн-режим (потеря интернет-соединения)"
				);
				setIsOfflineBuffered(true);
				showToast(
					"Чек сохранен в локальную офлайн-очередь 54-ФЗ. Зависание ККТ исключено.",
					"info"
				);
			}

			if (onPaymentComplete) {
				onPaymentComplete(payload);
			}

			setTimeout(() => {
				setIsPrinting(false);
				onClose();
			}, 800);
		} catch {
			// Emergency buffer queue fallback
			FiscalReceiptQueueManager.enqueueReceipt(
				{
					operationType: "income",
					customerContact: patientPhone || "",
					cashierFullName: "Сидорова Анна Павловна",
					totalRub: effectiveBillKop / 100,
					items: [
						{
							name: "Стоматологические услуги по плану лечения",
							priceRub: effectiveBillKop / 100,
							quantity: 1,
							amountRub: effectiveBillKop / 100,
							paymentMethod: "full_payment",
							paymentSubject: "service",
						},
					],
					cashRub: payload.paymentsDistribution.cashKop / 100,
					electronicRub: payload.paymentsDistribution.electronicKop / 100,
					prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
					taxationSystem: "usn_income_expense",
				},
				"Аварийный сбой связи с ККТ"
			);
			setIsOfflineBuffered(true);
			showToast(
				"Сбой ККТ: чек помещен в локальный буфер автоповтора 54-ФЗ",
				"warning"
			);
			setIsPrinting(false);
			onClose();
		}
	};

	const handleFlushQueue = async () => {
		setIsFlushingQueue(true);
		const res = await FiscalReceiptQueueManager.flushAllPending();
		setIsFlushingQueue(false);
		showToast(
			`Синхронизировано ${res.printedCount} из ${res.totalProcessed} чеков офлайн-буфера`,
			res.failedCount === 0 ? "success" : "warning"
		);
	};

	return (
		<div className="fast-checkout-modal-overlay" data-testid="fast-checkout-modal">
			<div className="fast-checkout-modal-container max-w-3xl">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] flex items-center gap-2 m-0">
								1-Клик Оплата приема & Фискализация 54-ФЗ
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0 mt-0.5">
								{patientName} • Заказ #{orderId} • К оплате: <span className="font-bold font-mono text-teal-700 dark:text-teal-300">{(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] transition-colors cursor-pointer"
						aria-label="Закрыть быструю кассу"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Body Content */}
				<div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-5 flex-1">
					{/* Treatment Stage Selector */}
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Layers size={14} className="text-teal-600" />
								Выбор этапа сметы / плана лечения:
							</span>
							<span className="text-xs text-[var(--muted,#64748b)]">
								{stages.length} этапов в плане
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{stages.map((st) => {
								const isSelected = selectedStageId === st.id;
								return (
									<button
										key={st.id}
										type="button"
										onClick={() => handleStageSelect(st.id)}
										className={`min-h-[48px] p-2.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
											isSelected
												? "border-teal-600 bg-teal-500/10 text-teal-900 dark:text-teal-200 shadow-sm"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
										}`}
									>
										<span className="text-xs font-bold truncate">{st.titleRu}</span>
										<span className="text-xs font-mono font-extrabold text-teal-700 dark:text-teal-300">
											{(st.amountKop / 100).toLocaleString("ru-RU")} ₽
										</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* 1-Click Method Tiles (Elevated to 56px) */}
					<div className="space-y-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
							Способ оплаты (1 клик = 100%):
						</span>
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
										<span className="text-xs opacity-75 font-normal leading-none">(100%)</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* SBP QR Display Panel */}
					{activeMethod === "sbp_qr" && (
						<div className="p-5 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-3">
							<div className="w-44 h-44 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-4 shadow-md flex items-center justify-center border border-teal-500/30">
								<QrCode className="w-full h-full text-teal-600 dark:text-teal-400" />
							</div>
							<div className="text-xs text-[var(--ink,#0f172a)]">
								<p className="font-bold m-0">Отсканируйте камерой телефона или в приложении любого банка</p>
								<p className="text-[var(--muted,#64748b)] m-0 mt-1">Сумма: {(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ • Без комиссии для пациента (Тег 1081)</p>
							</div>
						</div>
					)}

					{/* Cash Quick Tender Buttons */}
					{activeMethod === "cash" && (
						<div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/30 flex flex-col gap-3">
							<div className="flex items-center justify-between">
								<span className="text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<Coins size={16} className="text-emerald-600" />
									Быстрый расчет сдачи с купюр:
								</span>
								<span className="text-xs text-[var(--muted,#64748b)]">
									К оплате: {(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
								</span>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								{[5000, 2000, 1000, 500].map((rub) => (
									<button
										key={rub}
										type="button"
										onClick={() => setCashTenderedRub((prev) => prev + rub)}
										className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-[var(--paper,#ffffff)] text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer transition-all active:scale-95"
									>
										+{rub} ₽
									</button>
								))}
								<button
									type="button"
									onClick={() => setCashTenderedRub(effectiveBillKop / 100)}
									className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-sm font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-all active:scale-95"
								>
									Без сдачи
								</button>
								{cashTenderedRub > 0 && (
									<button
										type="button"
										onClick={() => setCashTenderedRub(0)}
										className="min-h-[44px] px-3 rounded-xl border border-rose-500/30 text-rose-600 hover:bg-rose-500/10 text-xs font-bold cursor-pointer"
									>
										Сброс
									</button>
								)}
							</div>
							{cashTenderedRub > 0 && (
								<div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-xs font-bold">
									<div className="text-[var(--muted,#64748b)]">
										Внесено: <span className="font-mono text-[var(--ink,#0f172a)]">{cashTenderedRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
									</div>
									{cashTenderedRub >= effectiveBillKop / 100 ? (
										<div className="text-emerald-700 dark:text-emerald-300 font-mono text-sm">
											Сдача: {((cashTenderedRub * 100 - effectiveBillKop) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</div>
									) : (
										<div className="text-amber-600 font-mono">
											Не хватает: {((effectiveBillKop - cashTenderedRub * 100) / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* Emergency Offline Queue Status Banner */}
					{pendingOfflineCount > 0 && (
						<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
							<div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
								<WifiOff size={16} className="shrink-0" />
								<span>
									<strong>Офлайн-буфер 54-ФЗ:</strong> {pendingOfflineCount} чеков ожидают отправки на ККТ при восстановлении связи.
								</span>
							</div>
							<button
								type="button"
								onClick={handleFlushQueue}
								disabled={isFlushingQueue}
								className="min-h-[38px] px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
							>
								<RefreshCw size={14} className={isFlushingQueue ? "animate-spin" : ""} />
								<span>Синхронизировать</span>
							</button>
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
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleExecutePayment}
							disabled={!validation.isValid || isPrinting}
							className="min-h-[48px] px-6 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
						>
							{isPrinting ? (
								<>
									<Printer className="w-5 h-5 animate-spin" />
									Печать фискального чека 54-ФЗ...
								</>
							) : (
								<>
									<Check className="w-5 h-5" />
									Пробить чек 54-ФЗ ({(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

