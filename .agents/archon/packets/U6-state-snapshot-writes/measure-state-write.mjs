// U6 measurement harness. READ-ONLY against real data.
// Replicates persistentState.ts savePersistentState() exactly, but every byte it
// writes goes to os.tmpdir(), never to apps/api/.data.
// Usage: node .agents/archon/packets/U6-state-snapshot-writes/measure-state-write.mjs
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REAL_STATE_FILE = path.resolve("apps/api/.data/dental-crm-state.json");
const ITERATIONS = 10;
const BACKUP_LIMIT = 30;

function checksum(payloadCore) {
	return createHash("sha256").update(JSON.stringify(payloadCore)).digest("hex");
}

function timestampForFileName(value = new Date()) {
	return value.toISOString().replace(/[-:]/g, "").replace(".", "-");
}

function listBackupFiles(dir) {
	if (!fs.existsSync(dir)) return [];
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith(".json"))
		.map((e) => {
			const filePath = path.join(dir, e.name);
			const stats = fs.statSync(filePath);
			return {
				filePath,
				savedAt: stats.mtime.toISOString(),
				sizeBytes: stats.size,
			};
		})
		.sort((l, r) => r.savedAt.localeCompare(l.savedAt));
}

// Exact replica of savePersistentState(), instrumented per phase.
function timedSave(state, stateFilePath, backupDir) {
	const t0 = process.hrtime.bigint();
	const payloadCore = { version: 1, savedAt: new Date().toISOString(), state };
	const sum = checksum(payloadCore);
	const t1 = process.hrtime.bigint();

	fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
	// rotateStateBackup()
	if (fs.existsSync(stateFilePath)) {
		fs.mkdirSync(backupDir, { recursive: true });
		fs.copyFileSync(
			stateFilePath,
			path.join(backupDir, `dental-crm-state-${timestampForFileName()}.json`),
		);
		for (const stale of listBackupFiles(backupDir).slice(BACKUP_LIMIT))
			fs.unlinkSync(stale.filePath);
	}
	const t2 = process.hrtime.bigint();

	const serialized = JSON.stringify({ ...payloadCore, checksum: sum }, null, 2);
	const t3 = process.hrtime.bigint();

	const tempPath = `${stateFilePath}.tmp`;
	fs.writeFileSync(tempPath, serialized, "utf8");
	fs.renameSync(tempPath, stateFilePath);
	const t4 = process.hrtime.bigint();

	const ms = (a, b) => Number(b - a) / 1e6;
	return {
		checksumMs: ms(t0, t1),
		backupRotationMs: ms(t1, t2),
		prettyStringifyMs: ms(t2, t3),
		writeRenameMs: ms(t3, t4),
		totalMs: ms(t0, t4),
		bytes: Buffer.byteLength(serialized, "utf8"),
	};
}

function summarize(label, runs) {
	const pick = (k) => runs.map((r) => r[k]).sort((a, b) => a - b);
	const med = (arr) => arr[Math.floor(arr.length / 2)];
	const sum = (k) => runs.reduce((acc, r) => acc + r[k], 0);
	console.log(`\n--- ${label} ---`);
	console.log(
		`bytes written per save: ${runs[0].bytes.toLocaleString("en-US")}`,
	);
	console.log(`runs: ${runs.length}`);
	for (const k of [
		"checksumMs",
		"backupRotationMs",
		"prettyStringifyMs",
		"writeRenameMs",
		"totalMs",
	]) {
		console.log(
			`  ${k.padEnd(20)} median ${med(pick(k)).toFixed(2)} ms  min ${pick(k)[0].toFixed(2)}  max ${pick(k)[runs.length - 1].toFixed(2)}`,
		);
	}
	console.log(
		`  TOTAL wall clock for ${runs.length} saves: ${sum("totalMs").toFixed(2)} ms`,
	);
	console.log(
		`  TOTAL bytes for ${runs.length} saves: ${(runs[0].bytes * runs.length).toLocaleString("en-US")} (+ same again copied as backups)`,
	);
}

