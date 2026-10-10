import React from "react";
import { AlertTriangle, Crown, ShieldAlert, User, UserCheck, Users } from "lucide-react";
import {
	type FamilyMember,
	safeFamilyMemberName,
	validateFamilyMemberStatus,
} from "./types";
import { money } from "../../../AppHelpers";

export interface FamilyMembersListProps {
	members: FamilyMember[];
	targetPatientId: string;
	patientId: string;
	isPaying: boolean;
	headPatientId?: string | null | undefined;
	onSelectTargetPatient: (id: string) => void;
}

export const FamilyMembersList: React.FC<FamilyMembersListProps> = ({
	members,
	targetPatientId,
	patientId,
	isPaying,
	headPatientId,
	onSelectTargetPatient,
}) => {
	if (!members || members.length === 0) return null;

	return (
		<div className="family-members-section" data-testid="family-members-section">
			<h4 className="family-members-title">
				<Users size={16} />
				Члены семьи и доступные счета ({members.length} чел.)
			</h4>
			<div className="family-members-grid">
				{members.map((member) => {
					const isCurrent = member.id === targetPatientId;
					const isSelf = member.id === patientId;
					const isHead = member.isHead || (headPatientId && headPatientId === member.id);
					const status = validateFamilyMemberStatus(member);
					const displayName = safeFamilyMemberName(member, "Член семьи");

					return (
						<div
							key={member.id}
							className={`family-member-card ${isCurrent ? "is-current" : ""} ${
								status.isArchived || status.isMerged ? "opacity-85" : ""
							}`}
						>
							<div className="family-member-card-header">
								<div className="family-member-avatar">
									{isHead ? (
										<Crown size={20} className="text-amber-500" />
									) : isCurrent ? (
										<UserCheck size={20} />
									) : (
										<User size={20} />
									)}
								</div>
								<div className="family-member-info">
									<div className="flex items-center gap-1.5 flex-wrap">
										<h5 className="family-member-name" title={displayName}>
											{displayName}
										</h5>
										{isHead && (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
												<Crown size={10} /> Глава семьи
											</span>
										)}
									</div>
									<p className="family-member-phone">
										{member.phone && member.phone !== "null" && member.phone !== "undefined"
											? member.phone
											: "—"}
									</p>
									<div className="flex items-center gap-1 flex-wrap mt-0.5">
										<span className="family-member-badge">
											{isSelf ? "Текущий пациент" : member.relationship || "Член семьи"}
										</span>

										{status.isMerged && (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20" title={status.warning}>
												<ShieldAlert size={10} /> Объединен
											</span>
										)}

										{status.isArchived && (
											<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20" title={status.warning}>
												<AlertTriangle size={10} /> Архив
											</span>
										)}

										{member.individualLimitRub !== undefined && member.individualLimitRub > 0 && (
											<span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
												Лимит: {money(member.individualLimitRub)}
											</span>
										)}
									</div>
								</div>
							</div>

							{status.warning && (
								<p className="text-[11px] text-[var(--muted,#64748b)] px-3 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg m-0 mx-2 mb-2 leading-tight">
									{status.warning}
								</p>
							)}

							<button
								type="button"
								onClick={() => onSelectTargetPatient(status.redirectPatientId || member.id)}
								className={`family-member-transfer-btn ${isCurrent ? "active" : ""}`}
								disabled={isPaying}
								title={
									isCurrent
										? "Пациент выбран для списания с семейного счета"
										: `Выбрать ${displayName} для списания средств`
								}
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
