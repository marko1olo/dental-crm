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
	} catch {
		if (fallbackUrl) {
			try {
				await fetch(fallbackUrl, {
					method: "POST",
					headers,
					body: JSON.stringify(payload),
				});
			} catch {
				// Non-blocking: offline or standalone client resilience
			}
		}
	}
}
