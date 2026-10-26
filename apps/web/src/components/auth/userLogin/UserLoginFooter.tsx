import React from "react";

interface UserLoginFooterProps {
	onSwitchToRegister: () => void;
	onSwitchToClinicMode?: (() => void) | undefined;
	onSwitchToDemoTour?: (() => void) | undefined;
}

export function UserLoginFooter({
	onSwitchToRegister,
	onSwitchToClinicMode,
	onSwitchToDemoTour,
}: UserLoginFooterProps) {
	return (
		<div className="auth-footer-hints auth-footer-hints--border">
			<div className="auth-footer-links-row">
				<button type="button" onClick={onSwitchToRegister} className="auth-link-btn">
					Регистрация клиники
				</button>
				<span className="auth-footer-dot">·</span>
				<button type="button" onClick={onSwitchToDemoTour} className="auth-link-btn">
					Выбрать демо-роль
				</button>
				{onSwitchToClinicMode && (
					<>
						<span className="auth-footer-dot">·</span>
						<button type="button" onClick={onSwitchToClinicMode} className="auth-link-btn">
							Режим клиники
						</button>
					</>
				)}
			</div>
			<div className="auth-footer-demo-hint">
				Демо-доступ: <code>doctor@clinic.com</code> / <code>dente2026</code>
			</div>
		</div>
	);
}
