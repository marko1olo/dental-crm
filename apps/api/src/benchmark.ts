import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readPersistedPayloadSync(filePath: string) {
	if (!fs.existsSync(filePath))
		return { payload: null, error: "state_file_missing" };
	try {
		return {
			payload: JSON.parse(fs.readFileSync(filePath, "utf8")),
			error: null,
		};
	} catch {
		return { payload: null, error: "state_file_unreadable" };
	}
}

async function readPersistedPayloadAsync(filePath: string) {
	try {
		const data = await fs.promises.readFile(filePath, "utf8");
		return { payload: JSON.parse(data), error: null };
	} catch (err: any) {
		if (err.code === "ENOENT")
			return { payload: null, error: "state_file_missing" };
		return { payload: null, error: "state_file_unreadable" };
	}
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBenchmark() {
	const testFilePath = path.join(__dirname, "test-state.json");
	const largeObject = { data: "x".repeat(1024 * 1024 * 50) };
	fs.writeFileSync(testFilePath, JSON.stringify(largeObject));

	console.log("Measuring Sync Version (Event Loop Blocking)...");

	let maxBlockSync = 0;
	let syncLastTick = performance.now();
	const syncInterval = setInterval(() => {
		const now = performance.now();
		const diff = now - syncLastTick;
		if (diff > maxBlockSync) maxBlockSync = diff;
		syncLastTick = now;
	}, 1);

	await delay(50);

	const syncStart = performance.now();
	readPersistedPayloadSync(testFilePath);
	const syncEnd = performance.now();

	clearInterval(syncInterval);
	console.log(`Sync Read total time: ${(syncEnd - syncStart).toFixed(2)}ms`);
	console.log(
		`Max event loop block during sync read (timer delay): ${maxBlockSync.toFixed(2)}ms`,
	);

	console.log("\nMeasuring Async Version...");

	let maxBlockAsync = 0;
	let asyncLastTick = performance.now();
	const asyncInterval = setInterval(() => {
		const now = performance.now();
		const diff = now - asyncLastTick;
		if (diff > maxBlockAsync) maxBlockAsync = diff;
		asyncLastTick = now;
	}, 1);

	await delay(50);

	const asyncStart = performance.now();
	await readPersistedPayloadAsync(testFilePath);
	const asyncEnd = performance.now();

	clearInterval(asyncInterval);
	console.log(`Async Read total time: ${(asyncEnd - asyncStart).toFixed(2)}ms`);
	console.log(
		`Max event loop block during async read (timer delay): ${maxBlockAsync.toFixed(2)}ms`,
	);

	fs.unlinkSync(testFilePath);
}

runBenchmark().catch(console.error);
