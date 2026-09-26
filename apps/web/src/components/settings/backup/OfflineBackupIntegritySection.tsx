import {
	AlertTriangle,
	Database,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import type React from "react";
import type { OfflineCacheIntegrityReport } from "../../../services/offline/offlineIntegrityService";

export interface OfflineBackupIntegritySectionProps {
	readonly runIntegrityCheck: (
		attemptAutoRepair?: boolean | undefined,
	) => void | Promise<void>;
	readonly isCheckingIntegrity: boolean;
	readonly integrityReport: OfflineCacheIntegrityReport | null;
}

export const OfflineBackupIntegritySection: React.FC<
	OfflineBackupIntegritySectionProps
> = ({ runIntegrityCheck, isCheckingIntegrity, integrityReport }) => {
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
							Диагностика целостности локального хранилища (Integrity Engine)
						</h3>
						<p
							style={{
								margin: "4px 0 0",
								fontSize: "13px",
								color: "var(--muted, #64748b)",
							}}
						>
							Сверка контрольных сумм полезной нагрузки, структуры таблиц и
							квоты браузера
						</p>
					</div>
				</div>

				<div style={{ display: "flex", gap: "10px" }}>
					<button
						type="button"
						onClick={() => runIntegrityCheck(false)}
						disabled={isCheckingIntegrity}
						style={{
							minHeight: "44px",
							padding: "0 16px",
							borderRadius: "8px",
							background: "var(--paper, #f1f5f9)",
							color: "var(--ink, #334155)",
							border: "1px solid var(--glass-border, #cbd5e1)",
							fontWeight: "500",
							fontSize: "14px",
							cursor: isCheckingIntegrity ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<RefreshCw size={16} />
						{isCheckingIntegrity ? "Проверка..." : "Проверить целостность"}
					</button>

					{integrityReport && !integrityReport.healthy && (
						<button
							type="button"
							onClick={() => runIntegrityCheck(true)}
							disabled={isCheckingIntegrity}
							style={{
								minHeight: "44px",
								padding: "0 16px",
								borderRadius: "8px",
								background: "var(--warn-fg)",
								color: "var(--on-teal, #ffffff)",
								border: "none",
								fontWeight: "600",
								fontSize: "14px",
								cursor: isCheckingIntegrity ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<ShieldAlert size={16} />
							Автовосстановление базы
						</button>
					)}
				</div>
			</div>

			{integrityReport && (
				<div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							marginBottom: "16px",
							padding: "12px 16px",
							borderRadius: "8px",
							background: integrityReport.healthy
								? "rgba(16, 185, 129, 0.08)"
								: "rgba(239, 68, 68, 0.08)",
							color: integrityReport.healthy
								? "var(--ok-fg)"
								: "var(--bad-fg)",
							fontWeight: "600",
							fontSize: "14px",
						}}
					>
						{integrityReport.healthy ? (
							<ShieldCheck size={20} />
						) : (
							<AlertTriangle size={20} />
						)}
						{integrityReport.healthy
							? `Все локальные записи целостны (проверено ${integrityReport.totalChecked} объектов)`
							: `Обнаружены повреждения: ${integrityReport.corruptedCount} поврежденных записей из ${integrityReport.totalChecked}`}
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
							gap: "12px",
							fontSize: "13px",
							color: "var(--ink, #334155)",
							marginBottom: "16px",
						}}
					>
						<div
							style={{
								padding: "10px",
								background: "var(--paper, #f8fafc)",
								borderRadius: "6px",
							}}
						>
							Мутации: <strong>{integrityReport.storesStats.mutationsCount}</strong>
						</div>
						<div
							style={{
								padding: "10px",
								background: "var(--paper, #f8fafc)",
								borderRadius: "6px",
							}}
						>
							Черновики: <strong>{integrityReport.storesStats.draftsCount}</strong>
						</div>
						<div
							style={{
								padding: "10px",
								background: "var(--paper, #f8fafc)",
								borderRadius: "6px",
							}}
						>
							Клинический кэш:{" "}
							<strong>{integrityReport.storesStats.clinicalCacheCount}</strong>
						</div>
						<div
							style={{
								padding: "10px",
								background: "var(--paper, #f8fafc)",
								borderRadius: "6px",
							}}
						>
							Расписания:{" "}
							<strong>{integrityReport.storesStats.schedulesCount}</strong>
						</div>
						<div
							style={{
								padding: "10px",
								background: "var(--paper, #f8fafc)",
								borderRadius: "6px",
							}}
						>
							Пациенты: <strong>{integrityReport.storesStats.patientsCount}</strong>
						</div>
						<div
							style={{
								padding: "10px",
								background: "var(--paper, #f8fafc)",
								borderRadius: "6px",
							}}
						>
							Свободно памяти:{" "}
							<strong>{integrityReport.storageEstimate.freeFormatted}</strong>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
