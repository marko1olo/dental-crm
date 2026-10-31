import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";
import "./components/settings/telegram/TelegramBotStudio.css";
import "./components/settings/telegram/TelegramIntegrationHub.css";

import { TelegramPhoneSimulator } from "./components/settings/telegram/TelegramPhoneSimulator";
import { CLINICAL_BOT_PRESETS } from "./components/settings/telegram/telegramBotPresets";
import type { BotChannelType } from "./components/settings/telegram/phoneSimulator/types";

function TelegramSimulatorPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as "light" | "dark") || "light";
	const initialChannel = (params.get("channel") as BotChannelType) || "telegram";
	const initialScreen = params.get("screen") || "root";

	const [themeMode, setThemeMode] = useState<"light" | "dark">(initialTheme);
	const [channel, setChannel] = useState<BotChannelType>(initialChannel);
	const [screenId, setScreenId] = useState<string>(initialScreen);

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", themeMode);
		if (themeMode === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [themeMode]);

	const preset = CLINICAL_BOT_PRESETS.premium;

	return (
		<div
			className="telegram-simulator-preview-root"
			style={{
				minHeight: "100vh",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "flex-start",
				padding: "16px 12px 32px 12px",
				background:
					themeMode === "dark"
						? "var(--dark-bg, #090d16)"
						: "var(--paper-soft, #f1f5f9)",
				color:
					themeMode === "dark"
						? "var(--paper-white, #f8fafc)"
						: "var(--ink, #0f172a)",
				boxSizing: "border-box",
				overflowX: "clip",
			}}
		>
			{/* Top Header Banner for Visual Proof Identification */}
			<div
				style={{
					width: "100%",
					maxWidth: "380px",
					marginBottom: "12px",
					textAlign: "center",
				}}
			>
				<div
					style={{
						display: "inline-block",
						padding: "3px 10px",
						borderRadius: "999px",
						background:
							themeMode === "dark"
								? "rgba(13, 148, 136, 0.2)"
								: "rgba(13, 148, 136, 0.12)",
						color: "var(--teal, #0d9488)",
						fontSize: "11px",
						fontWeight: 600,
						marginBottom: "4px",
					}}
				>
					DENTE • Телеграм-симулятор
				</div>
				<h2
					style={{
						fontSize: "16px",
						fontWeight: 700,
						margin: "0 0 2px 0",
						letterSpacing: "-0.01em",
					}}
				>
					Онлайн-запись и сценарии бота
				</h2>
			</div>

			{/* Main Simulator Card Component */}
			<div
				style={{
					width: "100%",
					maxWidth: "380px",
					display: "flex",
					justifyContent: "center",
					overflowX: "clip",
				}}
			>
				<TelegramPhoneSimulator
					preset={preset}
					channel={channel}
					previewScreenId={screenId}
					onScreenChange={setScreenId}
					themeMode={themeMode}
					onThemeModeChange={setThemeMode}
					customClinicName="DENTE VIP Clinic"
				/>
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	createRoot(rootEl).render(<TelegramSimulatorPreviewApp />);
}
