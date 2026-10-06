import React, { type ChangeEvent, type KeyboardEvent } from "react";
import { Bot, Lock, ShieldCheck } from "lucide-react";

type TextInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface TelegramConnectionHeaderSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: integration with legacy settings props bag
	props: any;
}

export function TelegramConnectionHeaderSection({
	props,
}: TelegramConnectionHeaderSectionProps) {
	const {
		telegramStatus,
		telegramModeLabels = {
			shared_dente_bot: "Общий бот DENTE",
			disabled: "Отключен",
			clinic_owned_bot: "Собственный бот клиники",
		},
		adminSecretScopeWarning,
		telegramAdminSecretDraft,
		setTelegramAdminSecretDraft,
		adminSecretReady,
		unlockTelegramAdminSession,
		lockTelegramAdminSession,
		telegramAdminSecretSession,
	} = props;

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const typedTelegramStatus = telegramStatus as any | null;

	return (
		<>
			<div className="import-copy">
				<Bot aria-hidden="true" />
				<div>
					<p className="eyebrow">Бот клиники</p>
					<h2>Telegram-связь без передачи медицинских данных</h2>
					<p>
						Код действует ограниченное время, хранится на сервере только как хэш
						и связывает чат с пациентом или сотрудником. Документы, снимки,
						диагнозы и налоговые декларации остаются в CRM и защищенном портале.
					</p>
				</div>
			</div>

			<div className="telegram-status-grid">
				<article>
					<span>Бот</span>
					<strong>
						{typedTelegramStatus?.botUsername
							? `@${typedTelegramStatus.botUsername.replace(/^@/, "")}`
							: "не указан"}
					</strong>
					<p>
						{typedTelegramStatus
							? (telegramModeLabels?.[typedTelegramStatus.mode] ??
								"статус не загружен")
							: "статус не загружен"}
					</p>
				</article>
				<article>
					<span>Бот клиники</span>
					<strong>
						{typedTelegramStatus?.tokenConfigured
							? "подключен"
							: "не подключен"}
					</strong>
					<p>
						API-токен бота хранится в серверных настройках и защищен от
						компрометации.
					</p>
				</article>
				<article>
					<span>Прием сообщений</span>
					<strong>
						{typedTelegramStatus?.webhookReady ? "готов" : "проверить"}
					</strong>
					<p>
						{typedTelegramStatus?.webhookSecretConfigured
							? "защита входящих сообщений включена"
							: "требуется включить защиту входящих сообщений"}
					</p>
				</article>
				<article>
					<span>Связки</span>
					<strong>{typedTelegramStatus?.activeChatLinkCount ?? 0}</strong>
					<p>
						{typedTelegramStatus?.pendingLinkCodeCount ?? 0} кодов ожидают
						подтверждения
					</p>
				</article>
			</div>

			<details className="settings-advanced-block settings-admin-secret-block">
				<summary className="settings-advanced-toggle">
					<span className="settings-advanced-label flex items-center gap-1.5">
						<Lock size={15} className="text-amber-500 shrink-0" />
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
						<label htmlFor="telegram-admin-secret-draft">
							Секрет администратора клиники для Telegram
							<input
								id="telegram-admin-secret-draft"
								type="password"
								autoComplete="current-password"
								value={telegramAdminSecretDraft}
								onChange={(event: TextInputChangeEvent) =>
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
									!adminSecretReady
										? "settings-admin-unlock-guidance"
										: undefined
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
		</>
	);
}
