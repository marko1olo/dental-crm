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
