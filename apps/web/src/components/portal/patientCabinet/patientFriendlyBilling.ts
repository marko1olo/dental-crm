/**
 * patientFriendlyBilling.ts
 *
 * Понятная детализация счетов для пациента (без сложной медицинской латыни и номенклатуры 804н).
 * Группировка услуг по смысловым блокам: кариес, обезболивание, снимки, чистка, коронки, имплантаты.
 * Генерация понятного текста счета для отправки пациенту в WhatsApp/SMS.
 */

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export type FriendlyBillingCategory =
	| "caries"
	| "anesthesia"
	| "xray"
	| "hygiene"
	| "implant"
	| "crowns"
	| "surgery"
	| "ortho"
	| "other";

export interface FriendlyBillingItem {
	readonly id: string;
	readonly originalName: string;
	readonly friendlyName: string;
	readonly categoryGroup: FriendlyBillingCategory;
	readonly categoryGroupRu: string; // «Лечение кариеса», «Обезболивание», «Снимок»
	readonly groupIcon: string; // "Syringe", "Camera", "Activity", "Sparkles", "Shield", "Crown", "Ruler", "FileText"
	readonly plainDescriptionRu: string;
	readonly toothNumber?: string | number | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
	readonly isWarranty?: boolean | undefined;
}

export interface FriendlyBillingGroup {
	readonly categoryGroup: FriendlyBillingCategory;
	readonly categoryGroupRu: string;
	readonly groupIcon: string;
	readonly summaryRu: string;
	readonly items: readonly FriendlyBillingItem[];
	readonly subtotalRub: number;
	readonly percentageOfTotal: number;
}

export interface FriendlyBillingBreakdown {
	readonly totalAmountRub: number;
	readonly totalAmountRubFormatted: string;
	readonly groups: readonly FriendlyBillingGroup[];
	readonly patientFriendlySummaryRu: string;
}

export interface GenericInvoiceServiceItemInput {
	readonly id?: string | undefined;
	readonly name?: string | undefined;
	readonly titleRu?: string | undefined;
	readonly code?: string | undefined;
	readonly code804n?: string | null | undefined;
	readonly toothNumber?: number | string | null | undefined;
	readonly toothFdi?: string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub?: number | undefined;
	readonly discountRub?: number | undefined;
	readonly category?: string | undefined;
}

// ============================================================================
// FRIENDLY BILLING BREAKDOWN (АНТИ-ЛАТЫНЬ)
// ============================================================================

export function cleanToothNumberFromName(name: string): string {
	return (name || "")
		.replace(/\s*\((?:зуб\s*(?:№\s*)?|позиция\s*)\d+\)/gi, "")
		.replace(/\s*\[(?:зуб\s*(?:№\s*)?|позиция\s*)\d+\]/gi, "")
		.trim();
}

/**
 * Переводит сложную медицинскую номенклатуру 804н / латынь в понятный для пациента русский блок.
 */
