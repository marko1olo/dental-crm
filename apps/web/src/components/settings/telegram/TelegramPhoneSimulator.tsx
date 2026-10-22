import React, { useState, useEffect } from "react";
import {
	ChevronLeft,
	ExternalLink,
	RefreshCw,
	Sparkles,
	Sun,
	Moon,
	CheckCheck,
	Copy,
	Check,
	MessageSquare,
	Send,
} from "lucide-react";
import { showToast } from "../../GlobalToast";
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

	// Active screen state within the preview
	const [currentScreenId, setCurrentScreenId] = useState<string>(previewScreenId || "root");
	const [toastNotice, setToastNotice] = useState<string | null>(null);
	const [copied, setCopied] = useState<boolean>(false);

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

	const effectiveText =
		currentScreenId === "root" && customWelcomeText?.trim()
			? customWelcomeText
			: activeScreen.text;

	const handleCopyText = async () => {
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(effectiveText);
			}
			setCopied(true);
			showToast("Текст сообщения скопирован в буфер", "success");
			setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast("Не удалось скопировать текст", "warning");
		}
	};

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
		<div
			className="tg-simulator-wrapper"
			aria-label={`Предпросмотр сообщения бота (${currentChannelConfig.name})`}
		>
			{/* Simulator Header Toolbar */}
			<div className="tg-sim-toolbar">
				<div className="tg-sim-toolbar-title">
					<MessageSquare
						size={15}
						style={{ color: currentChannelConfig.iconColor }}
						aria-hidden="true"
					/>
					<span>Предпросмотр сообщения {currentChannelConfig.badge}</span>
					<span className="tg-sim-live-badge">Live</span>
				</div>
				<div className="tg-sim-toolbar-actions">
					<button
						type="button"
						onClick={handleCopyText}
						className="tg-sim-tool-btn"
						title="Копировать текст сообщения"
						data-testid="tg-copy-message-btn"
					>
						{copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
						<span>{copied ? "Скопировано!" : "Копировать"}</span>
					</button>
					<button
						type="button"
						onClick={handleThemeToggle}
						className="tg-sim-tool-btn"
						title={
							activeTheme === "light"
								? "Включить тёмную тему предпросмотра"
								: "Включить светлую тему предпросмотра"
						}
					>
						{activeTheme === "light" ? <Moon size={13} /> : <Sun size={13} />}
						<span>Тема</span>
					</button>
					<button
						type="button"
						onClick={resetToStart}
						className="tg-sim-tool-btn"
						title="Перезапустить диалог бота"
					>
						<RefreshCw size={13} />
						<span>/start</span>
					</button>
				</div>
			</div>

			{/* Clean Message Bubble Card Container (No Toy Phone Bezel) */}
			<div
				className={`tg-phone-frame tg-message-bubble-container channel-${channel} ${
					activeTheme === "dark" ? "tg-theme-dark" : "tg-theme-light"
				}`}
			>
				{/* Messenger Header Bar */}
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
					{currentScreenId !== "root" && (
						<button
							type="button"
							className="tg-header-back-btn"
							onClick={resetToStart}
							title="Назад в главное меню"
						>
							<ChevronLeft size={20} />
						</button>
					)}

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
						<span>
							{channel === "vk"
								? "VK"
								: channel === "whatsapp"
									? "WA"
									: preset.avatarText}
						</span>
					</div>

					<div className="tg-header-info">
						<h4 className="tg-header-name" title={effectiveTitle}>
							{effectiveTitle}
						</h4>
						<span className="tg-header-status">
							{currentChannelConfig.statusText}
						</span>
					</div>
				</div>

				{/* Quick Template Switch Chips for Testing */}
				<div
					className="tg-template-quick-chips"
					style={{
						display: "flex",
						gap: "6px",
						padding: "10px 14px",
						background: "var(--paper-soft, rgba(0,0,0,0.03))",
						borderBottom: "1px solid var(--line, rgba(0,0,0,0.08))",
						overflowX: "auto",
					}}
				>
					{[
						{ id: "root", label: "Приветствие" },
						{ id: "booking", label: "Онлайн-запись" },
						{ id: "reminders", label: "Напоминание" },
						{ id: "reviews", label: "Отзывы" },
						{ id: "price_faq", label: "Прейскурант" },
						{ id: "admin_chat", label: "Администратор" },
					].map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => changeScreen(tab.id)}
							style={{
								padding: "4px 10px",
								fontSize: "11px",
								fontWeight: currentScreenId === tab.id ? 600 : 500,
								borderRadius: "6px",
								border: "1px solid",
								borderColor:
									currentScreenId === tab.id
										? "var(--teal, #0d9488)"
										: "var(--line, #cbd5e1)",
								background:
									currentScreenId === tab.id
										? "var(--teal, #0d9488)"
										: "var(--paper, #ffffff)",
								color:
									currentScreenId === tab.id
										? "#ffffff"
										: "var(--ink, #0f172a)",
								cursor: "pointer",
								whiteSpace: "nowrap",
							}}
						>
							{tab.label}
						</button>
					))}
				</div>

				{/* Message Canvas */}
				<div className={`tg-chat-canvas canvas-${channel}`}>
					{toastNotice && (
						<div className="tg-phone-toast" role="status" aria-live="polite">
							{toastNotice}
						</div>
					)}

					<div className="tg-date-bubble">
						<span>Сегодня</span>
					</div>

					{/* Bot Message Bubble Card */}
					<div className={`tg-message-card bubble-${channel}`}>
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
								<span className="tg-message-time">12:00</span>
								<CheckCheck
									size={14}
									className="tg-read-check text-sky-500"
									aria-hidden="true"
								/>
							</div>
						</div>
					</div>

					{/* Inline Action Buttons below bubble */}
					{activeScreen.buttons.length > 0 && (
						<div
							className={`tg-inline-keyboard kb-${channel}`}
							role="group"
							aria-label="Кнопки бота"
						>
							{activeScreen.buttons.map((row, rowIndex) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: button rows
								<div className="tg-inline-row" key={`sim-row-${rowIndex}`}>
									{row.map((btn, btnIndex) => {
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
												{btn.url && (
													<ExternalLink size={12} className="tg-link-icon" />
												)}
											</button>
										);
									})}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
