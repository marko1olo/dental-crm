import {
	Calendar,
	CheckCircle2,
	Clock,
	FileArchive,
	Play,
	ShieldCheck,
	Square,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import type { AutoBackupScheduleStatus } from "../../../services/offline/offlineBackupService";

export interface BackupScheduleConfigProps {
	readonly schedulerStatus: AutoBackupScheduleStatus;
	readonly schedulerIntervalMin: number;
	readonly setSchedulerIntervalMin: (v: number) => void;
	readonly handleToggleScheduler: () => void;
}

export const BackupScheduleConfig: React.FC<BackupScheduleConfigProps> = ({
	schedulerStatus,
	schedulerIntervalMin,
	setSchedulerIntervalMin,
	handleToggleScheduler,
}) => {
	const [scheduleMode, setScheduleMode] = useState<"nightly" | "interval">("nightly");
	const [nightlyTime, setNightlyTime] = useState<string>("03:00");
	const [retentionDays, setRetentionDays] = useState<number>(30);
	const [compressionAlgorithm, setCompressionAlgorithm] = useState<"zstd" | "gzip">("zstd");

	const isRunning = schedulerStatus.isRunning;

	return (
		<div
			style={{
				background: "var(--paper, #ffffff)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "12px",
				padding: "16px 20px",
				marginBottom: "16px",
				boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
			}}
			data-testid="backup-schedule-config-card"
		>
			{/* HEADER */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "12px",
					marginBottom: "16px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: "40px",
							height: "40px",
							borderRadius: "10px",
							background: isRunning
								? "rgba(16, 185, 129, 0.12)"
								: "rgba(13, 148, 136, 0.12)",
							color: isRunning ? "var(--ok-fg, #10b981)" : "var(--teal)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Clock size={20} />
					</div>
					<div>
						<h4
							style={{
								margin: 0,
								fontSize: "15px",
								fontWeight: 600,
								color: "var(--ink, #1e293b)",
							}}
						>
							Автономное расписание резервного копирования
						</h4>
						<p
							style={{
								margin: "3px 0 0",
								fontSize: "12.5px",
								color: "var(--muted, #64748b)",
							}}
						>
							Ночной дамп данных, хранение 30 дней и сжатие Zstandard в локальный сейф
						</p>
					</div>
				</div>

				{/* RUN/STOP BUTTON */}
				<button
					type="button"
					onClick={handleToggleScheduler}
					style={{
						minHeight: "38px",
						padding: "0 16px",
						borderRadius: "8px",
						border: "none",
						background: isRunning ? "var(--bad-fg, #ef4444)" : "var(--teal)",
						color: "#ffffff",
						fontWeight: 600,
						fontSize: "13px",
						cursor: "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "8px",
						boxShadow: isRunning
							? "0 2px 4px rgba(239, 68, 68, 0.2)"
							: "0 2px 4px rgba(13, 148, 136, 0.2)",
						transition: "all 0.15s ease",
					}}
					className="touch-manipulation"
					data-testid="toggle-auto-backup-btn"
				>
					{isRunning ? <Square size={15} /> : <Play size={15} />}
					<span>{isRunning ? "Остановить расписание" : "Запустить расписание"}</span>
				</button>
			</div>

			{/* CONFIG TILES GRID */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
					gap: "12px",
					marginBottom: "16px",
				}}
			>
				{/* 1. DUMP MODE & TIME */}
				<div
					style={{
						padding: "12px 14px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							fontWeight: 600,
							color: "var(--ink, #1e293b)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							marginBottom: "8px",
						}}
					>
						<Calendar size={14} color="var(--teal)" />
						<span>Режим расписания</span>
					</div>
					<div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
						<button
							type="button"
							onClick={() => setScheduleMode("nightly")}
							disabled={isRunning}
							style={{
								flex: 1,
								padding: "5px 8px",
								fontSize: "12px",
								borderRadius: "6px",
								border: scheduleMode === "nightly" ? "1px solid var(--teal)" : "1px solid var(--line)",
								background: scheduleMode === "nightly" ? "var(--teal-surface, rgba(13,148,136,0.1))" : "var(--paper)",
								color: scheduleMode === "nightly" ? "var(--teal)" : "var(--muted)",
								fontWeight: scheduleMode === "nightly" ? 600 : 500,
								cursor: isRunning ? "not-allowed" : "pointer",
							}}
						>
							Ночной (03:00)
						</button>
						<button
							type="button"
							onClick={() => setScheduleMode("interval")}
							disabled={isRunning}
							style={{
								flex: 1,
								padding: "5px 8px",
								fontSize: "12px",
								borderRadius: "6px",
								border: scheduleMode === "interval" ? "1px solid var(--teal)" : "1px solid var(--line)",
								background: scheduleMode === "interval" ? "var(--teal-surface, rgba(13,148,136,0.1))" : "var(--paper)",
								color: scheduleMode === "interval" ? "var(--teal)" : "var(--muted)",
								fontWeight: scheduleMode === "interval" ? 600 : 500,
								cursor: isRunning ? "not-allowed" : "pointer",
							}}
						>
							Интервальный
						</button>
					</div>
					{scheduleMode === "nightly" ? (
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<span style={{ fontSize: "12px", color: "var(--muted)" }}>Время запуска:</span>
							<input
								type="time"
								value={nightlyTime}
								onChange={(e) => setNightlyTime(e.target.value)}
								disabled={isRunning}
								style={{
									padding: "4px 8px",
									borderRadius: "6px",
									border: "1px solid var(--line)",
									background: "var(--paper)",
									color: "var(--ink)",
									fontSize: "12px",
								}}
							/>
						</div>
					) : (
						<select
							value={schedulerIntervalMin}
							onChange={(e) => setSchedulerIntervalMin(Number(e.target.value))}
							disabled={isRunning}
							style={{
								width: "100%",
								minHeight: "34px",
								padding: "0 8px",
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								fontSize: "12px",
							}}
						>
							<option value={15}>Каждые 15 минут</option>
							<option value={30}>Каждые 30 минут</option>
							<option value={60}>Каждый 1 час (рекомендуется)</option>
							<option value={180}>Каждые 3 часа</option>
							<option value={360}>Каждые 6 часов</option>
							<option value={720}>Каждые 12 часов</option>
							<option value={1440}>1 раз в сутки (24 часа)</option>
						</select>
					)}
				</div>

				{/* 2. RETENTION PERIOD (30 DAYS) */}
				<div
					style={{
						padding: "12px 14px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							fontWeight: 600,
							color: "var(--ink, #1e293b)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							marginBottom: "8px",
						}}
					>
						<ShieldCheck size={14} color="var(--teal)" />
						<span>Хранение резервных копий</span>
					</div>
					<select
						value={retentionDays}
						onChange={(e) => setRetentionDays(Number(e.target.value))}
						disabled={isRunning}
						style={{
							width: "100%",
							minHeight: "34px",
							padding: "0 8px",
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: "var(--paper)",
							color: "var(--ink)",
							fontSize: "12px",
							marginBottom: "6px",
						}}
					>
						<option value={7}>7 дней (быстрая ротация)</option>
						<option value={14}>14 дней (2 недели)</option>
						<option value={30}>30 дней (стандарт клиники РФ)</option>
						<option value={60}>60 дней (2 месяца)</option>
						<option value={90}>90 дней (квартальное хранение)</option>
					</select>
					<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
						Слепки старше {retentionDays} дн. удаляются автоматически.
					</div>
				</div>

				{/* 3. COMPRESSION ALGORITHM (ZSTD) */}
				<div
					style={{
						padding: "12px 14px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "12px",
							fontWeight: 600,
							color: "var(--ink, #1e293b)",
							display: "flex",
							alignItems: "center",
							gap: "6px",
							marginBottom: "8px",
						}}
					>
						<Zap size={14} color="var(--teal)" />
						<span>Алгоритм сжатия архива</span>
					</div>
					<div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
						<button
							type="button"
							onClick={() => setCompressionAlgorithm("zstd")}
							disabled={isRunning}
							style={{
								flex: 1,
								padding: "5px 8px",
								fontSize: "12px",
								borderRadius: "6px",
								border: compressionAlgorithm === "zstd" ? "1px solid var(--teal)" : "1px solid var(--line)",
								background: compressionAlgorithm === "zstd" ? "var(--teal-surface, rgba(13,148,136,0.1))" : "var(--paper)",
								color: compressionAlgorithm === "zstd" ? "var(--teal)" : "var(--muted)",
								fontWeight: compressionAlgorithm === "zstd" ? 600 : 500,
								cursor: isRunning ? "not-allowed" : "pointer",
							}}
						>
							ZSTD (до 85%)
						</button>
						<button
							type="button"
							onClick={() => setCompressionAlgorithm("gzip")}
							disabled={isRunning}
							style={{
								flex: 1,
								padding: "5px 8px",
								fontSize: "12px",
								borderRadius: "6px",
								border: compressionAlgorithm === "gzip" ? "1px solid var(--teal)" : "1px solid var(--line)",
								background: compressionAlgorithm === "gzip" ? "var(--teal-surface, rgba(13,148,136,0.1))" : "var(--paper)",
								color: compressionAlgorithm === "gzip" ? "var(--teal)" : "var(--muted)",
								fontWeight: compressionAlgorithm === "gzip" ? 600 : 500,
								cursor: isRunning ? "not-allowed" : "pointer",
							}}
						>
							GZIP (стандарт)
						</button>
					</div>
					<div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
						Сжатие без потерь перед AES-GCM-256 шифрованием.
					</div>
				</div>
			</div>

			{/* STATUS STRIP */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
					padding: "8px 12px",
					borderRadius: "6px",
					background: isRunning ? "rgba(16, 185, 129, 0.08)" : "var(--paper-soft)",
					border: isRunning ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--line)",
					fontSize: "12.5px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
					<span
						style={{
							width: "8px",
							height: "8px",
							borderRadius: "50%",
							background: isRunning ? "var(--ok-fg, #10b981)" : "var(--muted, #94a3b8)",
						}}
					/>
					<span style={{ fontWeight: 600, color: "var(--ink)" }}>
						{isRunning ? "Планировщик активен" : "Планировщик остановлен"}
					</span>
					{isRunning && (
						<span style={{ color: "var(--muted)" }}>
							(ночной дамп в {nightlyTime}, хранение {retentionDays} дн., {compressionAlgorithm.toUpperCase()})
						</span>
					)}
				</div>
				{schedulerStatus.nextScheduledRunAt && (
					<div style={{ color: "var(--muted)" }}>
						Следующий слепок:{" "}
						<strong style={{ color: "var(--ink)" }}>
							{new Date(schedulerStatus.nextScheduledRunAt).toLocaleTimeString("ru-RU", {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</strong>
					</div>
				)}
			</div>
		</div>
	);
};
