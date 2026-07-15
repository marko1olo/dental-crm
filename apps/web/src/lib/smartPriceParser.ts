import { normalizeDentalSlang, textToNumbers } from "./stringUtils";

export interface ParsedPriceData {
	serviceName: string;
	price: number | null;
	category: string | null;
}

const CATEGORY_MAP: Record<string, string> = {
	хирурги: "Хирургия",
	терапи: "Терапия",
	ортопеди: "Ортопедия",
	ортодонт: "Ортодонтия",
	гигиен: "Гигиена",
	профилактик: "Профилактика",
	имплантаци: "Имплантация",
	рентген: "Диагностика",
	диагностик: "Диагностика",
	детств: "Детская стоматология",
	детск: "Детская стоматология",
};

export function parsePriceDictationLocal(input: string): ParsedPriceData {
	const result: ParsedPriceData = {
		serviceName: "",
		price: null,
		category: null,
	};
	let normalized = textToNumbers(input);
	normalized = normalizeDentalSlang(normalized);

	// Extract Price
	// Look for number before "руб", "р", "тысяч", "тыс"
	const priceRegexes = [
		/(\d+[\d\s]*)\s*(?:тысяч|тыс|т\.р\.|т\.р|тр)\b/i,
		/(\d+[\d\s]*)\s*(?:рублей|руб|р\.|р\b)/i,
		/цена\s*(\d+[\d\s]*)/i,
		/стоимость\s*(\d+[\d\s]*)/i,
		/за\s*(\d+[\d\s]*)/i,
	];

	for (const regex of priceRegexes) {
		const match = normalized.match(regex);
		if (match && match[1]) {
			const rawNum = match[1].replace(/\s+/g, "");
			let price = parseInt(rawNum, 10);

			// If the match was for "тысяч", multiply by 1000
			if (regex.source.includes("тысяч|тыс")) {
				price = price * 1000;
			} else if (price < 100 && rawNum.length < 3) {
				// if someone says "за 5", they usually mean 5000 in dental context
				price = price * 1000;
			}

			result.price = price;
			// Remove price text from normalized to clean up service name
			normalized = normalized.replace(match[0], " ");
			break;
		}
	}

	// Extract Category
	for (const [key, categoryName] of Object.entries(CATEGORY_MAP)) {
		const catRegex = new RegExp(`(?:категори[а-я]*\\s*)?${key}[а-я]*`, "i");
		const match = normalized.match(catRegex);
		if (match) {
			result.category = categoryName;
			normalized = normalized.replace(match[0], " ");
			break;
		}
	}

	// Clean up service name
	// Remove stopwords like "добавь", "в прайс", "услугу"
	const stopWords =
		/(?:^|[^а-яёa-z0-9])(добавь|добавить|создай|услугу|в прайс|прайс|позицию|новую|сделай|напиши|запиши)(?:[^а-яёa-z0-9]|$)/gi;
	normalized = normalized.replace(stopWords, " ").replace(stopWords, " ");

	// Clean stray punctuation
	normalized = normalized
		.replace(/[,;.!?]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (normalized.length > 0) {
		result.serviceName =
			normalized.charAt(0).toUpperCase() + normalized.slice(1);
	}

	return result;
}
