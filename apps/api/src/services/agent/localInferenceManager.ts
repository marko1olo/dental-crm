/**
 * localInferenceManager.ts — Local GPU Inference Manager, Health Prober & 152-FZ Air-Gap Guard.
 *
 * Coordinates on-premise LLM inference servers (Ollama, vLLM, LM Studio) across the clinic.
 * Implements:
 * 1. Health checks and model discovery probes (/api/tags, /v1/models).
 * 2. 152-FZ Air-Gap isolation validation ensuring patient data never leaves clinic hardware.
 * 3. Model profiling and parameter tuning for Saiga-Llama-3-8B, Qwen-2.5-7B, Mistral-Nemo.
 * 4. Factory and lifecycle management for local LLM providers.
 */

import {
	AirGapViolationError,
	DEFAULT_LOCAL_INFERENCE_URL,
	DEFAULT_LOCAL_MODEL,
	DEFAULT_LOCAL_TIMEOUT_MS,
	LocalInferenceConnectionError,
	LocalInferenceError,
	LocalInferenceTimeoutError,
	LocalOllamaProvider,
	type LocalOllamaProviderOptions,
	OPEN_MODEL_MISTRAL_NEMO,
	OPEN_MODEL_QWEN_7B,
	OPEN_MODEL_SAIGA_8B,
	isAirGapCompliantUrl,
	normalizeOpenAiBaseUrl,
} from "./providers/localOllama.js";
import type { LLMProvider } from "./types.js";

export interface ModelProfile {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly contextWindow: number;
	readonly recommendedTemperature: number;
	readonly supportsToolCalling: boolean;
	readonly strengths: readonly string[];
	readonly recommendedFor: readonly string[];
}

export const LOCAL_MODEL_PROFILES: Record<string, ModelProfile> = {
	[OPEN_MODEL_SAIGA_8B]: {
		id: OPEN_MODEL_SAIGA_8B,
		name: "Saiga Llama 3 8B",
		description:
			"Открытая русскоязычная модель, оптимизированная для медицинской терминологии, клинических протоколов 043/у и врачебного диалога.",
		contextWindow: 8192,
		recommendedTemperature: 0.15,
		supportsToolCalling: true,
		strengths: [
			"Высокая грамотность русского медицинского языка",
			"Понимание номенклатуры 804н и МКБ-10",
			"Парсинг голосовой диктовки врача в протоколы 043/у",
		],
		recommendedFor: [
			"Заполнение дневника 043/у по диктовке",
			"Формирование анамнеза и жалоб",
			"Клинические консультации и рекомендации",
		],
	},
	[OPEN_MODEL_QWEN_7B]: {
		id: OPEN_MODEL_QWEN_7B,
		name: "Qwen 2.5 7B Instruct",
		description:
			"Высокоточная модель с превосходной поддержкой JSON Schema tool calling и математических расчетов.",
		contextWindow: 32768,
		recommendedTemperature: 0.1,
		supportsToolCalling: true,
		strengths: [
			"Строгое следование JSON Schema при вызове инструментов",
			"Точные финансовые расчеты смет и калькуляций",
			"Длинный контекст до 32k токенов для объемных историй болезни",
		],
		recommendedFor: [
			"Вызовы инструментов CRM (поиск пациентов, расписание)",
			"Калькуляция смет и финансовых позиций",
			"Сверка СанПиН журналов и сроков стерилизации",
		],
	},
	[OPEN_MODEL_MISTRAL_NEMO]: {
		id: OPEN_MODEL_MISTRAL_NEMO,
		name: "Mistral NeMo 12B",
		description:
			"Универсальная открытая 12B модель совместной разработки Mistral AI и NVIDIA для структурированного анализа.",
		contextWindow: 16384,
		recommendedTemperature: 0.2,
		supportsToolCalling: true,
		strengths: [
			"Глубокое логическое рассуждение",
			"Анализ сложных клинических планов и противопоказаний",
			"Мультиязычная поддержка",
		],
		recommendedFor: [
			"Проверка межлекарственных взаимодействий",
			"Анализ планов комплексной ортодонтической реабилитации",
		],
	},
};

export interface LocalInferenceProbeResult {
	readonly online: boolean;
	readonly latencyMs: number;
	readonly providerType: "ollama" | "vllm" | "lmstudio" | "openai-compat" | "offline";
	readonly availableModels: string[];
	readonly activeModel?: string;
	readonly airGapSafe: boolean;
	readonly error?: string;
	readonly checkedAt: number;
}

export interface LocalInferenceConfig {
	readonly baseUrl?: string;
	readonly defaultModel?: string;
	readonly airGapMode?: boolean;
	readonly timeoutMs?: number;
	readonly allowedHosts?: string[];
	readonly apiKey?: string;
	readonly keepAlive?: string | number;
	readonly fetchFn?: typeof fetch;
}

