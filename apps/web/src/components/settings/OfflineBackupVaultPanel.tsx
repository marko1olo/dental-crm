import type {
	DatabaseSnapshot,
	OfflineSyncQueueStatus,
} from "@dental/shared";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Database,
	HardDrive,
	RefreshCw,
	ShieldCheck,
	UploadCloud,
	Wifi,
	WifiOff,
	XCircle,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { OfflineSyncGuardModal } from "../sync/OfflineSyncGuardModal";
import {
	type ExportBackupResult,
	type LocalVaultSnapshotMeta,
	type RestoreBackupResult,
	createLocalDatabaseSnapshot,
	deleteLocalVaultSnapshot,
	exportOfflineClinicBackup,
	getAutoBackupScheduleStatus,
	getLocalVaultSnapshotContent,
	importOfflineClinicBackup,
	inspectDenteBackup,
	listLocalVaultSnapshots,
	runDryRunRestoreVerification,
	startAutoBackupSchedule,
	stopAutoBackupSchedule,
} from "../../services/offline/offlineBackupService";
import {
	type OfflineCacheIntegrityReport,
	verifyLocalCacheIntegrity,
} from "../../services/offline/offlineIntegrityService";
import { OfflineBackupExportSection } from "./backup/OfflineBackupExportSection";
import { OfflineBackupIntegritySection } from "./backup/OfflineBackupIntegritySection";
import { OfflineBackupRestoreSection } from "./backup/OfflineBackupRestoreSection";
import {
	BackupScheduleConfig,
	BackupSnapshotList,
	EmergencyRestoreWizard,
	LocalVaultStorageIndicator,
} from "./backupVaultModules";

interface OfflineBackupVaultPanelProps {
	organizationId?: string | undefined;
	clinicName?: string | undefined;
}

