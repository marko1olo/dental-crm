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
	ArrowRight,
	Save,
	Globe,
	Users,
	ChevronDown,
	Zap,
} from "lucide-react";
import {
	convertRubToForeignCurrency,
	type SupportedCurrency,
	CBR_CURRENCIES,
	buildFiscalReceiptPayloadSignature,
	createFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
} from "./fastCheckoutPresets";
import {
	validateCheckoutSplit,
	generate54FzFiscalPayload,
	calculateStageAdvanceAmount,
	DEFAULT_TREATMENT_STAGES,
	splitStateToCheckoutPayments,
	calculateSplitRemainingKop,
	calculateCashChangeKop,
	type CheckoutSplitItem,
	type Ffd12FiscalPayload,
	type TreatmentPlanStageOption,
	type StagePaymentMode,
} from "./fastCheckoutEngine";
import { FiscalReceiptQueueManager } from "../../../services/hardware/fiscalReceiptQueueManager";
import { showToast } from "../../GlobalToast";
import "./fastCheckout.css";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly initialPaymentMethod?: CheckoutPaymentMethodType | undefined;
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
	initialPaymentMethod,
	patientName = "Смирнова Екатерина Васильевна",
	patientPhone = "+7 (999) 123-45-67",
	orderId = "CHK-2026-891",
	stages = DEFAULT_TREATMENT_STAGES,
	onPaymentComplete,
}) => {
	const [selectedStageId, setSelectedStageId] = useState<string>("full_plan");
	const [stagePaymentMode, setStagePaymentMode] = useState<StagePaymentMode>("full");
	const [advanceAlreadyPaidRub, setAdvanceAlreadyPaidRub] = useState<number>(15000);
	const [activeMethod, setActiveMethod] = useState<CheckoutPaymentMethodType>(
		initialPaymentMethod ?? "sbp_qr"
	);

	// Split Payment State (amounts in Rubles)
	const [cardAmountRub, setCardAmountRub] = useState<number>(0);
	const [cashAmountRub, setCashAmountRub] = useState<number>(0);
	const [sbpAmountRub, setSbpAmountRub] = useState<number>(0);
	const [depositAmountRub, setDepositAmountRub] = useState<number>(0);
	const [loyaltyAmountRub, setLoyaltyAmountRub] = useState<number>(0);
	const [dmsAmountRub, setDmsAmountRub] = useState<number>(0);
	const [cashTenderedRub, setCashTenderedRub] = useState<number>(0);

	const [isPrinting, setIsPrinting] = useState<boolean>(false);
	const [isOfflineBuffered, setIsOfflineBuffered] = useState<boolean>(false);
	const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
	const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);

	useEffect(() => {
		if (isOpen && initialPaymentMethod) {
			setActiveMethod(initialPaymentMethod);
		}
	}, [isOpen, initialPaymentMethod]);
	const [isTier2Open, setIsTier2Open] = useState<boolean>(false);
	const [isSimpleCashierMode, setIsSimpleCashierMode] = useState<boolean>(true);
	const [selectedForeignCurrency, setSelectedForeignCurrency] = useState<SupportedCurrency>("USD");

	// Compute base stage amount in kopecks from selected stage or fallback
	const baseStageAmountKop = useMemo(() => {
		if (selectedStageId === "full_plan") {
			return initialTotalBillKop;
		}
		const stage = stages.find((s) => s.id === selectedStageId);
		return stage ? stage.amountKop : initialTotalBillKop;
	}, [selectedStageId, initialTotalBillKop, stages]);

	// Compute advance & 54-FZ Tag 1215 calculation
	const stageCalc = useMemo(() => {
		return calculateStageAdvanceAmount(
			baseStageAmountKop,
			stagePaymentMode,
			Math.round(advanceAlreadyPaidRub * 100)
		);
	}, [baseStageAmountKop, stagePaymentMode, advanceAlreadyPaidRub]);

	const effectiveBillKop = stageCalc.requiredAmountKop;
	const targetBillKop = stagePaymentMode === "advance_offset_tag1215"
		? baseStageAmountKop
		: effectiveBillKop;
	const targetBillRub = targetBillKop / 100;

	const foreignCalc = useMemo(() => {
		return convertRubToForeignCurrency({
			amountRubKopecks: effectiveBillKop,
			targetCurrency: selectedForeignCurrency,
			bankSpreadPercent: 2.0,
		});
	}, [effectiveBillKop, selectedForeignCurrency]);

	// Sync split payments when modal opens or stage/mode changes
	useEffect(() => {
		if (!isOpen) return;

		setCardAmountRub(0);
		setCashAmountRub(0);
		setSbpAmountRub(0);
		setDepositAmountRub(0);
		setLoyaltyAmountRub(0);
		setDmsAmountRub(0);
		setCashTenderedRub(0);

		if (stagePaymentMode === "advance_offset_tag1215") {
			const offsetRub = stageCalc.advanceOffsetTag1215Kop / 100;
			const reqRub = stageCalc.requiredAmountKop / 100;
			setDepositAmountRub(offsetRub);

			if (activeMethod === "cash") {
				setCashAmountRub(reqRub);
				setCashTenderedRub(reqRub);
			} else if (activeMethod === "sbp_qr") {
				setSbpAmountRub(reqRub);
			} else if (activeMethod === "loyalty_points") {
				setLoyaltyAmountRub(reqRub);
			} else if (activeMethod === "dms_insurance") {
				setDmsAmountRub(reqRub);
			} else {
				setCardAmountRub(reqRub);
			}
		} else {
			if (activeMethod === "cash") {
				setCashAmountRub(targetBillRub);
				setCashTenderedRub(targetBillRub);
			} else if (activeMethod === "sbp_qr") {
				setSbpAmountRub(targetBillRub);
			} else if (activeMethod === "patient_deposit") {
				setDepositAmountRub(targetBillRub);
			} else if (activeMethod === "loyalty_points") {
				setLoyaltyAmountRub(targetBillRub);
			} else if (activeMethod === "dms_insurance") {
				setDmsAmountRub(targetBillRub);
			} else {
				setCardAmountRub(targetBillRub);
			}
		}
	}, [
		isOpen,
		targetBillKop,
		stagePaymentMode,
		stageCalc.advanceOffsetTag1215Kop,
		stageCalc.requiredAmountKop,
	]);

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

	const payments = useMemo<readonly CheckoutSplitItem[]>(() => {
		return splitStateToCheckoutPayments({
			cardRub: cardAmountRub,
			cashRub: cashAmountRub,
			sbpRub: sbpAmountRub,
			depositRub: depositAmountRub,
			loyaltyRub: loyaltyAmountRub,
			dmsRub: dmsAmountRub,
		});
	}, [cardAmountRub, cashAmountRub, sbpAmountRub, depositAmountRub, loyaltyAmountRub, dmsAmountRub]);

	const remainingKop = useMemo(() => {
		return calculateSplitRemainingKop(targetBillKop, payments);
	}, [targetBillKop, payments]);

	const remainingRub = useMemo(() => {
		return +(remainingKop / 100).toFixed(2);
	}, [remainingKop]);

	const cashChange = useMemo(() => {
		return calculateCashChangeKop(
			Math.round(cashTenderedRub * 100),
			Math.round(cashAmountRub * 100)
		);
	}, [cashTenderedRub, cashAmountRub]);

	const validation = useMemo(() => {
		return validateCheckoutSplit({
			orderId,
			totalBillKop: targetBillKop,
			payments,
			cashTenderedKop: Math.round(cashTenderedRub * 100),
			patientPhone,
		});
	}, [
		orderId,
		targetBillKop,
		payments,
		cashTenderedRub,
		patientPhone,
	]);

	if (!isOpen) return null;

	const handleStageSelect = (stageId: string) => {
		setSelectedStageId(stageId);
		setCashTenderedRub(0);
	};

	const handleSingle100Percent = (method: CheckoutPaymentMethodType) => {
		setActiveMethod(method);
		setCardAmountRub(0);
		setCashAmountRub(0);
		setSbpAmountRub(0);
		setDepositAmountRub(0);
		setLoyaltyAmountRub(0);
		setDmsAmountRub(0);
		setCashTenderedRub(0);

		if (stagePaymentMode === "advance_offset_tag1215") {
			const offsetRub = stageCalc.advanceOffsetTag1215Kop / 100;
			const reqRub = stageCalc.requiredAmountKop / 100;
			setDepositAmountRub(offsetRub);

			if (method === "cash") {
				setCashAmountRub(reqRub);
				setCashTenderedRub(reqRub);
			} else if (method === "sbp_qr") {
				setSbpAmountRub(reqRub);
			} else if (method === "loyalty_points") {
				setLoyaltyAmountRub(reqRub);
			} else if (method === "dms_insurance") {
				setDmsAmountRub(reqRub);
			} else {
				setCardAmountRub(reqRub);
			}
		} else {
			if (method === "cash") {
				setCashAmountRub(targetBillRub);
				setCashTenderedRub(targetBillRub);
			} else if (method === "sbp_qr") {
				setSbpAmountRub(targetBillRub);
			} else if (method === "patient_deposit") {
				setDepositAmountRub(targetBillRub);
			} else if (method === "loyalty_points") {
				setLoyaltyAmountRub(targetBillRub);
			} else if (method === "dms_insurance") {
				setDmsAmountRub(targetBillRub);
			} else {
				setCardAmountRub(targetBillRub);
			}
		}
	};

	const handleAddRemainingToCard = () => {
		if (remainingRub <= 0) return;
		setCardAmountRub((prev) => +(prev + remainingRub).toFixed(2));
	};

	const handleAddRemainingToCash = () => {
		if (remainingRub <= 0) return;
		const nextCash = +(cashAmountRub + remainingRub).toFixed(2);
		setCashAmountRub(nextCash);
		if (cashTenderedRub < nextCash) {
			setCashTenderedRub(nextCash);
		}
	};

	const handleAddRemainingToSbp = () => {
		if (remainingRub <= 0) return;
		setSbpAmountRub((prev) => +(prev + remainingRub).toFixed(2));
	};

	const handleAddRemainingToDeposit = () => {
		if (remainingRub <= 0) return;
		setDepositAmountRub((prev) => +(prev + remainingRub).toFixed(2));
	};

	const handleAddRemainingToLoyalty = () => {
		if (remainingRub <= 0) return;
		setLoyaltyAmountRub((prev) => +(prev + remainingRub).toFixed(2));
	};

	const handleExecutePayment = async () => {
		if (!validation.isValid || isPrinting) return;
		setIsPrinting(true);

		// Statutory composite Idempotency-Key: <uuid>#<sha256(canonicalPayloadSignature)>
		const rawUuid = crypto.randomUUID();
		const signature = buildFiscalReceiptPayloadSignature({
			patientId: orderId,
			operationType: "income",
			taxationSystem: "usn_income",
			totalKopecks: targetBillKop,
			cashKopecks: Math.round(cashAmountRub * 100),
			electronicCardKopecks: Math.round(cardAmountRub * 100),
			sbpKopecks: Math.round(sbpAmountRub * 100),
			prepaidKopecks: Math.round((depositAmountRub + loyaltyAmountRub) * 100),
			items: [
				{
					name: "Стоматологические услуги по плану лечения",
					priceKopecks: targetBillKop,
					quantity: 1,
					amountKopecks: targetBillKop,
					subject: "service",
					method: "full_payment",
					vatRate: "vat_none",
				},
			],
		});
		const compositeIdempotencyKey = createFiscalCompositeIdempotencyKey(rawUuid, signature);

		const payload = generate54FzFiscalPayload(
			{
				orderId,
				totalBillKop: targetBillKop,
				payments,
				patientPhone,
				idempotencyKey: compositeIdempotencyKey,
			},
			{
				paymentMethodTag1214: stageCalc.ffdTag1214,
				paymentSubjectTag1212: stageCalc.ffdTag1212,
				idempotencyKey: compositeIdempotencyKey,
			}
		);

		try {
			// If offline or simulated KKT issue, enqueue safely
			if (!navigator.onLine) {
				FiscalReceiptQueueManager.enqueueReceipt(
					{
						operationType: "income",
						customerContact: patientPhone || "",
						cashierFullName: "Кассир",
						totalRub: targetBillRub,
						items: [
							{
								name: "Стоматологические услуги по плану лечения",
								priceRub: targetBillRub,
								quantity: 1,
								amountRub: targetBillRub,
								paymentMethod: "full_payment",
								paymentSubject: "service",
							},
						],
						cashRub: payload.paymentsDistribution.cashKop / 100,
						electronicRub: payload.paymentsDistribution.electronicKop / 100,
						prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
						taxationSystem: "usn_income_expense",
					},
					"Офлайн-режим (потеря интернет-соединения)",
					compositeIdempotencyKey
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
					totalRub: targetBillRub,
					items: [
						{
							name: "Стоматологические услуги по плану лечения",
							priceRub: targetBillRub,
							quantity: 1,
							amountRub: targetBillRub,
							paymentMethod: "full_payment",
							paymentSubject: "service",
						},
					],
					cashRub: payload.paymentsDistribution.cashKop / 100,
					electronicRub: payload.paymentsDistribution.electronicKop / 100,
					prepaidRub: payload.paymentsDistribution.advancePrepaymentKop / 100,
					taxationSystem: "usn_income_expense",
				},
				"Аварийный сбой связи с ККТ",
				compositeIdempotencyKey
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
					{/* Step-by-Step Guidance Ribbon & Autosave Status */}
					<div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-xs flex-wrap">
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px]">1</span>
							<span>Шаг 1: Способ оплаты</span>
						</div>
						<ArrowRight size={12} className="text-[var(--muted,#64748b)]" />
						<div className="flex items-center gap-1.5 font-bold text-teal-700 dark:text-teal-300">
							<span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px]">2</span>
							<span>Шаг 2: Проверка суммы</span>
						</div>
						<ArrowRight size={12} className="text-[var(--muted,#64748b)]" />
						<div className={`flex items-center gap-1.5 font-bold ${validation.isValid ? "text-emerald-700 dark:text-emerald-300" : "text-amber-600"}`}>
							<span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${validation.isValid ? "bg-emerald-600" : "bg-amber-500"} text-white text-[10px]`}>3</span>
							<span>Шаг 3: Пробить чек 54-ФЗ</span>
						</div>
						<button
							type="button"
							onClick={() => setIsSimpleCashierMode((prev) => !prev)}
							className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ml-auto flex items-center gap-1.5 ${
								isSimpleCashierMode
									? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/30"
									: "bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-500"
							}`}
							title="Переключить крупный режим «Простая касса» для медсестры/кассира"
							data-testid="toggle-simple-cashier-btn"
						>
							<span>👵 Простая касса</span>
							<span className="text-[10px] opacity-90 font-mono">[{isSimpleCashierMode ? "Крупно" : "Сплит"}]</span>
						</button>
					</div>

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

					{/* Stage Advance Mode Selection (100% / Аванс 30% / Аванс 50% / Зачет аванса Тег 1215) */}
					<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col gap-2">
						<div className="flex items-center justify-between flex-wrap gap-1">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Sparkles size={14} className="text-teal-600" />
								Режим фискализации этапа (54-ФЗ):
							</span>
							<span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
								Тег 1214: {stageCalc.ffdTag1214NameRu}
							</span>
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							<button
								type="button"
								onClick={() => setStagePaymentMode("full")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "full"
										? "border-teal-600 bg-teal-500/15 text-teal-900 dark:text-teal-200 shadow-xs ring-1 ring-teal-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-teal-400"
								}`}
							>
								<span>100% Оплата</span>
								<span className="text-xs font-mono opacity-80">{(baseStageAmountKop / 100).toLocaleString("ru-RU")} ₽</span>
							</button>
							<button
								type="button"
								onClick={() => setStagePaymentMode("advance_30")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "advance_30"
										? "border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-xs ring-1 ring-amber-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-amber-400"
								}`}
							>
								<span>Аванс 30%</span>
								<span className="text-xs font-mono opacity-80">{Math.round(baseStageAmountKop * 0.3 / 100).toLocaleString("ru-RU")} ₽</span>
							</button>
							<button
								type="button"
								onClick={() => setStagePaymentMode("advance_50")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "advance_50"
										? "border-amber-600 bg-amber-500/15 text-amber-900 dark:text-amber-200 shadow-xs ring-1 ring-amber-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-amber-400"
								}`}
							>
								<span>Аванс 50%</span>
								<span className="text-xs font-mono opacity-80">{Math.round(baseStageAmountKop * 0.5 / 100).toLocaleString("ru-RU")} ₽</span>
							</button>
							<button
								type="button"
								onClick={() => setStagePaymentMode("advance_offset_tag1215")}
								className={`min-h-[44px] px-2.5 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col justify-center items-center transition-all cursor-pointer ${
									stagePaymentMode === "advance_offset_tag1215"
										? "border-purple-600 bg-purple-500/15 text-purple-900 dark:text-purple-200 shadow-xs ring-1 ring-purple-500/30"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-purple-400"
								}`}
							>
								<span>Зачет аванса (1215)</span>
								<span className="text-xs font-mono opacity-80">Доплата {(stageCalc.requiredAmountKop / 100).toLocaleString("ru-RU")} ₽</span>
							</button>
						</div>

						{stagePaymentMode === "advance_offset_tag1215" && (
							<div className="mt-1 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between flex-wrap gap-2 text-purple-950 dark:text-purple-100">
								<div>
									<strong>Зачет ранее внесенного аванса:</strong> {(stageCalc.advanceOffsetTag1215Kop / 100).toLocaleString("ru-RU")} ₽ по Тегу 1215 54-ФЗ
								</div>
								<div className="font-mono font-bold">
									К доплате сейчас: {(stageCalc.requiredAmountKop / 100).toLocaleString("ru-RU")} ₽
								</div>
							</div>
						)}
					</div>

					{/* 1-Click Method Tiles (Elevated to 56px / 64px) */}
					<div className="space-y-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
							Способ оплаты (1 клик = 100%):
						</span>
						{isSimpleCashierMode ? (
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="simple-cashier-methods">
								<button
									type="button"
									onClick={() => handleSingle100Percent("bank_card")}
									className={`min-h-[64px] p-3 rounded-2xl border-2 flex items-center justify-center gap-3 font-extrabold text-base transition-all cursor-pointer select-none active:scale-95 ${
										activeMethod === "bank_card"
											? "border-blue-600 bg-blue-500/15 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500/30"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-blue-400 text-[var(--ink,#0f172a)]"
									}`}
									data-testid="simple-card-btn"
								>
									<CreditCard size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
									<span>💳 КАРТОЙ (100%)</span>
								</button>

								<button
									type="button"
									onClick={() => handleSingle100Percent("cash")}
									className={`min-h-[64px] p-3 rounded-2xl border-2 flex items-center justify-center gap-3 font-extrabold text-base transition-all cursor-pointer select-none active:scale-95 ${
										activeMethod === "cash"
											? "border-emerald-600 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-md ring-2 ring-emerald-500/30"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-emerald-400 text-[var(--ink,#0f172a)]"
									}`}
									data-testid="simple-cash-btn"
								>
									<Banknote size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
									<span>💵 НАЛИЧНЫМИ (100%)</span>
								</button>

								<button
									type="button"
									onClick={() => handleSingle100Percent("sbp_qr")}
									className={`min-h-[64px] p-3 rounded-2xl border-2 flex items-center justify-center gap-3 font-extrabold text-base transition-all cursor-pointer select-none active:scale-95 ${
										activeMethod === "sbp_qr"
											? "border-teal-600 bg-teal-500/15 text-teal-700 dark:text-teal-300 shadow-md ring-2 ring-teal-500/30"
											: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
									}`}
									data-testid="simple-sbp-btn"
								>
									<QrCode size={24} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span>📱 ПО QR-КОДУ СБП</span>
								</button>
							</div>
						) : (
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
						)}
					</div>

					{/* Split Payment Inputs & 1-Click Remainder Balancer (Visible in Split Mode) */}
					{!isSimpleCashierMode && (
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-3" data-testid="split-payment-section">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Layers size={14} className="text-teal-600" />
								Разделение оплаты (Сплит 54-ФЗ):
							</span>

							{/* 1-Click Remainder Balancer Buttons */}
							{remainingRub > 0 ? (
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-xs text-[var(--muted,#64748b)]">
										Остаток <strong className="font-mono text-amber-600 dark:text-amber-400">{remainingRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</strong>:
									</span>
									<button
										type="button"
										onClick={handleAddRemainingToCard}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/30 transition-all cursor-pointer select-none active:scale-95"
										title="Заполнить остаток картой"
										data-testid="split-fill-card-btn"
									>
										+ на Карту
									</button>
									<button
										type="button"
										onClick={handleAddRemainingToCash}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer select-none active:scale-95"
										title="Заполнить остаток наличными"
										data-testid="split-fill-cash-btn"
									>
										+ в Нал
									</button>
									<button
										type="button"
										onClick={handleAddRemainingToSbp}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 transition-all cursor-pointer select-none active:scale-95"
										title="Заполнить остаток через СБП"
										data-testid="split-fill-sbp-btn"
									>
										+ в СБП
									</button>
									<button
										type="button"
										onClick={handleAddRemainingToDeposit}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer select-none active:scale-95"
										title="Заполнить остаток из депозита"
										data-testid="split-fill-deposit-btn"
									>
										+ в Депозит
									</button>
									<button
										type="button"
										onClick={handleAddRemainingToLoyalty}
										className="min-h-[44px] px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer select-none active:scale-95"
										title="Заполнить остаток баллами"
										data-testid="split-fill-loyalty-btn"
									>
										+ в Бонусы
									</button>
								</div>
							) : remainingRub === 0 ? (
								<div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
									<Check size={14} className="text-emerald-600" />
									<span>Чек сбалансирован (100%)</span>
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
							{/* Card (Tag 1081) */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<CreditCard size={14} className="text-blue-600" />
									<span>Карта (Тег 1081)</span>
								</label>
								<div className="relative">
									<input
										type="number"
										min={0}
										step="0.01"
										value={cardAmountRub || ""}
										onChange={(e) => setCardAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
										className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
										placeholder="0.00 ₽"
										data-testid="split-input-card"
									/>
									<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
								</div>
							</div>

							{/* Cash (Tag 1031) */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<Banknote size={14} className="text-emerald-600" />
									<span>Наличные (Тег 1031)</span>
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
										className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
										placeholder="0.00 ₽"
										data-testid="split-input-cash"
									/>
									<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
								</div>
							</div>

							{/* SBP QR (Tag 1081) */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<QrCode size={14} className="text-purple-600" />
									<span>СБП QR (Тег 1081)</span>
								</label>
								<div className="relative">
									<input
										type="number"
										min={0}
										step="0.01"
										value={sbpAmountRub || ""}
										onChange={(e) => setSbpAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
										className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
										placeholder="0.00 ₽"
										data-testid="split-input-sbp"
									/>
									<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
								</div>
							</div>

							{/* Deposit / Prepayment (Tag 1215) */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<Coins size={14} className="text-amber-600" />
									<span>Депозит / Аванс (Тег 1215)</span>
								</label>
								<div className="relative">
									<input
										type="number"
										min={0}
										step="0.01"
										value={depositAmountRub || ""}
										onChange={(e) => setDepositAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
										className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
										placeholder="0.00 ₽"
										data-testid="split-input-deposit"
									/>
									<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
								</div>
							</div>

							{/* Loyalty / Bonus Points (Tag 1216) */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
									<Sparkles size={14} className="text-indigo-600" />
									<span>Бонусные баллы (Тег 1216)</span>
								</label>
								<div className="relative">
									<input
										type="number"
										min={0}
										step="0.01"
										value={loyaltyAmountRub || ""}
										onChange={(e) => setLoyaltyAmountRub(Math.max(0, parseFloat(e.target.value) || 0))}
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

					{/* SBP QR Display Panel */}
					{(sbpAmountRub > 0 || activeMethod === "sbp_qr") && (
						<div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/30 flex flex-col items-center justify-center text-center gap-2.5">
							<div className="w-36 h-36 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] p-3 shadow-md flex items-center justify-center border border-teal-500/30">
								<QrCode className="w-full h-full text-teal-600 dark:text-teal-400" />
							</div>
							<div className="text-xs text-[var(--ink)]">
								<p className="font-bold m-0 text-[var(--ink)]">Отсканируйте камерой телефона или в приложении любого банка</p>
								<p className="text-[var(--muted)] m-0 mt-0.5">
									Сумма СБП: {( (sbpAmountRub > 0 ? sbpAmountRub : targetBillRub) ).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ • Без комиссии для пациента (Тег 1081)
								</p>
							</div>
						</div>
					)}

					{/* Cash Quick Tender Buttons & Giant Change Calculator ("БАБУШКА-PROOF") */}
					{(cashAmountRub > 0 || activeMethod === "cash") && (
						<div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40 flex flex-col gap-4 shadow-sm" data-testid="cash-tender-panel">
							<div className="flex items-center justify-between flex-wrap gap-1">
								<span className="text-sm font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
									<Coins size={20} className="text-emerald-600" />
									<span>💵 Расчет сдачи с наличных:</span>
								</span>
								<span className="text-sm font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
									К оплате: {( (cashAmountRub > 0 ? cashAmountRub : targetBillRub) ).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
								</span>
							</div>

							{/* Giant Bill Buttons (+5000, +2000, +1000, +500, +100, Ровно, Сброс) */}
							<div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
								{[5000, 2000, 1000, 500, 100].map((rub) => (
									<button
										key={rub}
										type="button"
										onClick={() => setCashTenderedRub((prev) => prev + rub)}
										className="min-h-[52px] px-2 rounded-xl border-2 border-emerald-500/40 bg-[var(--paper,#ffffff)] text-base font-extrabold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center"
										data-testid={`cash-add-${rub}-btn`}
									>
										+{rub} ₽
									</button>
								))}
								<button
									type="button"
									onClick={() => setCashTenderedRub(cashAmountRub > 0 ? cashAmountRub : targetBillRub)}
									className="min-h-[52px] px-2 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white text-sm font-extrabold hover:bg-emerald-700 cursor-pointer transition-all active:scale-95 shadow-xs flex items-center justify-center"
									data-testid="cash-exact-btn"
								>
									Ровно
								</button>
								<button
									type="button"
									onClick={() => setCashTenderedRub(0)}
									className="min-h-[52px] px-2 rounded-xl border-2 border-rose-500/30 bg-[var(--paper,#ffffff)] text-rose-600 hover:bg-rose-500/10 text-sm font-extrabold cursor-pointer transition-all active:scale-95 flex items-center justify-center"
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
										<span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400" data-testid="cash-change-exact">
											✓ БЕЗ СДАЧИ (РОВНО)
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

					{/* Tier 2 (Факультатив: Медтуризм / Мультивалюта ЦБ РФ & Семейный депозит) */}
					<div className="rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] overflow-hidden transition-all">
						<button
							type="button"
							onClick={() => setIsTier2Open((prev) => !prev)}
							className="w-full p-3 flex items-center justify-between text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
							aria-expanded={isTier2Open}
						>
							<div className="flex items-center gap-2">
								<Globe size={14} className="text-teal-600 dark:text-teal-400" />
								<span>Факультатив: Медтуризм, Валюта ЦБ РФ & Семейный счет (Tier 2)</span>
							</div>
							<ChevronDown
								size={16}
								className={`transition-transform duration-200 ${isTier2Open ? "rotate-180 text-teal-600" : "text-[var(--muted,#64748b)]"}`}
							/>
						</button>

						{isTier2Open && (
							<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex flex-col gap-4 text-xs">
								{/* Multi-Currency Medical Tourism Calculator */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between flex-wrap gap-1">
										<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
											<Globe size={14} className="text-teal-600" />
											Многовалютный калькулятор (ЦБ РФ):
										</span>
										<span className="text-xs text-[var(--muted,#64748b)] font-mono">
											Курс ЦБ: 1 {selectedForeignCurrency} = {foreignCalc.officialCbrRateRub.toFixed(2)} ₽
										</span>
									</div>

									<div className="flex items-center gap-1.5 flex-wrap">
										{(["USD", "EUR", "KZT", "BYN", "CNY", "AED"] as SupportedCurrency[]).map((curr) => {
											const isCurrSelected = selectedForeignCurrency === curr;
											return (
												<button
													key={curr}
													type="button"
													onClick={() => setSelectedForeignCurrency(curr)}
													className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
														isCurrSelected
															? "border-teal-600 bg-teal-500/15 text-teal-900 dark:text-teal-200 shadow-xs"
															: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-teal-400"
													}`}
												>
													{curr} ({CBR_CURRENCIES[curr]?.symbol})
												</button>
											);
										})}
									</div>

									<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between flex-wrap gap-2 text-teal-950 dark:text-teal-100 font-mono">
										<div>
											Сумма в валюте ({selectedForeignCurrency}): <strong className="text-sm">{foreignCalc.targetFormatted}</strong>
										</div>
										<div className="text-xs text-[var(--muted,#64748b)]">
											(включая спред эквайринга +{foreignCalc.bankSpreadPercent}%)
										</div>
									</div>
								</div>

								{/* Family Deposit Info */}
								<div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--line,#e2e8f0)]">
									<div className="flex items-center justify-between">
										<span className="font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5">
											<Users size={14} className="text-purple-600" />
											Семейный лицевой счет:
										</span>
										<span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono">
											Баланс депозита: 85 000.00 ₽
										</span>
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] m-0">
										Плательщик: Смирнов В.А. (Глава семьи). Списание разрешено (Тег 1215 ФФД 1.2).
									</p>
								</div>
							</div>
						)}
					</div>

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
								className="min-h-[44px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
							>
								<RefreshCw size={14} className={isFlushingQueue ? "animate-spin" : ""} />
								<span>Синхронизировать</span>
							</button>
						</div>
					)}

					{/* Validation Alert with 1-Click Fix */}
					{!validation.isValid && (
						<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between flex-wrap gap-2">
							<div className="flex items-center gap-2">
								<AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
								<span><strong>Ошибка оплаты:</strong> {validation.errorMessageRu}</span>
							</div>
							<button
								type="button"
								onClick={() => handleSingle100Percent(activeMethod || "bank_card")}
								className="px-3.5 py-1.5 min-h-[44px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs"
								title="Сбросить суммы и применить 100% на выбранный способ"
							>
								<Zap size={13} /> ⚡ Исправить в 1 клик (100% {activeMethod ? CHECKOUT_PAYMENT_METHODS.find((m) => m.id === activeMethod)?.titleRu : "Картой"})
							</button>
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
							className="min-h-[52px] px-8 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white text-base font-extrabold flex items-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer select-none active:scale-98"
						>
							{isPrinting ? (
								<>
									<Printer className="w-5 h-5 animate-spin" />
									Печать фискального чека 54-ФЗ...
								</>
							) : (
								<>
									<Check className="w-5 h-5" />
									⚡ Пробить чек 54-ФЗ ({(effectiveBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

