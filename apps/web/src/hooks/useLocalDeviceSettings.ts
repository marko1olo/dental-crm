import { useState, useEffect } from "react";

export interface LocalDeviceSettings {
	highContrast: boolean;
	authArtEnabled: boolean;
	authArtPack: "nature" | "abstract" | "dental-epic" | "anime" | string;
	authArtDynamicByTimeOfDay: boolean;
}

const DEFAULT_SETTINGS: LocalDeviceSettings = {
	highContrast: false,
	authArtEnabled: true,
	authArtPack: "nature",
	authArtDynamicByTimeOfDay: true,
};

function loadSettings(): LocalDeviceSettings {
	try {
		const hc = localStorage.getItem("dente_high_contrast") === "true";
		
		let artSettings = {
			enabled: DEFAULT_SETTINGS.authArtEnabled,
			pack: DEFAULT_SETTINGS.authArtPack,
			dynamicByTimeOfDay: DEFAULT_SETTINGS.authArtDynamicByTimeOfDay,
		};
		
		const savedArt = localStorage.getItem("dente_auth_art_settings");
		if (savedArt) {
			const parsed = JSON.parse(savedArt);
			artSettings = { ...artSettings, ...parsed };
		}

		return {
			highContrast: hc,
			authArtEnabled: artSettings.enabled,
			authArtPack: artSettings.pack,
			authArtDynamicByTimeOfDay: artSettings.dynamicByTimeOfDay,
		};
	} catch (e) {
		console.error("Failed to load local device settings:", e);
		return DEFAULT_SETTINGS;
	}
}

export function useLocalDeviceSettings() {
	const [settings, setSettingsState] = useState<LocalDeviceSettings>(loadSettings);

	// Sync across tabs if changed elsewhere
	useEffect(() => {
		const handleStorage = () => {
			setSettingsState(loadSettings());
		};
		window.addEventListener("storage", handleStorage);
		return () => window.removeEventListener("storage", handleStorage);
	}, []);

	const setHighContrast = (value: boolean) => {
		localStorage.setItem("dente_high_contrast", String(value));
		setSettingsState((prev) => ({ ...prev, highContrast: value }));
		window.dispatchEvent(new Event("storage")); // Trigger updates in the same window
	};

	const setAuthArtSettings = (updates: Partial<Omit<LocalDeviceSettings, "highContrast">>) => {
		setSettingsState((prev) => {
			const next = { ...prev, ...updates };
			const artObj = {
				enabled: next.authArtEnabled,
				pack: next.authArtPack,
				dynamicByTimeOfDay: next.authArtDynamicByTimeOfDay,
			};
			localStorage.setItem("dente_auth_art_settings", JSON.stringify(artObj));
			return next;
		});
		window.dispatchEvent(new Event("storage"));
	};

	return {
		settings,
		setHighContrast,
		setAuthArtSettings,
	};
}
