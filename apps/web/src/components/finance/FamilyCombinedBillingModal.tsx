import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { Layers, QrCode, ShieldCheck } from "lucide-react";
import type { CombinedFamilyBillingResult, FamilyBillingPayerProfile, FamilyMemberBillingItem } from "@dental/shared";
import { FamilyBillingPaymentTab } from "./FamilyBillingPaymentTab";
import { FamilyCombinedBillingHeader } from "./familyCombinedBilling/FamilyCombinedBillingHeader";
import { FamilyCombinedBillingItemsTab } from "./familyCombinedBilling/FamilyCombinedBillingItemsTab";
import { FamilyCombinedBillingTaxTab } from "./familyCombinedBilling/FamilyCombinedBillingTaxTab";
import { FamilyCombinedBillingFooter } from "./familyCombinedBilling/FamilyCombinedBillingFooter";
import { useFamilyCombinedBillingState } from "./familyCombinedBilling/useFamilyCombinedBillingState";

export { FamilyBillingPaymentTab } from "./FamilyBillingPaymentTab";
export { printSbpQrReceipt, printTaxCertificates } from "./familyBillingPrint";

export interface FamilyCombinedBillingModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly familyGroupId?: string | undefined;
	readonly familyGroupName?: string | undefined;
	readonly availableFamilyWalletRub?: number | undefined;
	readonly initialPayer?: FamilyBillingPayerProfile | undefined;
	readonly initialItems?: readonly FamilyMemberBillingItem[] | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly onCheckoutComplete?: (result: CombinedFamilyBillingResult) => void;
}

export function FamilyCombinedBillingModal({
	isOpen,
	onClose,
	familyGroupId,
	familyGroupName = "Семейная группа",
	availableFamilyWalletRub = 0,
	initialPayer = { payerId: "", payerFullName: "Ответственный плательщик", payerInn: "", payerPhone: "", payerPassport: "" },
	initialItems: propInitialItems,
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	clinicInn = "",
	onCheckoutComplete,
}: FamilyCombinedBillingModalProps) {
	const initialItems = useMemo(() => (propInitialItems && propInitialItems.length > 0 ? propInitialItems : []), [propInitialItems]);
	const s = useFamilyCombinedBillingState({
		initialItems, availableFamilyWalletRub, initialPayer, familyGroupId,
		familyGroupName, clinicName, clinicInn, onCheckoutComplete, onClose,
	});

	if (!isOpen) return null;

	const modalContent = (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="family-billing-title" data-testid="family-combined-billing-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
			<div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] overflow-hidden">
				<FamilyCombinedBillingHeader familyGroupName={familyGroupName} availableFamilyWalletRub={availableFamilyWalletRub} initialPayer={initialPayer} onClose={onClose} />
				<div className="flex shrink-0 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] px-4 sm:px-5 overflow-x-auto no-scrollbar gap-2">
					<button type="button" onClick={() => s.setActiveTab("items")} className={`py-3 px-3.5 inline-flex items-center gap-2 font-bold text-xs border-b-2 cursor-pointer ${s.activeTab === "items" ? "border-teal-600 text-teal-600" : "border-transparent text-[var(--muted)]"}`}>
						<Layers size={16} />
						<span>1. Состав счетов ({s.activeItems.length})</span>
					</button>
					<button type="button" onClick={() => s.setActiveTab("payment")} className={`py-3 px-3.5 inline-flex items-center gap-2 font-bold text-xs border-b-2 cursor-pointer ${s.activeTab === "payment" ? "border-teal-600 text-teal-600" : "border-transparent text-[var(--muted)]"}`}>
						<QrCode size={16} />
						<span>2. Сплит-оплата ({s.billingResult.totalAmountRub.toLocaleString("ru-RU")} ₽)</span>
					</button>
					<button type="button" onClick={() => s.setActiveTab("tax")} className={`py-3 px-3.5 inline-flex items-center gap-2 font-bold text-xs border-b-2 cursor-pointer ${s.activeTab === "tax" ? "border-teal-600 text-teal-600" : "border-transparent text-[var(--muted)]"}`}>
						<ShieldCheck size={16} />
						<span>3. Справки на вычет</span>
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[var(--paper-soft,#f8fafc)]">
					{s.activeTab === "items" && <FamilyCombinedBillingItemsTab initialItems={initialItems} selectedItemIds={s.selectedItemIds} onToggleItem={s.handleToggleItem} onSelectAll={s.handleSelectAll} onDeselectAll={s.handleDeselectAll} billingResult={s.billingResult} />}
					{s.activeTab === "payment" && <FamilyBillingPaymentTab useFamilyWallet={s.useFamilyWallet} setUseFamilyWallet={s.setUseFamilyWallet} availableFamilyWalletRub={availableFamilyWalletRub} billingResult={s.billingResult} additionalPaymentMethod={s.additionalPaymentMethod} setAdditionalPaymentMethod={s.setAdditionalPaymentMethod} cashReceivedRub={s.cashReceivedRub} setCashReceivedRub={s.setCashReceivedRub} isCopiedSbpLink={s.isCopiedSbpLink} onCopySbpUrl={s.handleCopySbpUrl} onPrintSbpQrReceipt={s.handlePrintSbpReceipt} />}
					{s.activeTab === "tax" && <FamilyCombinedBillingTaxTab initialPayer={initialPayer} billingResult={s.billingResult} onPrintAllTaxCerts={s.handlePrintAllTaxCerts} />}
				</div>
				<FamilyCombinedBillingFooter billingResult={s.billingResult} useFamilyWallet={s.useFamilyWallet} isFiscalizing={s.isFiscalizing} activeItemsCount={s.activeItems.length} onClose={onClose} onExecuteFiscalization={s.handleExecuteFiscalization} />
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
