import { logger } from "./logger";

export async function fetchWithHandling(
	url: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	const urlStr = typeof url === "string" ? url : (url instanceof URL ? url.toString() : url.url);
	try {
		const res = await fetch(url, init);
		if (!res.ok) {
			const errorMsg = `HTTP ${res.status} ${res.statusText} for ${urlStr}`;
			logger.error(`[networkUtils] ${errorMsg}`);
			throw new Error(errorMsg);
		}
		return res;
	} catch (err: unknown) {
		if (err instanceof Error && err.message.startsWith("HTTP ")) {
			throw err;
		}
		const errorMsg = err instanceof Error ? err.message : String(err);
		logger.error(`[networkUtils] Fetch error for ${urlStr}: ${errorMsg}`, err);
		throw err instanceof Error ? err : new Error(errorMsg);
	}
}
