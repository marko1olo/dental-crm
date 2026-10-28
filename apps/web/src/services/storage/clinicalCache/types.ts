export const LOCAL_STORAGE_CACHE_PREFIX = "dente_cached_entity_v1:";
export const DEFAULT_STALE_SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function buildCacheKey(entityKind: string, entityId: string): string {
	return `${entityKind}:${entityId}`;
}
