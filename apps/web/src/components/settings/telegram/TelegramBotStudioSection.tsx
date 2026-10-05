import React, { useState, useEffect, useId } from "react";
import "./TelegramBotStudio.css";
import {
	Bot,
	CheckCircle2,
	ChevronRight,
	ExternalLink,
	Eye,
	EyeOff,
	Globe,
	HeartHandshake,
	HelpCircle,
	Info,
	Layers,
	Lock,
	MessageSquare,
	PhoneCall,
	Play,
	Radio,
	RotateCcw,
	Save,
	Server,
	Settings,
	Sliders,
	Sparkles,
	Tag,
	Zap,
	Download,
	Compass,
	Maximize2,
} from "lucide-react";
import {
	CLINICAL_BOT_PRESETS,
	type BotPreset,
	type BotTone,
} from "./telegramBotPresets";
import {
	TelegramPhoneSimulator,
	type BotChannelType,
} from "./TelegramPhoneSimulator";
import { BotOnboardingWizard } from "./BotOnboardingWizard";
import { BotStudioModal } from "./BotStudioModal";
import { downloadBotSourceZip } from "./botZipGenerator";

export interface TelegramBotStudioProps {
	// biome-ignore lint/suspicious/noExplicitAny: integration with legacy bag
	parentProps?: any;
	initialWizardStep?: 1 | 2 | 3 | 4;
	initialChannel?: BotChannelType;
}

