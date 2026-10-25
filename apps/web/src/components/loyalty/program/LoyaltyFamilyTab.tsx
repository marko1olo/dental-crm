import type React from "react";
import { Users } from "lucide-react";
import type { FamilyMember, FamilyPoolResult } from "./loyaltyEngine";
import { LoyaltyFamilyHeroBanner } from "./tabs/family/LoyaltyFamilyHeroBanner";
import { LoyaltyFamilyDepositBar } from "./tabs/family/LoyaltyFamilyDepositBar";
import { LoyaltyFamilyMemberCard } from "./tabs/family/LoyaltyFamilyMemberCard";
import { LoyaltyFamilyAddMemberForm } from "./tabs/family/LoyaltyFamilyAddMemberForm";

export interface LoyaltyFamilyTabProps {
	readonly familyPool: FamilyPoolResult;
	readonly familyMembers: readonly FamilyMember[];
	readonly isFamilyModeActive: boolean;
	readonly onToggleFamilyMode: () => void;
	readonly onCreditFamilyBalance: (amountRub: number) => void;
	readonly onSelectMemberForPayment: (memberId: string) => void;
	readonly onToggleMemberPermission: (memberId: string) => void;
	readonly newMemberName: string;
	readonly onNewMemberNameChange: (name: string) => void;
	readonly newMemberRole: FamilyMember["roleRu"];
	readonly onNewMemberRoleChange: (role: FamilyMember["roleRu"]) => void;
	readonly onAddFamilyMember: () => void;
}

export const LoyaltyFamilyTab: React.FC<LoyaltyFamilyTabProps> = (p) => {
	return (
		<div>
			<LoyaltyFamilyHeroBanner
				familyPool={p.familyPool}
				isFamilyModeActive={p.isFamilyModeActive}
				onToggleFamilyMode={p.onToggleFamilyMode}
			/>

			<LoyaltyFamilyDepositBar onCreditFamilyBalance={p.onCreditFamilyBalance} />

			<h4 className="loyalty-section-title">
				<Users size={20} color="var(--teal)" />
				Члены семьи и права списания баллов
			</h4>

			{p.familyMembers.length === 0 ? (
				<div
					style={{
						border: "2px dashed var(--line)",
						borderRadius: "0.875rem",
						padding: "2rem",
						textAlign: "center",
						color: "var(--muted)",
						background: "var(--paper-soft)",
					}}
				>
					<Users size={36} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
					<div style={{ fontWeight: 600, color: "var(--ink)" }}>Члены семьи не добавлены</div>
					<p style={{ fontSize: "0.8125rem", marginTop: "4px" }}>
						Добавьте родственников через форму ниже для объединения бонусного счета семьи.
					</p>
				</div>
			) : (
				<div className="loyalty-family-grid">
					{p.familyMembers.map((member) => (
						<LoyaltyFamilyMemberCard
							key={member.patientId}
							member={member}
							onSelectMemberForPayment={p.onSelectMemberForPayment}
							onToggleMemberPermission={p.onToggleMemberPermission}
						/>
					))}
				</div>
			)}

			<LoyaltyFamilyAddMemberForm
				newMemberName={p.newMemberName}
				onNewMemberNameChange={p.onNewMemberNameChange}
				newMemberRole={p.newMemberRole}
				onNewMemberRoleChange={p.onNewMemberRoleChange}
				onAddFamilyMember={p.onAddFamilyMember}
			/>
		</div>
	);
};
