import React, { useState } from "react";
import {
	ChevronLeft,
	ExternalLink,
	Mic,
	MoreVertical,
	Paperclip,
	RefreshCw,
	Sparkles,
	Wifi,
	Battery,
	Smartphone,
	Sun,
	Moon,
	CheckCheck,
} from "lucide-react";
import type { BotPreset, BotSimulatorScreen } from "./telegramBotPresets";

export interface TelegramPhoneSimulatorProps {
	preset: BotPreset;
	customClinicName?: string;
	customWelcomeText?: string;
	customPrimaryActionLabel?: string;
	themeMode?: "light" | "dark";
	onThemeModeChange?: (mode: "light" | "dark") => void;
}

export function TelegramPhoneSimulator({
	preset,
	customClinicName,
	customWelcomeText,
	customPrimaryActionLabel,
	themeMode: externalThemeMode,
	onThemeModeChange,
}: TelegramPhoneSimulatorProps) {
	const [internalThemeMode, setInternalThemeMode] = useState<"light" | "dark">("light");
	const activeTheme = externalThemeMode ?? internalThemeMode;

	const handleThemeToggle = () => {
		const next = activeTheme === "light" ? "dark" : "light";
		if (onThemeChange) {
			onThemeChange(next);
		} else {
			setInternalThemeMode(next);
		}
	};

	const onThemeChange = onThemeModeChange;

	// Active screen state within the simulator
	const [currentScreenId, setCurrentScreenId] = useState<string>("root");
	const [toastNotice, setToastNotice] = useState<string | null>(null);

	const showMiniToast = (text: string) => {
		setToastNotice(text);
		setTimeout(() => {
			setToastNotice((prev) => (prev === text ? null : prev));
		}, 3000);
	};

	const resetToStart = () => {
		setCurrentScreenId("root");
		showMiniToast("Диалог перезапущен: /start");
	};

	// Determine current screen data with guaranteed fallback
	const fallbackScreen: BotSimulatorScreen = preset.screens.root ?? {
		id: "root",
		title: "Главное меню",
		text: preset.defaultWelcomeText,
		buttons: [],
	};
	const activeScreen: BotSimulatorScreen =
		preset.screens[currentScreenId] ?? fallbackScreen;

	// Custom overrides for the root screen if provided
	const effectiveText =
		currentScreenId === "root" && customWelcomeText?.trim()
			? customWelcomeText
			: activeScreen.text;

	const effectiveTitle = customClinicName?.trim()
		? customClinicName
		: preset.headerTitle;

	const handleButtonClick = (action: string, isWebApp?: boolean, url?: string) => {
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer");
			return;
		}

		if (isWebApp || action === "action:open_webapp") {
			showMiniToast("🚀 Открытие Telegram Mini App (WebApp онлайн-записи)");
			return;
		}

		if (action.startsWith("screen:")) {
			const targetScreenId = action.replace("screen:", "");
			if (preset.screens[targetScreenId]) {
				setCurrentScreenId(targetScreenId);
			} else {
				setCurrentScreenId("root");
			}
			return;
		}

		if (action === "action:call_cito") {
			showMiniToast("📞 Вызов экстренного дежурного врача...");
			return;
		}

		if (action === "action:call_concierge") {
			showMiniToast("📞 Соединение с персональным куратором...");
			return;
		}

		if (action === "action:open_maps") {
			showMiniToast("📍 Открытие маршрута до клиники...");
			return;
		}

		showMiniToast("✓ Команда обработана ботом");
	};

	return (
		<div className="tg-simulator-wrapper" aria-label="Интерактивный симулятор Telegram-бота">
			{/* Simulator Header Toolbar */}
			<div className="tg-sim-toolbar">
				<div className="tg-sim-toolbar-title">
					<Smartphone size={15} className="text-teal-500" aria-hidden="true" />
					<span>Telegram-симулятор</span>
					<span className="tg-sim-live-badge">Live</span>
				</div>
				<div className="tg-sim-toolbar-actions">
					<button
						type="button"
						onClick={handleThemeToggle}
						className="tg-sim-tool-btn"
						title={activeTheme === "light" ? "Включить темную тему симулятора" : "Включить светлую тему симулятора"}
					>
						{activeTheme === "light" ? <Moon size={13} /> : <Sun size={13} />}
						<span>Тема</span>
					</button>
					<button
						type="button"
						onClick={resetToStart}
						className="tg-sim-tool-btn"
						title="Перезапустить бота (/start)"
					>
						<RefreshCw size={13} />
						<span>/start</span>
					</button>
				</div>
			</div>

			{/* Phone Shell */}
			<div className={`tg-phone-frame ${activeTheme === "dark" ? "tg-theme-dark" : "tg-theme-light"}`}>
				{/* Phone Notch / Island */}
				<div className="tg-phone-notch-bar">
					<span className="tg-phone-time">09:41</span>
					<div className="tg-phone-dynamic-island" />
					<div className="tg-phone-status-icons">
						<Wifi size={13} />
						<Battery size={15} />
					</div>
				</div>

				{/* Telegram Header */}
				<div className="tg-chat-header">
					<button
						type="button"
						className="tg-header-back-btn"
						onClick={resetToStart}
						title="Назад в чаты"
					>
						<ChevronLeft size={20} />
						<span className="tg-back-count">2</span>
					</button>

					<div className="tg-header-avatar" style={{ background: preset.avatarGradient }}>
						<span>{preset.avatarText}</span>
					</div>

					<div className="tg-header-info">
						<h4 className="tg-header-name" title={effectiveTitle}>
							{effectiveTitle}
						</h4>
						<span className="tg-header-status">bot</span>
					</div>

					<button
						type="button"
						className="tg-header-more-btn"
						onClick={() => showMiniToast(`@${preset.botUsernameDemo} • DENTE Bot Engine`)}
						title="О боте"
					>
						<MoreVertical size={18} />
					</button>
				</div>

				{/* Telegram Chat Area */}
				<div className="tg-chat-canvas">
					{/* Toast Notice inside phone */}
					{toastNotice && (
						<div className="tg-phone-toast" role="status" aria-live="polite">
							{toastNotice}
						</div>
					)}

					{/* Date separator */}
					<div className="tg-date-bubble">
						<span>Сегодня</span>
					</div>

					{/* Bot Message Bubble */}
					<div className="tg-message-card">
						{/* Banner image if screen has one */}
						{activeScreen.bannerUrl && (
							<div className="tg-message-banner">
								<img
									src={activeScreen.bannerUrl}
									alt="Визуальная обложка"
									loading="lazy"
								/>
								<div className="tg-banner-overlay-tag">
									<Sparkles size={11} /> {preset.badge}
								</div>
							</div>
						)}

						{/* Text body */}
						<div className="tg-message-body">
							<p className="tg-message-text">
								{effectiveText.split("\n").map((paragraph, index) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: pure text lines rendering
									<React.Fragment key={index}>
										{paragraph}
										{index < effectiveText.split("\n").length - 1 && <br />}
									</React.Fragment>
								))}
							</p>
							<div className="tg-message-meta">
								<span className="tg-message-time">09:41</span>
								<CheckCheck size={14} className="tg-read-check" aria-hidden="true" />
							</div>
						</div>
					</div>

					{/* Inline Keyboard (Under the message) */}
					<div className="tg-inline-keyboard" role="group" aria-label="Inline-кнопки бота">
						{activeScreen.buttons.map((row, rowIndex) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: button rows
							<div className="tg-inline-row" key={`sim-row-${rowIndex}`}>
								{row.map((btn, btnIndex) => {
									// Root screen custom CTA label
									const displayLabel =
										currentScreenId === "root" &&
										btn.isPrimary &&
										customPrimaryActionLabel?.trim()
											? customPrimaryActionLabel
											: btn.text;

									let btnClass = "tg-inline-btn";
									if (btn.isPrimary) btnClass += " tg-btn-primary";
									if (btn.isDanger) btnClass += " tg-btn-danger";

									return (
										<button
											// biome-ignore lint/suspicious/noArrayIndexKey: button in row
											key={`sim-btn-${rowIndex}-${btnIndex}`}
											type="button"
											className={btnClass}
											onClick={() =>
												handleButtonClick(btn.action, btn.webApp, btn.url)
											}
										>
											<span>{displayLabel}</span>
											{btn.url && <ExternalLink size={12} className="tg-link-icon" />}
										</button>
									);
								})}
							</div>
						))}
					</div>
				</div>

				{/* Telegram Input Bar */}
				<div className="tg-input-bar">
					<button
						type="button"
						className="tg-menu-pill-btn"
						onClick={resetToStart}
						title="Меню бота"
					>
						<span>[/] Меню</span>
					</button>

					<div className="tg-input-field-wrapper">
						<input
							type="text"
							readOnly
							placeholder="Сообщение..."
							className="tg-fake-input"
							onClick={() => showMiniToast("Интерактивный симулятор: кликайте кнопки меню выше")}
						/>
						<button
							type="button"
							className="tg-input-icon-btn"
							onClick={() => showMiniToast("Прикрепление фото / снимков")}
							title="Вложения"
						>
							<Paperclip size={17} />
						</button>
					</div>

					<button
						type="button"
						className="tg-mic-btn"
						onClick={() => showMiniToast("🎤 Голосовое сообщение: распознается ИИ-ассистентом DENTE")}
						title="Голосовое сообщение"
					>
						<Mic size={18} />
					</button>
				</div>
			</div>
		</div>
	);
}
