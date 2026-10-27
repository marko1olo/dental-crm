import type { InvoiceServiceItem, WarrantyObligationTerm } from "./invoiceTypes";

/**
 * Resolves standard warranty period and service life based on clinical category and service name.
 */
export function resolveServiceWarranty(item: InvoiceServiceItem): {
	categoryName: string;
	warrantyMonths: number;
	warrantyPeriodText: string;
	serviceLifeText: string;
	conditionsText: string;
} {
	const lower = item.name.toLowerCase();

	if (
		lower.includes("имплант") ||
		lower.includes("straumann") ||
		lower.includes("osstem") ||
		lower.includes("nobel") ||
		item.category === "implantology"
	) {
		return {
			categoryName: "Дентальная имплантация (Хирургия)",
			warrantyMonths: 60,
			warrantyPeriodText: "60 месяцев (5 лет) / пожизненная гарантия на титановый имплантат от производителя",
			serviceLifeText: "Не ограничен (пожизненно при соблюдении гигиены)",
			conditionsText: "Прохождение контрольного рентген-осмотра и профгигиены каждые 6 месяцев",
		};
	}

	if (
		lower.includes("коронк") ||
		lower.includes("циркони") ||
		lower.includes("e.max") ||
		lower.includes("винир") ||
		lower.includes("протез") ||
		lower.includes("вкладк") ||
		item.category === "orthopedics"
	) {
		return {
			categoryName: "Ортопедические конструкции (Коронки, виниры, мосты)",
			warrantyMonths: 24,
			warrantyPeriodText: "24 месяца (2 года)",
			serviceLifeText: "5–7 лет",
			conditionsText: "Контрольный осмотр и пришлифовка окклюзии 1 раз в 6 месяцев, ношение ночной каппы при бруксизме",
		};
	}

	if (
		lower.includes("кариес") ||
		lower.includes("пломб") ||
		lower.includes("реставрац") ||
		lower.includes("пульпит") ||
		lower.includes("герметизац") ||
		item.category === "therapy"
	) {
		return {
			categoryName: "Терапевтическое лечение (Пломбы, реставрации)",
			warrantyMonths: 12,
			warrantyPeriodText: "12 месяцев (1 год)",
			serviceLifeText: "2–3 года",
			conditionsText: "Соблюдение индивидуальной гигиены полости рта, профгигиена не реже 1 раза в 6 месяцев",
		};
	}

	if (lower.includes("брекет") || lower.includes("элайнер") || item.category === "orthodontics") {
		return {
			categoryName: "Ортодонтическое лечение",
			warrantyMonths: 12,
			warrantyPeriodText: "12 месяцев (при условии ретенционного периода)",
			serviceLifeText: "Постоянно",
			conditionsText: "Ношение несъемных ретейнеров или ретенционных капп по предписанию врача-ортодонта",
		};
	}

	return {
		categoryName: "Стоматологические манипуляции и гигиена",
		warrantyMonths: 6,
		warrantyPeriodText: "По клиническому протоколу (до 6 месяцев)",
		serviceLifeText: "6–12 месяцев",
		conditionsText: "Регулярный профилактический осмотр",
	};
}
