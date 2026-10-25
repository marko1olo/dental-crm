import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { normalizeTaxationId } from "./TaxationCardTypes";

export function createFiscalAuthHeaders(
	auth: any,
	extra: Record<string, string> = {},
): Record<string, string> {
	const base = denteAdminSecretRequestHeaders(extra);
	if (auth && typeof auth.settingsAccessHeaders === "function") {
		return {
			...base,
			...auth.settingsAccessHeaders(),
			...extra,
		};
	}
	return base;
}

export async function fetchClinicFiscal(headers: Record<string, string>) {
	const res = await fetch("/api/settings/clinic/fiscal", {
		method: "GET",
		headers,
	});
	if (!res.ok) return null;
	const data = await res.json();
	if (!data) return null;
	return {
		...data,
		taxationSystem: normalizeTaxationId(data.taxationSystem),
		ofdProvider: data.ofdProvider === "platform_ofd" ? "platforma_ofd" : data.ofdProvider,
	};
}

export async function putClinicFiscal(payload: any, headers: Record<string, string>) {
	const res = await fetch("/api/settings/clinic/fiscal", {
		method: "PUT",
		headers: { ...headers, "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!res.ok) {
		throw new Error("Не удалось сохранить настройки кассы и СНО");
	}
	return await res.json();
}
