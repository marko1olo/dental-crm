export function getRecommendedProcedureTitle(cycleType: string): string {
	switch (cycleType) {
		case "implant_monitoring":
		case "prosthetic_check":
			return "Контроль имплантов и ортопедии";
		case "orthodontic_braces":
		case "orthodontic_aligners":
		case "orthodontic_retention":
			return "Ортодонтический контроль и активация";
		case "periodontal_maintenance":
			return "Пародонтологический осмотр и гигиена";
		case "pediatric_fluoridation":
			return "Детский профилактический осмотр";
		case "endodontic_check":
			return "Рентген-контроль эндодонтии";
		default:
			return "Профгигиена полости рта и осмотр";
	}
}

export function formatVisitDate(dateStr?: string): string {
	if (!dateStr) return "не указан";
	try {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	} catch {
		return dateStr;
	}
}