export function translateMedicalTermToFriendly(
	rawName: string,
	toothNumber?: string | number | null | undefined,
): {
	readonly friendlyName: string;
	readonly categoryGroup: FriendlyBillingCategory;
	readonly categoryGroupRu: string;
	readonly groupIcon: string;
	readonly plainDescriptionRu: string;
} {
	const lower = (rawName || "").toLowerCase();

	// 1. Анестезия / Обезболивание
	if (
		lower.includes("анестези") ||
		lower.includes("артикаин") ||
		lower.includes("ультракаин") ||
		lower.includes("скандонест") ||
		lower.includes("септонест") ||
		lower.includes("лидокаин") ||
		lower.includes("мепивакаин") ||
		lower.includes("инфильтрационн") ||
		lower.includes("проводников") ||
		lower.includes("b01.003")
	) {
		return {
			friendlyName: "Обезболивание (анестезия)",
			categoryGroup: "anesthesia",
			categoryGroupRu: "Обезболивание (анестезия)",
			groupIcon: "Syringe",
			plainDescriptionRu:
				"Современное мягкое обезболивание для полной безболезненности и комфорта во время лечения",
		};
	}

	// 2. Снимки и радиовизиография / КТ
	if (
		lower.includes("снимок") ||
		lower.includes("радиовизиограф") ||
		lower.includes("рентген") ||
		lower.includes("кт") ||
		lower.includes("томограф") ||
		lower.includes("ортопантомограмм") ||
		lower.includes("оптг") ||
		lower.includes("a06.07")
	) {
		return {
			friendlyName: lower.includes("кт") || lower.includes("томограф")
				? "3D-компьютерная томография (КТ)"
				: "Снимок зуба (радиовизиография)",
			categoryGroup: "xray",
			categoryGroupRu: "Снимки и диагностика",
			groupIcon: "Camera",
			plainDescriptionRu:
				"Цифровой высокоточный снимок с минимальной лучевой нагрузкой для контроля корней и скрытых полостей",
		};
	}

	// 3. Кариес и пломбирование
	if (
		lower.includes("кариес") ||
		lower.includes("пломб") ||
		lower.includes("композит") ||
		lower.includes("filtek") ||
		lower.includes("estelite") ||
		lower.includes("реставрац") ||
		lower.includes("полост") ||
		lower.includes("a16.07.002") ||
		lower.includes("a16.07.003")
	) {
		return {
			friendlyName: "Лечение кариеса и световая пломба",
			categoryGroup: "caries",
			categoryGroupRu: "Лечение кариеса и пломбирование",
			groupIcon: "Activity",
			plainDescriptionRu:
				"Бережное очищение зуба от кариеса и установка высокоэстетичной светоотверждаемой нанокомпозитной пломбы точно в цвет эмали",
		};
	}

	// 4. Профессиональная гигиена и чистка
	if (
		lower.includes("гигиен") ||
		lower.includes("чистк") ||
		lower.includes("air-flow") ||
		lower.includes("air flow") ||
		lower.includes("ультразвук") ||
		lower.includes("зубной камень") ||
		lower.includes("полировк") ||
		lower.includes("фторирован") ||
		lower.includes("a16.07.051")
	) {
		return {
			friendlyName: "Комплексная профессиональная чистка (Air-Flow + УЗ)",
			categoryGroup: "hygiene",
			categoryGroupRu: "Профессиональная чистка и гигиена",
			groupIcon: "Sparkles",
			plainDescriptionRu:
				"Удаление твердого зубного камня ультразвуком, снятие пигментного налета Air-Flow и укрепление эмали минеральным комплексом",
		};
	}

	// 5. Имплантация
	if (
		lower.includes("имплант") ||
		lower.includes("straumann") ||
		lower.includes("nobel") ||
		lower.includes("osstem") ||
		lower.includes("a16.07.054")
	) {
		return {
			friendlyName: "Установка дентального имплантата",
			categoryGroup: "implant",
			categoryGroupRu: "Дентальная имплантация",
			groupIcon: "Shield",
			plainDescriptionRu:
				"Установка премиального биосовместимого титанового имплантата с пожизненной гарантией производителя",
		};
	}

	// 6. Ортопедия / Коронки
	if (
		lower.includes("коронк") ||
		lower.includes("циркони") ||
		lower.includes("e.max") ||
		lower.includes("emax") ||
		lower.includes("вкладк") ||
		lower.includes("протез") ||
		lower.includes("винир") ||
		lower.includes("a16.07.004") ||
		lower.includes("a16.07.006")
	) {
		return {
			friendlyName: "Ортопедическая коронка/реставрация",
			categoryGroup: "crowns",
			categoryGroupRu: "Коронки и реставрации",
			groupIcon: "Crown",
			plainDescriptionRu:
				"Изготовление и постоянная фиксация анатомической керамической коронки для полного восстановления жевательной функции",
		};
	}

	// 7. Хирургия и удаление
	if (
		lower.includes("удален") ||
		lower.includes("экстракц") ||
		lower.includes("хирург") ||
		lower.includes("синус-лифтинг") ||
		lower.includes("синуслифтинг") ||
		lower.includes("костная пластика") ||
		lower.includes("a16.07.001")
	) {
		return {
			friendlyName: "Бережное хирургическое вмешательство",
			categoryGroup: "surgery",
			categoryGroupRu: "Хирургическое лечение",
			groupIcon: "Activity",
			plainDescriptionRu:
				"Атравматичное удаление или костная пластика с сохранением объема костной ткани",
		};
	}

	// 8. Ортодонтия
	if (
		lower.includes("брекет") ||
		lower.includes("элайнер") ||
		lower.includes("дуг") ||
		lower.includes("активац")
	) {
		return {
			friendlyName: "Ортодонтическая коррекция прикуса",
			categoryGroup: "ortho",
			categoryGroupRu: "Исправление прикуса (ортодонтия)",
			groupIcon: "Ruler",
			plainDescriptionRu:
				"Плановая активация ортодонтической аппаратуры для создания ровной красивой улыбки",
		};
	}

	// 9. Прочее
	return {
		friendlyName: cleanToothNumberFromName(rawName),
		categoryGroup: "other",
		categoryGroupRu: "Стоматологические процедуры",
		groupIcon: "FileText",
		plainDescriptionRu: "Медицинская услуга по индивидуальному клиническому протоколу",
	};
}

