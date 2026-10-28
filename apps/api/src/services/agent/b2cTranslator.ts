/**
 * b2cTranslator.ts — B2C Medical Treatment Translator for Dentalpin Agentic Core.
 *
 * Translates clinical dental terminology into transparent, encouraging, patient-friendly
 * Russian for the PWA patient mobile roadmap.
 *
 * Compliant with Mandate 8b / 8zi (Decomposed, ~460 lines).
 */

import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../clinical/Icd10ClinicalValidator.js";
import {
	B2C_NOMENCLATURE_MAP,
	type B2cNomenclatureEntry,
} from "./b2c/b2cNomenclatureDictionary.js";

export { B2C_NOMENCLATURE_MAP, type B2cNomenclatureEntry };

// ─── INTERFACES ─────────────────────────────────────────────────────────────

export interface B2cPlanItemInput {
	readonly code?: string | null | undefined;
	readonly title: string;
	readonly category?: string | null | undefined;
	readonly toothCode?: number | string | null | undefined;
	readonly quantity?: number | null | undefined;
}

export interface PatientTreatmentStep {
	readonly stepName: string;
	readonly patientDescription: string;
	readonly clinicalTerm?: string | undefined;
	readonly nomenclatureCode?: string | undefined;
	readonly toothLocalization?: string | undefined;
	readonly category?: string | undefined;
	readonly estimatedVisits?: number | undefined;
	readonly tipsForPatient?: string | undefined;
}

// ─── ANATOMICAL TOOTH LOCALIZATION HELPER ──────────────────────────────────

export function formatFdiToothLocalization(toothCode: number | string | null | undefined): string {
	if (toothCode === undefined || toothCode === null) {
		return "Полость рта / общий этап";
	}

	const num = typeof toothCode === "number" ? toothCode : Number.parseInt(String(toothCode).trim(), 10);
	if (Number.isNaN(num)) {
		return String(toothCode);
	}

	if (!VALID_FDI_PERMANENT_TEETH.has(num) && !VALID_FDI_PRIMARY_TEETH.has(num)) {
		return `Зуб ${num}`;
	}

	// Permanent teeth FDI quadrant mapping
	const permanentMap: Record<number, string> = {
		// Quadrant 1 (Upper Right)
		18: "Зуб 18 (верхний правый третий моляр / зуб мудрости)",
		17: "Зуб 17 (верхний правый второй моляр)",
		16: "Зуб 16 (верхний правый первый моляр)",
		15: "Зуб 15 (верхний правый второй премоляр)",
		14: "Зуб 14 (верхний правый первый премоляр)",
		13: "Зуб 13 (верхний правый клык — зона улыбки)",
		12: "Зуб 12 (верхний правый боковой резец — зона улыбки)",
		11: "Зуб 11 (верхний правый центральный резец — зона улыбки)",

		// Quadrant 2 (Upper Left)
		21: "Зуб 21 (верхний левый центральный резец — зона улыбки)",
		22: "Зуб 22 (верхний левый боковой резец — зона улыбки)",
		23: "Зуб 23 (верхний левый клык — зона улыбки)",
		24: "Зуб 24 (верхний левый первый премоляр)",
		25: "Зуб 25 (верхний левый второй премоляр)",
		26: "Зуб 26 (верхний левый первый моляр)",
		27: "Зуб 27 (верхний левый второй моляр)",
		28: "Зуб 28 (верхний левый третий моляр / зуб мудрости)",

		// Quadrant 3 (Lower Left)
		31: "Зуб 31 (нижний левый центральный резец)",
		32: "Зуб 32 (нижний левый боковой резец)",
		33: "Зуб 33 (нижний левый клык)",
		34: "Зуб 34 (нижний левый первый премоляр)",
		35: "Зуб 35 (нижний левый второй премоляр)",
		36: "Зуб 36 (нижний левый первый моляр)",
		37: "Зуб 37 (нижний левый второй моляр)",
		38: "Зуб 38 (нижний левый третий моляр / зуб мудрости)",

		// Quadrant 4 (Lower Right)
		41: "Зуб 41 (нижний правый центральный резец)",
		42: "Зуб 42 (нижний правый боковой резец)",
		43: "Зуб 43 (нижний правый клык)",
		44: "Зуб 44 (нижний правый первый премоляр)",
		45: "Зуб 45 (нижний правый второй премоляр)",
		46: "Зуб 46 (нижний правый первый моляр)",
		47: "Зуб 47 (нижний правый второй моляр)",
		48: "Зуб 48 (нижний правый третий моляр / зуб мудрости)",
	};

	if (permanentMap[num]) {
		return permanentMap[num];
	}

	if (VALID_FDI_PRIMARY_TEETH.has(num)) {
		return `Временный (молочный) зуб ${num}`;
	}

	return `Зуб ${num}`;
}

