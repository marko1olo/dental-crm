import { useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	checkFastCheckoutKktDeviceHealth,
	subscribeFastCheckoutOfflineQueue,
} from "./fastCheckoutFiscalSync";
import {
	resolveEffectiveCashierFullName,
	resolveInitialSelectedStageId,
	resolveInitialTotalBillKop,
	resolveTreatmentStages,
} from "./fastCheckoutCalculations";
import type {
	CheckoutPaymentMethodType,
	ClientLegalType,
	FastCheckoutDiscountPreset,
	FastCheckoutSplitAmountsSetters,
	InterruptedPaymentState,
	KktHardwareStatusState,
	SbpPaymentCheckStatus,
	StagePaymentMode,
	TreatmentPlanStageOption,
	UseFastCheckoutLogicProps,
} from "./types";

export function useFastCheckoutTenderState(props: UseFastCheckoutLogicProps) {
	const {
		isOpen, totalBillKop: propTotalBillKop, totalBillRub: propTotalBillRub,
		initialPaymentMethod, initialSimpleCashierMode, patientId,
		patientDepositRub = 0, patientFamilyBalanceRub = 0,
		orderId: propOrderId, invoiceId, stages: propStages, cashierFullName: propCashierFullName,
		cashierName, attendingDoctorName, doctorName,
	} = props;

	const initialTotalBillKop = resolveInitialTotalBillKop(props.amountKopecks, propTotalBillKop, propTotalBillRub, props.amountRub);
	const effectiveCashierFullName = resolveEffectiveCashierFullName(propCashierFullName || cashierName, attendingDoctorName || doctorName);
	const orderId = propOrderId || invoiceId || "";

	const stages = useMemo<readonly TreatmentPlanStageOption[]>(() => {
		return resolveTreatmentStages(propStages, initialTotalBillKop, isDemoShowcaseMode());
	}, [propStages, initialTotalBillKop]);

	const [selectedStageId, setSelectedStageId] = useState<string>("full_plan");
	const [stagePaymentMode, setStagePaymentMode] = useState<StagePaymentMode>("full");
	const [advanceAlreadyPaidRub] = useState<number>(0);

	const resolvedInitialMethod: CheckoutPaymentMethodType = initialPaymentMethod ?? (() => {
		switch (props.defaultMethod) {
			case "card_terminal": case "card": return "bank_card";
			case "cash": return "cash";
			case "sbp_qr": case "sberpay_qr": return "sbp_qr";
			case "family_deposit": return "patient_deposit";
			case "split": return "bank_card";
			default: return "sbp_qr";
		}
	})();
	const [activeMethod, setActiveMethod] = useState<CheckoutPaymentMethodType>(resolvedInitialMethod);

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
	const [, setIsOfflineBuffered] = useState<boolean>(false);
	const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
	const [isFlushingQueue, setIsFlushingQueue] = useState<boolean>(false);
	const [interruptedPaymentState, setInterruptedPaymentState] = useState<InterruptedPaymentState | null>(null);
	const [isSubmittingManualCard, setIsSubmittingManualCard] = useState<boolean>(false);
	const [kktHardwareStatus, setKktHardwareStatus] = useState<KktHardwareStatusState>({ online: false, paperOk: false, isChecking: Boolean(isOpen) });
	const [isTier2Open, setIsTier2Open] = useState<boolean>(false);
	const [isSimpleCashierMode, setIsSimpleCashierMode] = useState<boolean>(() => {
		if (initialSimpleCashierMode !== undefined) return initialSimpleCashierMode;
		if (props.defaultMethod === "split" || props.initialSplit5050) return false;
		return true;
	});
	const [clientType, setClientType] = useState<ClientLegalType>("physical_person");
	const [buyerInn, setBuyerInn] = useState<string>("");
	const [buyerName, setBuyerName] = useState<string>("");
	const [isElectronicReceiptOnly, setIsElectronicReceiptOnly] = useState<boolean>(false);
	const [availableLoyaltyPointsRub, setAvailableLoyaltyPointsRub] = useState<number>(() => props.patientBonusPointsRub ?? props.patientLoyaltyPoints ?? 0);
	const [discountPreset, setDiscountPreset] = useState<FastCheckoutDiscountPreset>(() => {
		if (props.initialWarranty100) return "warranty_100";
		if (props.initialDiscountPercent) return "manual_percent";
		return "none";
	});
	const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(() => props.initialDiscountPercent ?? 0);

	const splitSetters: FastCheckoutSplitAmountsSetters = {
		setCardAmountRub, setCashAmountRub, setSbpAmountRub, setDepositAmountRub, setLoyaltyAmountRub, setDmsAmountRub, setCashTenderedRub,
	};

	useEffect(() => {
		if (!isOpen || !patientId) return;
		let cancelled = false;
		async function loadLoyalty() {
			try {
				const res = await fetch(`/api/loyalty/balance/${encodeURIComponent(patientId!)}`);
				if (res.ok) {
					const data = await res.json();
					if (!cancelled && typeof data.activePoints === "number") setAvailableLoyaltyPointsRub(data.activePoints);
				}
			} catch {}
		}
		void loadLoyalty();
		return () => { cancelled = true; };
	}, [isOpen, patientId]);

	useEffect(() => {
		if (isOpen) {
			if (initialPaymentMethod) setActiveMethod(initialPaymentMethod);
			else if (resolvedInitialMethod) setActiveMethod(resolvedInitialMethod);
			if (props.initialWarranty100) setDiscountPreset("warranty_100");
			else if (props.initialDiscountPercent) { setDiscountPreset("manual_percent"); setCustomDiscountPercent(props.initialDiscountPercent); }
			if (props.defaultMethod === "split" || props.initialSplit5050) setIsSimpleCashierMode(false);
			setSbpStatus("awaiting");
			setSbpCheckMessage(null);
			const initialStageId = resolveInitialSelectedStageId(propStages, isDemoShowcaseMode());
			setSelectedStageId(initialStageId);
			setKktHardwareStatus((prev) => ({ ...prev, isChecking: true }));
			void checkFastCheckoutKktDeviceHealth().then((status) => setKktHardwareStatus(status));
		}
	}, [isOpen, initialPaymentMethod, propStages]);

	useEffect(() => subscribeFastCheckoutOfflineQueue(setPendingOfflineCount), []);

	return {
		stages, selectedStageId, setSelectedStageId, stagePaymentMode, setStagePaymentMode,
		advanceAlreadyPaidRub, activeMethod, setActiveMethod, cardAmountRub, setCardAmountRub,
		cashAmountRub, setCashAmountRub, sbpAmountRub, setSbpAmountRub, sbpStatus, setSbpStatus,
		isCheckingSbp, setIsCheckingSbp, sbpCheckMessage, setSbpCheckMessage, depositAmountRub,
		setDepositAmountRub, loyaltyAmountRub, setLoyaltyAmountRub, dmsAmountRub, setDmsAmountRub,
		cashTenderedRub, setCashTenderedRub, isPrinting, setIsPrinting, setIsOfflineBuffered,
		pendingOfflineCount, isFlushingQueue, setIsFlushingQueue, interruptedPaymentState,
		setInterruptedPaymentState, isSubmittingManualCard, setIsSubmittingManualCard,
		kktHardwareStatus, isTier2Open, setIsTier2Open, isSimpleCashierMode, setIsSimpleCashierMode,
		clientType, setClientType, buyerInn, setBuyerInn, buyerName, setBuyerName,
		isElectronicReceiptOnly, setIsElectronicReceiptOnly, availableLoyaltyPointsRub,
		discountPreset, setDiscountPreset, customDiscountPercent, setCustomDiscountPercent,
		splitSetters, initialTotalBillKop, effectiveCashierFullName, orderId, patientDepositRub, patientFamilyBalanceRub,
	};
}
