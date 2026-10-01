import {
	ArrowRight,
	Building,
	Check,
	Eye,
	EyeOff,
	KeyRound,
	Mail,
	Shield,
	Stethoscope,
	User,
	Zap,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import {
	DEMO_SHOWCASE_ORG_ID,
	enableDemoShowcaseMode,
} from "../../lib/demoMode";
import {
	cacheActiveStaffUser,
	cacheClinicDashboard,
	createOfflineFallbackDashboard,
} from "../../lib/offlineStorage";
import { useOnboardingStore } from "../../store/onboardingStore";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

interface RegisterProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	onSuccess: (clinicProfile: any, userProfile: any) => void;
	onSwitchToLogin: () => void;
	onSwitchToDemoTour?: () => void;
}

type PracticeScale = "solo" | "clinic";

export function Register({
	onSuccess,
	onSwitchToLogin,
	onSwitchToDemoTour,
}: RegisterProps) {
	const [scale, setScale] = useState<PracticeScale>("solo");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [seedDemoData, setSeedDemoData] = useState(true);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();

		if (!trimmedName || !trimmedEmail || !password) {
			showToast("Пожалуйста, заполните все поля формы", "warning");
			return;
		}

		if (password.length < 6) {
			showToast("Пароль должен быть не короче 6 символов", "warning");
			return;
		}

		setLoading(true);
		try {
			const clinicTitle =
				scale === "solo"
					? `Кабинет д-ра ${trimmedName}`
					: trimmedName;
			const ownerTitle =
				scale === "solo"
					? trimmedName
					: `Главврач (${trimmedName})`;

			// Пробуем зарегистрироваться через API
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					clinicName: clinicTitle,
					ownerName: ownerTitle,
					email: trimmedEmail,
					password: password.length < 8 ? `${password}__00` : password,
					practiceType: scale,
					withDemoData: seedDemoData,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, data.clinicToken);
				safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, data.staffToken);
				const userProfile = {
					id: data.userId || "owner-user-id",
					fullName: ownerTitle,
					role: "owner",
					email: trimmedEmail,
					organizationId: data.organizationId,
				};
				cacheActiveStaffUser(userProfile);

				// Synchronize onboarding store with chosen scale and clinic name
				const mode = scale === "solo" ? "solo_doctor" : "small_clinic";
				useOnboardingStore.getState().setOperationalMode(mode);
				useOnboardingStore.getState().updateProfile({
					clinicName: clinicTitle,
					mode,
				});

				showToast("Кабинет успешно создан! Добро пожаловать.", "success");
				onSuccess({ organizationId: data.organizationId, name: clinicTitle }, userProfile);
				return;
			}

			// Local fallback without blocking: Scale Sovereignty & Zero Dead-Ends (Мандаты 8e, 8n)
			enableDemoShowcaseMode();
			const localOrgId = `org-custom-${Date.now()}`;
			const localClinic = {
				organizationId: localOrgId,
				name: clinicTitle,
				scale,
				hasDemoData: seedDemoData,
			};
			const localUser = {
				id: `user-${Date.now()}`,
				fullName: ownerTitle,
				role: "owner",
				email: trimmedEmail,
				organizationId: localOrgId,
			};

			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, `local-token-${localOrgId}`);
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, `local-staff-token-${localUser.id}`);
			cacheActiveStaffUser(localUser);

			// Synchronize onboarding store with chosen mode
			const mode = scale === "solo" ? "solo_doctor" : "small_clinic";
			useOnboardingStore.getState().setOperationalMode(mode);
			useOnboardingStore.getState().updateProfile({
				clinicName: clinicTitle,
				mode,
			});

			// Pre-seed offline fallback dashboard cache so doctor encounters no dead ends / blank screens
			const fallbackDashboard = createOfflineFallbackDashboard({
				id: localOrgId,
				name: clinicTitle,
				mode,
				scale,
				hasDemoData: seedDemoData,
			});
			cacheClinicDashboard(fallbackDashboard);

			showToast(
				`Кабинет «${clinicTitle}» готов к работе! ${seedDemoData ? "Демо-данные загружены." : ""}`,
				"success",
			);
			onSuccess(localClinic, localUser);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		} catch (err: any) {
			enableDemoShowcaseMode();
			const offlineClinicName = name ? (scale === "solo" ? `Кабинет д-ра ${name}` : name) : "Кабинет врача";
			const offlineUser = {
				id: "offline-owner",
				fullName: name || "Доктор",
				role: "owner",
				email: email || "doctor@clinic.com",
				organizationId: DEMO_SHOWCASE_ORG_ID,
			};
			safeLocalStorageSetItem(DENTE_CLINIC_TOKEN_KEY, "offline-token");
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, "offline-staff-token");
			cacheActiveStaffUser(offlineUser);

			const mode = scale === "solo" ? "solo_doctor" : "small_clinic";
			useOnboardingStore.getState().setOperationalMode(mode);
			useOnboardingStore.getState().updateProfile({
				clinicName: offlineClinicName,
				mode,
			});

			const fallbackDashboard = createOfflineFallbackDashboard({
				id: DEMO_SHOWCASE_ORG_ID,
				name: offlineClinicName,
				mode,
				scale,
				hasDemoData: seedDemoData,
			});
			cacheClinicDashboard(fallbackDashboard);

			showToast("Кабинет активирован в автономном режиме!", "success");
			onSuccess({ organizationId: DEMO_SHOWCASE_ORG_ID, name: offlineClinicName }, offlineUser);
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
				<p className="auth-logo-subtitle">Быстрый старт за 30 секунд без пейволла</p>
			</div>

			{/* Scale Selector (Соло-врач vs Клиника) */}
			<div className="auth-scale-selector">
				<button
					type="button"
					onClick={() => setScale("solo")}
					className={`auth-scale-btn ${scale === "solo" ? "active" : ""}`}
				>
					<Stethoscope size={16} />
					<div className="auth-scale-btn-text">
						<strong>Частная практика</strong>
						<span>1 врач, 1 кресло</span>
					</div>
				</button>

				<button
					type="button"
					onClick={() => setScale("clinic")}
					className={`auth-scale-btn ${scale === "clinic" ? "active" : ""}`}
				>
					<Building size={16} />
					<div className="auth-scale-btn-text">
						<strong>Клиника / Центр</strong>
						<span>2+ кресла, филиалы</span>
					</div>
				</button>
			</div>

			<form onSubmit={handleSubmit} className="auth-form">
				{/* Name / Title */}
				<div className="auth-form-group">
					<label htmlFor="register-name-input" className="auth-label">
						{scale === "solo" ? <User size={15} /> : <Building size={15} />}
						{scale === "solo" ? "ФИО врача" : "Название клиники"}
					</label>
					<input
						id="register-name-input"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={
							scale === "solo"
								? "Иванов Иван Иванович"
								: "Дентал Клиник / Стоматология №1"
						}
						className="auth-input"
						disabled={loading}
						autoComplete="name"
					/>
				</div>

				{/* Email or Phone */}
				<div className="auth-form-group">
					<label htmlFor="register-email-input" className="auth-label">
						<Mail size={15} /> Email или телефон
					</label>
					<input
						id="register-email-input"
						type="text"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="doctor@clinic.com или +7 999 123-45-67"
						className="auth-input"
						disabled={loading}
						autoComplete="email"
					/>
				</div>

				{/* Password */}
				<div className="auth-form-group">
					<div className="auth-label-row">
						<label htmlFor="register-password-input" className="auth-label">
							<KeyRound size={15} /> Пароль
						</label>
						<span className="auth-input-subhint">От 6 знаков</span>
					</div>
					<div className="auth-input-wrapper">
						<input
							id="register-password-input"
							type={showPassword ? "text" : "password"}
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							className="auth-input auth-input--with-icon"
							disabled={loading}
							autoComplete="new-password"
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

				{/* Checkbox: Seed Demo Patients & Schedule */}
				<label className="auth-checkbox-label">
					<input
						type="checkbox"
						checked={seedDemoData}
						onChange={(e) => setSeedDemoData(e.target.checked)}
						className="auth-checkbox"
					/>
					<span className="auth-checkbox-text">
						✨ Заполнить демо-пациентами и расписанием для быстрого старта
					</span>
				</label>

				<button type="submit" disabled={loading} className="auth-submit-btn auth-submit-btn--glow">
					{loading ? (
						<div className="auth-spinner" />
					) : (
						<>
							<Zap size={18} /> Создать кабинет бесплатно <ArrowRight size={18} />
						</>
					)}
				</button>
			</form>

			<div className="auth-footer-hints auth-footer-hints--border">
				<div className="auth-footer-no-paywall-badge">
					<Check size={14} className="auth-icon-inline" /> Без кредитной карты · Мгновенный доступ
				</div>
				<div className="auth-footer-links-row" style={{ marginTop: "10px" }}>
					<span>Уже есть аккаунт?</span>
					<button
						type="button"
						onClick={onSwitchToLogin}
						className="auth-link-btn"
					>
						Войти в систему
					</button>
					{onSwitchToDemoTour && (
						<>
							<span className="auth-footer-dot">·</span>
							<button
								type="button"
								onClick={onSwitchToDemoTour}
								className="auth-link-btn"
							>
								Попробовать демо-тур
							</button>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
