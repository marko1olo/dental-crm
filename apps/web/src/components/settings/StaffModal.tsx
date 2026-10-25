import React from "react";
import {
	StaffProfileCard,
	type StaffProfileCardProps,
} from "./StaffProfileCard";

export type StaffModalProps = StaffProfileCardProps;

/**
 * StaffModal
 * Canonical modal wrapper for staff profile and HR credentials management.
 * Mandate 8e: Non-blocking staff management, full HR & commission persistence.
 */
export const StaffModal: React.FC<StaffModalProps> = (props) => {
	return <StaffProfileCard {...props} />;
};

export default StaffModal;
