import React from "react";
import type { ChannelCode, GatewayStatus } from "./types";

export function DeliveryAutomaticSendingAlert({
	gateways,
	configuredChannels,
}: {
	gateways: GatewayStatus | null;
	configuredChannels: ChannelCode[];
}) {
	if (!gateways || configuredChannels.length === 0 || gateways?.automaticSending?.enabled || (gateways?.automaticSending?.waiting ?? 0) <= 0) {
		return null;
	}

	const waitingCount = gateways?.automaticSending?.waiting ?? 0;
	const oldestTime = gateways?.automaticSending?.oldestWaitingAt
		? `, самое раннее с ${new Date(gateways.automaticSending.oldestWaitingAt).toLocaleString("ru-RU")}`
		: "";

	return (
		<div className="ops-notice ops-notice--error" role="alert">
			<strong>Сообщения не отправляются: ждут в очереди {waitingCount}{oldestTime}.</strong>
			<p>
				Автоматическая отправка выключена на сервере. Разослать накопившееся прямо сейчас можно кнопкой «Отправить из очереди» выше; чтобы сообщения уходили сами, тот, кто устанавливал программу, включает переменную {gateways?.automaticSending?.enableWith ?? ""}.
			</p>
		</div>
	);
}
