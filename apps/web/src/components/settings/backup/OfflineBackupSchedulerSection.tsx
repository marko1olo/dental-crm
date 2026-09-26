import { Clock, Play, RefreshCw, Square, Trash2 } from "lucide-react";
import type React from "react";
import type { LocalVaultSnapshotMeta } from "../../../services/offline/offlineBackupService";

export interface OfflineBackupSchedulerSectionProps {
	readonly schedulerIntervalMin: number;
	readonly setSchedulerIntervalMin: (v: number) => void;
	readonly schedulerStatus: {
		isRunning: boolean;
		intervalMinutes: number;
		nextScheduledRunAt?: string | number | null;
	};
	readonly handleToggleScheduler: () => void;
	readonly vaultSnapshots: LocalVaultSnapshotMeta[];
	readonly handleRestoreSnapshot: (id: string) => void;
	readonly handleDeleteSnapshot: (id: string) => void;
}

export const OfflineBackupSchedulerSection: React.FC<
	OfflineBackupSchedulerSectionProps
> = ({
	schedulerIntervalMin,
	setSchedulerIntervalMin,
	schedulerStatus,
	handleToggleScheduler,
	vaultSnapshots,
	handleRestoreSnapshot,
	handleDeleteSnapshot,
}) => {
	return (
		<div
			style={{
				background: "transparent",
				border: "none",
				padding: "16px 0",
				boxShadow: "none",
			}}
		>
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
							width: "44px",
							height: "44px",
							borderRadius: "10px",
							background: "rgba(13, 148, 136, 0.12)",
							color: "var(--teal)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Clock size={24} />
					</div>
					<div>
						<h3
							style={{
								margin: 0,
								fontSize: "18px",
								fontWeight: "600",
								color: "var(--ink, #1e293b)",
							}}
						>
							Автоматическое периодическое резервирование (Планировщик бэкапов)
						</h3>
						<p
							style={{
								margin: "4px 0 0",
								fontSize: "13px",
								color: "var(--muted, #64748b)",
							}}
						>
							Фоновое создание зашифрованных слепков в локальное защищенное
							хранилище
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<select
						value={schedulerIntervalMin}
						onChange={(e) => setSchedulerIntervalMin(Number(e.target.value))}
						disabled={schedulerStatus.isRunning}
						className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
					>
						<option value={15}>Каждые 15 минут</option>
						<option value={30}>Каждые 30 минут</option>
						<option value={60}>Каждый 1 час</option>
						<option value={360}>Каждые 6 часов</option>
						<option value={720}>Каждые 12 часов</option>
					</select>

					<button
						type="button"
						onClick={handleToggleScheduler}
						style={{
							minHeight: "44px",
							padding: "0 20px",
							borderRadius: "8px",
							background: schedulerStatus.isRunning
								? "var(--bad-fg)"
								: "var(--teal)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							fontWeight: "600",
							fontSize: "14px",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						{schedulerStatus.isRunning ? (
							<>
								<Square size={16} /> Остановить автобэкап
							</>
						) : (
							<>
								<Play size={16} /> Запустить автобэкап
							</>
						)}
					</button>
				</div>
			</div>

			{schedulerStatus.isRunning && (
				<div
					style={{
						padding: "12px 16px",
						borderRadius: "8px",
						background: "rgba(13, 148, 136, 0.08)",
						fontSize: "13px",
						color: "var(--teal)",
						display: "flex",
						alignItems: "center",
						gap: "8px",
						marginBottom: "16px",
					}}
				>
					<RefreshCw size={16} className="spin-animation" />
					Автобэкап по расписанию активен (интервал:{" "}
					{schedulerStatus.intervalMinutes} мин). Следующий снимок:{" "}
					{schedulerStatus.nextScheduledRunAt
						? new Date(schedulerStatus.nextScheduledRunAt).toLocaleTimeString(
								"ru-RU",
							)
						: "скоро"}
				</div>
			)}

			{vaultSnapshots.length > 0 && (
				<div>
					<h4
						style={{
							fontSize: "14px",
							fontWeight: "600",
							color: "var(--ink, #1e293b)",
							marginBottom: "12px",
						}}
					>
						Недавние локальные снимки Vault ({vaultSnapshots.length})
					</h4>
					<div
						style={{ display: "flex", flexDirection: "column", gap: "8px" }}
					>
						{vaultSnapshots.map((snap) => (
							<div
								key={snap.id}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									padding: "12px 16px",
									background: "var(--paper, #f8fafc)",
									border: "1px solid var(--glass-border, #e2e8f0)",
									borderRadius: "8px",
								}}
							>
								<div>
									<div
										style={{
											fontSize: "13px",
											fontWeight: "600",
											color: "var(--ink, #1e293b)",
										}}
									>
										{snap.filename}
									</div>
									<div
										style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}
									>
										{new Date(snap.timestamp).toLocaleString("ru-RU")} ·{" "}
										{Math.round(snap.sizeBytes / 1024)} КБ ·{" "}
										{snap.itemsCount.mutations} мут., {snap.itemsCount.drafts}{" "}
										черн.
									</div>
								</div>

								<div style={{ display: "flex", gap: "8px" }}>
									<button
										type="button"
										onClick={() => handleRestoreSnapshot(snap.id)}
										style={{
											minHeight: "36px",
											padding: "0 12px",
											borderRadius: "6px",
											background: "var(--teal)",
											color: "var(--on-teal, #ffffff)",
											border: "none",
											fontSize: "12px",
											fontWeight: "500",
											cursor: "pointer",
										}}
									>
										Загрузить в форму
									</button>

									<button
										type="button"
										onClick={() => handleDeleteSnapshot(snap.id)}
										style={{
											minHeight: "36px",
											minWidth: "36px",
											padding: "0",
											borderRadius: "6px",
											background: "rgba(239, 68, 68, 0.1)",
											color: "var(--bad-fg)",
											border: "none",
											fontSize: "12px",
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										aria-label={`Удалить снимок ${snap.filename}`}
									>
										<Trash2 size={16} />
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
