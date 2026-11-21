/**
 * apps/api/src/services/daemons/sanpinDaemon/logger.ts
 *
 * Единый структурированный логгер фонового демона СанПиН и складского аудита.
 * Заменяет неконтролируемые вызовы console.error / console.warn на безопасный логгер.
 */

export interface SanpinDaemonLogger {
	info(msg: string, ...args: unknown[]): void;
	warn(msg: string, ...args: unknown[]): void;
	error(msg: string, ...args: unknown[]): void;
}

let activeLogger: SanpinDaemonLogger | null = null;

export function setSanpinDaemonLogger(logger: SanpinDaemonLogger | null): void {
	activeLogger = logger;
}

export const sanpinLogger: SanpinDaemonLogger = {
	info(msg: string, ...args: unknown[]): void {
		if (activeLogger) {
			activeLogger.info(msg, ...args);
		}
	},
	warn(msg: string, ...args: unknown[]): void {
		if (activeLogger) {
			activeLogger.warn(msg, ...args);
		}
	},
	error(msg: string, ...args: unknown[]): void {
		if (activeLogger) {
			activeLogger.error(msg, ...args);
		}
	},
};
