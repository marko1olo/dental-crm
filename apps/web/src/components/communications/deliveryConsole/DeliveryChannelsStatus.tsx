import React from "react";
import { formatSmsBalance } from "../deliveryReportNotice.js";
import { channelLabels } from "./constants";
import { DeliveryAutomaticSendingAlert } from "./DeliveryAutomaticSendingAlert";
import { DeliveryZeroChannelsAlert } from "./DeliveryZeroChannelsAlert";
import type { ChannelCode, GatewayStatus } from "./types";

export interface DeliveryChannelsStatusProps {
	gateways: GatewayStatus | null;
	configuredChannels: ChannelCode[];
	uisQuota: { remaining: number; smsQuotaLimit: number } | null;
}

export function DeliveryChannelsStatus({
	gateways,
	configuredChannels,
	uisQuota,
}: DeliveryChannelsStatusProps) {
	const sms = gateways?.channels?.sms;

	return (
		<>
			<DeliveryAutomaticSendingAlert gateways={gateways} configuredChannels={configuredChannels} />
			<h3 className="ops-section-title">Каналы</h3>
			{gateways === null ? (
				<p>Загружаю состояние каналов…</p>
			) : (
				<>
					{configuredChannels.length === 0 ? <DeliveryZeroChannelsAlert /> : null}
					{configuredChannels.length > 0 ? (
						<ul className="quick-chips-row ops-channel-list">
							{(Object.keys(gateways?.channels ?? {}) as ChannelCode[]).map((code) => {
								const channel = gateways?.channels?.[code];
								return (
									<li key={code}>
										<span className={`ops-state ops-state--${channel?.configured ? "ok" : "muted"}`}>
											{channelLabels[code] ?? code}: {channel?.configured ? "настроен" : "не настроен"}
										</span>
									</li>
								);
							})}
						</ul>
					) : null}
					{sms?.configured ? (
						<p className="ops-hint">
							SMS-шлюз: {sms?.provider ?? "—"}
							{sms?.sender ? `, отправитель ${sms.sender}` : ""}.{" "}
							{sms?.balance
								? `Остаток ${formatSmsBalance(sms.balance)} ${sms?.balance?.currency ?? ""}.`
								: sms?.balanceError
									? `Остаток не получен: ${sms.balanceError}`
									: ""}
							{uisQuota && (
								<span className={(uisQuota?.remaining ?? 0) <= 0 ? "text-[var(--bad-fg)] font-bold ml-2" : "ml-2"}>
									Лимит UIS SMS: {(uisQuota?.smsQuotaLimit ?? 0) - (uisQuota?.remaining ?? 0)}/{uisQuota?.smsQuotaLimit ?? 0}
								</span>
							)}
						</p>
					) : null}
				</>
			)}
		</>
	);
}
