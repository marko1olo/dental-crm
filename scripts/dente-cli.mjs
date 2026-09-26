#!/usr/bin/env node

/**
 * DENTE Dental CRM — Cross-Platform Universal CLI & Runner Engine.
 * Pure Node.js. Zero external binary dependencies.
 * Fully compliant with macOS, Windows, and Linux across x64 and arm64 architectures.
 *
 * Commands:
 *   doctor    - Comprehensive environment & connectivity diagnostic
 *   preflight - Pre-boot lockfile audit (postmaster.pid), DB port arbitration & migrations check
 *   info      - LAN access URLs & high-contrast UTF-8 pseudographic terminal QR code for instant tablet setup
 */

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// ============================================================================
// 1. PURE JAVASCRIPT ISO/IEC 18004 QR CODE GENERATOR (ZERO DEPENDENCY)
// ============================================================================

const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(() => {
	let x = 1;
	for (let i = 0; i < 255; i++) {
		EXP_TABLE[i] = x;
		EXP_TABLE[i + 255] = x;
		LOG_TABLE[x] = i;
		x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
	}
})();

function gfMul(a, b) {
	return a === 0 || b === 0 ? 0 : EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function polyMul(p1, p2) {
	const res = new Uint8Array(p1.length + p2.length - 1);
	for (let i = 0; i < p1.length; i++) {
		for (let j = 0; j < p2.length; j++) res[i + j] ^= gfMul(p1[i], p2[j]);
	}
	return res;
}

function polyRest(dividend, divisor) {
	const res = new Uint8Array(dividend);
	for (let i = 0; i <= res.length - divisor.length; i++) {
		const coef = res[i];
		if (coef !== 0) {
			for (let j = 0; j < divisor.length; j++) res[i + j] ^= gfMul(divisor[j], coef);
		}
	}
	return res.slice(res.length - divisor.length + 1);
}

function getGeneratorPoly(degree) {
	let gen = new Uint8Array([1]);
	for (let i = 0; i < degree; i++) gen = polyMul(gen, new Uint8Array([1, EXP_TABLE[i]]));
	return gen;
}

const QR_VERSIONS = {
	1: { dataBytes: 16, ecBytes: 10, g1: 1, g1Bytes: 16, g2: 0, g2Bytes: 0, align: [] },
	2: { dataBytes: 28, ecBytes: 16, g1: 1, g1Bytes: 28, g2: 0, g2Bytes: 0, align: [6, 18] },
	3: { dataBytes: 44, ecBytes: 26, g1: 1, g1Bytes: 44, g2: 0, g2Bytes: 0, align: [6, 22] },
	4: { dataBytes: 64, ecBytes: 18, g1: 2, g1Bytes: 32, g2: 0, g2Bytes: 0, align: [6, 26] },
	5: { dataBytes: 86, ecBytes: 24, g1: 2, g1Bytes: 43, g2: 0, g2Bytes: 0, align: [6, 30] },
	6: { dataBytes: 108, ecBytes: 16, g1: 4, g1Bytes: 27, g2: 0, g2Bytes: 0, align: [6, 34] },
	7: { dataBytes: 124, ecBytes: 18, g1: 4, g1Bytes: 31, g2: 0, g2Bytes: 0, align: [6, 22, 38] },
	8: { dataBytes: 154, ecBytes: 22, g1: 2, g1Bytes: 38, g2: 2, g2Bytes: 39, align: [6, 24, 42] },
	9: { dataBytes: 182, ecBytes: 22, g1: 3, g1Bytes: 36, g2: 2, g2Bytes: 37, align: [6, 26, 46] },
	10: { dataBytes: 216, ecBytes: 26, g1: 4, g1Bytes: 43, g2: 1, g2Bytes: 44, align: [6, 28, 50] },
};

const QR_FORMAT_INFO_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

class QrBitBuffer {
	constructor() {
		this.buffer = [];
		this.length = 0;
	}
	put(num, len) {
		for (let i = 0; i < len; i++) this.putBit(((num >>> (len - i - 1)) & 1) === 1);
	}
	putBit(bit) {
		const bufIdx = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIdx) this.buffer.push(0);
		if (bit) this.buffer[bufIdx] |= 0x80 >>> (this.length % 8);
		this.length++;
	}
	getBytes() {
		return new Uint8Array(this.buffer);
	}
}

