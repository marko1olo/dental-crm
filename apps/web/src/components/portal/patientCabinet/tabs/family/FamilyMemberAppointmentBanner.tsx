import React from "react";
import { Calendar } from "lucide-react";
import type { PatientCabinetFamilyMember } from "../../patientCabinetEngine";

export interface FamilyMemberAppointmentBannerProps {
	readonly member: PatientCabinetFamilyMember;
}

export const FamilyMemberAppointmentBanner: React.FC<FamilyMemberAppointmentBannerProps> = ({ member }) => {
	if (!member.nextAppointmentDateIso) return null;

	return (
		<div
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: "8px",
				padding: "8px 12px",
				background: "rgba(2, 132, 199, 0.05)",
				border: "1px solid rgba(2, 132, 199, 0.15)",
				borderRadius: "8px",
				fontSize: "0.8125rem",
			}}
		>
			<Calendar size={14} style={{ color: "var(--pc-primary, #0284c7)", flexShrink: 0, marginTop: "2px" }} />
			<div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
				<span style={{ fontWeight: 600, color: "var(--pc-text-main, #0f172a)" }}>
					{member.nextAppointmentDateIso} в {member.nextAppointmentTimeRu || "12:00"}
				</span>
				<span style={{ color: "var(--pc-text-muted, #64748b)" }}>
					{member.nextAppointmentTitleRu} ({member.nextAppointmentDoctor || "Врач клиники"})
				</span>
			</div>
		</div>
	);
};
