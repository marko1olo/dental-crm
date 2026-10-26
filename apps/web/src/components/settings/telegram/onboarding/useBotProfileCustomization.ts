import { useState } from "react";
import { CLINICAL_BOT_PRESETS, type BotPreset, type BotTone } from "../telegramBotPresets";
import type { BotOnboardingWizardProps } from "./types";

export function useBotProfileCustomization(props: BotOnboardingWizardProps) {
	const {
		selectedPresetId = "premium",
		onPresetChange,
		customClinicName: externalClinicName,
		onClinicNameChange,
		customWelcomeText: externalWelcomeText,
		onWelcomeTextChange,
		customPrimaryActionLabel: externalPrimaryActionLabel,
		onPrimaryActionLabelChange,
	} = props;

	const [presetId, setPresetId] = useState<BotPreset["id"]>(selectedPresetId);
	const activePreset = CLINICAL_BOT_PRESETS[presetId];

	const [clinicName, setClinicName] = useState<string>(
		externalClinicName || activePreset.headerTitle,
	);
	const [clinicAddress, setClinicAddress] = useState<string>("Кутузовский проспект, 24");
	const [clinicPhone, setClinicPhone] = useState<string>("+7 (999) 000-00-00");
	const [welcomeText, setWelcomeText] = useState<string>(
		externalWelcomeText || activePreset.defaultWelcomeText,
	);
	const [primaryActionLabel, setPrimaryActionLabel] = useState<string>(
		externalPrimaryActionLabel || activePreset.primaryActionLabel,
	);
	const [selectedTone, setSelectedTone] = useState<BotTone>(activePreset.tone);

	const handleSelectPreset = (newPresetId: BotPreset["id"]) => {
		setPresetId(newPresetId);
		if (onPresetChange) onPresetChange(newPresetId);
		const p = CLINICAL_BOT_PRESETS[newPresetId];
		setClinicName(p.headerTitle);
		setWelcomeText(p.defaultWelcomeText);
		setPrimaryActionLabel(p.primaryActionLabel);
		if (onClinicNameChange) onClinicNameChange(p.headerTitle);
		if (onWelcomeTextChange) onWelcomeTextChange(p.defaultWelcomeText);
		if (onPrimaryActionLabelChange) onPrimaryActionLabelChange(p.primaryActionLabel);
	};

	const handleResetWelcomeText = () => {
		const def = activePreset.defaultWelcomeText;
		setWelcomeText(def);
		if (onWelcomeTextChange) onWelcomeTextChange(def);
	};

	return {
		presetId,
		activePreset,
		clinicName,
		setClinicName,
		clinicAddress,
		setClinicAddress,
		clinicPhone,
		setClinicPhone,
		welcomeText,
		setWelcomeText,
		primaryActionLabel,
		setPrimaryActionLabel,
		selectedTone,
		setSelectedTone,
		handleSelectPreset,
		handleResetWelcomeText,
	};
}
