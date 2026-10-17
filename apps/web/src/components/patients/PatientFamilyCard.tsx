import React from "react";
import { FamilyWalletModal } from "./family/FamilyWalletModal";
import { useFamilyCardLogic } from "./patientFamilyModules/useFamilyCardLogic";
import { FamilyCardHeader } from "./patientFamilyModules/FamilyCardHeader";
import { FamilyMembersView } from "./patientFamilyModules/FamilyMembersView";
import { FamilyEmptyActions } from "./patientFamilyModules/FamilyEmptyActions";

export type PatientFamilyCardProps = {
	patientId: string | null;
	patientName: string | null;
	familyData: any | null;
	loadFailure?: { status: number | null } | null | undefined;
	onRetryLoad?: (() => void) | undefined;
	onFamilyDataChanged: () => void;
};

export const PatientFamilyCard: React.FC<PatientFamilyCardProps> = ({
	patientId,
	patientName,
	familyData,
	loadFailure = null,
	onRetryLoad,
	onFamilyDataChanged,
}) => {
	const logic = useFamilyCardLogic(patientId, patientName, onFamilyDataChanged);
	if (!patientId) return null;

	return (
		<div
			data-testid="patient-family-card"
			className="panel mb-5 p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)]"
		>
			<FamilyCardHeader familyName={familyData?.name} onOpenWallet={() => logic.setIsWalletModalOpen(true)} />

			{familyData ? (
				<FamilyMembersView
					patientId={patientId}
					familyData={familyData}
					loading={logic.loading}
					onUnlink={logic.handleUnlinkFamily}
				/>
			) : (
				<FamilyEmptyActions
					loadFailure={loadFailure}
					onRetryLoad={onRetryLoad}
					onFamilyDataChanged={onFamilyDataChanged}
					isCreating={logic.isCreating}
					setIsCreating={logic.setIsCreating}
					isLinking={logic.isLinking}
					setIsLinking={logic.setIsLinking}
					newFamilyName={logic.newFamilyName}
					setNewFamilyName={logic.setNewFamilyName}
					searchQuery={logic.searchQuery}
					setSearchQuery={logic.setSearchQuery}
					searchResults={logic.searchResults}
					searchLoading={logic.searchLoading}
					searchFailed={logic.searchFailed}
					loading={logic.loading}
					patientName={patientName}
					handleCreateFamily={logic.handleCreateFamily}
					handleLinkFamily={logic.handleLinkFamily}
				/>
			)}

			<FamilyWalletModal
				isOpen={logic.isWalletModalOpen}
				onClose={() => logic.setIsWalletModalOpen(false)}
				patientId={patientId}
				patientName={patientName}
				familyData={familyData}
				onFamilyDataChanged={onFamilyDataChanged}
			/>
		</div>
	);
};

export default PatientFamilyCard;
