import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseDotEnvFile } from "dotenv";
const loadedEnvFiles = [];
const mergeableKeyListEnvNames = new Set([
    "GROQ_API_KEYS",
    "OPENAI_API_KEYS",
    "DEEPGRAM_API_KEYS",
    "ASSEMBLYAI_API_KEYS",
    "CLOUDFLARE_API_TOKENS",
    "AZURE_SPEECH_KEYS",
    "GOOGLE_API_KEYS",
    "HUGGINGFACE_API_TOKENS",
    "HF_TOKENS"
]);
function splitEnvFileList(value) {
    if (!value?.trim())
        return [];
    return value
        .split(/[;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function normalizeEnvPath(filePath) {
    return path.resolve(filePath.replace(/^["']|["']$/g, ""));
}
function splitEnvList(value) {
    if (!value?.trim())
        return [];
    return value
        .split(/[\n\r,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}
function mergeEnvList(existing, incoming) {
    const seen = new Set();
    const values = [...splitEnvList(existing), ...splitEnvList(incoming)].filter((item) => {
        if (seen.has(item))
            return false;
        seen.add(item);
        return true;
    });
    return values.join(",");
}
function applyParsedEnv(parsed) {
    for (const [name, value] of Object.entries(parsed)) {
        if (mergeableKeyListEnvNames.has(name)) {
            const mergedValue = mergeEnvList(process.env[name], value);
            if (mergedValue)
                process.env[name] = mergedValue;
            continue;
        }
        if (process.env[name] === undefined) {
            process.env[name] = value;
        }
    }
}
function baseEnvFiles() {
    return [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "..", "..", ".env.local"),
        path.resolve(process.cwd(), "..", "..", ".env")
    ];
}
function explicitEnvFiles() {
    return [
        process.env.DENTAL_ENV_FILE,
        process.env.DENTAL_SPEECH_ENV_FILE,
        ...splitEnvFileList(process.env.DENTAL_EXTRA_ENV_FILES)
    ]
        .filter((item) => Boolean(item?.trim()))
        .map(normalizeEnvPath);
}
function appendUnseenEnvFiles(queue, seen, candidates) {
    for (const filePath of candidates) {
        if (!seen.has(filePath) && !queue.includes(filePath))
            queue.push(filePath);
    }
}
export function loadAdditionalServerEnv() {
    const seen = new Set();
    const queue = [...baseEnvFiles(), ...explicitEnvFiles()];
    for (let index = 0; index < queue.length; index += 1) {
        const filePath = queue[index];
        if (!filePath || seen.has(filePath))
            continue;
        seen.add(filePath);
        if (!existsSync(filePath))
            continue;
        try {
            applyParsedEnv(parseDotEnvFile(readFileSync(filePath)));
            loadedEnvFiles.push(filePath);
            appendUnseenEnvFiles(queue, seen, explicitEnvFiles());
        }
        catch (error) {
            // Keep startup non-blocking: a broken optional env import must not stop local development.
            console.warn(`[env] Failed to load optional env file ${filePath}`, error);
        }
    }
    return getLoadedServerEnvFiles();
}
export function getLoadedServerEnvFiles() {
    return Array.from(new Set(loadedEnvFiles));
}
