/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyMembersBalanceList.tsx
 * Overview of Family Pooled Balance & Member Cards.
 * Mandate 8b: strictly <= 120 lines.
 */

import { ShieldCheck } from "lucide-react";
import React from "react";
import { FamilyMemberRowItem } from "./FamilyMemberRowItem";
import { FamilyPooledBalanceCard } from "./FamilyPooledBalanceCard";
import type { FamilyGroupDetails, FamilyWalletTab } from "./types";

export interface FamilyMembersBalanceListProps {
	readonly familyData: FamilyGroupDetails | null;
	readonly familyBalanceNumeric: number;
	readonly patientId: string;
	readonly spendingPermissions: Record<string, boolean>;
	readonly onTogglePermission: (memberId: string) => void;
	readonly onNavigateTab: (tab: FamilyWalletTab) => void;
}

export const FamilyMembersBalanceList: React.FC<FamilyMembersBalanceListProps> =
	React.memo(function FamilyMembersBalanceList({
		familyData,
		familyBalanceNumeric,
		patientId,
		spendingPermissions,
		onTogglePermission,
		onNavigateTab,
	}) {
		const membersList = familyData?.members ?? [];

		return (
			<div className="flex flex-col gap-4">
				<FamilyPooledBalanceCard
					familyBalanceNumeric={familyBalanceNumeric}
					onNavigateTab={onNavigateTab}
				/>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
							Члены семьи ({membersList.length} чел.)
						</span>
						<span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5" />
							0% комиссия клиники
						</span>
					</div>

					<div
						data-testid="family-wallet-members-list"
						className="border border-[var(--line)] rounded-xl divide-y divide-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs"
					>
						{membersList.length === 0 ? (
							<div className="p-4 text-center text-xs text-[var(--muted)]">
								В семейной группе пока нет зарегистрированных участников.
							</div>
						) : (
							membersList.map((member) => (
								<FamilyMemberRowItem
									key={member.id}
									member={member}
									isCurrent={member.id === patientId}
									isHead={member.id === familyData?.headPatientId}
									canSpend={spendingPermissions[member.id] !== false}
									onTogglePermission={onTogglePermission}
								/>
							))
						)}
					</div>
				</div>
			</div>
		);
	});
