import React, { useState, useEffect } from "react";
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
	Phone,
	Video,
} from "lucide-react";
import type { BotPreset, BotSimulatorScreen } from "./telegramBotPresets";

export type BotChannelType = "telegram" | "vk" | "whatsapp" | "max";

export interface TelegramPhoneSimulatorProps {
	preset: BotPreset;
	channel?: BotChannelType;
	customClinicName?: string;
	customWelcomeText?: string;
	customPrimaryActionLabel?: string;
	previewScreenId?: string;
	onScreenChange?: (screenId: string) => void;
	themeMode?: "light" | "dark";
	onThemeModeChange?: (mode: "light" | "dark") => void;
}

export function TelegramPhoneSimulator(props: TelegramPhoneSimulatorProps) {
	const {
		preset,
		channel = "telegram",
		customClinicName,
		customWelcomeText,
		customPrimaryActionLabel,
		previewScreenId,
		onScreenChange,
		themeMode: externalThemeMode,
		onThemeModeChange,
	} = props;
	const [internalThemeMode, setInternalThemeMode] = useState<"light" | "dark">(() => {
		if (typeof document !== "undefined") {
			return document.documentElement.classList.contains("dark") ||
				document.documentElement.getAttribute("data-theme") === "dark"
				? "dark"
				: "light";
		}
		return "light";
	});
	const activeTheme = externalThemeMode ?? internalThemeMode;

	const handleThemeToggle = () => {
		const next = activeTheme === "light" ? "dark" : "light";
		if (onThemeModeChange) {
			onThemeModeChange(next);
		} else {
			setInternalThemeMode(next);
		}
	};

	// Active screen state within the simulator
	const [currentScreenId, setCurrentScreenId] = useState<string>(previewScreenId || "root");
	const [toastNotice, setToastNotice] = useState<string | null>(null);

	// Sync external previewScreenId when updated by wizard
	useEffect(() => {
		if (previewScreenId && previewScreenId !== currentScreenId) {
			setCurrentScreenId(previewScreenId);
		}
	}, [previewScreenId, currentScreenId]);

	const showMiniToast = (text: string) => {
		setToastNotice(text);
		setTimeout(() => {
			setToastNotice((prev) => (prev === text ? null : prev));
		}, 3000);
	};

	const changeScreen = (screenId: string) => {
		setCurrentScreenId(screenId);
		if (onScreenChange) {
			onScreenChange(screenId);
		}
	};

	const resetToStart = () => {
		changeScreen("root");
		showMiniToast(
			channel === "telegram"
				? "Диалог перезапущен: /start"
				: channel === "vk"
					? "Сообщество VK: Переход в начало"
					: "WhatsApp: Новое приветствие",
		);
	};

	const effectiveTitle = customClinicName?.trim()
		? customClinicName
		: preset.headerTitle;

	// Build built-in screens for plugin previews
	const pluginScreens: Record<string, BotSimulatorScreen> = {
		booking: {
			id: "booking",
			title: "Онлайн-запись 24/7",
			text: `Онлайн-запись на приём в «${effectiveTitle}»:\n\n1. Выберите направление или специалиста\n2. Укажите удобную дату и время\n3. Запись моментально появится в расписании клиники.`,
			buttons: [
				[
					{ text: "Терапия / Осмотр (Смирнова Е.А.)", action: "action:select_service", isPrimary: true },
				],
				[
					{ text: "Эстетика & Виниры (Барабаш С.В.)", action: "action:select_service" },
					{ text: "Детское отделение (адаптация)", action: "action:select_service" },
				],
				[
					{ text: "Ближайший слот: Завтра 14:00", action: "action:confirm_slot", isPrimary: true },
				],
				[
					{ text: "« Назад в меню", action: "screen:root" },
				],
			],
		},
		reminders: {
			id: "reminders",
			title: "Напоминание о приёме",
			text: `Напоминание о визите:\n\nЗдравствуйте, Анна! Напоминаем о вашем приёме завтра в 14:00 к врачу Смирновой Е.А. (Терапия, кабинет 2).\n\nКлиника: «${effectiveTitle}»\nПожалуйста, подтвердите визит или перенесите время:`,
			buttons: [
				[
					{ text: "Да, я буду (Подтвердить)", action: "action:confirm_visit", isPrimary: true },
				],
				[
					{ text: "Перенести на другой день", action: "action:reschedule" },
					{ text: "Показать маршрут", action: "action:open_maps" },
				],
				[
					{ text: "« Назад в меню", action: "screen:root" },
				],
			],
		},
		reviews: {
			id: "reviews",
			title: "Сбор отзывов и NPS",
			text: `Спасибо, что доверили здоровье вашей улыбки клинике «${effectiveTitle}»!\n\nКак прошёл ваш сегодняшний визит? Будем благодарны за оценку на независимых порталах. Это помогает нам становиться лучше!`,
			buttons: [
				[
					{ text: "Отлично, всё понравилось", action: "action:rate_5", isPrimary: true },
				],
				[
					{ text: "Яндекс.Карты (Бонус 500 ₽)", action: "action:open_yandex", url: "https://maps.yandex.ru" },
					{ text: "2ГИС", action: "action:open_2gis", url: "https://2gis.ru" },
				],
				[
					{ text: "ПроДокторов", action: "action:open_prodoctorov", url: "https://prodoctorov.ru" },
				],
				[
					{ text: "« Назад в меню", action: "screen:root" },
				],
			],
		},
		price_faq: {
			id: "price_faq",
			title: "Прейскурант и FAQ",
			text: `Прейскурант услуг клиники «${effectiveTitle}»:\n\n• Первичный осмотр и КТ — 0 ₽ (по акции)\n• Лечение кариеса под микроскопом — от 4 500 ₽\n• Профессиональная гигиена AirFlow — 6 000 ₽\n• Имплантация зуба под ключ — от 35 000 ₽\n\nВсе цены фиксируются в плане лечения до начала манипуляций.`,
			buttons: [
				[
					{ text: "Записаться на осмотр", action: "screen:booking", isPrimary: true },
				],
				[
					{ text: "Поэтапная оплата 0%", action: "action:installment" },
					{ text: "Гарантия на лечение", action: "action:warranty" },
				],
				[
					{ text: "« Назад в меню", action: "screen:root" },
				],
			],
		},
		admin_chat: {
			id: "admin_chat",
			title: "Связь с администратором",
			text: `Вы переключены на дежурного администратора клиники «${effectiveTitle}».\n\nАдминистратор подключилась к диалогу и ответит вам в течение 1–2 минут. Напишите ваш вопрос:`,
			buttons: [
				[
					{ text: "Позвонить в регистратуру", action: "action:call_concierge", isPrimary: true },
				],
				[
					{ text: "« Назад в главное меню", action: "screen:root" },
				],
			],
		},
	};

	// Determine current screen data with guaranteed fallback
	const fallbackScreen: BotSimulatorScreen = preset.screens.root ?? {
		id: "root",
		title: "Главное меню",
		text: preset.defaultWelcomeText,
		buttons: [],
	};

	const activeScreen: BotSimulatorScreen =
		pluginScreens[currentScreenId] ??
		preset.screens[currentScreenId] ??
		fallbackScreen;

	// Custom overrides for the root screen if provided
	const effectiveText =
		currentScreenId === "root" && customWelcomeText?.trim()
			? customWelcomeText
			: activeScreen.text;

	const handleButtonClick = (action: string, isWebApp?: boolean, url?: string) => {
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer");
			return;
		}

		if (isWebApp || action === "action:open_webapp") {
			showMiniToast("Открытие WebApp онлайн-записи");
			return;
		}

		if (action.startsWith("screen:")) {
			const targetScreenId = action.replace("screen:", "");
			if (pluginScreens[targetScreenId] || preset.screens[targetScreenId]) {
				changeScreen(targetScreenId);
			} else {
				changeScreen("root");
			}
			return;
		}

		if (action === "action:confirm_visit") {
			showMiniToast("Запись подтверждена! Ждём вас в клинике.");
			return;
		}

		if (action === "action:reschedule") {
			changeScreen("booking");
			showMiniToast("Выберите новое удобное время");
			return;
		}

		if (action === "action:rate_5") {
			showMiniToast("Благодарим за высокую оценку!");
			return;
		}

		if (action === "action:call_cito") {
			showMiniToast("Вызов дежурного врача...");
			return;
		}

		if (action === "action:call_concierge") {
			showMiniToast("Соединение с администратором...");
			return;
		}

		if (action === "action:open_maps") {
			showMiniToast("Открытие маршрута до клиники...");
			return;
		}

		showMiniToast("Команда принята ботом");
	};

	// Channel visual configurations
	const channelConfigs = {
		telegram: {
			name: "Telegram Bot",
			badge: "TG",
			headerBg: "var(--tg-header-bg, #2481cc)",
			statusText: "bot",
			iconColor: "#0284c7",
		},
		vk: {
			name: "ВКонтакте Сообщество",
			badge: "VK",
			headerBg: "var(--vk-header-bg, #0077ff)",
			statusText: "сообщество онлайн",
			iconColor: "#0077ff",
		},
		whatsapp: {
			name: "WhatsApp Business",
			badge: "WA",
			headerBg: "var(--wa-header-bg, #075e54)",
			statusText: "официальный бизнес-аккаунт",
			iconColor: "#25d366",
		},
		max: {
			name: "MAX (1С:Медицина)",
			badge: "MAX",
			headerBg: "var(--max-header-bg, #6d28d9)",
			statusText: "корпоративный шлюз CRM",
			iconColor: "#7c3aed",
		},
	};

	const currentChannelConfig = channelConfigs[channel] || channelConfigs.telegram;

	return (
		<div className="tg-simulator-wrapper" aria-label={`Интерактивный симулятор бота (${currentChannelConfig.name})`}>
			{/* Simulator Header Toolbar */}
			<div className="tg-sim-toolbar">
				<div className="tg-sim-toolbar-title">
					<Smartphone size={15} style={{ color: currentChannelConfig.iconColor }} aria-hidden="true" />
					<span>Симулятор {currentChannelConfig.badge}</span>
					<span className="tg-sim-live-badge">Live</span>
				</div>
				<div className="tg-sim-toolbar-actions">
					<button
						type="button"
						onClick={handleThemeToggle}
						className="tg-sim-tool-btn"
						title={activeTheme === "light" ? "Включить тёмную тему симулятора" : "Включить светлую тему симулятора"}
					>
						{activeTheme === "light" ? <Moon size={13} /> : <Sun size={13} />}
						<span>Тема</span>
					</button>
					<button
						type="button"
						onClick={resetToStart}
						className="tg-sim-tool-btn"
						title="Перезапустить бота"
					>
						<RefreshCw size={13} />
						<span>/start</span>
					</button>
				</div>
			</div>

			{/* Phone Shell */}
			<div
				className={`tg-phone-frame channel-${channel} ${activeTheme === "dark" ? "tg-theme-dark" : "tg-theme-light"}`}
			>
				{/* Phone Notch / Island */}
				<div className="tg-phone-notch-bar">
					<span className="tg-phone-time">09:41</span>
					<div className="tg-phone-dynamic-island" />
					<div className="tg-phone-status-icons">
						<Wifi size={13} />
						<Battery size={15} />
					</div>
				</div>

				{/* Messenger Chat Header */}
				<div
					className={`tg-chat-header header-${channel}`}
					style={{
						background:
							activeTheme === "dark"
								? "var(--paper-card, #1e293b)"
								: currentChannelConfig.headerBg,
						color: "#ffffff",
					}}
				>
					<button
						type="button"
						className="tg-header-back-btn"
						onClick={resetToStart}
						title="Назад в чаты"
					>
						<ChevronLeft size={20} />
						<span className="tg-back-count">1</span>
					</button>

					<div
						className="tg-header-avatar"
						style={{
							background:
								channel === "whatsapp"
									? "linear-gradient(135deg, #25d366 0%, #128c7e 100%)"
									: channel === "vk"
										? "linear-gradient(135deg, #0077ff 0%, #0056b3 100%)"
										: preset.avatarGradient,
						}}
					>
						<span>{channel === "vk" ? "VK" : channel === "whatsapp" ? "WA" : preset.avatarText}</span>
					</div>

					<div className="tg-header-info">
						<h4 className="tg-header-name" title={effectiveTitle}>
							{effectiveTitle}
						</h4>
						<span className="tg-header-status">{currentChannelConfig.statusText}</span>
					</div>

					<div className="flex items-center gap-1">
						{channel === "whatsapp" && (
							<>
								<button
									type="button"
									className="tg-header-more-btn"
									onClick={() => showMiniToast("Видеозвонок клиники")}
									title="Видеозвонок"
								>
									<Video size={16} />
								</button>
								<button
									type="button"
									className="tg-header-more-btn"
									onClick={() => showMiniToast("Звонок в клинику")}
									title="Аудиозвонок"
								>
									<Phone size={15} />
								</button>
							</>
						)}
						<button
							type="button"
							className="tg-header-more-btn"
							onClick={() => showMiniToast(`${currentChannelConfig.name} • DENTE Bot Engine 24/7`)}
							title="О боте"
						>
							<MoreVertical size={18} />
						</button>
					</div>
				</div>

				{/* Messenger Chat Area */}
				<div className={`tg-chat-canvas canvas-${channel}`}>
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
					<div className={`tg-message-card bubble-${channel}`}>
						{/* Banner image if screen has one */}
						{activeScreen.bannerUrl && currentScreenId === "root" && (
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
								<CheckCheck size={14} className="tg-read-check text-sky-500" aria-hidden="true" />
							</div>
						</div>
					</div>

					{/* Inline Keyboard / Buttons */}
					<div className={`tg-inline-keyboard kb-${channel}`} role="group" aria-label="Кнопки бота">
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

				{/* Bottom Input Bar */}
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
							onClick={() => showMiniToast("Интерактивный симулятор: кликайте кнопки выше")}
						/>
						<button
							type="button"
							className="tg-input-icon-btn"
							onClick={() => showMiniToast("Прикрепление документов / файлов")}
							title="Вложения"
						>
							<Paperclip size={17} />
						</button>
					</div>

					<button
						type="button"
						className="tg-mic-btn"
						onClick={() => showMiniToast("Голосовое сообщение: распознается медицинским ассистентом DENTE")}
						title="Голосовое сообщение"
					>
						<Mic size={18} />
					</button>
				</div>
			</div>
		</div>
	);
}
