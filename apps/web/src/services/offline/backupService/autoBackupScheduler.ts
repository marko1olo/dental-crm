/**
 * DENTE CRM — Offline Auto Backup Scheduler
 * Layer 4: Background Scheduled Timers, Vault Snapshots & Disk Export Coordination
 */

import { logger } from "../../../utils/logger";
import {
	exportOfflineClinicBackup,
	listLocalVaultSnapshots,
	onVaultChange,
} from "./backupExportEngine.js";
import type {
	AutoBackupScheduleOptions,
	AutoBackupScheduleStatus,
} from "./types.js";

let autoBackupIntervalTimer: any = null;
let autoBackupStatus: AutoBackupScheduleStatus = {
	isRunning: false,
	intervalMinutes: 60,
	lastBackupAt: null,
	lastBackupStatus: null,
	lastBackupFilename: null,
	totalSnapshotsInVault: 0,
	nextScheduledRunAt: null,
};

// Automatically keep totalSnapshotsInVault in sync with storage changes
onVaultChange((count) => {
	autoBackupStatus.totalSnapshotsInVault = count;
});

/**
 * Запуск фонового автобэкапа по расписанию (Планировщик)
 */
export function startAutoBackupSchedule(options?: AutoBackupScheduleOptions): AutoBackupScheduleStatus {
	stopAutoBackupSchedule();

	const intervalMinutes = Math.max(5, options?.intervalMinutes || 60);
	const intervalMs = intervalMinutes * 60 * 1000;

	autoBackupStatus = {
		isRunning: true,
		intervalMinutes,
		lastBackupAt: autoBackupStatus.lastBackupAt,
		lastBackupStatus: autoBackupStatus.lastBackupStatus,
		lastBackupFilename: autoBackupStatus.lastBackupFilename,
		totalSnapshotsInVault: listLocalVaultSnapshots().length,
		nextScheduledRunAt: new Date(Date.now() + intervalMs).toISOString(),
	};

	autoBackupIntervalTimer = setInterval(async () => {
		if (typeof document !== "undefined" && document.hidden) return;
		try {
			logger.info("[OfflineBackup] Executing scheduled automatic backup...");
			const result = await exportOfflineClinicBackup({
				organizationId: options?.organizationId,
				passphrase: options?.passphrase,
				autoDownload: false, // Save silently to vault
				meta: {
					clinicName: "DENTE Клиника",
					notes: "Автоматический периодический снимок Vault",
					autoSnapshot: true,
				},
			});

			autoBackupStatus.lastBackupAt = new Date().toISOString();
			autoBackupStatus.lastBackupStatus = "success";
			autoBackupStatus.lastBackupFilename = result.filename;
			autoBackupStatus.nextScheduledRunAt = new Date(Date.now() + intervalMs).toISOString();

			if (options?.onBackupComplete) {
				options.onBackupComplete(result);
			}
		} catch (err: any) {
			logger.error("[OfflineBackup] Scheduled auto-backup failed", err);
			autoBackupStatus.lastBackupStatus = "error";
			if (options?.onBackupError) {
				options.onBackupError(err);
			}
		}
	}, intervalMs);

	if (typeof (autoBackupIntervalTimer as any)?.unref === "function") {
		(autoBackupIntervalTimer as any).unref();
	}

	logger.info(`[OfflineBackup] Auto-backup schedule started: interval ${intervalMinutes} minutes`);
	return { ...autoBackupStatus };
}

/**
 * Остановка фонового автобэкапа по расписанию
 */
export function stopAutoBackupSchedule(): void {
	if (autoBackupIntervalTimer) {
		clearInterval(autoBackupIntervalTimer);
		autoBackupIntervalTimer = null;
	}
	autoBackupStatus.isRunning = false;
	autoBackupStatus.nextScheduledRunAt = null;
}

/**
 * Получение текущего статуса автобэкапа по расписанию
 */
export function getAutoBackupScheduleStatus(): AutoBackupScheduleStatus {
	autoBackupStatus.totalSnapshotsInVault = listLocalVaultSnapshots().length;
	return { ...autoBackupStatus };
}