function qrEncodeData(text, version) {
	const utf8 = new TextEncoder().encode(text);
	const ec = QR_VERSIONS[version];
	const buf = new QrBitBuffer();
	buf.put(0x04, 4); // 8-bit byte mode
	buf.put(utf8.length, version >= 10 ? 16 : 8);
	for (const b of utf8) buf.put(b, 8);
	const maxBits = ec.dataBytes * 8;
	const padCount = Math.min(4, maxBits - buf.length);
	if (padCount > 0) buf.put(0, padCount);
	while (buf.length % 8 !== 0) buf.putBit(false);
	const raw = Array.from(buf.getBytes());
	const pad = [0xec, 0x11];
	let p = 0;
	while (raw.length < ec.dataBytes) {
		raw.push(pad[p % 2]);
		p++;
	}
	return new Uint8Array(raw);
}

function qrCreateEcBlocks(data, version) {
	const ec = QR_VERSIONS[version];
	const gen = getGeneratorPoly(ec.ecBytes);
	const totalBlocks = ec.g1 + ec.g2;
	const dBlocks = [];
	const ecBlocks = [];
	let offset = 0;
	for (let i = 0; i < ec.g1; i++) {
		const block = data.slice(offset, offset + ec.g1Bytes);
		dBlocks.push(block);
		offset += ec.g1Bytes;
		const dividend = new Uint8Array(ec.g1Bytes + ec.ecBytes);
		dividend.set(block);
		ecBlocks.push(polyRest(dividend, gen));
	}
	for (let i = 0; i < ec.g2; i++) {
		const block = data.slice(offset, offset + ec.g2Bytes);
		dBlocks.push(block);
		offset += ec.g2Bytes;
		const dividend = new Uint8Array(ec.g2Bytes + ec.ecBytes);
		dividend.set(block);
		ecBlocks.push(polyRest(dividend, gen));
	}
	const result = [];
	const maxDataLen = Math.max(ec.g1Bytes, ec.g2Bytes);
	for (let i = 0; i < maxDataLen; i++) {
		for (let b = 0; b < totalBlocks; b++) {
			if (i < dBlocks[b].length) result.push(dBlocks[b][i]);
		}
	}
	for (let i = 0; i < ec.ecBytes; i++) {
		for (let b = 0; b < totalBlocks; b++) {
			if (i < ecBlocks[b].length) result.push(ecBlocks[b][i]);
		}
	}
	return new Uint8Array(result);
}

function qrFindVersion(text) {
	const byteLen = new TextEncoder().encode(text).length;
	for (let v = 1; v <= 10; v++) {
		const overhead = v >= 10 ? 3 : 2;
		if (byteLen + overhead <= QR_VERSIONS[v].dataBytes) return v;
	}
	return 10;
}

