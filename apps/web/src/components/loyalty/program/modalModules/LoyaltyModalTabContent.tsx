import React from "react";
import { LoyaltyBalanceTab } from "../LoyaltyBalanceTab";
import { LoyaltyFamilyTab } from "../LoyaltyFamilyTab";
import { LoyaltyReferralsTab } from "../LoyaltyReferralsTab";
import { LoyaltyCertificatesTab } from "../LoyaltyCertificatesTab";
import { LoyaltyPromosTab } from "../LoyaltyPromosTab";
import { LoyaltyLedgerTab } from "../LoyaltyLedgerTab";
import type { useLoyaltyModalState } from "./useLoyaltyModalState";

export interface LoyaltyModalTabContentProps {
	readonly m: ReturnType<typeof useLoyaltyModalState>;
	readonly patientName: string;
	readonly clinicName: string;
}

export const LoyaltyModalTabContent: React.FC<LoyaltyModalTabContentProps> = ({ m, patientName, clinicName }) => {
	const { sync, familyState, certState, promoState } = m;

	return (
		<main className="loyalty-tab-content">
			{m.activeTab === "balance" && (
				<LoyaltyBalanceTab
					patientName={patientName}
					currentTier={m.currentTier}
					effectiveBalanceRub={m.effectiveBalanceRub}
					tierProgression={m.tierProgression}
					redemptionSuccessMsg={m.redemptionSuccessMsg}
					familyMembers={familyState.familyMembers}
					selectedFamilyMemberId={familyState.selectedFamilyMemberId}
					onSelectFamilyMemberId={(id) => { familyState.setSelectedFamilyMemberId(id); if (id) familyState.setIsFamilyModeActive(true); }}
					activePointsBalance={sync.activePointsBalance}
					familyPool={m.computedFamilyPool}
					invoiceAmountRub={m.invoiceAmountRub}
					onInvoiceAmountChange={m.setInvoiceAmountRub}
					excludedAmountRub={m.excludedAmountRub}
					onExcludedAmountChange={m.setExcludedAmountRub}
					requestedPointsRub={m.requestedPointsRub}
					onRequestedPointsChange={m.setRequestedPointsRub}
					redemptionCalc={m.redemptionCalc}
					onOneClickRedeem={m.handleExecuteRedemption}
					onApplyQuickPoints={(pts) => m.setRequestedPointsRub(pts)}
					onApplyMaxPoints={() => m.setRequestedPointsRub(m.redemptionCalc.maxAllowedRedemptionRub)}
					isDoctorOverride={m.isDoctorOverride}
					onDoctorOverrideChange={m.setIsDoctorOverride}
					onExecuteRedemption={m.handleExecuteRedemption}
				/>
			)}

			{m.activeTab === "family" && (
				<LoyaltyFamilyTab
					familyPool={m.computedFamilyPool}
					familyMembers={familyState.familyMembers}
					isFamilyModeActive={familyState.isFamilyModeActive}
					onToggleFamilyMode={() => familyState.setIsFamilyModeActive(!familyState.isFamilyModeActive)}
					onCreditFamilyBalance={familyState.handleCreditFamilyBalance}
					onSelectMemberForPayment={(memberId) => { familyState.setSelectedFamilyMemberId(memberId); familyState.setIsFamilyModeActive(true); m.setActiveTab("balance"); }}
					onToggleMemberPermission={familyState.handleToggleMemberPermission}
					newMemberName={familyState.newMemberName}
					onNewMemberNameChange={familyState.setNewMemberName}
					newMemberRole={familyState.newMemberRole}
					onNewMemberRoleChange={familyState.setNewMemberRole}
					onAddFamilyMember={familyState.handleAddFamilyMember}
				/>
			)}

			{m.activeTab === "referrals" && (
				<LoyaltyReferralsTab
					referrals={sync.referrals}
					selectedReferralPreset={sync.selectedReferralPreset}
					onSelectReferralPreset={sync.setSelectedReferralPreset}
					newReferralName={sync.newReferralName}
					onNewReferralNameChange={sync.setNewReferralName}
					newReferralPhone={sync.newReferralPhone}
					onNewReferralPhoneChange={sync.setNewReferralPhone}
					newReferralNote={sync.newReferralNote}
					onNewReferralNoteChange={sync.setNewReferralNote}
					onAddReferral={m.handleAddReferral}
					onCreditReferral={m.handleCreditReferral}
				/>
			)}

			{m.activeTab === "certificates" && (
				<LoyaltyCertificatesTab
					certificateNominalRub={certState.certificateNominalRub}
					onNominalChange={certState.setCertificateNominalRub}
					recipientName={certState.recipientName}
					onRecipientNameChange={certState.setRecipientName}
					activeCertificate={certState.activeCertificate}
					certVerifyInput={certState.certVerifyInput}
					onCertVerifyInputChange={certState.setCertVerifyInput}
					certRedeemFeedback={certState.certRedeemFeedback}
					onGenerateNewCertificate={certState.handleGenerateNewCertificate}
					onVerifyAndRedeemCert={certState.handleVerifyAndRedeemCert}
					clinicName={clinicName}
				/>
			)}

			{m.activeTab === "promos" && (
				<LoyaltyPromosTab
					promoInput={promoState.promoInput}
					onPromoInputChange={promoState.setPromoInput}
					promoResult={promoState.promoResult}
					onEvaluatePromo={promoState.handleEvaluatePromo}
					onApplyPromoDirectly={promoState.handleApplyPromoDirectly}
					onApplyPromoResultToInvoice={promoState.handleApplyPromoResultToInvoice}
				/>
			)}

			{m.activeTab === "ledger" && (
				<LoyaltyLedgerTab
					ledgerSearch={m.ledgerSearch}
					onLedgerSearchChange={m.setLedgerSearch}
					filteredLedger={m.filteredLedger}
					onExportLedger={m.handleExportLedger}
				/>
			)}
		</main>
	);
};
