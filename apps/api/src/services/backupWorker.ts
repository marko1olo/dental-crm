/**
 * backupWorker.ts — зашифрованные резервные копии базы данных (Facade).
 * Декомпозирован в ./backup/ (Мандаты 8b, 8zi, W12-OPS-02).
 */
export {
	type BackupResult,
	backupsDirectory,
	pruneOldBackups,
	resolveEncryptionKey,
} from "./backup/backupCryptoUtils.js";
export {
	type DumpContentStats,
	createEncryptedBackup,
} from "./backup/pgDumpClusterBackup.js";
export {
	type BackupColumnMeta,
	type BackupTableKind,
	type BackupTableMeta,
	type SchemaBackupDag,
	EXPLICIT_NON_TENANT_TABLES,
	buildSchemaBackupDag,
} from "./backup/schemaBackupRegistry.js";
export {
	type CreateTenantBackupOptions,
	BACKUP_FORMAT_V2,
	createTenantEncryptedBackup,
} from "./backup/tenantSnapshotSerializer.js";
export {
	type RestoreSnapshotResult,
	restoreLegacySnapshotObjectToPg,
	restoreNdjsonSnapshotStreamToPg,
	restoreTenantSnapshotStreaming,
} from "./backup/streamingSnapshotRestorer.js";
export {
	runScheduledBackupCycle,
	startBackupDaemon,
	stopBackupDaemon,
} from "./backup/backupRetentionWorker.js";
