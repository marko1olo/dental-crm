import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/settings/telegram/TelegramBotStudio.css";

import { TelegramBotStudioSection } from "./components/settings/telegram/TelegramBotStudioSection";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

function TelegramStudioPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		const isDark = rawTheme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.documentElement.setAttribute("data-theme", rawTheme);
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen p-4 md:p-6`;
	}, [rawTheme]);

	const mockProps = {
		telegramStatus: {
			botUsername: "smiledent_bot",
			tokenConfigured: true,
			webhookReady: true,
			webhookSecretConfigured: true,
			activeChatLinkCount: 4,
			pendingLinkCodeCount: 1,
			mode: "clinic_owned_bot",
		},
		telegramModeDraft: "clinic_owned_bot",
		telegramBotUsernameDraft: "smiledent_bot",
		telegramOwnBotUsernameDraft: "smiledent_bot",
		telegramPatientPortalBaseUrlDraft: "https://portal.dente-clinic.ru",
		telegramMapsUrlDraft: "https://maps.yandex.ru",
		telegramAllowVoiceIntakeDraft: true,
		telegramEnabledFeaturesDraft: ["voice_note_intake", "appointment_reminder"],
		markTelegramSettingsDirty: () => {},
		setTelegramOwnBotUsernameDraft: () => {},
	};

	return (
		<div className="max-w-[1400px] mx-auto w-full">
			<TelegramBotStudioSection parentProps={mockProps} />
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<TelegramStudioPreviewApp />
		</React.StrictMode>,
	);
}
