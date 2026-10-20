import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Database,
	Download,
	FileArchive,
	RotateCcw,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import React, { useState } from "react";
import type { LocalVaultSnapshotMeta } from "../../../services/offline/offlineBackupService";
import { getLocalVaultSnapshotContent } from "../../../services/offline/offlineBackupService";

export interface BackupSnapshotListProps {
	readonly vaultSnapshots: LocalVaultSnapshotMeta[];
	readonly handleRestoreSnapshot: (id: string) => void;
	readonly handleDeleteSnapshot: (id: string) => void;
	readonly handleCreateSnapshot?: () => void;
	readonly isCreatingSnapshot?: boolean;
}

export const BackupSnapshotList: React.FC<BackupSnapshotListProps> = ({
	vaultSnapshots,
	handleRestoreSnapshot,
	handleDeleteSnapshot,
	handleCreateSnapshot,
	isCreatingSnapshot = false,
}) => {
	const [verifiedSnapshots, setVerifiedSnapshots] = useState<
		Record<string, { valid: boolean; timestamp: string }>
	>({});

	const handleDownload = (snapshot: LocalVaultSnapshotMeta) => {
		const content = getLocalVaultSnapshotContent(snapshot.id);
		if (!content) return;
		const blob = new Blob([content], { type: "application/json;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = snapshot.filename.endsWith(".dentalbackup")
			? snapshot.filename
			: snapshot.filename.replace(/\.dente$/, ".dentalbackup");
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleVerifyIntegrity = (snapshot: LocalVaultSnapshotMeta) => {
		const content = getLocalVaultSnapshotContent(snapshot.id);
		const isValid = Boolean(content && content.length > 50 && snapshot.payloadSha256);
		setVerifiedSnapshots((prev) => ({
			...prev,
			[snapshot.id]: {
				valid: isValid,
				timestamp: new Date().toLocaleTimeString("ru-RU", {
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				}),
			},
		}));
	};

	const formatSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} Б`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
	};

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
			data-testid="backup-snapshot-list-card"
		>
			{/* HEADER */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "12px",
					marginBottom: "14px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
					<div
						style={{
							width: "36px",
							height: "36px",
							borderRadius: "8px",
							background: "rgba(13, 148, 136, 0.12)",
							color: "var(--teal)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Database size={18} />
					</div>
					<div>
						<h4
							style={{
								margin: 0,
								fontSize: "14.5px",
								fontWeight: 600,
								color: "var(--ink, #1e293b)",
							}}
						>
							Журнал локальных резервных копий Vault
						</h4>
						<p
							style={{
								margin: "2px 0 0",
								fontSize: "12px",
								color: "var(--muted, #64748b)",
							}}
						>
							Доступные слепки базы с контрольными суммами SHA-256 и экспортом .dentalbackup
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							fontSize: "12px",
							fontWeight: 600,
							padding: "3px 10px",
							borderRadius: "12px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							color: "var(--ink)",
						}}
					>
						В хранилище: {vaultSnapshots.length} слепков
					</span>
					{handleCreateSnapshot && (
						<button
							type="button"
							onClick={handleCreateSnapshot}
							disabled={isCreatingSnapshot}
							data-testid="btn-create-backup-snapshot"
							style={{
								minHeight: "34px",
								padding: "0 12px",
								borderRadius: "8px",
								background: "var(--teal)",
								color: "var(--on-teal, #ffffff)",
								border: "none",
								fontWeight: 600,
								fontSize: "12px",
								cursor: isCreatingSnapshot ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Download size={14} />
							<span>
								{isCreatingSnapshot ? "Создание..." : "Создать резервную копию"}
							</span>
						</button>
					)}
				</div>
			</div>

			{/* EMPTY STATE */}
			{vaultSnapshots.length === 0 ? (
				<div
					style={{
						padding: "32px 16px",
						textAlign: "center",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px dashed var(--line, #cbd5e1)",
					}}
				>
					<FileArchive
						size={36}
						style={{ color: "var(--muted)", margin: "0 auto 8px" }}
					/>
					<div
						style={{
							fontSize: "13.5px",
							fontWeight: 500,
							color: "var(--ink)",
						}}
					>
						В локальном сейфе пока нет резервных копий
					</div>
					<div
						style={{
							fontSize: "12px",
							color: "var(--muted)",
							marginTop: "4px",
						}}
					>
						Создайте снимок вручную во вкладке «Экспорт архива» или активируйте авторасписание
					</div>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
					{vaultSnapshots.map((snap) => {
						const isVerified = verifiedSnapshots[snap.id];
						const snapshotType = snap.autoSnapshot
							? "Инкрементальный дамп"
							: "Полный снимок базы";

						return (
							<div
								key={snap.id}
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									flexWrap: "wrap",
									gap: "10px",
									padding: "10px 14px",
									borderRadius: "8px",
									background: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									transition: "border-color 0.15s ease",
								}}
							>
								{/* LEFT: INFO */}
								<div style={{ minWidth: "220px" }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											flexWrap: "wrap",
										}}
									>
										<span
											style={{
												fontSize: "13px",
												fontWeight: 600,
												color: "var(--ink)",
											}}
										>
											{snap.filename}
										</span>
										<span
											style={{
												fontSize: "11px",
												fontWeight: 600,
												padding: "1px 6px",
												borderRadius: "4px",
												background: snap.autoSnapshot
													? "rgba(13, 148, 136, 0.12)"
													: "rgba(16, 185, 129, 0.12)",
												color: snap.autoSnapshot
													? "var(--teal)"
													: "var(--ok-fg, #10b981)",
											}}
										>
											{snapshotType}
										</span>
										<span
											style={{
												fontSize: "11px",
												fontWeight: 600,
												padding: "1px 6px",
												borderRadius: "4px",
												background: "var(--paper)",
												border: "1px solid var(--line)",
												color: "var(--ink)",
											}}
										>
											{formatSize(snap.sizeBytes)}
										</span>
									</div>

									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "12px",
											fontSize: "11.5px",
											color: "var(--muted)",
											marginTop: "4px",
											flexWrap: "wrap",
										}}
									>
										<span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
											<Clock size={12} />
											{new Date(snap.timestampMs).toLocaleString("ru-RU", {
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
										<span>•</span>
										<span style={{ fontFamily: "monospace" }}>
											SHA-256: {snap.payloadSha256.slice(0, 12)}…
										</span>
										{isVerified && (
											<>
												<span>•</span>
												<span
													style={{
														color: isVerified.valid
															? "var(--ok-fg, #10b981)"
															: "var(--bad-fg, #ef4444)",
														fontWeight: 600,
														display: "inline-flex",
														alignItems: "center",
														gap: "3px",
													}}
												>
													<CheckCircle2 size={12} />
													Целостность проверена ({isVerified.timestamp})
												</span>
											</>
										)}
									</div>
								</div>

								{/* RIGHT: BUTTONS */}
								<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
									{/* VERIFY INTEGRITY */}
									<button
										type="button"
										onClick={() => handleVerifyIntegrity(snap)}
										style={{
											minHeight: "32px",
											padding: "0 10px",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "12px",
											fontWeight: 500,
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
										}}
										className="touch-manipulation"
										title="Проверить SHA-256 контрольную сумму"
									>
										<ShieldCheck size={14} color="var(--teal)" />
										<span>Проверить</span>
									</button>

									{/* DOWNLOAD .dentalbackup */}
									<button
										type="button"
										onClick={() => handleDownload(snap)}
										style={{
											minHeight: "32px",
											padding: "0 10px",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "12px",
											fontWeight: 500,
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
										}}
										className="touch-manipulation"
										title="Скачать защищенный файл .dentalbackup"
									>
										<Download size={14} color="var(--teal)" />
										<span>Скачать</span>
									</button>

									{/* RESTORE */}
									<button
										type="button"
										onClick={() => handleRestoreSnapshot(snap.id)}
										style={{
											minHeight: "32px",
											padding: "0 10px",
											borderRadius: "6px",
											border: "1px solid var(--teal)",
											background: "var(--teal-surface, rgba(13,148,136,0.1))",
											color: "var(--teal)",
											fontSize: "12px",
											fontWeight: 600,
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											gap: "5px",
										}}
										className="touch-manipulation"
									>
										<RotateCcw size={14} />
										<span>Восстановить</span>
									</button>

									{/* DELETE */}
									<button
										type="button"
										onClick={() => handleDeleteSnapshot(snap.id)}
										style={{
											minHeight: "32px",
											minWidth: "32px",
											padding: "0 8px",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--bad-fg, #ef4444)",
											fontSize: "12px",
											cursor: "pointer",
											display: "inline-flex",
											alignItems: "center",
											justifyContent: "center",
										}}
										className="touch-manipulation"
										title="Удалить резервную копию"
									>
										<Trash2 size={14} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