/**
 * Разбивает массив услуг из счета на понятные пациенту смысловые блоки без латыни.
 */
export function groupServicesIntoFriendlyBlocks(
	items: readonly any[],
): FriendlyBillingBreakdown {
	const groupsMap = new Map<
		FriendlyBillingCategory,
		{
			categoryGroup: FriendlyBillingCategory;
			categoryGroupRu: string;
			groupIcon: string;
			items: FriendlyBillingItem[];
			subtotalRub: number;
		}
	>();

	let totalAmountRub = 0;

	for (let i = 0; i < items.length; i++) {
		const it = items[i];
		const name = it.titleRu || it.name || "Стоматологическая услуга";
		const toothNumber = it.toothFdi || it.toothNumber || null;
		const quantity = Number(it.quantity) || 1;
		const priceRub = Number(it.priceRub) || 0;
		const discountRub = Number(it.discountRub) || 0;
		const totalRub = Math.max(0, priceRub * quantity - discountRub);

		totalAmountRub += totalRub;

		const friendlyMeta = translateMedicalTermToFriendly(name, toothNumber);

		const friendlyItem: FriendlyBillingItem = {
			id: it.id || `srv-${i}`,
			originalName: name,
			friendlyName: friendlyMeta.friendlyName,
			categoryGroup: friendlyMeta.categoryGroup,
			categoryGroupRu: friendlyMeta.categoryGroupRu,
			groupIcon: friendlyMeta.groupIcon,
			plainDescriptionRu: friendlyMeta.plainDescriptionRu,
			toothNumber,
			quantity,
			priceRub,
			totalRub,
			isWarranty: !!it.isWarranty,
		};

		const existing = groupsMap.get(friendlyMeta.categoryGroup);
		if (existing) {
			existing.items.push(friendlyItem);
			existing.subtotalRub += totalRub;
		} else {
			groupsMap.set(friendlyMeta.categoryGroup, {
				categoryGroup: friendlyMeta.categoryGroup,
				categoryGroupRu: friendlyMeta.categoryGroupRu,
				groupIcon: friendlyMeta.groupIcon,
				items: [friendlyItem],
				subtotalRub: totalRub,
			});
		}
	}

	// Порядок групп для максимально понятного восприятия пациентом:
	// 1. Лечение кариеса -> 2. Обезболивание -> 3. Снимок -> 4. Чистка -> 5. Коронки -> 6. Имплантация -> 7. Хирургия -> 8. Прочее
	const categoryOrder: FriendlyBillingCategory[] = [
		"caries",
		"anesthesia",
		"xray",
		"hygiene",
		"crowns",
		"implant",
		"surgery",
		"ortho",
		"other",
	];

	const groups: FriendlyBillingGroup[] = [];

	for (const cat of categoryOrder) {
		const grp = groupsMap.get(cat);
		if (grp) {
			const pct = totalAmountRub > 0 ? Math.round((grp.subtotalRub / totalAmountRub) * 100) : 0;
			let summaryRu = "";
			if (cat === "caries") {
				summaryRu = "Основное лечение зуба: удаление пораженных тканей и постановка световой пломбы";
			} else if (cat === "anesthesia") {
				summaryRu = "Комфорт процедуры: современный анестетик для полного отсутствия боли";
			} else if (cat === "xray") {
				summaryRu = "Контроль качества: цифровой прицельный снимок до и после лечения";
			} else if (cat === "hygiene") {
				summaryRu = "Профилактика: бережная гигиена Air-Flow и полировка";
			} else if (cat === "implant") {
				summaryRu = "Хирургический этап: установка имплантата с пожизненной гарантией";
			} else if (cat === "crowns") {
				summaryRu = "Ортопедический этап: прочная коронка для надежной защиты";
			} else if (cat === "surgery") {
				summaryRu = "Хирургический этап: бережная операция с сохранением объема кости";
			} else if (cat === "ortho") {
				summaryRu = "Ортодонтический этап: плановая коррекция и перемещение зубов";
			} else {
				summaryRu = "Медицинские процедуры по плану лечения";
			}

			groups.push({
				categoryGroup: grp.categoryGroup,
				categoryGroupRu: grp.categoryGroupRu,
				groupIcon: grp.groupIcon,
				summaryRu,
				items: grp.items,
				subtotalRub: grp.subtotalRub,
				percentageOfTotal: pct,
			});
		}
	}

	const blockNames = groups.map((g) => g.categoryGroupRu).join(", ");
	const patientFriendlySummaryRu = `Счет включает понятные этапы: ${blockNames}. Все манипуляции выполнены в полном объеме.`;

	return {
		totalAmountRub,
		totalAmountRubFormatted: totalAmountRub.toLocaleString("ru-RU") + " ₽",
		groups,
		patientFriendlySummaryRu,
	};
}

