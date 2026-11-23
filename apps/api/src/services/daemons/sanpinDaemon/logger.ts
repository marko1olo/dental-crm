/**
 * apps/api/src/services/daemons/sanpinDaemon/logger.ts
 *
 * Единый структурированный логгер фонового демона СанПиН и складского аудита.
 * Заменяет неконтролируемые вызовы console.error / console.warn на безопасный логгер.
 */

import { createApiLogger } from "../../../observability/index.js";

export interface SanpinDaemonLogger {
	info(msg: string, ...args: unknown[]): void;
	warn(msg: string, ...args: unknown[]): void;
	error(msg: string, ...args: unknown[]): void;
}

const defaultLogger = createApiLogger("sanpinDaemon");
let activeLogger: SanpinDaemonLogger | null = null;

export function setSanpinDaemonLogger(logger: SanpinDaemonLogger | null): void {
	activeLogger = logger;
}

export const sanpinLogger: SanpinDaemonLogger = {
	info(msg: string, ...args: unknown[]): void {
		if (activeLogger) {
			activeLogger.info(msg, ...args);
		} else {
			defaultLogger.info({ extra: args.length > 0 ? args : undefined }, msg);
		}
	},
	warn(msg: string, ...args: unknown[]): void {
		if (activeLogger) {
			activeLogger.warn(msg, ...args);
		} else {
			defaultLogger.warn({ extra: args.length > 0 ? args : undefined }, msg);
		}
	},
	error(msg: string, ...args: unknown[]): void {
		if (activeLogger) {
			activeLogger.error(msg, ...args);
		} else {
			defaultLogger.error({ extra: args.length > 0 ? args : undefined }, msg);
		}
	},
};
