import React from "react";
import { formatMoment } from "../deliveryReportNotice.js";
import { channelLabels } from "./constants";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import type { OutboxItem } from "./types";

export interface DeliveryQueueRowProps {
	item: OutboxItem;
	busy: boolean;
	outboxAction: (outboxId: string, action: "cancel" | "retry") => Promise<void>;
}

export function DeliveryQueueRow({ item, busy, outboxAction }: DeliveryQueueRowProps) {
	const isPending = item.status === "queued" || item.status === "sending";
	const isFailedOrCancelled = item.status === "failed" || item.status === "cancelled" || item.status === "suppressed";

	return (
		<tr>
			<td className="ops-time" data-label="Создано">{formatMoment(item.createdAt)}</td>
			<td data-label="Канал">{channelLabels[item.channel] ?? item.channel}</td>
			<td data-label="Получатель">{item.recipientAddress}</td>
			<td data-label="Текст" title={item?.body ?? ""}>
				{(item?.body ?? "").length > 80 ? `${(item?.body ?? "").slice(0, 80)}…` : (item?.body ?? "")}
			</td>
			<td data-label="Состояние">
				<DeliveryStatusBadge
					status={item.status}
					lastErrorMessage={item.lastErrorMessage}
					attempts={item.attempts}
					maxAttempts={item.maxAttempts}
				/>
			</td>
			<td data-label="Действие">
				{isPending ? (
					<button className="secondary-button" type="button" disabled={busy} onClick={() => void outboxAction(item.id, "cancel")}>
						Отменить
					</button>
				) : isFailedOrCancelled ? (
					<button className="secondary-button" type="button" disabled={busy} onClick={() => void outboxAction(item.id, "retry")}>
						Повторить
					</button>
				) : (
					"—"
				)}
			</td>
		</tr>
	);
}
