import { rubAmountForInput } from "../components/payments/cashDeskAmounts";
import { showToast } from "../components/GlobalToast";
import { playTactileEarcon } from "../lib/intercomSound";
import { AiOrchestrator } from "../lib/aiOrchestrator";
import { money } from "../AppHelpers";
import { normalizeRubAmountInput } from "../rubAmountInput";
import type { PaymentMethod } from "@dental/shared";
import type { DoctorDiscountPreset } from "../PaymentDiscountsAndSplitSection";
import type { PaymentCaptureProps, TaxDeductionCode } from "./types";
import { usePaymentCaptureShortcuts } from "./usePaymentCaptureShortcuts";
import { useEffect, useRef, useState } from "react";

export function usePaymentCaptureState(props: PaymentCaptureProps) {
	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	// biome-ignore lint/suspicious/noExplicitAny: AI parsed schema
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [showHints, setShowHints] = useState(false);
	const [isSberPosModalOpen, setIsSberPosModalOpen] = useState(false);
	const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
	const [isSplit5050Mode, setIsSplit5050Mode] = useState(false);
	const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
	const [receivedCash, setReceivedCash] = useState<string>("");
	const [selectedDoctorDiscount, setSelectedDoctorDiscount] = useState<DoctorDiscountPreset | null>(null);
	const smartPreviewTimerRef = useRef<number | null>(null);

	const { applyDoctorDiscount, applySplit5050Preset, applyPatientTaxDefaults } =
		usePaymentCaptureShortcuts(props, selectedDoctorDiscount, setSelectedDoctorDiscount, setIsSplit5050Mode, setIsSplitModalOpen);

	useEffect(() => () => {
		if (smartPreviewTimerRef.current) window.clearTimeout(smartPreviewTimerRef.current);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: globalThis.KeyboardEvent) => {
			if (e.key === "Escape" && isMoreActionsOpen) setIsMoreActionsOpen(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isMoreActionsOpen]);

	const handleSmartDictation = (text: string) => {
		if (!text.trim()) return;
		const result = AiOrchestrator.processPaymentDictation(text);
		if (result.source === "local_algorithm" && result.data) {
			const parsed = result.data;
			if (parsed.amount) props.onAmountChange(parsed.amount);
			if (parsed.method) props.onMethodChange(parsed.method as PaymentMethod);
			if (parsed.taxDeductionCode) props.onTaxDeductionCodeChange(parsed.taxDeductionCode as TaxDeductionCode);

			setSmartParsedData({ isAiTask: false, text: `Успешно распознано: ${text}`, parsed });
			setShowSmartPreview(true);
			if (smartPreviewTimerRef.current) window.clearTimeout(smartPreviewTimerRef.current);
			smartPreviewTimerRef.current = window.setTimeout(() => {
				smartPreviewTimerRef.current = null;
				setShowSmartPreview(false);
				setSmartInputText((cur) => (cur === text ? "" : cur));
			}, 2000);
		}
	};

	const handlePrimarySubmit = (validations: { paymentReadyToSubmit: boolean; paymentMissingSteps: string[]; isTaxDeductionDraft?: boolean }) => {
		if (props.isSaving) return;
		if (!props.patientId) {
			showToast("Выберите пациента для проведения платежа", "warning");
			return;
		}
		if (!validations.paymentReadyToSubmit) {
			const parsed = normalizeRubAmountInput(props.amount);
			if (parsed === null || parsed === 0 || !props.amount.trim()) {
				if (props.remainingDebt && props.remainingDebt > 0) {
					props.onAmountChange(rubAmountForInput(props.remainingDebt));
					showToast(`Установлена сумма по смете: ${money(props.remainingDebt)}. Нажмите «Принять оплату» для подтверждения`, "info");
					return;
				}
				showToast("Укажите сумму платежа или выберите услугу из плана", "warning");
				return;
			}
			const firstMissing = validations.paymentMissingSteps[0];
			showToast(firstMissing ? `Для проведения платежа: ${firstMissing}` : "Укажите сумму платежа или выберите услугу из плана", "warning");
			return;
		}
		if (validations.isTaxDeductionDraft) {
			showToast(
				"Оплата принимается. Данные для справки налогового вычета можно довнести позже в карточке пациента.",
				"info",
			);
		}
		playTactileEarcon("pay");
		props.onSubmit();
	};

	const handleSberPosClick = () => {
		if (props.isSaving || !props.patientId) return;
		setIsSberPosModalOpen(true);
	};

	const handleManualCardTerminalSubmit = () => {
		if (props.isSaving || !props.patientId) return;
		props.onMethodChange("card");
		playTactileEarcon("pay");
		props.onSubmit();
	};

	return {
		smartInputText, setSmartInputText, showSmartPreview, setShowSmartPreview, smartParsedData,
		showHints, setShowHints, isSberPosModalOpen, setIsSberPosModalOpen,
		isSplitModalOpen, setIsSplitModalOpen, isSplit5050Mode, setIsSplit5050Mode,
		isMoreActionsOpen, setIsMoreActionsOpen, receivedCash, setReceivedCash, selectedDoctorDiscount,
		handleSmartDictation, applyDoctorDiscount, applySplit5050Preset,
		handlePrimarySubmit, handleSberPosClick, handleManualCardTerminalSubmit, applyPatientTaxDefaults,
	};
}