export function generateQrMatrix(text) {
	const version = qrFindVersion(text);
	const data = qrEncodeData(text, version);
	const interleaved = qrCreateEcBlocks(data, version);
	const size = 17 + version * 4;
	const modules = Array.from({ length: size }, () => Array(size).fill(false));
	const isReserved = Array.from({ length: size }, () => Array(size).fill(false));

	const setMod = (r, c, val, reserved = true) => {
		modules[r][c] = val;
		if (reserved) isReserved[r][c] = true;
	};

	const placeFinder = (row, col) => {
		for (let r = -1; r <= 7; r++) {
			for (let c = -1; c <= 7; c++) {
				const rp = row + r;
				const cp = col + c;
				if (rp >= 0 && rp < size && cp >= 0 && cp < size) {
					const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
					setMod(rp, cp, isBlack, true);
				}
			}
		}
	};
	placeFinder(0, 0);
	placeFinder(0, size - 7);
	placeFinder(size - 7, 0);

	const align = QR_VERSIONS[version].align;
	for (const r of align) {
		for (const c of align) {
			if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
			for (let ar = -2; ar <= 2; ar++) {
				for (let ac = -2; ac <= 2; ac++) setMod(r + ar, c + ac, Math.max(Math.abs(ar), Math.abs(ac)) !== 1, true);
			}
		}
	}
	for (let i = 8; i < size - 8; i++) {
		const val = i % 2 === 0;
		if (!isReserved[6][i]) setMod(6, i, val, true);
		if (!isReserved[i][6]) setMod(i, 6, val, true);
	}
	for (let i = 0; i <= 8; i++) {
		if (i !== 6) {
			isReserved[8][i] = true;
			isReserved[i][8] = true;
		}
	}
	for (let i = 0; i < 8; i++) {
		isReserved[8][size - 1 - i] = true;
		isReserved[size - 1 - i][8] = true;
	}
	setMod(size - 8, 8, true, true);

	let bitIdx = 0;
	let row = size - 1;
	let col = size - 1;
	let dir = -1;
	while (col > 0) {
		if (col === 6) col--;
		for (let i = 0; i < size; i++) {
			const r = dir === -1 ? row - i : row + i;
			for (let cOff = 0; cOff < 2; cOff++) {
				const c = col - cOff;
				if (!isReserved[r][c]) {
					let bit = false;
					if (bitIdx < interleaved.length * 8) {
						const byte = interleaved[Math.floor(bitIdx / 8)];
						bit = ((byte >>> (7 - (bitIdx % 8))) & 1) === 1;
					}
					modules[r][c] = (r + c) % 2 === 0 ? !bit : bit; // mask 0
					bitIdx++;
				}
			}
		}
		row = dir === -1 ? 0 : size - 1;
		dir = -dir;
		col -= 2;
	}

	const fmt = QR_FORMAT_INFO_M[0];
	for (let i = 0; i < 15; i++) {
		const bit = ((fmt >>> (14 - i)) & 1) === 1;
		if (i <= 5) modules[8][i] = bit;
		else if (i === 6) modules[8][7] = bit;
		else if (i === 7) modules[8][8] = bit;
		else if (i === 8) modules[7][8] = bit;
		else modules[14 - i][8] = bit;
	}
	for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = ((fmt >>> i) & 1) === 1;
	for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = ((fmt >>> i) & 1) === 1;

	return { matrix: modules, size, version };
}

export function renderQrTerminalString(matrix, border = 2) {
	const size = matrix.length;
	const total = size + border * 2;
	const grid = Array.from({ length: total }, (_, r) =>
		Array.from({ length: total }, (_, c) => {
			const mr = r - border;
			const mc = c - border;
			return mr >= 0 && mr < size && mc >= 0 && mc < size ? !!matrix[mr][mc] : false;
		})
	);
	let out = "";
	for (let r = 0; r < total; r += 2) {
		let line = "";
		for (let c = 0; c < total; c++) {
			const top = grid[r][c];
			const bot = r + 1 < total ? grid[r + 1][c] : false;
			if (top && bot) line += " ";
			else if (top && !bot) line += "\u2584";
			else if (!top && bot) line += "\u2580";
			else line += "\u2588";
		}
		out += line + "\n";
	}
	return out;
}

// ============================================================================
// 2. DIAGNOSTIC & ENVIRONMENT AUDIT FUNCTIONS
// ============================================================================

export function diagnoseOs(osModule = os) {
	const platform = osModule.platform();
	const arch = osModule.arch();
	const release = osModule.release();
	const names = { darwin: "macOS", win32: "Windows", linux: "Linux" };
	const prettyPlatform = names[platform] || platform;
	const isSuppPlatform = ["darwin", "win32", "linux"].includes(platform);
	const isSuppArch = ["x64", "arm64"].includes(arch);
	const status = isSuppPlatform && isSuppArch ? "OK" : isSuppPlatform ? "WARN" : "FAIL";
	return { platform, prettyPlatform, arch, release, status, message: `${prettyPlatform} ${release} (${arch})` };
}

export function diagnoseNode(versionStr = process.version) {
	const match = versionStr.match(/^v?(\d+)\.(\d+)\.(\d+)/);
	const major = match ? parseInt(match[1], 10) : 0;
	const meetsRequirement = major >= 20;
	return {
		version: versionStr,
		major,
		meetsRequirement,
		status: meetsRequirement ? "OK" : "FAIL",
		message: meetsRequirement ? `${versionStr} (Node.js >= 20 verified)` : `${versionStr} (CRITICAL: Node.js >= 20 required, found ${versionStr})`,
	};
}

export function checkPort(host, port, timeoutMs = 800, netModule = net) {
	return new Promise((resolve) => {
		const socket = new netModule.Socket();
		let settled = false;
		const finish = (isListening, error = null) => {
			if (settled) return;
			settled = true;
			socket.destroy();
			resolve({ host, port, isListening, error });
		};
		socket.setTimeout(timeoutMs);
		socket.once("connect", () => finish(true));
		socket.once("timeout", () => finish(false, "TIMEOUT"));
		socket.once("error", (err) => finish(false, err.code || err.message));
		socket.connect(port, host);
	});
}

