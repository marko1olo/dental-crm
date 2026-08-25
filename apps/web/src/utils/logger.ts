/**
 * DENTE CRM — Client Logger Bridge
 *
 * Предоставляет обратную совместимость со старыми вызовами logger.info/warn/error,
 * направляя все записи в централизованный clientLogger с кольцевым буфером и HUD.
 */

import { clientLogger } from "../services/logging/clientLogger.js";

function formatMessage(args: unknown[]): { message: string; data?: unknown } {
	if (args.length === 0) return { message: "" };
	const first = args[0];
	const message = typeof first === "string" ? first : String(first);
	const rest = args.slice(1);
	const data = rest.length === 1 ? rest[0] : rest.length > 1 ? rest : undefined;
	return { message, data };
}

class DenteLogger {
	private prefix: string;

	constructor(prefix = "Dente") {
		this.prefix = prefix.replace(/^[\[\s]+|[\]\s]+$/g, "") || "Dente";
	}

	debug(...args: unknown[]): void {
		const { message, data } = formatMessage(args);
		clientLogger.debug(message, data, { module: this.prefix });
	}

	info(...args: unknown[]): void {
		const { message, data } = formatMessage(args);
		clientLogger.info(message, data, { module: this.prefix });
	}

	warn(...args: unknown[]): void {
		const { message, data } = formatMessage(args);
		clientLogger.warn(message, data, { module: this.prefix });
	}

	error(...args: unknown[]): void {
		const { message, data } = formatMessage(args);
		clientLogger.error(message, data, { module: this.prefix });
	}

	audit(message: string, data?: unknown): void {
		clientLogger.audit(message, data, { module: this.prefix });
	}
}

export { clientLogger };
export const logger = new DenteLogger();
export default logger;
