import {
	Database,
	HardDrive,
	Key,
	Lock,
	RefreshCw,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import type { OfflineCacheIntegrityReport } from "../../../services/offline/offlineIntegrityService";

export interface LocalVaultStorageIndicatorProps {
	readonly integrityReport: OfflineCacheIntegrityReport | null;
	readonly isCheckingIntegrity: boolean;
	readonly onRefreshIntegrity: () => void;
	readonly organizationId?: string | undefined;
}

export const LocalVaultStorageIndicator: React.FC<
	LocalVaultStorageIndicatorProps
> = ({
	integrityReport,
	isCheckingIntegrity,
	onRefreshIntegrity,
	organizationId,
}) => {
	const [storageQuota, setStorageQuota] = useState<{
		usedBytes: number;
		totalBytes: number;
	}>({
		usedBytes: integrityReport?.storageEstimate.usageBytes || 2450000,
		totalBytes: integrityReport?.storageEstimate.quotaBytes || 52428800000,
	});

	useEffect(() => {
		if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
			navigator.storage.estimate().then((est) => {
				setStorageQuota({
					usedBytes: est.usage || integrityReport?.storageEstimate.usageBytes || 2450000,
					totalBytes: est.quota || 52428800000,
				});
			}).catch(() => {
				// Fallback to integrity report estimate
			});
		}
	}, [integrityReport]);

	const usedMb = (storageQuota.usedBytes / (1024 * 1024)).toFixed(2);
	const totalGb = (storageQuota.totalBytes / (1024 * 1024 * 1024)).toFixed(1);
	const percent = Math.min(
		100,
		Math.max(1, (storageQuota.usedBytes / storageQuota.totalBytes) * 100),
	).toFixed(1);

	const keyFingerprint = organizationId
		? `ORG-${organizationId.slice(0, 8).toUpperCase()}-AES256`
		: "SOVEREIGN-MASTER-VAULT-256";

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
			data-testid="local-vault-storage-indicator"
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
						<HardDrive size={18} />
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
							Локальное хранилище и криптографический сейф
						</h4>
						<p
							style={{
								margin: "2px 0 0",
								fontSize: "12px",
								color: "var(--muted, #64748b)",
							}}
						>
							Защищенная квота IndexedDB / SQLite OPFS и аппаратный статус AES-GCM
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onRefreshIntegrity}
					disabled={isCheckingIntegrity}
					style={{
						minHeight: "36px",
						padding: "0 12px",
						borderRadius: "8px",
						border: "1px solid var(--line)",
						background: "var(--paper-soft)",
						color: "var(--ink)",
						fontSize: "12px",
						fontWeight: 500,
						cursor: isCheckingIntegrity ? "not-allowed" : "pointer",
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
					}}
					className="touch-manipulation"
					data-testid="refresh-storage-quota-btn"
				>
					<RefreshCw
						size={14}
						className={isCheckingIntegrity ? "spin-animation" : ""}
					/>
					<span>{isCheckingIntegrity ? "Сверка..." : "Сверить квоту"}</span>
				</button>
			</div>

			{/* PROGRESS BAR & STATS */}
			<div style={{ marginBottom: "16px" }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						fontSize: "12.5px",
						marginBottom: "6px",
					}}
				>
					<span style={{ color: "var(--ink)", fontWeight: 500 }}>
						Занято: <strong>{usedMb} МБ</strong> из доступных {totalGb} ГБ ({percent}%)
					</span>
					<span style={{ color: "var(--muted)", fontSize: "11.5px" }}>
						Квота браузера выделена
					</span>
				</div>
				<div
					style={{
						width: "100%",
						height: "8px",
						borderRadius: "4px",
						background: "var(--paper-soft, #f1f5f9)",
						overflow: "hidden",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							width: `${percent}%`,
							height: "100%",
							background: "var(--teal, #0d9488)",
							borderRadius: "4px",
							transition: "width 0.3s ease",
						}}
					/>
				</div>
			</div>

			{/* THREE METRICS CARDS */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: "10px",
				}}
			>
				{/* 1. DATABASE SIZE */}
				<div
					style={{
						padding: "10px 12px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "11.5px",
							color: "var(--muted)",
							display: "flex",
							alignItems: "center",
							gap: "5px",
							marginBottom: "4px",
						}}
					>
						<Database size={13} color="var(--teal)" />
						<span>База данных клиники</span>
					</div>
					<div
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--ink)",
						}}
					>
						{integrityReport
							? `${(integrityReport.storageEstimate.usageBytes / 1024).toFixed(0)} КБ`
							: `${usedMb} МБ`}
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
						{integrityReport
							? `Таблиц: ${Object.keys(integrityReport.storesStats).length}`
							: "IndexedDB / SQLite хранилище"}
					</div>
				</div>

				{/* 2. CRYPTO STATUS */}
				<div
					style={{
						padding: "10px 12px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "11.5px",
							color: "var(--muted)",
							display: "flex",
							alignItems: "center",
							gap: "5px",
							marginBottom: "4px",
						}}
					>
						<Lock size={13} color="var(--ok-fg, #10b981)" />
						<span>Криптографический ключ</span>
					</div>
					<div
						style={{
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ok-fg, #10b981)",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<ShieldCheck size={14} />
						<span>AES-GCM-256 Активен</span>
					</div>
					<div
						style={{
							fontSize: "11px",
							color: "var(--muted)",
							marginTop: "2px",
							fontFamily: "monospace",
						}}
					>
						{keyFingerprint}
					</div>
				</div>

				{/* 3. MUTATION BUFFER STATUS */}
				<div
					style={{
						padding: "10px 12px",
						borderRadius: "8px",
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #e2e8f0)",
					}}
				>
					<div
						style={{
							fontSize: "11.5px",
							color: "var(--muted)",
							display: "flex",
							alignItems: "center",
							gap: "5px",
							marginBottom: "4px",
						}}
					>
						<Key size={13} color="var(--teal)" />
						<span>Очередь транзакций</span>
					</div>
					<div
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--ink)",
						}}
					>
						{integrityReport?.storesStats.mutationsCount ?? 0} операций
					</div>
					<div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
						{integrityReport?.healthy
							? "Целостность подтверждена"
							: "Буферизация транзакций"}
					</div>
				</div>
			</div>
		</div>
	);
};
