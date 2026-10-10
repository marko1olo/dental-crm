export function throwIfBrowserImagingScanAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) return;
	const error = new Error("Browser imaging scan cancelled");
	error.name = "AbortError";
	throw error;
}

export function isBrowserImagingScanAbortError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		String((error as { name?: unknown }).name) === "AbortError"
	);
}

export function throwIfBrowserMigrationScanAborted(signal?: AbortSignal): void {
	if (!signal?.aborted) return;
	const error = new Error("Browser migration scan cancelled");
	error.name = "AbortError";
	throw error;
}

export function isBrowserMigrationScanAbortError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		String((error as { name?: unknown }).name) === "AbortError"
	);
}
