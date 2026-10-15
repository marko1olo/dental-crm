export const SPECIALTY_DICTIONARY: Record<string, string> = {
	therapy: "Терапия",
	surgery: "Хирургия",
	orthopedics: "Ортопедия",
	orthodontics: "Ортодонтия",
	pediatric: "Детство",
	children: "Детство",
	periodontics: "Пародонтология",
	hygiene: "Гигиена",
	implants: "Имплантация",
	diagnostics: "Диагностика",
};

export function computePatientAgeYears(activePatient?: { birthDate?: string | Date; age?: number }): number | undefined {
	if (activePatient?.birthDate) {
		const birth = new Date(activePatient.birthDate);
		if (!Number.isNaN(birth.getTime())) {
			const now = new Date();
			let age = now.getFullYear() - birth.getFullYear();
			const m = now.getMonth() - birth.getMonth();
			if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
				age--;
			}
			return age;
		}
	}
	if (typeof activePatient?.age === "number") return activePatient.age;
	return undefined;
}

export function formatInvoiceServices(services: any, activeTooth: number | null) {
	const list = Array.isArray(services) ? services : [services];
	return list
		.filter(Boolean)
		.map((item) => ({
			code: item.code804n || item.code || "A16.07.002",
			title: item.title || item.name || item.nameRu || "Стоматологическая услуга",
			price: item.priceRub || item.price || 0,
			quantity: item.quantity || 1,
			toothCode: activeTooth ? String(activeTooth) : undefined,
		}));
}
