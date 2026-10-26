import React from "react";
import { ChevronLeft } from "lucide-react";
import type { BotPreset } from "../telegramBotPresets";
import type { BotChannelType, ChannelConfig } from "./types";

interface SimulatorHeaderProps {
	channel: BotChannelType;
	config: ChannelConfig;
	preset: BotPreset;
	effectiveTitle: string;
	currentScreenId: string;
	activeTheme: "light" | "dark";
	onReset: () => void;
}

export const SimulatorHeader: React.FC<SimulatorHeaderProps> = ({
	channel,
	config,
	preset,
	effectiveTitle,
	currentScreenId,
	activeTheme,
	onReset,
}) => {
	const avatarText =
		channel === "vk" ? "VK" : channel === "whatsapp" ? "WA" : preset.avatarText;
	const avatarGradient =
		channel === "whatsapp"
			? "linear-gradient(135deg, #25d366 0%, #128c7e 100%)"
			: channel === "vk"
				? "linear-gradient(135deg, #0077ff 0%, #0056b3 100%)"
				: preset.avatarGradient;

	return (
		<div
			className={`tg-chat-header header-${channel}`}
			style={{
				background:
					activeTheme === "dark" ? "var(--paper-card, #1e293b)" : config.headerBg,
				color: "#ffffff",
			}}
		>
			{currentScreenId !== "root" && (
				<button
					type="button"
					className="tg-header-back-btn"
					onClick={onReset}
					title="Назад в главное меню"
				>
					<ChevronLeft size={20} />
				</button>
			)}

			<div className="tg-header-avatar" style={{ background: avatarGradient }}>
				<span>{avatarText}</span>
			</div>

			<div className="tg-header-info">
				<h4 className="tg-header-name" title={effectiveTitle}>
					{effectiveTitle}
				</h4>
				<span className="tg-header-status">{config.statusText}</span>
			</div>
		</div>
	);
};
