import React from "react";
import { CheckCheck, ExternalLink, Sparkles } from "lucide-react";
import type { BotPreset, BotSimulatorScreen } from "../telegramBotPresets";
import type { BotChannelType } from "./types";

interface SimulatorMessageCardProps {
	channel: BotChannelType;
	preset: BotPreset;
	activeScreen: BotSimulatorScreen;
	currentScreenId: string;
	effectiveText: string;
	customPrimaryActionLabel?: string;
	onButtonClick: (action: string, isWebApp?: boolean, url?: string) => void;
}

export const SimulatorMessageCard: React.FC<SimulatorMessageCardProps> = ({
	channel,
	preset,
	activeScreen,
	currentScreenId,
	effectiveText,
	customPrimaryActionLabel,
	onButtonClick,
}) => {
	const paragraphs = effectiveText.split("\n");

	return (
		<>
			<div className={`tg-message-card bubble-${channel}`}>
				{activeScreen.bannerUrl && currentScreenId === "root" && (
					<div className="tg-message-banner">
						<img src={activeScreen.bannerUrl} alt="Визуальная обложка" loading="lazy" />
						<div className="tg-banner-overlay-tag">
							<Sparkles size={11} /> {preset.badge}
						</div>
					</div>
				)}

				<div className="tg-message-body">
					<p className="tg-message-text">
						{paragraphs.map((paragraph, index) => (
							<React.Fragment key={`p-${index}`}>
								{paragraph}
								{index < paragraphs.length - 1 && <br />}
							</React.Fragment>
						))}
					</p>
					<div className="tg-message-meta">
						<span className="tg-message-time">12:00</span>
						<CheckCheck size={14} className="tg-read-check text-sky-500" aria-hidden="true" />
					</div>
				</div>
			</div>

			{activeScreen.buttons.length > 0 && (
				<div className={`tg-inline-keyboard kb-${channel}`} role="group" aria-label="Кнопки бота">
					{activeScreen.buttons.map((row, rowIndex) => (
						<div className="tg-inline-row" key={`sim-row-${rowIndex}`}>
							{row.map((btn, btnIndex) => {
								const displayLabel =
									currentScreenId === "root" && btn.isPrimary && customPrimaryActionLabel?.trim()
										? customPrimaryActionLabel
										: btn.text;

								let btnClass = "tg-inline-btn";
								if (btn.isPrimary) btnClass += " tg-btn-primary";
								if (btn.isDanger) btnClass += " tg-btn-danger";

								return (
									<button
										key={`sim-btn-${rowIndex}-${btnIndex}`}
										type="button"
										className={btnClass}
										onClick={() => onButtonClick(btn.action, btn.webApp, btn.url)}
									>
										<span>{displayLabel}</span>
										{btn.url && <ExternalLink size={12} className="tg-link-icon" />}
									</button>
								);
							})}
						</div>
					))}
				</div>
			)}
		</>
	);
};
