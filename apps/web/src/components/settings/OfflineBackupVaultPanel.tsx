import type {
	DatabaseSnapshot,
	DenteBackupHeader,
	DenteBackupItemsCount,
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
	Download,
	Eye,
	EyeOff,
	FileArchive,
	HardDrive,
	KeyRound,
	Lock,
	Play,
	RefreshCw,
	ServerCrash,
	ShieldAlert,
	ShieldCheck,
	Square,
	Trash2,
	UploadCloud,
	Wifi,
	WifiOff,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
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

interface OfflineBackupVaultPanelProps {
	organizationId?: string | undefined;
	clinicName?: string | undefined;
}

export const OfflineBackupVaultPanel: React.FC<OfflineBackupVaultPanelProps> = ({
	organizationId,
	clinicName,
}) => {
	// Active Tab state for 3-Tier UX
	const [activeSection, setActiveSection] = useState<"export" | "restore" | "snapshots" | "sync_queue" | "scheduler" | "integrity">("export");

	// Export state
	const [exportPassphrase, setExportPassphrase] = useState("");
	const [showExportPassphrase, setShowExportPassphrase] = useState(false);
	const [exportNotes, setExportNotes] = useState("");
	const [isExporting, setIsExporting] = useState(false);
	const [lastExportResult, setLastExportResult] = useState<ExportBackupResult | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);

	// Import & Dry-Run state
	const [importPassphrase, setImportPassphrase] = useState("");
	const [showImportPassphrase, setShowImportPassphrase] = useState(false);
	const [importRawText, setImportRawText] = useState<string | null>(null);
	const [importFileName, setImportFileName] = useState<string | null>(null);
	const [inspectedHeader, setInspectedHeader] = useState<DenteBackupHeader | null>(null);
	const [dryRunResult, setDryRunResult] = useState<DryRunRestoreResult | null>(null);
	const [inspectError, setInspectError] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [isExecutingDryRun, setIsExecutingDryRun] = useState(false);
	const [lastRestoreResult, setLastRestoreResult] = useState<RestoreBackupResult | null>(null);
	const [restoreError, setRestoreError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Snapshot state
	const [currentSnapshot, setCurrentSnapshot] = useState<DatabaseSnapshot | null>(null);
	const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
	const [snapshotVerified, setSnapshotVerified] = useState<boolean | null>(null);
	const [snapshotError, setSnapshotError] = useState<string | null>(null);

	// Scheduler state
	const [schedulerStatus, setSchedulerStatus] = useState(getAutoBackupScheduleStatus());
	const [schedulerIntervalMin, setSchedulerIntervalMin] = useState<number>(60);
	const [vaultSnapshots, setVaultSnapshots] = useState<LocalVaultSnapshotMeta[]>([]);

	// Integrity state
	const [integrityReport, setIntegrityReport] = useState<OfflineCacheIntegrityReport | null>(null);
	const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

	// Sync Queue & Offline Survivability state
	const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
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
		refreshVaultSnapshots();
		setSchedulerStatus(getAutoBackupScheduleStatus());
		runIntegrityCheck(false);
		handleCreateSnapshot();

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

	const refreshVaultSnapshots = () => {
		setVaultSnapshots(listLocalVaultSnapshots());
	};

	const runIntegrityCheck = async (autoRepair: boolean) => {
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
			setSnapshotError(err?.message || "Ошибка создания локального снапшота базы данных");
		} finally {
			setIsCreatingSnapshot(false);
		}
	};

	const handleVerifySnapshotChecksums = () => {
		if (!currentSnapshot) return;
		const result = verifyDatabaseSnapshot(currentSnapshot);
		setSnapshotVerified(result.valid);
		if (!result.valid && result.errorMessage) {
			setSnapshotError(result.errorMessage);
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
				// Automatically trigger initial dry run check
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
			setInspectError(err?.message || "Ошибка предварительной проверки целостности архива");
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
					background: isOnline ? "var(--paper-strong, #ffffff)" : "rgba(245, 158, 11, 0.08)",
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
							background: isOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.16)",
							color: isOnline ? "#059669" : "#d97706",
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
								{isOnline ? "Режим репликации: Синхронизировано" : "Аварийный офлайн-режим (Автономная буферизация)"}
							</h3>
							<span
								style={{
									fontSize: "11px",
									fontWeight: "700",
									padding: "2px 8px",
									borderRadius: "12px",
									background: isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.2)",
									color: isOnline ? "#047857" : "#b45309",
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								{syncQueueStatus.mode}
							</span>
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

				<div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
					<button
						type="button"
						onClick={() => runIntegrityCheck(false)}
						disabled={isCheckingIntegrity}
						className="secondary-button min-h-[44px] px-3.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation"
					>
						<RefreshCw size={15} className={isCheckingIntegrity ? "spin-animation" : ""} />
						<span>{isCheckingIntegrity ? "Проверка..." : "Сверить буфер"}</span>
					</button>

					<button
						type="button"
						onClick={handleCreateSnapshot}
						disabled={isCreatingSnapshot}
						style={{
							minHeight: "44px",
							padding: "0 16px",
							borderRadius: "8px",
							background: "#0284c7",
							color: "#ffffff",
							border: "1px solid transparent",
							fontWeight: "600",
							fontSize: "13px",
							cursor: isCreatingSnapshot ? "not-allowed" : "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxSizing: "border-box",
							boxShadow: "0 1px 3px rgba(2,132,199,0.25)",
							transition: "all 0.15s ease",
						}}
						className="touch-manipulation"
					>
						<Database size={15} />
						<span>{isCreatingSnapshot ? "Снимок..." : "Снимок БД (SHA-256)"}</span>
					</button>
				</div>
			</div>

			{/* NAVIGATION TABS (Miller's Law 7±2, Zero Text Truncation, 44px Touch Targets) */}
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
					{ id: "export", label: "1-Клик Экспорт (.dente)", icon: <HardDrive size={15} /> },
					{ id: "restore", label: "Восстановление и Dry-Run", icon: <UploadCloud size={15} /> },
					{ id: "snapshots", label: "Снапшоты и SHA-256", icon: <Database size={15} /> },
					{ id: "scheduler", label: "Автобэкап (Расписание)", icon: <Clock size={15} /> },
					{ id: "integrity", label: "Целостность и Здоровье", icon: <ShieldCheck size={15} /> },
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
							border: activeSection === tab.id ? "1px solid var(--teal, #0d9488)" : "1px solid transparent",
							background: activeSection === tab.id ? "var(--paper-strong, #ffffff)" : "transparent",
							color: activeSection === tab.id ? "var(--teal, #0d9488)" : "var(--muted, #64748b)",
							fontWeight: activeSection === tab.id ? "700" : "500",
							fontSize: "12px",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "6px",
							boxShadow: activeSection === tab.id ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
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
				<div
					style={{
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
						borderRadius: "12px",
						padding: "24px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: "16px",
						}}
					>
						<div
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "10px",
								background: "rgba(16, 185, 129, 0.12)",
								color: "#059669",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<HardDrive size={24} />
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
								Зашифрованный экспорт базы клиники (.dente AES-GCM-256)
							</h3>
							<p
								style={{
									margin: "4px 0 0",
									fontSize: "13px",
									color: "var(--muted, #64748b)",
								}}
							>
								1-клик сохранение на USB-флешку или сетевой диск без подключения к интернету
							</p>
						</div>
					</div>

					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
							gap: "12px",
							marginBottom: "16px",
						}}
					>
						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									fontWeight: "600",
									marginBottom: "4px",
									color: "var(--ink, #1e293b)",
								}}
							>
								Мастер-пароль шифрования архива (опционально)
							</label>
							<div style={{ position: "relative" }}>
								<input
									type={showExportPassphrase ? "text" : "password"}
									value={exportPassphrase}
									onChange={(e) => setExportPassphrase(e.target.value)}
									placeholder="По умолчанию — защищенный ключ клиники"
									className="w-full h-11 min-h-[44px] pl-3 pr-12 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs box-border focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
								<button
									type="button"
									onClick={() => setShowExportPassphrase(!showExportPassphrase)}
									className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer touch-manipulation absolute right-0 top-1/2 -translate-y-1/2"
									aria-label={showExportPassphrase ? "Скрыть мастер-пароль" : "Показать мастер-пароль"}
								>
									{showExportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</div>

						<div>
							<label
								style={{
									display: "block",
									fontSize: "12px",
									fontWeight: "600",
									marginBottom: "4px",
									color: "var(--ink, #1e293b)",
								}}
							>
								Заметка / метка смены архива
							</label>
							<input
								type="text"
								value={exportNotes}
								onChange={(e) => setExportNotes(e.target.value)}
								placeholder="Например: Плановый бэкап перед закрытием смены"
								className="w-full h-11 min-h-[44px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs box-border focus:outline-none focus:ring-2 focus:ring-teal-500"
							/>
						</div>
					</div>

					<div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
						<button
							type="button"
							onClick={() => handleExport(true)}
							disabled={isExporting}
							style={{
								minHeight: "44px",
								padding: "0 18px",
								borderRadius: "8px",
								background: "#059669",
								color: "#ffffff",
								border: "none",
								fontWeight: "600",
								fontSize: "13px",
								cursor: isExporting ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "8px",
								boxShadow: "0 1px 3px rgba(5,150,105,0.2)",
								boxSizing: "border-box",
							}}
							className="touch-manipulation"
						>
							<Download size={16} />
							<span>{isExporting ? "Создание архива..." : "Выбрать диск / USB (.dente)"}</span>
						</button>

						<button
							type="button"
							onClick={() => handleExport(false)}
							disabled={isExporting}
							style={{
								minHeight: "44px",
								padding: "0 16px",
								borderRadius: "8px",
								background: "var(--paper, #f1f5f9)",
								color: "var(--ink, #334155)",
								border: "1px solid var(--glass-border, #cbd5e1)",
								fontWeight: "500",
								fontSize: "13px",
								cursor: isExporting ? "not-allowed" : "pointer",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "6px",
								boxSizing: "border-box",
							}}
							className="touch-manipulation"
						>
							<Download size={15} />
							<span>Скачать через браузер</span>
						</button>
					</div>

					{exportError && (
						<div
							style={{
								marginTop: "16px",
								padding: "12px",
								borderRadius: "8px",
								background: "rgba(239, 68, 68, 0.1)",
								color: "#dc2626",
								fontSize: "13px",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<AlertTriangle size={18} />
							{exportError}
						</div>
					)}

					{lastExportResult && (
						<div
							style={{
								marginTop: "16px",
								padding: "16px",
								borderRadius: "8px",
								background: "rgba(16, 185, 129, 0.08)",
								border: "1px solid rgba(16, 185, 129, 0.2)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									color: "#059669",
									fontWeight: "600",
									fontSize: "14px",
									marginBottom: "8px",
								}}
							>
								<CheckCircle2 size={18} />
								Архив успешно создан и зашифрован (AES-GCM-256)
							</div>
							<div
								style={{
									fontSize: "13px",
									color: "var(--ink, #334155)",
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: "8px",
								}}
							>
								<div>Файл: <strong>{lastExportResult.filename}</strong></div>
								<div>Контейнер: <strong>{lastExportResult.header.magic}</strong></div>
								<div>SHA-256: <strong>{lastExportResult.header.payloadSha256.substring(0, 16)}...</strong></div>
								<div>Мутаций: <strong>{lastExportResult.stats.mutations}</strong></div>
								<div>Черновиков: <strong>{lastExportResult.stats.drafts}</strong></div>
								<div>Расписаний: <strong>{lastExportResult.stats.schedules ?? 0}</strong></div>
								<div>Пациентов: <strong>{lastExportResult.stats.patients ?? 0}</strong></div>
								<div>Клинический кэш: <strong>{lastExportResult.stats.clinicalCache}</strong></div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* SECTION 2: DRY-RUN RESTORE CHECK & RESTORATION */}
			{activeSection === "restore" && (
				<div
					style={{
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
						borderRadius: "12px",
						padding: "24px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "12px",
							marginBottom: "16px",
						}}
					>
						<div
							style={{
								width: "44px",
								height: "44px",
								borderRadius: "10px",
								background: "rgba(59, 130, 246, 0.12)",
								color: "#2563eb",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<UploadCloud size={24} />
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
								Безопасное восстановление и Dry-Run валидатор (.dente)
							</h3>
							<p
								style={{
									margin: "4px 0 0",
									fontSize: "13px",
									color: "var(--muted, #64748b)",
								}}
							>
								Предварительная симуляция распаковки и сверка контрольной суммы SHA-256 перед записью в IndexedDB
							</p>
						</div>
					</div>

					<input
						type="file"
						ref={fileInputRef}
						onChange={handleFileSelect}
						accept=".dente,application/json"
						style={{ display: "none" }}
					/>

					<div
						onClick={() => fileInputRef.current?.click()}
						style={{
							border: "2px dashed var(--glass-border-strong, #cbd5e1)",
							borderRadius: "10px",
							padding: "24px",
							textAlign: "center",
							cursor: "pointer",
							background: "var(--paper-strong, #ffffff)",
							marginBottom: "16px",
						}}
					>
						<FileArchive size={32} style={{ color: "var(--muted, #64748b)", marginBottom: "8px" }} />
						<div style={{ fontSize: "14px", fontWeight: "500", color: "var(--ink, #1e293b)" }}>
							{importFileName ? `Выбран файл: ${importFileName}` : "Нажмите, чтобы выбрать файл .dente с флешки или перетащите сюда"}
						</div>
						<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginTop: "4px" }}>
							Поддерживаются форматы DENTE_ENCRYPTED_BACKUP_V2 (AES-GCM-256) и V1
						</div>
					</div>

					{inspectError && (
						<div
							style={{
								marginBottom: "16px",
								padding: "12px",
								borderRadius: "8px",
								background: "rgba(239, 68, 68, 0.1)",
								color: "#dc2626",
								fontSize: "13px",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<AlertTriangle size={18} />
							{inspectError}
						</div>
					)}

					{/* DRY-RUN REPORT CARD */}
					{dryRunResult && (
						<div
							style={{
								marginBottom: "16px",
								padding: "16px",
								borderRadius: "8px",
								background:
									dryRunResult.integrityGrade === "EXCELLENT"
										? "rgba(16, 185, 129, 0.06)"
										: dryRunResult.integrityGrade === "WARNING"
											? "rgba(245, 158, 11, 0.06)"
											: "rgba(239, 68, 68, 0.06)",
								border:
									dryRunResult.integrityGrade === "EXCELLENT"
										? "1px solid rgba(16, 185, 129, 0.25)"
										: dryRunResult.integrityGrade === "WARNING"
											? "1px solid rgba(245, 158, 11, 0.25)"
											: "1px solid rgba(239, 68, 68, 0.25)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									flexWrap: "wrap",
									gap: "8px",
									marginBottom: "10px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
									{dryRunResult.integrityGrade === "EXCELLENT" ? (
										<ShieldCheck size={20} color="#059669" />
									) : dryRunResult.integrityGrade === "WARNING" ? (
										<AlertTriangle size={20} color="#d97706" />
									) : (
										<ShieldAlert size={20} color="#dc2626" />
									)}
									<span style={{ fontWeight: "600", fontSize: "14px", color: "var(--ink, #1e293b)" }}>
										Результат Dry-Run симуляции:
									</span>
									<span
										style={{
											fontSize: "12px",
											fontWeight: "700",
											padding: "2px 8px",
											borderRadius: "10px",
											background:
												dryRunResult.integrityGrade === "EXCELLENT"
													? "#059669"
													: dryRunResult.integrityGrade === "WARNING"
														? "#d97706"
														: "#dc2626",
											color: "#ffffff",
										}}
									>
										{dryRunResult.integrityGrade}
									</span>
								</div>
								<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
									Время проверки: {dryRunResult.executionDurationMs} мс
								</div>
							</div>

							<div
								style={{
									fontSize: "13px",
									color: "var(--ink, #334155)",
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: "8px",
									marginBottom: "12px",
								}}
							>
								<div>Контрольная сумма: <strong>{dryRunResult.checksumVerified ? "Подтверждена" : "Ошибка"}</strong></div>
								<div>Всего объектов: <strong>{dryRunResult.totalRecordsCount}</strong></div>
								<div>Мутаций: <strong>{dryRunResult.previewStats.mutations}</strong></div>
								<div>Черновиков: <strong>{dryRunResult.previewStats.drafts}</strong></div>
								<div>Клинический кэш: <strong>{dryRunResult.previewStats.clinicalCache}</strong></div>
								<div>Пациентов: <strong>{dryRunResult.previewStats.patients ?? 0}</strong></div>
							</div>

							{dryRunResult.warnings.length > 0 && (
								<div style={{ fontSize: "12px", color: "#b45309", marginBottom: "8px" }}>
									{dryRunResult.warnings.map((w, idx) => (
										<div key={idx}>⚠️ {w}</div>
									))}
								</div>
							)}

							{dryRunResult.errors.length > 0 && (
								<div style={{ fontSize: "12px", color: "#dc2626" }}>
									{dryRunResult.errors.map((err, idx) => (
										<div key={idx}>❌ {err}</div>
									))}
								</div>
							)}
						</div>
					)}

					{importRawText && (
						<div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
							<div>
								<label
									style={{
										display: "block",
										fontSize: "13px",
										fontWeight: "500",
										marginBottom: "6px",
										color: "var(--ink, #1e293b)",
									}}
								>
									Пароль расшифровки архива
								</label>
								<div style={{ position: "relative", maxWidth: "420px" }}>
									<input
										type={showImportPassphrase ? "text" : "password"}
										value={importPassphrase}
										onChange={(e) => handlePassphraseChangeForDryRun(e.target.value)}
										placeholder="По умолчанию — ключ клиники"
										className="w-full h-11 min-h-[44px] pl-3 pr-12 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 text-xs box-border focus:outline-none focus:ring-2 focus:ring-teal-500"
									/>
									<button
										type="button"
										onClick={() => setShowImportPassphrase(!showImportPassphrase)}
										className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer touch-manipulation absolute right-0 top-1/2 -translate-y-1/2"
										aria-label={showImportPassphrase ? "Скрыть мастер-пароль" : "Показать мастер-пароль"}
									>
										{showImportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
							</div>

							<div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
								<button
									type="button"
									onClick={() => executeDryRun(importRawText, importPassphrase)}
									disabled={isExecutingDryRun}
									style={{
										minHeight: "44px",
										padding: "0 16px",
										borderRadius: "8px",
										background: "var(--paper, #f1f5f9)",
										color: "var(--ink, #334155)",
										border: "1px solid var(--glass-border, #cbd5e1)",
										fontWeight: "500",
										fontSize: "14px",
										cursor: isExecutingDryRun ? "not-allowed" : "pointer",
										display: "flex",
										alignItems: "center",
										gap: "6px",
									}}
								>
									<ShieldCheck size={16} />
									{isExecutingDryRun ? "Проверка..." : "Повторить Dry-Run тест"}
								</button>

								<button
									type="button"
									onClick={handleRestore}
									disabled={isImporting || !dryRunResult?.dryRunSuccess}
									style={{
										minHeight: "44px",
										padding: "0 20px",
										borderRadius: "8px",
										background: dryRunResult?.dryRunSuccess ? "#2563eb" : "var(--muted, #94a3b8)",
										color: "#ffffff",
										border: "none",
										fontWeight: "600",
										fontSize: "14px",
										cursor: isImporting || !dryRunResult?.dryRunSuccess ? "not-allowed" : "pointer",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										boxShadow: dryRunResult?.dryRunSuccess ? "0 2px 4px rgba(37,99,235,0.2)" : "none",
									}}
								>
									<UploadCloud size={18} />
									{isImporting ? "Восстановление..." : "Расшифровать и восстановить данные"}
								</button>
							</div>
						</div>
					)}

					{restoreError && (
						<div
							style={{
								marginTop: "16px",
								padding: "12px",
								borderRadius: "8px",
								background: "rgba(239, 68, 68, 0.1)",
								color: "#dc2626",
								fontSize: "13px",
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<AlertTriangle size={18} />
							{restoreError}
						</div>
					)}

					{lastRestoreResult && (
						<div
							style={{
								marginTop: "16px",
								padding: "16px",
								borderRadius: "8px",
								background: "rgba(16, 185, 129, 0.08)",
								border: "1px solid rgba(16, 185, 129, 0.2)",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									color: "#059669",
									fontWeight: "600",
									fontSize: "14px",
									marginBottom: "8px",
								}}
							>
								<CheckCircle2 size={18} />
								Данные успешно восстановлены и проверены
							</div>
							<div
								style={{
									fontSize: "13px",
									color: "var(--ink, #334155)",
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
									gap: "8px",
								}}
							>
								<div>Мутаций: <strong>{lastRestoreResult.restoredCount.mutations}</strong></div>
								<div>Черновиков: <strong>{lastRestoreResult.restoredCount.drafts}</strong></div>
								<div>Расписаний: <strong>{lastRestoreResult.restoredCount.schedules}</strong></div>
								<div>Пациентов: <strong>{lastRestoreResult.restoredCount.patients}</strong></div>
								<div>Одонтограмм: <strong>{lastRestoreResult.restoredCount.odontograms}</strong></div>
								<div>Клинический кэш: <strong>{lastRestoreResult.restoredCount.clinicalCache}</strong></div>
							</div>
						</div>
					)}
				</div>
			)}

			{/* SECTION 3: DATABASE SNAPSHOTS & MERKLE SHA-256 HASHES */}
			{activeSection === "snapshots" && (
				<div
					style={{
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
						borderRadius: "12px",
						padding: "24px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
									background: "rgba(2, 132, 199, 0.12)",
									color: "#0284c7",
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
									Потабличный расчет контрольных сумм и корневой дайджест базы (IndexedDB / SQLite)
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
									background: "#0284c7",
									color: "#ffffff",
									border: "none",
									fontWeight: "600",
									fontSize: "14px",
									cursor: isCreatingSnapshot ? "not-allowed" : "pointer",
									display: "flex",
									alignItems: "center",
									gap: "8px",
								}}
							>
								<RefreshCw size={16} className={isCreatingSnapshot ? "spin-animation" : ""} />
								{isCreatingSnapshot ? "Создание слепка..." : "Пересчитать хеши базы"}
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
								color: "#dc2626",
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
									background: snapshotVerified ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
									color: snapshotVerified ? "#047857" : "#b45309",
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
									Слепок: <strong>{new Date(currentSnapshot.metadata.createdAtIso).toLocaleTimeString("ru-RU")}</strong> (Объектов: {currentSnapshot.metadata.totalRecords})
								</div>
							</div>

							<div
								style={{
									display: "grid",
									gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
									gap: "12px",
								}}
							>
								{Object.entries(currentSnapshot.tables).map(([tableName, table]: [string, any]) => (
									<div
										key={tableName}
										style={{
											padding: "12px 14px",
											background: "var(--paper, #f8fafc)",
											border: "1px solid var(--glass-border, #e2e8f0)",
											borderRadius: "8px",
										}}
									>
										<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
											<strong style={{ fontSize: "13px", color: "var(--ink, #1e293b)" }}>
												{tableName}
											</strong>
											<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
												{table.rowCount} записей
											</span>
										</div>
										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", wordBreak: "break-all" }}>
											SHA-256: <code>{table.tableSha256.substring(0, 24)}...</code>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{/* SECTION 4: AUTO-BACKUP SCHEDULER & ROLLING LOCAL SNAPSHOTS */}
			{activeSection === "scheduler" && (
				<div
					style={{
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
						borderRadius: "12px",
						padding: "24px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
									background: "rgba(139, 92, 246, 0.12)",
									color: "#7c3aed",
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
									Фоновое создание зашифрованных слепков в локальное защищенное хранилище
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
									background: schedulerStatus.isRunning ? "#dc2626" : "#7c3aed",
									color: "#ffffff",
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
								background: "rgba(139, 92, 246, 0.08)",
								fontSize: "13px",
								color: "#6d28d9",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								marginBottom: "16px",
							}}
						>
							<RefreshCw size={16} className="spin-animation" />
							Автобэкап по расписанию активен (интервал: {schedulerStatus.intervalMinutes} мин). Следующий снимок: {schedulerStatus.nextScheduledRunAt ? new Date(schedulerStatus.nextScheduledRunAt).toLocaleTimeString("ru-RU") : "скоро"}
						</div>
					)}

					{vaultSnapshots.length > 0 && (
						<div>
							<h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--ink, #1e293b)", marginBottom: "12px" }}>
								Недавние локальные снимки Vault ({vaultSnapshots.length})
							</h4>
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
											<div style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink, #1e293b)" }}>
												{snap.filename}
											</div>
											<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
												{new Date(snap.timestamp).toLocaleString("ru-RU")} · {Math.round(snap.sizeBytes / 1024)} КБ · {snap.itemsCount.mutations} мут., {snap.itemsCount.drafts} черн.
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
													background: "#2563eb",
													color: "#ffffff",
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
													color: "#dc2626",
													border: "none",
													fontSize: "12px",
													cursor: "pointer",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
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
			)}

			{/* SECTION 5: INTEGRITY & HEALTH DIAGNOSTICS */}
			{activeSection === "integrity" && (
				<div
					style={{
						background: "var(--paper-strong, #ffffff)",
						border: "1px solid var(--glass-border, rgba(0,0,0,0.08))",
						borderRadius: "12px",
						padding: "24px",
						boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
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
									background: "rgba(14, 165, 233, 0.12)",
									color: "#0284c7",
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
									Сверка контрольных сумм полезной нагрузки, структуры таблиц и квоты браузера
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
										background: "#d97706",
										color: "#ffffff",
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
									background: integrityReport.healthy ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
									color: integrityReport.healthy ? "#059669" : "#dc2626",
									fontWeight: "600",
									fontSize: "14px",
								}}
							>
								{integrityReport.healthy ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
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
								<div style={{ padding: "10px", background: "var(--paper, #f8fafc)", borderRadius: "6px" }}>
									Мутации: <strong>{integrityReport.storesStats.mutationsCount}</strong>
								</div>
								<div style={{ padding: "10px", background: "var(--paper, #f8fafc)", borderRadius: "6px" }}>
									Черновики: <strong>{integrityReport.storesStats.draftsCount}</strong>
								</div>
								<div style={{ padding: "10px", background: "var(--paper, #f8fafc)", borderRadius: "6px" }}>
									Клинический кэш: <strong>{integrityReport.storesStats.clinicalCacheCount}</strong>
								</div>
								<div style={{ padding: "10px", background: "var(--paper, #f8fafc)", borderRadius: "6px" }}>
									Расписания: <strong>{integrityReport.storesStats.schedulesCount}</strong>
								</div>
								<div style={{ padding: "10px", background: "var(--paper, #f8fafc)", borderRadius: "6px" }}>
									Пациенты: <strong>{integrityReport.storesStats.patientsCount}</strong>
								</div>
								<div style={{ padding: "10px", background: "var(--paper, #f8fafc)", borderRadius: "6px" }}>
									Свободно памяти: <strong>{integrityReport.storageEstimate.freeFormatted}</strong>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
