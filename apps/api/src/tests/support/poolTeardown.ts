// Ensure test environment variables are properly initialized
process.env.NODE_ENV = "test";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS =
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS || "1";
process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS =
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS || "1";
process.env.DENTAL_SPEECH_KEY_HEALTH_FILE = "off";

import dotenv from "dotenv";

// Intercept dotenv so unexpected calls to dotenv.config() in test modules do not load .env files
const originalDotenvConfig = dotenv.config;
dotenv.config = (options?: any) => {
	if (
		process.env.NODE_ENV === "test" &&
		process.env.DENTE_ALLOW_TEST_ENV_FILES !== "1"
	) {
		return { parsed: {} };
	}
	return originalDotenvConfig(options);
};

export const SENSITIVE_LIVE_KEY_PATTERN =
	/^(GEMINI_|GOOGLE_|GROQ_|OPENAI_|ANTHROPIC_|OPENROUTER_|DEEPSEEK_|DEEPGRAM_|ASSEMBLYAI_|CLOUDFLARE_|AZURE_SPEECH_|HUGGINGFACE_|HF_|YOOKASSA_|DADATA_|WABA_|TELEGRAM_|SMS_|DENTE_SMS_|DENTE_TELEGRAM_|GLOBAL_LLM_PROXY_|PROXY_URL|HTTPS_PROXY|HTTP_PROXY|LLM_PROXY|ALL_PROXY|SOCKS_PROXY)/i;

export function purgeLiveApiKeys(env: NodeJS.ProcessEnv = process.env): void {
	for (const key of Object.keys(env)) {
		if (SENSITIVE_LIVE_KEY_PATTERN.test(key)) {
			delete env[key];
		}
	}
}

// Purge live API keys and proxy configuration immediately on import
purgeLiveApiKeys();
