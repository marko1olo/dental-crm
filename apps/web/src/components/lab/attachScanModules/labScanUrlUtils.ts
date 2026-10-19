export function is3DScanUrl(url?: string | null): boolean {
	if (!url) return false;
	return /\.(stl|ply|obj|3mf)($|[?#])/i.test(url) || /scan/i.test(url);
}
