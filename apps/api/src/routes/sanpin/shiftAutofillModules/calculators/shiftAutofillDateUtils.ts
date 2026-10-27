export function normalizePackagingType(rawPackagingType?: string): string {
	const pt = String(rawPackagingType || "").toLowerCase();
	if (pt === "kraft_self_adhesive" || pt === "kraft_self_seal") return "kraft_self_adhesive";
	if (pt === "laminated_heat_sealed" || pt.includes("kombin") || pt.includes("laminat")) {
		return "laminated_heat_sealed";
	}
	if (pt === "metal_cassette" || pt.includes("kasset")) return "metal_cassette";
	if (pt === "other") return "other";
	return "kraft_heat_sealed";
}

export function calculateMonthWorkingDates(year?: number, month?: number): {
	targetYear: number;
	targetMonth: number;
	workingDates: string[];
	monthLabelRu: string;
} {
	const now = new Date();
	const targetYear = year ?? now.getFullYear();
	const targetMonth = month ? month - 1 : now.getMonth();
	const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

	const monthNamesRu = [
		"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
		"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
	];
	const monthLabelRu = `${monthNamesRu[targetMonth]} ${targetYear}`;

	const workingDates: string[] = [];
	for (let d = 1; d <= daysInMonth; d++) {
		const dt = new Date(targetYear, targetMonth, d);
		if (dt.getDay() !== 0) {
			const yyyy = dt.getFullYear();
			const mm = String(dt.getMonth() + 1).padStart(2, "0");
			const dd = String(dt.getDate()).padStart(2, "0");
			workingDates.push(`${yyyy}-${mm}-${dd}`);
		}
	}

	return { targetYear, targetMonth, workingDates, monthLabelRu };
}
