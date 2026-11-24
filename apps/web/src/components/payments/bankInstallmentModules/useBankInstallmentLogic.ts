import { useMemo, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import {
	BANK_INSTALLMENT_PROVIDERS,
	type BankInstallmentCalculationResult,
	type BankInstallmentProviderId,
	calculateBankInstallment,
	generateBankInstallmentDeepLink,
} from "../bankInstallmentEngine";
import type { BankInstallmentQrModalProps } from "./types";

export const useBankInstallmentLogic = (props: BankInstallmentQrModalProps) => {
	const {
		stageTitle = "Комплексный этап лечения",
		stageNumber,
		stageAmountKopecks,
		patientId = "",
		patientName = "",
		patientPhone = "",
		clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
		clinicInn = "",
		planId,
	} = props;

	const [selectedProvider, setSelectedProvider] =
		useState<BankInstallmentProviderId>("sberbank");
	const [selectedTerm, setSelectedTerm] = useState<number>(12);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isSmsSent, setIsSmsSent] = useState<boolean>(false);
	const [isApprovedState, setIsApprovedState] = useState<boolean>(false);

	const activeProviderConfig = BANK_INSTALLMENT_PROVIDERS[selectedProvider];

	const calculation: BankInstallmentCalculationResult = useMemo(() => {
		return calculateBankInstallment(
			stageAmountKopecks,
			selectedProvider,
			selectedTerm,
		);
	}, [stageAmountKopecks, selectedProvider, selectedTerm]);

	const linkData = useMemo(() => {
		return generateBankInstallmentDeepLink({
			providerId: selectedProvider,
			amountRub: calculation.totalRub,
			stageTitle,
			stageNumber,
			patientId,
			patientName,
			patientPhone,
			clinicInn,
			clinicName,
			planId,
			termMonths: selectedTerm,
		});
	}, [
		selectedProvider,
		calculation.totalRub,
		stageTitle,
		stageNumber,
		patientId,
		patientName,
		patientPhone,
		clinicInn,
		clinicName,
		planId,
		selectedTerm,
	]);

	const handleProviderChange = (providerId: BankInstallmentProviderId) => {
		setSelectedProvider(providerId);
		const cfg = BANK_INSTALLMENT_PROVIDERS[providerId];
		setSelectedTerm(cfg.defaultTermMonths);
		setIsApprovedState(false);
	};

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(linkData.deepLinkUrl);
			setIsCopied(true);
			showToast(
				"Ссылка на банковскую рассрочку скопирована в буфер обмена",
				"success",
			);
			setTimeout(() => setIsCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать ссылку", "error");
		}
	};

	const handleSendSms = async () => {
		const cleanPhone = patientPhone?.trim() ?? "";
		if (!cleanPhone) {
			showToast(
				"Укажите номер телефона пациента в карточке для отправки ссылки",
				"warning",
				3500,
			);
			return;
		}
		try {
			const res = await fetch("/api/v1/communications/send-sms", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					phone: cleanPhone,
					message: linkData.formattedSmsText,
					patientId,
				}),
			});
			if (res.ok) {
				setIsSmsSent(true);
				showToast(
					`Ссылка на оформление рассрочки отправлена на номер ${cleanPhone}`,
					"success",
					4000,
				);
				setTimeout(() => setIsSmsSent(false), 4000);
			} else {
				if (typeof navigator !== "undefined" && navigator.clipboard) {
					await navigator.clipboard.writeText(linkData.formattedSmsText);
				}
				showToast(
					`СМС-шлюз офлайн. Текст со ссылкой для ${cleanPhone} скопирован в буфер обмена`,
					"info",
					4000,
				);
			}
		} catch {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(linkData.formattedSmsText);
			}
			showToast(
				`СМС-шлюз офлайн. Текст со ссылкой для ${cleanPhone} скопирован в буфер обмена`,
				"info",
				4000,
			);
		}
	};

	const handleApproveInstallment = () => {
		setIsApprovedState(true);
		if (props.onInstallmentApproved) {
			props.onInstallmentApproved({
				providerId: selectedProvider,
				approvalId: `INST-${Date.now().toString(36).toUpperCase()}`,
				approvedAmountKopecks: stageAmountKopecks,
				monthlyPaymentRub: calculation.monthlyPaymentRub,
			});
		}
		showToast(
			`Рассрочка от ${activeProviderConfig.name} одобрена! Наряд разблокирован.`,
			"success",
			3500,
		);
	};

	return {
		selectedProvider,
		selectedTerm,
		setSelectedTerm,
		isCopied,
		isSmsSent,
		isApprovedState,
		setIsApprovedState,
		activeProviderConfig,
		calculation,
		linkData,
		handleProviderChange,
		handleCopyLink,
		handleSendSms,
		handleApproveInstallment,
	};
};
