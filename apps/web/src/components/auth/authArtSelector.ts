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
	| "all";

export interface AuthArtOptions {
	pack: AuthArtPack | string;
	slot?: string | undefined;
	saveData?: boolean | undefined;
	reducedMotion?: boolean | undefined;
	theme?: "light" | "dark" | string | undefined;
}

function isDarkDominant(color: string): boolean {
	if (!color) return false;
	try {
		const clean = color.replace("#", "").trim();
		const r = parseInt(clean.slice(0, 2), 16);
		const g = parseInt(clean.slice(2, 4), 16);
		const b = parseInt(clean.slice(4, 6), 16);
		const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
		return lum < 0.12;
	} catch {
		return false;
	}
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

	let slot = options.slot || getCurrentTimeSlot(options.theme);
	let eligibleItems: AuthArtItem[] = [];

	// Light theme invariant: light theme must ALWAYS show daylight or morning light art
	if (options.theme === "light") {
		if (slot === "night" || slot === "evening") {
			slot = "morning";
		}
		const lightPool = pool.filter(
			(item) =>
				(item.slot === "morning" || item.slot === "day") &&
				!isDarkDominant(item.dominantColor),
		);
		if (lightPool.length >= 2) {
			const slotMatches = lightPool.filter((item) => item.slot === slot);
			eligibleItems = slotMatches.length >= 2 ? slotMatches : lightPool;
		} else {
			eligibleItems = pool.filter((item) => item.slot === slot);
		}
	} else {
		eligibleItems = pool.filter((item) => item.slot === slot);
	}

	// If the slot has less than 2 items, expand choice to the entire pool.
	// This ensures variety, especially for packs like 'dental-epic' or 'abstract'
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

export function getCurrentTimeSlot(theme?: string): string {
	const hour = new Date().getHours();
	if (theme === "light") {
		if (hour >= 5 && hour < 12) return "morning";
		return "day";
	}
	if (hour >= 5 && hour < 11) return "morning";
	if (hour >= 11 && hour < 17) return "day";
	if (hour >= 17 && hour < 22) return "evening";
	return "night";
}
