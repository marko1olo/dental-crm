/**
 * patientCareInstructionsEngine.ts
 *
 * Электронные памятки пациенту после приема, генерация WhatsApp-рекомендаций,
 * QR-коды для сохранения в телефон и понятная детализация счетов (без сложной латыни).
 */

import { generateQrCodeSvg } from "./patientCabinetEngine.js";

// ============================================================================
// TYPES & CONTRACTS
// ============================================================================

export type CareCategory =
	| "cold"
	| "meds"
	| "food"
	| "immediate"
	| "medication"
	| "nutrition"
	| "hygiene"
	| "restrictions"
	| "warning";

export interface CareRecommendationItem {
	readonly id: string;
	readonly icon: string; // "🧊", "💊", "🚫", "🦷", "⚠️", etc.
	readonly title: string; // "Приложить холод на 15 минут"
	readonly description: string; // Подробное понятное пояснение
	readonly category: CareCategory;
	readonly isUrgent?: boolean;
	readonly badgeText?: string;
}

export interface PatientCareMemo {
	readonly id: string;
	readonly memoDateIso: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly toothFdi: string; // Например, "16" или "26, 27"
	readonly procedureName: string; // Например, "Лечение кариеса и эстетическая реставрация"
	readonly doctorName: string;
	readonly doctorSpecialty?: string;
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly clinicEmergencyPhone?: string;
	readonly recommendations: readonly CareRecommendationItem[];
	readonly prescribedMedsSummary?: string;
	readonly warningSigns: readonly string[];
	readonly nextVisitRecommendedText?: string;
	readonly qrCodeSvg: string;
	readonly whatsAppMessageText: string;
	readonly whatsAppText: string;
	readonly whatsAppDeepLink: string;
}

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
	readonly groupIcon: string; // "🦷", "💉", "📷", etc.
	readonly plainDescriptionRu: string;
	readonly toothNumber?: string | number | null | undefined;
	readonly quantity: number;
	readonly priceRub: number;
	readonly totalRub: number;
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
// DEFAULT RECOMMENDATION PRESETS
// ============================================================================

export const DEFAULT_CARIES_RECOMMENDATIONS: readonly CareRecommendationItem[] = [
	{
		id: "cold_compress",
		icon: "🧊",
		title: "Приложить холод на 15 минут",
		description:
			"При появлении чувствительности или дискомфорта приложите сухой холод через салфетку к щеке с внешней стороны на 10-15 минут.",
		category: "cold",
		badgeText: "1-е сутки",
	},
	{
		id: "painkiller",
		icon: "💊",
		title: "Обезболивающее: Нимесил 1 пак. при боли",
		description:
			"При выраженной ноющей боли примите Нимесил 100 мг (1 пакетик растворить в 100 мл воды) после еды. Не более 2 раз в сутки.",
		category: "meds",
		badgeText: "При боли",
	},
	{
		id: "no_hot_food",
		icon: "🚫",
		title: "Не есть горячее 2 часа",
		description:
			"Воздержитесь от приема горячей, жесткой, красящей пищи и напитков до полного окончания действия анестезии, чтобы избежать прикусывания щеки/губы.",
		category: "food",
		badgeText: "Первые 2 часа",
	},
	{
		id: "gentle_hygiene",
		icon: "🦷",
		title: "Бережная гигиена полости рта",
		description:
			"Чистите зубы мягкой щеткой утром и вечером, не травмируя краевую десну в зоне недавней реставрации. Используйте зубную нить без резких рывков.",
		category: "hygiene",
	},
	{
		id: "clinic_warning",
		icon: "⚠️",
		title: "Когда срочно связаться с клиникой",
		description:
			"Если пломба завышает прикус при смыкании, боль не снимается обезболивающим или появился отек — сразу звоните в клинику, мы бесплатно примем на коррекцию.",
		category: "warning",
		isUrgent: true,
		badgeText: "Важно",
	},
];

// ============================================================================
// WHATSAPP & MEMO GENERATION
// ============================================================================

export interface GenerateCareMemoInput {
	readonly memoId?: string | undefined;
	readonly memoDateIso?: string | undefined;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly toothFdi?: string | undefined;
	readonly procedureName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicEmergencyPhone?: string | undefined;
	readonly customRecommendations?: readonly CareRecommendationItem[] | undefined;
	readonly warningSigns?: readonly string[] | undefined;
	readonly nextVisitRecommendedText?: string | undefined;
}

