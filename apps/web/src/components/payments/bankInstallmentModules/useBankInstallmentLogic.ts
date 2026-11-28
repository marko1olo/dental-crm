import { useMemo, useState } from "react";
import { generateUuidV7, kopecksToRubles } from "@dental/shared";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
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
		if (!patientId?.trim()) {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(linkData.formattedSmsText);
			}
			showToast(
				`СМС-отправка доступна из карты пациента. Текст со ссылкой для ${cleanPhone} скопирован в буфер обмена`,
				"info",
				4000,
			);
			return;
		}
		try {
			const res = await fetch("/api/chat/sms/send", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify({
					patientId,
					message: linkData.formattedSmsText,
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

	const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

	const handleApproveInstallment = async () => {
		if (isSubmittingApproval) return;
		const cleanPatientId = patientId?.trim() ?? "";
		const isUuidPatient =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				cleanPatientId,
			);
		if (!isUuidPatient) {
			showToast(
				"Выберите пациента из карты клиники, чтобы зарегистрировать одобренную банком рассрочку.",
				"warning",
				4000,
			);
			return;
		}
		setIsSubmittingApproval(true);
		try {
			const mutationId = generateUuidV7();
			const allowedTerms = [3, 6, 10, 12, 18, 24] as const;
			const normalizedMonths =
				allowedTerms.reduce((best, curr) =>
					Math.abs(curr - selectedTerm) < Math.abs(best - selectedTerm)
						? curr
						: best,
				);
			const res = await fetch("/api/installments", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": mutationId,
					"X-Idempotency-Key": mutationId,
				}),
				body: JSON.stringify({
					patientId: cleanPatientId,
					totalAmountRub: Math.max(1, kopecksToRubles(stageAmountKopecks)),
					downPaymentRub: 0,
					monthsCount: normalizedMonths,
					notes: `Банковская рассрочка (${activeProviderConfig.name}): ${stageTitle}`,
				}),
			});
			let json: {
				data?: { contract?: { id?: string; contractNumber?: string } };
				contract?: { id?: string; contractNumber?: string };
				message?: string;
			} | null = null;
			try {
				json = (await res.json()) as typeof json;
			} catch (parseErr) {
				clientLogger.warn("[useBankInstallmentLogic] Failed to parse bank installment JSON:", parseErr);
			}
			if (!res.ok) {
				throw new Error(
					json?.message ||
						`Сервер отклонил подтверждение рассрочки (HTTP ${res.status})`,
				);
			}
			const contract = json?.data?.contract ?? json?.contract;
			const serverApprovalId = contract?.contractNumber || contract?.id;
			if (!serverApprovalId) {
				throw new Error("Сервер не вернул номер договора рассрочки");
			}
			setIsApprovedState(true);
			if (props.onInstallmentApproved) {
				props.onInstallmentApproved({
					providerId: selectedProvider,
					approvalId: serverApprovalId,
					approvedAmountKopecks: stageAmountKopecks,
					monthlyPaymentRub: calculation.monthlyPaymentRub,
				});
			}
			showToast(
				`Рассрочка от ${activeProviderConfig.name} (${serverApprovalId}) зафиксирована!`,
				"success",
				3500,
			);
		} catch (err: unknown) {
			showToast(
				err instanceof Error
					? err.message
					: "Не удалось подтвердить банковскую рассрочку на сервере",
				"error",
			);
		} finally {
			setIsSubmittingApproval(false);
		}
	};

	void denteClinicalReadHeaders;

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