export class LocalInferenceManager {
	private baseUrl: string;
	private defaultModel: string;
	private airGapMode: boolean;
	private timeoutMs: number;
	private allowedHosts: string[];
	private apiKey: string;
	private keepAlive: string | number | undefined;
	private fetchFn: typeof fetch;
	private providerInstance: LocalOllamaProvider | null = null;
	private cachedProbe: { result: LocalInferenceProbeResult; expiresAt: number } | null =
		null;

	constructor(config: LocalInferenceConfig = {}) {
		const rawUrl =
			config.baseUrl ||
			process.env.OLLAMA_BASE_URL ||
			process.env.LOCAL_LLM_BASE_URL ||
			DEFAULT_LOCAL_INFERENCE_URL;

		this.baseUrl = normalizeOpenAiBaseUrl(rawUrl);
		this.defaultModel =
			config.defaultModel ||
			process.env.OLLAMA_MODEL ||
			process.env.LOCAL_LLM_MODEL ||
			DEFAULT_LOCAL_MODEL;
		this.airGapMode =
			config.airGapMode ??
			(process.env.AIR_GAP_MODE === "true" ||
				process.env.LOCAL_INFERENCE_AIR_GAP === "true");
		this.timeoutMs = config.timeoutMs ?? DEFAULT_LOCAL_TIMEOUT_MS;
		this.allowedHosts = config.allowedHosts ?? [];
		this.apiKey = config.apiKey || process.env.OLLAMA_API_KEY || "ollama";
		this.keepAlive = config.keepAlive ?? process.env.OLLAMA_KEEP_ALIVE ?? "24h";
		this.fetchFn = config.fetchFn ?? globalThis.fetch;

		if (this.airGapMode) {
			const check = isAirGapCompliantUrl(this.baseUrl, this.allowedHosts);
			if (!check.compliant) {
				throw new AirGapViolationError(
					this.baseUrl,
					check.reason ?? "Target server does not comply with 152-FZ Air-Gap perimeter",
				);
			}
		}
	}

	public getBaseUrl(): string {
		return this.baseUrl;
	}

	public setBaseUrl(url: string): void {
		const normalized = normalizeOpenAiBaseUrl(url);
		if (this.airGapMode) {
			const check = isAirGapCompliantUrl(normalized, this.allowedHosts);
			if (!check.compliant) {
				throw new AirGapViolationError(
					normalized,
					check.reason ?? "Target server does not comply with 152-FZ Air-Gap perimeter",
				);
			}
		}
		this.baseUrl = normalized;
		this.providerInstance = null;
		this.cachedProbe = null;
	}

	public getDefaultModel(): string {
		return this.defaultModel;
	}

	public setDefaultModel(model: string): void {
		this.defaultModel = model;
		this.providerInstance = null;
	}

	public isAirGapEnabled(): boolean {
		return this.airGapMode;
	}

	public setAirGapMode(enabled: boolean): void {
		if (enabled) {
			const check = isAirGapCompliantUrl(this.baseUrl, this.allowedHosts);
			if (!check.compliant) {
				throw new AirGapViolationError(
					this.baseUrl,
					check.reason ?? "Target server does not comply with 152-FZ Air-Gap perimeter",
				);
			}
		}
		this.airGapMode = enabled;
		this.providerInstance = null;
	}

	public getProvider(): LLMProvider {
		if (!this.providerInstance) {
			this.providerInstance = new LocalOllamaProvider({
				baseUrl: this.baseUrl,
				defaultModel: this.defaultModel,
				timeoutMs: this.timeoutMs,
				apiKey: this.apiKey,
				airGapMode: this.airGapMode,
				allowedHosts: this.allowedHosts,
				keepAlive: this.keepAlive,
				fetchFn: this.fetchFn,
			});
		}
		return this.providerInstance;
	}

	/**
	 * Returns the model profile with clinical recommendations for the active or requested model.
	 */
	public getModelProfile(modelName?: string): ModelProfile {
		const target = (modelName || this.defaultModel).toLowerCase();

		// 1. Exact match
		if (LOCAL_MODEL_PROFILES[target]) {
			return LOCAL_MODEL_PROFILES[target];
		}

		// 2. Semantic family match
		if (target.includes("saiga")) {
			return LOCAL_MODEL_PROFILES[OPEN_MODEL_SAIGA_8B];
		}
		if (target.includes("qwen")) {
			return LOCAL_MODEL_PROFILES[OPEN_MODEL_QWEN_7B];
		}
		if (target.includes("mistral") || target.includes("nemo")) {
			return LOCAL_MODEL_PROFILES[OPEN_MODEL_MISTRAL_NEMO];
		}

		// 3. Normalized fuzzy matching
		const cleanTarget = target.replace(/[-_.:]/g, "");
		for (const [key, profile] of Object.entries(LOCAL_MODEL_PROFILES)) {
			const cleanKey = key.toLowerCase().replace(/[-_.:]/g, "");
			if (cleanTarget.includes(cleanKey) || cleanKey.includes(cleanTarget)) {
				return profile;
			}
		}

		// Generic fallback profile for custom or unlisted open models
		return {
			id: modelName || this.defaultModel,
			name: modelName || this.defaultModel,
			description: "Локальная открытая нейросетевая модель (On-Premise Local LLM).",
			contextWindow: 8192,
			recommendedTemperature: 0.15,
			supportsToolCalling: true,
			strengths: [
				"Локальная обработка без передачи данных во внешние облака (152-ФЗ)",
				"Нулевая задержка сети интернет",
			],
			recommendedFor: ["Клинический ассистент DENTE", "Интерактивные запросы"],
		};
	}

