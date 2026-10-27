import { useState } from "react";
import { generateQrCodeSvg } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode";
import { showToast } from "../../../../GlobalToast";
import type {
	BotConfigurationCardProps,
	BotConfigurationLogic,
	TableTentFormat,
} from "./botConfigTypes";
import { useBotApiHandlers } from "./useBotApiHandlers";

export function useBotConfigurationLogic(props: BotConfigurationCardProps): BotConfigurationLogic {
	const { clinicId, botStatus, onRefreshStatus, onBotStatusChange } = props;
	const [botTokenInput, setBotTokenInput] = useState<string>("");
	const [showBotToken, setShowBotToken] = useState<boolean>(false);
	const [isConnectingBot, setIsConnectingBot] = useState<boolean>(false);
	const [isTestingBot, setIsTestingBot] = useState<boolean>(false);
	const [isDisconnectingBot, setIsDisconnectingBot] = useState<boolean>(false);
	const [isBotGuideOpen, setIsBotGuideOpen] = useState<boolean>(true);
	const [isTableTentOpen, setIsTableTentOpen] = useState<boolean>(false);
	const [tableTentFormat, setTableTentFormat] = useState<TableTentFormat>("a5");
	const [copiedLink, setCopiedLink] = useState<boolean>(false);

	const isDemo = isDemoShowcaseMode();
	const isConnected = Boolean(botStatus?.configured || (isDemo && !botTokenInput));
	const effectiveBot = botStatus?.bot || (isDemo && isConnected ? {
		id: 7123456789,
		username: "clinic_dente_bot",
		firstName: "Стоматология DENTE",
		tokenMasked: "7123456789:AAH1bK•••••••••••••••••••••7",
		canJoinGroups: true,
		canReadAllGroupMessages: true,
		supportsInlineQueries: true,
	} : null);

	const botUsername = effectiveBot?.username || (isConnected ? "dente_clinic_bot" : "");
	const patientBotLink = botUsername ? `https://t.me/${botUsername}?start=clinic_${clinicId || "dente"}` : "";

	const { handleConnectBot, handleTestBot, handleDisconnectBot } = useBotApiHandlers({
		clinicId, botTokenInput, setBotTokenInput,
		setIsConnectingBot, setIsTestingBot, setIsDisconnectingBot,
		onRefreshStatus, onBotStatusChange,
	});

	const handleCopyPatientLink = async () => {
		if (!patientBotLink) return;
		try {
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				await navigator.clipboard.writeText(patientBotLink);
			}
			setCopiedLink(true);
			showToast("Ссылка для записи скопирована", "success");
			setTimeout(() => setCopiedLink(false), 2500);
		} catch {
			showToast("Не удалось скопировать ссылку", "warning");
		}
	};

	const handleDownloadQrSvg = () => {
		if (!patientBotLink) return;
		const svgString = generateQrCodeSvg(patientBotLink, { size: 300, margin: 2 });
		const blob = new Blob([svgString], { type: "image/svg+xml" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `dente-bot-qr-${botUsername || "clinic"}.svg`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("QR-код сохранен в формате SVG", "success");
	};

	return {
		botTokenInput, setBotTokenInput, showBotToken, setShowBotToken,
		isConnectingBot, isTestingBot, isDisconnectingBot,
		isBotGuideOpen, setIsBotGuideOpen, isTableTentOpen, setIsTableTentOpen,
		tableTentFormat, setTableTentFormat, copiedLink, isConnected,
		effectiveBot, botUsername, patientBotLink,
		handleConnectBot, handleTestBot, handleDisconnectBot,
		handleCopyPatientLink, handleDownloadQrSvg,
	};
}
