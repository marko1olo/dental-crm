import { useState, useEffect } from "react";
import { CLINICAL_BOT_PRESETS, type BotPreset, type BotTone } from "../telegramBotPresets";
import type { BotChannelType } from "../TelegramPhoneSimulator";

export function useStudioState(parentProps?: any, initialChannel: BotChannelType = "telegram") {
	const [activeChannel, setActiveChannel] = useState<BotChannelType>(initialChannel);
	const [selectedPresetId, setSelectedPresetId] = useState<BotPreset["id"]>("premium");
	const activePreset = CLINICAL_BOT_PRESETS[selectedPresetId];

	const [studioMode, setStudioMode] = useState<"wizard" | "advanced">("wizard");
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const [previewScreenId, setPreviewScreenId] = useState<string>("root");

	const [customClinicName, setCustomClinicName] = useState<string>(activePreset.headerTitle);
	const [selectedTone, setSelectedTone] = useState<BotTone>(activePreset.tone);
	const [customWelcomeText, setCustomWelcomeText] = useState<string>(activePreset.defaultWelcomeText);
	const [customPrimaryActionLabel, setCustomPrimaryActionLabel] = useState<string>(activePreset.primaryActionLabel);
	const [webAppUrl, setWebAppUrl] = useState<string>(
		parentProps?.telegramPatientPortalBaseUrlDraft || "https://portal.dente-clinic.ru",
	);
	const [clinicPhone, setClinicPhone] = useState<string>("+7 (999) 000-00-00");
	const [mapsUrl, setMapsUrl] = useState<string>(
		parentProps?.telegramMapsUrlDraft || "https://maps.yandex.ru",
	);

	const [enableCitoPain, setEnableCitoPain] = useState<boolean>(true);
	const [enableVoiceIntake, setEnableVoiceIntake] = useState<boolean>(
		parentProps?.telegramAllowVoiceIntakeDraft ?? true,
	);
	const [enablePostCareGuide, setEnablePostCareGuide] = useState<boolean>(true);
	const [enableMiniAppBooking, setEnableMiniAppBooking] = useState<boolean>(true);
	const [enableLeadReminders, setEnableLeadReminders] = useState<boolean>(true);

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

	const [customTab, setCustomTab] = useState<"presets" | "tone" | "texts" | "features" | "webapp">("presets");

	const handleSelectPreset = (presetIdToSelect: BotPreset["id"]) => {
		setSelectedPresetId(presetIdToSelect);
		const newPreset = CLINICAL_BOT_PRESETS[presetIdToSelect];
		setCustomClinicName(newPreset.headerTitle);
		setSelectedTone(newPreset.tone);
		setCustomWelcomeText(newPreset.defaultWelcomeText);
		setCustomPrimaryActionLabel(newPreset.primaryActionLabel);
	};

	return {
		activeChannel,
		setActiveChannel,
		selectedPresetId,
		setSelectedPresetId,
		activePreset,
		studioMode,
		setStudioMode,
		isModalOpen,
		setIsModalOpen,
		previewScreenId,
		setPreviewScreenId,
		customClinicName,
		setCustomClinicName,
		selectedTone,
		setSelectedTone,
		customWelcomeText,
		setCustomWelcomeText,
		customPrimaryActionLabel,
		setCustomPrimaryActionLabel,
		webAppUrl,
		setWebAppUrl,
		clinicPhone,
		setClinicPhone,
		mapsUrl,
		setMapsUrl,
		enableCitoPain,
		setEnableCitoPain,
		enableVoiceIntake,
		setEnableVoiceIntake,
		enablePostCareGuide,
		setEnablePostCareGuide,
		enableMiniAppBooking,
		setEnableMiniAppBooking,
		enableLeadReminders,
		setEnableLeadReminders,
		simTheme,
		setSimTheme,
		customTab,
		setCustomTab,
		handleSelectPreset,
	};
}
