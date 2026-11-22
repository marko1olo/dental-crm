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

export function computePatientAgeYears(activePatient?: { birthDate?: string | Date | null | undefined; age?: number | string | null | undefined } | null | undefined): number | undefined {
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
	if (typeof activePatient?.age === "string") {
		const parsed = Number.parseInt(activePatient.age, 10);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return undefined;
}

export interface SpecialtyInvoiceServiceCandidate {
	readonly code804n?: string | undefined;
	readonly code?: string | undefined;
	readonly title?: string | undefined;
	readonly name?: string | undefined;
	readonly nameRu?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly price?: number | undefined;
	readonly quantity?: number | undefined;
	readonly [key: string]: unknown;
}

export function formatInvoiceServices(
	services: unknown,
	activeTooth: number | null,
) {
	const list: unknown[] = Array.isArray(services) ? services : services ? [services] : [];
	return list
		.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
		.map((item) => ({
			code: typeof item.code804n === "string" ? item.code804n : typeof item.code === "string" ? item.code : "A16.07.002",
			title: typeof item.title === "string" ? item.title : typeof item.name === "string" ? item.name : typeof item.nameRu === "string" ? item.nameRu : "Стоматологическая услуга",
			price: typeof item.priceRub === "number" ? item.priceRub : typeof item.price === "number" ? item.price : 0,
			quantity: typeof item.quantity === "number" ? item.quantity : 1,
			toothCode: activeTooth ? String(activeTooth) : undefined,
		}));
}
