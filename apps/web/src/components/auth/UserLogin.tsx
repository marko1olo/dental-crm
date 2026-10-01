import {
	ArrowRight,
	Building2,
	Eye,
	EyeOff,
	KeyRound,
	Mail,
	Phone,
	Shield,
	Sparkles,
	UserCheck,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
	DEMO_SHOWCASE_ORG_ID,
	enableDemoShowcaseMode,
	isDemoShowcaseMode,
} from "../../lib/demoMode";
import { cacheActiveStaffUser } from "../../lib/offlineStorage";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";
import {
	detectIdentityType,
	getLiveTimeOfDayGreeting,
	getQuickResumeData,
	type IdentityType,
	type QuickResumeData,
} from "./authSmartIdentity";

interface UserLoginProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onSwitchToRegister: () => void;
	onSwitchToClinicMode?: () => void;
	onSwitchToDemoTour?: () => void;
}

export function UserLogin({
	onSuccess,
	onSwitchToRegister,
	onSwitchToClinicMode,
	onSwitchToDemoTour,
}: UserLoginProps) {
	const [identity, setIdentity] = useState(() =>
		isDemoShowcaseMode() ? "doctor@clinic.com" : "",
	);
	const [password, setPassword] = useState(() =>
		isDemoShowcaseMode() ? "dente2026" : "",
	);
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [isOnline, setIsOnline] = useState(() =>
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [quickResume, setQuickResume] = useState<QuickResumeData>(() =>
		getQuickResumeData(),
	);

	const detectedType: IdentityType = useMemo(
		() => detectIdentityType(identity),
		[identity],
	);
	const { greeting } = useMemo(() => getLiveTimeOfDayGreeting(), []);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	useEffect(() => {
		setQuickResume(getQuickResumeData());
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedIdentity = identity.trim();

		if (!trimmedIdentity || !password) {
			showToast("Введите Email, телефон или ID клиники и пароль", "warning");
			return;
		}

		if (password.length < 6) {
			showToast("Пароль должен содержать не менее 6 символов", "warning");
			return;
		}

		setLoading(true);
		try {
			// Умный маршрут: если определен формат ID клиники
			if (detectedType === "clinic_id") {
				const response = await fetch("/api/auth/clinic/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: trimmedIdentity, password }),
				});

				const data = await response.json();
				if (response.ok) {
					safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
					showToast("Вход в рабочее пространство клиники выполнен", "success");
					onSuccess(data.clinicProfile, null);
					return;
				}
				throw new Error(data.message || "Ошибка входа клиники");
			}

			// Для Email или Телефона: пробуем персональный логин сотрудника / врача
			let staffRes = await fetch("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: trimmedIdentity, password }),
			});

			// Если логин сотрудника не удался, пробуем войти как клиника
			if (!staffRes.ok) {
				const clinicRes = await fetch("/api/auth/clinic/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email: trimmedIdentity, password }),
				});

				if (clinicRes.ok) {
					const data = await clinicRes.json();
					safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
					showToast("Вход в кабинет клиники выполнен", "success");
					onSuccess(data.clinicProfile, null);
					return;
				}

				const errData = await staffRes.json().catch(() => ({}));
				throw new Error(errData.message || "Неверный логин или пароль");
			}

			const data = await staffRes.json();
			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
			cacheActiveStaffUser(data.user);
			showToast(`Добро пожаловать, ${data.user?.fullName || "доктор"}!`, "success");
			onSuccess(
				{ organizationId: data.user?.organizationId ?? data.organizationId },
				data.user,
			);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			if (!navigator.onLine || err.message?.includes("Failed to fetch")) {
				showToast("Сервер офлайн. Для работы без сети активируйте Демо-тур.", "warning");
			} else {
				showToast(err.message || "Ошибка авторизации", "error");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleQuickResumeLogin = () => {
		if (!quickResume.rawUser) return;
		enableDemoShowcaseMode();
		safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "dente-resumed-clinic-token");
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, "dente-resumed-staff-token");
		showToast(`Сессия возобновлена: ${quickResume.fullName}`, "success");
		onSuccess(
			{ organizationId: DEMO_SHOWCASE_ORG_ID, name: quickResume.clinicName || "DENTE Clinic" },
			quickResume.rawUser,
		);
	};

	const renderIdentityIcon = () => {
		switch (detectedType) {
			case "phone":
				return <Phone size={15} className="auth-icon-inline" />;
			case "clinic_id":
				return <Building2 size={15} className="auth-icon-inline" />;
			default:
				return <Mail size={15} className="auth-icon-inline" />;
		}
	};

	const getIdentityPlaceholder = () => {
		switch (detectedType) {
			case "phone":
				return "+7 (999) 000-00-00";
			case "clinic_id":
				return "ID клиники или код филиала";
			default:
				return "doctor@clinic.com, +7... или ID клиники";
		}
	};

	const getIdentityHint = () => {
		switch (detectedType) {
			case "phone":
				return "Телефон";
			case "clinic_id":
				return "ID клиники";
			default:
				return "Email / Телефон / ID";
		}
	};

	return (
		<div className="auth-view-content animate-fade-in-up">
			{/* Top Telemetry & Greeting Bar */}
			<div className="auth-telemetry-bar">
				<span
					className={`auth-status-chip ${isOnline ? "auth-status-chip--online" : "auth-status-chip--offline"}`}
				>
					<span className="auth-status-dot" />
					{isOnline ? "Сервер онлайн" : "Автономный локальный режим"}
				</span>
				<span className="auth-greeting-chip">{greeting}</span>
			</div>

			<div className="auth-header-center">
				<div className="auth-logo-box">
					<Shield size={34} />
				</div>
				<h2 className="auth-logo-title">DENTE</h2>
				<p className="auth-logo-subtitle">Универсальная стоматологическая платформа</p>
			</div>

			{/* Quick Resume Card if previous session exists */}
			{quickResume.hasResume && (
				<div className="auth-quick-resume-card">
					<div className="auth-quick-resume-left">
						<div className="auth-quick-resume-avatar">
							<UserCheck size={18} />
						</div>
						<div className="auth-quick-resume-meta">
							<div className="auth-quick-resume-label">Быстрый возврат:</div>
							<div className="auth-quick-resume-name">{quickResume.fullName}</div>
							<div className="auth-quick-resume-role">{quickResume.roleLabel}</div>
						</div>
					</div>
					<button
						type="button"
						onClick={handleQuickResumeLogin}
						className="auth-quick-resume-btn"
						title="Мгновенно продолжить работу под этим пользователем"
					>
						Войти в 1 клик <ArrowRight size={14} />
					</button>
				</div>
			)}

			<form onSubmit={handleSubmit} className="auth-form">
				{/* Smart Identity Input */}
				<div className="auth-form-group">
					<div className="auth-label-row">
						<label htmlFor="universal-login-identity" className="auth-label">
							{renderIdentityIcon()} Логин
						</label>
						<span className="auth-input-type-tag">{getIdentityHint()}</span>
					</div>
					<div className="auth-input-wrapper">
						<input
							id="universal-login-identity"
							type={detectedType === "phone" ? "tel" : "text"}
							value={identity}
							onChange={(e) => setIdentity(e.target.value)}
							placeholder={getIdentityPlaceholder()}
							className="auth-input"
							disabled={loading}
							autoComplete="username"
						/>
					</div>
				</div>

				{/* Password with clean Eye toggle and >= 6 validation */}
				<div className="auth-form-group">
					<div className="auth-label-row">
						<label htmlFor="universal-login-password" className="auth-label">
							<KeyRound size={15} className="auth-icon-inline" /> Пароль
						</label>
						<span className="auth-input-subhint">От 6 символов</span>
					</div>
					<div className="auth-input-wrapper">
						<input
							id="universal-login-password"
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
							Войти в систему <ArrowRight size={18} />
						</>
					)}
				</button>

				{/* Free Demo Tour Button (No Paywall, No Password) */}
				<button
					type="button"
					onClick={onSwitchToDemoTour}
					disabled={loading}
					className="auth-demo-btn"
				>
					<Sparkles size={16} /> Быстрый вход в Демо-тур (Без пароля)
				</button>
			</form>

			<div className="auth-footer-hints auth-footer-hints--border">
				<div className="auth-footer-links-row">
					<button
						type="button"
						onClick={onSwitchToRegister}
						className="auth-link-btn"
					>
						Регистрация клиники
					</button>
					<span className="auth-footer-dot">·</span>
					<button
						type="button"
						onClick={onSwitchToDemoTour}
						className="auth-link-btn"
					>
						Выбрать демо-роль
					</button>
					{onSwitchToClinicMode && (
						<>
							<span className="auth-footer-dot">·</span>
							<button
								type="button"
								onClick={onSwitchToClinicMode}
								className="auth-link-btn"
							>
								Режим клиники
							</button>
						</>
					)}
				</div>
				<div className="auth-footer-demo-hint">
					Демо-доступ: <code>doctor@clinic.com</code> / <code>dente2026</code>
				</div>
			</div>
		</div>
	);
}
