import React from "react";
import type { SpeechGatewayHealthReport, SpeechGatewayStatus } from "@dental/shared";
import { Activity, Bot, UploadCloud } from "lucide-react";

export interface SpeechGatewayStatusCardProps {
	speechGatewayHealthReport: SpeechGatewayHealthReport | null;
	speechGatewayStatus: SpeechGatewayStatus | null;
	refreshSpeechRuntime: (options: { silent?: boolean }) => void | Promise<void>;
	speechGatewayCanUpload?: (status: SpeechGatewayStatus | null) => boolean;
}

export const SpeechGatewayStatusCard: React.FC<SpeechGatewayStatusCardProps> = ({
	speechGatewayHealthReport,
	speechGatewayStatus,
	refreshSpeechRuntime,
	speechGatewayCanUpload,
}) => {
	const canUpload = speechGatewayCanUpload ? speechGatewayCanUpload(speechGatewayStatus) : false;

	return (
		<div className="ai-section-header">
			<div className="ai-section-icon"><Bot size={24} /></div>
			<div className="ai-section-title">
				<h3>Речевой шлюз и распознавание диктовок</h3>
				<p>Подключение локальных моделей Whisper, облачных транскрибаторов и Yandex SpeechKit</p>
			</div>
			<div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
				{canUpload && (
					<button className="primary-button btn--sm" type="button" onClick={() => void refreshSpeechRuntime({ silent: false })}>
						<UploadCloud size={14} style={{ marginRight: "6px" }} />
						Проверить шлюз
					</button>
				)}
				<button className="secondary-button btn--sm" type="button" onClick={() => void refreshSpeechRuntime({ silent: false })}>
					<Activity size={14} style={{ marginRight: "6px" }} />
					Обновить статус
				</button>
			</div>
		</div>
	);
};
