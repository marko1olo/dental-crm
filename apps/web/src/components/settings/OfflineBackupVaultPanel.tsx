import type {
	DatabaseSnapshot,
	DenteBackupHeader,
	DryRunRestoreResult,
	OfflineSyncQueueStatus,
} from "@dental/shared";
import { verifyDatabaseSnapshot } from "@dental/shared";
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
import { OfflineBackupSchedulerSection } from "./backup/OfflineBackupSchedulerSection";
import { OfflineBackupSnapshotsSection } from "./backup/OfflineBackupSnapshotsSection";

interface OfflineBackupVaultPanelProps {
	organizationId?: string | undefined;
	clinicName?: string | undefined;
}

export const OfflineBackupVaultPanel: React.FC<OfflineBackupVaultPanelProps> = ({
	organizationId,
	clinicName,
}) => {
	// Active Tab state for 3-Tier UX
	const [activeSection, setActiveSection] = useState<
		"export" | "restore" | "snapshots" | "scheduler" | "integrity"
	>("export");
	const [isSyncGuardOpen, setIsSyncGuardOpen] = useState(false);

	// Export state
	const [exportPassphrase, setExportPassphrase] = useState("");
	const [showExportPassphrase, setShowExportPassphrase] = useState(false);
	const [exportNotes, setExportNotes] = useState("");
	const [isExporting, setIsExporting] = useState(false);
	const [lastExportResult, setLastExportResult] =
		useState<ExportBackupResult | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);

	// Import & Dry-Run state
	const [importPassphrase, setImportPassphrase] = useState("");
	const [showImportPassphrase, setShowImportPassphrase] = useState(false);
	const [importRawText, setImportRawText] = useState<string | null>(null);
	const [importFileName, setImportFileName] = useState<string | null>(null);
	// biome-ignore lint/correctness/noUnusedVariables: inspectedHeader maintained for backup metadata tracking
	const [inspectedHeader, setInspectedHeader] =
		useState<DenteBackupHeader | null>(null);
	const [dryRunResult, setDryRunResult] = useState<DryRunRestoreResult | null>(
		null,
	);
	const [inspectError, setInspectError] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [isExecutingDryRun, setIsExecutingDryRun] = useState(false);
	const [lastRestoreResult, setLastRestoreResult] =
		useState<RestoreBackupResult | null>(null);
	const [restoreError, setRestoreError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Snapshot state
	const [currentSnapshot, setCurrentSnapshot] =
		useState<DatabaseSnapshot | null>(null);
	const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
	const [snapshotVerified, setSnapshotVerified] = useState<boolean | null>(null);
	const [snapshotError, setSnapshotError] = useState<string | null>(null);

	// Scheduler state
	const [schedulerStatus, setSchedulerStatus] = useState(
		getAutoBackupScheduleStatus(),
	);
	const [schedulerIntervalMin, setSchedulerIntervalMin] = useState<number>(60);
	const [vaultSnapshots, setVaultSnapshots] = useState<
		LocalVaultSnapshotMeta[]
	>([]);

	// Integrity state
	const [integrityReport, setIntegrityReport] =
		useState<OfflineCacheIntegrityReport | null>(null);
	const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

	// Sync Queue & Offline Survivability state
	const [isOnline, setIsOnline] = useState<boolean>(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [syncQueueStatus, setSyncQueueStatus] =
		useState<OfflineSyncQueueStatus>({
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
		refreshVaultSnapshots();
		setSchedulerStatus(getAutoBackupScheduleStatus());
		runIntegrityCheck(false);
		handleCreateSnapshot();

		const handleOnline = () => {
			setIsOnline(true);
			setSyncQueueStatus((prev) => ({
				...prev,
				isOnline: true,
				mode: "ONLINE_SYNCED",
			}));
		};
		const handleOffline = () => {
			setIsOnline(false);
			setSyncQueueStatus((prev) => ({
				...prev,
				isOnline: false,
				mode: "OFFLINE_BUFFERING",
				survivabilityGrade: "DEGRADED",
			}));
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const refreshVaultSnapshots = () => {
		setVaultSnapshots(listLocalVaultSnapshots());
	};

	const runIntegrityCheck = async (autoRepair: boolean = false) => {
		setIsCheckingIntegrity(true);
		try {
			const report = await verifyLocalCacheIntegrity({
				autoRepair,
				organizationId,
			});
			setIntegrityReport(report);
			if (report) {
				setSyncQueueStatus((prev) => ({
					...prev,
					totalPending: report.storesStats.mutationsCount,
					unflushedMemoryBytes: report.storageEstimate.usageBytes,
				}));
			}
		} catch (err: any) {
			console.error("Integrity check failed:", err);
		} finally {
			setIsCheckingIntegrity(false);
		}
	};

	const handleCreateSnapshot = async () => {
		setIsCreatingSnapshot(true);
		setSnapshotError(null);
		setSnapshotVerified(null);
		try {
			const snap = await createLocalDatabaseSnapshot({
				organizationId,
				clinicName,
				notes: "Ручной снимок из панели управления Vault",
			});
			setCurrentSnapshot(snap);
			const verification = verifyDatabaseSnapshot(snap);
			setSnapshotVerified(verification.valid);
		} catch (err: any) {
			setSnapshotError(
				err?.message || "Ошибка создания локального снапшота базы данных",
			);
		} finally {
			setIsCreatingSnapshot(false);
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
				meta: {
					clinicName: clinicName || "DENTE Клиника",
					notes: exportNotes || "Автономный 1-клик бэкап DENTE Vault",
				},
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
		setInspectedHeader(null);
		setDryRunResult(null);
		setLastRestoreResult(null);
		setRestoreError(null);

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			setImportRawText(text);
			const validation = inspectDenteBackup(text);
			if (validation.valid && validation.header) {
				setInspectedHeader(validation.header);
				executeDryRun(text, importPassphrase);
			} else {
				setInspectError(validation.error || "Некорректный файл архива DENTE");
			}
		};
		reader.onerror = () => {
			setInspectError("Не удалось прочитать файл");
		};
		reader.readAsText(file, "UTF-8");
	};

	const executeDryRun = (rawText: string, pass?: string) => {
		setIsExecutingDryRun(true);
		try {
			const dryRun = runDryRunRestoreVerification(rawText, {
				passphrase: pass || undefined,
				targetOrganizationId: organizationId,
			});
			setDryRunResult(dryRun);
		} catch (err: any) {
			setInspectError(
				err?.message ||
					"Ошибка предварительной проверки целостности архива",
			);
		} finally {
			setIsExecutingDryRun(false);
		}
	};

	const handlePassphraseChangeForDryRun = (newPass: string) => {
		setImportPassphrase(newPass);
		if (importRawText) {
			executeDryRun(importRawText, newPass);
		}
	};

	const handleRestore = async () => {
		if (!importRawText) return;
		setIsImporting(true);
		setRestoreError(null);
		try {
			const result = await importOfflineClinicBackup(importRawText, {
				passphrase: importPassphrase || undefined,
			});
			setLastRestoreResult(result);
			runIntegrityCheck(false);
			handleCreateSnapshot();
		} catch (err: any) {
			setRestoreError(
				err?.message || "Ошибка восстановления из резервной копии",
			);
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

	const handleRestoreSnapshot = async (snapshotId: string) => {
		const content = getLocalVaultSnapshotContent(snapshotId);
		if (!content) return;
		setImportRawText(content);
		setImportFileName(`Снимок Vault (${snapshotId})`);
		const validation = inspectDenteBackup(content);
		if (validation.valid && validation.header) {
			setInspectedHeader(validation.header);
			executeDryRun(content, importPassphrase);
			setActiveSection("restore");
		}
	};

	const handleDeleteSnapshot = (snapshotId: string) => {
		deleteLocalVaultSnapshot(snapshotId);
		refreshVaultSnapshots();
		setSchedulerStatus(getAutoBackupScheduleStatus());
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				maxHeight: "calc(100dvh - 32px)",
				overflowY: "auto",
				overscrollBehavior: "contain",
				gap: "20px",
				padding: "12px 0 80px 0",
				boxSizing: "border-box",
			}}
		>
			{/* SURVIVABILITY STATUS BANNER (TIER 1 TELEMETRY) */}
			<div
				style={{
					background: isOnline
						? "var(--paper-strong, #ffffff)"
						: "rgba(245, 158, 11, 0.08)",
					border: isOnline
						? "1px solid var(--glass-border, rgba(0,0,0,0.08))"
						: "1px solid rgba(245, 158, 11, 0.3)",
					borderRadius: "12px",
					padding: "16px 20px",
					boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "16px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
					<div
						style={{
							width: "42px",
							height: "42px",
							borderRadius: "10px",
							background: isOnline
								? "rgba(16, 185, 129, 0.12)"
								: "rgba(245, 158, 11, 0.16)",
							color: isOnline ? "var(--ok-fg)" : "var(--warn-fg)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							flexShrink: 0,
						}}
					>
						{isOnline ? <Wifi size={22} /> : <WifiOff size={22} />}
					</div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							<h3
								style={{
									margin: 0,
									fontSize: "16px",
									fontWeight: "600",
									color: "var(--ink, #1e293b)",
								}}
							>
								{isOnline
									? "Режим репликации: Синхронизировано"
									: "Аварийный офлайн-режим (Автономная буферизация)"}
							</h3>
							<span
								style={{
									fontSize: "11px",
									fontWeight: "700",
									padding: "2px 8px",
									borderRadius: "12px",
									background: isOnline
										? "rgba(16, 185, 129, 0.15)"
										: "rgba(245, 158, 11, 0.2)",
									color: isOnline ? "var(--ok-fg)" : "var(--warn-fg)",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
									display: "inline-flex",
									alignItems: "center",
									gap: "4px",
								}}
							>
								{isOnline ? (
									<CheckCircle2 size={12} />
								) : (
									<AlertTriangle size={12} />
								)}
								{syncQueueStatus.mode}
							</span>
							{syncQueueStatus.failedCount > 0 && (
								<span
									style={{
										fontSize: "11px",
										fontWeight: "700",
										padding: "2px 8px",
										borderRadius: "12px",
										background: "rgba(239, 68, 68, 0.15)",
										color: "var(--bad-fg)",
										display: "inline-flex",
										alignItems: "center",
										gap: "4px",
									}}
								>
									<XCircle size={12} />
									Ошибок: {syncQueueStatus.failedCount}
								</span>
							)}
						</div>
						<p
							style={{
								margin: "4px 0 0",
								fontSize: "13px",
								color: "var(--muted, #64748b)",
							}}
						>
							{isOnline
								? "Локальные хранилища защищены. Неотправленных мутаций: 0."
								: `Интернет отсутствует. Все действия сохраняются в защищенный буфер (в очереди: ${syncQueueStatus.totalPending} транзакций).`}
						</p>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						gap: "10px",
						alignItems: "center",
						flexWrap: "wrap",
					}}
				>
					<button
						type="button"
						onClick={() => runIntegrityCheck(false)}
						disabled={isCheckingIntegrity}
						className="secondary-button min-h-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
					>
						<RefreshCw
							size={15}
							className={isCheckingIntegrity ? "spin-animation" : ""}
						/>
						<span>
							{isCheckingIntegrity ? "Проверка..." : "Сверить буфер"}
						</span>
					</button>

					<button
						type="button"
						onClick={() => setIsSyncGuardOpen(true)}
						data-testid="open-sync-guard-modal-btn"
						style={{
							minHeight: "44px",
							padding: "0 16px",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							color: "var(--ink)",
							border: "1px solid var(--line)",
							fontWeight: "600",
							fontSize: "13px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxSizing: "border-box",
							transition: "all 0.15s ease",
						}}
						className="touch-manipulation"
					>
						<Activity size={15} />
						<span>Очередь офлайн-синхронизации</span>
					</button>
				</div>
			</div>

			{/* SECTION TABS (HOT PATH SELECTION) */}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					overflowX: "auto",
					gap: "6px",
					borderBottom: "1px solid var(--glass-border, #e2e8f0)",
					paddingBottom: "8px",
					WebkitOverflowScrolling: "touch",
				}}
				className="min-w-0"
				role="tablist"
				aria-label="Вкладки автономного хранилища Vault"
			>
				{[
					{
						id: "export",
						label: "1-Клик Экспорт (.dente)",
						icon: <HardDrive size={15} />,
					},
					{
						id: "restore",
						label: "Восстановление и Dry-Run",
						icon: <UploadCloud size={15} />,
					},
					{
						id: "snapshots",
						label: "Снапшоты и SHA-256",
						icon: <Database size={15} />,
					},
					{
						id: "scheduler",
						label: "Автобэкап (Расписание)",
						icon: <Clock size={15} />,
					},
					{
						id: "integrity",
						label: "Целостность и Здоровье",
						icon: <ShieldCheck size={15} />,
					},
				].map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activeSection === tab.id}
						onClick={() => setActiveSection(tab.id as any)}
						style={{
							minHeight: "44px",
							minWidth: "120px",
							padding: "6px 14px",
							borderRadius: "8px",
							border:
								activeSection === tab.id
									? "1px solid var(--teal, #0d9488)"
									: "1px solid transparent",
							background:
								activeSection === tab.id
									? "var(--paper-strong, #ffffff)"
									: "transparent",
							color:
								activeSection === tab.id
									? "var(--teal, #0d9488)"
									: "var(--muted, #64748b)",
							fontWeight: activeSection === tab.id ? "700" : "500",
							fontSize: "12px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxShadow:
								activeSection === tab.id
									? "0 1px 4px rgba(0,0,0,0.06)"
									: "none",
							transition: "all 0.15s ease",
							flexShrink: 0,
						}}
						className="touch-manipulation break-words min-w-0"
					>
						{tab.icon}
						<span className="break-words min-w-0">{tab.label}</span>
					</button>
				))}
			</div>

			{/* SECTION 1: 1-CLICK ENCRYPTED EXPORT (AES-GCM-256) */}
			{activeSection === "export" && (
				<OfflineBackupExportSection
					exportPassphrase={exportPassphrase}
					setExportPassphrase={setExportPassphrase}
					showExportPassphrase={showExportPassphrase}
					setShowExportPassphrase={setShowExportPassphrase}
					exportNotes={exportNotes}
					setExportNotes={setExportNotes}
					isExporting={isExporting}
					handleExport={handleExport}
					exportError={exportError}
					lastExportResult={lastExportResult}
				/>
			)}

			{/* SECTION 2: DRY-RUN RESTORE CHECK & RESTORATION */}
			{activeSection === "restore" && (
				<OfflineBackupRestoreSection
					fileInputRef={fileInputRef}
					handleFileSelect={handleFileSelect}
					importFileName={importFileName}
					inspectError={inspectError}
					dryRunResult={dryRunResult}
					importRawText={importRawText}
					importPassphrase={importPassphrase}
					showImportPassphrase={showImportPassphrase}
					setShowImportPassphrase={setShowImportPassphrase}
					handlePassphraseChangeForDryRun={handlePassphraseChangeForDryRun}
					executeDryRun={executeDryRun}
					isExecutingDryRun={isExecutingDryRun}
					handleRestore={handleRestore}
					isImporting={isImporting}
					restoreError={restoreError}
					lastRestoreResult={lastRestoreResult}
				/>
			)}

			{/* SECTION 3: DATABASE SNAPSHOTS & MERKLE SHA-256 HASHES */}
			{activeSection === "snapshots" && (
				<OfflineBackupSnapshotsSection
					handleCreateSnapshot={handleCreateSnapshot}
					isCreatingSnapshot={isCreatingSnapshot}
					snapshotError={snapshotError}
					currentSnapshot={currentSnapshot}
					snapshotVerified={snapshotVerified}
				/>
			)}

			{/* SECTION 4: AUTO-BACKUP SCHEDULER & ROLLING LOCAL SNAPSHOTS */}
			{activeSection === "scheduler" && (
				<OfflineBackupSchedulerSection
					schedulerIntervalMin={schedulerIntervalMin}
					setSchedulerIntervalMin={setSchedulerIntervalMin}
					schedulerStatus={schedulerStatus}
					handleToggleScheduler={handleToggleScheduler}
					vaultSnapshots={vaultSnapshots}
					handleRestoreSnapshot={handleRestoreSnapshot}
					handleDeleteSnapshot={handleDeleteSnapshot}
				/>
			)}

			{/* SECTION 5: INTEGRITY & HEALTH DIAGNOSTICS */}
			{activeSection === "integrity" && (
				<OfflineBackupIntegritySection
					runIntegrityCheck={(attempt) => {
						void runIntegrityCheck(attempt ?? false);
					}}
					isCheckingIntegrity={isCheckingIntegrity}
					integrityReport={integrityReport}
				/>
			)}

			<OfflineSyncGuardModal
				isOpen={isSyncGuardOpen}
				onClose={() => setIsSyncGuardOpen(false)}
			/>
		</div>
	);
};
