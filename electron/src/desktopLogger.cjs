/**
 * DENTE Dental CRM — Desktop Structured Logger
 *
 * Writes structured log lines to stderr and optionally rotates/appends
 * to `userData/logs/desktop.log` without blocking the Electron main loop.
 */

const fs = require("node:fs");
const path = require("node:path");

const MAX_LOG_FILE_BYTES = 2 * 1024 * 1024;
let configuredLogFilePath = null;

function configureDesktopLogFile(userDataDir) {
	if (!userDataDir || typeof userDataDir !== "string") {
		configuredLogFilePath = null;
		return null;
	}
	try {
		const logsDir = path.join(userDataDir, "logs");
		fs.mkdirSync(logsDir, { recursive: true });
		const logPath = path.join(logsDir, "desktop.log");
		if (fs.existsSync(logPath)) {
			const stat = fs.statSync(logPath);
			if (stat.size > MAX_LOG_FILE_BYTES) {
				const rotatedPath = `${logPath}.1`;
				fs.renameSync(logPath, rotatedPath);
			}
		}
		configuredLogFilePath = logPath;
		return logPath;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		process.stderr.write(`[DesktopLogger] Failed to configure log file: ${msg}\n`);
		return null;
	}
}

function serializeLogMeta(meta) {
	if (meta === undefined || meta === null) return "";
	if (meta instanceof Error) {
		return ` ${JSON.stringify({ error: meta.message, code: meta.code || undefined })}`;
	}
	if (typeof meta === "object") {
		try {
			return ` ${JSON.stringify(meta)}`;
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			return ` {"serializationError":${JSON.stringify(msg)}}`;
		}
	}
	return ` ${String(meta)}`;
}

function writeLogEntry(level, scope, message, meta) {
	const ts = new Date().toISOString();
	const line = `${ts} [${level.toUpperCase()}] [${scope}] ${message}${serializeLogMeta(meta)}\n`;
	if (level === "error" || level === "warn") {
		process.stderr.write(line);
	}
	if (configuredLogFilePath) {
		fs.promises.appendFile(configuredLogFilePath, line, "utf8").catch((err) => {
			const errMsg = err instanceof Error ? err.message : String(err);
			process.stderr.write(`[DesktopLogger] Async append failed: ${errMsg}\n`);
		});
	}
}

function createDesktopLogger(scope = "DesktopMain") {
	return {
		info(message, meta) {
			writeLogEntry("info", scope, message, meta);
		},
		warn(message, meta) {
			writeLogEntry("warn", scope, message, meta);
		},
		error(message, meta) {
			writeLogEntry("error", scope, message, meta);
		},
		debug(message, meta) {
			if (process.env.DENTE_DESKTOP_DEBUG === "1") {
				writeLogEntry("debug", scope, message, meta);
			}
		},
	};
}

module.exports = {
	configureDesktopLogFile,
	createDesktopLogger,
};
