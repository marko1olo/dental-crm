import { repairMojibakeDeep } from "../../../text/repairMojibake.js";
import type { SettingsPayloadSchema } from "../types.js";

export function parseSettingsPayload<T>(
	schema: SettingsPayloadSchema<T>,
	value: unknown,
	logger?: { error: (obj: unknown, msg?: string) => void },
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		logger?.error(
			{ err: parsed.error?.format() },
			"[Dente] parseSettingsPayload failed",
		);
		return null;
	}
	return parsed.data;
}

export function settingsDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return repairMojibakeDeep(error.message);
}

export function hasActiveScheduleConflict(message: string): boolean {
	return (
		message.includes("активная запись") || message.includes("активные записи")
	);
}
