import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const gatewayPath = path.resolve("apps/api/dist/speech/gateway.js");
if (!existsSync(gatewayPath)) {
  throw new Error("Build the API first: npm run build");
}

process.env.DENTAL_SPEECH_PROVIDER = "groq";
process.env.DENTAL_SPEECH_PROVIDER_MODE = "manual";
process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";
process.env.GROQ_API_KEY = "gsk_synthetic_key_for_strategy_smoke";
process.env.DENTAL_SPEECH_MIN_CHUNK_MS = "1000";
process.env.DENTAL_SPEECH_MAX_CHUNK_MS = "5000";
process.env.DENTAL_SPEECH_RECOMMENDED_CHUNK_MS = "3000";

const { getSpeechGatewayStatus, buildSpeechRecordingStrategy } = await import(pathToFileURL(gatewayPath).href);

const status = getSpeechGatewayStatus();
const strategy = buildSpeechRecordingStrategy({
  expectedDurationMs: 60_000,
  networkState: "online",
  privacyMode: "cloud_allowed",
  specialty: "therapist",
  source: "visit"
});

const result = {
  providerId: status.providerId,
  recommendedChunkMs: status.recommendedChunkMs,
  minChunkMs: status.chunkingPolicy.minChunkMs,
  maxChunkMs: status.chunkingPolicy.maxChunkMs,
  strategyPath: strategy.recommendedPath,
  strategyChunkMs: strategy.chunkMs,
  estimatedChunkCount: strategy.estimatedChunkCount,
  warnings: status.warnings.filter(
    (warning) =>
      warning.includes("Для Groq распознавания включен минимум") ||
      warning.includes("Длительность аудиофрагментов")
  )
};

console.log(JSON.stringify(result));

if (result.providerId !== "groq_whisper") throw new Error(`Expected groq_whisper, got ${result.providerId}`);
if (result.minChunkMs < 10_000) throw new Error(`Groq min chunk was not enforced: ${result.minChunkMs}`);
if (result.recommendedChunkMs < 10_000) throw new Error(`Groq recommended chunk was not enforced: ${result.recommendedChunkMs}`);
if (result.maxChunkMs < result.minChunkMs) throw new Error(`Chunk max below min: ${result.maxChunkMs} < ${result.minChunkMs}`);
if (result.strategyChunkMs < 10_000) throw new Error(`Strategy chunk stayed too small: ${result.strategyChunkMs}`);
if (!result.warnings.some((warning) => warning.includes("Для Groq распознавания включен минимум"))) {
  throw new Error("Expected public Groq chunk-floor warning in Russian.");
}
