import React, { useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertCircle, RefreshCw, Radio } from "lucide-react";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";

export interface ImportProgressEvent {
	taskId: string;
	phase:
		| "upload"
		| "discovery"
		| "parsing"
		| "validation"
		| "staging"
		| "committing"
		| "done"
		| "error";
	percent: number;
	processed: number;
	total: number;
	message: string;
	error?: string;
}

const phaseLabels: Record<ImportProgressEvent["phase"], string> = {
	upload: "Загрузка файла",
	discovery: "Обнаружение источников",
	parsing: "Парсинг и разбор формата",
	validation: "Клиническая валидация",
	staging: "Подготовка предпросмотра",
	committing: "Запись в базу данных",
	done: "Завершено успешно",
	error: "Ошибка обработки",
};

interface MigrationStreamProgressProps {
	activeTaskId?: string;
	onCompleted?: () => void;
}

export function MigrationStreamProgress({
	activeTaskId,
	onCompleted,
}: MigrationStreamProgressProps) {
	const [connected, setConnected] = useState(false);
	const [progress, setProgress] = useState<ImportProgressEvent | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		let isMounted = true;
		let reconnectTimer: number | null = null;

		const dispatchEvent = (rawData: string) => {
			try {
				const data = JSON.parse(rawData) as ImportProgressEvent;
				if (!activeTaskId || data.taskId === activeTaskId) {
					setProgress(data);
					if (data.phase === "done" && onCompleted) {
						onCompleted();
					}
				}
			} catch (err) {
				clientLogger.warn("[MigrationStream] Failed to parse progress event:", err);
			}
		};

		async function connectSseWithAuth() {
			try {
				const res = await fetch("/api/imports/smart/progress/stream", {
					method: "GET",
					headers: denteClinicalReadHeaders({
						Accept: "text/event-stream",
					}),
					signal: controller.signal,
				});
				if (!res.ok || !res.body) {
					if (isMounted) setConnected(false);
					return;
				}
				if (isMounted) setConnected(true);

				const reader = res.body.getReader();
				const decoder = new TextDecoder("utf-8");
				let buffer = "";
				let currentEvent = "message";
				let dataLines: string[] = [];

				const flushFrame = () => {
					if (dataLines.length > 0 && currentEvent === "progress") {
						dispatchEvent(dataLines.join("\n"));
					}
					currentEvent = "message";
					dataLines = [];
				};

				while (isMounted && !controller.signal.aborted) {
					const { value, done } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });

					const lines = buffer.split(/\r?\n/);
					buffer = lines.pop() ?? "";
					for (const line of lines) {
						if (line === "") {
							flushFrame();
							continue;
						}
						if (line.startsWith(":")) continue;
						if (line.startsWith("event:")) {
							currentEvent = line.slice(6).trim();
						} else if (line.startsWith("data:")) {
							dataLines.push(line.slice(5).trimStart());
						}
					}
				}
				flushFrame();
				if (isMounted) setConnected(false);
			} catch (err) {
				if (!controller.signal.aborted && isMounted) {
					clientLogger.warn("[MigrationStream] SSE stream disconnected:", err);
					setConnected(false);
					reconnectTimer = window.setTimeout(() => {
						if (isMounted && !controller.signal.aborted) {
							void connectSseWithAuth();
						}
					}, 3000);
				}
			}
		}

		void connectSseWithAuth();

		return () => {
			isMounted = false;
			controller.abort();
			if (reconnectTimer !== null) {
				window.clearTimeout(reconnectTimer);
			}
		};
	}, [activeTaskId, onCompleted]);

	if (!progress && !connected) {
		return null;
	}

	const isError = progress?.phase === "error";
	const isDone = progress?.phase === "done";
	const percent = Math.min(100, Math.max(0, progress?.percent ?? (connected ? 0 : 0)));

	return (
		<div
			data-testid="migration-stream-progress-panel"
			className="migration-stream-panel"
			style={{
				padding: "1rem",
				borderRadius: "8px",
				border: isError
					? "1px solid var(--danger, #ef4444)"
					: "1px solid var(--glass-border, rgba(0, 0, 0, 0.1))",
				background: "var(--paper, #ffffff)",
				marginBottom: "1rem",
				boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
			}}
		>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "0.5rem",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<Radio
						size={16}
						style={{
							color: connected ? "var(--success, #10b981)" : "var(--muted, #94a3b8)",
						}}
					/>
					<span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
						Потоковый прогресс миграции (SSE)
					</span>
					{progress && (
						<span
							className="badge"
							style={{
								fontSize: "0.75rem",
								padding: "0.15rem 0.5rem",
								borderRadius: "4px",
								background: isError
									? "var(--danger-bg, #fee2e2)"
									: isDone
										? "var(--success-bg, #dcfce7)"
										: "var(--primary-bg, #e0f2fe)",
								color: isError
									? "var(--danger, #b91c1c)"
									: isDone
										? "var(--success, #15803d)"
										: "var(--primary, #0369a1)",
							}}
						>
							{phaseLabels[progress.phase] ?? progress.phase}
						</span>
					)}
				</div>
				<span
					style={{
						fontSize: "0.75rem",
						color: connected ? "var(--success, #10b981)" : "var(--muted, #94a3b8)",
					}}
				>
					{connected ? "● Онлайн-канал" : "○ Ожидание соединения"}
				</span>
			</div>

			{progress && (
				<>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: "0.8125rem",
							marginBottom: "0.25rem",
							color: "var(--ink, #1e293b)",
						}}
					>
						<span>{progress.message || "Обработка..."}</span>
						<span>
							{progress.total > 0
								? `${progress.processed} / ${progress.total} (${percent}%)`
								: `${percent}%`}
						</span>
					</div>

					<div
						style={{
							height: "6px",
							background: "var(--surface-subtle, #f1f5f9)",
							borderRadius: "3px",
							overflow: "hidden",
							position: "relative",
						}}
					>
						<div
							style={{
								width: `${percent}%`,
								height: "100%",
								background: isError
									? "var(--danger, #ef4444)"
									: isDone
										? "var(--success, #10b981)"
										: "var(--primary, #2563eb)",
								transition: "width 0.3s ease",
							}}
						/>
					</div>

					{progress.error && (
						<div
							style={{
								marginTop: "0.5rem",
								fontSize: "0.75rem",
								color: "var(--danger, #b91c1c)",
								display: "flex",
								alignItems: "center",
								gap: "0.25rem",
							}}
						>
							<AlertCircle size={14} />
							<span>{progress.error}</span>
						</div>
					)}
				</>
			)}
		</div>
	);
}