// ─── HEURISTIC CLINICAL TITLE TRANSLATOR ────────────────────────────────────

export function translateClinicalTermToB2c(title: string, category?: string | null): {
	stepName: string;
	patientDescription: string;
	tipsForPatient: string;
} {
	const t = title.toLowerCase();

	// 1. Consultations, checkups, and diagnostic examinations
	if (
		t.includes("консульт") ||
		t.includes("осмотр") ||
		t.includes("диагностик") ||
		t.includes("рентген") ||
		t.includes("клкт") ||
		t.includes("прицельн") ||
		t.includes("снимок") ||
		t.includes("визиограф") ||
		t.includes("фотопротокол")
	) {
		return {
			stepName: "Консультация и клиническая диагностика",
			patientDescription:
				"Детальная оценка состояния зубов и десен, анализ снимков и согласование комфортного пошагового плана лечения.",
			tipsForPatient: "Обсудите с врачом все пожелания по срокам, материалам и бюджету лечения.",
		};
	}

	// 2. Removal of old crowns, prosthetics, and suture removal (MUST be evaluated before crown installation keywords)
	const isRemovalVerb =
		t.includes("снятие") ||
		t.includes("удален") ||
		t.includes("демонтаж") ||
		t.includes("распил") ||
		t.includes("извлечен");

	if (isRemovalVerb && (t.includes("шв") || t.includes("шов"))) {
		return {
			stepName: "Снятие послеоперационных швов",
			patientDescription:
				"Безболезненное и аккуратное снятие швов после заживления десны с последующей антисептической обработкой тканей.",
			tipsForPatient: "Процедура занимает всего несколько минут и приносит мгновенное облегчение.",
		};
	}

	if (
		isRemovalVerb &&
		(t.includes("коронк") ||
			t.includes("протез") ||
			t.includes("мостовидн") ||
			t.includes("конструкц") ||
			t.includes("штифт") ||
			t.includes("вкладк"))
	) {
		return {
			stepName: "Снятие старой ортопедической конструкции",
			patientDescription:
				"Деликатное снятие изношенной или негерметичной коронки/протеза с зуба без повреждения подлежащих тканей опорного зуба.",
			tipsForPatient: "После снятия конструкции врач оценит состояние культи зуба для подготовки к новой реставрации.",
		};
	}

	// 3. Extractions and tooth removal (MUST be evaluated before implant/crown keywords)
	if (
		t.includes("удален") ||
		t.includes("экстракц") ||
		t.includes("резекц") ||
		t.includes("гемисекц") ||
		t.includes("ретинирован") ||
		t.includes("дистопирован")
	) {
		return {
			stepName: "Бережное удаление зуба",
			patientDescription:
				"Безболезненное удаление зуба с применением современных анестетиков и бережным сохранением костных стенок лунки.",
			tipsForPatient: "Не полощите рот в первые 24 часа, чтобы не вымыть защитный кровяной сгусток из лунки.",
		};
	}

	// 4. Anesthesia
	if (
		t.includes("анестези") ||
		t.includes("инфильтрац") ||
		t.includes("проводников") ||
		t.includes("обезболиван")
	) {
		return {
			stepName: "Местная анестезия и обезболивание",
			patientDescription:
				"Мягкое и глубокое обезболивание рабочей зоны премиальным анестетиком для 100% комфорта и отсутствия любых болезненных ощущений.",
			tipsForPatient: "Онемение проходит самостоятельно через 1.5–3 часа. Избегайте прикусывания губ и щек во время действия анестетика.",
		};
	}

	// 5. Sinus lift, bone grafting, and membranes (A16.07.055)
	if (
		t.includes("синус") ||
		t.includes("костн") ||
		t.includes("остеопластик") ||
		t.includes("мембран") ||
		t.includes("аугментац")
	) {
		return {
			stepName: "Наращивание костной ткани (синус-лифтинг / остеопластика)",
			patientDescription:
				"Хирургическая процедура увеличения объема и плотности челюстной кости для создания надежного фундамента под установку дентального имплантата.",
			tipsForPatient: "Избегайте физических нагрузок, перелетов на самолете и перегрева в течение первых 10–14 дней.",
		};
	}

	// 6. Implant installations
	if (
		t.includes("имплант") ||
		t.includes("имплантац") ||
		t.includes("абатмент") ||
		t.includes("формировател")
	) {
		return {
			stepName: "Установка дентального имплантата",
			patientDescription:
				"Хирургическая установка надежного титанового имплантата для восстановления отсутствующего зуба. Процедура проводится под современной анестезией и обеспечивает полноценное приживление.",
			tipsForPatient: "Следуйте рекомендациям врача по приему медикаментов и гигиене полости рта в первые дни.",
		};
	}

	// 7. Crowns, bridges, and prosthetics
	if (
		t.includes("коронк") ||
		t.includes("протез") ||
		t.includes("мостовидн") ||
		t.includes("бюгель") ||
		t.includes("культев")
	) {
		return {
			stepName: "Установка ортопедической коронки / протеза",
			patientDescription:
				"Фиксация анатомической керамической или циркониевой коронки для восстановления формы, прочности и естественной эстетики зуба.",
			tipsForPatient: "На время ожидания постоянной конструкции вам будет установлена временная защитная коронка.",
		};
	}

	// 8. Veneers and inlays
	if (t.includes("винир") || t.includes("люминир") || t.includes("вкладк")) {
		return {
			stepName: "Установка эстетического винира / керамической вкладки",
			patientDescription:
				"Установка тонкой керамической накладки на переднюю поверхность зуба для создания гармоничной формы и красивого цвета улыбки.",
			tipsForPatient: "Керамический винир не меняет цвет со временем и обеспечивает естественный блеск.",
		};
	}

	// 9. Endodontics (Root canals)
	if (
		t.includes("пульпит") ||
		t.includes("периодонтит") ||
		t.includes("канал") ||
		t.includes("эндодонт") ||
		t.includes("распломбиров")
	) {
		return {
			stepName: "Лечение корневых каналов зуба (эндодонтия)",
			patientDescription:
				"Качественная очистка, антисептическая обработка и трехмерная пломбировка корневых каналов зуба для устранения очага воспаления.",
			tipsForPatient: "В первые 2–3 дня возможна умеренная чувствительность при накусывании, которая постепенно проходит.",
		};
	}

	// 10. Caries and composite restorations
	if (
		t.includes("кариес") ||
		t.includes("пломб") ||
		t.includes("реставрац") ||
		t.includes("нанокомпозит")
	) {
		return {
			stepName: "Лечение кариеса и реставрация зуба",
			patientDescription:
				"Бережное удаление пораженных тканей зуба и восстановление его естественной анатомии эстетичным светоотверждаемым пломбировочным материалом.",
			tipsForPatient: "Материал полностью полимеризован, однако рекомендуется избегать красящих продуктов в первые сутки.",
		};
	}

	// 11. Periodontics and gum therapy
	if (
		t.includes("пародонт") ||
		t.includes("десн") ||
		t.includes("кюретаж") ||
		t.includes("гингивит") ||
		t.includes("шинирован")
	) {
		return {
			stepName: "Комплексное лечение десен и пародонта",
			patientDescription:
				"Глубокая бережная очистка десневых карманов и медикаментозная обработка тканей десны для устранения воспаления и кровоточивости.",
			tipsForPatient: "Используйте мягкую щетку и назначенный антисептический ополаскиватель.",
		};
	}

	// 12. Hygiene and professional cleaning
	if (
		t.includes("гигиен") ||
		t.includes("чистк") ||
		t.includes("air flow") ||
		t.includes("airflow") ||
		t.includes("ультразвук")
	) {
		return {
			stepName: "Комплексная профессиональная гигиена",
			patientDescription:
				"Удаление твердого зубного камня ультразвуком, устранение пигментированного налета водно-воздушной струей AirFlow и реминерализация эмали.",
			tipsForPatient: "Замените зубную щетку на новую и соблюдайте регулярную гигиену каждые 6 месяцев.",
		};
	}

	// 13. Whitening
	if (
		t.includes("отбеливан") ||
		t.includes("zoom") ||
		t.includes("flash") ||
		t.includes("осветлен")
	) {
		return {
			stepName: "Профессиональное отбеливание зубов",
			patientDescription:
				"Клиническое осветление эмали зубов на несколько тонов с применением безопасного геля и активирующего холодного света.",
			tipsForPatient: "Соблюдайте «белую диету» в течение 48 часов после процедуры.",
		};
	}

	// 14. Orthodontics
	if (
		t.includes("брекет") ||
		t.includes("элайнер") ||
		t.includes("прикус") ||
		t.includes("ортодонт") ||
		t.includes("капп")
	) {
		return {
			stepName: "Ортодонтическое лечение и исправление прикуса",
			patientDescription:
				"Плавное и физиологичное перемещение зубов в правильное положение с помощью современной брекет-системы или прозрачных кап.",
			tipsForPatient: "Посещайте плановые активации аппаратуры в соответствии с графиком врача-ортодонта.",
		};
	}

	// Fallback description based on category or raw title
	const cleanTitle = title.trim();
	const cat = category || "Стоматологическая помощь";
	return {
		stepName: cleanTitle,
		patientDescription: `Медицинская процедура в категории «${cat}». Выполняется опытным специалистом клиники DENTE в комфортных условиях с соблюдением международных стандартов безопасности.`,
		tipsForPatient: "Следуйте персональным указаниям вашего лечащего врача.",
	};
}

