/**
 * backupWorker.ts — зашифрованные резервные копии базы данных (Facade).
 * Декомпозирован в ./backup/ (Мандаты 8b, 8zi, W12-OPS-02).
 */
export {
	type BackupResult,
	backupsDirectory,
	pruneOldBackups,
} from "./backup/backupCryptoUtils.js";
export {
	type DumpContentStats,
	createEncryptedBackup,
} from "./backup/pgDumpClusterBackup.js";
export { createTenantEncryptedBackup } from "./backup/tenantSnapshotSerializer.js";
export {
	runScheduledBackupCycle,
	startBackupDaemon,
	stopBackupDaemon,
} from "./backup/backupRetentionWorker.js";
