import React, { useState } from "react";
import { Bell, Bot, Send, UserCheck } from "lucide-react";
import { BotConfigurationCard } from "./BotConfigurationCard";
import { DeliveryQueueMonitor } from "./DeliveryQueueMonitor";
import { NotificationTemplatesEditor } from "./NotificationTemplatesEditor";
import { StaffBindingCard } from "./StaffBindingCard";
import type {
	TelegramAccountStatus,
	TelegramBotStatus,
	TelegramMainTab,
} from "./types";

export interface TelegramHubViewProps {
	clinicId?: string;
	userId?: string;
	botStatus: TelegramBotStatus | null;
	isBotLoading: boolean;
	accountStatus: TelegramAccountStatus | null;
	isAccountLoading: boolean;
	loadBotStatus: () => Promise<void> | void;
	loadAccountStatus: () => Promise<void> | void;
	onBotStatusChange?: (status: unknown) => void;
}

export function TelegramHubView({
	clinicId,
	userId,
	botStatus,
	isBotLoading,
	accountStatus,
	isAccountLoading,
	loadBotStatus,
	loadAccountStatus,
	onBotStatusChange,
}: TelegramHubViewProps) {
	const [activeMainTab, setActiveMainTab] = useState<TelegramMainTab>("bot");

	return (
		<div className="telegram-hub-container" data-testid="telegram-integration-hub">
			<div className="tg-hub-main-tabs" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={activeMainTab === "bot"}
					className={`tg-hub-tab-btn ${activeMainTab === "bot" ? "active" : ""}`}
					onClick={() => setActiveMainTab("bot")}
					data-testid="tg-hub-tab-bot"
				>
					<Bot size={18} />
					<span className="tg-tab-text-desktop">Бот Telegram</span>
					<span className="tg-tab-text-mobile">Бот</span>
					{botStatus?.configured && (
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "#10b981",
								marginLeft: "4px",
							}}
						/>
					)}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeMainTab === "account"}
					className={`tg-hub-tab-btn ${activeMainTab === "account" ? "active" : ""}`}
					onClick={() => setActiveMainTab("account")}
					data-testid="tg-hub-tab-account"
				>
					<UserCheck size={18} />
					<span className="tg-tab-text-desktop">Личный аккаунт Telegram</span>
					<span className="tg-tab-text-mobile">Личный аккаунт</span>
					{accountStatus?.connected && (
						<span
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								background: "#10b981",
								marginLeft: "4px",
							}}
						/>
					)}
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeMainTab === "templates"}
					className={`tg-hub-tab-btn ${activeMainTab === "templates" ? "active" : ""}`}
					onClick={() => setActiveMainTab("templates")}
				>
					<Bell size={18} />
					<span className="tg-tab-text-desktop">Шаблоны</span>
					<span className="tg-tab-text-mobile">Шаблоны</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeMainTab === "queue"}
					className={`tg-hub-tab-btn ${activeMainTab === "queue" ? "active" : ""}`}
					onClick={() => setActiveMainTab("queue")}
				>
					<Send size={18} />
					<span className="tg-tab-text-desktop">Очередь</span>
					<span className="tg-tab-text-mobile">Очередь</span>
				</button>
			</div>

			{activeMainTab === "bot" && (
				<BotConfigurationCard
					clinicId={clinicId || ""}
					botStatus={botStatus}
					isBotLoading={isBotLoading}
					onRefreshStatus={loadBotStatus}
					onBotStatusChange={onBotStatusChange || (() => {})}
				/>
			)}

			{activeMainTab === "account" && (
				<StaffBindingCard
					clinicId={clinicId || ""}
					userId={userId || ""}
					accountStatus={accountStatus}
					isAccountLoading={isAccountLoading}
					onRefreshStatus={loadAccountStatus}
				/>
			)}

			{activeMainTab === "templates" && (
				<NotificationTemplatesEditor clinicId={clinicId || ""} />
			)}

			{activeMainTab === "queue" && (
				<DeliveryQueueMonitor clinicId={clinicId || ""} />
			)}
		</div>
	);
}
