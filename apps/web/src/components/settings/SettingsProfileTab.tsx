import {
	AlertTriangle,
	Eye,
	EyeOff,
	KeyRound,
	ShieldCheck,
	User,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { actionFailureToast, panelStateText } from "../../lib/panelStateText";
import { readDenteStaffToken } from "../../lib/safeLocalStorage";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { settingsTabTitle } from "./settingsDeepLink";
import {
	parseStaffMutationPayload,
	staffRoleTitle,
} from "./settingsInviteRoles";
import {
	PROFILE_PANEL_SUBJECT,
	type ProfileLoadState,
	parseProfilePayload,
	passwordStrength,
	type StaffProfile,
} from "./settingsProfileLoad";
import { SettingsProfileYandexSection } from "./SettingsProfileYandexSection";

interface SettingsProfileTabProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	props: Record<string, any>;
}

export function SettingsProfileTab({ props }: SettingsProfileTabProps) {
	const appLogic = useAppLogicContext() as {
		soundNotificationsMuted?: boolean;
		setSoundNotificationsMuted?: (muted: boolean) => void;
		testOnlineBookingSound?: () => void;
		testSlotEndSound?: () => void;
	} | null;
	const [profile, setProfile] = useState<StaffProfile | null>(
		(props.activeStaffUser as StaffProfile | undefined) ?? null,
	);
	/*
	 * Читаем / прочитано / отказ / входа нет. Разбор того, почему четыре состояния
	 * вместо одного `profileLoading`, — в ./settingsProfileLoad.ts. Коротко: без
	 * токена сотрудника прежний эффект выходил, НЕ сняв признак загрузки, и вкладка
	 * показывала «Загрузка профиля...» до закрытия страницы.
	 */
	const [loadState, setLoadState] = useState<ProfileLoadState>({
		phase: profile ? "ready" : "loading",
	});

	const loadProfile = useCallback(async () => {
		const staffToken = readDenteStaffToken();
		if (!staffToken) {
			// Входа нет — единственный случай, когда «войдите заново» верный совет.
			setLoadState({ phase: "noSession" });
			return;
		}
		setLoadState({ phase: "loading" });
		try {
			const res = await fetch("/api/auth/user/me", {
				headers: { "x-dente-staff-token": staffToken },
			});
			/* Тело читается строкой: у res.json() на пустом ответе и на HTML от прокси
         исключение с английским текстом. */
			const outcome = parseProfilePayload(res.status, await res.text());
			if (!outcome.ok) {
				// Код ответа нужен разработчику, а не сотруднику: в консоль.
				logger.error("[мой профиль] не прочитан, ответ", outcome.status);
				setLoadState({ phase: "failed", status: outcome.status });
				return;
			}
			setProfile(outcome.profile);
			setLoadState({ phase: "ready" });
		} catch (err) {
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("[мой профиль] запрос не дошёл до сервера", err);
			setLoadState({ phase: "failed", status: null });
		}
	}, []);

	// Fetch fresh profile from server on mount
	useEffect(() => {
		void loadProfile();
	}, [loadProfile]);

	// Password change
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showOldPw, setShowOldPw] = useState(false);
	const [showNewPw, setShowNewPw] = useState(false);
	const [showConfirmPw, setShowConfirmPw] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);

	// PIN change
	const [oldPin, setOldPin] = useState("");
	const [newPin, setNewPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [pinLoading, setPinLoading] = useState(false);

	const strength = passwordStrength(newPassword);
	const _passwordMismatch = confirmPassword && newPassword !== confirmPassword;

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
					"x-dente-staff-token": readDenteStaffToken(),
				},
				body: JSON.stringify({ oldPassword, newPassword }),
			});
			/*
			 * Тело читается строкой и разбирается чистой функцией. БЫЛО: `await r.json()`
			 * ДО проверки `r.ok` — на пустом теле и на HTML от прокси он бросал
			 * исключение, и `showToast(err.message)` печатал «Unexpected token '<' … is
			 * not valid JSON»; при обрыве связи — «Failed to fetch». Сервер отвечает
			 * по-русски («Старый пароль неверен.»), его текст и показываем.
			 */
			const outcome = parseStaffMutationPayload(r.status, await r.text());
			if (!outcome.ok) {
				logger.error("[мой профиль] пароль не изменён, ответ", outcome.status);
				showToast(
					outcome.message ??
						actionFailureToast("Пароль не изменён", outcome.status),
					"error",
				);
				return;
			}
			showToast(
				"Пароль изменён. На других устройствах входите уже новым.",
				"success",
			);
			setOldPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			logger.error("[мой профиль] смена пароля не дошла до сервера", err);
			showToast(actionFailureToast("Пароль не изменён", null), "error");
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
					"x-dente-staff-token": readDenteStaffToken(),
				},
				body: JSON.stringify({ oldPin, newPin }),
			});
			const outcome = parseStaffMutationPayload(r.status, await r.text());
			if (!outcome.ok) {
				logger.error("[мой профиль] PIN не изменён, ответ", outcome.status);
				showToast(
					outcome.message ??
						actionFailureToast("PIN-код не изменён", outcome.status),
					"error",
				);
				return;
			}
			showToast(
				"PIN-код изменён. На планшете клиники входите уже новым.",
				"success",
			);
			setOldPin("");
			setNewPin("");
			setConfirmPin("");
		} catch (err) {
			logger.error("[мой профиль] смена PIN не дошла до сервера", err);
			showToast(actionFailureToast("PIN-код не изменён", null), "error");
		} finally {
			setPinLoading(false);
		}
	};

	if (loadState.phase === "loading" && !profile) {
		return (
			<div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
				<div className="animate-spin h-8 w-8 text-[var(--teal)] border-2 border-[var(--line)] border-t-[var(--teal)] rounded-full" />
				<p className="text-[var(--muted)] mt-3 text-sm font-medium">
					{panelStateText(PROFILE_PANEL_SUBJECT, { phase: "loading" }).title}
				</p>
			</div>
		);
	}

	/*
    ВХОДА НЕТ — ЭТО НЕ ТО ЖЕ, ЧТО ОТКАЗ СЕРВЕРА.

    Прежний единственный текст «Профиль не найден. Войдите через PIN или
    перезайдите в систему.» показывался в обоих случаях, то есть при сбое сервера
    или обрыве сети советовал выйти из программы, в которую человек потом может
    не войти. Совет войти остался ровно там, где он верен: токена сотрудника нет.
  */
	if (loadState.phase === "noSession" && !profile) {
		return (
			<div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
				<AlertTriangle
					size={32}
					className="text-amber-500"
					aria-hidden="true"
				/>
				<p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
					{PROFILE_PANEL_SUBJECT.emptyTitle}
				</p>
				<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
					{PROFILE_PANEL_SUBJECT.emptyHint}
				</p>
			</div>
		);
	}

	if (loadState.phase === "failed" && !profile) {
		return (
			<div className="settings-tab-pane p-6">
				<PanelLoadFailure
					subject={PROFILE_PANEL_SUBJECT}
					status={loadState.status}
					onRetry={() => void loadProfile()}
				/>
			</div>
		);
	}

	if (!profile) {
		return (
			<div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
				<AlertTriangle
					size={32}
					className="text-amber-500"
					aria-hidden="true"
				/>
				<p className="mt-2 text-sm font-medium" style={{ color: "var(--ink)" }}>
					{PROFILE_PANEL_SUBJECT.emptyTitle}
				</p>
				<p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
					{PROFILE_PANEL_SUBJECT.emptyHint}
				</p>
			</div>
		);
	}

	const _strengthClass = newPassword
		? strength.score === 1
			? "weak"
			: strength.score === 2
				? "medium"
				: "strong"
		: "";

	return (
		<div className="settings-tab-pane animate-fade-in-up max-w-4xl w-full">
			<div className="mb-6">
				<h2
					id="tabpanel-profile-title"
					className="text-lg md:text-xl font-bold text-[var(--ink)] tracking-tight m-0"
				>
					Мой профиль
				</h2>
				<p className="text-xs text-[var(--muted)] mt-1 m-0">
					Личные данные, пароль и PIN-код для входа в систему
				</p>
			</div>

			{loadState.phase === "failed" && (
				<div className="mb-6">
					<PanelLoadFailure
						subject={PROFILE_PANEL_SUBJECT}
						status={loadState.status}
						onRetry={() => void loadProfile()}
					/>
				</div>
			)}

			<div className="flex flex-col gap-6 w-full">
				{/* Personal data card */}
				<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs">
					<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
						<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
							<User size={18} aria-hidden="true" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)] m-0">
								Личные данные
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Основные сведения учетной записи сотрудника
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5 md:col-span-2">
							<label className="text-xs font-semibold text-[var(--muted)]">
								ФИО сотрудника
							</label>
							<input
								type="text"
								value={profile.fullName}
								disabled
								className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium focus:outline-none cursor-not-allowed opacity-90"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Электронная почта
							</label>
							<input
								type="email"
								value={profile.email || "Не указан"}
								disabled
								className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium focus:outline-none cursor-not-allowed opacity-90"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Роль в клинике
							</label>
							<input
								type="text"
								value={staffRoleTitle(profile.role)}
								disabled
								className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-medium focus:outline-none cursor-not-allowed opacity-90"
							/>
						</div>
					</div>

					<p className="mt-3.5 text-xs text-[var(--muted)] m-0">
						Изменить ФИО или почту может владелец клиники на вкладке «{settingsTabTitle("staff")}».
					</p>
				</section>

				{/* Password change card */}
				<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs">
					<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
						<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
							<KeyRound size={18} aria-hidden="true" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)] m-0">
								Смена пароля
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Пароль используется для входа в систему с личных устройств по email
							</p>
						</div>
					</div>

					<form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="flex flex-col gap-1.5 md:col-span-2">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Текущий пароль
							</label>
							<div className="relative">
								<input
									type={showOldPw ? "text" : "password"}
									value={oldPassword}
									onChange={(e) => setOldPassword(e.target.value)}
									placeholder="••••••••"
									disabled={passwordLoading}
									className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowOldPw((v) => !v)}
									className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								>
									{showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Новый пароль
							</label>
							<div className="relative">
								<input
									type={showNewPw ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Мин. 8 символов"
									disabled={passwordLoading}
									className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowNewPw((v) => !v)}
									aria-label={
										showNewPw ? "Скрыть новый пароль" : "Показать новый пароль"
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								>
									{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{newPassword && (
								<div className="flex gap-1.5 mt-1.5 items-center">
									{[1, 2, 3].map((level) => (
										<div
											key={`strength-bar-${level}`}
											className="h-1 flex-1 rounded-full transition-all"
											style={{
												background:
													strength.score >= level
														? strength.score === 1
															? "var(--danger,#ef4444)"
															: strength.score === 2
																? "var(--warn-500,#f59e0b)"
																: "var(--success,#10b981)"
														: "var(--line)",
											}}
										/>
									))}
									<span className="text-[10px] text-[var(--muted)] min-w-[50px] text-right">
										{strength.label}
									</span>
								</div>
							)}
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Подтвердите пароль
							</label>
							<div className="relative">
								<input
									type={showConfirmPw ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Повторите новый пароль"
									disabled={passwordLoading}
									className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm focus:outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPw((v) => !v)}
									aria-label={
										showConfirmPw
											? "Скрыть подтверждение пароля"
											: "Показать подтверждение пароля"
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
								>
									{showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</div>
						<div className="md:col-span-2 pt-2">
							<button
								type="submit"
								disabled={passwordLoading}
								className="px-4 py-2.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-[var(--on-teal)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
							>
								<KeyRound size={16} />
								{passwordLoading ? "Сохранение..." : "Обновить пароль"}
							</button>
						</div>
					</form>
				</section>

				{/* Yandex Calendar */}
				<SettingsProfileYandexSection profile={profile} />

				{/* PIN Security Block */}
				<section className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-xs">
					<div className="flex items-center gap-3 pb-3 border-b border-[var(--line)] mb-4">
						<div className="w-8 h-8 rounded-xl bg-[var(--teal-soft)] flex items-center justify-center text-[var(--teal-dark)]">
							<ShieldCheck size={18} aria-hidden="true" />
						</div>
						<div>
							<h3 className="text-sm font-bold text-[var(--ink)] m-0">
								Защитный PIN-код
							</h3>
							<p className="text-xs text-[var(--muted)] m-0">
								Для быстрого разблокирования экрана при отсутствии на рабочем месте
							</p>
						</div>
					</div>

					<form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleUpdatePin}>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Новый PIN (4 цифры)
							</label>
							<input
								type="password"
								value={newPin}
								onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-center text-lg font-bold tracking-[8px] focus:outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 transition-all"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-semibold text-[var(--muted)]">
								Подтвердите PIN
							</label>
							<input
								type="password"
								value={confirmPin}
								onChange={(e) =>
									setConfirmPin(e.target.value.replace(/\D/g, ""))
								}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className={`w-full px-3.5 py-2.5 rounded-xl border bg-[var(--paper)] text-[var(--ink)] text-center text-lg font-bold tracking-[8px] focus:outline-none focus:ring-2 transition-all ${
									confirmPin && newPin !== confirmPin
										? "border-red-500 text-red-500 focus:ring-red-500/20"
										: "border-[var(--line)] focus:border-[var(--teal)] focus:ring-[var(--teal)]/20"
								}`}
							/>
							{confirmPin && newPin !== confirmPin && (
								<span className="text-[11px] text-red-500 font-medium">
									PIN-коды не совпадают
								</span>
							)}
						</div>
						<div className="md:col-span-2 pt-2">
							<button
								type="submit"
								disabled={pinLoading}
								className="px-4 py-2.5 rounded-xl bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-[var(--on-teal)] text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
							>
								<ShieldCheck size={16} />
								{pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
