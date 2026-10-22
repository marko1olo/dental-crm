export function safeFormatJson(data: unknown, pretty = false): string {
	if (data === undefined) return "";
	try {
		return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
	} catch {
		return String(data);
	}
}
