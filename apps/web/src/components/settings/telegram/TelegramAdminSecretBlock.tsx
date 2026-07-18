import { ShieldCheck } from "lucide-react";
import type { KeyboardEvent, ChangeEvent } from "react";

export function TelegramAdminSecretBlock({
	adminSecretScopeWarning,
	telegramAdminSecretDraft,
	setTelegramAdminSecretDraft,
	adminSecretReady,
	unlockTelegramAdminSession,
	lockTelegramAdminSession,
	telegramAdminSecretSession,
}: any) {
	return (
		<details className="settings-advanced-block settings-admin-secret-block">
			<summary className="settings-advanced-toggle">
				<span className="settings-advanced-label">
					<span className="settings-advanced-icon">🔐</span>
					Доступ к Telegram
				</span>
				<span className="settings-advanced-hint">
					только если требует сервер
				</span>
				<span className="settings-advanced-chevron">▼</span>
			</summary>
			<article className="telegram-link-panel telegram-admin-panel settings-advanced-form">
				<p>
					Если Telegram-панель защищена на сервере клиники, введите секрет
					администратора для управления ботом, кодами и отправками. В браузере
					он не сохраняется.
				</p>
				<p>{adminSecretScopeWarning}</p>
				<div className="telegram-link-controls">
					<label>
						Секрет администратора клиники для Telegram
						<input
							type="password"
							autoComplete="current-password"
							value={telegramAdminSecretDraft}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								setTelegramAdminSecretDraft(event.target.value)
							}
							onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
								if (event.key === "Enter" && adminSecretReady) {
									event.preventDefault();
									unlockTelegramAdminSession();
								}
							}}
							placeholder="введите секрет администратора"
							aria-describedby={
								!adminSecretReady ? "settings-admin-unlock-guidance" : undefined
							}
						/>
					</label>
					{!adminSecretReady ? (
						<p
							className="admin-unlock-guidance"
							id="settings-admin-unlock-guidance"
							role="status"
							aria-live="polite"
						>
							Введите секрет администратора клиники, чтобы менять
							Telegram-настройки и отправки.
						</p>
					) : null}
					<button
						className="secondary-button"
						type="button"
						onClick={unlockTelegramAdminSession}
						aria-describedby={
							!adminSecretReady ? "settings-admin-unlock-guidance" : undefined
						}
						disabled={!adminSecretReady}
					>
						<ShieldCheck aria-hidden="true" /> Разблокировать
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={lockTelegramAdminSession}
						disabled={!telegramAdminSecretSession}
					>
						Забыть секрет
					</button>
				</div>
				<p>
					{telegramAdminSecretSession
						? "Админ-доступ к Telegram активен до перезагрузки страницы."
						: "Без секрета будут работать только окружения без обязательного админ-доступа."}
				</p>
			</article>
		</details>
	);
}