export const OfflineBackupVaultPanel: React.FC<OfflineBackupVaultPanelProps> = ({
	organizationId,
	clinicName,
}) => {
	const [activeSection, setActiveSection] = useState<
		"export" | "restore" | "snapshots" | "scheduler" | "wizard" | "integrity"
	>("export");
	const [isSyncGuardOpen, setIsSyncGuardOpen] = useState(false);

	// Export state
	const [exportPassphrase, setExportPassphrase] = useState("");
	const [showExportPassphrase, setShowExportPassphrase] = useState(false);
	const [exportNotes, setExportNotes] = useState("");
	const [isExporting, setIsExporting] = useState(false);
	const [lastExportResult, setLastExportResult] = useState<ExportBackupResult | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);

	// Import & Restore state
	const [importPassphrase, setImportPassphrase] = useState("");
	const [showImportPassphrase, setShowImportPassphrase] = useState(false);
	const [importRawText, setImportRawText] = useState<string | null>(null);
	const [importFileName, setImportFileName] = useState<string | null>(null);
	const [dryRunResult, setDryRunResult] = useState<any>(null);
	const [inspectError, setInspectError] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [isExecutingDryRun, setIsExecutingDryRun] = useState(false);
	const [lastRestoreResult, setLastRestoreResult] = useState<RestoreBackupResult | null>(null);
	const [restoreError, setRestoreError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Snapshot state
	const [vaultSnapshots, setVaultSnapshots] = useState<LocalVaultSnapshotMeta[]>([]);
	const [schedulerStatus, setSchedulerStatus] = useState(getAutoBackupScheduleStatus());
	const [schedulerIntervalMin, setSchedulerIntervalMin] = useState<number>(60);

	// Integrity report
	const [integrityReport, setIntegrityReport] = useState<OfflineCacheIntegrityReport | null>(null);
	const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

	// Online status
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [syncQueueStatus, setSyncQueueStatus] = useState<OfflineSyncQueueStatus>({
		mode: isOnline ? "ONLINE_SYNCED" : "OFFLINE_BUFFERING",
		totalPending: 0,
		inFlightCount: 0,
		failedCount: 0,
		committedCount: 0,
		oldestPendingTimestampMs: null,
		lastReplicatedTimestampMs: Date.now(),
		isOnline,
		storageDriver: "indexeddb",
		survivabilityGrade: "HEALTHY",
		unflushedMemoryBytes: 0,
	});

	useEffect(() => {
		setVaultSnapshots(listLocalVaultSnapshots());
		setSchedulerStatus(getAutoBackupScheduleStatus());
		runIntegrityCheck(false);

		const handleOnline = () => {
			setIsOnline(true);
			setSyncQueueStatus((prev) => ({ ...prev, isOnline: true, mode: "ONLINE_SYNCED" }));
		};
		const handleOffline = () => {
			setIsOnline(false);
			setSyncQueueStatus((prev) => ({ ...prev, isOnline: false, mode: "OFFLINE_BUFFERING", survivabilityGrade: "DEGRADED" }));
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const refreshVaultSnapshots = () => setVaultSnapshots(listLocalVaultSnapshots());

	const runIntegrityCheck = async (autoRepair = false) => {
		setIsCheckingIntegrity(true);
		try {
			const report = await verifyLocalCacheIntegrity({ autoRepair, organizationId });
			setIntegrityReport(report);
			if (report) {
				setSyncQueueStatus((prev) => ({
					...prev,
					totalPending: report.storesStats.mutationsCount,
					unflushedMemoryBytes: report.storageEstimate.usageBytes,
				}));
			}
		} catch (err) {
			console.error("Integrity check failed:", err);
		} finally {
			setIsCheckingIntegrity(false);
		}
	};

	const handleExport = async (preferPicker = false) => {
		setIsExporting(true);
		setExportError(null);
		try {
			const result = await exportOfflineClinicBackup({
				organizationId,
				passphrase: exportPassphrase || undefined,
				preferFileSystemPicker: preferPicker,
				meta: { clinicName: clinicName || "DENTE Клиника", notes: exportNotes || "Автономная резервная копия Vault" },
			});
			setLastExportResult(result);
			refreshVaultSnapshots();
		} catch (err: any) {
			setExportError(err?.message || "Ошибка создания резервной копии");
		} finally {
			setIsExporting(false);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setImportFileName(file.name);
		setInspectError(null);
		setDryRunResult(null);
		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			setImportRawText(text);
			const validation = inspectDenteBackup(text);
			if (validation.valid && validation.header) {
				executeDryRun(text, importPassphrase);
			} else {
				setInspectError(validation.error || "Некорректный файл архива DENTE");
			}
		};
		reader.readAsText(file, "UTF-8");
	};

	const executeDryRun = (rawText: string, pass?: string) => {
		setIsExecutingDryRun(true);
		try {
			const dryRun = runDryRunRestoreVerification(rawText, { passphrase: pass || undefined, targetOrganizationId: organizationId });
			setDryRunResult(dryRun);
		} catch (err: any) {
			setInspectError(err?.message || "Ошибка проверки архива");
		} finally {
			setIsExecutingDryRun(false);
		}
	};

	const handleRestore = async () => {
		if (!importRawText) return;
		setIsImporting(true);
		setRestoreError(null);
		try {
			const result = await importOfflineClinicBackup(importRawText, { passphrase: importPassphrase || undefined });
			setLastRestoreResult(result);
			runIntegrityCheck(false);
			refreshVaultSnapshots();
		} catch (err: any) {
			setRestoreError(err?.message || "Ошибка восстановления из резервной копии");
		} finally {
			setIsImporting(false);
		}
	};

	const handleToggleScheduler = () => {
		if (schedulerStatus.isRunning) {
			stopAutoBackupSchedule();
			setSchedulerStatus(getAutoBackupScheduleStatus());
		} else {
			const status = startAutoBackupSchedule({
				intervalMinutes: schedulerIntervalMin,
				organizationId,
				passphrase: exportPassphrase || undefined,
				onBackupComplete: () => {
					refreshVaultSnapshots();
					setSchedulerStatus(getAutoBackupScheduleStatus());
				},
			});
			setSchedulerStatus(status);
		}
	};

	const handleRestoreSnapshot = (snapshotId: string) => {
		const content = getLocalVaultSnapshotContent(snapshotId);
		if (!content) return;
		setImportRawText(content);
		setImportFileName(`Снимок Vault (${snapshotId})`);
		executeDryRun(content, importPassphrase);
		setActiveSection("restore");
	};

	const handleDeleteSnapshot = (snapshotId: string) => {
		deleteLocalVaultSnapshot(snapshotId);
		refreshVaultSnapshots();
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 0 12px 0", boxSizing: "border-box" }} data-testid="offline-vault-modal">
			{/* SURVIVABILITY STATUS BANNER */}
			<div
				style={{
					background: isOnline ? "var(--paper-strong, #ffffff)" : "rgba(245, 158, 11, 0.08)",
					border: isOnline ? "1px solid var(--line, rgba(0,0,0,0.08))" : "1px solid rgba(245, 158, 11, 0.3)",
					borderRadius: "10px",
					padding: "10px 14px",
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<div
						style={{
							width: "36px",
							height: "36px",
							borderRadius: "8px",
							background: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.16)",
							color: isOnline ? "var(--ok-fg)" : "var(--warn-fg)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						{isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
					</div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: "600", color: "var(--ink, #1e293b)" }}>
								{isOnline ? "Режим репликации: Синхронизировано" : "Аварийный офлайн-режим (Автономная буферизация)"}
							</h3>
							<span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", background: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.2)", color: isOnline ? "var(--ok-fg)" : "var(--warn-fg)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
								{isOnline ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
								{isOnline ? "В сети" : "Буферизация"}
							</span>
							{syncQueueStatus.failedCount > 0 && (
								<span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.15)", color: "var(--bad-fg)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
									<XCircle size={12} /> Ошибок: {syncQueueStatus.failedCount}
								</span>
							)}
						</div>
						<p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted, #64748b)" }}>
							{isOnline ? "Локальные данные защищены. Неотправленных изменений: 0." : `Интернет отсутствует. Буферизировано: ${syncQueueStatus.totalPending} операций.`}
						</p>
					</div>
				</div>

				<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
					<button type="button" onClick={() => runIntegrityCheck(false)} disabled={isCheckingIntegrity} style={{ minHeight: "36px", padding: "0 12px", borderRadius: "8px", background: "var(--paper-soft)", color: "var(--ink)", border: "1px solid var(--line)", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
						<RefreshCw size={14} className={isCheckingIntegrity ? "spin-animation" : ""} />
						<span>{isCheckingIntegrity ? "Сверка..." : "Сверить буфер"}</span>
					</button>
					<button type="button" onClick={() => setIsSyncGuardOpen(true)} data-testid="open-sync-guard-modal-btn" style={{ minHeight: "36px", padding: "0 12px", borderRadius: "8px", background: "var(--paper-soft)", color: "var(--ink)", border: "1px solid var(--line)", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
						<Activity size={14} /> <span>Очередь офлайн-синхронизации</span>
					</button>
				</div>
			</div>

			{/* STORAGE & CRYPTO INDICATOR */}
			<LocalVaultStorageIndicator integrityReport={integrityReport} isCheckingIntegrity={isCheckingIntegrity} onRefreshIntegrity={() => runIntegrityCheck(false)} organizationId={organizationId} />

			{/* SECTION TABS */}
			<div style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: "6px", padding: "4px", borderRadius: "10px", background: "var(--paper-soft)", border: "1px solid var(--line)", width: "100%", boxSizing: "border-box" }} role="tablist">
				{[
					{ id: "export", label: "Экспорт архива (.dente)", icon: <HardDrive size={15} /> },
					{ id: "restore", label: "Восстановление и проверка", icon: <UploadCloud size={15} /> },
					{ id: "snapshots", label: "Журнал копий", icon: <Database size={15} /> },
					{ id: "scheduler", label: "Автобэкап (Расписание)", icon: <Clock size={15} /> },
					{ id: "wizard", label: "Аварийный визард", icon: <ShieldCheck size={15} /> },
					{ id: "integrity", label: "Целостность и здоровье", icon: <ShieldCheck size={15} /> },
				].map((tab) => {
					const isActive = activeSection === tab.id;
					return (
						<button key={tab.id} type="button" role="tab" aria-selected={isActive} onClick={() => setActiveSection(tab.id as any)} style={{ flex: "1 1 auto", minHeight: "34px", padding: "6px 12px", borderRadius: "7px", border: isActive ? "1px solid var(--teal)" : "1px solid var(--line)", background: isActive ? "var(--teal-surface, rgba(13, 148, 136, 0.14))" : "var(--paper)", color: isActive ? "var(--ink)" : "var(--muted)", fontWeight: isActive ? 600 : 500, fontSize: "12.5px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
							<span style={{ color: isActive ? "var(--teal)" : "var(--muted)" }}>{tab.icon}</span>
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			{/* TAB CONTENTS */}
			{activeSection === "export" && (
				<OfflineBackupExportSection exportPassphrase={exportPassphrase} setExportPassphrase={setExportPassphrase} showExportPassphrase={showExportPassphrase} setShowExportPassphrase={setShowExportPassphrase} exportNotes={exportNotes} setExportNotes={setExportNotes} isExporting={isExporting} handleExport={handleExport} exportError={exportError} lastExportResult={lastExportResult} />
			)}

			{activeSection === "restore" && (
				<OfflineBackupRestoreSection fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} importFileName={importFileName} inspectError={inspectError} dryRunResult={dryRunResult} importRawText={importRawText} importPassphrase={importPassphrase} showImportPassphrase={showImportPassphrase} setShowImportPassphrase={setShowImportPassphrase} handlePassphraseChangeForDryRun={(p) => { setImportPassphrase(p); if (importRawText) executeDryRun(importRawText, p); }} executeDryRun={executeDryRun} isExecutingDryRun={isExecutingDryRun} handleRestore={handleRestore} isImporting={isImporting} restoreError={restoreError} lastRestoreResult={lastRestoreResult} />
			)}

			{activeSection === "snapshots" && (
				<BackupSnapshotList
					vaultSnapshots={vaultSnapshots}
					handleRestoreSnapshot={handleRestoreSnapshot}
					handleDeleteSnapshot={handleDeleteSnapshot}
					handleCreateSnapshot={() => void handleExport(false)}
					isCreatingSnapshot={isExporting}
				/>
			)}

			{activeSection === "scheduler" && (
				<BackupScheduleConfig schedulerStatus={schedulerStatus} schedulerIntervalMin={schedulerIntervalMin} setSchedulerIntervalMin={setSchedulerIntervalMin} handleToggleScheduler={handleToggleScheduler} />
			)}

			{activeSection === "wizard" && (
				<EmergencyRestoreWizard vaultSnapshots={vaultSnapshots} onExecuteRestore={async (raw, pass) => importOfflineClinicBackup(raw, { passphrase: pass })} onDryRunVerify={(raw, pass) => runDryRunRestoreVerification(raw, { passphrase: pass, targetOrganizationId: organizationId })} pendingMutationsCount={syncQueueStatus.totalPending} onComplete={() => { refreshVaultSnapshots(); setActiveSection("snapshots"); }} />
			)}

			{activeSection === "integrity" && (
				<OfflineBackupIntegritySection runIntegrityCheck={(att) => { void runIntegrityCheck(att ?? false); }} isCheckingIntegrity={isCheckingIntegrity} integrityReport={integrityReport} />
			)}

			<OfflineSyncGuardModal isOpen={isSyncGuardOpen} onClose={() => setIsSyncGuardOpen(false)} />
		</div>
	);
};
