import {
	ArrowRight,
	Building,
	Eye,
	EyeOff,
	KeyRound,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	DEMO_SHOWCASE_ORG_ID,
	enableDemoShowcaseMode,
	isDemoShowcaseMode,
} from "../../lib/demoMode";
import {
	DENTE_CLINIC_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";

interface ClinicLoginProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onLoginSuccess: (clinicProfile: any) => void;
	onSwitchToUserLogin?: () => void;
	onSwitchToDemoTour?: () => void;
}

export function ClinicLogin({
	onLoginSuccess,
	onSwitchToUserLogin,
	onSwitchToDemoTour,
}: ClinicLoginProps) {
	const [email, setEmail] = useState(() =>
		isDemoShowcaseMode() ? "clinic@example.com" : "",
	);
	const [password, setPassword] = useState(() =>
		isDemoShowcaseMode() ? "dente2026" : "",
	);
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email || !password) {
			showToast("Заполните Email или ID клиники и пароль", "warning");
			return;
		}

		if (password.length < 6) {
			showToast("Пароль должен содержать не менее 6 знаков", "warning");
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/auth/clinic/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.trim(), password }),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.message || "Ошибка входа клиники");
			}

			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
			showToast("Вход в рабочее пространство клиники выполнен", "success");
			onLoginSuccess(data.clinicProfile);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			logger.error(err);
			showToast(err.message || "Неверный логин или пароль клиники", "error");
		} finally {
			setLoading(false);
		}
	};

	const handleDemoLogin = async () => {
		setLoading(true);
		try {
			enableDemoShowcaseMode();
			const demoClinicToken = "demo-showcase-clinic-token";
			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, demoClinicToken);
			showToast(
				"Демо-режим клиники активирован (Ознакомительный доступ)",
				"success",
			);
			onLoginSuccess({
				id: DEMO_SHOWCASE_ORG_ID,
				name: "Демо-Клиника DENTE",
				email: "clinic@example.com",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-view-content animate-fade-in-up">
			<div className="auth-header-center">
				<div className="auth-logo-box">
					<Shield size={34} />
				</div>
				<h2 className="auth-logo-title">DENTE</h2>
				<p className="auth-logo-subtitle">Вход для терминала клиники / регистратуры</p>
				<div className="auth-role-badge">
					<Building size={14} /> Общий компьютер смены
				</div>
			</div>

			<form onSubmit={handleSubmit} className="auth-form">
				<div className="auth-form-group">
					<label htmlFor="clinic-login-email" className="auth-label">
						<Building size={15} className="auth-icon-inline" /> Email или ID клиники
					</label>
					<input
						id="clinic-login-email"
						type="text"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="clinic@example.com или clinic-id"
						className="auth-input"
						disabled={loading}
						autoComplete="username"
					/>
				</div>

				<div className="auth-form-group">
					<div className="auth-label-row">
						<label htmlFor="clinic-login-password" className="auth-label">
							<KeyRound size={15} className="auth-icon-inline" /> Пароль
						</label>
						<span className="auth-input-subhint">От 6 знаков</span>
					</div>
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
							{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
						</button>
					</div>
				</div>

				<button type="submit" disabled={loading} className="auth-submit-btn auth-submit-btn--glow">
					{loading ? (
						<div className="auth-spinner" />
					) : (
						<>
							Войти в систему клиники <ArrowRight size={18} />
						</>
					)}
				</button>

				<button
					type="button"
					onClick={handleDemoLogin}
					disabled={loading}
					className="auth-demo-btn"
				>
					<Zap size={18} /> Быстрый вход в Демо-режим клиники (Без пароля)
				</button>
			</form>

			<div className="auth-footer-hints auth-footer-hints--border">
				{onSwitchToUserLogin && (
					<div style={{ marginBottom: "8px" }}>
						<button
							type="button"
							onClick={onSwitchToUserLogin}
							className="auth-link-btn"
						>
							← Персональный вход для врачей и сотрудников
						</button>
					</div>
				)}
				{onSwitchToDemoTour && (
					<div>
						<button
							type="button"
							onClick={onSwitchToDemoTour}
							className="auth-link-btn"
						>
							<Sparkles size={13} style={{ display: "inline", verticalAlign: "middle" }} /> Выбрать клиническую роль для ознакомления
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
