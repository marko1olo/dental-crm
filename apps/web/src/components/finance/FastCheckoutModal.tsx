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
	Building2,
	User,
	FileText,
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
} from "../payments/checkout/fastCheckoutPresets";
import {
	validateCheckoutSplit,
	generate54FzFiscalPayload,
	calculateStageAdvanceAmount,
	DEFAULT_TREATMENT_STAGES,
	splitStateToCheckoutPayments,
	paymentsToSplitState,
	calculateSplitRemainingKop,
	calculateCashChangeKop,
	applyQuickCheckoutPreset,
	calculateFastCheckoutDiscount,
	type CheckoutSplitItem,
	type Ffd12FiscalPayload,
	type TreatmentPlanStageOption,
	type StagePaymentMode,
	type ClientLegalType,
	type QuickCheckoutPresetType,
	type FastCheckoutDiscountPreset,
} from "../payments/checkout/fastCheckoutEngine";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import { KktLanPrinterService } from "../../services/hardware/kktLanPrinter";
import { showToast } from "../GlobalToast";
import { useModalA11y } from "../../hooks/useModalA11y";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface FastCheckoutModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly initialPaymentMethod?: CheckoutPaymentMethodType | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly familyPayerName?: string | undefined;
	readonly orderId?: string | undefined;
	readonly stages?: readonly TreatmentPlanStageOption[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly attendingDoctorName?: string | undefined;
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
}

