import React from "react";
import { Check } from "lucide-react";

interface RegisterFooterProps {
	onSwitchToLogin: () => void;
	onSwitchToDemoTour?: (() => void) | undefined;
}

export function RegisterFooter({ onSwitchToLogin, onSwitchToDemoTour }: RegisterFooterProps) {
	return (
		<div className="auth-footer-hints auth-footer-hints--border">
			<div className="auth-footer-no-paywall-badge">
				<Check size={14} className="auth-icon-inline" /> Без кредитной карты · Мгновенный доступ
			</div>
			<div className="auth-footer-links-row" style={{ marginTop: "10px" }}>
				<span>Уже есть аккаунт?</span>
				<button type="button" onClick={onSwitchToLogin} className="auth-link-btn">
					Войти в систему
				</button>
				{onSwitchToDemoTour && (
					<>
						<span className="auth-footer-dot">·</span>
						<button type="button" onClick={onSwitchToDemoTour} className="auth-link-btn">
							Попробовать демо-тур
						</button>
					</>
				)}
			</div>
		</div>
	);
}