// ─── MAIN B2C TRANSLATION ENGINE ───────────────────────────────────────────

/**
 * Translates a treatment plan or list of clinical procedures into clear, accessible Russian for patients.
 */
export async function translateTreatmentPlanToPatientLanguage(
	items: Array<{
		code?: string | null | undefined;
		title: string;
		category?: string | null | undefined;
		toothCode?: number | string | null | undefined;
		quantity?: number | null | undefined;
	}>,
): Promise<Array<{ stepName: string; patientDescription: string }>> {
	const result: Array<{ stepName: string; patientDescription: string }> = [];

	for (const item of items) {
		const rawCode = item.code?.trim();
		const rawTitle = item.title?.trim() || "Медицинская услуга";
		const toothLoc = formatFdiToothLocalization(item.toothCode);

		let stepName: string;
		let patientDescription: string;

		// 1. Check exact 804n code map
		if (rawCode && B2C_NOMENCLATURE_MAP[rawCode]) {
			const entry = B2C_NOMENCLATURE_MAP[rawCode];
			stepName = item.toothCode !== undefined && item.toothCode !== null
				? `${entry.defaultStepName} — ${toothLoc}`
				: entry.defaultStepName;
			patientDescription = entry.patientDescription;
		} else {
			// 2. Fallback to heuristic clinical terminology translator
			const heur = translateClinicalTermToB2c(rawTitle, item.category);
			stepName = item.toothCode !== undefined && item.toothCode !== null
				? `${heur.stepName} — ${toothLoc}`
				: heur.stepName;
			patientDescription = heur.patientDescription;
		}

		result.push({
			stepName,
			patientDescription,
		});
	}

	return result;
}

