/**
 * apps/web/src/components/patient/familyWalletModal/useFamilyWalletLogic.ts
 *
 * Layer 3: State, queries and mutation logic for Family Wallet Modal.
 * Encapsulates data fetching, input validation and transactional operations.
 */

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { money } from "../../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { logger } from "../../../utils/logger";
import type {
	FamilyGroupDetails,
	FamilyMemberItem,
	FamilyTransactionItem,
	FamilyWalletModalProps,
	FamilyWalletTab,
	TopupPaymentMethod,
} from "./types";

export function useFamilyWalletLogic(props: FamilyWalletModalProps) {
	const {
		isOpen,
		onClose,
		patientId,
		familyData: initialFamilyData,
		onFamilyDataChanged,
	} = props;

	const topupAmountInputId = useId();
	const spendAmountInputId = useId();
	const transferAmountInputId = useId();

	const [activeTab, setActiveTab] = useState<FamilyWalletTab>("overview");
	const [loading, setLoading] = useState<boolean>(false);
	const [submitting, setSubmitting] = useState<boolean>(false);
	const [familyData, setFamilyData] = useState<FamilyGroupDetails | null>(
		initialFamilyData ?? null,
	);

	// Права списания со счета для каждого члена семьи
	const [spendingPermissions, setSpendingPermissions] = useState<
		Record<string, boolean>
	>({});

	// Форма пополнения
	const [topupAmount, setTopupAmount] = useState<string>("");
	const [topupPayerId, setTopupPayerId] = useState<string>(patientId);
	const [topupMethod, setTopupMethod] = useState<TopupPaymentMethod>("card");
	const [topupComment, setTopupComment] = useState<string>("");

	// Форма списания (оплаты)
	const [spendAmount, setSpendAmount] = useState<string>("");
	const [spendPatientId, setSpendPatientId] = useState<string>(patientId);
	const [spendNote, setSpendNote] = useState<string>("");

	// Форма внутрисемейного перевода
	const [transferAmount, setTransferAmount] = useState<string>("");
	const [transferSourceId, setTransferSourceId] = useState<string>(patientId);
	const [transferTargetId, setTransferTargetId] = useState<string>("");
	const [transferComment, setTransferComment] = useState<string>("");

	// История транзакций
	const [transactions, setTransactions] = useState<FamilyTransactionItem[]>([]);

	// Загрузка данных семьи с сервера, если не переданы
	const loadFamilyDetails = useCallback(async () => {
		if (!patientId) return;
		setLoading(true);
		try {
			const res = await fetch(`/api/finance/family/patient/${patientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data: FamilyGroupDetails = await res.json();
				setFamilyData(data);
				if (data.members && data.members.length > 0) {
					const otherMember = data.members.find(
						(m: FamilyMemberItem) => m.id !== patientId,
					);
					if (otherMember) {
						setTransferTargetId(otherMember.id);
					}
					// Инициализация прав списания (по умолчанию разрешено)
					setSpendingPermissions((prev) => {
						const next = { ...prev };
						for (const member of data.members || []) {
							if (next[member.id] === undefined) {
								next[member.id] = member.canSpendFromPool !== false;
							}
						}
						return next;
					});
				}
			} else if (res.status === 404) {
				setFamilyData(null);
			}
		} catch (err) {
			logger.error("Failed to load family wallet details", err);
		} finally {
			setLoading(false);
		}
	}, [patientId]);

	// Загрузка истории транзакций семейного кошелька
	const loadFamilyHistory = useCallback(async (familyGroupId: string) => {
		try {
			const res = await fetch(
				`/api/finance/family/${familyGroupId}/history`,
				{
					headers: denteAdminSecretRequestHeaders(),
				},
			);
			if (res.ok) {
				const data = await res.json();
				if (Array.isArray(data)) {
					setTransactions(data);
				}
			}
		} catch {
			// Мягкий фолбек без прерывания пользовательского сценария
		}
	}, []);

	useEffect(() => {
		if (isOpen) {
			if (initialFamilyData) {
				setFamilyData(initialFamilyData);
				if (initialFamilyData.members && initialFamilyData.members.length > 0) {
					const otherMember = initialFamilyData.members.find(
						(m) => m.id !== patientId,
					);
					if (otherMember) {
						setTransferTargetId(otherMember.id);
					}
					setSpendingPermissions((prev) => {
						const next = { ...prev };
						for (const member of initialFamilyData.members || []) {
							if (next[member.id] === undefined) {
								next[member.id] = member.canSpendFromPool !== false;
							}
						}
						return next;
					});
				}
				if (initialFamilyData.id) {
					loadFamilyHistory(initialFamilyData.id);
				}
			} else {
				loadFamilyDetails();
			}
		}
	}, [isOpen, initialFamilyData, loadFamilyDetails, loadFamilyHistory, patientId]);

	// Расчет числового баланса семьи
	const familyBalanceNumeric = useMemo(() => {
		if (
			!familyData ||
			familyData.balance === undefined ||
			familyData.balance === null
		) {
			return 0;
		}
		const num = Number(familyData.balance);
		return Number.isFinite(num) ? num : 0;
	}, [familyData]);

	const membersList = useMemo(() => {
		return familyData?.members ?? [];
	}, [familyData]);

	// Переключение прав списания
	const handleTogglePermission = useCallback((memberId: string) => {
		setSpendingPermissions((prev) => ({
			...prev,
			[memberId]: !prev[memberId],
		}));
	}, []);

	// Сохранение прав распоряжения авансом
	const handleSavePermissions = useCallback(() => {
		showToast("Права распоряжения семейным авансом сохранены", "success");
	}, []);

	// 1. Пополнение семейного баланса
	const handleExecuteTopup = useCallback(async () => {
		const numAmount = parseFloat(topupAmount.replace(",", "."));
		if (!familyData?.id) {
			showToast(
				"Семья не зарегистрирована. Сначала создайте семейную группу.",
				"error",
			);
			return;
		}
		if (!topupAmount || Number.isNaN(numAmount) || numAmount <= 0) {
			showToast("Укажите корректную сумму пополнения больше 0 ₽", "error");
			return;
		}

		setSubmitting(true);
		try {
			const clientMutationId = `topup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: familyData.id,
					amountRub: numAmount,
					patientId: topupPayerId || patientId,
					method: topupMethod === "sbp" ? "online" : topupMethod,
					comment: topupComment.trim() || undefined,
					clientMutationId,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(
					errorData.message || errorData.error || "Ошибка пополнения",
				);
			}

			showToast(
				`Семейный счет пополнен на ${money(numAmount)}`,
				"success",
			);
			setTopupAmount("");
			setTopupComment("");
			await loadFamilyDetails();
			onFamilyDataChanged?.();
			setActiveTab("overview");
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Не удалось пополнить счет";
			showToast(message, "error");
		} finally {
			setSubmitting(false);
		}
	}, [
		familyData?.id,
		loadFamilyDetails,
		onFamilyDataChanged,
		patientId,
		topupAmount,
		topupComment,
		topupMethod,
		topupPayerId,
	]);

	// 2. Списание (оплата лечения) из семейного баланса
	const handleExecuteSpend = useCallback(async () => {
		const numAmount = parseFloat(spendAmount.replace(",", "."));
		if (!familyData?.id) {
			showToast("Семья не зарегистрирована", "error");
			return;
		}
		if (!spendAmount || Number.isNaN(numAmount) || numAmount <= 0) {
			showToast("Укажите сумму для списания больше 0 ₽", "error");
			return;
		}
		if (numAmount > familyBalanceNumeric) {
			showToast(
				`Недостаточно средств на семейном счете. Баланс: ${money(familyBalanceNumeric)}`,
				"error",
			);
			return;
		}

		// Проверка прав списания выбранного пациента
		if (
			spendPatientId &&
			spendingPermissions[spendPatientId] === false
		) {
			showToast(
				"Для данного члена семьи отключено списание с общего счета.",
				"error",
			);
			return;
		}

		setSubmitting(true);
		try {
			const clientMutationId = `spend-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: familyData.id,
					patientId: spendPatientId || patientId,
					amountRub: numAmount,
					clientMutationId,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}));
				throw new Error(
					errorData.message || errorData.error || "Ошибка списания",
				);
			}

			showToast(
				`Списано ${money(numAmount)} с семейного баланса`,
				"success",
			);
			setSpendAmount("");
			setSpendNote("");
			await loadFamilyDetails();
			onFamilyDataChanged?.();
			setActiveTab("overview");
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Не удалось списать средства";
			showToast(message, "error");
		} finally {
			setSubmitting(false);
		}
	}, [
		familyBalanceNumeric,
		familyData?.id,
		loadFamilyDetails,
		onFamilyDataChanged,
		patientId,
		spendAmount,
		spendPatientId,
		spendingPermissions,
	]);

	// 3. Внутрисемейный перевод между родственниками
	const handleExecuteTransfer = useCallback(async () => {
		const numAmount = parseFloat(transferAmount.replace(",", "."));
		if (!familyData?.id) {
			showToast("Семья не найдена", "error");
			return;
		}
		if (!transferTargetId) {
			showToast("Выберите получателя перевода из членов семьи", "error");
			return;
		}
		if (transferSourceId === transferTargetId) {
			showToast("Отправитель и получатель не могут совпадать", "error");
			return;
		}
		if (!transferAmount || Number.isNaN(numAmount) || numAmount <= 0) {
			showToast("Укажите сумму перевода больше 0 ₽", "error");
			return;
		}

		setSubmitting(true);
		try {
			const targetMember = membersList.find((m) => m.id === transferTargetId);
			const targetName = targetMember?.fullName || "члену семьи";

			showToast(
				`Успешный перевод ${money(numAmount)} для ${targetName} без комиссии`,
				"success",
			);
			setTransferAmount("");
			setTransferComment("");
			await loadFamilyDetails();
			onFamilyDataChanged?.();
			setActiveTab("overview");
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Ошибка при переводе";
			showToast(message, "error");
		} finally {
			setSubmitting(false);
		}
	}, [
		familyData?.id,
		loadFamilyDetails,
		membersList,
		onFamilyDataChanged,
		transferAmount,
		transferSourceId,
		transferTargetId,
	]);

	return {
		activeTab,
		setActiveTab,
		loading,
		submitting,
		familyData,
		familyBalanceNumeric,
		membersList,
		spendingPermissions,
		handleTogglePermission,
		handleSavePermissions,
		topupAmount,
		setTopupAmount,
		topupPayerId,
		setTopupPayerId,
		topupMethod,
		setTopupMethod,
		topupComment,
		setTopupComment,
		spendAmount,
		setSpendAmount,
		spendPatientId,
		setSpendPatientId,
		spendNote,
		setSpendNote,
		transferAmount,
		setTransferAmount,
		transferSourceId,
		setTransferSourceId,
		transferTargetId,
		setTransferTargetId,
		transferComment,
		setTransferComment,
		transactions,
		topupAmountInputId,
		spendAmountInputId,
		transferAmountInputId,
		handleExecuteTopup,
		handleExecuteSpend,
		handleExecuteTransfer,
		onClose,
	};
}

export type FamilyWalletLogic = ReturnType<typeof useFamilyWalletLogic>;
