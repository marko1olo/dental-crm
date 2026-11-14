import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export async function callCashShiftApi(
	primaryUrl: string,
	fallbackUrl: string,
	payload: Record<string, unknown>,
): Promise<void> {
	const headers = denteAdminSecretRequestHeaders({
		"Content-Type": "application/json",
	});
	try {
		const res = await fetch(primaryUrl, {
			method: "POST",
			headers,
			body: JSON.stringify(payload),
		});
		if (res.ok) return;
		if (fallbackUrl && (res.status === 404 || res.status === 405)) {
			await fetch(fallbackUrl, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
		}
	} catch (primaryErr: unknown) {
		console.warn(`[callCashShiftApi] Ошибка вызова основного URL ${primaryUrl}:`, primaryErr);
		if (fallbackUrl) {
			try {
				await fetch(fallbackUrl, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				});
			} catch (fallbackErr: unknown) {
				console.warn(`[callCashShiftApi] Ошибка вызова резервного URL ${fallbackUrl}:`, fallbackErr);
			}
		}
	}
}