/**
 * Генерирует персональную памятку для пациента с WhatsApp текстом и QR-кодом.
 */
export function generateCareMemo(input: GenerateCareMemoInput): PatientCareMemo {
	const memoId = input.memoId || `memo-${Date.now().toString(36)}`;
	const memoDateIso = input.memoDateIso || new Date().toISOString().slice(0, 10);
	const toothFdi = input.toothFdi || "16";
	const procedureName =
		input.procedureName || "Лечение кариеса и эстетическая реставрация";
	const clinicName = input.clinicName || "Стоматологическая клиника ДЕНТЕ";
	const clinicPhone = input.clinicPhone || "+7 (495) 789-01-23";
	const doctorName = input.doctorName || "Кузнецов П. С.";
	const patientPhone = input.patientPhone || "+7 (999) 123-45-67";

	const recommendations =
		input.customRecommendations && input.customRecommendations.length > 0
			? input.customRecommendations
			: DEFAULT_CARIES_RECOMMENDATIONS;

	const warningSigns = input.warningSigns || [
		"Острая пульсирующая боль, которая не снимается обезболивающим препаратом",
		"Появление отека щеки, десны или асимметрии лица",
		"Ощущение, что пломба завышает при смыкании челюстей",
		"Повышение температуры тела выше 37.5°C",
	];

	// Генерация текста для WhatsApp («Уважаемый(ая) {Имя}, рекомендации после лечения зуба {Зуб}: ...»)
	const whatsAppLines: string[] = [
		`Уважаемый(ая) ${input.patientName}, рекомендации после лечения зуба ${toothFdi}:`,
		"",
		`Врач: ${doctorName} • ${clinicName}`,
		`Процедура: ${procedureName}`,
		"",
	];

	for (const rec of recommendations) {
		whatsAppLines.push(`${rec.icon} *${rec.title}*`);
		whatsAppLines.push(`${rec.description}`);
		whatsAppLines.push("");
	}

	whatsAppLines.push(`⚠️ *Тревожные признаки:*`);
	for (const w of warningSigns) {
		whatsAppLines.push(`• ${w}`);
	}
	whatsAppLines.push("");
	whatsAppLines.push(`📞 Телефон клиники для связи: ${clinicPhone}`);
	if (input.clinicEmergencyPhone) {
		whatsAppLines.push(`🚨 Горячая линия дежурного врача: ${input.clinicEmergencyPhone}`);
	}
	whatsAppLines.push("");
	whatsAppLines.push(
		`📱 Электронная памятка в личном кабинете: https://dente.ru/memo/${memoId}`,
	);
	whatsAppLines.push("Желаем вам скорейшего комфортного восстановления! 🦷✨");

	const whatsAppMessageText = whatsAppLines.join("\n");
	const whatsAppDeepLink = buildWhatsAppLink(patientPhone, whatsAppMessageText);

	// Генерируем компактный QR-код со ссылкой на памятку и контактами клиники
	const cleanPhone = patientPhone.replace(/\D/g, "");
	const qrPayload = `https://dente.ru/memo/${memoId}?patient=${encodeURIComponent(input.patientName)}&tooth=${toothFdi}&phone=${cleanPhone}`;
	const qrCodeSvg = generateQrCodeSvg(qrPayload, { size: 200 });

	return {
		id: memoId,
		memoDateIso,
		patientName: input.patientName,
		patientPhone,
		toothFdi,
		procedureName,
		doctorName,
		doctorSpecialty: input.doctorSpecialty || "Врач-стоматолог терапевт",
		clinicName,
		clinicPhone,
		clinicEmergencyPhone: input.clinicEmergencyPhone || "+7 (999) 123-45-67",
		recommendations,
		warningSigns,
		nextVisitRecommendedText:
			input.nextVisitRecommendedText ||
			"Контрольный осмотр и гигиена через 6 месяцев по графику диспансеризации",
		qrCodeSvg,
		whatsAppMessageText,
		whatsAppText: whatsAppMessageText,
		whatsAppDeepLink,
	};
}