export async function checkPorts(options = {}, netModule = net) {
	const host = options.host || "127.0.0.1";
	const timeoutMs = options.timeoutMs || 800;
	const [p4000, p4100, p5432, p5438] = await Promise.all([
		checkPort(host, 4000, timeoutMs, netModule),
		checkPort(host, 4100, timeoutMs, netModule),
		checkPort(host, 5432, timeoutMs, netModule),
		checkPort(host, 5438, timeoutMs, netModule),
	]);
	return {
		webApi4000: { port: 4000, isListening: p4000.isListening, status: "OK", message: p4000.isListening ? "Active (Service Running)" : "Available (Ready to bind)" },
		ws4100: { port: 4100, isListening: p4100.isListening, status: "OK", message: p4100.isListening ? "Active (Service Running)" : "Available (Ready to bind)" },
		pgPorts: {
			port5432: p5432.isListening,
			port5438: p5438.isListening,
			status: p5432.isListening || p5438.isListening ? "OK" : "WARN",
			message: p5432.isListening ? "5432 (Default PostgreSQL Listening)" : p5438.isListening ? "5438 (Fallback PostgreSQL Listening)" : "Neither 5432 nor 5438 listening (PostgreSQL stopped)",
		},
	};
}

export function detectLanIp(interfaces = os.networkInterfaces()) {
	const candidates = [];
	for (const [name, addrs] of Object.entries(interfaces)) {
		if (!addrs) continue;
		const lowerName = name.toLowerCase();
		const isVirtual = lowerName.includes("vethernet") || lowerName.includes("docker") || lowerName.includes("wsl") || lowerName.includes("tailscale") || lowerName.includes("radmin") || lowerName.includes("vpn") || lowerName.includes("tap") || lowerName.includes("tun") || lowerName.startsWith("br-");
		for (const addr of addrs) {
			const isIpv4 = addr.family === "IPv4" || addr.family === 4;
			if (!isIpv4 || addr.internal) continue;
			const ip = addr.address;
			let priority = 10;
			if (ip.startsWith("192.168.")) priority = 1;
			else if (ip.startsWith("10.")) priority = 2;
			else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) priority = 3;
			if (isVirtual) priority += 20;
			candidates.push({ ip, name, priority });
		}
	}
	candidates.sort((a, b) => a.priority - b.priority);
	return candidates.length > 0 ? candidates[0].ip : "127.0.0.1";
}

export function checkDiskSpace(targetDir = ".", statfsFn = fs.statfsSync) {
	try {
		const stats = statfsFn(targetDir);
		const bsize = stats.bsize || 4096;
		const bavail = stats.bavail !== undefined ? stats.bavail : stats.bfree || 0;
		const freeBytes = bavail * bsize;
		const freeGb = freeBytes / (1024 * 1024 * 1024);
		const meetsRequirement = freeGb >= 2.0;
		return { freeBytes, freeGb, meetsRequirement, status: meetsRequirement ? "OK" : "FAIL", message: `${freeGb.toFixed(2)} GB free (Min: 2.0 GB required)` };
	} catch (err) {
		return { freeBytes: 0, freeGb: 0, meetsRequirement: false, status: "WARN", message: `Unable to measure disk space: ${err.message}` };
	}
}

export function resolveDatabaseUrl(env = process.env, rootDir = process.cwd(), fsModule = fs) {
	if (env.DATABASE_URL && env.DATABASE_URL.trim()) return env.DATABASE_URL.trim();
	try {
		const envPaths = [path.join(rootDir, ".env"), path.join(rootDir, "apps", "api", ".env"), "C:\\ProgramData\\DenteCRM\\dente.env"];
		for (const p of envPaths) {
			if (fsModule.existsSync(p)) {
				const lines = fsModule.readFileSync(p, "utf8").split(/\r?\n/);
				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith("DATABASE_URL=")) {
						const val = trimmed.slice("DATABASE_URL=".length).trim();
						if (val) return val;
					}
				}
			}
		}
	} catch {}
	return "postgres://dental:dental@127.0.0.1:5432/dental_crm";
}

