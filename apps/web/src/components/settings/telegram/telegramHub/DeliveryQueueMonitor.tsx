import React, { useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	RefreshCw,
	RotateCw,
	Send,
	Trash2,
	Users,
} from "lucide-react";
import { showToast } from "../../../GlobalToast";
import { INITIAL_TELEGRAM_QUEUE_ITEMS } from "./constants";
import type { TelegramDeliveryQueueItem } from "./types";

export interface DeliveryQueueMonitorProps {
	clinicId?: string;
}

export function DeliveryQueueMonitor({ clinicId: _clinicId }: DeliveryQueueMonitorProps) {
	const [queueItems, setQueueItems] = useState<TelegramDeliveryQueueItem[]>(
		INITIAL_TELEGRAM_QUEUE_ITEMS,
	);
	const [filterStatus, setFilterStatus] = useState<
		"all" | "queued" | "sent" | "failed"
	>("all");
	const [isRetrying, setIsRetrying] = useState<boolean>(false);

	const filteredItems = queueItems.filter((item) => {
		if (filterStatus === "all") return true;
		return item.status === filterStatus;
	});

	const handleRetryFailed = async () => {
		try {
			setIsRetrying(true);
			// Имитируем повторную отправку для элементов с ошибками
			setQueueItems((prev) =>
				prev.map((item) =>
					item.status === "failed" || item.status === "queued"
						? {
								...item,
								status: "sent" as const,
								attempts: item.attempts + 1,
								lastAttemptAt: new Date().toISOString(),
						  }
						: item,
				),
			);
			showToast("Сообщения успешно отправлены в Telegram", "success");
		} catch (err) {
			showToast(`Ошибка повторной отправки: ${String(err)}`, "error");
		} finally {
			setIsRetrying(false);
		}
	};

	const handleClearSent = () => {
		setQueueItems((prev) => prev.filter((item) => item.status !== "sent"));
		showToast("Журнал отправленных сообщений очищен", "info");
	};

	const getStatusBadge = (status: TelegramDeliveryQueueItem["status"]) => {
		switch (status) {
			case "sent":
				return (
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "11px",
							padding: "2px 8px",
							borderRadius: "4px",
							background: "rgba(16, 185, 129, 0.15)",
							color: "#10b981",
							fontWeight: 600,
						}}
					>
						<CheckCircle2 size={12} />
						<span>Доставлено</span>
					</span>
				);
			case "queued":
				return (
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "11px",
							padding: "2px 8px",
							borderRadius: "4px",
							background: "rgba(245, 158, 11, 0.15)",
							color: "#f59e0b",
							fontWeight: 600,
						}}
					>
						<Clock size={12} />
						<span>В очереди</span>
					</span>
				);
			case "failed":
				return (
					<span
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "4px",
							fontSize: "11px",
							padding: "2px 8px",
							borderRadius: "4px",
							background: "rgba(239, 68, 68, 0.15)",
							color: "#ef4444",
							fontWeight: 600,
						}}
					>
						<AlertCircle size={12} />
						<span>Ошибка</span>
					</span>
				);
			default:
				return (
					<span
						style={{
							fontSize: "11px",
							padding: "2px 8px",
							borderRadius: "4px",
							background: "var(--line)",
							color: "var(--muted)",
						}}
					>
						{status}
					</span>
				);
		}
	};

	return (
		<div className="tg-hub-content-card" data-testid="tg-queue-monitor-pane">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: "16px",
				}}
			>
				<div>
					<div
						style={{
							fontSize: "16px",
							fontWeight: 700,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<Send size={18} color="var(--teal)" />
						<span>Очередь и журнал доставки сообщений</span>
					</div>
					<div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
						Мониторинг статуса отправки сервисных уведомлений пациентам
					</div>
				</div>

				<div style={{ display: "flex", gap: "8px" }}>
					<button
						type="button"
						className="tg-btn-secondary"
						onClick={handleClearSent}
						title="Очистить доставленные сообщения"
					>
						<Trash2 size={14} />
						<span>Очистить доставленные</span>
					</button>
					<button
						type="button"
						className="tg-btn-primary"
						onClick={handleRetryFailed}
						disabled={isRetrying}
					>
						<RotateCw size={14} className={isRetrying ? "animate-spin" : ""} />
						<span>{isRetrying ? "Отправка..." : "Отправить очередь"}</span>
					</button>
				</div>
			</div>

			{/* Фильтры по статусам */}
			<div
				style={{
					display: "flex",
					gap: "8px",
					marginBottom: "14px",
				}}
			>
				{(
					[
						{ id: "all", label: "Все" },
						{ id: "queued", label: "В очереди" },
						{ id: "sent", label: "Доставлены" },
						{ id: "failed", label: "Ошибки" },
					] as const
				).map((f) => (
					<button
						key={f.id}
						type="button"
						className={`tg-hub-tab-btn ${filterStatus === f.id ? "active" : ""}`}
						style={{ minHeight: "32px", padding: "4px 12px", fontSize: "12px" }}
						onClick={() => setFilterStatus(f.id)}
					>
						{f.label}
					</button>
				))}
			</div>

			{/* Список сообщений */}
			{filteredItems.length === 0 ? (
				<div
					style={{
						textAlign: "center",
						padding: "32px",
						color: "var(--muted)",
						fontSize: "13px",
					}}
				>
					В выбранной категории нет сообщений
				</div>
			) : (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					{filteredItems.map((item) => (
						<div
							key={item.id}
							style={{
								padding: "12px 14px",
								background: "var(--paper-soft)",
								border: "1px solid var(--line)",
								borderRadius: "8px",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "16px",
							}}
						>
							<div style={{ flex: 1, minWidth: 0 }}>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px",
										marginBottom: "4px",
									}}
								>
									<span style={{ fontWeight: 600, fontSize: "13px", color: "var(--ink)" }}>
										{item.recipientName}
									</span>
									{item.recipientPhone && (
										<span style={{ fontSize: "12px", color: "var(--muted)" }}>
											{item.recipientPhone}
										</span>
									)}
									{getStatusBadge(item.status)}
								</div>
								<div
									style={{
										fontSize: "12px",
										color: "var(--ink)",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{item.messageText}
								</div>
							</div>

							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "flex-end",
									gap: "2px",
									fontSize: "11px",
									color: "var(--muted)",
									whiteSpace: "nowrap",
								}}
							>
								<span>Попыток: {item.attempts}/{item.maxAttempts}</span>
								<span>
									{new Date(item.lastAttemptAt || item.createdAt).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
