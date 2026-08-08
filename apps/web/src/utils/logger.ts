type LogLevel = "debug" | "info" | "warn" | "error";

class DenteLogger {
	private prefix: string;
	constructor(prefix = "[Dente]") {
		this.prefix = prefix;
	}
	debug(...args: unknown[]): void {
		if (import.meta.env.DEV) {
			console.debug(this.prefix, ...args);
		}
	}
	info(...args: unknown[]): void {
		if (import.meta.env.DEV) {
			console.info(this.prefix, ...args);
		}
	}
	warn(...args: unknown[]): void {
		console.warn(this.prefix, ...args);
	}
	error(...args: unknown[]): void {
		console.error(this.prefix, ...args);
	}
}

export const logger = new DenteLogger();
export default logger;
