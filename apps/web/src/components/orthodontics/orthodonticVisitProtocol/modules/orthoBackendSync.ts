import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";
import { showToast } from "../../../GlobalToast";
import type { WorkhorseArchwireOption } from "../../OrthoArchwireSelector";

export function syncOrthoBackendActions(
	patientId: string,
	selectedActions: string[],
	archwireMaterial: string,
	archwireSection: string,
	targetArch: string,
	notes: string,
	powerChainType: string,
	powerChainSpan: string,
) {
	const headers = {
		"Content-Type": "application/json",
		...denteAdminSecretRequestHeaders(),
	};
	if (selectedActions.includes("wire_change")) {
		fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/archwire-change`, {
			method: "POST",
			headers,
			body: JSON.stringify({ material: archwireMaterial, section: archwireSection, arch: targetArch, note: notes }),
		}).catch((err) => console.warn("[Orthodontics] Archwire change backend sync error:", err));
	}
	if (selectedActions.includes("ligature_change")) {
		fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/ligatures-activate`, {
			method: "POST",
			headers,
			body: JSON.stringify({ powerChain: powerChainType === "short", powerChainSpan, note: notes }),
		}).catch((err) => console.warn("[Orthodontics] Ligatures activation backend sync error:", err));
	}
	if (selectedActions.includes("rebracket")) {
		fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/rebracket`, {
			method: "POST",
			headers,
			body: JSON.stringify({ bracketType: "Damon / Mini Diamond (паз .022)", note: notes || "Повторная фиксация" }),
		}).catch((err) => console.warn("[Orthodontics] Rebracket backend sync error:", err));
	}
}

export async function fetchOrthoProgress(patientId: string) {
	try {
		const res = await fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/progress`, {
			headers: denteAdminSecretRequestHeaders(),
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

export function syncIssueAlignerSet(patientId: string, count: number, days: number, total: number) {
	fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/aligners/issue-set`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({ alignerCount: count, wearDaysPerAligner: days, totalAligners: total }),
	}).catch((err) => console.warn("[Orthodontics] Aligner set issuance backend sync error:", err));
}

export function syncWorkhorseArchwire(
	patientId: string,
	wire: WorkhorseArchwireOption,
	targetArch: string,
) {
	fetch(`/api/orthodontics/${encodeURIComponent(patientId)}/archwire-change`, {
		method: "POST",
		headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
		body: JSON.stringify({
			material: wire.material,
			section: wire.section,
			arch: targetArch || "both",
			note: `Рабочая дуга ${wire.label}`,
		}),
	})
		.then((res) => (res.ok ? res.json() : null))
		.then((data) => {
			if (data?.deduction?.success) {
				const msg = data.deduction.isOverdraft
					? `Склад (мягкий овердрафт): списана дуга ${wire.label}, остаток ${data.deduction.remainingStock} шт.`
					: `Склад: списана дуга ${wire.label} (остаток ${data.deduction.remainingStock} шт.)`;
				showToast(msg, data.deduction.isOverdraft ? "warning" : "success", 3000);
			}
		})
		.catch((err) => console.warn("[Orthodontics] Archwire deduction sync error:", err));
}
