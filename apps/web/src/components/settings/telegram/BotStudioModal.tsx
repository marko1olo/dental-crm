import React, { useState, useEffect } from "react";
import { X, Bot, Sparkles, Smartphone, Layers, ShieldCheck } from "lucide-react";
import { BotOnboardingWizard } from "./BotOnboardingWizard";
import {
	TelegramPhoneSimulator,
	type BotChannelType,
} from "./TelegramPhoneSimulator";
import {
	CLINICAL_BOT_PRESETS,
	type BotPreset,
} from "./telegramBotPresets";
import "./TelegramBotStudio.css";

export interface BotStudioModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialChannel?: BotChannelType;
	// biome-ignore lint/suspicious/noExplicitAny: integration with settings bag
	parentProps?: any;
}

export function BotStudioModal({
	isOpen,
	onClose,
	initialChannel = "telegram",
	parentProps,
}: BotStudioModalProps) {
	// Sync states between wizard and phone simulator
	const [activeChannel, setActiveChannel] = useState<BotChannelType>(initialChannel);
	const [selectedPresetId, setSelectedPresetId] = useState<BotPreset["id"]>("premium");
	const [previewScreenId, setPreviewScreenId] = useState<string>("root");
	const [customClinicName, setCustomClinicName] = useState<string>(
		CLINICAL_BOT_PRESETS.premium.headerTitle,
	);
	const [customWelcomeText, setCustomWelcomeText] = useState<string>(
		CLINICAL_BOT_PRESETS.premium.defaultWelcomeText,
	);
	const [customPrimaryActionLabel, setCustomPrimaryActionLabel] = useState<string>(
		CLINICAL_BOT_PRESETS.premium.primaryActionLabel,
	);
	const [simTheme, setSimTheme] = useState<"light" | "dark">("light");

	const activePreset = CLINICAL_BOT_PRESETS[selectedPresetId] || CLINICAL_BOT_PRESETS.premium;

	// Close on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			className="bot-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bot-modal-title"
		>
			<div className="bot-modal-backdrop" onClick={onClose} aria-hidden="true" />

			<div className="bot-modal-container">
				{/* Modal Top Bar */}
				<div className="bot-modal-header">
					<div className="flex items-center gap-3 min-w-0">
						<div className="bot-modal-icon-badge">
							<Bot size={22} className="text-teal-600 dark:text-teal-400" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 id="bot-modal-title" className="bot-modal-title">
									Студия ботов DENTE: Запуск в 2 клика
								</h2>
								<span className="bot-pill-mini text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50">
									<ShieldCheck size={12} className="inline mr-1" />
									152-ФЗ Безопасно
								</span>
							</div>
							<p className="bot-modal-subtitle">
								Пошаговый мастер подключения Telegram, VK, WhatsApp и MAX без программистов
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="bot-modal-close-btn"
						aria-label="Закрыть окно мастера"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Scrollable Body: 2 Columns */}
				<div className="bot-modal-body">
					{/* Left: 4-Step Wizard */}
					<div className="bot-modal-wizard-col">
						<BotOnboardingWizard
							channel={activeChannel}
							onChannelChange={setActiveChannel}
							selectedPresetId={selectedPresetId}
							onPresetChange={setSelectedPresetId}
							onPreviewScreen={setPreviewScreenId}
							customClinicName={customClinicName}
							onClinicNameChange={setCustomClinicName}
							customWelcomeText={customWelcomeText}
							onWelcomeTextChange={setCustomWelcomeText}
							customPrimaryActionLabel={customPrimaryActionLabel}
							onPrimaryActionLabelChange={setCustomPrimaryActionLabel}
							parentProps={parentProps}
						/>
					</div>

					{/* Right: Interactive Phone Simulator */}
					<div className="bot-modal-simulator-col">
						<div className="bot-modal-sim-sticky">
							<TelegramPhoneSimulator
								preset={activePreset}
								channel={activeChannel}
								customClinicName={customClinicName}
								customWelcomeText={customWelcomeText}
								customPrimaryActionLabel={customPrimaryActionLabel}
								previewScreenId={previewScreenId}
								onScreenChange={setPreviewScreenId}
								themeMode={simTheme}
								onThemeModeChange={setSimTheme}
							/>

							<div className="bot-sim-footnote">
								<span>Канал: <strong>{activeChannel.toUpperCase()}</strong></span>
								<span>•</span>
								<span>Пресет: <strong>{activePreset.name}</strong></span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
