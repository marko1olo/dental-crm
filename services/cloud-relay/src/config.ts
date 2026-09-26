import "dotenv/config";
import { z } from "zod";

const relayConfigSchema = z.object({
	PORT: z.coerce.number().int().positive().default(4050),
	HOST: z.string().trim().default("0.0.0.0"),
	EDGE_AUTH_TOKEN: z.string().trim().min(8).default("dev-edge-relay-secret-token"),
	DEFAULT_CLINIC_ID: z.string().trim().default("default-clinic"),
	REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
	MAX_PAYLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

export type RelayConfig = z.infer<typeof relayConfigSchema>;

export function loadRelayConfig(env: NodeJS.ProcessEnv = process.env): RelayConfig {
	return relayConfigSchema.parse(env);
}
