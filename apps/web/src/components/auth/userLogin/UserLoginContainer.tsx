import React from "react";
import { Shield } from "lucide-react";
import { UserLoginFooter } from "./UserLoginFooter";
import { UserLoginFormFields } from "./UserLoginFormFields";
import { UserLoginQuickResume } from "./UserLoginQuickResume";
import { UserLoginTelemetry } from "./UserLoginTelemetry";
import type { UserLoginProps } from "./userLoginTypes";
import { useUserLogin } from "./useUserLogin";

export function UserLogin({
	onSuccess,
	onSwitchToRegister,
	onSwitchToClinicMode,
	onSwitchToDemoTour,
}: UserLoginProps) {
	const {
		identity, setIdentity, password, setPassword, showPassword, setShowPassword,
		loading, isOnline, greeting, quickResume, detectedType, handleSubmit, handleQuickResumeLogin,
	} = useUserLogin(onSuccess);

	return (
		<div className="auth-view-content animate-fade-in-up">
			<UserLoginTelemetry isOnline={isOnline} greeting={greeting} />

			<div className="auth-header-center">
				<div className="auth-logo-box">
					<Shield size={34} />
				</div>
				<h2 className="auth-logo-title">DENTE</h2>
				<p className="auth-logo-subtitle">Универсальная стоматологическая платформа</p>
			</div>

			<UserLoginQuickResume quickResume={quickResume} onResume={handleQuickResumeLogin} />

			<UserLoginFormFields
				identity={identity}
				setIdentity={setIdentity}
				password={password}
				setPassword={setPassword}
				showPassword={showPassword}
				setShowPassword={setShowPassword}
				loading={loading}
				detectedType={detectedType}
				onSwitchToDemoTour={onSwitchToDemoTour}
				onSubmit={handleSubmit}
			/>

			<UserLoginFooter
				onSwitchToRegister={onSwitchToRegister}
				onSwitchToClinicMode={onSwitchToClinicMode}
				onSwitchToDemoTour={onSwitchToDemoTour}
			/>
		</div>
	);
}
