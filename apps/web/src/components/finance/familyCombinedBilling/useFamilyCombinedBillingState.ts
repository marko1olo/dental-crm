import { useMemo, useRef, useState } from "react";
import {
	type CombinedFamilyBillingDraft,
	type CombinedFamilyBillingResult,
	type FamilyBillingPayerProfile,
	type FamilyMemberBillingItem,
	compileFamilyBillingDraft,
	createCompositeIdempotencyKey,
	generateUuidV7,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import { printSbpQrReceipt, printTaxCertificates } from "../familyBillingPrint";

interface UseFamilyCombinedBillingProps {
	readonly initialItems: readonly FamilyMemberBillingItem[];
	readonly availableFamilyWalletRub: number;
	readonly initialPayer: FamilyBillingPayerProfile;
	readonly familyGroupId?: string | undefined;
	readonly familyGroupName: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly onCheckoutComplete?: ((result: CombinedFamilyBillingResult) => void) | undefined;
	readonly onClose: () => void;
}

export function useFamilyCombinedBillingState(props: UseFamilyCombinedBillingProps) {
	const { initialItems, availableFamilyWalletRub, initialPayer, familyGroupId, familyGroupName, clinicName, clinicInn, onCheckoutComplete, onClose } = props;
	const [activeTab, setActiveTab] = useState<"items" | "payment" | "tax">("items");
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(() => new Set(initialItems.map((i) => i.id)));
	const [useFamilyWallet, setUseFamilyWallet] = useState(true);
	const [customWalletOffsetRub, setCustomWalletOffsetRub] = useState(availableFamilyWalletRub);
	const [additionalPaymentMethod, setAdditionalPaymentMethod] = useState<"sbp" | "card" | "cash">("sbp");
	const [cashReceivedRub, setCashReceivedRub] = useState(0);
	const [isCopiedSbpLink, setIsCopiedSbpLink] = useState(false);
	const [isFiscalizing, setIsFiscalizing] = useState(false);
	const isFiscalizingRef = useRef(false);

	const activeItems = useMemo(() => initialItems.filter((i) => selectedItemIds.has(i.id)), [initialItems, selectedItemIds]);

	const familyDraft: CombinedFamilyBillingDraft = useMemo(() => ({
		payer: initialPayer, familyGroupName, availableFamilyWalletRub: useFamilyWallet ? customWalletOffsetRub : 0,
		items: activeItems, clinicName, clinicInn,
	}), [initialPayer, familyGroupName, useFamilyWallet, customWalletOffsetRub, activeItems, clinicName, clinicInn]);

	const billingResult = useMemo(() => compileFamilyBillingDraft(familyDraft), [familyDraft]);

	const handleToggleItem = (id: string) => setSelectedItemIds((prev) => {
		const next = new Set(prev);
		if (next.has(id)) next.delete(id); else next.add(id);
		return next;
	});

	const handleCopySbpUrl = async () => {
		if (!billingResult.defaultSplit.sbpQr?.nspkUrl) return;
		try {
			await navigator.clipboard.writeText(billingResult.defaultSplit.sbpQr.nspkUrl);
			setIsCopiedSbpLink(true);
			setTimeout(() => setIsCopiedSbpLink(false), 2000);
			showToast("Платежная ссылка СБП скопирована в буфер", "success");
		} catch { showToast("Не удалось скопировать ссылку", "error"); }
	};

	const handleExecuteFiscalization = async () => {
		if (isFiscalizingRef.current || isFiscalizing) return;
		if (activeItems.length === 0) { showToast("Выберите хотя бы одну позицию для формирования чека", "warning", 3500); return; }
		isFiscalizingRef.current = true;
		setIsFiscalizing(true);
		try {
			const targetPatientId = initialPayer.payerId || activeItems[0]?.patientId || "";
			if (!targetPatientId) throw new Error("Не указан идентификатор пациента для проведения семейной оплаты");
			if (typeof fetch === "function") {
				const headers = { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() };
				const walletOffsetRub = useFamilyWallet ? billingResult.defaultSplit.familyWalletOffsetRub : 0;
				const remainingRub = billingResult.defaultSplit.remainingDueRub;
				if (familyGroupId && walletOffsetRub > 0) {
					const payerId = initialPayer.payerId || targetPatientId;
					const mutId = createCompositeIdempotencyKey(`fambill-w:${familyGroupId}:${targetPatientId}:${generateUuidV7()}`, { familyGroupId, amountRub: walletOffsetRub, payerId });
					const res = await fetch("/api/finance/family/pay", { method: "POST", headers: { ...headers, "Idempotency-Key": mutId }, body: JSON.stringify({ familyGroupId, patientId: targetPatientId, payerPatientId: payerId, amountRub: walletOffsetRub, clientMutationId: mutId }) });
					if (!res.ok) { const err = await res.json().catch(() => null) as { message?: string } | null; throw new Error(err?.message || `Ошибка списания (${res.status})`); }
				}
				if (remainingRub > 0) {
					const mutId = createCompositeIdempotencyKey(`fambill-p:${targetPatientId}:${generateUuidV7()}`, { patientId: targetPatientId, amountRub: remainingRub, method: additionalPaymentMethod });
					const method = additionalPaymentMethod === "sbp" ? "online" : additionalPaymentMethod === "card" ? "card" : "cash";
					const res = await fetch("/api/billing/payments", { method: "POST", headers: { ...headers, "Idempotency-Key": mutId }, body: JSON.stringify({ patientId: targetPatientId, amountRub: remainingRub, method, clientMutationId: mutId, payerFullName: initialPayer.payerFullName || undefined, payerInn: initialPayer.payerInn || undefined, note: `Семейный расчет (${familyGroupName})` }) });
					if (!res.ok) { const err = await res.json().catch(() => null) as { message?: string } | null; throw new Error(err?.message || `Ошибка фискализации (${res.status})`); }
				}
			}
			onCheckoutComplete?.(billingResult);
			showToast(`Семейная оплата на ${billingResult.totalAmountFormattedRu} успешно принята, чек выдан!`, "success", 5000);
			onClose();
		} catch (e: any) { showToast(`Ошибка фискализации: ${e?.message || e}`, "error"); }
		finally { isFiscalizingRef.current = false; setIsFiscalizing(false); }
	};

	return {
		activeTab, setActiveTab, selectedItemIds, activeItems, useFamilyWallet, setUseFamilyWallet,
		additionalPaymentMethod, setAdditionalPaymentMethod, cashReceivedRub, setCashReceivedRub,
		isCopiedSbpLink, isFiscalizing, billingResult, handleToggleItem,
		handleSelectAll: () => setSelectedItemIds(new Set(initialItems.map((i) => i.id))),
		handleDeselectAll: () => setSelectedItemIds(new Set()),
		handleCopySbpUrl, handlePrintSbpReceipt: () => billingResult.defaultSplit.sbpQr && printSbpQrReceipt({ sbp: billingResult.defaultSplit.sbpQr, clinicName, payerFullName: initialPayer.payerFullName, familyGroupName }),
		handlePrintAllTaxCerts: () => printTaxCertificates({ certs: billingResult.taxDeductionCertificates, clinicName, clinicInn }),
		handleExecuteFiscalization,
	};
}
