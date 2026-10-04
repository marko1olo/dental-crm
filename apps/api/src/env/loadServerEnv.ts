import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { parse as parseDotEnvFile } from "dotenv";

const loadedEnvFiles: string[] = [];

const mergeableKeyListEnvNames = new Set([
	"GEMINI_API_KEYS",
	"GROQ_API_KEYS",
	"OPENAI_API_KEYS",
	"DEEPGRAM_API_KEYS",
	"ASSEMBLYAI_API_KEYS",
	"CLOUDFLARE_API_TOKENS",
	"AZURE_SPEECH_KEYS",
	"GOOGLE_API_KEYS",
	"HUGGINGFACE_API_TOKENS",
	"HF_TOKENS",
]);

function splitEnvFileList(value: string | undefined): string[] {
	if (!value?.trim()) return [];
	return value
		.split(/[;,]/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function normalizeEnvPath(filePath: string): string {
	return path.resolve(filePath.replace(/^["']|["']$/g, ""));
}

function splitEnvList(value: string | undefined): string[] {
	if (!value?.trim()) return [];
	return value
		.split(/[\n\r,;]+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function mergeEnvList(existing: string | undefined, incoming: string): string {
	const seen = new Set<string>();
	const values = [...splitEnvList(existing), ...splitEnvList(incoming)].filter(
		(item) => {
			if (seen.has(item)) return false;
			seen.add(item);
			return true;
		},
	);
	return values.join(",");
}

const BLOCKED_IN_TEST_ENV_PATTERN =
	/^(GEMINI_|GOOGLE_|GROQ_|OPENAI_|ANTHROPIC_|OPENROUTER_|DEEPSEEK_|DEEPGRAM_|ASSEMBLYAI_|CLOUDFLARE_|AZURE_SPEECH_|HUGGINGFACE_|HF_|YOOKASSA_|DADATA_|WABA_|TELEGRAM_|SMS_|DENTE_SMS_|DENTE_TELEGRAM_)/i;

function applyParsedEnv(parsed: Record<string, string>): void {
	const isIsolatedTest =
		process.env.NODE_ENV === "test" &&
		process.env.DENTE_ALLOW_TEST_ENV_FILES !== "1";

	for (const [name, value] of Object.entries(parsed)) {
		if (isIsolatedTest && BLOCKED_IN_TEST_ENV_PATTERN.test(name)) {
			continue;
		}

		if (mergeableKeyListEnvNames.has(name)) {
			const mergedValue = mergeEnvList(process.env[name], value);
			if (mergedValue) process.env[name] = mergedValue;
			continue;
		}

		if (process.env[name] === undefined) {
			process.env[name] = value;
		}
	}
}

function baseEnvFiles(): string[] {
	if (process.env.NODE_ENV === "test") {
		const testCandidates = [
			path.resolve(process.cwd(), ".env.test"),
			path.resolve(process.cwd(), "..", "..", ".env.test"),
		];
		if (process.env.DENTE_ALLOW_TEST_ENV_FILES === "1") {
			testCandidates.push(
				path.resolve(process.cwd(), ".env.local"),
				path.resolve(process.cwd(), ".env"),
			);
		} else {
			testCandidates.push(
				path.resolve(process.cwd(), ".env.local"),
				path.resolve(process.cwd(), ".env"),
				path.resolve(process.cwd(), "..", "..", ".env.local"),
				path.resolve(process.cwd(), "..", "..", ".env"),
			);
		}
		return testCandidates;
	}
	return [
		path.resolve(process.cwd(), ".env.local"),
		path.resolve(process.cwd(), ".env"),
		path.resolve(process.cwd(), "..", "..", ".env.local"),
		path.resolve(process.cwd(), "..", "..", ".env"),
	];
}

function explicitEnvFiles(): string[] {
	return [
		process.env.DENTAL_ENV_FILE,
		process.env.DENTAL_SPEECH_ENV_FILE,
		...splitEnvFileList(process.env.DENTAL_EXTRA_ENV_FILES),
	]
		.filter((item): item is string => Boolean(item?.trim()))
		.map(normalizeEnvPath);
}

function appendUnseenEnvFiles(
	queue: string[],
	seen: Set<string>,
	candidates: string[],
): void {
	for (const filePath of candidates) {
		if (!seen.has(filePath) && !queue.includes(filePath)) queue.push(filePath);
	}
}

export function loadAdditionalServerEnv(): string[] {
	const seen = new Set<string>();
	const queue = [...baseEnvFiles(), ...explicitEnvFiles()];

	for (let index = 0; index < queue.length; index += 1) {
		const filePath = queue[index];
		if (!filePath || seen.has(filePath)) continue;
		seen.add(filePath);
		if (!existsSync(filePath)) continue;
		try {
			applyParsedEnv(parseDotEnvFile(readFileSync(filePath)));
			loadedEnvFiles.push(filePath);
			appendUnseenEnvFiles(queue, seen, explicitEnvFiles());
		} catch (error) {
			// Keep startup non-blocking: a broken optional env import must not stop local development.
			console.warn(`[env] Failed to load optional env file ${filePath}`, error);
		}
	}
	return getLoadedServerEnvFiles();
}

export function getLoadedServerEnvFiles(): string[] {
	return Array.from(new Set(loadedEnvFiles));
}
