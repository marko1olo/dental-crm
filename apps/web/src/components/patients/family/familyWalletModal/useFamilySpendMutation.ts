/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilySpendMutation.ts
 * Spend mutation operation for family wallet. Mandate 8b: <= 120 lines.
 */
import {
	generateUuidV7,
	kopecksToRubles,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { useCallback, useRef, useState } from "react";
import { money } from "../../../../AppHelpers";
import { denteClinicalMutationHeaders } from "../../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../../services/logging/clientLogger";
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
		const cleanAmount = spendAmount.replace(",", ".").trim();
		let amountKopecks = 0;
		try {
			amountKopecks = parseKopecks(cleanAmount);
		} catch {
			amountKopecks = 0;
		}
		if (!familyData?.id) return showToast("Семья не зарегистрирована", "error");
		if (!cleanAmount || amountKopecks <= 0)
			return showToast("Укажите сумму > 0 ₽", "error");

		const familyBalanceKopecks = rublesToKopecks(familyBalanceNumeric);
		if (amountKopecks > familyBalanceKopecks)
			return showToast(
				`Недостаточно средств. Баланс: ${money(familyBalanceNumeric)}`,
				"error",
			);
		if (spendPatientId && spendingPermissions[spendPatientId] === false)
			return showToast("Списание запрещено", "error");

		const num = kopecksToRubles(amountKopecks);
		inFlightRef.current = true;
		setSubmitting(true);
		try {
			const targetPatientId = spendPatientId || patientId;
			const payerId = familyData.headPatientId || patientId;
			const clientMutationId = generateUuidV7();

			const res = await fetch("/api/finance/family/pay", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": clientMutationId,
				}),
				body: JSON.stringify({
					familyGroupId: familyData.id,
					patientId: targetPatientId,
					payerPatientId: payerId,
					amountRub: num,
					amountKopecks,
					clientMutationId,
				}),
			});

			if (!res.ok) {
				let err: Record<string, string> | null = null;
				try {
					err = (await res.json()) as Record<string, string> | null;
				} catch (parseErr) {
					clientLogger.warn("[useFamilySpendMutation] Spend error JSON parse failed", {
						status: res.status,
						error: String(parseErr),
					});
				}
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
