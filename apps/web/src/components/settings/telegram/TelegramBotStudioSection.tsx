import React, { useState, useEffect } from "react";
import "./TelegramBotStudio.css";
import {
	Activity,
	Building2,
	Compass,
	Download,
	Lock,
	Maximize2,
	Server,
	Sliders,
	Sparkles,
	Stethoscope,
	Users,
	Zap,
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
import { TelegramBotSettingsStudio } from "./TelegramBotSettingsStudio";

export interface TelegramBotStudioProps {
	// biome-ignore lint/suspicious/noExplicitAny: integration with legacy bag
	parentProps?: any;
	initialWizardStep?: 1 | 2 | 3 | 4;
	initialChannel?: BotChannelType;
}

function getPresetMetaIcon(iconName: string) {
	switch (iconName) {
		case "Sparkles":
			return <Sparkles size={16} className="text-amber-500" />;
		case "Users":
			return <Users size={16} className="text-emerald-500" />;
		case "Activity":
			return <Activity size={16} className="text-sky-500" />;
		case "Stethoscope":
			return <Stethoscope size={16} className="text-indigo-500" />;
		case "Building2":
			return <Building2 size={16} className="text-teal-500" />;
		default:
			return <Sparkles size={16} className="text-teal-500" />;
	}
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
	const [clinicAddress] = useState<string>(
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
							<Server size={13} aria-hidden="true" /> Облачный хостинг DENTE
						</span>
						<span className="tg-pill tg-pill-success">
							<Lock size={13} aria-hidden="true" /> 152-ФЗ Безопасно: Без ПДн
						</span>
						<span className="tg-pill tg-pill-accent">
							<Zap size={13} aria-hidden="true" /> Запуск за 60 секунд
						</span>
					</div>

					<h2 className="tg-studio-hero-title">
						Студия ботов клиники DENTE (Telegram • VK • WhatsApp • MAX)
					</h2>
					<p className="tg-studio-hero-desc">
						Создайте персонального виртуального ассистента для вашей стоматологии.
						Сервер DENTE обеспечивает круглосуточную маршрутизацию, онлайн-запись 24/7,
						напоминания и сбор отзывов пациентов без сторонних посредников.
					</p>

					{/* Hero Quick Action Buttons */}
					<div className="tg-hero-actions-row mt-4 flex items-center gap-3 flex-wrap">
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="primary-button tg-hero-btn"
						>
							<Sparkles size={16} />
							<span>Мастер быстрой настройки бота</span>
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

			{/* Main 2-Column Studio Grid */}
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
						<TelegramBotSettingsStudio
							customTab={customTab}
							onCustomTabChange={setCustomTab}
							selectedPresetId={selectedPresetId}
							onSelectPreset={handleSelectPreset}
							selectedTone={selectedTone}
							onToneChange={setSelectedTone}
							customClinicName={customClinicName}
							onClinicNameChange={setCustomClinicName}
							customWelcomeText={customWelcomeText}
							onWelcomeTextChange={setCustomWelcomeText}
							customPrimaryActionLabel={customPrimaryActionLabel}
							onPrimaryActionLabelChange={setCustomPrimaryActionLabel}
							enableCitoPain={enableCitoPain}
							onEnableCitoPainChange={setEnableCitoPain}
							enableVoiceIntake={enableVoiceIntake}
							onEnableVoiceIntakeChange={setEnableVoiceIntake}
							enablePostCareGuide={enablePostCareGuide}
							onEnablePostCareGuideChange={setEnablePostCareGuide}
							enableLeadReminders={enableLeadReminders}
							onEnableLeadRemindersChange={setEnableLeadReminders}
							enableMiniAppBooking={enableMiniAppBooking}
							onEnableMiniAppBookingChange={setEnableMiniAppBooking}
							webAppUrl={webAppUrl}
							onWebAppUrlChange={setWebAppUrl}
							clinicPhone={clinicPhone}
							onClinicPhoneChange={setClinicPhone}
							mapsUrl={mapsUrl}
							onMapsUrlChange={setMapsUrl}
						/>
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
								{getPresetMetaIcon(activePreset.icon)}
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
