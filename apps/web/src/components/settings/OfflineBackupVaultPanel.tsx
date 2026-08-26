import type { DenteBackupHeader, DenteBackupItemsCount } from "@dental/shared";
import {
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
	ShieldAlert,
	ShieldCheck,
	Square,
	Trash2,
	UploadCloud,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
	type ExportBackupResult,
	type LocalVaultSnapshotMeta,
	type RestoreBackupResult,
	deleteLocalVaultSnapshot,
	exportOfflineClinicBackup,
	getAutoBackupScheduleStatus,
	getLocalVaultSnapshotContent,
	importOfflineClinicBackup,
	inspectDenteBackup,
	listLocalVaultSnapshots,
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
	// Export state
	const [exportPassphrase, setExportPassphrase] = useState("");
	const [showExportPassphrase, setShowExportPassphrase] = useState(false);
	const [exportNotes, setExportNotes] = useState("");
	const [isExporting, setIsExporting] = useState(false);
	const [lastExportResult, setLastExportResult] = useState<ExportBackupResult | null>(null);
	const [exportError, setExportError] = useState<string | null>(null);

	// Import state
	const [importPassphrase, setImportPassphrase] = useState("");
	const [showImportPassphrase, setShowImportPassphrase] = useState(false);
	const [importRawText, setImportRawText] = useState<string | null>(null);
	const [importFileName, setImportFileName] = useState<string | null>(null);
	const [inspectedHeader, setInspectedHeader] = useState<DenteBackupHeader | null>(null);
	const [inspectError, setInspectError] = useState<string | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [lastRestoreResult, setLastRestoreResult] = useState<RestoreBackupResult | null>(null);
	const [restoreError, setRestoreError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Scheduler state
	const [schedulerStatus, setSchedulerStatus] = useState(getAutoBackupScheduleStatus());
	const [schedulerIntervalMin, setSchedulerIntervalMin] = useState<number>(60);
	const [vaultSnapshots, setVaultSnapshots] = useState<LocalVaultSnapshotMeta[]>([]);

	// Integrity state
	const [integrityReport, setIntegrityReport] = useState<OfflineCacheIntegrityReport | null>(null);
	const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);

	useEffect(() => {
		refreshVaultSnapshots();
		setSchedulerStatus(getAutoBackupScheduleStatus());
		runIntegrityCheck(false);
	}, []);

	const refreshVaultSnapshots = () => {
		setVaultSnapshots(listLocalVaultSnapshots());
	};

	const runIntegrityCheck = async (autoRepair: boolean) => {
		setIsCheckingIntegrity(true);
		try {
			const report = await verifyLocalCacheIntegrity({ autoRepair, organizationId });
			setIntegrityReport(report);
		} catch (err: any) {
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
		setLastRestoreResult(null);
		setRestoreError(null);

		const reader = new FileReader();
		reader.onload = (event) => {
			const text = event.target?.result as string;
			setImportRawText(text);
			const validation = inspectDenteBackup(text);
			if (validation.valid && validation.header) {
				setInspectedHeader(validation.header);
			} else {
				setInspectError(validation.error || "Некорректный файл архива DENTE");
			}
		};
		reader.onerror = () => {
			setInspectError("Не удалось прочитать файл");
		};
		reader.readAsText(file, "UTF-8");
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
				gap: "24px",
				padding: "16px 0",
			}}
		>
			{/* SECTION 1: 1-CLICK ENCRYPTED EXPORT (USB / EXTERNAL DRIVE / AES-GCM-256) */}
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
						gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
						gap: "16px",
						marginBottom: "20px",
					}}
				>
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
							Пароль шифрования архива (опционально)
						</label>
						<div style={{ position: "relative" }}>
							<input
								type={showExportPassphrase ? "text" : "password"}
								value={exportPassphrase}
								onChange={(e) => setExportPassphrase(e.target.value)}
								placeholder="По умолчанию — ключ клиники"
								style={{
									width: "100%",
									minHeight: "44px",
									padding: "8px 44px 8px 12px",
									borderRadius: "8px",
									border: "1px solid var(--glass-border, #cbd5e1)",
									background: "var(--paper, #f8fafc)",
									color: "var(--ink, #1e293b)",
									fontSize: "14px",
									boxSizing: "border-box",
								}}
							/>
							<button
								type="button"
								onClick={() => setShowExportPassphrase(!showExportPassphrase)}
								style={{
									position: "absolute",
									right: "6px",
									top: "50%",
									transform: "translateY(-50%)",
									minWidth: "36px",
									minHeight: "36px",
									background: "transparent",
									border: "none",
									cursor: "pointer",
									color: "var(--muted, #64748b)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								{showExportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
					</div>

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
							Заметка / метка архива
						</label>
						<input
							type="text"
							value={exportNotes}
							onChange={(e) => setExportNotes(e.target.value)}
							placeholder="Например: Плановый бэкап перед закрытием смены"
							style={{
								width: "100%",
								minHeight: "44px",
								padding: "8px 12px",
								borderRadius: "8px",
								border: "1px solid var(--glass-border, #cbd5e1)",
								background: "var(--paper, #f8fafc)",
								color: "var(--ink, #1e293b)",
								fontSize: "14px",
								boxSizing: "border-box",
							}}
						/>
					</div>
				</div>

				<div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
					<button
						type="button"
						onClick={() => handleExport(true)}
						disabled={isExporting}
						style={{
							minHeight: "44px",
							padding: "0 20px",
							borderRadius: "8px",
							background: "#059669",
							color: "#ffffff",
							border: "none",
							fontWeight: "600",
							fontSize: "14px",
							cursor: isExporting ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							boxShadow: "0 2px 4px rgba(5,150,105,0.2)",
						}}
					>
						<Download size={18} />
						{isExporting ? "Создание архива..." : "Выбрать диск / USB и сохранить (.dente)"}
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
							fontSize: "14px",
							cursor: isExporting ? "not-allowed" : "pointer",
							display: "flex",
							alignItems: "center",
							gap: "6px",
						}}
					>
						<Download size={16} />
						Скачать через браузер
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
							<div>Мутаций: <strong>{lastExportResult.stats.mutations}</strong></div>
							<div>Черновиков: <strong>{lastExportResult.stats.drafts}</strong></div>
							<div>Расписаний: <strong>{lastExportResult.stats.schedules ?? 0}</strong></div>
							<div>Пациентов: <strong>{lastExportResult.stats.patients ?? 0}</strong></div>
							<div>Клинический кэш: <strong>{lastExportResult.stats.clinicalCache}</strong></div>
						</div>
					</div>
				)}
			</div>

			{/* SECTION 2: 1-CLICK RESTORE / IMPORT WITH INTEGRITY VERIFICATION */}
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
							Восстановление из зашифрованного архива (.dente)
						</h3>
						<p
							style={{
								margin: "4px 0 0",
								fontSize: "13px",
								color: "var(--muted, #64748b)",
							}}
						>
							Криптографическая проверка контрольных сумм SHA-256 перед записью в IndexedDB
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
						border: "2px dashed var(--glass-border, #cbd5e1)",
						borderRadius: "10px",
						padding: "24px",
						textAlign: "center",
						cursor: "pointer",
						background: "var(--paper, #f8fafc)",
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

				{inspectedHeader && (
					<div
						style={{
							marginBottom: "16px",
							padding: "16px",
							borderRadius: "8px",
							background: "rgba(59, 130, 246, 0.06)",
							border: "1px solid rgba(59, 130, 246, 0.2)",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								color: "#2563eb",
								fontWeight: "600",
								fontSize: "14px",
								marginBottom: "8px",
							}}
						>
							<ShieldCheck size={18} />
							Подпись контейнера подтверждена: {inspectedHeader.magic} (Версия {inspectedHeader.version})
						</div>
						<div
							style={{
								fontSize: "13px",
								color: "var(--ink, #334155)",
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
								gap: "8px",
							}}
						>
							<div>Экспортирован: <strong>{new Date(inspectedHeader.exportedAt).toLocaleString("ru-RU")}</strong></div>
							<div>Алгоритм: <strong>{inspectedHeader.encryptionAlgorithm || "AES-GCM-256"}</strong></div>
							<div>Мутаций: <strong>{inspectedHeader.itemsCount.mutations}</strong></div>
							<div>Черновиков: <strong>{inspectedHeader.itemsCount.drafts}</strong></div>
							<div>Расписаний: <strong>{inspectedHeader.itemsCount.schedules ?? 0}</strong></div>
							<div>Пациентов: <strong>{inspectedHeader.itemsCount.patients ?? 0}</strong></div>
						</div>
					</div>
				)}

				{importRawText && !inspectError && (
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
								Пароль расшифровки
							</label>
							<div style={{ position: "relative", maxWidth: "400px" }}>
								<input
									type={showImportPassphrase ? "text" : "password"}
									value={importPassphrase}
									onChange={(e) => setImportPassphrase(e.target.value)}
									placeholder="По умолчанию — ключ клиники"
									style={{
										width: "100%",
										minHeight: "44px",
										padding: "8px 44px 8px 12px",
										borderRadius: "8px",
										border: "1px solid var(--glass-border, #cbd5e1)",
										background: "var(--paper, #f8fafc)",
										color: "var(--ink, #1e293b)",
										fontSize: "14px",
										boxSizing: "border-box",
									}}
								/>
								<button
									type="button"
									onClick={() => setShowImportPassphrase(!showImportPassphrase)}
									style={{
										position: "absolute",
										right: "6px",
										top: "50%",
										transform: "translateY(-50%)",
										minWidth: "36px",
										minHeight: "36px",
										background: "transparent",
										border: "none",
										cursor: "pointer",
										color: "var(--muted, #64748b)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									{showImportPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
								</button>
							</div>
						</div>

						<button
							type="button"
							onClick={handleRestore}
							disabled={isImporting}
							style={{
								alignSelf: "flex-start",
								minHeight: "44px",
								padding: "0 20px",
								borderRadius: "8px",
								background: "#2563eb",
								color: "#ffffff",
								border: "none",
								fontWeight: "600",
								fontSize: "14px",
								cursor: isImporting ? "not-allowed" : "pointer",
								display: "flex",
								alignItems: "center",
								gap: "8px",
								boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
							}}
						>
							<UploadCloud size={18} />
							{isImporting ? "Восстановление..." : "Расшифровать и восстановить данные"}
						</button>
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

			{/* SECTION 3: VAULT PERIODIC AUTO-BACKUP SCHEDULER & ROLLING SNAPSHOTS */}
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
								Автоматическое периодическое резервирование (Vault Scheduler)
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
							style={{
								minHeight: "44px",
								padding: "0 12px",
								borderRadius: "8px",
								border: "1px solid var(--glass-border, #cbd5e1)",
								background: "var(--paper, #f8fafc)",
								color: "var(--ink, #1e293b)",
								fontSize: "14px",
							}}
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
									<Square size={16} /> Остановить шедулер
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
						Шедулер активен (интервал: {schedulerStatus.intervalMinutes} мин). Следующий снимок: {schedulerStatus.nextScheduledRunAt ? new Date(schedulerStatus.nextScheduledRunAt).toLocaleTimeString("ru-RU") : "скоро"}
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

			{/* SECTION 4: STORAGE INTEGRITY & HEALTH DIAGNOSTICS */}
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
		</div>
	);
};