export function TelegramBotStudioSection({
	parentProps,
	initialWizardStep = 1,
	initialChannel = "telegram",
}: TelegramBotStudioProps) {
	// Selected Channel & Clinical Preset
	const [activeChannel, setActiveChannel] = useState<BotChannelType>(initialChannel);
	const [selectedPresetId, setSelectedPresetId] =
		useState<BotPreset["id"]>("premium");
	const activePreset = CLINICAL_BOT_PRESETS[selectedPresetId];

	// Studio View Mode: "wizard" (4-step 2-click onboarding) or "advanced" (granular tuning)
	const [studioMode, setStudioMode] = useState<"wizard" | "advanced">("wizard");

	// Modal State
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

	// Preview screen id for simulator
	const [previewScreenId, setPreviewScreenId] = useState<string>("root");

	// Customization fields
	const [customClinicName, setCustomClinicName] = useState<string>(
		activePreset.headerTitle,
	);
	const [selectedTone, setSelectedTone] = useState<BotTone>(activePreset.tone);
	const [customWelcomeText, setCustomWelcomeText] = useState<string>(
		activePreset.defaultWelcomeText,
	);
	const [customPrimaryActionLabel, setCustomPrimaryActionLabel] =
		useState<string>(activePreset.primaryActionLabel);
	const [webAppUrl, setWebAppUrl] = useState<string>(
		parentProps?.telegramPatientPortalBaseUrlDraft || "https://portal.dente-clinic.ru",
	);
	const [clinicPhone, setClinicPhone] = useState<string>("+7 (999) 000-00-00");
	const [clinicAddress, setClinicAddress] = useState<string>(
		"Кутузовский проспект, 24",
	);
	const [mapsUrl, setMapsUrl] = useState<string>(
		parentProps?.telegramMapsUrlDraft || "https://maps.yandex.ru",
	);

	// Toggles for smart features
	const [enableCitoPain, setEnableCitoPain] = useState<boolean>(true);
	const [enableVoiceIntake, setEnableVoiceIntake] = useState<boolean>(
		parentProps?.telegramAllowVoiceIntakeDraft ?? true,
	);
	const [enablePostCareGuide, setEnablePostCareGuide] = useState<boolean>(true);
	const [enableMiniAppBooking, setEnableMiniAppBooking] = useState<boolean>(true);
	const [enableLeadReminders, setEnableLeadReminders] = useState<boolean>(true);

	// Simulator display theme: initialize with document theme if available
	const [simTheme, setSimTheme] = useState<"light" | "dark">(() => {
		if (typeof document !== "undefined") {
			return document.documentElement.classList.contains("dark") ||
				document.documentElement.getAttribute("data-theme") === "dark"
				? "dark"
				: "light";
		}
		return "light";
	});

	useEffect(() => {
		const checkTheme = () => {
			const isDark =
				document.documentElement.classList.contains("dark") ||
				document.documentElement.getAttribute("data-theme") === "dark";
			setSimTheme(isDark ? "dark" : "light");
		};
		checkTheme();
		const observer = new MutationObserver(checkTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class", "data-theme"],
		});
		return () => observer.disconnect();
	}, []);

	// Active tab inside advanced customization section
	const [customTab, setCustomTab] = useState<
		"presets" | "tone" | "texts" | "features" | "webapp"
	>("presets");

	// Unique IDs for accessibility
	const clinicNameId = useId();
	const welcomeTextId = useId();
	const primaryActionId = useId();
	const webAppUrlId = useId();
	const clinicPhoneId = useId();
	const mapsUrlId = useId();

	// Select a preset and sync default text
	const handleSelectPreset = (presetIdToSelect: BotPreset["id"]) => {
		setSelectedPresetId(presetIdToSelect);
		const newPreset = CLINICAL_BOT_PRESETS[presetIdToSelect];
		setCustomClinicName(newPreset.headerTitle);
		setSelectedTone(newPreset.tone);
		setCustomWelcomeText(newPreset.defaultWelcomeText);
		setCustomPrimaryActionLabel(newPreset.primaryActionLabel);
	};

	const handleDownloadQuickZip = () => {
		downloadBotSourceZip({
			channel: activeChannel,
			clinicName: customClinicName,
			clinicAddress,
			clinicPhone,
			botToken: "demo_bot_token",
			welcomeText: customWelcomeText,
			enabledPlugins: {
				onlineBooking: enableMiniAppBooking,
				reminders: enableLeadReminders,
				reviews: true,
				priceFaq: true,
				adminEscalation: true,
			},
		});
	};

	return (
		<section className="telegram-studio-root" aria-label="Студия ботов DENTE">
			{/* Top Hero Banner */}
			<div className="tg-studio-hero">
				<div className="tg-studio-hero-content">
					<div className="tg-studio-hero-badges">
						<span className="tg-pill tg-pill-brand">
							<Server size={13} aria-hidden="true" /> 100% Free Cloud Hosting
						</span>
						<span className="tg-pill tg-pill-success">
							<Lock size={13} aria-hidden="true" /> 152-ФЗ Безопасно: Без ПДн
						</span>
						<span className="tg-pill tg-pill-accent">
							<Zap size={13} aria-hidden="true" /> Старт за 60 секунд
						</span>
					</div>

					<h2 className="tg-studio-hero-title">
						Студия ботов клиники DENTE (Telegram • VK • WhatsApp • MAX)
					</h2>
					<p className="tg-studio-hero-desc">
						Создайте персонального виртуального ассистента для вашей стоматологии абсолютно бесплатно.
						Сервер DENTE обеспечивает круглосуточный хостинг, онлайн-запись 24/7, умные напоминания
						и сбор отзывов на Яндекс/2ГИС без необходимости платить внешним конструкторам.
					</p>

					{/* Hero Quick Action Buttons */}
					<div className="tg-hero-actions-row mt-4 flex items-center gap-3 flex-wrap">
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="primary-button tg-hero-btn"
						>
							<Sparkles size={16} />
							<span>Мастер запуска в 2 клика (Модальное окно)</span>
						</button>

						<button
							type="button"
							onClick={handleDownloadQuickZip}
							className="secondary-button tg-hero-btn"
							title="Скачать открытый исходный код Node.js / Python бота"
						>
							<Download size={15} />
							<span>Скачать исходники бота (ZIP)</span>
						</button>
					</div>
				</div>
			</div>

			{/* Studio Sub-Header: Mode Switcher */}
			<div className="tg-mode-switch-bar">
				<div className="tg-mode-switch-group" role="tablist">
					<button
						type="button"
						role="tab"
						aria-selected={studioMode === "wizard"}
						onClick={() => setStudioMode("wizard")}
						className={`tg-mode-btn ${studioMode === "wizard" ? "active" : ""}`}
					>
						<Compass size={15} />
						<span>Пошаговый мастер запуска (4 шага)</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={studioMode === "advanced"}
						onClick={() => setStudioMode("advanced")}
						className={`tg-mode-btn ${studioMode === "advanced" ? "active" : ""}`}
					>
						<Sliders size={15} />
						<span>Тонкие настройки и пресеты</span>
					</button>
				</div>

				<div className="tg-mode-meta-actions">
					<button
						type="button"
						onClick={() => setIsModalOpen(true)}
						className="tg-fullscreen-btn secondary-button compact-button"
						title="Развернуть студию на весь экран"
					>
						<Maximize2 size={13} />
						<span>На весь экран</span>
					</button>
				</div>
			</div>

			{/* Main 2-Column Studio Grid: Left Settings & Wizard, Right Live Phone Simulator */}
			<div className="tg-studio-grid">
				{/* LEFT COLUMN */}
				<div className="tg-studio-left-col">
					{studioMode === "wizard" ? (
						<BotOnboardingWizard
							initialStep={initialWizardStep}
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
					) : (
						/* ADVANCED CONFIGURATION CARD */
						<div className="tg-studio-card tg-config-card">
							<div className="tg-card-header">
								<div className="tg-card-header-icon">
									<Layers size={20} className="text-teal-600 dark:text-teal-400" />
								</div>
								<div className="tg-card-header-body">
									<h3 className="tg-card-title">Клинические пресеты и кастомизация</h3>
									<p className="tg-card-subtitle">
										Выберите готовую концепцию под специализацию клиники или настройте индивидуально.
									</p>
								</div>
							</div>

							{/* Customization Navigation Tabs */}
							<div className="tg-config-tabs" role="tablist">
								<button
									type="button"
									role="tab"
									aria-selected={customTab === "presets"}
									onClick={() => setCustomTab("presets")}
									className={`tg-tab-btn ${customTab === "presets" ? "active" : ""}`}
								>
									<Sparkles size={14} />
									<span>Готовые пресеты</span>
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={customTab === "tone"}
									onClick={() => setCustomTab("tone")}
									className={`tg-tab-btn ${customTab === "tone" ? "active" : ""}`}
								>
									<MessageSquare size={14} />
									<span>Тон общения</span>
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={customTab === "texts"}
									onClick={() => setCustomTab("texts")}
									className={`tg-tab-btn ${customTab === "texts" ? "active" : ""}`}
								>
									<Sliders size={14} />
									<span>Тексты и кнопки</span>
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={customTab === "features"}
									onClick={() => setCustomTab("features")}
									className={`tg-tab-btn ${customTab === "features" ? "active" : ""}`}
								>
									<Zap size={14} />
									<span>Клинические фичи</span>
								</button>
								<button
									type="button"
									role="tab"
									aria-selected={customTab === "webapp"}
									onClick={() => setCustomTab("webapp")}
									className={`tg-tab-btn ${customTab === "webapp" ? "active" : ""}`}
								>
									<Globe size={14} />
									<span>Онлайн-запись WebApp</span>
								</button>
							</div>

							{/* TAB 1: PRESETS */}
							{customTab === "presets" && (
								<div className="tg-tab-pane">
									<div className="tg-presets-grid">
										{Object.values(CLINICAL_BOT_PRESETS).map((p) => {
											const isSelected = p.id === selectedPresetId;
											return (
												<button
													key={p.id}
													type="button"
													onClick={() => handleSelectPreset(p.id)}
													className={`tg-preset-card ${isSelected ? "tg-preset-selected" : ""}`}
												>
													<div className="tg-preset-head">
														<div className="tg-preset-icon-box">{p.icon}</div>
														<div>
															<span className="tg-preset-badge">{p.badge}</span>
															<h4 className="tg-preset-title">{p.name}</h4>
														</div>
													</div>

													<p className="tg-preset-desc">{p.description}</p>

													<div className="tg-preset-features-list">
														{p.highlightFeatures.slice(0, 3).map((feat, idx) => (
															// biome-ignore lint/suspicious/noArrayIndexKey: feature chips
															<span key={idx} className="tg-preset-feat-tag">
																✓ {feat}
															</span>
														))}
													</div>

													<div className="tg-preset-footer">
														<span className="tg-preset-cta-hint">
															{isSelected ? "✓ Активный пресет" : "Выбрать этот пресет →"}
														</span>
													</div>
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* TAB 2: TONE OF VOICE */}
							{customTab === "tone" && (
								<div className="tg-tab-pane">
									<p className="tg-pane-intro">
										Выберите стиль коммуникации, который бот использует в ответах пациентам:
									</p>
									<div className="tg-tone-options">
										{[
											{
												id: "premium",
												title: "🌟 Премиум & Престиж",
												desc: "Подчеркнутая забота, премиальный сервис, персональный координатор, эстетические стандарты.",
											},
											{
												id: "caring",
												title: "👨‍👩‍👧‍👦 Заботливый семейный",
												desc: "Максимально теплое обращение, акцент на безболезненное лечение, психологический комфорт для детей и родителей.",
											},
											{
												id: "concise",
												title: "🩺 Лаконичный медицинский",
												desc: "Четкий профессиональный стиль доказательной медицины, конкретные факты, прозрачные цены без лишней воды.",
											},
										].map((item) => (
											<label
												key={item.id}
												className={`tg-tone-card ${selectedTone === item.id ? "selected" : ""}`}
											>
												<input
													type="radio"
													name="tone_choice"
													checked={selectedTone === item.id}
													onChange={() => setSelectedTone(item.id as BotTone)}
													className="sr-only"
												/>
												<div>
													<h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
														{item.title}
													</h4>
													<p className="text-xs text-slate-600 dark:text-slate-400">
														{item.desc}
													</p>
												</div>
											</label>
										))}
									</div>
								</div>
							)}

							{/* TAB 3: TEXTS AND BUTTONS */}
							{customTab === "texts" && (
								<div className="tg-tab-pane">
									<div className="tg-form-group">
										<label htmlFor={clinicNameId} className="tg-label">
											Название клиники / бота в шапке
										</label>
										<input
											id={clinicNameId}
											type="text"
											value={customClinicName}
											onChange={(e) => setCustomClinicName(e.target.value)}
											className="tg-input"
										/>
									</div>

									<div className="tg-form-group">
										<label htmlFor={welcomeTextId} className="tg-label">
											Приветственное сообщение (/start)
										</label>
										<textarea
											id={welcomeTextId}
											rows={4}
											value={customWelcomeText}
											onChange={(e) => setCustomWelcomeText(e.target.value)}
											className="tg-textarea"
										/>
										<small className="tg-help-text">
											Отображается сразу после того, как пациент нажал «Запустить» в Telegram.
										</small>
									</div>

									<div className="tg-form-group">
										<label htmlFor={primaryActionId} className="tg-label">
											Текст главной кнопки действия (CTA)
										</label>
										<input
											id={primaryActionId}
											type="text"
											value={customPrimaryActionLabel}
											onChange={(e) => setCustomPrimaryActionLabel(e.target.value)}
											className="tg-input"
										/>
									</div>
								</div>
							)}

							{/* TAB 4: CLINICAL FEATURES */}
							{customTab === "features" && (
								<div className="tg-tab-pane">
									<div className="tg-features-list">
										<label className="tg-feature-toggle-row">
											<div>
												<strong className="block text-slate-800 dark:text-slate-200 text-sm">
													⚡ Кнопка экстренной помощи при острой боли (CITO)
												</strong>
												<span className="text-xs text-slate-500 dark:text-slate-400">
													Выводит памятку первой помощи и прямой телефон дежурного доктора для срочного приёма вне очереди.
												</span>
											</div>
											<input
												type="checkbox"
												checked={enableCitoPain}
												onChange={(e) => setEnableCitoPain(e.target.checked)}
												className="toggle-switch"
											/>
										</label>

										<label className="tg-feature-toggle-row">
											<div>
												<strong className="block text-slate-800 dark:text-slate-200 text-sm">
													🎤 Прием голосовых обращений от пациентов
												</strong>
												<span className="text-xs text-slate-500 dark:text-slate-400">
													Пациент может надиктовать жалобы голосом — система переведет аудио в текст для администратора.
												</span>
											</div>
											<input
												type="checkbox"
												checked={enableVoiceIntake}
												onChange={(e) => setEnableVoiceIntake(e.target.checked)}
												className="toggle-switch"
											/>
										</label>

										<label className="tg-feature-toggle-row">
											<div>
												<strong className="block text-slate-800 dark:text-slate-200 text-sm">
													📋 Авто-отправка памяток после стоматологических вмешательств
												</strong>
												<span className="text-xs text-slate-500 dark:text-slate-400">
													После закрытия визита (удаление, имплантация, пломба) бот присылает пациенту рекомендации по уходу.
												</span>
											</div>
											<input
												type="checkbox"
												checked={enablePostCareGuide}
												onChange={(e) => setEnablePostCareGuide(e.target.checked)}
												className="toggle-switch"
											/>
										</label>

										<label className="tg-feature-toggle-row">
											<div>
												<strong className="block text-slate-800 dark:text-slate-200 text-sm">
													🔔 Умные напоминания за 24ч и за 2ч с навигацией
												</strong>
												<span className="text-xs text-slate-500 dark:text-slate-400">
													Автоматически снижает неявку (No-Show) на приём до минимума.
												</span>
											</div>
											<input
												type="checkbox"
												checked={enableLeadReminders}
												onChange={(e) => setEnableLeadReminders(e.target.checked)}
												className="toggle-switch"
											/>
										</label>
									</div>
								</div>
							)}

							{/* TAB 5: WEBAPP ONLINE BOOKING */}
							{customTab === "webapp" && (
								<div className="tg-tab-pane">
									<div className="tg-form-group">
										<label className="tg-feature-toggle-row mb-4">
											<div>
												<strong className="block text-slate-800 dark:text-slate-200 text-sm">
													🚀 Telegram Mini App (WebApp) для прямой онлайн-записи
												</strong>
												<span className="text-xs text-slate-500 dark:text-slate-400">
													При нажатии на кнопку в Telegram открывается полноценное окно выбора врача и свободного времени без перехода на внешние сайты.
												</span>
											</div>
											<input
												type="checkbox"
												checked={enableMiniAppBooking}
												onChange={(e) => setEnableMiniAppBooking(e.target.checked)}
												className="toggle-switch"
											/>
										</label>
									</div>

									<div className="tg-form-group">
										<label htmlFor={webAppUrlId} className="tg-label">
											URL защищенного пациентского портала / WebApp
										</label>
										<input
											id={webAppUrlId}
											type="url"
											value={webAppUrl}
											onChange={(e) => setWebAppUrl(e.target.value)}
											className="tg-input"
											placeholder="https://portal.clinic.ru"
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div className="tg-form-group">
											<label htmlFor={clinicPhoneId} className="tg-label">
												Телефон клиники
											</label>
											<input
												id={clinicPhoneId}
												type="tel"
												value={clinicPhone}
												onChange={(e) => setClinicPhone(e.target.value)}
												className="tg-input"
											/>
										</div>
										<div className="tg-form-group">
											<label htmlFor={mapsUrlId} className="tg-label">
												Ссылка на Яндекс.Карты / 2GIS
											</label>
											<input
												id={mapsUrlId}
												type="url"
												value={mapsUrl}
												onChange={(e) => setMapsUrl(e.target.value)}
												className="tg-input"
											/>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* RIGHT COLUMN: Realistic Live Phone Simulator */}
				<div className="tg-studio-right-col">
					<div className="tg-simulator-sticky">
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

						{/* Quick preset badge info below simulator */}
						<div className="tg-simulator-meta-note">
							<div className="flex items-center gap-2">
								<span className="text-base">{activePreset.icon}</span>
								<strong className="text-xs font-semibold text-slate-800 dark:text-slate-200">
									Активный клинический пресет: {activePreset.name}
								</strong>
							</div>
							<p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
								Канал: <strong>{activeChannel.toUpperCase()}</strong>. Интерактивные кнопки симулятора переключают экраны in-place.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Fullscreen Onboarding Modal */}
			<BotStudioModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				initialChannel={activeChannel}
				parentProps={parentProps}
			/>
		</section>
	);
}
