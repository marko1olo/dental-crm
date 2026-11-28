import { createApiLogger, safeLogError } from "../../observability/index.js";
import { resolveEncryptionKey } from "./backupCryptoUtils.js";
import { createEncryptedBackup } from "./pgDumpClusterBackup.js";
import { createTenantEncryptedBackup } from "./tenantSnapshotSerializer.js";

const logger = createApiLogger("backupWorker");

let backupInterval: NodeJS.Timeout | null = null;
let firstRunTimeout: NodeJS.Timeout | null = null;

function backupIntervalMs(): number {
	const configured = Number(process.env.DENTE_BACKUP_INTERVAL_HOURS ?? 24);
	const hours = Number.isFinite(configured) && configured > 0 ? configured : 24;
	return hours * 60 * 60 * 1000;
}

export async function runScheduledBackupCycle(): Promise<void> {
	const mode = (process.env.DENTE_BACKUP_MODE ?? "both").trim().toLowerCase();

	if (mode !== "cluster") {
		try {
			const [{ withSuperuserBypass }, schema] = await Promise.all([
				import("../../db/rls.js"),
				import("../../db/schema.js"),
			]);
			const orgs = await withSuperuserBypass(async (tx) =>
				tx.select({ id: schema.organizations.id }).from(schema.organizations),
			);
			for (const org of orgs) {
				await createTenantEncryptedBackup(org.id);
			}
		} catch (error) {
			logger.warn(
				{ err: safeLogError(error) },
				"Изолированное по-арендное резервное копирование пропущено из-за недоступности БД",
			);
		}
	}

	if (mode !== "tenant") {
		await createEncryptedBackup();
	}
}

export function startBackupDaemon(): void {
	if (backupInterval || firstRunTimeout) return;

	const keyResult = resolveEncryptionKey();
	if ("error" in keyResult) {
		logger.error(
			{ err: keyResult.error },
			"Резервное копирование ОТКЛЮЧЕНО: отсутствует или недействителен ключ шифрования",
		);
		return;
	}

	logger.info("Резервное копирование включено");

	const firstRunDelayMs = Number(
		process.env.DENTE_BACKUP_FIRST_RUN_DELAY_MS ?? 120_000,
	);
	firstRunTimeout = setTimeout(
		() => {
			firstRunTimeout = null;
			void runScheduledBackupCycle().catch((err) => {
				logger.error(
					{ err: safeLogError(err) },
					"Uncaught error during initial backup run",
				);
			});
		},
		Math.max(0, firstRunDelayMs),
	);
	firstRunTimeout?.unref();

	const interval = setInterval(() => {
		void runScheduledBackupCycle().catch((err) => {
			logger.error(
				{ err: safeLogError(err) },
				"Uncaught error during scheduled backup cycle",
			);
		});
	}, backupIntervalMs());
	interval.unref();
	backupInterval = interval;
}

export function stopBackupDaemon(): void {
	if (firstRunTimeout) {
		clearTimeout(firstRunTimeout);
		firstRunTimeout = null;
	}
	if (backupInterval) {
		clearInterval(backupInterval);
		backupInterval = null;
		logger.info("Резервное копирование остановлено");
	}
}
