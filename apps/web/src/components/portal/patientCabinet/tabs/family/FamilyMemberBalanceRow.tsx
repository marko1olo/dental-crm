import React from "react";
import { Lock, Unlock } from "lucide-react";
import type { PatientCabinetFamilyMember } from "../../patientCabinetEngine";

export interface FamilyMemberBalanceRowProps {
	readonly member: PatientCabinetFamilyMember;
	readonly onToggleBalancePermission: (id: string) => void;
}

export const FamilyMemberBalanceRow: React.FC<FamilyMemberBalanceRowProps> = ({
	member,
	onToggleBalancePermission,
}) => {
	const isAllowed = member.allowSpendFamilyBalance;

	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "8px 12px",
				background: "var(--pc-bg-subtle, #f8fafc)",
				borderRadius: "8px",
				fontSize: "0.8125rem",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
				{isAllowed ? <Unlock size={14} style={{ color: "#059669" }} /> : <Lock size={14} style={{ color: "#dc2626" }} />}
				<span style={{ color: isAllowed ? "var(--pc-text-main, #1e293b)" : "var(--pc-text-muted, #64748b)" }}>
					Оплата с общего счета
				</span>
			</div>
			<button
				type="button"
				onClick={() => onToggleBalancePermission(member.id)}
				style={{ border: "none", background: "none", color: isAllowed ? "#059669" : "#dc2626", fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline" }}
			>
				{isAllowed ? "Разрешено" : "Запрещено"}
			</button>
		</div>
	);
};
