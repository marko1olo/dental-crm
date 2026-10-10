/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletModalView.tsx
 *
 * Layer 4: View presentation component assembling all subcomponents.
 * Follows DAG Invariant: imports only from sibling subcomponents and types.
 */

import React from "react";
import { FamilyDepositTopupSection } from "./FamilyDepositTopupSection";
import { FamilyMembersBalanceList } from "./FamilyMembersBalanceList";
import { FamilyWalletHistoryTable } from "./FamilyWalletHistoryTable";
import { FamilyWalletModalFooterActions } from "./FamilyWalletModalFooterActions";
import { FamilyWalletModalHeader } from "./FamilyWalletModalHeader";
import { FamilyWalletNavTabs } from "./FamilyWalletNavTabs";
import { FamilyWalletSpendSection } from "./FamilyWalletSpendSection";
import { FamilyWalletTransferSection } from "./FamilyWalletTransferSection";
import type { FamilyWalletLogic } from "./useFamilyWalletLogic";

export interface FamilyWalletModalViewProps {
	readonly logic: FamilyWalletLogic;
	readonly patientId: string;
	readonly patientName?: string | null | undefined;
	readonly className?: string | undefined;
}

export const FamilyWalletModalView: React.FC<FamilyWalletModalViewProps> =
	React.memo(function FamilyWalletModalView({
		logic,
		patientId,
		patientName,
		className = "",
	}) {
		const {
			activeTab,
			setActiveTab,
			familyData,
			familyBalanceNumeric,
			membersList,
			spendingPermissions,
			handleTogglePermission,
			handleSavePermissions,
			topupAmount,
			setTopupAmount,
			topupPayerId,
			setTopupPayerId,
			topupMethod,
			setTopupMethod,
			topupComment,
			setTopupComment,
			spendAmount,
			setSpendAmount,
			spendPatientId,
			setSpendPatientId,
			transferAmount,
			setTransferAmount,
			transferSourceId,
			setTransferSourceId,
			transferTargetId,
			setTransferTargetId,
			transactions,
			topupAmountInputId,
			spendAmountInputId,
			transferAmountInputId,
			submitting,
			handleExecuteTopup,
			handleExecuteSpend,
			handleExecuteTransfer,
			onClose,
		} = logic;

		return (
			<div
				data-testid="family-wallet-modal"
				style={{ width: "100%", maxWidth: "820px" }}
				className={`bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] ${className}`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<FamilyWalletModalHeader
					familyData={familyData}
					patientName={patientName}
					onClose={onClose}
				/>

				{/* Navigation Tabs Bar */}
				<FamilyWalletNavTabs
					activeTab={activeTab}
					setActiveTab={setActiveTab}
				/>

				{/* Modal Body */}
				<div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
					{activeTab === "overview" && (
						<FamilyMembersBalanceList
							familyData={familyData}
							familyBalanceNumeric={familyBalanceNumeric}
							patientId={patientId}
							spendingPermissions={spendingPermissions}
							onTogglePermission={handleTogglePermission}
							onNavigateTab={setActiveTab}
						/>
					)}

					{activeTab === "topup" && (
						<FamilyDepositTopupSection
							topupAmount={topupAmount}
							setTopupAmount={setTopupAmount}
							topupPayerId={topupPayerId}
							setTopupPayerId={setTopupPayerId}
							topupMethod={topupMethod}
							setTopupMethod={setTopupMethod}
							topupComment={topupComment}
							setTopupComment={setTopupComment}
							membersList={membersList}
							submitting={submitting}
							topupAmountInputId={topupAmountInputId}
							onSubmitTopup={handleExecuteTopup}
						/>
					)}

					{activeTab === "spend" && (
						<FamilyWalletSpendSection
							familyData={familyData}
							familyBalanceNumeric={familyBalanceNumeric}
							spendPatientId={spendPatientId}
							setSpendPatientId={setSpendPatientId}
							spendAmount={spendAmount}
							setSpendAmount={setSpendAmount}
							membersList={membersList}
							submitting={submitting}
							spendAmountInputId={spendAmountInputId}
							onSubmitSpend={handleExecuteSpend}
						/>
					)}

					{activeTab === "transfer" && (
						<FamilyWalletTransferSection
							transferSourceId={transferSourceId}
							setTransferSourceId={setTransferSourceId}
							transferTargetId={transferTargetId}
							setTransferTargetId={setTransferTargetId}
							transferAmount={transferAmount}
							setTransferAmount={setTransferAmount}
							membersList={membersList}
							submitting={submitting}
							transferAmountInputId={transferAmountInputId}
							onSubmitTransfer={handleExecuteTransfer}
						/>
					)}

					{activeTab === "history" && (
						<FamilyWalletHistoryTable transactions={transactions} />
					)}
				</div>

				{/* Modal Footer */}
				<FamilyWalletModalFooterActions
					activeTab={activeTab}
					onNavigateTab={setActiveTab}
					onSavePermissions={handleSavePermissions}
					onClose={onClose}
				/>
			</div>
		);
	});