	/**
	 * Probes the local inference server health, latency, and available model catalog.
	 */
	public async probe(options?: {
		force?: boolean;
		ttlMs?: number;
	}): Promise<LocalInferenceProbeResult> {
		const now = Date.now();
		const ttl = options?.ttlMs ?? 5000;

		if (!options?.force && this.cachedProbe && this.cachedProbe.expiresAt > now) {
			return this.cachedProbe.result;
		}

		const airGapCheck = isAirGapCompliantUrl(this.baseUrl, this.allowedHosts);
		if (this.airGapMode && !airGapCheck.compliant) {
			const errResult: LocalInferenceProbeResult = {
				online: false,
				latencyMs: 0,
				providerType: "offline",
				availableModels: [],
				airGapSafe: false,
				error: airGapCheck.reason ?? "152-FZ Air-Gap check failed",
				checkedAt: now,
			};
			this.cachedProbe = { result: errResult, expiresAt: now + ttl };
			return errResult;
		}

		// Derive raw origin (e.g. http://127.0.0.1:11434 from http://127.0.0.1:11434/v1)
		const parsedBase = new URL(this.baseUrl);
		const origin = parsedBase.origin;

		const probeUrls = [
			{ url: `${origin}/api/tags`, type: "ollama" as const },
			{ url: `${this.baseUrl}/models`, type: "openai-compat" as const },
		];

		let probeResult: LocalInferenceProbeResult | null = null;
		const t0 = performance.now();

		for (const candidate of probeUrls) {
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), Math.min(this.timeoutMs, 5000));

			try {
				const res = await this.fetchFn(candidate.url, {
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.apiKey}`,
					},
					signal: controller.signal,
				});
				clearTimeout(timeout);

				if (res.ok) {
					const latencyMs = Math.round(performance.now() - t0);
					const body = await res.json();
					const models: string[] = [];

					if (candidate.type === "ollama" && body && Array.isArray(body.models)) {
						for (const m of body.models) {
							if (typeof m.name === "string") {
								models.push(m.name);
							}
						}
					} else if (body && Array.isArray(body.data)) {
						for (const m of body.data) {
							if (typeof m.id === "string") {
								models.push(m.id);
							}
						}
					}

					let detectedType: LocalInferenceProbeResult["providerType"] =
						candidate.type;
					if (
						detectedType === "openai-compat" &&
						(origin.includes("1234") || this.baseUrl.includes("1234"))
					) {
						detectedType = "lmstudio";
					} else if (
						detectedType === "openai-compat" &&
						(origin.includes("8000") || this.baseUrl.includes("8000"))
					) {
						detectedType = "vllm";
					}

					probeResult = {
						online: true,
						latencyMs,
						providerType: detectedType,
						availableModels: models,
						activeModel: models.includes(this.defaultModel)
							? this.defaultModel
							: models[0] || this.defaultModel,
						airGapSafe: airGapCheck.compliant,
						checkedAt: Date.now(),
					};
					break;
				}
			} catch {
				clearTimeout(timeout);
				// Continue to next probe candidate URL
			}
		}

		if (!probeResult) {
			const latencyMs = Math.round(performance.now() - t0);
			probeResult = {
				online: false,
				latencyMs,
				providerType: "offline",
				availableModels: [],
				airGapSafe: airGapCheck.compliant,
				error: `Не удалось установить соединение с сервером инференса (${this.baseUrl}). Убедитесь, что запущен Ollama / vLLM.`,
				checkedAt: Date.now(),
			};
		}

		this.cachedProbe = { result: probeResult, expiresAt: now + ttl };
		return probeResult;
	}

	/**
	 * Lists available models from the local server.
	 */
	public async listModels(): Promise<string[]> {
		const probe = await this.probe();
		return probe.availableModels;
	}

	/**
	 * Checks if the local inference server is online and responding.
	 */
	public async isAvailable(): Promise<boolean> {
		const probe = await this.probe();
		return probe.online;
	}
}

/**
 * Creates an instance of LocalInferenceManager.
 */
export function createLocalInferenceManager(
	config?: LocalInferenceConfig,
): LocalInferenceManager {
	return new LocalInferenceManager(config);
}

export const defaultLocalInferenceManager = new LocalInferenceManager();
