/**
 * apps/web/src/components/patients/family/familyWalletModal/useFamilyTopupMutation.ts
 * Topup mutation operation and state for family wallet.
 * Mandate 8b: strictly <= 120 lines.
 * Mandates 8e, 8i, 8ao: strict idempotency key & synchronous double-click protection.
 */

import {
	generateUuidV7,
	kopecksToRubles,
	parseKopecks,
} from "@dental/shared";
import { useCallback, useRef, useState } from "react";
import { money } from "../../../../AppHelpers";
import { denteClinicalMutationHeaders } from "../../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../../services/logging/clientLogger";
import { showToast } from "../../../GlobalToast";
import type { FamilyGroupDetails, TopupPaymentMethod } from "./types";

export interface UseFamilyTopupMutationArgs {
	readonly patientId: string;
	readonly familyData: FamilyGroupDetails | null;
	readonly notifyChanged: (newBalanceRub?: number) => Promise<void>;
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
		const cleanAmount = topupAmount.replace(",", ".").trim();
		let amountKopecks = 0;
		try {
			amountKopecks = parseKopecks(cleanAmount);
		} catch {
			amountKopecks = 0;
		}
		if (!familyData?.id) return showToast("Семья не зарегистрирована", "error");
		if (!cleanAmount || amountKopecks <= 0)
			return showToast("Укажите сумму > 0 ₽", "error");

		const num = kopecksToRubles(amountKopecks);
		inFlightRef.current = true;
		setSubmitting(true);
		try {
			const payerId = topupPayerId || patientId;
			const clientMutationId = generateUuidV7();

			const res = await fetch("/api/finance/family/topup", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": clientMutationId,
				}),
				body: JSON.stringify({
					familyGroupId: familyData.id,
					amountRub: num,
					amountKopecks,
					patientId: payerId,
					method: topupMethod === "sbp" ? "online" : topupMethod,
					comment: topupComment.trim() || undefined,
					clientMutationId,
				}),
			});

			let rawJson: {
				data?: { newBalance?: string };
				newBalance?: string;
				message?: string;
				error?: string;
			} | null = null;
			try {
				rawJson = (await res.json()) as {
					data?: { newBalance?: string };
					newBalance?: string;
					message?: string;
					error?: string;
				} | null;
			} catch (parseErr) {
				clientLogger.warn("[useFamilyTopupMutation] Response JSON parse failed", {
					status: res.status,
					error: String(parseErr),
				});
			}
			const resJson = rawJson?.data ?? rawJson;

			if (!res.ok) {
				throw new Error(
					rawJson?.message ||
						rawJson?.error ||
						`Ошибка пополнения (${res.status})`,
				);
			}

			showToast(`Семейный счет пополнен на ${money(num)}`, "success");
			setTopupAmount("");
			setTopupComment("");
			const parsedBalance = resJson?.newBalance
				? kopecksToRubles(parseKopecks(resJson.newBalance))
				: undefined;
			await notifyChanged(parsedBalance);
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