/**
 * Создает прямую ссылку для отправки сообщения в WhatsApp с нормализацией номера телефона.
 */
export function buildWhatsAppLink(phone: string, text: string): string {
	let clean = phone.replace(/\D/g, "");
	if (clean.length === 11 && clean.startsWith("8")) {
		clean = "7" + clean.slice(1);
	} else if (clean.length === 10) {
		clean = "7" + clean;
	}
	return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

// ============================================================================
// FRIENDLY BILLING BREAKDOWN (АНТИ-ЛАТЫНЬ)
// ============================================================================

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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Обезболивание (анестезия)${toothStr}`,
			categoryGroup: "anesthesia",
			categoryGroupRu: "Обезболивание (анестезия)",
			groupIcon: "💉",
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: lower.includes("кт") || lower.includes("томограф")
				? "3D-компьютерная томография (КТ)"
				: `Снимок зуба (радиовизиография)${toothStr}`,
			categoryGroup: "xray",
			categoryGroupRu: "Снимки и диагностика",
			groupIcon: "📷",
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
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Лечение кариеса и световая пломба${toothStr}`,
			categoryGroup: "caries",
			categoryGroupRu: "Лечение кариеса и пломбирование",
			groupIcon: "🦷",
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
			groupIcon: "🪥",
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
		const toothStr = toothNumber ? ` (позиция ${toothNumber})` : "";
		return {
			friendlyName: `Установка дентального имплантата${toothStr}`,
			categoryGroup: "implant",
			categoryGroupRu: "Дентальная имплантация",
			groupIcon: "🔩",
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
		lower.includes("a16.07.004")
	) {
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Ортопедическая коронка/реставрация${toothStr}`,
			categoryGroup: "crowns",
			categoryGroupRu: "Коронки и реставрации",
			groupIcon: "👑",
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
		lower.includes("костная пластика") ||
		lower.includes("a16.07.001")
	) {
		const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
		return {
			friendlyName: `Бережное хирургическое вмешательство${toothStr}`,
			categoryGroup: "surgery",
			categoryGroupRu: "Хирургическое лечение",
			groupIcon: "🩹",
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
			groupIcon: "📐",
			plainDescriptionRu:
				"Плановая активация ортодонтической аппаратуры для создания ровной красивой улыбки",
		};
	}

	// 9. Прочее
	const toothStr = toothNumber ? ` (зуб №${toothNumber})` : "";
	return {
		friendlyName: `${rawName}${toothStr}`,
		categoryGroup: "other",
		categoryGroupRu: "Стоматологические процедуры",
		groupIcon: "✨",
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
				summaryRu = "Комфорт процедуры: импортный анестетик для полного отсутствия боли";
			} else if (cat === "xray") {
				summaryRu = "Контроль качества: цифровой прицельный снимок до и после лечения";
			} else if (cat === "hygiene") {
				summaryRu = "Профилактика: бережная гигиена Air-Flow и полировка";
			} else if (cat === "implant") {
				summaryRu = "Хирургический этап: установка имплантата с пожизненной гарантией";
			} else if (cat === "crowns") {
				summaryRu = "Ортопедический этап: прочная коронка для надежной защиты";
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
		`Здравствуйте, уважаемый(ая) ${patientName}! 👋`,
		"",
		`Детализация вашего счета в клинике ${clinicName}:`,
		`Итого к оплате: *${breakdown.totalAmountRubFormatted}*`,
		"",
		"Понятная расшифровка процедур без сложной латыни:",
	];

	for (const grp of breakdown.groups) {
		lines.push("");
		lines.push(`${grp.groupIcon} *${grp.categoryGroupRu}* — ${grp.subtotalRub.toLocaleString("ru-RU")} ₽ (${grp.percentageOfTotal}%)`);
		for (const it of grp.items) {
			const toothStr = it.toothNumber ? ` [Зуб №${it.toothNumber}]` : "";
			lines.push(`  • ${it.friendlyName}${toothStr}: ${it.totalRub.toLocaleString("ru-RU")} ₽`);
		}
	}

	lines.push("");
	lines.push(`📞 По любым вопросам звоните: ${clinicPhone}`);
	lines.push("Спасибо за доверие к нашей клинике! ✨");

	return lines.join("\n");
}
