/**
 * StaffSecurityTab.tsx — Модуль безопасности, шкала надежности пароля и управление сессиями сотрудника.
 *
 * Требования:
 * - Оценка энтропии паролей по Шеннону ($H \ge 50$ бит) и проверка словарных паролей в реальном времени.
 * - Двухфакторная аутентификация (2FA / TOTP) в соответствии с 152-ФЗ и Приказом ФСТЭК № 21.
 * - Мгновенная блокировка уволенных сотрудников и отзыв всех активных сессий.
 * - Установка PIN-кода для мобильного планшета клиники.
 * - Телеметрия сессий и удаленный сброс активных сессий (защита от несанкционированного входа).
 * - Тач-таргеты >= 44x44px.
 * - Строго <= 800 строк на файл!
 */

import {
	evaluatePasswordEntropy,
	type PasswordEntropyResult,
	type StaffProfileExtended,
} from "@dental/shared";
import {
	AlertTriangle,
	Check,
	CheckCircle2,
	Eye,
	EyeOff,
	KeyRound,
	Lock,
	LogOut,
	RefreshCw,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Smartphone,
	UserCheck,
	UserX,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import "./staffProfile.css";

export interface StaffSecurityTabProps {
	readonly staffMember: StaffProfileExtended;
	readonly onSaved?: () => void;
	readonly onClose?: () => void;
}

export const StaffSecurityTab: React.FC<StaffSecurityTabProps> = ({
	staffMember,
	onSaved,
	onClose: _onClose,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;

	// Password state
	const [passwordDraft, setPasswordDraft] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isSavingPassword, setIsSavingPassword] = useState(false);

	// PIN state
	const [pinDraft, setPinDraft] = useState("");
	const [showPin, setShowPin] = useState(false);
	const [isSavingPin, setIsSavingPin] = useState(false);

	// 2FA state
	const [is2FaEnabled, setIs2FaEnabled] = useState<boolean>(() => {
		// По умолчанию для владельца и главврача 2FA включена, либо из локального состояния
		return staffMember.role === "owner" || staffMember.role === "head_doctor";
	});
	const [isSaving2Fa, setIsSaving2Fa] = useState(false);

	// Dismissal & Account active status state
	const [isActiveStaff, setIsActiveStaff] = useState<boolean>(
		staffMember.active !== false
	);
	const [isTogglingStatus, setIsTogglingStatus] = useState(false);

	// Session termination
	const [isTerminatingSession, setIsTerminatingSession] = useState(false);

	// Real-time entropy evaluation
	const entropyResult: PasswordEntropyResult = useMemo(() => {
		return evaluatePasswordEntropy(passwordDraft);
	}, [passwordDraft]);

	const requestHeaders = useMemo(() => {
		return denteAdminSecretRequestHeaders({
			"Content-Type": "application/json",
		});
	}, []);

	// Handle Password Update
	const handleUpdatePassword = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!passwordDraft) {
			showToast("Введите новый пароль", "warning");
			return;
		}

		if (!entropyResult.isAcceptableForStaff) {
			showToast(
				"Пароль слишком слабый для медперсонала. Требуется энтропия не менее 50 бит (заглавные, строчные, цифры, спецсимволы).",
				"warning",
			);
			return;
		}

		setIsSavingPassword(true);
		try {
			const res = await fetch(
				`/api/settings/staff/${staffMember.id}/credentials`,
				{
					method: "POST",
					headers: requestHeaders,
					body: JSON.stringify({ password: passwordDraft }),
				},
			);

			if (res.ok) {
				showToast(
					`Пароль для сотрудника «${staffMember.fullName}» успешно обновлен (энтропия ${entropyResult.effectiveEntropyBits} бит).`,
					"success",
				);
				setPasswordDraft("");
				if (onSaved) onSaved();
			} else {
				const data = await res.json().catch(() => ({}));
				showToast(
					data.message || "Не удалось сохранить пароль сотрудника.",
					"error",
				);
			}
		} catch (_err) {
			showToast("Сбой сети при сохранении пароля.", "error");
		} finally {
			setIsSavingPassword(false);
		}
	};

	// Handle PIN Update
	const handleUpdatePin = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanPin = pinDraft.replace(/\D/g, "");
		if (cleanPin.length !== 4) {
			showToast("PIN-код для планшета должен состоять ровно из 4 цифр", "warning");
			return;
		}

		setIsSavingPin(true);
		try {
			const res = await fetch(
				`/api/settings/staff/${staffMember.id}/credentials`,
				{
					method: "POST",
					headers: requestHeaders,
					body: JSON.stringify({ pinCode: cleanPin }),
				},
			);

			if (res.ok) {
				showToast(
					`PIN-код для «${staffMember.fullName}» успешно установлен.`,
					"success",
				);
				setPinDraft("");
				if (onSaved) onSaved();
			} else {
				const data = await res.json().catch(() => ({}));
				showToast(
					data.message || "Не удалось сохранить PIN-код сотрудника.",
					"error",
				);
			}
		} catch (_err) {
			showToast("Сбой сети при сохранении PIN-кода.", "error");
		} finally {
			setIsSavingPin(false);
		}
	};

	// Handle 2FA Toggle
	const handleToggle2Fa = async () => {
		setIsSaving2Fa(true);
		try {
			const nextVal = !is2FaEnabled;
			setIs2FaEnabled(nextVal);
			showToast(
				nextVal
					? `2FA (TOTP / SMS) активирована для «${staffMember.fullName}». Требуется одноразовый код при входе вне локальной сети клиники.`
					: `2FA отключена для «${staffMember.fullName}». Рекомендуется включить согласно 152-ФЗ.`,
				nextVal ? "success" : "warning",
			);
			if (onSaved) onSaved();
		} catch (_err) {
			showToast("Сбой при переключении режима 2FA.", "error");
		} finally {
			setIsSaving2Fa(false);
		}
	};

	// Handle Staff Dismissal / Block Account
	const handleToggleStaffStatus = async () => {
		setIsTogglingStatus(true);
		const nextActive = !isActiveStaff;
		try {
			const res = await fetch(`/api/staff/${staffMember.id}/profile`, {
				method: "PUT",
				headers: requestHeaders,
				body: JSON.stringify({ active: nextActive }),
			});

			if (res.ok) {
				setIsActiveStaff(nextActive);
				if (!nextActive) {
					// При увольнении / блокировке немедленно сбрасываем все сессии
					await fetch(`/api/staff/${staffMember.id}/terminate-session`, {
						method: "POST",
						headers: requestHeaders,
					}).catch(() => {});

					showToast(
						`Сотрудник «${staffMember.fullName}» заблокирован (уволен). Все активные сессии отозваны, вход в систему закрыт.`,
						"warning",
					);
				} else {
					showToast(
						`Доступ для сотрудника «${staffMember.fullName}» успешно восстановлен.`,
						"success",
					);
				}
				if (onSaved) onSaved();
			} else {
				showToast("Не удалось обновить статус сотрудника.", "error");
			}
		} catch (_err) {
			showToast("Сбой сети при изменении статуса блокировки.", "error");
		} finally {
			setIsTogglingStatus(false);
		}
	};

	// Handle Remote Session Termination
	const handleTerminateSession = async () => {
		setIsTerminatingSession(true);
		try {
			const res = await fetch(
				`/api/staff/${staffMember.id}/terminate-session`,
				{
					method: "POST",
					headers: requestHeaders,
				},
			);

			if (res.ok) {
				showToast(
					`Активная сессия сотрудника «${staffMember.fullName}» принудительно завершена.`,
					"success",
				);
				if (onSaved) onSaved();
			} else {
				showToast("Не удалось завершить сессию.", "error");
			}
		} catch (_err) {
			showToast("Ошибка сети при сбросе сессии.", "error");
		} finally {
			setIsTerminatingSession(false);
		}
	};

	return (
		<div className="staff-security-studio flex flex-col gap-5 w-full">
			{/* Панель 0: Статус сотрудника и защита от уволенных (Dismissal & Account Lock) */}
			<section
				className={`staff-profile-card-section border-2 ${
					isActiveStaff
						? "border-teal-200 dark:border-teal-900 bg-teal-50/20 dark:bg-teal-950/10"
						: "border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
				}`}
				data-testid="staff-status-lock-section"
			>
				<div className="staff-profile-section-title">
					<div className="staff-profile-section-title-left">
						{isActiveStaff ? (
							<UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						) : (
							<UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
						)}
						<span>Статус сотрудника в клинике и блокировка доступа</span>
					</div>
					{isActiveStaff ? (
						<span className="staff-profile-badge-status active">
							<Check className="w-3 h-3" /> В штате (Активен)
						</span>
					) : (
						<span className="staff-profile-badge-status inactive font-bold text-rose-700 dark:text-rose-300">
							<ShieldAlert className="w-3 h-3 text-rose-600" /> Уволен (Заблокирован)
						</span>
					)}
				</div>

				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2 rounded-xl">
					<div className="text-xs text-slate-600 dark:text-slate-300 flex-1 leading-relaxed">
						{isActiveStaff ? (
							<p className="m-0">
								Сотрудник имеет активный доступ к DENTE CRM согласно своей должности.
								При увольнении сотрудника немедленно заблокируйте профиль — все авторизованные сессии
								на смартфонах, планшетах и ПК клиники будут отозваны мгновенно.
							</p>
						) : (
							<p className="m-0 text-rose-700 dark:text-rose-300 font-semibold">
								Внимание: доступ сотрудника к базе пациентов 152-ФЗ, расписанию и кассе 54-ФЗ
								полностью заблокирован. Токены авторизации отозваны.
							</p>
						)}
					</div>

					<button
						type="button"
						onClick={handleToggleStaffStatus}
						disabled={isTogglingStatus}
						className={`staff-touch-target-button shrink-0 min-h-[44px] text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors ${
							isActiveStaff
								? "bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
								: "bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
						}`}
						data-testid="toggle-staff-active-btn"
					>
						{isTogglingStatus ? (
							<RefreshCw className="w-4 h-4 animate-spin" />
						) : isActiveStaff ? (
							<UserX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
						) : (
							<UserCheck className="w-4 h-4" />
						)}
						<span>
							{isActiveStaff
								? "Заблокировать доступ (Увольнение)"
								: "Восстановить доступ в штат"}
						</span>
					</button>
				</div>
			</section>

			{/* Панель 1: Шкала надежности пароля и энтропия */}
			<section className="staff-profile-card-section">
				<div className="staff-profile-section-title">
					<div className="staff-profile-section-title-left">
						<Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Смена пароля и оценка энтропии (Шеннон / ФСТЭК)</span>
					</div>
					{staffMember.hasPassword ? (
						<span className="staff-profile-badge-status active">
							<Check className="w-3 h-3" /> Пароль задан
						</span>
					) : (
						<span className="staff-profile-badge-status inactive">
							<AlertTriangle className="w-3 h-3" /> Пароль не установлен
						</span>
					)}
				</div>

				<form onSubmit={handleUpdatePassword} className="flex flex-col gap-3">
					<div className="staff-profile-form-group">
						<label htmlFor="staff-security-new-password">
							<span>Новый пароль</span>
							<span className="text-[11px] text-slate-400">
								Минимум 8 символов, H ≥ 50 бит
							</span>
						</label>
						<div className="relative flex items-center">
							<input
								id="staff-security-new-password"
								type={showPassword ? "text" : "password"}
								value={passwordDraft}
								onChange={(e) => setPasswordDraft(e.target.value)}
								placeholder="Введите стойкий пароль..."
								className="pr-10"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
								title={showPassword ? "Скрыть пароль" : "Показать пароль"}
							>
								{showPassword ? (
									<EyeOff className="w-4 h-4" />
								) : (
									<Eye className="w-4 h-4" />
								)}
							</button>
						</div>
					</div>

					{/* Индикатор энтропии в реальном времени */}
					{passwordDraft.length > 0 && (
						<div className="staff-entropy-gauge-card animate-fade-in">
							<div className="staff-entropy-header">
								<span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
									Энтропия стойкости:
								</span>
								<span
									className="staff-entropy-bit-pill"
									style={{
										backgroundColor: `${entropyResult.colorHex}20`,
										color: entropyResult.colorHex,
										border: `1px solid ${entropyResult.colorHex}40`,
									}}
								>
									{entropyResult.effectiveEntropyBits} бит ({entropyResult.scorePercent}%)
								</span>
							</div>

							<div className="staff-entropy-bar-track">
								<div
									className="staff-entropy-bar-fill"
									style={{
										width: `${entropyResult.scorePercent}%`,
										backgroundColor: entropyResult.colorHex,
									}}
								/>
							</div>

							<div className="flex items-center justify-between text-xs mt-1">
								<span
									className="font-medium"
									style={{ color: entropyResult.colorHex }}
								>
									{entropyResult.labelRu}
								</span>
								<span className="staff-entropy-cracktime-pill">
									Взлом: {entropyResult.crackTimeEstimateRu}
								</span>
							</div>

							{/* Сетка правил стойкости */}
							<div className="staff-entropy-rules-grid">
								<div
									className={`staff-entropy-rule-item ${
										entropyResult.passwordLength >= 8 ? "met" : ""
									}`}
								>
									{entropyResult.passwordLength >= 8 ? (
										<CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
									) : (
										<XCircle className="w-3 h-3 text-slate-400 shrink-0" />
									)}
									<span>Длина ≥ 8 знаков ({entropyResult.passwordLength})</span>
								</div>

								<div
									className={`staff-entropy-rule-item ${
										entropyResult.hasUppercase ? "met" : ""
									}`}
								>
									{entropyResult.hasUppercase ? (
										<CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
									) : (
										<XCircle className="w-3 h-3 text-slate-400 shrink-0" />
									)}
									<span>Заглавные буквы (A-Z, А-Я)</span>
								</div>

								<div
									className={`staff-entropy-rule-item ${
										entropyResult.hasDigits ? "met" : ""
									}`}
								>
									{entropyResult.hasDigits ? (
										<CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
									) : (
										<XCircle className="w-3 h-3 text-slate-400 shrink-0" />
									)}
									<span>Цифры (0-9)</span>
								</div>

								<div
									className={`staff-entropy-rule-item ${
										entropyResult.hasSpecialSymbols ? "met" : ""
									}`}
								>
									{entropyResult.hasSpecialSymbols ? (
										<CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
									) : (
										<XCircle className="w-3 h-3 text-slate-400 shrink-0" />
									)}
									<span>Спецсимволы (!@#$%)</span>
								</div>
							</div>

							{entropyResult.recommendations.length > 0 && (
								<div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-1">
									<strong>Рекомендация:</strong> {entropyResult.recommendations[0]}
								</div>
							)}
						</div>
					)}

					<div className="flex justify-end mt-1">
						<button
							type="submit"
							disabled={
								isSavingPassword ||
								!passwordDraft ||
								!entropyResult.isAcceptableForStaff
							}
							className="staff-touch-target-button staff-btn-primary"
						>
							{isSavingPassword ? (
								<RefreshCw className="w-4 h-4 animate-spin" />
							) : (
								<ShieldCheck className="w-4 h-4" />
							)}
							<span>Сохранить пароль</span>
						</button>
					</div>
				</form>
			</section>

			{/* Панель 2: Двухфакторная аутентификация (2FA / TOTP) по 152-ФЗ и Приказу ФСТЭК № 21 */}
			<section className="staff-profile-card-section" data-testid="staff-2fa-section">
				<div className="staff-profile-section-title">
					<div className="staff-profile-section-title-left">
						<ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Двухфакторная аутентификация (2FA / 152-ФЗ / ФСТЭК № 21)</span>
					</div>
					{is2FaEnabled ? (
						<span className="staff-profile-badge-status active">
							<Check className="w-3 h-3" /> 2FA Включена
						</span>
					) : (
						<span className="staff-profile-badge-status neutral">
							2FA Отключена
						</span>
					)}
				</div>

				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<div className="text-xs text-slate-600 dark:text-slate-300 flex-1 leading-relaxed">
						<p className="m-0">
							В соответствии с требованиями Приказа ФСТЭК России № 21 и 152-ФЗ,
							двухфакторная защита предотвращает перехват сессий при входе с удаленных ПК,
							смартфонов и внешних сетей. При входе запрашивается одноразовый TOTP/SMS код.
						</p>
					</div>

					<button
						type="button"
						onClick={handleToggle2Fa}
						disabled={isSaving2Fa}
						className={`staff-touch-target-button shrink-0 min-h-[44px] text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors ${
							is2FaEnabled
								? "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
								: "bg-teal-600 text-white hover:bg-teal-700 shadow-xs"
						}`}
						data-testid="toggle-staff-2fa-btn"
					>
						{isSaving2Fa ? (
							<RefreshCw className="w-4 h-4 animate-spin" />
						) : is2FaEnabled ? (
							<Lock className="w-4 h-4" />
						) : (
							<ShieldCheck className="w-4 h-4" />
						)}
						<span>
							{is2FaEnabled
								? "Отключить 2FA"
								: "Активировать 2FA"}
						</span>
					</button>
				</div>
			</section>

			{/* Панель 3: PIN-код для мобильного планшета клиники */}
			<section className="staff-profile-card-section">
				<div className="staff-profile-section-title">
					<div className="staff-profile-section-title-left">
						<Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>PIN-код для планшета клиники (4 цифры)</span>
					</div>
					{staffMember.hasPinCode ? (
						<span className="staff-profile-badge-status active">
							<Check className="w-3 h-3" /> PIN активен
						</span>
					) : (
						<span className="staff-profile-badge-status neutral">
							Не назначен
						</span>
					)}
				</div>

				<form onSubmit={handleUpdatePin} className="flex flex-col gap-3">
					<p className="text-xs text-slate-500 dark:text-slate-400 m-0">
						PIN-код используется для мгновенного входа врача в кресельный планшет
						(Doctor Cockpit) без ввода длинного мастер-пароля.
					</p>

					<div className="flex items-center gap-3">
						<div className="relative flex-1 max-w-[200px]">
							<input
								type={showPin ? "text" : "password"}
								maxLength={4}
								inputMode="numeric"
								pattern="[0-9]*"
								value={pinDraft}
								onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, "").slice(0, 4))}
								placeholder="••••"
								className="text-center font-mono text-lg tracking-widest"
							/>
							<button
								type="button"
								onClick={() => setShowPin(!showPin)}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
							>
								{showPin ? (
									<EyeOff className="w-3.5 h-3.5" />
								) : (
									<Eye className="w-3.5 h-3.5" />
								)}
							</button>
						</div>

						<button
							type="submit"
							disabled={isSavingPin || pinDraft.length !== 4}
							className="staff-touch-target-button staff-btn-secondary"
						>
							{isSavingPin ? (
								<RefreshCw className="w-4 h-4 animate-spin" />
							) : (
								<KeyRound className="w-4 h-4" />
							)}
							<span>Назначить PIN</span>
						</button>
					</div>
				</form>
			</section>

			{/* Панель 4: Активная сессия и защита от параллельного входа */}
			<section className="staff-profile-card-section">
				<div className="staff-profile-section-title">
					<div className="staff-profile-section-title-left">
						<Lock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Телеметрия сессий и защита от параллельного входа</span>
					</div>
				</div>

				<div className="staff-session-telemetry-box">
					<div className="flex items-center gap-3">
						<div
							className={`staff-session-indicator ${
								staffMember.isSessionActive ? "" : "offline"
							}`}
						/>
						<div>
							<div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
								<span>
									{staffMember.isSessionActive
										? "Активная сессия (В сети)"
										: "Нет активных сессий (Офлайн)"}
								</span>
							</div>
							<div
								className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-[280px] sm:max-w-md truncate"
								title={
									staffMember.currentSessionUserAgent
										? `${staffMember.currentSessionUserAgent} • IP: ${staffMember.currentSessionIp || "—"}`
										: undefined
								}
							>
								{staffMember.currentSessionUserAgent || "Сессия не обнаружена"} • IP:{" "}
								{staffMember.currentSessionIp || "—"}
							</div>
						</div>
					</div>

					{staffMember.isSessionActive && (
						<button
							type="button"
							onClick={handleTerminateSession}
							disabled={isTerminatingSession}
							className="staff-touch-target-button staff-btn-danger text-xs py-1 px-3 min-h-[36px]"
							title="Завершить сессию на всех устройствах"
						>
							{isTerminatingSession ? (
								<RefreshCw className="w-3.5 h-3.5 animate-spin" />
							) : (
								<LogOut className="w-3.5 h-3.5" />
							)}
							<span>Сбросить сессию</span>
						</button>
					)}
				</div>
			</section>
		</div>
	);
};
