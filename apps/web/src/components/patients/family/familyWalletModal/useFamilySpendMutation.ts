/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilySpendMutation.ts
 * Spend mutation operation for family wallet. Mandate 8b: <= 120 lines.
 */
import { createCompositeIdempotencyKey, generateUuidV7 } from "@dental/shared";
import { useCallback, useRef, useState } from "react";
import { money } from "../../../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";
import type { UseFamilySpendMutationArgs } from "./types";

export type { UseFamilySpendMutationArgs } from "./types";

export function useFamilySpendMutation(args: UseFamilySpendMutationArgs) {
	const {
		patientId,
		familyData,
		familyBalanceNumeric,
		spendingPermissions,
		notifyChanged,
	} = args;
	const [submitting, setSubmitting] = useState(false);
	const inFlightRef = useRef(false);
	const [spendAmount, setSpendAmount] = useState("");
	const [spendPatientId, setSpendPatientId] = useState(patientId);
	const [spendNote, setSpendNote] = useState("");

	const handleExecuteSpend = useCallback(async () => {
		if (inFlightRef.current || submitting) return;
		const num = parseFloat(spendAmount.replace(",", "."));
		if (!familyData?.id) return showToast("Семья не зарегистрирована", "error");
		if (!spendAmount || Number.isNaN(num) || num <= 0)
			return showToast("Укажите сумму > 0 ₽", "error");
		if (num > familyBalanceNumeric)
			return showToast(
				`Недостаточно средств. Баланс: ${money(familyBalanceNumeric)}`,
				"error",
			);
		if (spendPatientId && spendingPermissions[spendPatientId] === false)
			return showToast("Списание запрещено", "error");

		inFlightRef.current = true;
		setSubmitting(true);
		try {
			const targetPatientId = spendPatientId || patientId;
			const payerId = familyData.headPatientId || patientId;
			const keyPayload = {
				familyGroupId: familyData.id,
				amountRub: num,
				payerPatientId: payerId,
			};
			const clientMutationId = createCompositeIdempotencyKey(
				`fam-pay:${familyData.id}:${targetPatientId}:${generateUuidV7()}`,
				keyPayload,
			);

			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": clientMutationId,
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: familyData.id,
					patientId: targetPatientId,
					payerPatientId: payerId,
					amountRub: num,
					clientMutationId,
				}),
			});

			if (!res.ok) {
				const err = (await res.json().catch(() => null)) as Record<
					string,
					string
				> | null;
				throw new Error(
					err?.message || err?.error || `Ошибка списания (${res.status})`,
				);
			}

			showToast(`Списано ${money(num)} с семейного баланса`, "success");
			setSpendAmount("");
			setSpendNote("");
			await notifyChanged();
		} catch (err: unknown) {
			showToast(
				err instanceof Error ? err.message : "Не удалось списать средства",
				"error",
			);
		} finally {
			inFlightRef.current = false;
			setSubmitting(false);
		}
	}, [
		familyBalanceNumeric,
		familyData?.headPatientId,
		familyData?.id,
		notifyChanged,
		patientId,
		spendAmount,
		spendPatientId,
		spendingPermissions,
		submitting,
	]);

	return {
		spendSubmitting: submitting,
		spendAmount,
		setSpendAmount,
		spendPatientId,
		setSpendPatientId,
		spendNote,
		setSpendNote,
		handleExecuteSpend,
	};
}
