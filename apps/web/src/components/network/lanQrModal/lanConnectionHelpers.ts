import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import type { DeviceRole } from "../lanQrEngine";

export interface DiscoveredServerOption {
	readonly label: string;
	readonly origin: string;
}

export function getClinicAuthHeaders(): Record<string, string> {
	const h: Record<string, string> = { "Content-Type": "application/json" };
	if (typeof window !== "undefined") {
		const ct = localStorage.getItem("dente_clinic_token");
		const st = localStorage.getItem("dente_staff_token");
		if (ct) h["x-dente-clinic-token"] = ct;
		if (st) h["x-dente-staff-token"] = st;
	}
	return h;
}

export function formatSecondsToTimer(totalSeconds: number): string {
	const m = Math.floor(Math.max(0, totalSeconds) / 60);
	const s = Math.max(0, totalSeconds) % 60;
	return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export async function copyTextSafely(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(text);
			return true;
		}
		const ta = document.createElement("textarea");
		ta.value = text;
		document.body.appendChild(ta);
		ta.select();
		document.execCommand("copy");
		document.body.removeChild(ta);
		return true;
	} catch {
		return false;
	}
}

export async function discoverLanServerOptions(): Promise<DiscoveredServerOption[]> {
	const found: DiscoveredServerOption[] = [];
	try {
		const res = await fetch("/api/network/lan-mesh/discover", { method: "POST", headers: getClinicAuthHeaders() });
		if (res.ok) {
			const rawData = (await res.json()) as { data?: { mdnsServers?: Array<{ serverName?: string; address: string; apiPort: number }>; discoveredEndpoints?: string[] }; mdnsServers?: Array<{ serverName?: string; address: string; apiPort: number }>; discoveredEndpoints?: string[] };
			const data = rawData?.data ?? rawData;
			for (const s of data.mdnsServers || []) {
				found.push({ label: `${s.serverName || "DENTE Сервер"} (${s.address}:${s.apiPort})`, origin: `http://${s.address}:${s.apiPort}` });
			}
			for (const ep of data.discoveredEndpoints || []) {
				const orig = `http://${ep}`;
				if (!found.some((x) => x.origin === orig)) found.push({ label: `Найден в LAN (${ep})`, origin: orig });
			}
		}
	} catch { /* fallback to discovery summary */ }
	if (found.length === 0) {
		try {
			const h = await fetch("/api/health/discovery", { cache: "no-store" });
			if (h.ok) {
				const rawD = (await h.json()) as { data?: { serverName?: string; primaryIp?: string; apiPort?: number }; serverName?: string; primaryIp?: string; apiPort?: number };
				const d = rawD?.data ?? rawD;
				if (d.primaryIp && d.apiPort) found.push({ label: `${d.serverName || "Главный ПК"} (${d.primaryIp}:${d.apiPort})`, origin: `http://${d.primaryIp}:${d.apiPort}` });
			}
		} catch { /* manual fallback stays active */ }
	}
	return found;
}

interface AutoJoinVerifyResponse {
	data?: { ok?: boolean; clinicToken?: string; message?: string; join?: { clinicToken?: string; meshToken?: string } };
	ok?: boolean;
	clinicToken?: string;
	message?: string;
	join?: { clinicToken?: string; meshToken?: string };
}

export async function submitAutoJoinPin(
	serverAddress: string,
	pin: string,
	role: DeviceRole,
): Promise<{ ok: boolean; message?: string }> {
	const normalized = /^https?:\/\//i.test(serverAddress.trim())
		? serverAddress.trim().replace(/\/+$/, "")
		: `http://${serverAddress.trim().replace(/\/+$/, "")}`;
	try {
		const idem = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : undefined;
		const res = await fetch(`${normalized}/api/network/mesh/auto-join/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...(idem ? { "Idempotency-Key": idem } : {}) },
			body: JSON.stringify({ pin, role, clientName: role === "assistant" ? "Планшет ассистента" : "Планшет врача" }),
		});
		let rawData: AutoJoinVerifyResponse | null = null;
		let parseDetail = "";
		try {
			rawData = (await res.json()) as AutoJoinVerifyResponse;
		} catch (parseErr) {
			parseDetail = parseErr instanceof Error ? ` (${parseErr.message})` : "";
		}
		const data = rawData?.data ?? rawData;
		const token = data?.clinicToken || data?.join?.clinicToken;
		if (!res.ok || !token) {
			return { ok: false, message: data?.message || `Ошибка сопряжения (${res.status})${parseDetail}. Проверьте PIN и брандмауэр Windows (порт 4100).` };
		}
		safeLocalStorageSetItem("dente_clinic_token", token, true);
		if (data?.join?.meshToken) safeLocalStorageSetItem("dente_mesh_token", data.join.meshToken, true);
		safeLocalStorageSetItem("dente_lan_server_url", normalized, true);
		safeLocalStorageSetItem("dente_active_api_base_url", `${normalized}/api`, true);
		window.dispatchEvent(new CustomEvent("dente:lan-paired", { detail: { origin: normalized, role } }));
		return { ok: true };
	} catch {
		return { ok: false, message: "Сервер недоступен. Проверьте порт 4100/5173 в брандмауэре Windows или введите IP вручную." };
	}
}
