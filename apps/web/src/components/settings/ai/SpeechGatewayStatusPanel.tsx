import { Activity } from "lucide-react";

export function SpeechGatewayStatusPanel({
	speechGatewayStatus,
	speechGatewayCanUpload,
	refreshSpeechRuntime,
	speechGatewayHealthReport,
}: {
	speechGatewayStatus: any;
	speechGatewayCanUpload: (status: any) => boolean;
	refreshSpeechRuntime: (options: { silent: boolean }) => void;
	speechGatewayHealthReport: any;
}) {
	return (
		<>
			{speechGatewayStatus ? (
				<div className="ai-gateway-status">
					<div
						className={`ai-gateway-status-pill ${speechGatewayCanUpload(speechGatewayStatus) ? "success" : "warning"}`}
					>
						<span>Статус сервера</span>
						<strong>
							{speechGatewayCanUpload(speechGatewayStatus)
								? "Подключено"
								: "Не активно"}
						</strong>
					</div>
					<div className="ai-gateway-status-pill">
						<span>Провайдер</span>
						<strong>{speechGatewayStatus.providerLabel}</strong>
					</div>
					<div className="ai-gateway-status-pill">
						<span>Отсев дублей</span>
						<strong>
							{speechGatewayStatus.chunkingPolicy.dedupeWindowChars} симв.
						</strong>
					</div>
					<div className="ai-gateway-status-pill">
						<span>Стоматологический словарь</span>
						<strong>
							{speechGatewayStatus.promptPolicy.enabled
								? `Включен (${speechGatewayStatus.promptPolicy.termCount} терм.)`
								: "Выключен"}
						</strong>
					</div>
					<div
						className="ai-gateway-status-pill"
						style={{ borderRight: "none", marginLeft: "auto" }}
					>
						<button
							className="secondary-button btn--sm"
							type="button"
							onClick={() => void refreshSpeechRuntime({ silent: false })}
						>
							<Activity size={14} style={{ marginRight: "6px" }} /> Проверить
							шлюз
						</button>
					</div>
				</div>
			) : null}

			{speechGatewayHealthReport ? (
				<div
					className="ai-gateway-status"
					style={{
						background: "rgba(13, 148, 136, 0.05)",
						borderColor: "rgba(13, 148, 136, 0.2)",
					}}
				>
					<div className="ai-gateway-status-pill">
						<span>Пул ключей</span>
						<strong>
							{speechGatewayHealthReport.totalAvailableKeys} из{" "}
							{speechGatewayHealthReport.totalConfiguredKeys}
						</strong>
					</div>
					<div className="ai-gateway-status-pill">
						<span>Резервных каналов</span>
						<strong>
							{speechGatewayHealthReport.fallbackProviderIds.length}
						</strong>
					</div>
					<div className="ai-gateway-status-pill">
						<span>Таймаут</span>
						<strong>
							{Math.round(speechGatewayHealthReport.timeoutMs / 1000)} сек.
						</strong>
					</div>
					{speechGatewayHealthReport.warnings[0] && (
						<div
							className="ai-gateway-status-pill warning"
							style={{ flex: 1, border: "none" }}
						>
							<span>Внимание</span>
							<strong>{speechGatewayHealthReport.warnings[0]}</strong>
						</div>
					)}
				</div>
			) : null}
		</>
	);
}
