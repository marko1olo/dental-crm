import React from "react";
import { UserCheck } from "lucide-react";
import { formatDoctorRole } from "../doctorPrivacyShieldHelpers";
import type { StaffUser } from "./staffPinPadTypes";

interface StaffPinPadCardProps {
	staff: StaffUser;
	isSelected: boolean;
	pinHint?: string;
	onSelect: (staff: StaffUser) => void;
}

export function StaffPinPadCard({ staff, isSelected, pinHint, onSelect }: StaffPinPadCardProps) {
	const fullName = typeof staff?.fullName === "string" ? staff.fullName : "Без имени";
	const initials = fullName
		? fullName.split(" ").filter(Boolean).map((p) => p[0] ?? "").join("").slice(0, 2)
		: "??";
	const roleText = typeof staff?.role === "string" ? formatDoctorRole(staff.role) : "";
	const roleAndPin = pinHint ? `${roleText} · ${pinHint}` : roleText;

	return (
		<button
			type="button"
			className={`auth-staff-card ${isSelected ? "active" : ""}`}
			onClick={() => onSelect(staff)}
		>
			<div
				className="auth-staff-avatar"
				style={{ backgroundColor: (staff.color as string) || "var(--teal,#0d9488)" }}
			>
				{initials}
			</div>
			<div className="auth-staff-info">
				<div className="auth-staff-name">{fullName}</div>
				{roleAndPin && <div className="auth-staff-role">{roleAndPin}</div>}
			</div>
			{isSelected && (
				<div className="auth-staff-check">
					<UserCheck size={18} />
				</div>
			)}
		</button>
	);
}
