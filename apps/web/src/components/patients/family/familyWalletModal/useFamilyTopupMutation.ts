/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyTopupMutation.ts
 * Topup mutation operation and state for family wallet.
 * Mandate 8b: strictly <= 120 lines.
 * Mandates 8e, 8i, 8ao: strict idempotency key & synchronous double-click protection.
 */

import { createCompositeIdempotencyKey, generateUuidV7 } from "@dental/shared";
import { useCallback, useRef, useState } from "react";
import { money } from "../../../../AppHelpers";
import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";
import type { FamilyGroupDetails, TopupPaymentMethod } from "./types";

export interface UseFamilyTopupMutationArgs {
	readonly patientId: string;
	readonly familyData: FamilyGroupDetails | null;
	readonly notifyChanged: () => Promise<void>;
}

export function useFamilyTopupMutation({
	patientId,
	familyData,
	notifyChanged,
}: UseFamilyTopupMutationArgs) {
	const [submitting, setSubmitting] = useState(false);
	const inFlightRef = useRef(false);
	const [topupAmount, setTopupAmount] = useState("");
	const [topupPayerId, setTopupPayerId] = useState(patientId);
	const [topupMethod, setTopupMethod] = useState<TopupPaymentMethod>("card");
	const [topupComment, setTopupComment] = useState("");

	const handleExecuteTopup = useCallback(async () => {
		if (inFlightRef.current || submitting) return;
		const num = parseFloat(topupAmount.replace(",", "."));
		if (!familyData?.id) return showToast("Семья не зарегистрирована", "error");
		if (!topupAmount || Number.isNaN(num) || num <= 0)
			return showToast("Укажите сумму > 0 ₽", "error");

		inFlightRef.current = true;
		setSubmitting(true);
		try {
			const payerId = topupPayerId || patientId;
			const clientMutationId = createCompositeIdempotencyKey(
				`fam-topup:${familyData.id}:${payerId}:${generateUuidV7()}`,
				{ familyGroupId: familyData.id, amountRub: num, method: topupMethod },
			);

			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": clientMutationId,
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					familyGroupId: familyData.id,
					amountRub: num,
					patientId: payerId,
					method: topupMethod === "sbp" ? "online" : topupMethod,
					comment: topupComment.trim() || undefined,
					clientMutationId,
				}),
			});

			if (!res.ok) {
				const errorJson = (await res.json().catch(() => null)) as {
					message?: string;
					error?: string;
				} | null;
				throw new Error(
					errorJson?.message ||
						errorJson?.error ||
						`Ошибка пополнения (${res.status})`,
				);
			}

			showToast(`Семейный счет пополнен на ${money(num)}`, "success");
			setTopupAmount("");
			setTopupComment("");
			await notifyChanged();
		} catch (err: unknown) {
			const msg =
				err instanceof Error ? err.message : "Не удалось пополнить счет";
			showToast(msg, "error");
		} finally {
			inFlightRef.current = false;
			setSubmitting(false);
		}
	}, [
		familyData?.id,
		notifyChanged,
		patientId,
		submitting,
		topupAmount,
		topupComment,
		topupMethod,
		topupPayerId,
	]);

	return {
		topupSubmitting: submitting,
		topupAmount,
		setTopupAmount,
		topupPayerId,
		setTopupPayerId,
		topupMethod,
		setTopupMethod,
		topupComment,
		setTopupComment,
		handleExecuteTopup,
	};
}
