import type { FastifyInstance } from "fastify";
import { registerCallRecordingHandlers } from "./callRecordingHandlers.js";
import { registerTelephonyCallsListHandlers } from "./telephonyCallsListHandlers.js";
import { registerTelephonyWebhookHandlers } from "./telephonyWebhookHandlers.js";

export async function registerTelephonyAndCallWebhookHandlers(
	app: FastifyInstance,
): Promise<void> {
	registerCallRecordingHandlers(app);
	registerTelephonyWebhookHandlers(app);
	registerTelephonyCallsListHandlers(app);
}
