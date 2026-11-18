import { useCallback, useEffect, useState } from "react";
import { showToast } from "../../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import type { DepositOperationRecord, OperationMode, PaymentMethod, TargetWallet } from "./types";
import type { PatientGeneralInfo } from "../PatientGeneralInfoTab";

function mapMethodToLabel(method: string): string {
	switch (method) {
		case "card":
			return "Банковская карта";
		case "cash":
			return "Наличные";
		case "sbp":
			return "СБП (QR-код)";
		case "family_wallet":
		case "pool":
			return "Семейный счёт";
		case "other":
			return "Бонусы / Зачёт";
		default:
			return "Безналичный расчёт";
	}
}

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

	useEffect(() => {
		setPersonalBalance(initialPersonalBalance);
	}, [initialPersonalBalance]);

	useEffect(() => {
		setFamilyBalance(initialFamilyBalance);
	}, [initialFamilyBalance]);

	const loadOperationsHistory = useCallback(async () => {
		if (!patient?.id) {
			setOperationsLog([]);
			return;
		}

		try {
			const headers = { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() };
			const promises: Promise<unknown>[] = [
				fetch(`/api/billing/payments?patientId=${encodeURIComponent(patient.id)}`, { headers })
					.then((r) => (r.ok ? r.json() : null))
					.catch(() => null),
			];

			if (patient.familyGroupId) {
				promises.push(
					fetch(`/api/finance/family/${encodeURIComponent(patient.familyGroupId)}/history`, { headers })
						.then((r) => (r.ok ? r.json() : null))
						.catch(() => null),
				);
			}

			const [billingRes, familyRes] = await Promise.all(promises);
			const records: DepositOperationRecord[] = [];
			const seenIds = new Set<string>();

			// 1. Семейная история операций
			if (Array.isArray(familyRes)) {
				for (const item of familyRes) {
					if (!item?.id || seenIds.has(item.id)) continue;
					seenIds.add(item.id);
					const dateObj = new Date(item.date || Date.now());
					const isTopup = item.operationType === "topup";
					const isRefund = item.operationType === "refund";
					const amtRub = Math.abs(Number(item.amountRub) || 0);

					records.push({
						id: String(item.id),
						date: dateObj.toLocaleDateString("ru-RU"),
						time: dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
						type: isTopup ? "family_share" : isRefund ? "charge" : "charge",
						typeLabelRu: isTopup ? "Семейный аванс (+)" : isRefund ? "Возврат аванса (-)" : "Списание аванса (-)",
						amountRub: amtRub,
						amountKopecks: Math.round(amtRub * 100),
						method: item.method === "pool" ? "family_wallet" : item.method || "card",
						methodLabelRu: mapMethodToLabel(item.method),
						status: "completed",
						note: item.note || (isTopup ? "Пополнение семейного счёта" : "Списание с семейного депозита"),
					});
				}
			}

			// 2. Персональные проводки пациента из billing
			const billingItems = Array.isArray((billingRes as { data?: unknown[] })?.data)
				? (billingRes as { data: Array<{ id: string; amountRub: number; method: string; status: string; note?: string; createdAt?: string; paidAt?: string }> }).data
				: [];

			for (const p of billingItems) {
				if (!p?.id || seenIds.has(p.id)) continue;
				seenIds.add(p.id);

				const rawAmt = Number(p.amountRub) || 0;
				const isNegative = rawAmt < 0 || p.status === "refunded";
				const isPlanned = p.status === "planned";
				const isDepositMethod = p.method === "family_wallet" || p.method === "deposit";
				const amtRub = Math.abs(rawAmt);
				const dateObj = new Date(p.paidAt || p.createdAt || Date.now());

				// Классификация: положительный planned или внесение — topup, отрицательный или зачет family_wallet — charge
				const isTopup = !isNegative && (isPlanned || (!isDepositMethod && rawAmt > 0));

				records.push({
					id: String(p.id),
					date: dateObj.toLocaleDateString("ru-RU"),
					time: dateObj.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
					type: isTopup ? "deposit" : "charge",
					typeLabelRu: isTopup ? "Внесение аванса (+)" : "Списание аванса (-)",
					amountRub: amtRub,
					amountKopecks: Math.round(amtRub * 100),
					method: p.method as PaymentMethod,
					methodLabelRu: mapMethodToLabel(p.method),
					status: "completed",
					note: p.note || (isTopup ? "Внесение аванса на лицевой счёт" : "Зачёт средств в счёт лечения"),
				});
			}

			// Сортировка от свежих к старым
			setOperationsLog(records);
		} catch {
			// Офлайн или сетевой сбой — не крашим компонент
		}
	}, [patient?.id, patient?.familyGroupId]);

	useEffect(() => {
		void loadOperationsHistory();
	}, [loadOperationsHistory]);

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
							familyGroupId: patient.familyGroupId,
							patientId: patient.id,
							amountRub: amount,
							amountKopecks,
							method,
							clientMutationId: mutationId,
							note: isTopup ? "Пополнение семейного аванса" : "Списание семейного аванса",
						}),
					});
					if (!resp.ok) {
						throw new Error(`Ошибка операции с семейным авансом (код ${resp.status})`);
					}
				} else if (patient?.id) {
					if (isTopup) {
						// Пополнение личного аванса (входящий приходный платёж)
						const resp = await fetch("/api/finance/payments", {
							method: "POST",
							headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
							body: JSON.stringify({
								patientId: patient.id,
								amountRub: amount,
								amountKopecks,
								method,
								clientMutationId: mutationId,
								note: "Внесение аванса на лицевой счёт",
							}),
						});
						if (!resp.ok) {
							throw new Error(`Ошибка проведения финансовой операции (код ${resp.status})`);
						}
					} else {
						// Списание личного аванса (канонический возврат / расходная операция через кассу 54-ФЗ)
						const refundResp = await fetch("/api/cashbox/refund", {
							method: "POST",
							headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
							body: JSON.stringify({
								amountRub: amount,
								reasonText: `Списание аванса с лицевого счёта: ${patient.fullName || "Пациент"}`,
								patientId: patient.id,
							}),
						});
						if (!refundResp.ok) {
							const errData = (await refundResp.json().catch(() => null)) as { message?: string } | null;
							throw new Error(errData?.message || `Ошибка списания аванса (код ${refundResp.status})`);
						}
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
					methodLabelRu: mapMethodToLabel(method),
					status: "completed",
					note: isTopup ? `Пополнение ${target === "family" ? "семейного" : "личного"} счёта` : "Зачёт средств в счёт лечения",
				};

				setOperationsLog((prev) => [newRecord, ...prev]);
				const msg = isTopup
					? `Аванс +${amount.toLocaleString("ru-RU")} ₽ зачислен на ${target === "family" ? "семейный" : "личный"} счёт!`
					: `Списано ${amount.toLocaleString("ru-RU")} ₽ с ${target === "family" ? "семейного" : "личного"} счёта.`;
				showToast(msg, "success", 4000);
			} catch (err: unknown) {
				const errMsg = err instanceof Error ? err.message : "Ошибка финансовой операции";
				showToast(errMsg, "error");
			} finally {
				setIsSubmitting(false);
			}
		},
		[disabled, isSubmitting, personalBalance, familyBalance, patient?.id, patient?.fullName, patient?.familyGroupId, onUpdateBalance],
	);

	return { personalBalance, familyBalance, operationsLog, isSubmitting, executeOperation, reloadHistory: loadOperationsHistory };
}
