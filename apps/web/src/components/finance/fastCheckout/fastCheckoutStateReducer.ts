import { useEffect, useMemo, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast";
import {
	addKopToRubAmount, buildFastCheckoutSbpQrData, calculateBaseStageAmountKop,
	calculateSplitRemainingKop, computeCashChange, computeCheckoutValidation,
	computeDepositPlusCardRemainderSplitKop, computeDepositRemainderTakeKop,
	computeFamilyRemainderTakeKop, computeHalfSplitRemainderKop, computeQuickPresetSplitResult,
	computeStageAdvanceCalc, computeStageDiscountCalc, computeTargetBillAmounts,
	resolveEffectiveCashierFullName, resolveInitialSelectedStageId, resolveInitialTotalBillKop,
	resolveTreatmentStages, splitStateToCheckoutPayments,
} from "./fastCheckoutCalculations";
import {
	checkFastCheckoutKktDeviceHealth, executeCheckSbpStatus, executeConfirmSbpManual,
	executeFiscalPayment, executeFlushOfflineFiscalQueue, executeManualCardTerminalConfirm,
	executeRetryFiscalizationDirect, subscribeFastCheckoutOfflineQueue,
} from "./fastCheckoutFiscalSync";
import type {
	CheckoutPaymentMethodType, CheckoutSplitItem, ClientLegalType,
	FastCheckoutDiscountPreset, FastCheckoutSplitAmountsSetters, InterruptedPaymentState,
	KktHardwareStatusState, QuickCheckoutPresetType, SbpPaymentCheckStatus,
	StagePaymentMode, TreatmentPlanStageOption, UseFastCheckoutLogicProps,
} from "./types";

/** Сбрасывает все поля распределения сумм сплита в 0 ₽ */
export function resetAllSplitAmounts(setters: FastCheckoutSplitAmountsSetters): void {
	setters.setCardAmountRub(0);
	setters.setCashAmountRub(0);
	setters.setSbpAmountRub(0);
	setters.setDepositAmountRub(0);
	setters.setLoyaltyAmountRub(0);
	setters.setDmsAmountRub(0);
	setters.setCashTenderedRub(0);
}

/** Распределяет 100% целевой суммы на выбранный способ оплаты */
export function assignFullAmountToMethod(
	method: CheckoutPaymentMethodType,
	amountRub: number,
	setters: FastCheckoutSplitAmountsSetters,
	includeDepositMethod = true,
): void {
	if (method === "cash") {
		setters.setCashAmountRub(amountRub);
		setters.setCashTenderedRub(amountRub);
	} else if (method === "sbp_qr") {
		setters.setSbpAmountRub(amountRub);
	} else if (includeDepositMethod && method === "patient_deposit") {
		setters.setDepositAmountRub(amountRub);
	} else if (method === "loyalty_points") {
		setters.setLoyaltyAmountRub(amountRub);
	} else if (method === "dms_insurance") {
		setters.setDmsAmountRub(amountRub);
	} else {
		setters.setCardAmountRub(amountRub);
	}
}

/** Главная стейт-машина и хук управления быстрой кассой useFastCheckoutLogic */
export function useFastCheckoutStateMachine(props: UseFastCheckoutLogicProps) {
	const {
		isOpen, onClose, totalBillKop: propTotalBillKop, totalBillRub: propTotalBillRub,
		initialPaymentMethod, initialSimpleCashierMode, patientId, visitId,
		patientPhone = "", patientEmail = "", patientDepositRub = 0, patientFamilyBalanceRub = 0,
		orderId = "", stages: propStages, cashierFullName: propCashierFullName,
		attendingDoctorName, onPaymentComplete,
	} = props;

	const initialTotalBillKop = resolveInitialTotalBillKop(propTotalBillKop, propTotalBillRub);
	const effectiveCashierFullName = resolveEffectiveCashierFullName(propCashierFullName, attendingDoctorName);

	const stages = useMemo<readonly TreatmentPlanStageOption[]>(() => {
		return resolveTreatmentStages(propStages, initialTotalBillKop, isDemoShowcaseMode());
	}, [propStages, initialTotalBillKop]);

	const [selectedStageId, setSelectedStageId] = useState<string>("full_plan");
	const [stagePaymentMode, setStagePaymentMode] = useState<StagePaymentMode>("full");
	const [advanceAlreadyPaidRub] = useState<number>(0);
	const [activeMethod, setActiveMethod] = useState<CheckoutPaymentMethodType>(initialPaymentMethod ?? "sbp_qr");

	// Split Payment State (amounts in Rubles)
	const [cardAmountRub, setCardAmountRub] = useState<number>(0);
	const [cashAmountRub, setCashAmountRub] = useState<number>(0);
	const [sbpAmountRub, setSbpAmountRub] = useState<number>(0);
	const [sbpStatus, setSbpStatus] = useState<SbpPaymentCheckStatus>("awaiting");
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
	const [interruptedPaymentState, setInterruptedPaymentState] = useState<InterruptedPaymentState | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);
	const [kktHardwareStatus, setKktHardwareStatus] = useState<KktHardwareStatusState>({
		online: false, paperOk: false, isChecking: Boolean(isOpen),
	});

	const [isTier2Open, setIsTier2Open] = useState<boolean>(false);
	const [isSimpleCashierMode, setIsSimpleCashierMode] = useState<boolean>(initialSimpleCashierMode ?? true);
	const [clientType, setClientType] = useState<ClientLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerName, setBuyerName] = useState<string>("");
	const [isElectronicReceiptOnly, setIsElectronicReceiptOnly] = useState<boolean>(false);
	const [discountPreset, setDiscountPreset] = useState<FastCheckoutDiscountPreset>("none");
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(0);

	const splitSetters: FastCheckoutSplitAmountsSetters = {
		setCardAmountRub, setCashAmountRub, setSbpAmountRub,
		setDepositAmountRub, setLoyaltyAmountRub, setDmsAmountRub, setCashTenderedRub,
	};

	useEffect(() => {
		if (isOpen) {
			if (initialPaymentMethod) setActiveMethod(initialPaymentMethod);
			setSbpStatus("awaiting");
			setSbpCheckMessage(null);
			setSelectedStageId(resolveInitialSelectedStageId(propStages, isDemoShowcaseMode()));
			setKktHardwareStatus((prev) => ({ ...prev, isChecking: true }));
			void checkFastCheckoutKktDeviceHealth().then((status) => {
				setKktHardwareStatus(status);
			});
		}
		if (!isOpen) {
			inFlightRef.current = false;
			setIsPrinting(false);
		}
	}, [isOpen, initialPaymentMethod, propStages]);

	const baseStageAmountKop = useMemo(() => {
		const configuredKop = calculateBaseStageAmountKop(selectedStageId, initialTotalBillKop, stages);
		if (configuredKop > 0) return configuredKop;
		const splitSumKop = Math.round(
			(cardAmountRub + cashAmountRub + sbpAmountRub + depositAmountRub + loyaltyAmountRub + dmsAmountRub) * 100,
		);
		return splitSumKop > 0 ? splitSumKop : 0;
	}, [
		selectedStageId,
		initialTotalBillKop,
		stages,
		cardAmountRub,
		cashAmountRub,
		sbpAmountRub,
		depositAmountRub,
		loyaltyAmountRub,
		dmsAmountRub,
	]);

	const discountCalc = useMemo(() => {
		return computeStageDiscountCalc(baseStageAmountKop, discountPreset, customDiscountPercent);
	}, [baseStageAmountKop, discountPreset, customDiscountPercent]);

	const discountedStageAmountKop = discountCalc.netKop;

	const stageCalc = useMemo(() => {
		return computeStageAdvanceCalc(discountedStageAmountKop, stagePaymentMode, advanceAlreadyPaidRub);
	}, [discountedStageAmountKop, stagePaymentMode, advanceAlreadyPaidRub]);

	const { effectiveBillKop, targetBillKop, targetBillRub, effectiveTotalRub } =
		computeTargetBillAmounts(discountedStageAmountKop, stagePaymentMode, stageCalc);

	const effectiveSbpAmountRub = sbpAmountRub > 0 ? sbpAmountRub : targetBillRub;
	const effectiveSbpKopecks = Math.round(effectiveSbpAmountRub * 100);
	const effectiveSbpOrderId = orderId?.trim() || `ORD-${Math.abs(initialTotalBillKop || 1000)}`;

	const sbpQrData = useMemo(() => {
		return buildFastCheckoutSbpQrData(effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId);
	}, [effectiveSbpAmountRub, effectiveSbpKopecks, effectiveSbpOrderId]);

	useEffect(() => {
		if (!isOpen) return;
		if (stagePaymentMode === "advance_offset_tag1215") {
			resetAllSplitAmounts(splitSetters);
			const offsetRub = stageCalc.advanceOffsetTag1215Kop / 100;
			const reqRub = stageCalc.requiredAmountKop / 100;
			setDepositAmountRub(offsetRub);
			assignFullAmountToMethod(activeMethod, reqRub, splitSetters, false);
		} else if (isSimpleCashierMode) {
			resetAllSplitAmounts(splitSetters);
			assignFullAmountToMethod(activeMethod, targetBillRub, splitSetters, true);
		} else {
			const totalAllocated = cardAmountRub + cashAmountRub + sbpAmountRub + depositAmountRub + loyaltyAmountRub + dmsAmountRub;
			if (totalAllocated === 0 && targetBillRub > 0) {
				assignFullAmountToMethod(activeMethod, targetBillRub, splitSetters, true);
			}
		}
	}, [isOpen, targetBillKop, targetBillRub, isSimpleCashierMode, stagePaymentMode, stageCalc.advanceOffsetTag1215Kop, stageCalc.requiredAmountKop]);

	useEffect(() => {
		return subscribeFastCheckoutOfflineQueue(setPendingOfflineCount);
	}, []);

	const payments = useMemo<readonly CheckoutSplitItem[]>(() => {
		return splitStateToCheckoutPayments({
			cardRub: cardAmountRub, cashRub: cashAmountRub, sbpRub: sbpAmountRub,
			depositRub: depositAmountRub, loyaltyRub: loyaltyAmountRub, dmsRub: dmsAmountRub,
		});
	}, [cardAmountRub, cashAmountRub, sbpAmountRub, depositAmountRub, loyaltyAmountRub, dmsAmountRub]);

	const remainingKop = useMemo(() => calculateSplitRemainingKop(targetBillKop, payments), [targetBillKop, payments]);
	const remainingRub = useMemo(() => +(remainingKop / 100).toFixed(2), [remainingKop]);
	const cashChange = useMemo(() => computeCashChange(cashTenderedRub, cashAmountRub), [cashTenderedRub, cashAmountRub]);

	const validation = useMemo(() => {
		return computeCheckoutValidation({
			orderId, targetBillKop, payments, cashTenderedRub, patientPhone, patientEmail,
			clientType, buyerInn, buyerName, isElectronicReceiptOnly,
		});
	}, [orderId, targetBillKop, payments, cashTenderedRub, patientPhone, patientEmail, clientType, buyerInn, buyerName, isElectronicReceiptOnly]);

	const handleQuickPreset = (preset: QuickCheckoutPresetType) => {
		if (preset === "warranty_100") {
			setDiscountPreset("warranty_100");
			resetAllSplitAmounts(splitSetters);
			showToast("Применено: 100% Гарантия / переделка (0 ₽)", "info", 2000);
			return;
		}
		const { activeMethod: nextMethod, splitState, cashTenderedRub: nextTendered } =
			computeQuickPresetSplitResult(preset, targetBillKop, patientDepositRub, patientFamilyBalanceRub);
		setActiveMethod(nextMethod);
		setCardAmountRub(splitState.cardRub);
		setCashAmountRub(splitState.cashRub);
		setSbpAmountRub(splitState.sbpRub);
		setDepositAmountRub(splitState.depositRub);
		setLoyaltyAmountRub(splitState.loyaltyRub);
		setDmsAmountRub(splitState.dmsRub ?? 0);
		setCashTenderedRub(nextTendered);
	};

	const handleStageSelect = (stageId: string) => {
		setSelectedStageId(stageId);
		setCashTenderedRub(0);
	};

	const handleSingle100Percent = (method: CheckoutPaymentMethodType) => {
		setActiveMethod(method);
		resetAllSplitAmounts(splitSetters);
		assignFullAmountToMethod(method, targetBillRub, splitSetters, true);
	};

	const handleAddRemainingToCard = () => {
		if (remainingKop <= 0) return;
		setCardAmountRub((prev) => addKopToRubAmount(prev, remainingKop));
	};

	const handleAddRemainingToCash = () => {
		if (remainingKop <= 0) return;
		const nextCash = addKopToRubAmount(cashAmountRub, remainingKop);
		setCashAmountRub(nextCash);
		if (cashTenderedRub < nextCash) setCashTenderedRub(nextCash);
	};

	const handleAddRemainingToSbp = () => {
		if (remainingKop <= 0) return;
		setSbpAmountRub((prev) => addKopToRubAmount(prev, remainingKop));
	};

	const handleAddRemainingToDeposit = () => {
		const toAddKop = computeDepositRemainderTakeKop(remainingKop, patientDepositRub, patientFamilyBalanceRub, depositAmountRub);
		if (toAddKop <= 0) return;
		setDepositAmountRub((prev) => addKopToRubAmount(prev, toAddKop));
	};

	const handleAddRemainingDepositPlusCard = () => {
		if (remainingKop <= 0) return;
		const { depositTakeKop, cardTakeKop } =
			computeDepositPlusCardRemainderSplitKop(remainingKop, patientDepositRub, patientFamilyBalanceRub, depositAmountRub);
		if (depositTakeKop > 0) setDepositAmountRub((prev) => addKopToRubAmount(prev, depositTakeKop));
		if (cardTakeKop > 0) setCardAmountRub((prev) => addKopToRubAmount(prev, cardTakeKop));
	};

	const handleAddRemainingToLoyalty = () => {
		if (remainingKop <= 0) return;
		setLoyaltyAmountRub((prev) => addKopToRubAmount(prev, remainingKop));
	};

	const handleAddRemaining5050 = () => {
		if (remainingKop <= 0) return;
		const { halfCardKop, halfCashKop } = computeHalfSplitRemainderKop(remainingKop);
		setCardAmountRub((prev) => addKopToRubAmount(prev, halfCardKop));
		setCashAmountRub((prev) => {
			const nextCash = addKopToRubAmount(prev, halfCashKop);
			if (cashTenderedRub < nextCash) setCashTenderedRub(nextCash);
			return nextCash;
		});
	};

	const handleAddRemainingToFamily = () => {
		if (remainingKop <= 0) return;
		const toAddKop = computeFamilyRemainderTakeKop(remainingKop, patientFamilyBalanceRub);
		setDepositAmountRub((prev) => addKopToRubAmount(prev, toAddKop));
	};

	const handleExecutePayment = async (forceOfflineBuffer = false) => {
		await executeFiscalPayment(
			{
				targetBillKop, targetBillRub, effectiveTotalRub, cardAmountRub, cashAmountRub, sbpAmountRub,
				depositAmountRub, loyaltyAmountRub, dmsAmountRub, cashTenderedRub, remainingRub, activeMethod,
				validation, clientType, buyerInn, buyerName, isElectronicReceiptOnly, patientId, visitId,
				patientPhone, patientEmail, orderId, effectiveCashierFullName, stageCalc, onPaymentComplete,
				onClose, inFlightRef, lastClickTimeRef, isPrinting, setIsPrinting, setIsOfflineBuffered,
				setInterruptedPaymentState, setCardAmountRub, setCashAmountRub, setCashTenderedRub,
				setSbpAmountRub, setDepositAmountRub, setLoyaltyAmountRub, setDmsAmountRub,
			},
			forceOfflineBuffer,
		);
	};

	const handleCheckSbpStatus = async (manual = false) => {
		await executeCheckSbpStatus({
			isCheckingSbp, sbpStatus, effectiveSbpKopecks, effectiveSbpOrderId, sbpQrData, manual,
			setIsCheckingSbp, setSbpStatus, setSbpCheckMessage,
			onPaidConfirmed: () => handleExecutePayment(false),
		});
	};

	const handleConfirmSbpManual = async () => {
		await executeConfirmSbpManual({
			effectiveSbpOrderId, sbpQrData, effectiveSbpKopecks,
			setIsCheckingSbp, setSbpStatus, setSbpCheckMessage,
			onPaidConfirmed: () => handleExecutePayment(false),
		});
	};

	useEffect(() => {
		if (!isOpen || sbpStatus === "paid" || (activeMethod !== "sbp_qr" && sbpAmountRub <= 0)) return;
		const interval = setInterval(() => {
			void handleCheckSbpStatus(false);
		}, 3500);
		return () => clearInterval(interval);
	}, [isOpen, sbpStatus, activeMethod, sbpAmountRub, effectiveSbpOrderId, effectiveSbpKopecks]);

	const handleManualCardTerminalConfirm = async (overrideAmountRub?: number) => {
		await executeManualCardTerminalConfirm({
			targetBillRub, overrideAmountRub, patientId, visitId, patientPhone, patientEmail,
			effectiveCashierFullName, orderId, clientType, buyerInn, buyerName, isElectronicReceiptOnly,
			stageCalc, onPaymentComplete, onClose, setIsSubmittingManualCard, setIsOfflineBuffered,
			setInterruptedPaymentState,
		});
	};

	const handleAcceptPaymentOfflineFallback = async () => {
		showToast(
			"Принимаем оплату через автономный терминал (без ККТ)... Чек поставлен в очередь отложенной печати!",
			"info",
			3000,
		);
		await handleExecutePayment(true);
	};

	const handleRetryFiscalizationDirect = async () => {
		await executeRetryFiscalizationDirect({
			patientPhone, patientEmail, effectiveCashierFullName, targetBillRub, cashAmountRub,
			cardAmountRub, sbpAmountRub, depositAmountRub, loyaltyAmountRub,
			setIsFlushingQueue, setInterruptedPaymentState,
		});
	};

	const handleFlushQueue = async () => {
		await executeFlushOfflineFiscalQueue(setIsFlushingQueue);
	};

	return {
		stages, selectedStageId, stagePaymentMode, setStagePaymentMode, activeMethod, setActiveMethod,
		cardAmountRub, setCardAmountRub, cashAmountRub, setCashAmountRub, sbpAmountRub, setSbpAmountRub,
		sbpStatus, isCheckingSbp, sbpCheckMessage, depositAmountRub, setDepositAmountRub,
		loyaltyAmountRub, setLoyaltyAmountRub, cashTenderedRub, setCashTenderedRub, isPrinting,
		pendingOfflineCount, isFlushingQueue, interruptedPaymentState, setInterruptedPaymentState,
		isSubmittingManualCard, kktHardwareStatus, isTier2Open, setIsTier2Open,
		isSimpleCashierMode, setIsSimpleCashierMode, clientType, setClientType, buyerInn, setBuyerInn,
		buyerName, setBuyerName, isElectronicReceiptOnly, setIsElectronicReceiptOnly,
		discountPreset, setDiscountPreset, customDiscountPercent, setCustomDiscountPercent,
		baseStageAmountKop, discountCalc, stageCalc, effectiveBillKop, targetBillKop, targetBillRub,
		effectiveSbpAmountRub, sbpQrData, remainingKop, remainingRub, cashChange, validation,
		handleQuickPreset, handleStageSelect, handleSingle100Percent, handleAddRemainingToCard,
		handleAddRemainingToCash, handleAddRemainingToSbp, handleAddRemainingToDeposit,
		handleAddRemainingDepositPlusCard, handleAddRemainingToLoyalty, handleAddRemaining5050,
		handleAddRemainingToFamily, handleExecutePayment, handleCheckSbpStatus, handleConfirmSbpManual,
		handleManualCardTerminalConfirm, handleAcceptPaymentOfflineFallback,
		handleRetryFiscalizationDirect, handleFlushQueue,
	};
}

export const useFastCheckoutLogic = useFastCheckoutStateMachine;
