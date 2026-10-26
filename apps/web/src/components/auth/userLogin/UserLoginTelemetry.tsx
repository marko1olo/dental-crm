import React from "react";

interface UserLoginTelemetryProps {
	isOnline: boolean;
	greeting: string;
}

export function UserLoginTelemetry({ isOnline, greeting }: UserLoginTelemetryProps) {
	return (
		<div className="auth-telemetry-bar">
			<span className={`auth-status-chip ${isOnline ? "auth-status-chip--online" : "auth-status-chip--offline"}`}>
				<span className="auth-status-dot" />
				{isOnline ? "Сервер онлайн" : "Автономный локальный режим"}
			</span>
			<span className="auth-greeting-chip">{greeting}</span>
		</div>
	);
}
