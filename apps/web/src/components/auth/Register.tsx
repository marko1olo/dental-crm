import {
	ArrowRight,
	Building,
	Eye,
	EyeOff,
	KeyRound,
	Mail,
	Shield,
	User,
} from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { showToast } from "../GlobalToast";

interface RegisterProps {
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onSwitchToLogin: () => void;
}

function getPasswordStrength(pw: string): { score: number; label: string } {
	let score = 0;
	if (pw.length >= 8) score++;
	if (pw.length >= 12) score++;
	if (/[A-Z]/.test(pw)) score++;
	if (/[0-9]/.test(pw)) score++;
	if (/[^A-Za-z0-9]/.test(pw)) score++;
	if (score <= 1) return { score: 1, label: "Слабый" };
	if (score <= 3) return { score: 2, label: "Средний" };
	return { score: 3, label: "Надёжный" };
}

export function Register({ onSuccess, onSwitchToLogin }: RegisterProps) {
	const [clinicName, setClinicName] = useState("");
	const [ownerName, setOwnerName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	const strength = getPasswordStrength(password);
	const passwordMismatch =
		touched.confirmPassword && confirmPassword && password !== confirmPassword;

	const handleBlur = useCallback((field: string) => {
		setTouched((prev) => ({ ...prev, [field]: true }));
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!clinicName || !ownerName || !email || !password || !confirmPassword) {
			showToast("Заполните все поля", "warning");
			return;
		}
		if (password !== confirmPassword) {
			showToast("Пароли не совпадают", "error");
			return;
		}
		if (password.length < 8) {
			showToast("Пароль должен быть не менее 8 символов", "warning");
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clinicName, ownerName, email, password }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.message || "Ошибка регистрации");

			localStorage.setItem("dente_clinic_token", data.clinicToken);
			localStorage.setItem("dente_staff_token", data.staffToken);
			if (data.organizationId)
				localStorage.setItem("dente_organization_id", data.organizationId);
			showToast("Клиника зарегистрирована!", "success");
			onSuccess(
				{ organizationId: data.organizationId },
				{ id: data.userId, fullName: ownerName, role: "owner", email },
			);
		} catch (err: any) {
			showToast(err.message || "Не удалось зарегистрироваться", "error");
		} finally {
			setLoading(false);
		}
	};

	const strengthLabel = password ? strength.label : "";
	const strengthClass = password
		? strength.score === 1
			? "weak"
			: strength.score === 2
				? "medium"
				: "strong"
		: "";

	return (
		<div className="auth-overlay">
			<div className="auth-glow auth-glow--left"></div>
			<div className="auth-glow auth-glow--right"></div>
			<div
				className="auth-modal animate-fade-in-up"
				style={{ maxWidth: "440px" }}
			>
				<div className="auth-header-center">
					<div className="auth-logo-box">
						<Shield size={32} />
					</div>
					<h2 className="auth-logo-title">DENTE CRM-MIS</h2>
					<p className="auth-logo-subtitle">Регистрация клиники</p>
				</div>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="auth-form-group">
						<label className="auth-label">
							<Building size={12} className="auth-icon-inline" /> Название
							клиники
						</label>
						<input
							type="text"
							value={clinicName}
							onChange={(e) => setClinicName(e.target.value)}
							onBlur={() => handleBlur("clinicName")}
							placeholder="Dental Clinic"
							className={`auth-input${touched.clinicName && !clinicName ? " error" : ""}`}
							disabled={loading}
							autoComplete="organization"
						/>
					</div>
					<div className="auth-form-group">
						<label className="auth-label">
							<User size={12} className="auth-icon-inline" /> ФИО Владельца
						</label>
						<input
							type="text"
							value={ownerName}
							onChange={(e) => setOwnerName(e.target.value)}
							onBlur={() => handleBlur("ownerName")}
							placeholder="Иванов Иван Иванович"
							className={`auth-input${touched.ownerName && !ownerName ? " error" : ""}`}
							disabled={loading}
							autoComplete="name"
						/>
					</div>
					<div className="auth-form-group">
						<label className="auth-label">
							<Mail size={12} className="auth-icon-inline" /> Email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							onBlur={() => handleBlur("email")}
							placeholder="admin@clinic.com"
							className={`auth-input${touched.email && !email ? " error" : ""}`}
							disabled={loading}
							autoComplete="email"
						/>
					</div>
					<div className="auth-form-group">
						<label className="auth-label">
							<KeyRound size={12} className="auth-icon-inline" /> Пароль
						</label>
						<div className="auth-input-wrapper">
							<input
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								onBlur={() => handleBlur("password")}
								placeholder="Не менее 8 символов"
								className={`auth-input auth-input--with-icon${touched.password && password.length < 8 ? " error" : ""}`}
								disabled={loading}
								autoComplete="new-password"
							/>
							<button
								type="button"
								className="auth-input-icon-btn"
								onClick={() => setShowPassword((v) => !v)}
								tabIndex={-1}
							>
								{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
						{password && (
							<div className="auth-password-strength">
								{[1, 2, 3].map((i) => (
									<div
										key={i}
										className={`auth-password-strength-bar${strength.score >= i ? " " + strengthClass : ""}`}
									/>
								))}
								<span className="auth-password-strength-label">
									{strengthLabel}
								</span>
							</div>
						)}
					</div>
					<div className="auth-form-group">
						<label className="auth-label">
							<KeyRound size={12} className="auth-icon-inline" /> Подтвердите
							пароль
						</label>
						<div className="auth-input-wrapper">
							<input
								type={showConfirm ? "text" : "password"}
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								onBlur={() => handleBlur("confirmPassword")}
								placeholder="Повторите пароль"
								className={`auth-input auth-input--with-icon${passwordMismatch ? " error" : ""}`}
								disabled={loading}
								autoComplete="new-password"
							/>
							<button
								type="button"
								className="auth-input-icon-btn"
								onClick={() => setShowConfirm((v) => !v)}
								tabIndex={-1}
							>
								{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
						{passwordMismatch && (
							<p className="auth-field-error">Пароли не совпадают</p>
						)}
					</div>

					<button type="submit" disabled={loading} className="auth-submit-btn">
						{loading ? (
							<div className="auth-spinner"></div>
						) : (
							<>
								Зарегистрировать клинику <ArrowRight size={16} />
							</>
						)}
					</button>
				</form>

				<div className="auth-footer-hints auth-footer-hints--border">
					<p>
						Уже есть аккаунт?{" "}
						<button
							type="button"
							onClick={onSwitchToLogin}
							className="auth-link-btn"
						>
							Войти
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
