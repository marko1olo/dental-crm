import React from "react";
import { Calendar } from "lucide-react";
import type { PatientCabinetFamilyMember } from "../../patientCabinetEngine";
import { calculateAge } from "./familyConstants";
import { FamilyMemberAppointmentBanner } from "./FamilyMemberAppointmentBanner";
import { FamilyMemberBalanceRow } from "./FamilyMemberBalanceRow";

export interface FamilyMemberCardProps {
	readonly member: PatientCabinetFamilyMember;
	readonly onToggleBalancePermission: (id: string) => void;
	readonly onOpenBookingForMember?: (member: PatientCabinetFamilyMember) => void;
	readonly onOpenBooking?: () => void;
	readonly onShowToast?: (message: string) => void;
}

export const FamilyMemberCard: React.FC<FamilyMemberCardProps> = ({
	member,
	onToggleBalancePermission,
	onOpenBookingForMember,
	onOpenBooking,
	onShowToast,
}) => {
	const age = calculateAge(member.birthDate);

	return (
		<article
			className="pc-family-member-card"
			data-testid={`family-member-${member.id}`}
			style={{
				background: "var(--pc-surface, #ffffff)",
				border: "1px solid var(--pc-border, #e2e8f0)",
				borderRadius: "12px",
				padding: "16px",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
			}}
		>
			<div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
				<div
					style={{
						width: "44px",
						height: "44px",
						borderRadius: "50%",
						background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
						color: "#ffffff",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "0.9375rem",
						fontWeight: 700,
						flexShrink: 0,
					}}
				>
					{member.avatarInitials || "ФС"}
				</div>

				<div style={{ flex: 1, minWidth: 0 }}>
					<strong style={{ fontSize: "0.9375rem", color: "var(--pc-text-main, #0f172a)", display: "block" }}>
						{member.fullName}
					</strong>
					<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8125rem", color: "var(--pc-text-muted, #64748b)", marginTop: "2px" }}>
						<span style={{ fontWeight: 600, color: "var(--pc-primary, #0284c7)" }}>
							{member.relationshipRu}
						</span>
						{age !== null && <span>&bull; {age} лет</span>}
						{member.cardNumber && <span>&bull; № {member.cardNumber}</span>}
					</div>
				</div>
			</div>

			<FamilyMemberBalanceRow member={member} onToggleBalancePermission={onToggleBalancePermission} />

			<FamilyMemberAppointmentBanner member={member} />

			<div style={{ marginTop: "auto", paddingTop: "4px" }}>
				<button
					type="button"
					className="pc-btn-secondary"
					onClick={() => {
						if (onOpenBookingForMember) onOpenBookingForMember(member);
						else if (onOpenBooking) onOpenBooking();
						onShowToast?.(`Запись на приём для: ${member.fullName}`);
					}}
					data-testid={`btn-book-for-${member.id}`}
					style={{ width: "100%", minHeight: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 14px", borderRadius: "6px", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
				>
					<Calendar size={14} />
					<span>Записать к врачу</span>
				</button>
			</div>
		</article>
	);
};
