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
import { actionFailureToast, panelStateText } from "../../lib/panelStateText";
import { readDenteStaffToken } from "../../lib/safeLocalStorage";
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

interface SettingsProfileTabProps {
	props: Record<string, any>;
}

export function SettingsProfileTab({ props }: SettingsProfileTabProps) {
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
				console.error("[мой профиль] не прочитан, ответ", outcome.status);
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
			console.error("[мой профиль] запрос не дошёл до сервера", err);
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

	// Yandex Calendar
	const [yandexCalendarId, setYandexCalendarId] = useState("");
	const [yandexCalendarToken, setYandexCalendarToken] = useState("");
	const [yandexLoading, setYandexLoading] = useState(false);
	const [yandexSyncLoading, setYandexSyncLoading] = useState(false);

	useEffect(() => {
		if (profile) {
			setYandexCalendarId(profile.yandexCalendarId || "");
			setYandexCalendarToken(
				profile.yandexCalendarToken
					? JSON.stringify(profile.yandexCalendarToken)
					: "",
			);
		}
	}, [profile]);

	const handleUpdateYandexSettings = async (e: React.FormEvent) => {
		e.preventDefault();
		setYandexLoading(true);
		try {
			let parsedToken = null;
			if (yandexCalendarToken.trim()) {
				try {
					parsedToken = JSON.parse(yandexCalendarToken);
				} catch (_e) {
					showToast("Токен должен быть валидным JSON объектом", "warning");
					setYandexLoading(false);
					return;
				}
			}
			const r = await fetch("/api/integrations/yandex-calendar/settings", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken() ?? "",
				},
				body: JSON.stringify({
					yandexCalendarId: yandexCalendarId || null,
					yandexCalendarToken: parsedToken,
				}),
			});
			if (!r.ok) throw new Error("Settings update failed");
			showToast("Настройки Яндекс.Календаря сохранены", "success");
		} catch (err) {
			console.error("[Yandex] update failed", err);
			showToast("Ошибка сохранения настроек", "error");
		} finally {
			setYandexLoading(false);
		}
	};

	const handleSyncYandexCalendar = async () => {
		setYandexSyncLoading(true);
		try {
			const r = await fetch("/api/integrations/yandex-calendar/sync", {
				method: "POST",
				headers: {
					"x-dente-staff-token": readDenteStaffToken() ?? "",
				},
			});
			if (!r.ok) throw new Error("Sync failed");
			showToast("Синхронизация Яндекс.Календаря запущена", "success");
		} catch (err) {
			console.error("[Yandex] sync failed", err);
			showToast("Ошибка запуска синхронизации", "error");
		} finally {
			setYandexSyncLoading(false);
		}
	};

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
				console.error("[мой профиль] пароль не изменён, ответ", outcome.status);
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
			console.error("[мой профиль] смена пароля не дошла до сервера", err);
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
				console.error("[мой профиль] PIN не изменён, ответ", outcome.status);
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
			console.error("[мой профиль] смена PIN не дошла до сервера", err);
			showToast(actionFailureToast("PIN-код не изменён", null), "error");
		} finally {
			setPinLoading(false);
		}
	};

	if (loadState.phase === "loading" && !profile) {
		return (
			<div className="settings-tab-pane p-6 flex flex-col items-center justify-center text-center">
				<div className="animate-spin h-8 w-8 text-sky-500 border-2 border-slate-300 dark:border-slate-700 border-t-sky-500 rounded-full" />
				<p className="text-slate-500 dark:text-slate-400 mt-3 text-sm font-medium">
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
		<div className="settings-tab-pane animate-fade-in-up">
			<div className="settings-header">
				<h2 id="tabpanel-profile-title">Мой профиль</h2>
				<p>Личные данные, пароль и PIN-код для входа в систему.</p>
			</div>

			{/*
        Профиль показан из прежних данных, а свежие прочитать не удалось. Раньше
        этот случай проходил молча: на экране оставались возможно устаревшие ФИО и
        должность без единого признака, что чтение отказало.
      */}
			{loadState.phase === "failed" && (
				<div style={{ marginBottom: "1.25rem" }}>
					<PanelLoadFailure
						subject={PROFILE_PANEL_SUBJECT}
						status={loadState.status}
						onRetry={() => void loadProfile()}
					/>
				</div>
			)}

			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "2rem",
					maxWidth: "600px",
				}}
			>
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
							{/*
                БЫЛО: `staffRoleLabels?.[profile.role] ?? profile.role`. Без
                справочника подписей или при роли вне схемы (такие в базе есть —
                их создала форма приглашения, пока отправляла «admin») в поле
                «Роль» сотрудник видел латиницей имя роли из базы.
              */}
							<input
								type="text"
								value={staffRoleTitle(profile.role)}
								disabled
							/>
						</label>
					</div>
					{/*
            ДВЕ ПОЛОМКИ В ОДНОЙ СТРОКЕ.

            1. `color: "rgba(255,255,255,0.4)"` — белый текст, прибитый гвоздями в
               обход токенов темы. В светлой теме это белое по белому: подсказка,
               объясняющая, кто может изменить ФИО, была не видна вовсе. Тон берётся
               из --text-secondary, который задан во всех трёх темах (premium.css).
            2. Путь «Клиника → Сотрудники» указывал на вложенное место, которого
               нет: «Сотрудники» — отдельная вкладка настроек в группе «Основные», а
               не раздел внутри «Клиники». Название берётся из списка вкладок.
          */}
					<p
						className="form-hint"
						style={{
							marginTop: 10,
							fontSize: 12,
							color: "var(--text-secondary)",
						}}
					>
						Изменить ФИО или почту может владелец клиники на вкладке «
						{settingsTabTitle("staff")}» — она рядом, в этом же разделе
						настроек.
					</p>
				</section>

				{/* Password */}
				<section className="settings-section">
					<div className="settings-section-header">
						<KeyRound aria-hidden="true" size={20} />
						<h3>Смена пароля</h3>
					</div>
					{/* Тот же белый текст в обход токенов темы — в светлой теме не читался. */}
					<p
						className="form-hint"
						style={{
							marginBottom: 16,
							fontSize: 12,
							color: "var(--text-secondary)",
						}}
					>
						Пароль используется для входа в систему с личных устройств по email.
					</p>
					<form onSubmit={handleUpdatePassword} className="form-grid">
						<label className="form-span-2">
							Текущий пароль
							<div style={{ position: "relative" }}>
								<input
									type={showOldPw ? "text" : "password"}
									value={oldPassword}
									onChange={(e) => setOldPassword(e.target.value)}
									placeholder="••••••••"
									disabled={passwordLoading}
									className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowOldPw((v) => !v)}
									className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] cursor-pointer flex items-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
								>
									{showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</label>
						<label className="form-span-1">
							Новый пароль
							<div style={{ position: "relative" }}>
								<input
									type={showNewPw ? "text" : "password"}
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="Мин. 8 символов"
									disabled={passwordLoading}
									className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowNewPw((v) => !v)}
									aria-label={
										showNewPw ? "Скрыть новый пароль" : "Показать новый пароль"
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] cursor-pointer flex items-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
								>
									{showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
							{newPassword && (
								<div className="flex gap-1 mt-1.5 items-center">
									{[1, 2, 3].map((level) => (
										<div
											key={`strength-bar-${level}`}
											style={{
												height: 3,
												flex: 1,
												borderRadius: 2,
												background:
													strength.score >= level
														? strength.score === 1
															? "var(--danger,#ef4444)"
															: strength.score === 2
																? "var(--warn-500,#f59e0b)"
																: "var(--success,#10b981)"
														: "var(--line,rgba(255,255,255,0.08))",
												transition: "background 0.3s",
											}}
										/>
									))}
									<span className="text-[10px] text-[var(--muted,#94a3b8)] min-w-[45px] text-right">
										{strength.label}
									</span>
								</div>
							)}
						</label>
						<label className="form-span-1">
							Подтвердите пароль
							<div style={{ position: "relative" }}>
								<input
									type={showConfirmPw ? "text" : "password"}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Повторите новый пароль"
									disabled={passwordLoading}
									className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPw((v) => !v)}
									aria-label={
										showConfirmPw
											? "Скрыть подтверждение пароля"
											: "Показать подтверждение пароля"
									}
									className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] cursor-pointer flex items-center p-1 rounded focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]"
								>
									{showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
								</button>
							</div>
						</label>
						<div className="form-actions form-span-2">
							<button
								className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
								type="submit"
								disabled={passwordLoading}
							>
								<KeyRound size={15} />{" "}
								{passwordLoading ? "Сохранение..." : "Обновить пароль"}
							</button>
						</div>
					</form>
				</section>

				{/* Yandex Calendar */}
				<section className="settings-section">
					<div className="settings-section-header">
						<h3>Яндекс.Календарь</h3>
					</div>
					<p
						className="form-hint"
						style={{
							marginBottom: 16,
							fontSize: 12,
							color: "var(--text-secondary)",
						}}
					>
						Подключите свой Яндекс.Календарь для синхронизации расписания
						приёмов.
					</p>
					<form onSubmit={handleUpdateYandexSettings} className="form-grid">
						<label className="form-span-1">
							ID Календаря
							<input
								type="text"
								value={yandexCalendarId}
								onChange={(e) => setYandexCalendarId(e.target.value)}
								placeholder="Yandex Calendar ID"
								disabled={yandexLoading}
								className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
							/>
						</label>
						<label className="form-span-1">
							Токен (JSON)
							<input
								type="text"
								value={yandexCalendarToken}
								onChange={(e) => setYandexCalendarToken(e.target.value)}
								placeholder='{"access_token": "...", ...}'
								disabled={yandexLoading}
								className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all"
							/>
						</label>
						<div className="form-actions form-span-2 flex gap-4 flex-wrap">
							<button
								className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
								type="submit"
								disabled={yandexLoading}
							>
								{yandexLoading ? "Сохранение..." : "Сохранить настройки"}
							</button>
							<button
								type="button"
								className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
								onClick={handleSyncYandexCalendar}
								disabled={yandexSyncLoading || !yandexCalendarId}
							>
								{yandexSyncLoading ? "Запуск..." : "Запустить синхронизацию"}
							</button>
							<button
								type="button"
								className="secondary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
								onClick={() => {
									window.location.href =
										"/api/integrations/yandex-calendar/auth";
								}}
							>
								Подключить Яндекс.Календарь
							</button>
						</div>
					</form>
				</section>

				{/* PIN Security Block */}
				<section className="settings-section">
					<h3>Защитный PIN-код</h3>
					<p className="section-desc">
						Для быстрого разблокирования экрана при отсутствии на рабочем месте.
					</p>
					<form className="settings-form-grid" onSubmit={handleUpdatePin}>
						<label className="form-span-1">
							Новый PIN (4 цифры)
							<input
								type="password"
								value={newPin}
								onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className="focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all text-center tracking-[6px] text-lg"
							/>
						</label>
						<label className="form-span-1">
							Подтвердите PIN
							<input
								type="password"
								value={confirmPin}
								onChange={(e) =>
									setConfirmPin(e.target.value.replace(/\D/g, ""))
								}
								placeholder="••••"
								maxLength={4}
								disabled={pinLoading}
								className={`focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all text-center tracking-[6px] text-lg ${
									confirmPin && newPin !== confirmPin
										? "border-[var(--danger,#ef4444)] text-[var(--danger,#ef4444)]"
										: ""
								}`}
							/>
							{confirmPin && newPin !== confirmPin && (
								<span className="text-[10px] text-[var(--danger,#ef4444)] mt-1 block">
									PIN-коды не совпадают
								</span>
							)}
						</label>
						<div className="form-actions form-span-2">
							<button
								className="primary-button focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98]"
								type="submit"
								disabled={pinLoading}
							>
								<ShieldCheck size={15} />{" "}
								{pinLoading ? "Сохранение..." : "Сохранить PIN-код"}
							</button>
						</div>
					</form>
				</section>
			</div>
		</div>
	);
}
