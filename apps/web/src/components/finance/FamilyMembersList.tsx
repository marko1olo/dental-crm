import React from "react";
import { User, UserCheck, Users } from "lucide-react";
import type { FamilyMember } from "./familyWalletHelpers";

export interface FamilyMembersListProps {
	members: FamilyMember[];
	targetPatientId: string;
	patientId: string;
	isPaying: boolean;
	onSelectTargetPatient: (id: string) => void;
}

export const FamilyMembersList: React.FC<FamilyMembersListProps> = ({
	members,
	targetPatientId,
	patientId,
	isPaying,
	onSelectTargetPatient,
}) => {
	if (!members || members.length === 0) return null;

	return (
		<div className="family-members-section">
			<h4 className="family-members-title">
				<Users size={16} />
				Члены семьи и доступные счета ({members.length} чел.)
			</h4>
			<div className="family-members-grid">
				{members.map((member) => {
					const isCurrent = member.id === targetPatientId;
					const isSelf = member.id === patientId;
					return (
						<div
							key={member.id}
							className={`family-member-card ${isCurrent ? "is-current" : ""}`}
						>
							<div className="family-member-card-header">
								<div className="family-member-avatar">
									{isCurrent ? (
										<UserCheck size={20} />
									) : (
										<User size={20} />
									)}
								</div>
								<div className="family-member-info">
									<h5
										className="family-member-name"
										title={member.fullName}
									>
										{member.fullName || "Без имени"}
									</h5>
									<p className="family-member-phone">
										{member.phone || "—"}
									</p>
									<span className="family-member-badge">
										{isSelf ? "Текущий пациент" : "Член семьи"}
									</span>
								</div>
							</div>
							<button
								type="button"
								onClick={() => onSelectTargetPatient(member.id)}
								className={`family-member-transfer-btn ${isCurrent ? "active" : ""}`}
								disabled={isPaying}
							>
								{isCurrent ? "Выбран для оплаты" : "Выбрать для списания"}
							</button>
						</div>
					);
				})}
			</div>
		</div>
	);
};
