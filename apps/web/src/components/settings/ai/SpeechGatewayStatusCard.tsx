import React from "react";
import type { SpeechGatewayHealthReport, SpeechGatewayStatus } from "@dental/shared";
import { Activity, Bot } from "lucide-react";

export interface SpeechGatewayStatusCardProps {
	speechGatewayHealthReport: SpeechGatewayHealthReport | null;
	speechGatewayStatus: SpeechGatewayStatus | null;
	refreshSpeechRuntime: (options: { silent?: boolean }) => void | Promise<void>;
	speechGatewayCanUpload?: (status: SpeechGatewayStatus | null) => boolean;
}

export const SpeechGatewayStatusCard: React.FC<SpeechGatewayStatusCardProps> = ({
	refreshSpeechRuntime,
}) => {
	return (
		<div className="ai-section-header">
			<div className="flex items-start gap-3 flex-1 min-w-[200px]">
				<div className="ai-section-icon"><Bot size={24} /></div>
				<div className="ai-section-title">
					<h3>Речевой шлюз и распознавание диктовок</h3>
					<p>Подключение локальных моделей Whisper и облачных транскрибаторов Google Gemini</p>
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto shrink-0">
				<button
					className="dente-btn dente-btn-secondary secondary-button h-11 sm:h-9 px-3.5 rounded-xl sm:rounded-lg inline-flex items-center justify-center gap-2 text-sm font-medium shrink-0"
					type="button"
					onClick={() => void refreshSpeechRuntime({ silent: false })}
				>
					<Activity className="w-4 h-4 shrink-0" />
					<span>Проверить шлюз</span>
				</button>
			</div>
		</div>
	);
};
