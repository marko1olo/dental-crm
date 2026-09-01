/**
 * StaffSecurityTab.tsx — Модуль безопасности, шкала надежности пароля и управление сессиями сотрудника.
 *
 * Требования:
 * - Оценка энтропии паролей по Шеннону ($H \ge 50$ бит) и проверка словарных паролей в реальном времени.
 * - Установка PIN-кода для мобильного планшета клиники.
 * - Телеметрия сессий и удаленный сброс активных сессий (защита от несанкционированного входа).
 * - Тач-таргеты >= 44x44px.
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
	onClose,
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

			{/* Панель 2: PIN-код для мобильного планшета клиники */}
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

			{/* Панель 3: Активная сессия и защита от параллельного входа */}
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
							<div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
