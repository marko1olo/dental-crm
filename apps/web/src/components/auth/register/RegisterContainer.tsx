import React from "react";
import { Shield } from "lucide-react";
import type { RegisterProps } from "./registerHelpers";
import { RegisterFooter } from "./RegisterFooter";
import { RegisterFormFields } from "./RegisterFormFields";
import { RegisterScaleSelector } from "./RegisterScaleSelector";
import { useRegister } from "./useRegister";

export function Register({ onSuccess, onSwitchToLogin, onSwitchToDemoTour }: RegisterProps) {
	const {
		scale, setScale, name, setName, email, setEmail, password, setPassword,
		showPassword, setShowPassword, seedDemoData, setSeedDemoData, loading, handleSubmit,
	} = useRegister(onSuccess);

	return (
		<div className="auth-view-content animate-fade-in-up">
			<div className="auth-header-center">
				<div className="auth-logo-box">
					<Shield size={34} />
				</div>
				<h2 className="auth-logo-title">DENTE</h2>
				<p className="auth-logo-subtitle">Быстрый старт за 30 секунд без пейволла</p>
			</div>

			<RegisterScaleSelector scale={scale} onScaleChange={setScale} />

			<RegisterFormFields
				scale={scale}
				name={name}
				setName={setName}
				email={email}
				setEmail={setEmail}
				password={password}
				setPassword={setPassword}
				showPassword={showPassword}
				setShowPassword={setShowPassword}
				seedDemoData={seedDemoData}
				setSeedDemoData={setSeedDemoData}
				loading={loading}
				onSubmit={handleSubmit}
			/>

			<RegisterFooter onSwitchToLogin={onSwitchToLogin} onSwitchToDemoTour={onSwitchToDemoTour} />
		</div>
	);
}
