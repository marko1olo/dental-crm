export type AttachmentFile = {
	id: string;
	url: string;
	name: string;
	type: string;
};

export function jsonObjectOrNull(raw: string): Record<string, unknown> | null {
	const t = raw.trim();
	if (!t) return null;
	try {
		const p: unknown = JSON.parse(t);
		return typeof p === "object" && p !== null && !Array.isArray(p)
			? (p as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

export function parseFilesPayload(raw: string): AttachmentFile[] {
	const json = jsonObjectOrNull(raw);
	const files = json?.files;
	if (!Array.isArray(files)) return [];
	const out: AttachmentFile[] = [];
	for (const row of files) {
		if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
		const r = row as Record<string, unknown>;
		const id = typeof r.id === "string" ? r.id.trim() : "";
		const url = typeof r.url === "string" ? r.url.trim() : "";
		const name = typeof r.name === "string" ? r.name.trim() : "";
		const type = typeof r.type === "string" ? r.type.trim() : "";
		if (!id || !url) continue;
		out.push({
			id,
			url,
			name: name || id,
			type: type || "application/octet-stream",
		});
	}
	return out;
}
