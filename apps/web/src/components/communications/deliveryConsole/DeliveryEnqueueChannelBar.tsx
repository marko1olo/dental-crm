import React from "react";
import { channelLabels, intentLabels } from "./constants";

export interface DeliveryEnqueueChannelBarProps {
	enqueueChannel: "sms" | "email" | "whatsapp" | "telegram";
	setEnqueueChannel: (channel: "sms" | "email" | "whatsapp" | "telegram") => void;
	enqueueIntent: string;
	setEnqueueIntent: (intent: string) => void;
	enqueueScope: "service" | "marketing";
	setEnqueueScope: (scope: "service" | "marketing") => void;
	setEnqueueTemplateId: (id: string) => void;
}

export function DeliveryEnqueueChannelBar({
	enqueueChannel,
	setEnqueueChannel,
	enqueueIntent,
	setEnqueueIntent,
	enqueueScope,
	setEnqueueScope,
	setEnqueueTemplateId,
}: DeliveryEnqueueChannelBarProps) {
	return (
		<div className="ops-toolbar">
			<span className="ops-field">
				<label htmlFor="enqueue-channel">Канал</label>
				<select
					id="enqueue-channel"
					data-testid="outbox-enqueue-channel"
					value={enqueueChannel}
					onChange={(event) => {
						setEnqueueChannel(event.target.value as "sms" | "email" | "whatsapp" | "telegram");
						setEnqueueTemplateId("");
					}}
				>
					{(["sms", "email", "whatsapp", "telegram"] as const).map((code) => (
						<option key={code} value={code}>
							{channelLabels[code]}
						</option>
					))}
				</select>
			</span>

			<span className="ops-field ops-field--grow">
				<label htmlFor="enqueue-intent">Назначение</label>
				<select
					id="enqueue-intent"
					data-testid="outbox-enqueue-intent"
					value={enqueueIntent}
					onChange={(event) => setEnqueueIntent(event.target.value)}
				>
					{Object.entries(intentLabels).map(([code, label]) => (
						<option key={code} value={code}>
							{label}
						</option>
					))}
				</select>
			</span>

			<span className="ops-field">
				<label htmlFor="enqueue-scope">Тип</label>
				<select
					id="enqueue-scope"
					data-testid="outbox-enqueue-scope"
					value={enqueueScope}
					onChange={(event) => setEnqueueScope(event.target.value as "service" | "marketing")}
				>
					<option value="service">Сервисное</option>
					<option value="marketing">Рекламное</option>
				</select>
			</span>
		</div>
	);
}
