import { ArrowRight, Eye, EyeOff, KeyRound, Mail, Shield } from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

interface UserLoginProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onSwitchToRegister: () => void;
	onSwitchToClinicMode: () => void;
}

export function UserLogin({
	onSuccess,
	onSwitchToRegister,
	onSwitchToClinicMode,
}: UserLoginProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) {
			showToast("Заполните Email и пароль", "warning");
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Ошибка входа");

			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
			showToast("Вход выполнен", "success");
			onSuccess(
				{ organizationId: data.user?.organizationId ?? data.organizationId },
				data.user,
			);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			showToast(err.message || "Неверный Email или пароль", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-overlay">
			<div className="auth-glow auth-glow--left"></div>
			<div className="auth-glow auth-glow--right"></div>
			<div
				className="auth-modal animate-fade-in-up"
				style={{ maxWidth: "400px" }}
			>
				<div className="auth-header-center">
					<div className="auth-logo-box">
						<Shield size={32} />
					</div>
					<h2 className="auth-logo-title">DENTE CRM-MIS</h2>
					<p className="auth-logo-subtitle">Вход в личный кабинет врача</p>
				</div>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="auth-form-group">
						<label htmlFor="user-login-email" className="auth-label">
							<Mail size={12} className="auth-icon-inline" /> Email
						</label>
						<input
							id="user-login-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="doctor@clinic.com"
							className="auth-input"
							disabled={loading}
							autoComplete="email"
						/>
					</div>
					<div className="auth-form-group">
						<label htmlFor="user-login-password" className="auth-label">
							<KeyRound size={12} className="auth-icon-inline" /> Пароль
						</label>
						<div className="auth-input-wrapper">
							<input
								id="user-login-password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="auth-input auth-input--with-icon"
								disabled={loading}
								autoComplete="current-password"
							/>
							<button
								type="button"
								className="auth-input-icon-btn"
								onClick={() => setShowPassword((v) => !v)}
								tabIndex={-1}
								aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
							>
								{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
					</div>

					<button type="submit" disabled={loading} className="auth-submit-btn">
						{loading ? (
							<div className="auth-spinner"></div>
						) : (
							<>
								Войти в профиль <ArrowRight size={16} />
							</>
						)}
					</button>
				</form>

				<div className="auth-footer-hints auth-footer-hints--border">
					<button
						type="button"
						onClick={onSwitchToRegister}
						className="auth-link-btn"
					>
						Зарегистрировать клинику
					</button>
					{" · "}
					<button
						type="button"
						onClick={onSwitchToClinicMode}
						className="auth-link-btn"
					>
						Общий терминал клиники
					</button>
				</div>
			</div>
		</div>
	);
}
