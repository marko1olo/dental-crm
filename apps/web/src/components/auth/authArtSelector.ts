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

export interface AuthArtOptions {
	pack: string;
	slot: string;
	saveData: boolean;
	reducedMotion: boolean;
}

export function selectAuthArt(
	manifest: AuthArtItem[],
	options: AuthArtOptions
): AuthArtItem | null {
	if (options.saveData) {
		return null;
	}

	const packItems = manifest.filter((item) => item.pack === options.pack);
	if (packItems.length === 0) {
		return null;
	}

	let eligibleItems = packItems.filter((item) => item.slot === options.slot);
	
	// If the slot has less than 2 items, expand choice to the entire pack.
	// This ensures we still have variety, especially for packs like 'dental-epic' and 'abstract'
	// which might mostly have 'day' items.
	if (eligibleItems.length < 2) {
		eligibleItems = packItems;
	}

	if (eligibleItems.length === 0) {
		return null;
	}

	const randomIndex = Math.floor(Math.random() * eligibleItems.length);
	return eligibleItems[randomIndex];
}

export function getCurrentTimeSlot(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 11) return "morning";
	if (hour >= 11 && hour < 17) return "day";
	if (hour >= 17 && hour < 22) return "evening";
	return "night";
}
