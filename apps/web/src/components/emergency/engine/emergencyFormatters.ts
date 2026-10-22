/**
 * Emergency Formatting Utilities (Layer 2)
 */

export function formatTimerSeconds(seconds: number): string {
	const safeSec = Math.max(0, Math.floor(seconds));
	const mins = Math.floor(safeSec / 60);
	const secs = safeSec % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
