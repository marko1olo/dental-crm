import React from "react";
import { UserPlus, Users } from "lucide-react";

export interface FamilyEmptyStateProps {
	readonly isAddingMember: boolean;
	readonly onStartAddMember: () => void;
}

export const FamilyEmptyState: React.FC<FamilyEmptyStateProps> = ({
	isAddingMember,
	onStartAddMember,
}) => {
	return (
		<div className="pc-family-empty-state" data-testid="pc-family-empty-state" style={{ background: "var(--pc-surface, #ffffff)", border: "1px dashed var(--pc-border, #cbd5e1)", borderRadius: "12px", padding: "36px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
			<Users size={36} style={{ color: "var(--pc-text-muted, #94a3b8)", opacity: 0.7 }} />
			<div style={{ maxWidth: "420px" }}>
				<strong style={{ fontSize: "0.9375rem", color: "var(--pc-text-main, #0f172a)", display: "block", marginBottom: "4px" }}>Семейный профиль пока не заполнен</strong>
				<span style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)" }}>Добавьте членов семьи для совместной записи к врачу и единого баланса</span>
			</div>
			{!isAddingMember && (
				<button type="button" onClick={onStartAddMember} className="pc-btn-primary" data-testid="btn-add-family-member-empty" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "0.8125rem", fontWeight: 600, borderRadius: "8px", cursor: "pointer", marginTop: "4px" }}>
					<UserPlus size={16} /><span>+ Добавить члена семьи</span>
				</button>
			)}
		</div>
	);
};
