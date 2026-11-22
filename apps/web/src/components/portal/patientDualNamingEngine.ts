/**
 * DENTE CRM — Patient Portal Dual Service Naming Engine
 * (DOMAIN: PATIENT PORTAL & CLINICAL TRANSPARENCY)
 *
 * Maps statutory Ministry of Health 804n nomenclature codes and dental jargon
 * into clear, transparent, and reassuring Russian terms for patients.
 */

export interface DualServiceItem {
	readonly code804n: string;
	readonly humanTitleRu: string;
	readonly technicalTitleRu: string;
	readonly explanationRu?: string | undefined;
	readonly sensationRu?: string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly toothFdi?: string | undefined;
	readonly isAllInclusive?: boolean | undefined;
}

export interface DualServiceFormatResult {
	readonly humanTitleRu: string;
	readonly statutoryCode804n: string;
	readonly explanationRu: string;
	readonly sensationRu: string;
	readonly defaultWarrantyRu: string;
}

/**
 * Maps statutory Ministry of Health 804n nomenclature codes and dental jargon
 * into clear, transparent, and reassuring Russian terms for patients.
 */
export function formatDualServiceName(code: string, rawTitle: string): DualServiceFormatResult {
	const lower = rawTitle.toLowerCase();

	// 1. Caries & Fillings
	if (code.startsWith("A16.07.002") || lower.includes("пломб") || lower.includes("кариес") || lower.includes("реставрац")) {
		return {
			humanTitleRu: "Лечение кариеса и светоотверждаемая пломба",
			statutoryCode804n: code || "A16.07.002.001",
			explanationRu: "Бережное удаление кариеса, антисептическая обработка и восстановление анатомической формы зуба прочным нанокомпозитом.",
			sensationRu: "100% безболезненно: глубокая анестезия за 90 сек, легкая вибрация без давления.",
			defaultWarrantyRu: "Гарантия 1–2 года",
		};
	}

	// 2. Root Canals & Endodontics / Pulpitis / Periodontitis
	if (code.startsWith("A16.07.004") || lower.includes("канал") || lower.includes("пульпит") || lower.includes("периодонтит") || lower.includes("эндодонт")) {
		return {
			humanTitleRu: "Лечение корневых каналов под микроскопом",
			statutoryCode804n: code || "A16.07.004.001",
			explanationRu: "Высокоточное 3D-очищение и герметичное пломбирование каналов зуба под дентальным микроскопом с контролем визиографа.",
			sensationRu: "Полный покой: изоляция коффердамом позволяет свободно сглатывать и дышать.",
			defaultWarrantyRu: "Гарантийный контроль (1 год)",
		};
	}

	// 3. Crowns & Orthopedics / Zirconia / E.max
	if (code.startsWith("A16.07.006") || lower.includes("коронк") || lower.includes("циркони") || lower.includes("e.max") || lower.includes("металлокерам")) {
		return {
			humanTitleRu: "Установка эстетической коронки (диоксид циркония / E.max)",
			statutoryCode804n: code || "A16.07.006.001",
			explanationRu: "Изготовление и постоянная фиксация сверхпрочной монолитной коронки, точно повторяющей цвет и анатомию естественного зуба.",
			sensationRu: "Комфортная примерка: врач тщательно проверяет прикус до микрометров.",
			defaultWarrantyRu: "Гарантия 2–5 лет",
		};
	}

	// 4. Veneers & Esthetics
	if (code.startsWith("A16.07.003") || lower.includes("винир") || lower.includes("люминир") || lower.includes("накладк")) {
		return {
			humanTitleRu: "Керамический винир E.max (индивидуальная эстетика)",
			statutoryCode804n: code || "A16.07.003",
			explanationRu: "Тончайшая керамическая пластинка для создания безупречной зоны улыбки, исправления формы и цвета зуба.",
			sensationRu: "Бережная микро-обработка в пределах эмали, полное сохранение витальности зуба.",
			defaultWarrantyRu: "Гарантия 2–5 лет",
		};
	}

	// 5. Implants & Surgery
	if (code.startsWith("A16.07.054") || lower.includes("имплант") || lower.includes("dentium") || lower.includes("straumann") || lower.includes("osstem")) {
		return {
			humanTitleRu: "Установка дентального имплантата под ключ",
			statutoryCode804n: code || "A16.07.054",
			explanationRu: "Установка премиального титанового имплантата с пожизненной гарантией производителя по 3D-навигационному шаблону.",
			sensationRu: "Быстрее, чем лечение кариеса: установка занимает 15–20 мин без малейшей боли.",
			defaultWarrantyRu: "Пожизненная гарантия на титан + 3 года на работу",
		};
	}

	// 6. Professional Hygiene & Air-Flow
	if (code.startsWith("A16.07.051") || lower.includes("гигиен") || lower.includes("air-flow") || lower.includes("чистк") || lower.includes("ультразвук")) {
		return {
			humanTitleRu: "Комплексная гигиена (УЗ + Air-Flow + реминерализация)",
			statutoryCode804n: code || "A16.07.051",
			explanationRu: "Удаление твердого зубного камня ультразвуком, снятие мягкого налета порошком Air-Flow и укрепление эмали фторлаком.",
			sensationRu: "Освежающая спа-процедура для зубов с мягким ягодным/мятным вкусом порошка.",
			defaultWarrantyRu: "Рекомендованный интервал 6 мес.",
		};
	}

	// 7. Extractions
	if (code.startsWith("A16.07.001") || lower.includes("удален") || lower.includes("экстракц") || lower.includes("мудрост")) {
		return {
			humanTitleRu: "Атравматичное удаление зуба с сохранением костной ткани",
			statutoryCode804n: code || "A16.07.001",
			explanationRu: "Безболезненное извлечение зуба с бережным сохранением лунки и костных стенок для комфортного заживления.",
			sensationRu: "Глубокая анестезия: чувствуется только легкое покачивание, без острой боли.",
			defaultWarrantyRu: "Бесплатный контрольный осмотр",
		};
	}

	// 8. Inlays / Onlays
	if (code.startsWith("A16.07.005") || lower.includes("вкладк")) {
		return {
			humanTitleRu: "Керамическая культевая / восстановительная вкладка",
			statutoryCode804n: code || "A16.07.005",
			explanationRu: "Лабораторная керамическая микро-вставка для восстановления сильно разрушенного зуба перед установкой коронки.",
			sensationRu: "Полная защита зуба от раскалывания при жевании.",
			defaultWarrantyRu: "Гарантия 2 года",
		};
	}

	return {
		humanTitleRu: rawTitle,
		statutoryCode804n: code || "Медицинская услуга",
		explanationRu: "Медицинская манипуляция по клиническим протоколам СтАР и Минздрава РФ.",
		sensationRu: "Процедура выполняется под индивидуально подобранной анестезией.",
		defaultWarrantyRu: "Гарантия клиники DENTE",
	};
}
