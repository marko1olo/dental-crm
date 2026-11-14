import type { StaffUser } from "../staffPinPad/staffPinPadTypes";

export interface ClinicLoginProfile {
	organizationId?: string;
	name?: string;
	[key: string]: unknown;
}

export interface UserLoginProps {
	onSuccess: (clinicProfile: ClinicLoginProfile | null, userProfile: StaffUser | null) => void;
	onSwitchToRegister: () => void;
	onSwitchToClinicMode?: () => void;
	onSwitchToDemoTour?: () => void;
}