export const FastCheckoutModal: React.FC<FastCheckoutModalProps> = ({
	isOpen,
	onClose,
	totalBillKop: propTotalBillKop,
	totalBillRub: propTotalBillRub,
	initialPaymentMethod,
	patientId,
	patientName = "",
	patientPhone = "",
	patientEmail = "",
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	familyPayerName = "",
	orderId = "",
	stages = DEFAULT_TREATMENT_STAGES,
	cashierFullName: propCashierFullName,
	attendingDoctorName,
	onPaymentComplete,
}) => {
	const initialTotalBillKop =
		propTotalBillKop ??
		(propTotalBillRub !== undefined ? Math.round(propTotalBillRub * 100) : 0);
	const effectiveCashierFullName =
		(propCashierFullName || "").trim() ||
		(attendingDoctorName || "").trim() ||
		"Кассир";

	const [selectedStageId, setSelectedStageId] = useState<string>("full_plan");
	const [stagePaymentMode, setStagePaymentMode] = useState<StagePaymentMode>("full");
	const [advanceAlreadyPaidRub, setAdvanceAlreadyPaidRub] = useState<number>(0);
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
	const inFlightRef = React.useRef(false);
	const lastClickTimeRef = React.useRef(0);
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
	const [clientType, setClientType] = useState<ClientLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerName, setBuyerName] = useState<string>("");
	const [isElectronicReceiptOnly, setIsElectronicReceiptOnly] = useState<boolean>(false);
	const [discountPreset, setDiscountPreset] = useState<FastCheckoutDiscountPreset>("none");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);

	// Compute base stage amount in kopecks from selected stage or fallback
	const baseStageAmountKop = useMemo(() => {
		if (selectedStageId === "full_plan") {
			return initialTotalBillKop;
		}
		const stage = stages.find((s) => s.id === selectedStageId);
		return stage ? stage.amountKop : initialTotalBillKop;
	}, [selectedStageId, initialTotalBillKop, stages]);

	// Doctor discount calculation (Mandate 8e: 100% warranty, 100% staff, round to hundreds, zero friction)
	const discountCalc = useMemo(() => {
		return calculateFastCheckoutDiscount({
			grossKop: baseStageAmountKop,
			preset: discountPreset,
			customPercent: customDiscountPercent,
		});
	}, [baseStageAmountKop, discountPreset, customDiscountPercent]);

	const discountedStageAmountKop = discountCalc.netKop;

	// Compute advance & 54-FZ Tag 1215 calculation
	const stageCalc = useMemo(() => {
		return calculateStageAdvanceAmount(
			discountedStageAmountKop,
			stagePaymentMode,
			Math.round(advanceAlreadyPaidRub * 100)
		);
	}, [discountedStageAmountKop, stagePaymentMode, advanceAlreadyPaidRub]);

	const effectiveBillKop = stageCalc.requiredAmountKop;
	const targetBillKop = stagePaymentMode === "advance_offset_tag1215"
		? discountedStageAmountKop
		: effectiveBillKop;
	const targetBillRub = targetBillKop / 100;
	const effectiveTotalRub = targetBillRub;

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
			patientEmail,
			clientType,
			buyerInn: buyerInn || undefined,
			buyerName: buyerName || undefined,
			isElectronicReceiptOnly,
		});
	}, [
		orderId,
		targetBillKop,
		payments,
		cashTenderedRub,
		patientPhone,
		patientEmail,
		clientType,
		buyerInn,
		buyerName,
		isElectronicReceiptOnly,
	]);

	if (!isOpen) return null;

	const handleQuickPreset = (preset: QuickCheckoutPresetType) => {
		if (preset === "warranty_100") {
			setDiscountPreset("warranty_100");
			setCardAmountRub(0);
			setCashAmountRub(0);
			setSbpAmountRub(0);
			setDepositAmountRub(0);
			setLoyaltyAmountRub(0);
			setDmsAmountRub(0);
			setCashTenderedRub(0);
			showToast("Применен 1-клик пресет: 100% Гарантия / переделка (0 ₽)", "info", 2000);
			return;
		}
		const effectiveDepositRub =
			(patientDepositRub || 0) + (patientFamilyBalanceRub || 0);
		const result = applyQuickCheckoutPreset({
			totalBillKop: targetBillKop,
			preset,
			availableDepositKop: Math.round(effectiveDepositRub * 100),
		});
		setActiveMethod(result.activeMethod);
		const splitState = paymentsToSplitState(result.payments);
		setCardAmountRub(splitState.cardRub);
		setCashAmountRub(splitState.cashRub);
		setSbpAmountRub(splitState.sbpRub);
		setDepositAmountRub(splitState.depositRub);
		setLoyaltyAmountRub(splitState.loyaltyRub);
		setDmsAmountRub(splitState.dmsRub ?? 0);
		setCashTenderedRub(result.cashTenderedKop / 100);
	};

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

	const handleExecutePayment = async (forceOfflineBuffer = false) => {
		const now = Date.now();
		if (inFlightRef.current || isPrinting || now - lastClickTimeRef.current < 600) {
			return;
		}

		let effectiveCardRub = cardAmountRub;
		let effectiveCashRub = cashAmountRub;
		let effectiveSbpRub = sbpAmountRub;
		let effectiveDepositRub = depositAmountRub;
		let effectiveLoyaltyRub = loyaltyAmountRub;
		let effectiveDmsRub = dmsAmountRub;

		if (!validation.isValid) {
			const errorMsg =
				validation.errorMessageRu ||
				(validation as { errorMessage?: string }).errorMessage ||
				"Скорректируйте сумму оплаты перед пробитием чека";

			if (validation.errorMessageRu?.includes("ИНН")) {
				showToast(errorMsg, "warning");
				return;
			}

			if (remainingRub > 0) {
				const method = activeMethod || "bank_card";
				if (method === "cash") {
					const nextCash = +(cashAmountRub + remainingRub).toFixed(2);
					setCashAmountRub(nextCash);
					if (cashTenderedRub < nextCash) {
						setCashTenderedRub(nextCash);
					}
					effectiveCashRub = nextCash;
				} else if (method === "sbp_qr") {
					const nextSbp = +(sbpAmountRub + remainingRub).toFixed(2);
					setSbpAmountRub(nextSbp);
					effectiveSbpRub = nextSbp;
				} else if (method === "patient_deposit") {
					const nextDeposit = +(depositAmountRub + remainingRub).toFixed(2);
					setDepositAmountRub(nextDeposit);
					effectiveDepositRub = nextDeposit;
				} else if (method === "loyalty_points") {
					const nextLoyalty = +(loyaltyAmountRub + remainingRub).toFixed(2);
					setLoyaltyAmountRub(nextLoyalty);
					effectiveLoyaltyRub = nextLoyalty;
				} else if (method === "dms_insurance") {
					const nextDms = +(dmsAmountRub + remainingRub).toFixed(2);
					setDmsAmountRub(nextDms);
					effectiveDmsRub = nextDms;
				} else {
					const nextCard = +(cardAmountRub + remainingRub).toFixed(2);
					setCardAmountRub(nextCard);
					effectiveCardRub = nextCard;
				}
				showToast("Недостающая сумма автоматически добавлена к оплате!", "info");
			} else {
				showToast(errorMsg, "warning");
				return;
			}
		}

		inFlightRef.current = true;
		lastClickTimeRef.current = now;
		setIsPrinting(true);

		let effectivePayments = splitStateToCheckoutPayments({
			cardRub: effectiveCardRub,
			cashRub: effectiveCashRub,
			sbpRub: effectiveSbpRub,
			depositRub: effectiveDepositRub,
			loyaltyRub: effectiveLoyaltyRub,
			dmsRub: effectiveDmsRub,
		});

		// Guarantee exact kopeck balance for targetBillKop without float rounding drift
		if (targetBillKop > 0 && effectivePayments.length > 0) {
			const sumKop = effectivePayments.reduce((acc, p) => acc + p.amountKop, 0);
			const deltaKop = targetBillKop - sumKop;
			if (deltaKop !== 0) {
				effectivePayments = effectivePayments.map((p, idx) => {
					if (idx === effectivePayments.length - 1) {
						return { ...p, amountKop: Math.max(0, p.amountKop + deltaKop) };
					}
					return p;
				});
			}
		}

		const rawUuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
			? crypto.randomUUID()
			: `idemp-${now}-${Date.now().toString(36)}`;
		const signature = buildFiscalReceiptPayloadSignature({
			patientId: orderId,
			operationType: "income",
			taxationSystem: "usn_income",
			totalKopecks: targetBillKop,
			cashKopecks: Math.round(effectiveCashRub * 100),
			electronicCardKopecks: Math.round(effectiveCardRub * 100),
			sbpKopecks: Math.round(effectiveSbpRub * 100),
			prepaidKopecks: Math.round((effectiveDepositRub + effectiveLoyaltyRub) * 100),
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
				payments: effectivePayments,
				patientPhone,
				patientEmail,
				clientType,
				buyerInn: buyerInn || undefined,
				buyerName: buyerName || undefined,
				isElectronicReceiptOnly,
				idempotencyKey: compositeIdempotencyKey,
			},
			{
				paymentMethodTag1214: stageCalc.ffdTag1214,
				paymentSubjectTag1212: stageCalc.ffdTag1212,
				idempotencyKey: compositeIdempotencyKey,
				isElectronicReceiptOnly,
				offlineBuffered: forceOfflineBuffer,
			}
		);

		// 0. Гарантийный прием / 100% скидка (Мандат 8e, п. 7) — защита от аппаратной ошибки ККТ "Сумма чека не может быть 0"
		if (targetBillKop === 0) {
			showToast(
				"Гарантийный прием оформлен (скидка 100%, 0 ₽). Визит успешно закрыт без фискализации!",
				"success"
			);
			if (onPaymentComplete) {
				onPaymentComplete(payload);
			}
			setTimeout(() => {
				setIsPrinting(false);
				inFlightRef.current = false;
				onClose();
			}, 300);
			return;
		}

		// 1. Принудительный буфер отложенной фискализации или сетевой офлайн (Mandate 8e — пациент не ждет у стойки)
		if (forceOfflineBuffer || (typeof navigator !== "undefined" && navigator.onLine === false)) {
			FiscalReceiptQueueManager.enqueueReceipt(
				{
					operationType: "income",
					customerContact: patientPhone || patientEmail || "",
					cashierFullName: effectiveCashierFullName,
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
				forceOfflineBuffer
					? "Ручной перевод в буфер отложенной фискализации (ККТ временно офлайн)"
					: "Офлайн-режим (потеря сетевого соединения с ККТ)",
				compositeIdempotencyKey
			);
			setIsOfflineBuffered(true);
			showToast(
				"Платёж сохранён в буфер отложенной фискализации 54-ФЗ. Пациент рассчитан, стойка свободна!",
				"success"
			);

			if (onPaymentComplete) {
				onPaymentComplete({ ...payload, offlineBuffered: true });
			}

			setTimeout(() => {
				setIsPrinting(false);
				inFlightRef.current = false;
				onClose();
			}, 400);
			return;
		}

		// 2. Штатная печать на ККТ с автоматическим буферированием при отказе оборудования
		try {
			const printResult = await KktLanPrinterService.printReceipt({
				operationType: "income",
				customerContact: patientPhone || patientEmail || "",
				cashierFullName: effectiveCashierFullName,
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
			});

			if (!printResult.success || printResult.status === "hardware_offline") {
				FiscalReceiptQueueManager.enqueueReceipt(
					{
						operationType: "income",
						customerContact: patientPhone || patientEmail || "",
						cashierFullName: effectiveCashierFullName,
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
					printResult.error || "ККТ временно недоступна / нет бумаги",
					compositeIdempotencyKey
				);
				setIsOfflineBuffered(true);
				showToast(
					"ККТ временно офлайн: чек помещён в буфер отложенной фискализации. Пациент отпущен без задержек!",
					"warning"
				);

				if (onPaymentComplete) {
					onPaymentComplete({ ...payload, offlineBuffered: true });
				}
			} else {
				if (isElectronicReceiptOnly) {
					showToast(
						`Электронный чек 54-ФЗ отправлен на ${patientPhone || patientEmail || "контакт пациента"} (бумага сэкономлена)!`,
						"success"
					);
				} else {
					showToast("Чек 54-ФЗ успешно пробит на кассовом аппарате!", "success");
				}

				if (patientId && effectiveTotalRub > 0) {
					try {
						const primaryMethod =
							effectiveCashRub > 0 && effectiveCardRub === 0 && effectiveSbpRub === 0
								? "cash"
								: activeMethod === "cash"
								? "cash"
								: activeMethod === "sbp_qr"
								? "online"
								: activeMethod === "dms_insurance"
								? "insurance"
								: "card";

						const headers = denteAdminSecretRequestHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": compositeIdempotencyKey,
						});

						if (typeof fetch === "function") {
							await fetch("/api/billing/payments", {
								method: "POST",
								headers,
								body: JSON.stringify({
									patientId,
									amountRub: effectiveTotalRub,
									method: primaryMethod,
									clientMutationId: compositeIdempotencyKey,
									note: `Быстрый расчет 54-ФЗ (${effectiveCashierFullName}): ${primaryMethod}`,
								}),
							}).catch((fetchErr) => {
								console.warn("[FastCheckoutModal] /api/billing/payments error:", fetchErr);
							});
						}
					} catch (crmErr) {
						console.warn("[FastCheckoutModal] Failed to record payment in CRM:", crmErr);
					}
				}

				if (onPaymentComplete) {
					onPaymentComplete(payload);
				}
			}

			setTimeout(() => {
				setIsPrinting(false);
				inFlightRef.current = false;
				onClose();
			}, 600);
		} catch (err: unknown) {
			// Аварийный fallback — чек не теряется, сохраняется в локальный буфер
			FiscalReceiptQueueManager.enqueueReceipt(
				{
					operationType: "income",
					customerContact: patientPhone || patientEmail || "",
					cashierFullName: effectiveCashierFullName,
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
				err instanceof Error ? err.message : "Аварийный сбой связи с ККТ",
				compositeIdempotencyKey
			);
			setIsOfflineBuffered(true);
			showToast(
				"ККТ не отвечает: чек сохранен в локальный буфер отложенной фискализации 54-ФЗ. Пациент отпущен!",
				"warning"
			);

			if (onPaymentComplete) {
				onPaymentComplete({ ...payload, offlineBuffered: true });
			}

			setTimeout(() => {
				setIsPrinting(false);
				inFlightRef.current = false;
				onClose();
			}, 600);
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

	const primaryInputRef = React.useRef<HTMLInputElement | null>(null);

	const { modalRef, handleInputEnterKeyDown } = useModalA11y<HTMLDivElement>({
		isOpen,
		onClose,
		onSubmit: () => {
			if (validation.isValid && !isPrinting) {
				void handleExecutePayment();
			}
		},
		autoFocusRef: primaryInputRef,
		initialFocusSelector: '[data-testid="simple-card-btn"], [data-testid="simple-cash-btn"], [data-testid="simple-sbp-btn"], input, button',
	});

	return (
		<div ref={modalRef} className="fast-checkout-modal-overlay" data-testid="fast-checkout-modal" tabIndex={-1}>
			<div className="fast-checkout-modal-container max-w-3xl">
				{/* Header */}
				<div className="p-4 sm:p-5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
							<QrCode className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-[var(--ink,#0f172a)] break-words flex items-center gap-2 m-0">
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
						<span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center">
							<ShieldCheck size={14} className="inline mr-1 shrink-0 text-emerald-500" />
							54-ФЗ: ИНН с физлиц НЕ требуется
						</span>
						<button
							type="button"
							onClick={() => setIsSimpleCashierMode((prev) => !prev)}
							className={`min-h-[44px] px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ml-auto flex items-center gap-1.5 ${
								isSimpleCashierMode
									? "bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/30"
									: "bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-500"
							}`}
							title="Переключить крупный режим «Простая касса» для медсестры/кассира"
							data-testid="toggle-simple-cashier-btn"
						>
							<span>Простая касса</span>
							<span className="text-[10px] opacity-90 font-mono">[{isSimpleCashierMode ? "Крупно" : "Сплит"}]</span>
						</button>
					</div>

					{/* Быстрые 1-клик сценарии оплаты (Свобода кассира & Mandate 8e, 8p) */}
					<details
						className="group rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-teal-500/30 shadow-xs"
						data-testid="quick-presets-section"
					>
						<summary className="p-2 px-3 flex items-center justify-between cursor-pointer select-none text-xs list-none [&::-webkit-details-marker]:hidden">
							<div className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-200">
								<Zap size={14} className="text-amber-500 fill-amber-500 shrink-0" />
								<span>Быстрые 1-клик сценарии оплаты (0 барьеров)</span>
								<span className="text-[11px] font-normal text-[var(--muted,#64748b)] hidden sm:inline">
									• Картой 100%, Нал, СБП, 50/50, Аванс{familyPayerName ? ` (${familyPayerName})` : ""}{patientFamilyBalanceRub > 0 ? ` [${(patientFamilyBalanceRub).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽]` : ""}
								</span>
							</div>
							<div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold">
								<span className="group-open:hidden text-[11px]">8 пресетов</span>
								<ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
							</div>
						</summary>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 pt-1">
							<button
								type="button"
								onClick={() => handleQuickPreset("100_card")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-blue-500/40 bg-[var(--paper,#ffffff)] hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-100-card"
								title="Оплатить 100% банковской картой через терминал (Тег 1081)"
							>
								<CreditCard size={14} className="shrink-0 text-blue-600" />
								<span className="truncate">Картой 100%</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("100_cash")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-emerald-500/40 bg-[var(--paper,#ffffff)] hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-100-cash"
								title="Оплатить 100% наличными ровно в кассу без сдачи (Тег 1031)"
							>
								<Banknote size={14} className="shrink-0 text-emerald-600" />
								<span className="truncate">Без сдачи (Нал 100%)</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("100_sbp")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-teal-500/40 bg-[var(--paper,#ffffff)] hover:bg-teal-500/15 text-teal-700 dark:text-teal-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-100-sbp"
								title="Оплатить 100% по СБП QR"
							>
								<QrCode size={14} className="shrink-0 text-teal-600" />
								<span className="truncate">СБП QR 100%</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("use_deposit")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-amber-500/40 bg-[var(--paper,#ffffff)] hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-use-deposit"
								title="Списать аванс / депозит пациента по Тегу 1215 54-ФЗ с доплатой картой"
							>
								<Coins size={14} className="shrink-0 text-amber-600" />
								<span className="truncate">Аванс + Карта</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("deposit_cash")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-emerald-500/40 bg-[var(--paper,#ffffff)] hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-deposit-cash"
								title="Списать аванс / депозит пациента с доплатой наличными"
							>
								<Coins size={14} className="shrink-0 text-emerald-600" />
								<span className="truncate">Аванс + Нал</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("split_50_50")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-purple-500/40 bg-[var(--paper,#ffffff)] hover:bg-purple-500/15 text-purple-700 dark:text-purple-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-split-50-50"
								title="Разделить 50/50: половина картой, половина наличными (без копеечного дрейфа)"
							>
								<Layers size={14} className="shrink-0 text-purple-600" />
								<span className="truncate">50% Карта + 50% Нал</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("split_three_way")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-indigo-500/40 bg-[var(--paper,#ffffff)] hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-split-three-way"
								title={`Комбинированная оплата в 1 клик: Аванс родственника (${familyPayerName}) + 50% Карта + 50% Нал`}
							>
								<Users size={14} className="shrink-0 text-indigo-600" />
								<span className="truncate">Нал + Карта + Аванс</span>
							</button>
							<button
								type="button"
								onClick={() => handleQuickPreset("warranty_100")}
								className="min-h-[40px] min-w-0 px-2 py-1.5 rounded-xl border-2 border-blue-500/40 bg-[var(--paper,#ffffff)] hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
								data-testid="btn-checkout-warranty-100"
								title="100% гарантийная переделка (к оплате 0 ₽, без паролей и блокировок)"
							>
								<ShieldCheck size={14} className="shrink-0 text-blue-600" />
								<span className="truncate">100% Гарантия (0 ₽)</span>
							</button>
						</div>
					</details>

					{/* Скидки врача и Гарантийные переделки (Мандат 8e: Doctor Autonomy & 8p) */}
					<details
						className="group rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] shadow-xs"
						data-testid="checkout-doctor-discounts-section"
						open={discountPreset !== "none" || discountCalc.discountKop > 0}
					>
						<summary className="p-2 px-3 flex items-center justify-between cursor-pointer select-none text-xs list-none [&::-webkit-details-marker]:hidden">
							<div className="flex items-center gap-1.5 font-bold text-[var(--muted,#64748b)]">
								<Sparkles size={14} className="text-teal-600 shrink-0" />
								<span className="text-[var(--ink,#0f172a)] font-bold">Скидки врача и Гарантия</span>
								{discountCalc.discountKop > 0 ? (
									<span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-300 ml-1">
										• {(discountCalc.discountKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ ({discountCalc.effectivePercent}%)
									</span>
								) : (
									<span className="text-[11px] font-normal text-[var(--muted,#64748b)] hidden sm:inline">
										• До сотен ₽, 3%, 5%, 10%, Гарантия, Персонал
									</span>
								)}
							</div>
							<div className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 font-semibold">
								<span className="group-open:hidden text-[11px]">
									{discountCalc.discountKop > 0 ? "Изменить" : "Развернуть (8)"}
								</span>
								<ChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
							</div>
						</summary>
						<div className="p-3 pt-1 flex flex-col gap-2">
							<div className="flex items-center gap-1.5 flex-wrap">
								<button
									type="button"
									onClick={() => setDiscountPreset("round_hundreds")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1 ${
										discountPreset === "round_hundreds"
											? "bg-amber-600 text-white shadow-2xs ring-2 ring-amber-400"
											: "bg-[var(--paper,#ffffff)] hover:bg-amber-500/10 text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
									}`}
									data-testid="btn-discount-round-hundreds"
									title="Округлить сумму чека до сотен рублей (скидка на копейки в пользу пациента)"
								>
									<Sparkles size={13} className="text-amber-500" />
									<span>До сотен ₽</span>
								</button>
								<button
									type="button"
									onClick={() => setDiscountPreset("discount_3")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										discountPreset === "discount_3"
											? "bg-teal-600 text-white shadow-2xs"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
									}`}
									data-testid="btn-discount-3"
								>
									3%
								</button>
								<button
									type="button"
									onClick={() => setDiscountPreset("discount_5")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										discountPreset === "discount_5"
											? "bg-teal-600 text-white shadow-2xs"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
									}`}
									data-testid="btn-discount-5"
								>
									5%
								</button>
								<button
									type="button"
									onClick={() => setDiscountPreset("discount_10")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										discountPreset === "discount_10"
											? "bg-teal-600 text-white shadow-2xs"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
									}`}
									data-testid="btn-discount-10"
								>
									10%
								</button>
								<button
									type="button"
									onClick={() => setDiscountPreset("warranty_100")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
										discountPreset === "warranty_100"
											? "bg-blue-600 text-white shadow-2xs ring-2 ring-blue-400"
											: "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
									}`}
									data-testid="btn-discount-warranty"
									title="100% гарантийная переделка (к оплате 0 ₽, без блокировок)"
								>
									<ShieldCheck size={14} className="shrink-0" />
									<span>100% Гарантия</span>
								</button>
								<button
									type="button"
									onClick={() => setDiscountPreset("colleague_100")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
										discountPreset === "colleague_100"
											? "bg-purple-600 text-white shadow-2xs ring-2 ring-purple-400"
											: "bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800"
									}`}
									data-testid="btn-discount-colleague"
									title="100% скидка для коллег и медицинского персонала"
								>
									<span>Персонал 100%</span>
								</button>
								<button
									type="button"
									onClick={() => setDiscountPreset("manual_percent")}
									className={`min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
										discountPreset === "manual_percent"
											? "bg-teal-700 text-white shadow-2xs"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)]"
									}`}
									data-testid="btn-discount-manual-percent"
								>
									Ручная %
								</button>
								{discountPreset !== "none" && (
									<button
										type="button"
										onClick={() => {
											setDiscountPreset("none");
											setCustomDiscountPercent(0);
										}}
										className="min-h-[38px] sm:min-h-0 sm:h-7 px-2.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#cbd5e1)] text-[var(--muted,#64748b)] border border-[var(--line,#cbd5e1)] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
										data-testid="btn-discount-none"
										title="Сбросить скидку"
									>
										<X size={14} className="inline mr-1 shrink-0" />
										<span>Сброс (0%)</span>
									</button>
								)}
							</div>

							{/* Banners for active discounts */}
							{discountPreset === "round_hundreds" && (
								<div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-amber-950 dark:text-amber-100">
									<div className="flex items-center gap-2 font-bold">
										<Sparkles size={14} className="text-amber-600 shrink-0" />
										<span>Округление до сотен: копейки списаны в пользу пациента. К оплате: {(discountCalc.netKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
									</div>
									<span className="text-[11px] font-mono text-amber-700 dark:text-amber-300">54-ФЗ / Точность до копейки</span>
								</div>
							)}
							{discountPreset === "warranty_100" && (
								<div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-blue-950 dark:text-blue-100">
									<div className="flex items-center gap-2 font-bold">
										<ShieldCheck size={14} className="text-blue-600 shrink-0" />
										<span>100% Гарантийная переделка: стоимость списана в 0 ₽</span>
									</div>
									<span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">Чек 0 ₽ / Гарантия</span>
								</div>
							)}
							{discountPreset === "colleague_100" && (
								<div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs flex items-center justify-between gap-2 flex-wrap text-purple-950 dark:text-purple-100">
									<div className="flex items-center gap-2 font-bold">
										<ShieldCheck size={14} className="text-purple-600 shrink-0" />
										<span>100% Скидка сотруднику: лечение персонала</span>
									</div>
									<span className="text-[11px] font-mono text-purple-700 dark:text-purple-300">Чек 0 ₽ / Персонал</span>
								</div>
							)}
							{discountPreset === "manual_percent" && (
								<div className="flex items-center gap-2 pt-1">
									<label className="text-xs font-semibold text-[var(--muted,#64748b)]">Процент скидки врача (%):</label>
									<input
										type="number"
										min={0}
										max={100}
										value={customDiscountPercent || ""}
										onChange={(e) => setCustomDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
										className="min-h-[38px] sm:min-h-0 sm:h-7 w-20 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink)] text-xs font-bold text-right"
										placeholder="0"
										data-testid="input-custom-discount-percent"
									/>
									<span className="text-xs font-bold">%</span>
								</div>
							)}
						</div>
					</details>

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

					{/* Payer Type & 54-FZ INN Panel (ст. 4.7 № 54-ФЗ: с физлиц ИНН КАТЕГОРИЧЕСКИ НЕ ТРЕБУЕТСЯ) */}
					<div className="p-3 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-2" data-testid="payer-type-section">
						<div className="flex items-center justify-between flex-wrap gap-2">
							<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
								<Building2 size={14} className="text-teal-600" />
								Тип плательщика и 54-ФЗ (Тег 1228):
							</span>
							{clientType === "physical_person" && (
								<span
									className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 flex items-center min-w-0"
									data-testid="inn-physical-not-required-badge"
								>
									<ShieldCheck size={14} className="inline mr-1 shrink-0 text-emerald-500" />
									По 54-ФЗ для физлиц не требуется (ИНН не обязателен)
								</span>
							)}
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={() => setClientType("physical_person")}
								className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									clientType === "physical_person"
										? "bg-teal-600 text-white shadow-xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink)] border border-[var(--line,#cbd5e1)] hover:border-teal-400"
								}`}
								data-testid="tab-payer-physical"
							>
								<User size={13} />
								<span>Физическое лицо (пациент)</span>
							</button>
							<button
								type="button"
								onClick={() => setClientType("legal_entity")}
								className={`min-h-[44px] sm:min-h-0 sm:h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
									clientType === "legal_entity"
										? "bg-teal-600 text-white shadow-xs"
										: "bg-[var(--paper,#ffffff)] text-[var(--ink)] border border-[var(--line,#cbd5e1)] hover:border-teal-400"
								}`}
								data-testid="tab-payer-legal"
							>
								<Building2 size={13} />
								<span>Юрлицо / ИП</span>
							</button>
						</div>

						{clientType === "physical_person" ? (
							<div className="space-y-1">
								<label className="text-[11px] font-semibold text-[var(--muted,#64748b)] flex items-center gap-1">
									<span>ИНН физлица (опционально, только если пациент запросил справку 13% НДФЛ):</span>
								</label>
								<input
									type="text"
									maxLength={12}
									value={buyerInn}
									onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
									placeholder="Не требуется (пациент-физлицо)"
									className="min-h-[44px] sm:min-h-0 sm:h-8 w-full max-w-sm px-2.5 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
									data-testid="input-buyer-inn-physical"
								/>
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1">
										<FileText size={12} className="text-teal-600" />
										<span>ИНН организации / ИП (Тег 1228, 10 или 12 цифр): *</span>
									</label>
									<input
										type="text"
										maxLength={12}
										value={buyerInn}
										onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
										placeholder="ИНН (10 или 12 цифр)"
										className="min-h-[44px] sm:min-h-0 sm:h-8 w-full px-2.5 text-xs font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
										data-testid="input-buyer-inn-legal"
									/>
								</div>
								<div className="space-y-1">
									<label className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1">
										<span>Наименование покупателя (Тег 1227):</span>
									</label>
									<input
										type="text"
										value={buyerName}
										onChange={(e) => setBuyerName(e.target.value)}
										placeholder="ООО «Компания» или ИП Иванов"
										className="min-h-[44px] sm:min-h-0 sm:h-8 w-full px-2.5 text-xs bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink)] focus:border-teal-500 outline-none"
										data-testid="input-buyer-name-legal"
									/>
								</div>
							</div>
						)}
					</div>

					{/* 1-Click Method Tiles (Elevated to 56px / 64px) */}
					<div className="space-y-2">
						<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider block">
							Способ оплаты:
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
									<span>Картой</span>
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
									<span>Наличными</span>
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
									<span>По QR-коду СБП</span>
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
										onKeyDown={handleInputEnterKeyDown}
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
										onKeyDown={handleInputEnterKeyDown}
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
										onKeyDown={handleInputEnterKeyDown}
										className="w-full px-3 py-2 text-sm font-bold font-mono bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
										placeholder="0.00 ₽"
										data-testid="split-input-sbp"
									/>
									<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)]">₽</span>
								</div>
							</div>

							{/* Deposit / Prepayment (Tag 1215) */}
							<div className="p-2.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1">
								<label className="text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center justify-between gap-1.5">
									<div className="flex items-center gap-1.5">
										<Coins size={14} className="text-amber-600" />
										<span>Депозит / Аванс (Тег 1215)</span>
									</div>
									{(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
										<span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold" data-testid="deposit-balance-badge">
											Доступно: {((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
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
										onKeyDown={handleInputEnterKeyDown}
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
										onKeyDown={handleInputEnterKeyDown}
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
									<span>Расчет сдачи с наличных:</span>
								</span>
								<span className="text-sm font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
									К оплате: {( (cashAmountRub > 0 ? cashAmountRub : targetBillRub) ).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
								</span>
							</div>

							{/* Direct Denomination Buttons (Без сдачи, 1 000, 2 000, 5 000, 10 000) */}
							<div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
								<button
									type="button"
									onClick={() => setCashTenderedRub(cashAmountRub > 0 ? cashAmountRub : targetBillRub)}
									className="min-h-[44px] min-w-0 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:border-emerald-500 cursor-pointer transition-all active:scale-95 truncate"
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
										className="min-h-[44px] min-w-0 px-2 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold font-mono text-[var(--ink,#0f172a)] hover:border-emerald-500 cursor-pointer transition-all active:scale-95 truncate"
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
											Баланс депозита: {((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
										</span>
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] m-0">
										Плательщик: {familyPayerName}. Списание разрешено (Тег 1215 ФФД 1.2).
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
								title="Сбросить суммы и применить выбранный способ на весь чек"
							>
								<Zap size={13} /> Исправить в 1 клик ({activeMethod ? CHECKOUT_PAYMENT_METHODS.find((m) => m.id === activeMethod)?.titleRu : "Картой"})
							</button>
						</div>
					)}
				</div>

				{/* Footer Actions (Fixed Sticky Bar — Fitts's Law) */}
				<div className="sticky bottom-0 z-50 p-4 sm:p-5 border-t border-[var(--line)] bg-[var(--paper)] flex items-center justify-between sm:justify-end flex-wrap gap-3 shrink-0 shadow-lg">
					<div className="text-xs text-[var(--muted)] mr-auto hidden sm:block">
						ФФД 1.2 • {patientPhone ? `Чек будет отправлен на ${patientPhone}` : "Печать фискального чека"}
					</div>
					<div className="w-full sm:w-auto flex items-center gap-2">
						<button
							type="button"
							data-testid="execute-fast-checkout-btn"
							onClick={() => void handleExecutePayment()}
							disabled={isPrinting}
							className="w-full sm:w-auto min-h-[52px] px-4 sm:px-8 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white text-sm sm:text-base font-extrabold flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer select-none active:scale-98"
						>
							{isPrinting ? (
								<>
									<Printer className="w-5 h-5 animate-spin" />
									Печать фискального чека 54-ФЗ...
								</>
							) : (
								<>
									<Check className="w-5 h-5" />
									{targetBillKop === 0
										? "Закрыть визит: 100% Гарантия / Скидка (0 ₽)"
										: `Пробить чек 54-ФЗ (${(targetBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`}
								</>
							)}
						</button>
						<button
							type="button"
							data-testid="btn-submit-fast-checkout"
							onClick={() => void handleExecutePayment()}
							disabled={isPrinting}
							tabIndex={-1}
							aria-hidden="true"
							className="sr-only"
						>
							Пробить чек 54-ФЗ
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

