export const localConvenienceRetentionMs = 30 * 24 * 60 * 60 * 1000;

export function organizationScopedLocalStorageKey(
	baseKey: string,
	organizationId: string | null | undefined,
): string {
	const normalizedOrganizationId = organizationId?.trim();
	return normalizedOrganizationId
		? `${baseKey}:${normalizedOrganizationId}`
		: baseKey;
}

export function localSavedAtFresh(
	savedAt: string | null | undefined,
	retentionMs: number,
	nowMs = Date.now(),
): boolean {
	if (!savedAt) return false;
	const timestamp = Date.parse(savedAt);
	if (!Number.isFinite(timestamp)) return false;
	return timestamp <= nowMs + 5 * 60 * 1000 && nowMs - timestamp <= retentionMs;
}
