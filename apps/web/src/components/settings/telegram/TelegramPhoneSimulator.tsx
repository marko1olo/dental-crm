import React from "react";
import type {
	BotChannelType,
	TelegramPhoneSimulatorProps,
} from "./phoneSimulator/types";
import { useTelegramPhoneSimulatorState } from "./phoneSimulator/useTelegramPhoneSimulatorState";
import { PhoneSimulatorScreen } from "./phoneSimulator/PhoneSimulatorScreen";
import { PhoneSimulatorChatBubble } from "./phoneSimulator/PhoneSimulatorChatBubble";
import { PhoneSimulatorInputBar } from "./phoneSimulator/PhoneSimulatorInputBar";
import { PhoneSimulatorPresetSelector } from "./phoneSimulator/PhoneSimulatorPresetSelector";

export type { BotChannelType, TelegramPhoneSimulatorProps };

/**
 * TelegramPhoneSimulator Root Facade
 * Sweet Spot (<120 lines facade), modularized into /phoneSimulator subcomponents.
 * Compliant with Mandates 8b/8zi, 8e, 8n, 8x, 8wy, 8zk.
 */
export function TelegramPhoneSimulator(props: TelegramPhoneSimulatorProps) {
	const { preset, channel = "telegram", customPrimaryActionLabel } = props;

	const {
		activeTheme,
		handleThemeToggle,
		currentScreenId,
		toastNotice,
		copied,
		inputText,
		setInputText,
		messages,
		effectiveTitle,
		effectiveText,
		currentChannelConfig,
		showMiniToast,
		changeScreen,
		resetToStart,
		handleCopyText,
		handleButtonClick,
		handleSendMessage,
	} = useTelegramPhoneSimulatorState(props);

	return (
		<div
			className="tg-simulator-wrapper"
			aria-label={`Предпросмотр сообщения бота (${currentChannelConfig.name})`}
			style={{
				width: "100%",
				maxWidth: "380px",
				display: "flex",
				flexDirection: "column",
				gap: "10px",
				margin: "0 auto",
			}}
		>
			{/* Top Toolbar and Scenario Selector */}
			<PhoneSimulatorPresetSelector
				config={currentChannelConfig}
				currentScreenId={currentScreenId}
				activeTheme={activeTheme}
				copied={copied}
				onSelectScreen={changeScreen}
				onCopyText={() => handleCopyText(effectiveText)}
				onToggleTheme={handleThemeToggle}
				onResetToStart={resetToStart}
			/>

			{/* Phone Device Screen & Interactive Chat Frame */}
			<PhoneSimulatorScreen
				channel={channel}
				config={currentChannelConfig}
				preset={preset}
				effectiveTitle={effectiveTitle}
				currentScreenId={currentScreenId}
				activeTheme={activeTheme}
				toastNotice={toastNotice}
				onReset={resetToStart}
				inputBarNode={
					<PhoneSimulatorInputBar
						inputText={inputText}
						activeTheme={activeTheme}
						onInputChange={setInputText}
						onSendMessage={handleSendMessage}
						onResetToStart={resetToStart}
						showMiniToast={showMiniToast}
					/>
				}
			>
				{messages.map((msg) => (
					<PhoneSimulatorChatBubble
						key={msg.id}
						message={msg}
						channel={channel}
						activeTheme={activeTheme}
						customPrimaryActionLabel={customPrimaryActionLabel}
						onButtonClick={handleButtonClick}
					/>
				))}
			</PhoneSimulatorScreen>
		</div>
	);
}
