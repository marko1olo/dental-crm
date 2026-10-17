export function getDefaultPayrollPeriod(): { start: string; end: string } {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
	return {
		start: `${year}-${month}-01`,
		end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
	};
}

export type PeriodPresetType = "current_month" | "previous_month" | "quarter" | "custom";

export function getDatesForPeriodPreset(preset: PeriodPresetType): { start?: string; end?: string } {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth();
	if (preset === "current_month") {
		const em = String(m + 1).padStart(2, "0");
		const lastD = String(new Date(y, m + 1, 0).getDate()).padStart(2, "0");
		return { start: `${y}-${em}-01`, end: `${y}-${em}-${lastD}` };
	}
	if (preset === "previous_month") {
		const prev = new Date(y, m - 1, 1);
		const py = prev.getFullYear();
		const pm = String(prev.getMonth() + 1).padStart(2, "0");
		const lastD = String(new Date(py, prev.getMonth() + 1, 0).getDate()).padStart(2, "0");
		return { start: `${py}-${pm}-01`, end: `${py}-${pm}-${lastD}` };
	}
	if (preset === "quarter") {
		const q = Math.floor(m / 3);
		const sm = String(q * 3 + 1).padStart(2, "0");
		const em = q * 3 + 3;
		const lastD = String(new Date(y, em, 0).getDate()).padStart(2, "0");
		return { start: `${y}-${sm}-01`, end: `${y}-${String(em).padStart(2, "0")}-${lastD}` };
	}
	return {};
}
