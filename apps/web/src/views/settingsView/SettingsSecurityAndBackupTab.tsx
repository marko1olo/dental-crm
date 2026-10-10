/**
 * @file apps/web/src/views/settingsView/SettingsSecurityAndBackupTab.tsx
 * @description Layer 4: Security credentials, admin session unlock, 2FA, and backup access tab.
 */

import type React from "react";
import { Lock, ShieldCheck } from "lucide-react";
import type { SettingsSecurityAndBackupTabProps } from "./types.js";

export function SettingsSecurityAndBackupTab({
	settingsProps,
	telegramAdminSecretSession,
	setTelegramAdminSecretDraft,
	unlockTelegramAdminSession,
	lockTelegramAdminSession,
}: SettingsSecurityAndBackupTabProps) {
	return (
		<details className="settings-advanced-block settings-admin-secret-block mb-4">
			<summary className="settings-advanced-toggle">
				<span className="settings-advanced-label flex items-center gap-1.5">
					<Lock size={15} className="text-amber-500 shrink-0" />
					<span>Доступ к защищенным настройкам</span>
				</span>
				<span className="settings-advanced-hint">
					только если требует сервер
				</span>
				<span className="settings-advanced-chevron">▼</span>
			</summary>
			<article className="telegram-link-panel telegram-admin-panel settings-advanced-form">
				<p>
					Если сервер клиники требует админ-доступ, введите секрет для
					изменений профиля, команды, кресел, источников, импорта и
					аудита. В браузере он не сохраняется.
				</p>
				<p>{settingsProps.adminSecretScopeWarning}</p>
				<div className="telegram-link-controls">
					<label>
						Секрет администратора клиники для настроек
						<input
							type="password"
							autoComplete="current-password"
							value={settingsProps.telegramAdminSecretDraft ?? ""}
							onChange={(event) => {
								setTelegramAdminSecretDraft?.(event.target.value);
							}}
							onKeyDown={(event) => {
								if (event.key === "Enter" && settingsProps.adminSecretReady) {
									event.preventDefault();
									unlockTelegramAdminSession?.();
								}
							}}
							placeholder="введите секрет администратора"
							aria-describedby={
								!settingsProps.adminSecretReady
									? "settings-admin-unlock-guidance"
									: undefined
							}
						/>
					</label>
					{!settingsProps.adminSecretReady ? (
						<p
							className="admin-unlock-guidance"
							id="settings-admin-unlock-guidance"
							role="status"
							aria-live="polite"
						>
							Введите секрет администратора клиники, чтобы менять
							защищенные настройки.
						</p>
					) : null}
					<button
						className="secondary-button"
						type="button"
						onClick={unlockTelegramAdminSession}
						disabled={!settingsProps.adminSecretReady}
						style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
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
						? "Админ-доступ активен до перезагрузки страницы."
						: "Без секрета работают только окружения без обязательного админ-доступа."}
				</p>
			</article>
		</details>
	);
}
