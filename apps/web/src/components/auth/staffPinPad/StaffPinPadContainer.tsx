import React from "react";
import { AuthArtBackground } from "../AuthArtBackground";
import { DEMO_CHIEF_DOCTOR } from "../staffUnlockState";
import { StaffPinPadSelector } from "./StaffPinPadSelector";
import { StaffPinPadInput } from "./StaffPinPadInput";
import { useStaffPinPad } from "./useStaffPinPad";
import type { StaffPinPadProps, StaffUser } from "./staffPinPadTypes";

export function StaffPinPad(props: StaffPinPadProps) {
	const {
		selectedUser, setSelectedUser, pin, setPin, errorShake, loading, errorText, setErrorText,
		listPhase, activeStaff, handleKeyPress, handleBackspace, handleReset, submitPin,
	} = useStaffPinPad(props);

	return (
		<div className="auth-overlay">
			<AuthArtBackground overlayAlpha={0.35} />
			<div className="auth-modal auth-modal--wide animate-fade-in-up">
				<StaffPinPadSelector
					listPhase={listPhase}
					activeStaff={activeStaff as StaffUser[]}
					selectedUser={selectedUser}
					staffListStatus={props.staffListStatus}
					onSelectUser={(staff) => {
						setSelectedUser(staff);
						setPin("");
						setErrorText(null);
					}}
					onRetryStaffList={props.onRetryStaffList}
					onClinicLogout={props.onClinicLogout}
				/>
				<StaffPinPadInput
					selectedUser={selectedUser}
					pin={pin}
					loading={loading}
					errorShake={errorShake}
					errorText={errorText}
					listPhase={listPhase}
					onKeyPress={handleKeyPress}
					onBackspace={handleBackspace}
					onReset={handleReset}
					onDemoLogin={() => {
						const target = selectedUser || DEMO_CHIEF_DOCTOR;
						setSelectedUser(target as StaffUser);
						setPin("1111");
						void submitPin("1111", target as StaffUser);
					}}
				/>
			</div>
		</div>
	);
}
