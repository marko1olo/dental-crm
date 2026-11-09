import { useCallback, useState } from "react";
import { showToast } from "../../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type { DepositOperationRecord, OperationMode, PaymentMethod, TargetWallet } from "./types";
import type { PatientGeneralInfo } from "../PatientGeneralInfoTab";

export function useDepositOperations(
	patient: PatientGeneralInfo | null | undefined,
	initialPersonalBalance: number,
	initialFamilyBalance: number,
	onUpdateBalance?: (newBalanceRub: number) => void,
	disabled: boolean = false,
) {
	const [personalBalance, setPersonalBalance] = useState<number>(initialPersonalBalance);
	const [familyBalance, setFamilyBalance] = useState<number>(initialFamilyBalance);
	const [operationsLog, setOperationsLog] = useState<DepositOperationRecord[]>([]);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const executeOperation = useCallback(
		async (amount: number, mode: OperationMode, target: TargetWallet, method: PaymentMethod) => {
			if (disabled || isSubmitting) return;
			if (amount <= 0 || !Number.isFinite(amount)) {
				showToast("Укажите корректную сумму операции", "error");
				return;
			}
			if (mode === "charge" && target === "personal" && personalBalance < amount) {
				showToast(`Недостаточно средств на личном депозите (${personalBalance.toLocaleString("ru-RU")} ₽).`, "warning", 5000);
				return;
			}
			if (mode === "charge" && target === "family" && familyBalance < amount) {
				showToast(`Недостаточно средств на семейном счёте (${familyBalance.toLocaleString("ru-RU")} ₽).`, "warning", 5000);
				return;
			}

			setIsSubmitting(true);
			const mutationId = `dep-${Date.now()}-${crypto.randomUUID()}`;
			const isTopup = mode === "topup";
			const delta = isTopup ? amount : -amount;

			const amountKopecks = Math.round(amount * 100);

			try {
				if (target === "family" && patient?.familyGroupId) {
					const endpoint = isTopup ? "/api/finance/family/topup" : "/api/finance/family/pay";
					const resp = await fetch(endpoint, {
						method: "POST",
						headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
						body: JSON.stringify({
							familyGroupId: patient.familyGroupId, patientId: patient.id, amountRub: amount, amountKopecks,
							method, clientMutationId: mutationId, note: isTopup ? "Пополнение семейного аванса" : "Списание семейного аванса",
						}),
					});
					if (!resp.ok) {
						throw new Error(`Ошибка операции с семейным авансом (код ${resp.status})`);
					}
				} else if (patient?.id) {
					const resp = await fetch("/api/finance/payments", {
						method: "POST",
						headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
						body: JSON.stringify({
							patientId: patient.id, amountRub: amount, amountKopecks, method, clientMutationId: mutationId,
							note: isTopup ? "Внесение аванса на лицевой счёт" : "Зачёт аванса в счёт лечения",
						}),
					});
					if (!resp.ok) {
						throw new Error(`Ошибка проведения финансовой операции (код ${resp.status})`);
					}
				}

				if (target === "personal") {
					const nextPersonal = personalBalance + delta;
					setPersonalBalance(nextPersonal);
					onUpdateBalance?.(nextPersonal);
				} else {
					setFamilyBalance(familyBalance + delta);
				}

				const now = new Date();
				const newRecord: DepositOperationRecord = {
					id: mutationId,
					date: now.toLocaleDateString("ru-RU"),
					time: now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
					type: isTopup ? (target === "family" ? "family_share" : "deposit") : "charge",
					typeLabelRu: isTopup ? (target === "family" ? "Семейный аванс (+)" : "Внесение аванса (+)") : "Списание аванса (-)",
					amountRub: amount,
					amountKopecks,
					method,
					methodLabelRu: method === "card" ? "Банковская карта" : method === "cash" ? "Наличные" : "СБП (QR-код)",
					status: "completed",
					note: isTopup ? `Пополнение ${target === "family" ? "семейного" : "личного"} счёта` : "Зачёт средств в счёт лечения",
				};

				setOperationsLog((prev) => [newRecord, ...prev]);
				const msg = isTopup
					? `Аванс +${amount.toLocaleString("ru-RU")} ₽ зачислен на ${target === "family" ? "семейный" : "личный"} счёт!`
					: `Списано ${amount.toLocaleString("ru-RU")} ₽ с ${target === "family" ? "семейного" : "личного"} счёта.`;
				showToast(msg, "success", 4000);
			} catch (err: any) {
				showToast(err?.message || "Ошибка финансовой операции", "error");
			} finally {
				setIsSubmitting(false);
			}
		},
		[disabled, isSubmitting, personalBalance, familyBalance, patient?.id, patient?.familyGroupId, onUpdateBalance],
	);

	return { personalBalance, familyBalance, operationsLog, isSubmitting, executeOperation };
}
