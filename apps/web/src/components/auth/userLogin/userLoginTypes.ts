export interface UserLoginProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onSwitchToRegister: () => void;
	onSwitchToClinicMode?: () => void;
	onSwitchToDemoTour?: () => void;
}
