/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletModalView.tsx
 * View presentation component assembling all subcomponents.
 * Mandate 8b: strictly <= 120 lines.
 */
import React from "react";
import { FamilyWalletModalFooterActions } from "./FamilyWalletModalFooterActions";
import { FamilyWalletModalHeader } from "./FamilyWalletModalHeader";
import { FamilyWalletNavTabs } from "./FamilyWalletNavTabs";
import { FamilyWalletTabBody } from "./FamilyWalletTabBody";
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
			handleSavePermissions,
			onClose,
		} = logic;

		return (
			<div
				data-testid="family-wallet-modal"
				role="dialog"
				aria-modal="true"
				style={{ width: "100%", maxWidth: "820px" }}
				className={`bg-[var(--paper-strong)] border border-b-0 sm:border-b border-[var(--glass-border)] rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-h-[90vh] sm:max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] ${className}`}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
			>
				{/* Mobile Drag Handle (Apple HIG Bottom Sheet) */}
				<div
					data-testid="family-wallet-mobile-handle"
					className="w-9 h-1 bg-[var(--line-strong,#94a3b8)] rounded-full mx-auto my-2 sm:hidden shrink-0 opacity-60"
				/>

				<FamilyWalletModalHeader
					familyData={familyData}
					patientName={patientName}
					onClose={onClose}
				/>

				<FamilyWalletNavTabs
					activeTab={activeTab}
					setActiveTab={setActiveTab}
				/>

				<FamilyWalletTabBody logic={logic} patientId={patientId} />

				<FamilyWalletModalFooterActions
					activeTab={activeTab}
					onNavigateTab={setActiveTab}
					onSavePermissions={handleSavePermissions}
					onClose={onClose}
				/>
			</div>
		);
	});
