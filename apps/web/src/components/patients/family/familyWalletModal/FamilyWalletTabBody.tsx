/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletTabBody.tsx
 * Tab body switcher for Family Wallet Modal.
 * Mandate 8b: strictly <= 120 lines.
 */
import React from "react";
import { FamilyDepositTopupSection } from "./FamilyDepositTopupSection";
import { FamilyMembersBalanceList } from "./FamilyMembersBalanceList";
import { FamilyWalletHistoryTable } from "./FamilyWalletHistoryTable";
import { FamilyWalletSpendSection } from "./FamilyWalletSpendSection";
import { FamilyWalletTaxSection } from "./FamilyWalletTaxSection";
import type { FamilyWalletLogic } from "./useFamilyWalletLogic";

export interface FamilyWalletTabBodyProps {
	readonly logic: FamilyWalletLogic;
	readonly patientId: string;
}

export const FamilyWalletTabBody: React.FC<FamilyWalletTabBodyProps> =
	React.memo(function FamilyWalletTabBody({ logic, patientId }) {
		const { activeTab } = logic;
		const isInfoTab = activeTab === "info" || activeTab === "overview";

		return (
			<div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
				{isInfoTab && (
					<FamilyMembersBalanceList
						familyData={logic.familyData}
						familyBalanceNumeric={logic.familyBalanceNumeric}
						patientId={patientId}
						spendingPermissions={logic.spendingPermissions}
						onTogglePermission={logic.handleTogglePermission}
						onNavigateTab={logic.setActiveTab}
					/>
				)}

				{activeTab === "topup" && (
					<FamilyDepositTopupSection
						topupAmount={logic.topupAmount}
						setTopupAmount={logic.setTopupAmount}
						topupPayerId={logic.topupPayerId}
						setTopupPayerId={logic.setTopupPayerId}
						topupMethod={logic.topupMethod}
						setTopupMethod={logic.setTopupMethod}
						topupComment={logic.topupComment}
						setTopupComment={logic.setTopupComment}
						membersList={logic.membersList}
						submitting={logic.submitting}
						topupAmountInputId={logic.topupAmountInputId}
						onSubmitTopup={logic.handleExecuteTopup}
					/>
				)}

				{activeTab === "spend" && (
					<FamilyWalletSpendSection
						familyData={logic.familyData}
						familyBalanceNumeric={logic.familyBalanceNumeric}
						spendPatientId={logic.spendPatientId}
						setSpendPatientId={logic.setSpendPatientId}
						spendAmount={logic.spendAmount}
						setSpendAmount={logic.setSpendAmount}
						membersList={logic.membersList}
						submitting={logic.submitting}
						spendAmountInputId={logic.spendAmountInputId}
						onSubmitSpend={logic.handleExecuteSpend}
					/>
				)}

				{activeTab === "history" && (
					<FamilyWalletHistoryTable transactions={logic.transactions} />
				)}

				{activeTab === "tax" && (
					<FamilyWalletTaxSection
						familyData={logic.familyData}
						patientId={patientId}
					/>
				)}
			</div>
		);
	});
