import type { StaffProfileExtended } from "@dental/shared";
import React from "react";
import { StaffSecurityPasswordSection } from "./staff/security/StaffSecurityPasswordSection";
import { StaffSecurityPinSection } from "./staff/security/StaffSecurityPinSection";
import { StaffSecurityStatusAndSessions } from "./staff/security/StaffSecurityStatusAndSessions";
import "./staffProfile.css";

export interface StaffSecurityTabProps {
	readonly staffMember: StaffProfileExtended;
	readonly onSaved?: (() => void) | undefined;
	readonly onClose?: (() => void) | undefined;
}

export const StaffSecurityTab: React.FC<StaffSecurityTabProps> = ({
	staffMember,
	onSaved,
}) => {
	return (
		<div className="space-y-4 animate-fade-in" data-testid="staff-security-tab">
			<StaffSecurityPasswordSection staffMember={staffMember} onSaved={onSaved} />
			<StaffSecurityPinSection staffMember={staffMember} onSaved={onSaved} />
			<StaffSecurityStatusAndSessions staffMember={staffMember} onSaved={onSaved} />
		</div>
	);
};

export default StaffSecurityTab;