function collectionSizes(state) {
	return Object.entries(state)
		.map(([key, value]) => ({
			key,
			count: Array.isArray(value) ? value.length : value === null ? 0 : 1,
			bytes: Buffer.byteLength(JSON.stringify(value) ?? "null", "utf8"),
		}))
		.sort((a, b) => b.bytes - a.bytes);
}

function main() {
	if (!fs.existsSync(REAL_STATE_FILE)) {
		console.error(`state file not found: ${REAL_STATE_FILE}`);
		process.exit(2);
	}
	const realBytes = fs.statSync(REAL_STATE_FILE).size;
	const payload = JSON.parse(fs.readFileSync(REAL_STATE_FILE, "utf8"));
	const state = payload.state;

	console.log(`REAL state file: ${REAL_STATE_FILE}`);
	console.log(
		`  on-disk bytes (pretty, indent 2): ${realBytes.toLocaleString("en-US")}`,
	);
	console.log(
		`  compact re-serialize bytes:       ${Buffer.byteLength(JSON.stringify(state), "utf8").toLocaleString("en-US")}`,
	);
	console.log(`  savedAt: ${payload.savedAt}`);
	console.log("\nTop collections by serialized bytes:");
	for (const row of collectionSizes(state).slice(0, 10)) {
		console.log(
			`  ${row.key.padEnd(38)} ${String(row.count).padStart(6)} items  ${row.bytes.toLocaleString("en-US").padStart(10)} bytes`,
		);
	}

	const root = fs.mkdtempSync(path.join(os.tmpdir(), "dente-u6-"));

	// Case A: current real database size.
	const caseADir = path.join(root, "current");
	const caseAFile = path.join(caseADir, "dental-crm-state.json");
	const caseABackups = path.join(caseADir, "backups");
	fs.mkdirSync(caseABackups, { recursive: true });
	fs.copyFileSync(REAL_STATE_FILE, caseAFile);
	// Seed the backup directory to the real steady state (30 kept backups) so the
	// rotation cost measured is the cost the running server actually pays.
	for (let i = 0; i < BACKUP_LIMIT; i += 1) {
		fs.copyFileSync(
			REAL_STATE_FILE,
			path.join(
				caseABackups,
				`dental-crm-state-seed-${String(i).padStart(3, "0")}.json`,
			),
		);
	}
	const runsA = [];
	for (let i = 0; i < ITERATIONS; i += 1)
		runsA.push(timedSave(state, caseAFile, caseABackups));
	summarize(
		`CASE A: current database (${state.patients?.length ?? 0} patients)`,
		runsA,
	);

	// Case B: synthetic 10,000-patient clinic. Patients cloned from REAL records with
	// fresh ids, so per-record shape and Cyrillic payload are realistic. Other
	// collections left exactly as they are. In-memory only.
	const template = state.patients ?? [];
	if (template.length === 0) {
		console.log("\nCASE B skipped: no patient records to clone.");
	} else {
		const scaled = [];
		for (let i = 0; scaled.length < 10000; i += 1) {
			const src = template[i % template.length];
			scaled.push({ ...src, id: `${src.id}-scale-${i}` });
		}
		const bigState = { ...state, patients: scaled };
		const caseBDir = path.join(root, "scale10k");
		const caseBFile = path.join(caseBDir, "dental-crm-state.json");
		const caseBBackups = path.join(caseBDir, "backups");
		fs.mkdirSync(caseBBackups, { recursive: true });
		// First save creates the file; then seed backups at the scaled size.
		timedSave(bigState, caseBFile, caseBBackups);
		for (let i = 0; i < BACKUP_LIMIT; i += 1) {
			fs.copyFileSync(
				caseBFile,
				path.join(
					caseBBackups,
					`dental-crm-state-seed-${String(i).padStart(3, "0")}.json`,
				),
			);
		}
		const runsB = [];
		for (let i = 0; i < ITERATIONS; i += 1)
			runsB.push(timedSave(bigState, caseBFile, caseBBackups));
		summarize("CASE B: synthetic 10,000 patients (cloned real records)", runsB);
	}

	fs.rmSync(root, { recursive: true, force: true });
	console.log(`\ntemp dir removed: ${root}`);
}

main();
