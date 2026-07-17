import { AlertTriangle, Eye, EyeOff, KeyRound, Lock, ShieldCheck, User, Palette } from "lucide-react";
import "./SettingsProfileTab.css";
import type React from "react";
import { useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useThemeStore } from "../../store/themeStore";
import { useUiStore } from "../../store/uiStore";
import { useSettingsDerivations } from "../../useSettingsDerivations";
import { showToast } from "../GlobalToast";

interface UserProfile {
	id: string;
	fullName: string;
	role: string;
	email?: string | null;
	organizationId?: string;
}

interface SettingsProfileTabProps {
	props: Record<string, any>;
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

export function SettingsProfileTab() {
	const themeStore = useThemeStore();
	const uiStore = useUiStore();
	const appLogic = useAppLogicContext();
	const derivations = useSettingsDerivations();
	const mergedProps = Object.assign({}, appLogic, derivations) as any;
	const { staffRoleLabels } = mergedProps;

	const [profile, setProfile] = useState<UserProfile | null>(
		mergedProps.activeStaffUser ?? null,
	);
	const [profileLoading, setProfileLoading] = useState(!profile);

	// Fetch fresh profile from server on mount
	useEffect(() => {
		const staffToken = localStorage.getItem("dente_staff_token");
		if (!staffToken) return;
		setProfileLoading(true);
		fetch("/api/auth/user/me", {
			headers: { "x-dente-staff-token": staffToken },
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data?.user) setProfile(data.user);
			})
			.catch(() => {})
			.finally(() => setProfileLoading(false));
	}, []);

