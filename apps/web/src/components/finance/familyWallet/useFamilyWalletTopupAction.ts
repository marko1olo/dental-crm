import React, { useRef, useState } from "react";
import { denteAdminSecretRequestHeaders, money } from "../../../AppHelpers";
import { actionFailureToast } from "../../../lib/panelStateText";
import { normalizeRubAmountInput } from "../../../rubAmountInput";
import { showToast } from "../../GlobalToast";
import { familyMutationId, familyTopupRequestKey, type MutationTicket } from "../familyWalletMutationKey";
import { type FamilyGroup, type FamilyLedgerEntry, type FamilyTopupMethod, refusalToast } from "./types";
import { logger } from "../../../utils/logger";

export interface UseFamilyWalletTopupActionParams {
	family: FamilyGroup | null;
	patientId: string;
	payerName: string;
	topupInput: string;
	setTopupInput: React.Dispatch<React.SetStateAction<string>>;
	topupMethod: FamilyTopupMethod;
	loadFamily: () => Promise<void>;
	setLedgerEntries: React.Dispatch<React.SetStateAction<FamilyLedgerEntry[]>>;
}

export function useFamilyWalletTopupAction({
	family,
	patientId,
	payerName,
	topupInput,
	setTopupInput,
	topupMethod,
	loadFamily,
	setLedgerEntries,
}: UseFamilyWalletTopupActionParams) {
	const [isToppingUp, setIsToppingUp] = useState(false);
	const topupMutationRef = useRef<MutationTicket | null>(null);

	const parsedTopup = normalizeRubAmountInput(topupInput);
	const topupAmount = parsedTopup ?? 0;
	const topupInvalid = Boolean(topupInput.trim()) && parsedTopup === null;

	const topupBlockReason = topupInvalid
		? "Впишите сумму цифрами, копейки после запятой: 1500,50"
		: topupAmount > 0 && Math.abs(Math.round(topupAmount * 100) - topupAmount * 100) > 1e-4
			? "Сумма пополнения может содержать не более 2 знаков после запятой (копейки)."
			: null;

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
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId,
					familyGroupId: family.id,
					amountRub: topupAmount,
					method: topupMethod,
					clientMutationId: mutationId,
				}),
			});
			if (!res.ok) {
				const errPayload = (await res.json().catch(() => null)) as { message?: string } | null;
				showToast(refusalToast("Пополнение семейного счёта не прошло", res.status, errPayload?.message), "error");
				return;
			}
			topupMutationRef.current = null;
			const topupResult = (await res.json().catch((err) => {
				logger.error("[Dente]", err);
				showToast(actionFailureToast("Ответ о пополнении не прочитан", (err as { status?: number })?.status ?? null), "error");
				return null;
			})) as { duplicate?: boolean } | null;

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
			showToast(actionFailureToast("Ответ по пополнению семейного счёта не получен", null), "error");
		} finally {
			setIsToppingUp(false);
		}
	};

	return { isToppingUp, topupAmount, topupInvalid, topupBlockReason, handleTopup };
}
