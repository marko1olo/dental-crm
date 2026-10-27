import type { BotStatus } from "../types";

export type TableTentFormat = "a5" | "a6";

export interface BotInfo {
	id?: number;
	username?: string;
	firstName?: string;
	tokenMasked?: string;
	canJoinGroups?: boolean;
	canReadAllGroupMessages?: boolean;
	supportsInlineQueries?: boolean;
}

export interface BotConfigurationCardProps {
	clinicId: string;
	botStatus: BotStatus | null;
	isBotLoading: boolean;
	onRefreshStatus: () => Promise<void>;
	onBotStatusChange?: (newStatus: Partial<BotStatus>) => void;
}

export interface BotConfigurationLogic {
	botTokenInput: string;
	setBotTokenInput: (val: string) => void;
	showBotToken: boolean;
	setShowBotToken: (val: boolean | ((prev: boolean) => boolean)) => void;
	isConnectingBot: boolean;
	isTestingBot: boolean;
	isDisconnectingBot: boolean;
	isBotGuideOpen: boolean;
	setIsBotGuideOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
	isTableTentOpen: boolean;
	setIsTableTentOpen: (val: boolean) => void;
	tableTentFormat: TableTentFormat;
	setTableTentFormat: (val: TableTentFormat) => void;
	copiedLink: boolean;
	isConnected: boolean;
	effectiveBot: BotInfo | null;
	botUsername: string;
	patientBotLink: string;
	handleConnectBot: () => Promise<void>;
	handleTestBot: () => Promise<void>;
	handleDisconnectBot: () => Promise<void>;
	handleCopyPatientLink: () => Promise<void>;
	handleDownloadQrSvg: () => void;
}
