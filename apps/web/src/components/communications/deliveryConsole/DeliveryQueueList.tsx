import React from "react";
import { formatMoment } from "../deliveryReportNotice.js";
import { channelLabels, statusLabels } from "./constants";
import { DeliveryStatusBadge } from "./DeliveryStatusBadge";
import type { OutboxItem } from "./types";

export interface DeliveryQueueListProps {
	outbox: OutboxItem[];
	summary: Record<string, number>;
	statusFilter: string;
	setStatusFilter: (filter: string) => void;
	busy: boolean;
	outboxAction: (outboxId: string, action: "cancel" | "retry") => Promise<void>;
}

export function DeliveryQueueList({
	outbox,
	summary,
	statusFilter,
	setStatusFilter,
	busy,
	outboxAction,
}: DeliveryQueueListProps) {
	return (
		<>
			{/* ── Журнал ────────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Журнал отправки</h3>
			<fieldset className="quick-chips-row p-0 m-0 border-0">
				<legend className="sr-only">Фильтр по состоянию</legend>
				<button
					type="button"
					className={`quick-chip ${statusFilter === "" ? "selected" : ""}`}
					aria-pressed={statusFilter === ""}
					onClick={() => setStatusFilter("")}
				>
					Все
				</button>
				{Object.entries(statusLabels).map(([code, label]) => (
					<button
						key={code}
						type="button"
						className={`quick-chip ${statusFilter === code ? "selected" : ""}`}
						aria-pressed={statusFilter === code}
						onClick={() => setStatusFilter(code)}
					>
						{label}
						{summary?.[code] ? ` · ${summary[code]}` : ""}
					</button>
				))}
			</fieldset>

			{(outbox ?? []).length === 0 ? (
				<p className="ops-empty">Сообщений с такими условиями нет.</p>
			) : (
				<div className="ops-table-wrap">
					<table className="ops-table">
						<thead>
							<tr>
								<th scope="col">Создано</th>
								<th scope="col">Канал</th>
								<th scope="col">Получатель</th>
								<th scope="col">Текст</th>
								<th scope="col">Состояние</th>
								<th scope="col">Действие</th>
							</tr>
						</thead>
						<tbody>
							{(outbox || []).map((item) => (
								<tr key={item.id}>
									<td className="ops-time" data-label="Создано">
										{formatMoment(item.createdAt)}
									</td>
									<td data-label="Канал">
										{channelLabels[item.channel] ?? item.channel}
									</td>
									<td data-label="Получатель">{item.recipientAddress}</td>
									<td data-label="Текст" title={item?.body ?? ""}>
										{(item?.body ?? "").length > 80
											? `${(item?.body ?? "").slice(0, 80)}…`
											: (item?.body ?? "")}
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
										{item.status === "queued" || item.status === "sending" ? (
											<button
												className="secondary-button"
												type="button"
												disabled={busy}
												onClick={() => void outboxAction(item.id, "cancel")}
											>
												Отменить
											</button>
										) : item.status === "failed" ||
											item.status === "cancelled" ||
											item.status === "suppressed" ? (
											<button
												className="secondary-button"
												type="button"
												disabled={busy}
												onClick={() => void outboxAction(item.id, "retry")}
											>
												Повторить
											</button>
										) : (
											"—"
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}
