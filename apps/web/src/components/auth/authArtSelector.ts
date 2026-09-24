export interface AuthArtItem {
	pack: string;
	slot: string;
	avif: string;
	webp: string;
	lqip: string;
	dominantColor: string;
	width: number;
	height: number;
	avifBytes?: number;
	avifQuality?: number;
}

export type AuthArtPack =
	| "nature"
	| "dental-epic"
	| "abstract"
	| "anime"
	| "all";

export interface AuthArtOptions {
	pack: AuthArtPack | string;
	slot: string;
	saveData: boolean;
	reducedMotion: boolean;
}

export function selectAuthArt(
	manifest: AuthArtItem[],
	options: AuthArtOptions,
): AuthArtItem | null {
	if (options.saveData || manifest.length === 0) {
		return null;
	}

	const isAll = options.pack === "all";
	const pool = isAll
		? manifest
		: manifest.filter((item) => item.pack === options.pack);

	if (pool.length === 0) {
		return null;
	}

	let eligibleItems = pool.filter((item) => item.slot === options.slot);

	// If the slot has less than 2 items, expand choice to the entire pool.
	// This ensures variety, especially for packs like 'dental-epic', 'abstract', 'anime'
	// where certain time-of-day slots may only have 1 or 2 items, and guarantees
	// the screen never remains without background art.
	if (eligibleItems.length < 2) {
		eligibleItems = pool;
	}

	if (eligibleItems.length === 0) {
		return null;
	}

	const idx = Date.now() % eligibleItems.length;
	return eligibleItems[idx] || null;
}

export function getCurrentTimeSlot(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 11) return "morning";
	if (hour >= 11 && hour < 17) return "day";
	if (hour >= 17 && hour < 22) return "evening";
	return "night";
}
