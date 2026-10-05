import React, { useState, useMemo, useEffect, useRef } from "react";
import {
	type CheckoutPaymentMethodType,
	type TreatmentPlanStageOption,
	type StagePaymentMode,
	type ClientLegalType,
	type QuickCheckoutPresetType,
	type FastCheckoutDiscountPreset,
	type CheckoutSplitItem,
	type Ffd12FiscalPayload,
	DEFAULT_TREATMENT_STAGES,
	calculateStageAdvanceAmount,
	splitStateToCheckoutPayments,
	paymentsToSplitState,
	calculateSplitRemainingKop,
	calculateCashChangeKop,
	applyQuickCheckoutPreset,
	calculateFastCheckoutDiscount,
	validateCheckoutSplit,
} from "../payments/checkout/fastCheckoutEngine";
import {
	generateDynamicSbpQrPayload,
	generateQrCodeSvg,
} from "@dental/shared/fiscal";
import { FiscalReceiptQueueManager } from "../../services/hardware/fiscalReceiptQueueManager";
import { KktLanPrinterService } from "../../services/hardware/kktLanPrinter";
import { showToast } from "../GlobalToast";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	executeFiscalPayment,
	executeManualCardTerminalConfirm,
} from "./fastCheckoutFiscalHandlers";

export interface UseFastCheckoutLogicProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly totalBillKop?: number | undefined;
	readonly totalBillRub?: number | undefined;
	readonly initialPaymentMethod?: CheckoutPaymentMethodType | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
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
	readonly initialSimpleCashierMode?: boolean | undefined;
	readonly onPaymentComplete?: ((payload: Ffd12FiscalPayload) => void) | undefined;
}

