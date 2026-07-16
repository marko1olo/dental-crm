import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	AlertTriangle,
	Eye,
	EyeOff,
	KeyRound,
	Lock,
	ShieldCheck,
	User,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { useThemeStore } from "../../store/themeStore";
import { useUiStore } from "../../store/uiStore";
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
	const props = useAppLogicContext();
	const { staffRoleLabels } = props;

	const [profile, setProfile] = useState<UserProfile | null>(
		props.activeStaffUser ?? null,
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
			<div className="settings-tab-pane">
				<div className="settings-empty-state">
					<div className="spinner spinner--sm" />
					<p className="settings-empty-state__hint">Загрузка профиля...</p>
				</div>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="settings-tab-pane">
				<div className="settings-empty-state">
					<AlertTriangle size={32} className="settings-empty-state__error-icon" />
					<p className="settings-empty-state__error-text">
						Профиль не найден. Войдите через PIN или перезайдите в систему.
					</p>
				</div>
			</div>
		);
	}

	// Strength class for the password bar segments
	const strengthClass =
		newPassword
			? strength.score === 1
				? "weak"
				: strength.score === 2
					? "medium"
					: "strong"
			: "";

	return (
		<div className="settings-tab-pane animate-fade-in-up">
			<div className="settings-header">
				<h2 id="tabpanel-profile-title">Мой профиль</h2>
				<p>Личные данные, пароль и PIN-код для входа в систему.</p>
			</div>

			<div className="settings-profile-layout">
				{/* Personal data */}
				<section className="settings-section">
					<div className="settings-section-header">
						<User aria-hidden="true" size={20} />
						<h3>Личные данные</h3>
					</div>
					<div className="form-grid">
						<label className="form-span-2">
							ФИО
							<input type="text" value={profile.fullName} disabled />
						</label>
						<label className="form-span-1">
							Email
							<input
								type="email"
								value={profile.email || "Не указан"}
								disabled
							/>
						</label>
						<label className="form-span-1">
							Роль
							<input
								type="text"
								value={staffRoleLabels?.[profile.role] ?? profile.role}
								disabled
							/>
						</label>
					</div>
					<p className="form-hint settings-profile-hint">
						Изменить ФИО или Email может только владелец клиники в разделе
						«Клиника → Сотрудники».
					</p>
				</section>

				{/* Password */}
				<section className="settings-section">
					<div className="settings-section-header">
						<KeyRound aria-hidden="true" size={20} />
						<h3>Смена пароля</h3>
					</div>
					<p className="form-hint settings-section-hint">
						Пароль используется для входа в систему с личных устройств по email.
					</p>
					<form onSubmit={handleUpdatePassword} className="form-grid">
						<label className="form-span-2">
							Текущий пароль
							<div className="input-with-toggle">
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
									className="input-toggle-btn"
									aria-label={showOldPw ? "Скрыть пароль" : "Показать пароль"}
								>
									{showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</label>
						<label className="form-span-1">
							Новый пароль
							<div className="input-with-toggle">
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
									className="input-toggle-btn"
									aria-label={showNewPw ? "Скрыть пароль" : "Показать пароль"}
								>
									{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{newPassword && (
								<div className="password-strength">
									{[1, 2, 3].map((i) => (
										<div
											key={i}
											className={`password-strength__bar ${strength.score >= i ? `password-strength__bar--${strengthClass}` : ""}`}
										/>
									))}
									<span className="password-strength__label">
										{strength.label}
									</span>
								</div>
							)}
						</label>
						<label className="form-span-1">
							Подтвердите пароль
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								disabled={passwordLoading}
								className={passwordMismatch ? "input--error" : ""}
							/>
							{passwordMismatch && (
								<span className="input-error-hint">Пароли не совпадают</span>
							)}
						</label>
						<div className="form-actions form-span-2">
							<button
								className="primary-button"
								type="submit"
								disabled={passwordLoading}
							>
								<ShieldCheck size={15} />{" "}
								{passwordLoading ? "Сохранение..." : "Сохранить пароль"}
							</button>
						</div>
					</form>
				</section>

				{/* PIN */}
				<section className="settings-section">
					<div className="settings-section-header">
						<Lock aria-hidden="true" size={20} />
						<h3>Смена PIN-кода</h3>
					</div>
					<p className="form-hint settings-section-hint">
						PIN (4 цифры) используется для быстрого входа на общем компьютере
						клиники.
					</p>
					<form onSubmit={handleUpdatePin} className="form-grid">
						<label className="form-span-2">
							Текущий PIN
							<input
								type="password"
								value={oldPin}
								onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className="input--pin"
							/>
						</label>
						<label className="form-span-1">
							Новый PIN
							<input
								type="password"
								value={newPin}
								onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className="input--pin"
							/>
						</label>
						<label className="form-span-1">
							Подтверждение
							<input
								type="password"
								value={confirmPin}
								onChange={(e) =>
									setConfirmPin(e.target.value.replace(/\D/g, ""))
								}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className={`input--pin${confirmPin && newPin !== confirmPin ? " input--error" : ""}`}
							/>
							{confirmPin && newPin !== confirmPin && (
								<span className="input-error-hint">PIN-коды не совпадают</span>
							)}
						</label>
						<div className="form-actions form-span-2">
							<button
								className="primary-button"
								type="submit"
								disabled={pinLoading}
							>
								<ShieldCheck size={15} />{" "}
								{pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
							</button>
						</div>
					</form>
				</section>

				{/* Theme Settings */}
				<section className="settings-section">
					<div className="settings-section-header">
						<Eye aria-hidden="true" size={20} />
						<h3>Внешний вид</h3>
					</div>
					<p className="form-hint settings-section-hint">
						Выберите тему оформления системы или включите автоматическое
						переключение от времени суток.
					</p>
					<div className="form-grid">
						<label className="form-span-1">
							Тема
							<select
								value={useThemeStore((s) => s.themeMode)}
								onChange={(e) =>
									useThemeStore
										.getState()
										.setThemeMode(e.target.value as "auto" | "light" | "dark")
								}
							>
								<option value="auto">Автоматически (по времени суток)</option>
								<option value="light">Светлая тема</option>
								<option value="dark">Тёмная тема</option>
							</select>
						</label>
						<label className="form-span-1">
							Размер интерфейса (Масштаб)
							<select
								value={useUiStore((s) => s.uiScale)}
								onChange={(e) =>
									useUiStore
										.getState()
										.setUiScale(e.target.value as "standard" | "large")
								}
							>
								<option value="standard">Стандартный (Компактный)</option>
								<option value="large">Крупный (Бабушкин UX)</option>
							</select>
						</label>
					</div>
				</section>
			</div>
		</div>
	);
}