/**
 * Translates an item into a rich step structure including tips, category, and visit estimates.
 */
export function translateTreatmentItemToRichStep(item: B2cPlanItemInput): PatientTreatmentStep {
	const rawCode = item.code?.trim();
	const rawTitle = item.title?.trim() || "Медицинская услуга";
	const toothLoc = formatFdiToothLocalization(item.toothCode);

	if (rawCode && B2C_NOMENCLATURE_MAP[rawCode]) {
		const entry = B2C_NOMENCLATURE_MAP[rawCode];
		const stepName = item.toothCode !== undefined && item.toothCode !== null
			? `${entry.defaultStepName} — ${toothLoc}`
			: entry.defaultStepName;

		return {
			stepName,
			patientDescription: entry.patientDescription,
			clinicalTerm: rawTitle,
			nomenclatureCode: entry.code,
			toothLocalization: toothLoc,
			category: entry.category,
			estimatedVisits: entry.estimatedVisits,
			tipsForPatient: entry.tipsForPatient,
		};
	}

	const heur = translateClinicalTermToB2c(rawTitle, item.category);
	const stepName = item.toothCode !== undefined && item.toothCode !== null
		? `${heur.stepName} — ${toothLoc}`
		: heur.stepName;

	return {
		stepName,
		patientDescription: heur.patientDescription,
		clinicalTerm: rawTitle,
		nomenclatureCode: rawCode ?? undefined,
		toothLocalization: toothLoc,
		category: item.category ?? undefined,
		estimatedVisits: 1,
		tipsForPatient: heur.tipsForPatient,
	};
}
