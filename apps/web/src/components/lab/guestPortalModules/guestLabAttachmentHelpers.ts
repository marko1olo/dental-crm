export function is3DScanFile(url: string): boolean {
	return (
		/\.(stl|ply|obj|3mf)($|[?#])/i.test(url) ||
		/scan/i.test(url) ||
		/model/i.test(url)
	);
}

export function isImageFile(url: string): boolean {
	if (is3DScanFile(url)) return false;
	return (
		/\.(jpe?g|png|webp|gif|svg)($|[?#])/i.test(url) ||
		url.startsWith("data:image/")
	);
}

export function getAttachmentFileName(url: string): string {
	try {
		const parsed = new URL(url, window.location.origin);
		const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
		if (lastSegment) return decodeURIComponent(lastSegment);
	} catch {
		// fallback
	}
	const clean = url.split("?")[0]?.split("#")[0] ?? "";
	const last = clean.split("/").pop();
	return last || "3d_scan.stl";
}

export function getAttachmentExtension(url: string): string {
	const filename = getAttachmentFileName(url);
	const ext = filename.split(".").pop()?.toUpperCase();
	return ext || "STL";
}

export function getAttachmentFileSize(url: string): string {
	try {
		const parsed = new URL(url, window.location.origin);
		const sizeParam = parsed.searchParams.get("size");
		if (sizeParam) return decodeURIComponent(sizeParam);
	} catch {
		// fallback
	}
	if (url.startsWith("data:")) {
		const bytes = Math.round((url.length * 3) / 4);
		if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
		if (bytes > 1024) return `${Math.round(bytes / 1024)} КБ`;
	}
	return "Вложение";
}
