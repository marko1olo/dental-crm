import React from "react";
import { ChevronLeft, Wifi, BatteryMedium, Signal } from "lucide-react";
import type { BotPreset } from "../telegramBotPresets";
import type { BotChannelType, ChannelConfig } from "./types";

export interface PhoneSimulatorScreenProps {
	channel: BotChannelType;
	config: ChannelConfig;
	preset: BotPreset;
	effectiveTitle: string;
	currentScreenId: string;
	activeTheme: "light" | "dark";
	toastNotice: string | null;
	onReset: () => void;
	children: React.ReactNode;
	inputBarNode?: React.ReactNode;
}

export const PhoneSimulatorScreen: React.FC<PhoneSimulatorScreenProps> = ({
	channel,
	config,
	preset,
	effectiveTitle,
	currentScreenId,
	activeTheme,
	toastNotice,
	onReset,
	children,
	inputBarNode,
}) => {
	const avatarText =
		channel === "vk" ? "VK" : channel === "whatsapp" ? "WA" : preset.avatarText;

	const avatarGradient =
		channel === "whatsapp"
			? "linear-gradient(135deg, #25d366 0%, #128c7e 100%)"
			: channel === "vk"
				? "linear-gradient(135deg, #0077ff 0%, #0056b3 100%)"
				: preset.avatarGradient;

	return (
		<div
			className={`tg-phone-frame tg-message-bubble-container channel-${channel} ${
				activeTheme === "dark" ? "tg-theme-dark" : "tg-theme-light"
			}`}
			style={{
				maxWidth: "100%",
				overflowX: "clip",
				position: "relative",
				borderRadius: "24px",
				boxShadow:
					activeTheme === "dark"
						? "0 12px 36px rgba(0, 0, 0, 0.45)"
						: "0 8px 30px rgba(15, 23, 42, 0.12)",
			}}
		>
			{/* Mobile Status Bar (iOS Notch & Status Indicators) */}
			<div
				className="tg-phone-notch-bar"
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "8px 16px 4px 16px",
					fontSize: "11px",
					fontWeight: 600,
					zIndex: 20,
					background:
						activeTheme === "dark"
							? "var(--paper-card, #1e293b)"
							: config.headerBg,
					color: "#ffffff",
				}}
			>
				<span className="tg-phone-time">09:41</span>
				<div
					className="tg-phone-dynamic-island"
					style={{
						width: "72px",
						height: "16px",
						background: "#000000",
						borderRadius: "10px",
						opacity: 0.85,
					}}
					aria-hidden="true"
				/>
				<div
					className="tg-phone-status-icons"
					style={{ display: "flex", alignItems: "center", gap: "6px" }}
				>
					<Signal size={12} aria-hidden="true" />
					<Wifi size={12} aria-hidden="true" />
					<BatteryMedium size={14} aria-hidden="true" />
				</div>
			</div>

			{/* Messenger Header Bar */}
			<div
				className={`tg-chat-header header-${channel}`}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "8px 12px 10px 12px",
					background:
						activeTheme === "dark"
							? "var(--paper-card, #1e293b)"
							: config.headerBg,
					color: "#ffffff",
					zIndex: 10,
				}}
			>
				{currentScreenId !== "root" && (
					<button
						type="button"
						className="tg-header-back-btn"
						onClick={onReset}
						title="Назад в главное меню"
						style={{
							minWidth: "44px",
							minHeight: "44px",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							background: "transparent",
							border: "none",
							color: "#ffffff",
							cursor: "pointer",
							padding: 0,
						}}
					>
						<ChevronLeft size={22} />
					</button>
				)}

				<div
					className="tg-header-avatar"
					style={{
						background: avatarGradient,
						width: "36px",
						height: "36px",
						borderRadius: "50%",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontWeight: 700,
						fontSize: "13px",
						color: "#ffffff",
						flexShrink: 0,
					}}
				>
					<span>{avatarText}</span>
				</div>

				<div
					className="tg-header-info"
					style={{ flex: 1, minWidth: 0, textAlign: "left" }}
				>
					<h4
						className="tg-header-name"
						title={effectiveTitle}
						style={{
							margin: 0,
							fontSize: "13px",
							fontWeight: 700,
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
							color: "#ffffff",
						}}
					>
						{effectiveTitle}
					</h4>
					<span
						className="tg-header-status"
						style={{
							fontSize: "11px",
							opacity: 0.9,
							color: "#ffffff",
							display: "block",
						}}
					>
						{config.statusText}
					</span>
				</div>
			</div>

			{/* Scrollable Chat Canvas */}
			<div
				className={`tg-chat-canvas canvas-${channel}`}
				style={{
					minHeight: "360px",
					maxHeight: "520px",
					overflowY: "auto",
					padding: "12px",
					display: "flex",
					flexDirection: "column",
					gap: "10px",
					position: "relative",
				}}
			>
				{toastNotice && (
					<div
						className="tg-phone-toast"
						role="status"
						aria-live="polite"
						style={{
							position: "sticky",
							top: "4px",
							zIndex: 40,
							background: "rgba(15, 23, 42, 0.92)",
							color: "#ffffff",
							padding: "6px 12px",
							borderRadius: "10px",
							fontSize: "11px",
							textAlign: "center",
							boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
						}}
					>
						{toastNotice}
					</div>
				)}

				<div
					className="tg-date-bubble"
					style={{
						alignSelf: "center",
						background: "rgba(0, 0, 0, 0.22)",
						color: "#ffffff",
						padding: "2px 10px",
						borderRadius: "12px",
						fontSize: "10px",
						fontWeight: 600,
						margin: "4px 0",
					}}
				>
					<span>Сегодня</span>
				</div>

				{children}
			</div>

			{/* Realistic Interactive Bottom Input Bar */}
			{inputBarNode}

			{/* iOS Home Indicator Bar */}
			<div
				className="tg-phone-home-indicator-wrapper"
				style={{
					display: "flex",
					justifyContent: "center",
					padding: "6px 0 8px 0",
					background:
						activeTheme === "dark"
							? "var(--paper-card, #1e293b)"
							: "var(--paper, #ffffff)",
				}}
			>
				<div
					className="tg-phone-home-bar"
					style={{
						width: "120px",
						height: "4px",
						borderRadius: "2px",
						background:
							activeTheme === "dark"
								? "rgba(255, 255, 255, 0.25)"
								: "rgba(0, 0, 0, 0.2)",
					}}
					aria-hidden="true"
				/>
			</div>
		</div>
	);
};
