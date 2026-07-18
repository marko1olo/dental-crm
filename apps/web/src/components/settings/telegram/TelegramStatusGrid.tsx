import { Bot, ShieldCheck, RefreshCw, Users } from "lucide-react";

export function TelegramStatusGrid({
	telegramStatus,
	telegramModeLabels,
}: {
	telegramStatus: any;
	telegramModeLabels: Record<string, string>;
}) {
	const typedTelegramStatus = telegramStatus;

	return (
		<div className="telegram-status-grid">
			<article>
				<span>
					<Bot size={16} style={{ display: "inline", marginRight: "4px" }} /> Бот
				</span>
				<strong>
					{typedTelegramStatus?.botUsername
						? `@${typedTelegramStatus.botUsername.replace(/^@/, "")}`
						: "не указан"}
				</strong>
				<p>
					{typedTelegramStatus
						? telegramModeLabels[typedTelegramStatus.mode]
						: "статус не загружен"}
				</p>
			</article>
			<article>
				<span>
					<ShieldCheck
						size={16}
						style={{ display: "inline", marginRight: "4px" }}
					/>{" "}
					Бот клиники
				</span>
				<strong>
					{typedTelegramStatus?.tokenConfigured ? "подключен" : "не подключен"}
				</strong>
				<p>
					Секрет бота хранится в серверных настройках и не показывается в
					приложении.
				</p>
			</article>
			<article>
				<span>
					<RefreshCw
						size={16}
						style={{ display: "inline", marginRight: "4px" }}
					/>{" "}
					Прием сообщений
				</span>
				<strong>
					{typedTelegramStatus?.webhookReady ? "готов" : "проверить"}
				</strong>
				<p>
					{typedTelegramStatus?.webhookSecretConfigured
						? "защита входящих сообщений включена"
						: "нужно включить защиту входящих сообщений"}
				</p>
			</article>
			<article>
				<span>
					<Users size={16} style={{ display: "inline", marginRight: "4px" }} />{" "}
					Связки
				</span>
				<strong>{typedTelegramStatus?.activeChatLinkCount ?? 0}</strong>
				<p>
					{typedTelegramStatus?.pendingLinkCodeCount ?? 0} кодов ожидают
					подтверждения
				</p>
			</article>
		</div>
	);
}
