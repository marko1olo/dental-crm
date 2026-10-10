import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../../AppHelpers";
import { useCountUp } from "../../../hooks/useCountUp";
import { useWebsocket } from "../../../hooks/useWebsocket";
import { actionFailureToast } from "../../../lib/panelStateText";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { showToast } from "../../GlobalToast";
import {
	familyMutationId,
	familyPayRequestKey,
	familyTopupRequestKey,
	familyRefundRequestKey,
	type MutationTicket,
} from "../familyWalletMutationKey";
import {
	type FamilyGroup,
	type FamilyMember,
	type FamilyTopupMethod,
	type FamilyLedgerEntry,
	PATIENT_ID_PATTERN,
	refusalToast,
} from "./types";
import { printFamilyLedgerStatement } from "../familyBillingPrint";
import { logger } from "../../../utils/logger";

export interface UseFamilyWalletOptions {
	patientId: string;
	remainingDebtRub: number;
	onPaymentSuccess?: (() => void | Promise<void>) | undefined;
}

export function useFamilyWallet({
	patientId,
	remainingDebtRub,
	onPaymentSuccess,
}: UseFamilyWalletOptions) {
	const [family, setFamily] = useState<FamilyGroup | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [loadFailure, setLoadFailure] = useState<{
		status: number | null;
	} | null>(null);
	const [isPaying, setIsPaying] = useState(false);
	const [isToppingUp, setIsToppingUp] = useState(false);
	const [isCombinedBillingModalOpen, setIsCombinedBillingModalOpen] = useState(false);
	const [isLedgerOpen, setIsLedgerOpen] = useState(false);
	const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

	const [topupInput, setTopupInput] = useState("");
	const [topupMethod, setTopupMethod] = useState<FamilyTopupMethod>("cash");
	const [amountInput, setAmountInput] = useState("");

	// Семейный гроссбух: история операций по общему депозиту
	const [ledgerEntries, setLedgerEntries] = useState<FamilyLedgerEntry[]>([]);

	// Состояние формы возврата средств на депозит
	const [refundAmountInput, setRefundAmountInput] = useState("");
	const [refundTargetPatientId, setRefundTargetPatientId] = useState<string>(patientId);
	const [refundReason, setRefundReason] = useState("Отмена визита / возврат за неоказанные услуги");
	const [refundDestination, setRefundDestination] = useState<"family_deposit" | "cash_payout">("family_deposit");
	const [isRefunding, setIsRefunding] = useState(false);

	const topupMutationRef = useRef<MutationTicket | null>(null);
	const payMutationRef = useRef<MutationTicket | null>(null);
	const refundMutationRef = useRef<MutationTicket | null>(null);

	const isPatientDatabaseId = PATIENT_ID_PATTERN.test(patientId);
	const requestGenerationRef = useRef(0);
	const selectedPatientIdRef = useRef(patientId);

	/**
	 * Одна загрузка на все случаи: первый показ, кнопка «Повторить» и обновление
	 * после оплаты.
	 */
	const loadFamily = useCallback(async () => {
		const generation = requestGenerationRef.current + 1;
		requestGenerationRef.current = generation;
		const isStale = () =>
			requestGenerationRef.current !== generation ||
			selectedPatientIdRef.current !== patientId;
		setIsLoading(true);
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (isStale()) return;
			if (res.ok) {
				const data = (await res.json()) as FamilyGroup;
				if (isStale()) return;
				setFamily(data);
				if (data.ledger && Array.isArray(data.ledger)) {
					setLedgerEntries(data.ledger);
				}
				setLoadFailure(null);
				return;
			}
			setFamily(null);
			setLoadFailure(res.status === 404 ? null : { status: res.status });
		} catch (e) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (isStale()) return;
			logger.error("[family wallet] не удалось прочитать семейный кошелёк:", e);
			setFamily(null);
			setLoadFailure({ status: null });
		} finally {
			if (!isStale()) setIsLoading(false);
		}
	}, [patientId]);

	useEffect(() => {
		selectedPatientIdRef.current = patientId;
		setFamily(null);
		setLoadFailure(null);
		setAmountInput("");
		setTopupInput("");
		setRefundTargetPatientId(patientId);
		if (!isPatientDatabaseId) {
			setIsLoading(false);
			return;
		}
		void loadFamily();
		return () => {
			requestGenerationRef.current += 1;
		};
	}, [isPatientDatabaseId, loadFamily, patientId]);

	// Sync balance with WS
	const wsUrl = (() => {
		const wsHost = (
			import.meta as unknown as { env?: Record<string, string> }
		).env?.VITE_WS_URL;
		if (wsHost) return wsHost;
		if (typeof window !== "undefined" && window.location) {
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			return `${protocol}//${window.location.host}/api/ws/schedule`;
		}
		return "ws://127.0.0.1:4100/api/ws/schedule";
	})();
	const { lastMessage } = useWebsocket(wsUrl);
	useEffect(() => {
		if (lastMessage?.type === "FAMILY_BALANCE_UPDATED" && lastMessage.payload) {
			setFamily((prev) => {
				if (prev && lastMessage.payload.familyGroupId === prev.id) {
					return { ...prev, balance: lastMessage.payload.balance };
				}
				return prev;
			});
		}
	}, [lastMessage]);

	const parsedBalance = Number(family?.balance ?? 0);
	const balanceVal = Number.isFinite(parsedBalance) ? parsedBalance : 0;
	const animatedBalance = useCountUp(balanceVal, 1000);

	const [targetPatientId, setTargetPatientId] = useState<string>(patientId);

	useEffect(() => {
		setTargetPatientId(patientId);
	}, [patientId]);

	// Определение главы семьи
	const headMember =
		(family?.members ?? []).find(
			(member) => member.id === family?.headPatientId || member.isHead,
		) || (family?.members ?? [])[0];
	const headFullName =
		headMember?.fullName?.trim() || family?.headPatientName?.trim() || "Глава семьи";

	const payerName =
		(family?.members ?? []).find((member) => member.id === targetPatientId)
			?.fullName?.trim() ||
		(family?.members ?? []).find((member) => member.id === patientId)
			?.fullName?.trim() ||
		headFullName;

	const targetMemberName =
		(family?.members ?? []).find((member) => member.id === targetPatientId)
			?.fullName?.trim() || payerName;

	const parsedAmount = normalizeRubAmountInput(amountInput);
	const amount = parsedAmount ?? 0;
	const amountInvalid = Boolean(amountInput.trim()) && parsedAmount === null;
	const parsedTopup = normalizeRubAmountInput(topupInput);
	const topupAmount = parsedTopup ?? 0;
	const topupInvalid = Boolean(topupInput.trim()) && parsedTopup === null;

	const debtSuggestionRub = Number.isFinite(remainingDebtRub)
		? Math.max(0, Math.round(remainingDebtRub * 100) / 100)
		: 0;

	const payBlockReason = amountInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: amount > 0 && Math.abs(Math.round(amount * 100) - amount * 100) > 1e-4
			? "Сумма списания может содержать не более 2 знаков после запятой (копейки)."
			: amount > balanceVal && amount > 0
				? `На семейном счету только ${money(balanceVal)}. Спишите не больше этой суммы, остальное примите обычной оплатой или пополните счёт.`
				: null;

	const topupBlockReason = topupInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: topupAmount > 0 && Math.abs(Math.round(topupAmount * 100) - topupAmount * 100) > 1e-4
			? "Сумма пополнения может содержать не более 2 знаков после запятой (копейки)."
			: null;

	const handlePay = async () => {
		if (!family || isPaying) return;
		if (amount <= 0) {
			showToast("Введите сумму", "error");
			return;
		}
		if (Math.abs(Math.round(amount * 100) - amount * 100) > 1e-4) {
			showToast("Сумма списания может содержать не более 2 знаков после запятой", "error");
			return;
		}
		if (amount > balanceVal) {
			showToast("Недостаточно средств на семейном балансе", "error");
			return;
		}
		const mutationId = familyMutationId(
			payMutationRef,
			"family-pay",
			familyPayRequestKey(targetPatientId, family.id, amount),
		);

		setIsPaying(true);
		try {
			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: targetPatientId,
					familyGroupId: family.id,
					amountRub: amount,
					clientMutationId: mutationId,
				}),
			});

			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				showToast(
					refusalToast(
						"Списание с семейного счёта не прошло",
						res.status,
						errPayload?.message,
					),
					"error",
				);
				return;
			}
			payMutationRef.current = null;
			const payResult = (await res.json().catch(() => null)) as {
				duplicate?: boolean;
			} | null;

			// Фиксация записи в семейном гроссбухе
			setLedgerEntries((prev) => [
				{
					id: `debit-${Date.now()}`,
					createdAt: new Date().toISOString(),
					entryType: "debit",
					amountRub: amount,
					amountKopecks: Math.round(amount * 100),
					payerFullName: headFullName,
					targetPatientId,
					targetPatientFullName: targetMemberName,
					notes: "Списание за лечение с семейного депозита",
					clientMutationId: mutationId,
				},
				...prev,
			]);

			showToast(
				payResult?.duplicate
					? "Эта оплата уже была списана раньше — второй раз деньги не списаны."
					: "Оплата списана с семейного кошелька",
				"success",
			);
			setAmountInput("");
			if (onPaymentSuccess) onPaymentSuccess();
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] списание не получило ответа сервера:", e);
			showToast(
				actionFailureToast(
					"Ответ по списанию с семейного счёта не получен",
					null,
				),
				"error",
			);
		} finally {
			setIsPaying(false);
		}
	};

	const handleTopup = async () => {
		if (!family || isToppingUp) return;
		if (topupAmount <= 0 || Math.abs(Math.round(topupAmount * 100) - topupAmount * 100) > 1e-4) {
			showToast("Введите корректную сумму пополнения", "error");
			return;
		}
		const mutationId = familyMutationId(
			topupMutationRef,
			"family-topup",
			familyTopupRequestKey(patientId, family.id, topupAmount, topupMethod),
		);

		setIsToppingUp(true);
		try {
			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId,
					familyGroupId: family.id,
					amountRub: topupAmount,
					method: topupMethod,
					clientMutationId: mutationId,
				}),
			});
			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as {
					message?: string;
				} | null;
				showToast(
					refusalToast(
						"Пополнение семейного счёта не прошло",
						res.status,
						errPayload?.message,
					),
					"error",
				);
				return;
			}
			topupMutationRef.current = null;
			const topupResult = (await res.json().catch((err) => {
				logger.error("[Dente]", err);
				showToast(
					actionFailureToast(
						"Ответ о пополнении не прочитан",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				return null;
			})) as {
				duplicate?: boolean;
			} | null;

			// Фиксация пополнения в семейном гроссбухе
			setLedgerEntries((prev) => [
				{
					id: `topup-${Date.now()}`,
					createdAt: new Date().toISOString(),
					entryType: "deposit",
					amountRub: topupAmount,
					amountKopecks: Math.round(topupAmount * 100),
					payerPatientId: patientId,
					payerFullName: payerName,
					method: topupMethod,
					notes: `Пополнение семейного счёта (${topupMethod})`,
					clientMutationId: mutationId,
				},
				...prev,
			]);

			showToast(
				topupResult?.duplicate
					? `Этот аванс уже был зачислен раньше — ${money(topupAmount)} второй раз не зачислены.`
					: `Семейный счёт пополнен на ${money(topupAmount)}`,
				"success",
			);
			setTopupInput("");
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] пополнение не получило ответа сервера:", e);
			showToast(
				actionFailureToast(
					"Ответ по пополнению семейного счёта не получен",
					null,
				),
				"error",
			);
		} finally {
			setIsToppingUp(false);
		}
	};

	// Возврат средств на семейный депозит (Refund Routing)
	const handleExecuteRefund = async () => {
		if (!family || isRefunding) return;
		const parsedRefund = normalizeRubAmountInput(refundAmountInput);
		const refundAmount = parsedRefund ?? 0;
		if (refundAmount <= 0) {
			showToast("Введите корректную сумму возврата", "error");
			return;
		}

		if (refundDestination === "cash_payout") {
			showToast(
				"Внимание: возврат наличными требует обязательного пробития фискального чека «Возврат прихода» (54-ФЗ) на кассе!",
				"warning",
				5000,
			);
			setIsRefundModalOpen(false);
			return;
		}

		setIsRefunding(true);
		try {
			const targetRefundMember = (family.members ?? []).find((m) => m.id === refundTargetPatientId);
			const targetName = targetRefundMember?.fullName?.trim() || "Пациент";
			const effectiveTargetPatientId = refundTargetPatientId || patientId;
			const cleanReason = refundReason.trim();

			const mutationId = familyMutationId(
				refundMutationRef,
				"family-refund",
				familyRefundRequestKey(effectiveTargetPatientId, family.id, refundAmount, cleanReason),
			);

			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: effectiveTargetPatientId,
					familyGroupId: family.id,
					amountRub: refundAmount,
					method: "other",
					comment: `Возврат средств на семейный депозит за пациента ${targetName}: ${cleanReason}`,
					clientMutationId: mutationId,
				}),
			});

			if (!res.ok) {
				const errPayload = await res.json().catch(() => null);
				showToast(errPayload?.message || "Не удалось вернуть средства на депозит", "error");
				return;
			}
			refundMutationRef.current = null;

			// Фиксация в семейном гроссбухе
			setLedgerEntries((prev) => [
				{
					id: `ledger-${mutationId}`,
					createdAt: new Date().toISOString(),
					entryType: "refund_deposit",
					amountRub: refundAmount,
					amountKopecks: Math.round(refundAmount * 100),
					payerFullName: headFullName,
					targetPatientId: effectiveTargetPatientId,
					targetPatientFullName: targetName,
					notes: `Возврат на семейный депозит: ${cleanReason}`,
					clientMutationId: mutationId,
				},
				...prev,
			]);

			showToast(
				`Средства (${money(refundAmount)}) успешно возвращены на семейный депозит!`,
				"success",
			);
			setRefundAmountInput("");
			setIsRefundModalOpen(false);
			void loadFamily();
		} catch (e) {
			logger.error("[family wallet] ошибка возврата на депозит:", e);
			showToast("Ошибка связи при оформлении возврата", "error");
		} finally {
			setIsRefunding(false);
		}
	};

	const handlePrintLedger = () => {
		printFamilyLedgerStatement({
			clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
			familyGroupName: family?.name?.trim() || "Семейная группа",
			headFullName,
			currentBalanceRub: balanceVal,
			entries: ledgerEntries,
		});
	};

	return {
		family,
		isLoading,
		loadFailure,
		loadFamily,
		isPaying,
		isToppingUp,
		isCombinedBillingModalOpen,
		setIsCombinedBillingModalOpen,
		isLedgerOpen,
		setIsLedgerOpen,
		isRefundModalOpen,
		setIsRefundModalOpen,
		topupInput,
		setTopupInput,
		topupMethod,
		setTopupMethod,
		amountInput,
		setAmountInput,
		ledgerEntries,
		refundAmountInput,
		setRefundAmountInput,
		refundTargetPatientId,
		setRefundTargetPatientId,
		refundReason,
		setRefundReason,
		refundDestination,
		setRefundDestination,
		isRefunding,
		targetPatientId,
		setTargetPatientId,
		balanceVal,
		animatedBalance,
		headMember,
		headFullName,
		payerName,
		targetMemberName,
		amount,
		amountInvalid,
		topupAmount,
		topupInvalid,
		debtSuggestionRub,
		payBlockReason,
		topupBlockReason,
		handlePay,
		handleTopup,
		handleExecuteRefund,
		handlePrintLedger,
	};
}
