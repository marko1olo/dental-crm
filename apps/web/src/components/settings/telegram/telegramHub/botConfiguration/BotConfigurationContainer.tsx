import React from "react";
import type { BotConfigurationCardProps } from "./botConfigTypes";
import { useBotConfigurationLogic } from "./useBotConfigurationLogic";
import { BotStatusHeaderView } from "./BotStatusHeaderView";
import { BotDiagnosticsSection } from "./BotDiagnosticsSection";
import { BotPatientQrSection } from "./BotPatientQrSection";
import { BotTokenInputSection } from "./BotTokenInputSection";
import { BotSetupGuideAccordion } from "./BotSetupGuideAccordion";
import { BotTableTentModal } from "./BotTableTentModal";

export function BotConfigurationContainer(props: BotConfigurationCardProps) {
	const logic = useBotConfigurationLogic(props);
	const {
		isConnected, effectiveBot, botUsername, patientBotLink,
		isTestingBot, isDisconnectingBot, handleTestBot, handleDisconnectBot,
		botTokenInput, setBotTokenInput, showBotToken, setShowBotToken,
		isConnectingBot, handleConnectBot,
		isBotGuideOpen, setIsBotGuideOpen,
		copiedLink, handleCopyPatientLink, handleDownloadQrSvg,
		isTableTentOpen, setIsTableTentOpen, tableTentFormat, setTableTentFormat,
	} = logic;

	return (
		<div className="tg-hub-content-card" data-testid="tg-bot-pane">
			<BotStatusHeaderView
				isConnected={isConnected}
				botUsername={botUsername}
				effectiveBot={effectiveBot}
				isTestingBot={isTestingBot}
				isDisconnectingBot={isDisconnectingBot}
				onTestBot={handleTestBot}
				onDisconnectBot={handleDisconnectBot}
			/>

			{isConnected && effectiveBot && (
				<>
					<BotDiagnosticsSection botUsername={botUsername} effectiveBot={effectiveBot} />
					<BotPatientQrSection
						patientBotLink={patientBotLink}
						copiedLink={copiedLink}
						onOpenTableTent={() => setIsTableTentOpen(true)}
						onCopyPatientLink={handleCopyPatientLink}
						onDownloadQrSvg={handleDownloadQrSvg}
					/>
				</>
			)}

			{!isConnected && (
				<>
					<BotTokenInputSection
						botTokenInput={botTokenInput}
						setBotTokenInput={setBotTokenInput}
						showBotToken={showBotToken}
						setShowBotToken={setShowBotToken}
						isConnectingBot={isConnectingBot}
						onConnectBot={handleConnectBot}
					/>
					<BotSetupGuideAccordion
						isBotGuideOpen={isBotGuideOpen}
						setIsBotGuideOpen={setIsBotGuideOpen}
					/>
				</>
			)}

			<BotTableTentModal
				isOpen={isTableTentOpen}
				format={tableTentFormat}
				patientBotLink={patientBotLink}
				botUsername={botUsername}
				onClose={() => setIsTableTentOpen(false)}
				onFormatChange={setTableTentFormat}
			/>
		</div>
	);
}