export function normalizeDatabaseUrl(rawUrl, env = process.env) {
	try {
		const parsed = new URL(rawUrl);
		if (!parsed.password) {
			const fallbackPass = env.POSTGRES_PASSWORD || (parsed.username === "dental" ? "dental" : "");
			if (fallbackPass) {
				parsed.password = fallbackPass;
				return parsed.toString();
			}
		}
	} catch {}
	return rawUrl;
}

export async function checkDatabase(options = {}, pgModule = null, netModule = net) {
	const rawUrl = options.databaseUrl || resolveDatabaseUrl(options.env, options.rootDir);
	const targetUrl = normalizeDatabaseUrl(rawUrl, options.env);
	let parsedPort = 5432;
	let parsedHost = "127.0.0.1";
	let parsedDb = "dental_crm";
	try {
		const u = new URL(targetUrl);
		parsedHost = u.hostname || "127.0.0.1";
		parsedPort = u.port ? parseInt(u.port, 10) : 5432;
		parsedDb = u.pathname ? u.pathname.replace(/^\//, "") : "dental_crm";
	} catch {}

	let pg = pgModule;
	if (!pg) {
		try {
			const loaded = await import("pg");
			pg = loaded.default || loaded;
		} catch {}
	}

	if (pg && pg.Client) {
		try {
			const client = new pg.Client({ connectionString: targetUrl, connectionTimeoutMillis: options.timeoutMs || 2500 });
			await client.connect();
			const res = await client.query("SELECT current_database(), version()");
			await client.end();
			const row = res.rows && res.rows[0];
			const dbName = (row && row.current_database) || parsedDb;
			const ver = (row && row.version) || "";
			const shortVer = ver.split(" ")[1] || "18+";
			return { connected: true, status: "OK", database: dbName, version: ver, message: `Connected to ${dbName} (PostgreSQL ${shortVer})` };
		} catch (err) {
			return { connected: false, status: "FAIL", database: parsedDb, error: err.message, message: `PostgreSQL connection failed: ${err.message}` };
		}
	}

	const tcpCheck = await checkPort(parsedHost, parsedPort, options.timeoutMs || 1000, netModule);
	if (tcpCheck.isListening) {
		return { connected: true, status: "OK", database: parsedDb, message: `PostgreSQL socket reachable at ${parsedHost}:${parsedPort} (TCP Handshake OK)` };
	}
	return { connected: false, status: "WARN", database: parsedDb, message: `PostgreSQL is not reachable on ${parsedHost}:${parsedPort}` };
}

// ============================================================================
// 3. PREFLIGHT & RECOVERY HELPERS
// ============================================================================

export function auditPostmasterPid(dataDirs = [], fsModule = fs, processModule = process) {
	const candidates = [
		...dataDirs,
		path.join(processModule.cwd(), ".data", "pg18"),
		path.join(processModule.cwd(), "apps", "api", "dente_local_db"),
		processModule.env.PGDATA || "",
		"C:\\ProgramData\\DenteCRM\\data\\pg18",
	].filter(Boolean);

	for (const dir of candidates) {
		const pidFile = path.join(dir, "postmaster.pid");
		if (!fsModule.existsSync(pidFile)) continue;
		let recordedPid = null;
		try {
			const content = fsModule.readFileSync(pidFile, "utf8");
			const firstLine = content.split(/\r?\n/)[0].trim();
			if (/^\d+$/.test(firstLine)) recordedPid = parseInt(firstLine, 10);
		} catch {}

		if (!recordedPid || recordedPid <= 0) {
			try {
				fsModule.unlinkSync(pidFile);
				return { purged: true, status: "WARN", pid: recordedPid, message: `Purged corrupt/empty postmaster.pid at ${pidFile}` };
			} catch (e) {
				return { purged: false, status: "FAIL", pid: recordedPid, message: e.message };
			}
		}

		let isAlive = false;
		try {
			processModule.kill(recordedPid, 0);
			isAlive = true;
		} catch (err) {
			isAlive = err.code === "EPERM";
		}

		if (isAlive) {
			return { purged: false, status: "OK", pid: recordedPid, message: `Active PostgreSQL instance detected (PID ${recordedPid})` };
		}

		try {
			fsModule.unlinkSync(pidFile);
			return { purged: true, status: "WARN", pid: recordedPid, message: `Purged stale postmaster.pid (PID ${recordedPid} was dead). Lock unblocked.` };
		} catch (err) {
			return { purged: false, status: "FAIL", pid: recordedPid, message: `Failed to remove stale postmaster.pid: ${err.message}` };
		}
	}

	return { purged: false, status: "OK", pid: null, message: "Clean shutdown state verified (no postmaster.pid lock found)" };
}

export async function selectDatabasePort(options = {}, netModule = net) {
	const host = options.host || "127.0.0.1";
	const timeoutMs = options.timeoutMs || 600;
	const [check5432, check5438] = await Promise.all([
		checkPort(host, 5432, timeoutMs, netModule),
		checkPort(host, 5438, timeoutMs, netModule),
	]);

	if (check5432.isListening) {
		return { selectedPort: 5432, isFallback: false, status: "OK", message: "Port 5432 active and responding (PostgreSQL Default)" };
	}
	if (check5438.isListening) {
		return { selectedPort: 5438, isFallback: true, status: "OK", message: "Port 5438 active (Fallback D-E-N-T-E port active; 5432 not listening)" };
	}
	return { selectedPort: 5432, isFallback: false, status: "OK", message: "Port 5432 is free (Ready for PostgreSQL cluster initialization)" };
}

export function checkMigrations(rootDir = process.cwd(), fsModule = fs) {
	const drizzleDirs = [path.join(rootDir, "apps", "api", "drizzle"), path.join(rootDir, "drizzle")];
	let targetDir = null;
	for (const d of drizzleDirs) {
		if (fsModule.existsSync(d)) {
			targetDir = d;
			break;
		}
	}
	if (!targetDir) {
		return { status: "WARN", totalMigrations: 0, latestMigration: null, message: "Drizzle migrations directory not found" };
	}
	const files = fsModule.readdirSync(targetDir);
	const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();
	const journalPath = path.join(targetDir, "meta", "_journal.json");
	let journalEntries = 0;
	if (fsModule.existsSync(journalPath)) {
		try {
			const journal = JSON.parse(fsModule.readFileSync(journalPath, "utf8"));
			if (Array.isArray(journal.entries)) journalEntries = journal.entries.length;
		} catch {}
	}
	const latest = sqlFiles.length > 0 ? sqlFiles[sqlFiles.length - 1] : "none";
	return { status: "OK", targetDir, totalMigrations: sqlFiles.length, journalEntries, latestMigration: latest, message: `${sqlFiles.length} migrations verified on disk (latest: ${latest})` };
}

// ============================================================================
// 4. MAIN COMMAND IMPLEMENTATIONS (DOCTOR, PREFLIGHT, INFO)
// ============================================================================

export async function runDoctor(options = {}) {
	const log = options.logger || console.log;
	log("========================================================================");
	log("  DENTE Dental CRM — Environment Diagnostic Doctor");
	log("========================================================================");

	const osDiag = diagnoseOs(options.osModule || os);
	const nodeDiag = diagnoseNode(options.nodeVersion || process.version);
	const portsDiag = await checkPorts(options.portsOptions || {}, options.netModule || net);
	const lanIp = detectLanIp((options.osModule || os).networkInterfaces());
	const diskDiag = checkDiskSpace(options.targetDir || ".", options.statfsFn || fs.statfsSync);
	const dbDiag = await checkDatabase(options.dbOptions || {}, options.pgModule, options.netModule || net);

	const items = [
		{ label: "OS Platform", result: osDiag },
		{ label: "Node.js Engine", result: nodeDiag },
		{ label: "Port 4000 (API/Web)", result: portsDiag.webApi4000 },
		{ label: "Port 4100 (WS Broker)", result: portsDiag.ws4100 },
		{ label: "PostgreSQL Ports", result: portsDiag.pgPorts },
		{ label: "LAN Network IP", result: { status: lanIp !== "127.0.0.1" ? "OK" : "WARN", message: `${lanIp} (Tablet access endpoint)` } },
		{ label: "Disk Space (>2 GB)", result: diskDiag },
		{ label: "Database Connection", result: dbDiag },
	];

	let passed = 0;
	let warnings = 0;
	let failures = 0;
	for (const item of items) {
		const tag = item.result.status === "OK" ? "[OK]" : item.result.status === "WARN" ? "[WARN]" : "[FAIL]";
		if (item.result.status === "OK") passed++;
		else if (item.result.status === "WARN") warnings++;
		else failures++;
		log(`  ${tag.padEnd(7)} ${item.label.padEnd(24)}: ${item.result.message}`);
	}
	log("------------------------------------------------------------------------");
	log(`Diagnostic Summary: ${passed} passed, ${warnings} warnings, ${failures} failures.`);
	log("========================================================================");
	return { ok: failures === 0, stats: { passed, warnings, failures }, items };
}

export async function runPreflight(options = {}) {
	const log = options.logger || console.log;
	log("========================================================================");
	log("  DENTE Dental CRM — Preflight & Cluster Arbitration Engine");
	log("========================================================================");

	const pidAudit = auditPostmasterPid(options.dataDirs || [], options.fsModule || fs, options.processModule || process);
	const portArbitration = await selectDatabasePort(options.portOptions || {}, options.netModule || net);
	const migrationAudit = checkMigrations(options.rootDir || process.cwd(), options.fsModule || fs);

	const items = [
		{ label: "Crash Recovery (PID)", result: pidAudit },
		{ label: "DB Port Arbitration", result: portArbitration },
		{ label: "Schema Migrations", result: migrationAudit },
	];

	let failures = 0;
	for (const item of items) {
		const tag = item.result.status === "OK" ? "[OK]" : item.result.status === "WARN" ? "[WARN]" : "[FAIL]";
		if (item.result.status === "FAIL") failures++;
		log(`  ${tag.padEnd(7)} ${item.label.padEnd(24)}: ${item.result.message}`);
	}
	log("------------------------------------------------------------------------");
	if (failures === 0) {
		log("  [OK] Preflight checks passed. DENTE CRM cluster is ready to boot.");
	} else {
		log("  [FAIL] Preflight failed. Rectify the above errors before launch.");
	}
	log("========================================================================");
	return { ok: failures === 0, pidAudit, portArbitration, migrationAudit };
}

export function runInfo(options = {}) {
	const log = options.logger || console.log;
	const lanIp = detectLanIp((options.osModule || os).networkInterfaces());
	const port = options.port || process.env.PORT || process.env.API_PORT || 4000;
	const localUrl = `http://localhost:${port}`;
	const networkUrl = `http://${lanIp}:${port}`;

	const qrResult = generateQrMatrix(networkUrl);
	const qrArt = renderQrTerminalString(qrResult.matrix, 2);

	log("========================================================================");
	log("  DENTE Dental CRM — Instant Tablet & Network Access Cockpit");
	log("========================================================================");
	log(`  Local Access   : ${localUrl}`);
	log(`  Tablet Access  : ${networkUrl}`);
	log(`  Host Platform  : ${os.platform()} (${os.arch()}) | Node.js ${process.version}`);
	log("------------------------------------------------------------------------");
	log("  Scan the QR code below on an iPad, Android Tablet or Mobile Device:\n");
	log(qrArt);
	log("  Tablet Setup Workflow:");
	log("  1. Connect your iPad / tablet to the clinic's local Wi-Fi.");
	log("  2. Open the camera app and point it at the QR code above.");
	log("  3. Tap the link to open the DENTE Doctor & Reception Cockpit.");
	log("========================================================================");
	return { localUrl, networkUrl, lanIp, port, qrSize: qrResult.size };
}

// ============================================================================
// 5. CLI DISPATCHER
// ============================================================================

export async function main(argv = process.argv.slice(2)) {
	const command = (argv[0] || "").toLowerCase().trim();
	switch (command) {
		case "doctor": {
			const res = await runDoctor();
			process.exit(res.ok ? 0 : 1);
			break;
		}
		case "preflight": {
			const res = await runPreflight();
			process.exit(res.ok ? 0 : 1);
			break;
		}
		case "info": {
			runInfo();
			process.exit(0);
			break;
		}
		default: {
			console.log(`DENTE Dental CRM Cross-Platform CLI Tool

Usage:
  node scripts/dente-cli.mjs <command>

Commands:
  doctor    Run full environmental, connectivity & storage diagnostic
  preflight Verify postmaster.pid lock, select database port & check migrations
  info      Show network access URL and UTF-8 terminal QR code for tablets
`);
			process.exit(command === "--help" || command === "-h" || command === "help" ? 0 : 1);
		}
	}
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && (invokedPath === currentFilePath || invokedPath.endsWith("dente-cli.mjs"))) {
	main();
}
