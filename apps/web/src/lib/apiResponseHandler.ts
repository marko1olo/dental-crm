/**
 * apiResponseHandler.ts — Canonical HTTP API Response & Error Parser (SSOT).
 * Ensures zero silent failures and unified error messages across API clients.
 * Complies with Mandate 8s (SSOT) and Review Rule §2.14 (Zero Silent Failures).
 */

export async function handleApiResponse<T>(
	res: Response,
	fallbackMessage = "Ошибка выполнения запроса",
): Promise<T> {
	if (!res.ok) {
		const err = (await res.json().catch(() => ({ message: fallbackMessage }))) as
			| { message?: string }
			| null
			| undefined;
		const errorText =
			err && typeof err === "object" && typeof err.message === "string" && err.message.trim() !== ""
				? err.message
				: `${fallbackMessage} (HTTP ${res.status})`;
		throw new Error(errorText || `Ошибка HTTP ${res.status}`);
	}
	return res.json() as Promise<T>;
}
