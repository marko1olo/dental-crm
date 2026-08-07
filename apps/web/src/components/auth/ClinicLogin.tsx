import {
	ArrowRight,
	Building,
	Eye,
	EyeOff,
	KeyRound,
	Shield,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	DENTE_CLINIC_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

interface ClinicLoginProps {
	onLoginSuccess: (clinicProfile: any) => void;
}

export function ClinicLogin({ onLoginSuccess }: ClinicLoginProps) {
	const [email, setEmail] = useState("clinic@example.com");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) {
			showToast("Заполните Email и пароль клиники", "warning");
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/auth/clinic/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || "Ошибка входа клиники");
			}

			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
			showToast("Вход в рабочее пространство выполнен", "success");
			onLoginSuccess(data.clinicProfile);
		} catch (err: any) {
			console.error(err);
			showToast(err.message || "Неверный логин или пароль клиники", "error");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-overlay">
			<div className="auth-glow auth-glow--left"></div>
			<div className="auth-glow auth-glow--right"></div>

			<div className="auth-modal animate-fade-in-up">
				<div className="auth-header-center">
					<div className="auth-logo-box">
						<Shield size={32} />
					</div>
					<h2 className="auth-logo-title">DENTE CRM-MIS</h2>
					<p className="auth-logo-subtitle">Авторизация терминала клиники</p>
				</div>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="auth-form-group">
						<label htmlFor="clinic-login-email" className="auth-label">
							<Building size={12} className="auth-icon-inline" /> Email клиники
						</label>
						<input
							id="clinic-login-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="clinic@example.com"
							className="auth-input"
							disabled={loading}
							autoComplete="email"
						/>
					</div>

					<div className="auth-form-group">
						<label htmlFor="clinic-login-password" className="auth-label">
							<KeyRound size={12} className="auth-icon-inline" /> Пароль
						</label>
						<div className="auth-input-wrapper">
							<input
								id="clinic-login-password"
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
								Войти в клинику <ArrowRight size={16} />
							</>
						)}
					</button>
				</form>

				<div className="auth-footer-hints auth-footer-hints--border">
					Пароль по умолчанию для демо-клиники: <code>admin123</code>
				</div>
			</div>
		</div>
	);
}