/**
 * Генерирует понятное текстовое сообщение со счетом для отправки пациенту в WhatsApp.
 */
export function generateFriendlyBillingWhatsAppMessage(
	patientName: string,
	breakdown: FriendlyBillingBreakdown,
	clinicName: string = "Стоматологическая клиника ДЕНТЕ",
	clinicPhone: string = "+7 (495) 789-01-23",
): string {
	const lines: string[] = [
		`Здравствуйте, уважаемый(ая) ${patientName}!`,
		"",
		`Детализация вашего счета в клинике ${clinicName}:`,
		`Итого к оплате: *${breakdown.totalAmountRubFormatted}*`,
		"",
		"Понятная расшифровка процедур без сложной латыни:",
	];

	for (const grp of breakdown.groups) {
		lines.push("");
		lines.push(`• *${grp.categoryGroupRu}* — ${grp.subtotalRub.toLocaleString("ru-RU")} ₽ (${grp.percentageOfTotal}%)`);
		for (const it of grp.items) {
			const toothStr = it.toothNumber ? ` [Зуб №${it.toothNumber}]` : "";
			lines.push(`  • ${it.friendlyName}${toothStr}: ${it.totalRub.toLocaleString("ru-RU")} ₽`);
		}
	}

	lines.push("");
	lines.push(`По любым вопросам звоните: ${clinicPhone}`);
	lines.push("Спасибо за доверие к нашей клинике!");

	return lines.join("\n");
}