export function useFastCheckoutLogic(props: UseFastCheckoutLogicProps) {
	const {
		isOpen,
		onClose,
		totalBillKop: propTotalBillKop,
		totalBillRub: propTotalBillRub,
		initialPaymentMethod,
		initialSimpleCashierMode,
		patientId,
		visitId,
		patientPhone = "",
		patientEmail = "",
		patientDepositRub = 0,
		patientFamilyBalanceRub = 0,
		orderId = "",
		stages: propStages,
		cashierFullName: propCashierFullName,
		attendingDoctorName,
		onPaymentComplete,
	} = props;

	const initialTotalBillKop =
		propTotalBillKop ??
		(propTotalBillRub !== undefined ? Math.round(propTotalBillRub * 100) : 0);
	const effectiveCashierFullName =
		(propCashierFullName || "").trim() ||
		(attendingDoctorName || "").trim() ||
		"Кассир";

	const stages = useMemo<readonly TreatmentPlanStageOption[]>(() => {
		if (propStages && propStages.length > 0) {
			return propStages;
		}
		if (isDemoShowcaseMode()) {
			return DEFAULT_TREATMENT_STAGES;
		}
		return [
			{
				id: "single_visit",
				titleRu: "Оплата текущего приёма",
				stageKind: "full",
				amountKop: initialTotalBillKop,
				itemsCount: 1,
			},
		];
	}, [propStages, initialTotalBillKop]);

	const [selectedStageId, setSelectedStageId] = useState<string>("full_plan");
	const [stagePaymentMode, setStagePaymentMode] = useState<StagePaymentMode>("full");
	const [advanceAlreadyPaidRub] = useState<number>(0);
	const [activeMethod, setActiveMethod] = useState<CheckoutPaymentMethodType>(
		initialPaymentMethod ?? "sbp_qr"
	);

	// Split Payment State (amounts in Rubles)
	const [cardAmountRub, setCardAmountRub] = useState<number>(0);
	const [cashAmountRub, setCashAmountRub] = useState<number>(0);
	const [sbpAmountRub, setSbpAmountRub] = useState<number>(0);
	const [sbpStatus, setSbpStatus] = useState<"awaiting" | "paid" | "failed">("awaiting");
	const [isCheckingSbp, setIsCheckingSbp] = useState<boolean>(false);
	const [sbpCheckMessage, setSbpCheckMessage] = useState<string | null>(null);
	const [depositAmountRub, setDepositAmountRub] = useState<number>(0);
	const [loyaltyAmountRub, setLoyaltyAmountRub] = useState<number>(0);
	const [dmsAmountRub, setDmsAmountRub] = useState<number>(0);
	const [cashTenderedRub, setCashTenderedRub] = useState<number>(0);
	const [isPrinting, setIsPrinting] = useState<boolean>(false);
	const inFlightRef = useRef(false);
	const lastClickTimeRef = useRef(0);
	const [, setIsOfflineBuffered] = useState<boolean>(false);
	const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
	const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);

	// Acquiring & Fiscalization Emergency Fault-Tolerance
	const [interruptedPaymentState, setInterruptedPaymentState] = useState<{
		readonly isInterrupted: boolean;
		readonly reason: string;
		readonly amountRub: number;
		readonly method: string;
	} | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);
	const [kktHardwareStatus, setKktHardwareStatus] = useState<{
		readonly online: boolean;
		readonly paperOk: boolean;
		readonly error?: string | undefined;
		readonly isChecking: boolean;
	}>({
		online: false,
		paperOk: false,
		isChecking: Boolean(isOpen),
	});

	const [isTier2Open, setIsTier2Open] = useState<boolean>(false);
	const [isSimpleCashierMode, setIsSimpleCashierMode] = useState<boolean>(
		initialSimpleCashierMode ?? true
	);
	const [clientType, setClientType] = useState<ClientLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerName, setBuyerName] = useState<string>("");
	const [isElectronicReceiptOnly, setIsElectronicReceiptOnly] = useState<boolean>(false);
	const [discountPreset, setDiscountPreset] = useState<FastCheckoutDiscountPreset>("none");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);

	useEffect(() => {
		if (isOpen) {
			if (initialPaymentMethod) {
				setActiveMethod(initialPaymentMethod);
			}
			setSbpStatus("awaiting");
			setSbpCheckMessage(null);
			if (!propStages || propStages.length === 0) {
				if (!isDemoShowcaseMode()) {
					setSelectedStageId("single_visit");
				} else {
					setSelectedStageId("full_plan");
				}
			} else if (propStages.length === 1) {
				setSelectedStageId(propStages[0]!.id);
			} else {
				setSelectedStageId("full_plan");
			}

			setKktHardwareStatus((prev) => ({ ...prev, isChecking: true }));
			void KktLanPrinterService.checkDeviceHealth()
				.then((status) => {
					setKktHardwareStatus({
						online: status.online,
						paperOk: status.paperOk,
						error: status.error,
						isChecking: false,
					});
				})
				.catch(() => {
					setKktHardwareStatus({
						online: false,
						paperOk: false,
						error: "Кассовый аппарат временно недоступен в сети",
						isChecking: false,
					});
				});
		}
		if (!isOpen) {
			inFlightRef.current = false;
			setIsPrinting(false);
		}
	}, [isOpen, initialPaymentMethod, propStages]);

	const baseStageAmountKop = useMemo(() => {
		if (selectedStageId === "full_plan") {
			return initialTotalBillKop;
		}
		const stage = stages.find((s) => s.id === selectedStageId);
		return stage ? stage.amountKop : initialTotalBillKop;
	}, [selectedStageId, initialTotalBillKop, stages]);

	const discountCalc = useMemo(() => {
		return calculateFastCheckoutDiscount({
			grossKop: baseStageAmountKop,
			preset: discountPreset,
			customPercent: customDiscountPercent,
		});
	}, [baseStageAmountKop, discountPreset, customDiscountPercent]);

	const discountedStageAmountKop = discountCalc.netKop;

	const stageCalc = useMemo(() => {
		return calculateStageAdvanceAmount(
			discountedStageAmountKop,
			stagePaymentMode,
			Math.round(advanceAlreadyPaidRub * 100)
		);
	}, [discountedStageAmountKop, stagePaymentMode, advanceAlreadyPaidRub]);

	const effectiveBillKop = stageCalc.requiredAmountKop;
	const targetBillKop =
		stagePaymentMode === "advance_offset_tag1215"
			? discountedStageAmountKop
			: effectiveBillKop;
	const targetBillRub = targetBillKop / 100;
	const effectiveTotalRub = targetBillRub;

	const effectiveSbpAmountRub = sbpAmountRub > 0 ? sbpAmountRub : targetBillRub;
	const effectiveSbpKopecks = Math.round(effectiveSbpAmountRub * 100);
	const effectiveSbpOrderId = orderId?.trim() || `ORD-${Math.abs(initialTotalBillKop || 1000)}`;

	const sbpQrData = useMemo(() => {
		if (effectiveSbpKopecks <= 0) return null;
		try {
			const payload = generateDynamicSbpQrPayload({
				sumRub: effectiveSbpAmountRub,
				orderId: effectiveSbpOrderId,
				purpose: `Оплата стоматологических услуг (заказ ${effectiveSbpOrderId})`,
				clinicName: "ООО ДЕНТЕ",
				ttlMinutes: 15,
			});
			const svg = generateQrCodeSvg(payload.nspkUrl, {
				size: 160,
				margin: 2,
				colorDark: "#0f172a",
				colorLight: "#ffffff",
				title: `QR-код СБП: ${payload.sumFormattedRu}`,
			});
			return { payload, svg };
		} catch {
			return null;
		}
	}, [effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId]);

	useEffect(() => {
		if (!isOpen) return;

		if (stagePaymentMode === "advance_offset_tag1215") {
			setCardAmountRub(0);
			setCashAmountRub(0);
			setSbpAmountRub(0);
			setDepositAmountRub(0);
			setLoyaltyAmountRub(0);
			setDmsAmountRub(0);
			setCashTenderedRub(0);

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
		} else if (isSimpleCashierMode) {
			setCardAmountRub(0);
			setCashAmountRub(0);
			setSbpAmountRub(0);
			setDepositAmountRub(0);
			setLoyaltyAmountRub(0);
			setDmsAmountRub(0);
			setCashTenderedRub(0);

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
		} else {
			// Split Mode: preserve allocated tenders and only initialize if all are empty
			const totalAllocated =
				cardAmountRub +
				cashAmountRub +
				sbpAmountRub +
				depositAmountRub +
				loyaltyAmountRub +
				dmsAmountRub;
			if (totalAllocated === 0 && targetBillRub > 0) {
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
		}
	}, [
		isOpen,
		targetBillKop,
		targetBillRub,
		isSimpleCashierMode,
		stagePaymentMode,
		stageCalc.advanceOffsetTag1215Kop,
		stageCalc.requiredAmountKop,
	]);

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
	};

	const handleAddRemainingToCard = () => {
		if (remainingKop <= 0) return;
		setCardAmountRub((prev) => {
			const prevKop = Math.round(prev * 100);
			const nextKop = prevKop + remainingKop;
			return +(nextKop / 100).toFixed(2);
		});
	};

	const handleAddRemainingToCash = () => {
		if (remainingKop <= 0) return;
		const prevKop = Math.round(cashAmountRub * 100);
		const nextKop = prevKop + remainingKop;
		const nextCash = +(nextKop / 100).toFixed(2);
		setCashAmountRub(nextCash);
		if (cashTenderedRub < nextCash) {
			setCashTenderedRub(nextCash);
		}
	};

	const handleAddRemainingToSbp = () => {
		if (remainingKop <= 0) return;
		setSbpAmountRub((prev) => {
			const prevKop = Math.round(prev * 100);
			const nextKop = prevKop + remainingKop;
			return +(nextKop / 100).toFixed(2);
		});
	};

	const handleAddRemainingToDeposit = () => {
		if (remainingKop <= 0) return;
		const totalAvailDepositKop = Math.round(((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)) * 100);
		const currentDepositKop = Math.round(depositAmountRub * 100);
		const remainingAvailDepositKop = Math.max(0, totalAvailDepositKop - currentDepositKop);

		const toAddKop = totalAvailDepositKop > 0
			? Math.min(remainingKop, remainingAvailDepositKop)
			: remainingKop;

		if (toAddKop <= 0) return;

		setDepositAmountRub((prev) => {
			const prevKop = Math.round(prev * 100);
			const nextKop = prevKop + toAddKop;
			return +(nextKop / 100).toFixed(2);
		});
	};

	const handleAddRemainingDepositPlusCard = () => {
		if (remainingKop <= 0) return;
		const totalAvailDepositKop = Math.round(((patientDepositRub || 0) + (patientFamilyBalanceRub || 0)) * 100);
		const currentDepositKop = Math.round(depositAmountRub * 100);
		const remainingAvailDepositKop = Math.max(0, totalAvailDepositKop - currentDepositKop);

		const depositTakeKop = Math.min(remainingKop, remainingAvailDepositKop);
		const cardTakeKop = remainingKop - depositTakeKop;

		if (depositTakeKop > 0) {
			setDepositAmountRub((prev) => +(Math.round(prev * 100 + depositTakeKop) / 100).toFixed(2));
		}
		if (cardTakeKop > 0) {
			setCardAmountRub((prev) => +(Math.round(prev * 100 + cardTakeKop) / 100).toFixed(2));
		}
	};

	const handleAddRemainingToLoyalty = () => {
		if (remainingKop <= 0) return;
		setLoyaltyAmountRub((prev) => {
			const prevKop = Math.round(prev * 100);
			const nextKop = prevKop + remainingKop;
			return +(nextKop / 100).toFixed(2);
		});
	};

	const handleAddRemaining5050 = () => {
		if (remainingKop <= 0) return;
		const halfCardKop = Math.floor(remainingKop / 2);
		const halfCashKop = remainingKop - halfCardKop;
		setCardAmountRub((prev) => +(Math.round(prev * 100 + halfCardKop) / 100).toFixed(2));
		setCashAmountRub((prev) => {
			const nextCash = +(Math.round(prev * 100 + halfCashKop) / 100).toFixed(2);
			if (cashTenderedRub < nextCash) {
				setCashTenderedRub(nextCash);
			}
			return nextCash;
		});
	};

	const handleAddRemainingToFamily = () => {
		if (remainingKop <= 0) return;
		const availFamKop = Math.round(Math.max(0, patientFamilyBalanceRub) * 100);
		const currentDepositKop = Math.round(depositAmountRub * 100);
		const toAddKop = availFamKop > 0 ? Math.min(remainingKop, availFamKop) : remainingKop;
		setDepositAmountRub((prev) => +(Math.round(prev * 100 + toAddKop) / 100).toFixed(2));
	};

	const handleExecutePayment = async (forceOfflineBuffer = false) => {
		await executeFiscalPayment(
			{
				targetBillKop,
				targetBillRub,
				effectiveTotalRub,
				cardAmountRub,
				cashAmountRub,
				sbpAmountRub,
				depositAmountRub,
				loyaltyAmountRub,
				dmsAmountRub,
				cashTenderedRub,
				remainingRub,
				activeMethod,
				validation,
				clientType,
				buyerInn,
				buyerName,
				isElectronicReceiptOnly,
				patientId,
				visitId,
				patientPhone,
				patientEmail,
				orderId,
				effectiveCashierFullName,
				stageCalc,
				onPaymentComplete,
				onClose,
				inFlightRef,
				lastClickTimeRef,
				isPrinting,
				setIsPrinting,
				setIsOfflineBuffered,
				setInterruptedPaymentState,
				setCardAmountRub,
				setCashAmountRub,
				setCashTenderedRub,
				setSbpAmountRub,
				setDepositAmountRub,
				setLoyaltyAmountRub,
				setDmsAmountRub,
			},
			forceOfflineBuffer
		);
	};

	const handleCheckSbpStatus = async (manual = false) => {
		if (isCheckingSbp || sbpStatus === "paid" || effectiveSbpKopecks <= 0) return;
		setIsCheckingSbp(true);
		try {
			const headers = denteAdminSecretRequestHeaders({ Accept: "application/json" });
			const queryUrl = `/api/fiscal/sbp-status?orderId=${encodeURIComponent(effectiveSbpOrderId)}&qrId=${encodeURIComponent(sbpQrData?.payload.qrId || "")}&sumKop=${effectiveSbpKopecks}`;
			const res = await fetch(queryUrl, { headers });
			if (res.ok) {
				const data = (await res.json().catch(() => null)) as { paid?: boolean; status?: string } | null;
				if (data && (data.paid || data.status === "paid")) {
					setSbpStatus("paid");
					setSbpCheckMessage("Оплата по СБП подтверждена банком! Формируем фискальный чек...");
					showToast("Оплата через СБП подтверждена! Кассовый чек сформирован.", "success");
					await handleExecutePayment(false);
					return;
				}
			}
			if (manual) {
				setSbpCheckMessage("Платёж через СБП пока не поступил. Ожидается проведение банком.");
				showToast("Платёж пока не поступил от банка", "info");
			}
		} catch {
			if (manual) {
				setSbpCheckMessage("Шлюз СБП временно недоступен. Проверьте банковскую выписку.");
			}
		} finally {
			setIsCheckingSbp(false);
		}
	};

	const handleConfirmSbpManual = async () => {
		setIsCheckingSbp(true);
		try {
			const headers = denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
				Accept: "application/json",
			});
			await fetch("/api/fiscal/sbp-status", {
				method: "POST",
				headers,
				body: JSON.stringify({
					orderId: effectiveSbpOrderId,
					qrId: sbpQrData?.payload.qrId,
					action: "confirm_manual",
					sumKopecks: effectiveSbpKopecks,
				}),
			}).catch(() => null);

			setSbpStatus("paid");
			setSbpCheckMessage("Поступление средств по СБП подтверждено кассиром. Формируем кассовый чек...");
			showToast("Оплата СБП подтверждена кассиром! Печатаем кассовый чек...", "success");
			await handleExecutePayment(false);
		} catch {
			setSbpStatus("paid");
			await handleExecutePayment(false);
		} finally {
			setIsCheckingSbp(false);
		}
	};

	useEffect(() => {
		if (!isOpen || sbpStatus === "paid" || (activeMethod !== "sbp_qr" && sbpAmountRub <= 0)) {
			return;
		}
		const interval = setInterval(() => {
			handleCheckSbpStatus(false);
		}, 3500);
		return () => clearInterval(interval);
	}, [isOpen, sbpStatus, activeMethod, sbpAmountRub, effectiveSbpOrderId, effectiveSbpKopecks]);

	const handleManualCardTerminalConfirm = async (overrideAmountRub?: number) => {
		await executeManualCardTerminalConfirm({
			targetBillRub,
			overrideAmountRub,
			patientId,
			visitId,
			patientPhone,
			patientEmail,
			effectiveCashierFullName,
			orderId,
			clientType,
			buyerInn,
			buyerName,
			isElectronicReceiptOnly,
			stageCalc,
			onPaymentComplete,
			onClose,
			setIsSubmittingManualCard,
			setIsOfflineBuffered,
			setInterruptedPaymentState,
		});
	};

	const handleAcceptPaymentOfflineFallback = async () => {
		showToast("Принимаем оплату через автономный терминал (без ККТ)... Чек поставлен в очередь отложенной печати!", "info", 3000);
		await handleExecutePayment(true);
	};

	const handleRetryFiscalizationDirect = async () => {
		setIsFlushingQueue(true);
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
				cashRub: cashAmountRub,
				electronicRub: cardAmountRub + sbpAmountRub,
				prepaidRub: depositAmountRub + loyaltyAmountRub,
				taxationSystem: "usn_income_expense",
			});

			if (printResult.success) {
				showToast("Кассовый чек успешно фискализирован на ККТ без повторного изменения баланса!", "success", 4500);
				setInterruptedPaymentState(null);
			} else {
				const res = await FiscalReceiptQueueManager.flushAllPending();
				if (res.failedCount === 0 && res.printedCount > 0) {
					showToast(`Очередь фискализации успешно отправлена в ОФД (${res.printedCount} чеков)!`, "success");
					setInterruptedPaymentState(null);
				} else {
					showToast(printResult.error || "ККТ недоступна. Чек сохранён в очереди", "warning");
				}
			}
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Сбой связи при повторной фискализации";
			showToast(errMsg, "error");
		} finally {
			setIsFlushingQueue(false);
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

	return {
		stages,
		selectedStageId,
		stagePaymentMode,
		setStagePaymentMode,
		activeMethod,
		setActiveMethod,
		cardAmountRub,
		setCardAmountRub,
		cashAmountRub,
		setCashAmountRub,
		sbpAmountRub,
		setSbpAmountRub,
		sbpStatus,
		isCheckingSbp,
		sbpCheckMessage,
		depositAmountRub,
		setDepositAmountRub,
		loyaltyAmountRub,
		setLoyaltyAmountRub,
		cashTenderedRub,
		setCashTenderedRub,
		isPrinting,
		pendingOfflineCount,
		isFlushingQueue,
		interruptedPaymentState,
		setInterruptedPaymentState,
		isSubmittingManualCard,
		kktHardwareStatus,
		isTier2Open,
		setIsTier2Open,
		isSimpleCashierMode,
		setIsSimpleCashierMode,
		clientType,
		setClientType,
		buyerInn,
		setBuyerInn,
		buyerName,
		setBuyerName,
		isElectronicReceiptOnly,
		setIsElectronicReceiptOnly,
		discountPreset,
		setDiscountPreset,
		customDiscountPercent,
		setCustomDiscountPercent,
		baseStageAmountKop,
		discountCalc,
		stageCalc,
		effectiveBillKop,
		targetBillKop,
		targetBillRub,
		effectiveSbpAmountRub,
		sbpQrData,
		remainingKop,
		remainingRub,
		cashChange,
		validation,
		handleQuickPreset,
		handleStageSelect,
		handleSingle100Percent,
		handleAddRemainingToCard,
		handleAddRemainingToCash,
		handleAddRemainingToSbp,
		handleAddRemainingToDeposit,
		handleAddRemainingDepositPlusCard,
		handleAddRemainingToLoyalty,
		handleAddRemaining5050,
		handleAddRemainingToFamily,
		handleExecutePayment,
		handleCheckSbpStatus,
		handleConfirmSbpManual,
		handleManualCardTerminalConfirm,
		handleAcceptPaymentOfflineFallback,
		handleRetryFiscalizationDirect,
		handleFlushQueue,
	};
}