	// Password change
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showOldPw, setShowOldPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);

	// PIN change
	const [oldPin, setOldPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinLoading, setPinLoading] = useState(false);

	const strength = getPasswordStrength(newPassword);
	const passwordMismatch = confirmPassword && newPassword !== confirmPassword;

	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!oldPassword || !newPassword || !confirmPassword) {
			showToast("Заполните все поля", "warning");
			return;
		}
		if (newPassword !== confirmPassword) {
			showToast("Новые пароли не совпадают", "error");
			return;
		}
		if (newPassword.length < 8) {
			showToast("Пароль должен быть не менее 8 символов", "warning");
			return;
		}

		setPasswordLoading(true);
		try {
			const r = await fetch("/api/auth/user/update-password", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token":
						localStorage.getItem("dente_staff_token") || "",
				},
				body: JSON.stringify({ oldPassword, newPassword }),
			});
			const data = await r.json();
			if (!r.ok) throw new Error(data.message || "Ошибка смены пароля");
			showToast("Пароль успешно изменён", "success");
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setPasswordLoading(false);
		}
	};

	const handleUpdatePin = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!oldPin || !newPin || !confirmPin) {
			showToast("Заполните все поля PIN-кода", "warning");
			return;
		}
		if (newPin !== confirmPin) {
			showToast("PIN-коды не совпадают", "error");
			return;
		}
		if (!/^\d{4}$/.test(newPin)) {
			showToast("PIN-код — 4 цифры", "warning");
			return;
		}

		setPinLoading(true);
		try {
			const r = await fetch("/api/auth/user/update-pin", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token":
						localStorage.getItem("dente_staff_token") || "",
				},
				body: JSON.stringify({ oldPin, newPin }),
			});
			const data = await r.json();
			if (!r.ok) throw new Error(data.message || "Ошибка смены PIN");
			showToast("PIN-код успешно изменён", "success");
			setOldPin("");
			setNewPin("");
			setConfirmPin("");
		} catch (err: any) {
			showToast(err.message, "error");
		} finally {
			setPinLoading(false);
		}
	};

	if (profileLoading) {
		return (
		<div className="profile-studio-container animate-fade-in">
			<div className="import-copy" style={{ marginBottom: '0' }}>
				<User aria-hidden="true" />
				<div>
					<p className="eyebrow">Мой профиль</p>
					<h2 id="tabpanel-profile-title">Настройки аккаунта</h2>
					<p>Личные данные, пароль и PIN-код для входа в систему, а также предпочтения интерфейса.</p>
				</div>
			</div>

			<div className="profile-form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
				
				{/* Personal data */}
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="profile-section-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'rgb(59, 130, 246)' }}>
							<User size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Личные данные</h3>
							<p>Ваша базовая информация в системе клиники</p>
						</div>
					</div>
					
					<div className="profile-form-grid">
						<div className="profile-form-group full-width">
							<label>ФИО</label>
							<input type="text" value={profile?.fullName || ""} disabled />
						</div>
						<div className="profile-form-group">
							<label>Email</label>
							<input type="email" value={profile?.email || "Не указан"} disabled />
						</div>
						<div className="profile-form-group">
							<label>Роль в системе</label>
							<input type="text" value={profile?.role ? (staffRoleLabels?.[profile.role as "admin"|"doctor"|"assistant"|"manager"] ?? profile.role) : ""} disabled />
						</div>
					</div>
					<p className="profile-form-hint">
						Изменить ФИО или Email может только владелец клиники в разделе «Клиника → Персонал».
					</p>
				</section>

				{/* Password */}
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="profile-section-icon">
							<KeyRound size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Смена пароля</h3>
							<p>Пароль используется для входа в систему с личных устройств по email</p>
						</div>
					</div>
					
					<form onSubmit={handleUpdatePassword} className="profile-form-grid">
						<div className="profile-form-group full-width">
							<label>Текущий пароль</label>
							<div className="profile-input-with-toggle">
								<input
									type={showOldPw ? "text" : "password"}
									value={oldPassword}
									onChange={(e) => setOldPassword(e.target.value)}
									placeholder="••••••••"
									disabled={passwordLoading}
								/>
								<button
									type="button"
									onClick={() => setShowOldPw((v) => !v)}
									className="profile-input-toggle-btn"
									aria-label={showOldPw ? "Скрыть пароль" : "Показать пароль"}
								>
									{showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</div>
						
						<div className="profile-form-group">
							<label>Новый пароль</label>
							<div className="profile-input-with-toggle">
								<input
									type={showNewPw ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Мин. 8 символов"
									disabled={passwordLoading}
								/>
								<button
									type="button"
									onClick={() => setShowNewPw((v) => !v)}
									className="profile-input-toggle-btn"
									aria-label={showNewPw ? "Скрыть пароль" : "Показать пароль"}
								>
									{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{newPassword && (
								<div className="profile-password-strength">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className={`profile-password-bar ${strength.score >= i ? "" : ""}`}
										/>
									))}
									<span className="profile-password-label" style={{ color: false ? '#ef4444' : false ? '#f59e0b' : '#10b981' }}>
										{strength.label}
									</span>
								</div>
							)}
						</div>
						
						<div className="profile-form-group">
							<label>Подтвердите пароль</label>
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								disabled={passwordLoading}
								className={passwordMismatch ? "profile-input-error" : ""}
							/>
							{passwordMismatch && (
								<span className="profile-error-hint"><AlertTriangle size={12}/> Пароли не совпадают</span>
							)}
						</div>
						
						<div className="profile-form-group full-width" style={{ marginTop: '8px' }}>
							<button className="primary-button" type="submit" disabled={passwordLoading} style={{ alignSelf: 'flex-start' }}>
								<ShieldCheck size={16} style={{ marginRight: '8px' }} />
								{passwordLoading ? "Сохранение..." : "Сохранить новый пароль"}
							</button>
						</div>
					</form>
				</section>

				{/* PIN */}
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="profile-section-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'rgb(139, 92, 246)' }}>
							<Lock size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Смена PIN-кода</h3>
							<p>PIN (4 цифры) используется для быстрого входа на общих компьютерах клиники</p>
						</div>
					</div>
					
					<form onSubmit={handleUpdatePin} className="profile-form-grid">
						<div className="profile-form-group full-width">
							<label>Текущий PIN-код</label>
							<input
								type="password"
								value={oldPin}
								onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								style={{ letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}
							/>
						</div>
						
						<div className="profile-form-group">
							<label>Новый PIN-код</label>
							<input
								type="password"
								value={newPin}
								onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								style={{ letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}
							/>
						</div>
						
						<div className="profile-form-group">
							<label>Подтвердите PIN-код</label>
							<input
								type="password"
								value={confirmPin}
								onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className={confirmPin && newPin !== confirmPin ? "profile-input-error" : ""}
								style={{ letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace' }}
							/>
							{confirmPin && newPin !== confirmPin && (
								<span className="profile-error-hint"><AlertTriangle size={12}/> PIN-коды не совпадают</span>
							)}
						</div>
						
						<div className="profile-form-group full-width" style={{ marginTop: '8px' }}>
							<button className="primary-button" type="submit" disabled={pinLoading} style={{ alignSelf: 'flex-start' }}>
								<ShieldCheck size={16} style={{ marginRight: '8px' }} />
								{pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
							</button>
						</div>
					</form>
				</section>

				{/* Theme Settings */}
				<section className="profile-section-card">
					<div className="profile-section-header">
						<div className="profile-section-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'rgb(236, 72, 153)' }}>
							<Palette size={24} />
						</div>
						<div className="profile-section-title">
							<h3>Внешний вид и Масштаб</h3>
							<p>Настройки оформления интерфейса конкретно для вашего аккаунта</p>
						</div>
					</div>
					
					<div className="profile-form-grid">
						<div className="profile-form-group">
							<label>Цветовая тема</label>
							<select
								value={themeStore.themeMode}
								onChange={(e) =>
									useThemeStore.getState().setThemeMode(e.target.value as "auto" | "light" | "dark")
								}
							>
								<option value="auto">Автоматически (по системе)</option>
								<option value="light">Светлая тема</option>
								<option value="dark">Тёмная тема</option>
							</select>
						</div>
						
						<div className="profile-form-group">
							<label>Масштаб интерфейса</label>
							<select
								value={uiStore.uiScale}
								onChange={(e) =>
									useUiStore.getState().setUiScale(e.target.value as "standard" | "large")
								}
							>
								<option value="standard">Компактный (Стандарт)</option>
								<option value="large">Крупный (Для слабовидящих)</option>
							</select>
						</div>

						<div className="profile-form-group full-width">
							<label>Интерактивная зубная формула</label>
							<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
								<label className="switch">
									<input 
										type="checkbox" 
										checked={appLogic.odontogramUseSurfaces ?? false}
										onChange={(e) => {
											appLogic.setOdontogramUseSurfaces(e.target.checked);
											appLogic.updateUiPreferences({ odontogramUseSurfaces: e.target.checked });
										}} 
									/>
									<span className="slider round"></span>
								</label>
								<span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
									Включить выбор конкретных поверхностей зуба (O, M, D, V, L) при клике
								</span>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}

}