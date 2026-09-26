import type { DatabaseSnapshot } from "@dental/shared";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";
import type React from "react";

export interface OfflineBackupSnapshotsSectionProps {
	readonly handleCreateSnapshot: () => void;
	readonly isCreatingSnapshot: boolean;
	readonly snapshotError: string | null;
	readonly currentSnapshot: DatabaseSnapshot | null;
	readonly snapshotVerified: boolean | null;
}

export const OfflineBackupSnapshotsSection: React.FC<
	OfflineBackupSnapshotsSectionProps
> = ({
	handleCreateSnapshot,
	isCreatingSnapshot,
	snapshotError,
	currentSnapshot,
	snapshotVerified,
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
						<Database size={24} />
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
							Моментальные слепки базы данных и SHA-256 хеширование
						</h3>
						<p
							style={{
								margin: "4px 0 0",
								fontSize: "13px",
								color: "var(--muted, #64748b)",
							}}
						>
							Потабличный расчет контрольных сумм и корневой дайджест базы
							(IndexedDB / SQLite)
						</p>
					</div>
				</div>

				<div style={{ display: "flex", gap: "10px" }}>
					<button
						type="button"
						onClick={handleCreateSnapshot}
						disabled={isCreatingSnapshot}
						style={{
							minHeight: "44px",
							padding: "0 18px",
							borderRadius: "8px",
							background: "var(--teal)",
							color: "var(--on-teal, #ffffff)",
							border: "none",
							fontWeight: "600",
							fontSize: "14px",
							cursor: isCreatingSnapshot ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						<RefreshCw
							size={16}
							className={isCreatingSnapshot ? "spin-animation" : ""}
						/>
						{isCreatingSnapshot
							? "Создание слепка..."
							: "Пересчитать хеши базы"}
					</button>
				</div>
			</div>

			{snapshotError && (
				<div
					style={{
						marginBottom: "16px",
						padding: "12px",
						borderRadius: "8px",
						background: "rgba(239, 68, 68, 0.1)",
						color: "var(--bad-fg)",
						fontSize: "13px",
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<AlertTriangle size={18} />
					{snapshotError}
				</div>
			)}

			{currentSnapshot && (
				<div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							flexWrap: "wrap",
							padding: "14px 18px",
							borderRadius: "8px",
							background: snapshotVerified
								? "rgba(16, 185, 129, 0.08)"
								: "rgba(245, 158, 11, 0.08)",
							color: snapshotVerified ? "var(--ok-fg)" : "var(--warn-fg)",
							marginBottom: "16px",
							fontSize: "13px",
						}}
					>
						<div>
							<strong>Root Merkle SHA-256:</strong>{" "}
							<code style={{ fontSize: "12px", wordBreak: "break-all" }}>
								{currentSnapshot.metadata.rootSha256}
							</code>
						</div>
						<div>
							Слепок:{" "}
							<strong>
								{new Date(
									currentSnapshot.metadata.createdAtIso,
								).toLocaleTimeString("ru-RU")}
							</strong>{" "}
							(Объектов: {currentSnapshot.metadata.totalRecords})
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: "12px",
						}}
					>
						{Object.entries(currentSnapshot.tables).map(
							([tableName, table]: [string, any]) => (
								<div
									key={tableName}
									style={{
										padding: "12px 14px",
										background: "var(--paper, #f8fafc)",
										border: "1px solid var(--glass-border, #e2e8f0)",
										borderRadius: "8px",
									}}
								>
									<div
										style={{
											display: "flex",
											justifyContent: "space-between",
											marginBottom: "4px",
										}}
									>
										<strong
											style={{
												fontSize: "13px",
												color: "var(--ink, #1e293b)",
											}}
										>
											{tableName}
										</strong>
										<span
											style={{
												fontSize: "12px",
												color: "var(--muted, #64748b)",
											}}
										>
											{table.rowCount} записей
										</span>
									</div>
									<div
										style={{
											fontSize: "11px",
											color: "var(--muted, #64748b)",
											wordBreak: "break-all",
										}}
									>
										SHA-256:{" "}
										<code>{table.tableSha256.substring(0, 24)}...</code>
									</div>
								</div>
							),
						)}
					</div>
				</div>
			)}
		</div>
	);
};
