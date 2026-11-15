import { useMemo, useState } from "react";
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
		patientId = "pat-1001",
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

	const handleSendSms = () => {
		const cleanPhone = patientPhone?.trim() ?? "";
		if (!cleanPhone) {
			showToast(
				"Укажите номер телефона пациента в карточке для отправки СМС",
				"warning",
				3500,
			);
			return;
		}
		setIsSmsSent(true);
		showToast(
			`СМС со ссылкой на оформление рассрочки отправлено на номер ${cleanPhone}`,
			"success",
			4000,
		);
		setTimeout(() => setIsSmsSent(false), 4000);
	};

	const handleApproveInstallment = () => {
		setIsApprovedState(true);
		if (props.onInstallmentApproved) {
			props.onInstallmentApproved({
				providerId: selectedProvider,
				approvalId: `INST-${Date.now().toString(36).toUpperCase()}`,
				approvedAmountKopecks: stageAmountKopecks,
				monthlyPaymentRub: calculation.monthlyRub,
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
