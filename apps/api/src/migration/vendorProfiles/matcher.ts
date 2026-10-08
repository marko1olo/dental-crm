import type { MigrationEntityKind } from "@dental/shared";
import type {
	VendorFieldRule,
	VendorProfile,
	VendorProfileMatch,
} from "./types.js";
import { canonicalColumnName } from "./canonicalColumnName.js";
import { VENDOR_PROFILES } from "./profiles/allProfiles.js";
import { GENERIC_RU_RULES } from "./profiles/genericRu.js";

function ruleColumnSet(rules: VendorFieldRule[]): Set<string> {
	const set = new Set<string>();
	for (const rule of rules) {
		for (const column of rule.columns) set.add(canonicalColumnName(column));
	}
	return set;
}

/**
 * Опознаёт систему по колонкам источника.
 *
 * Считается доля колонок источника, которые профиль знает. Имя таблицы —
 * уточняющий признак, дающий надбавку, а не условие: оператор чаще всего
 * выгружает один файл со своим именем.
 */
export function matchVendorProfile(
	columns: string[],
	tableName: string,
	requestedCode?: string,
): VendorProfileMatch {
	const canonicalColumns = columns.map(canonicalColumnName).filter(Boolean);
	const canonicalTable = canonicalColumnName(tableName);

	if (requestedCode) {
		const requested = VENDOR_PROFILES.find(
			(profile) => profile.code === requestedCode,
		);
		if (requested) {
			const best = bestEntityForProfile(
				requested,
				canonicalColumns,
				canonicalTable,
			);
			return {
				profile: requested,
				coverage: best.coverage,
				entityKind: best.entityKind,
				rationale: `Профиль «${requested.title}» выбран оператором вручную; узнано ${Math.round(best.coverage * 100)}% колонок.`,
			};
		}
	}

	let best: VendorProfileMatch = {
		profile: null,
		coverage: 0,
		entityKind: "unknown",
		rationale: "Ни один профиль известной системы не узнал колонки источника.",
	};

	for (const profile of VENDOR_PROFILES) {
		const candidate = bestEntityForProfile(
			profile,
			canonicalColumns,
			canonicalTable,
		);
		if (candidate.coverage > best.coverage) {
			best = {
				profile,
				coverage: candidate.coverage,
				entityKind: candidate.entityKind,
				rationale: `Профиль «${profile.title}» узнал ${Math.round(candidate.coverage * 100)}% колонок${
					candidate.tableHintMatched ? ` и имя таблицы «${tableName}»` : ""
				}.`,
			};
		}
	}

	/**
	 * Порог 0.45 подобран по смыслу: профиль полезен, если узнаёт хотя бы
	 * половину колонок. Ниже этого его подсказки скорее мешают — обобщённые
	 * правила и языковая модель справятся лучше, а ложно опознанная система
	 * приведёт к неверному коду в ссылках сущностей.
	 */
	if (best.coverage < 0.45) {
		return {
			profile: null,
			coverage: best.coverage,
			entityKind: best.entityKind,
			rationale:
				best.coverage > 0
					? `Ближайший профиль узнал лишь ${Math.round(best.coverage * 100)}% колонок — этого мало для уверенного опознания, применяются обобщённые правила.`
					: best.rationale,
		};
	}

	return best;
}

function bestEntityForProfile(
	profile: VendorProfile,
	canonicalColumns: string[],
	canonicalTable: string,
): {
	entityKind: MigrationEntityKind;
	coverage: number;
	tableHintMatched: boolean;
} {
	let best: {
		entityKind: MigrationEntityKind;
		coverage: number;
		tableHintMatched: boolean;
	} = {
		entityKind: "unknown",
		coverage: 0,
		tableHintMatched: false,
	};

	for (const [entityKind, rules] of Object.entries(profile.rules) as [
		MigrationEntityKind,
		VendorFieldRule[],
	][]) {
		if (!rules?.length) continue;
		const known = ruleColumnSet(rules);
		const matched = canonicalColumns.filter((column) =>
			known.has(column),
		).length;
		const coverage =
			canonicalColumns.length === 0 ? 0 : matched / canonicalColumns.length;

		const hints = (profile.tableHints[entityKind] ?? []).map(
			canonicalColumnName,
		);
		const tableHintMatched = hints.some((hint) =>
			canonicalTable.includes(hint),
		);
		// Надбавка за имя таблицы, но она не может сама вытянуть профиль через порог.
		const adjusted = Math.min(1, coverage + (tableHintMatched ? 0.15 : 0));

		if (adjusted > best.coverage)
			best = { entityKind, coverage: adjusted, tableHintMatched };
	}

	return best;
}

/**
 * Правила для сущности: правила профиля идут первыми и имеют приоритет, затем
 * обобщённые. Так «HMPHONE» из Open Dental победит обобщённое «phone», а колонка
 * «Комментарий», которой в профиле нет, всё равно найдёт своё поле.
 */
export function rulesForEntity(
	entityKind: MigrationEntityKind,
	profile: VendorProfile | null,
): VendorFieldRule[] {
	const fromProfile = profile?.rules[entityKind] ?? [];
	const generic = GENERIC_RU_RULES[entityKind] ?? [];
	return [...fromProfile, ...generic];
}

/**
 * Определяет сущность по колонкам, когда профиль не опознан и оператор не указал
 * её явно. Решение принимается по «ключевым» колонкам, а не по любым: колонка
 * «Дата» есть у всех сущностей и ничего не говорит, а «Жалобы» — только у приёма.
 */
export function detectEntityKind(
	columns: string[],
	tableName: string,
): { entityKind: MigrationEntityKind; rationale: string } {
	const canonical = new Set(columns.map(canonicalColumnName));
	const table = canonicalColumnName(tableName);

	const signals: Array<{
		entityKind: MigrationEntityKind;
		columns: string[];
		tables: string[];
		title: string;
	}> = [
		{
			entityKind: "visit",
			columns: [
				"жалобы",
				"жалоба",
				"анамнез",
				"диагноз",
				"объективно",
				"планлечения",
				"мкб",
				"мкб10",
				"icd",
				"icd10",
				"коддиагноза",
				"complaint",
				"anamnesis",
				"diagnosis",
			],
			tables: ["priem", "приемы", "visit", "visits", "лечение", "осмотр", "дневник"],
			title: "приёмы",
		},
		{
			entityKind: "payment",
			columns: [
				"сумма",
				"суммаоплаты",
				"оплачено",
				"способоплаты",
				"видоплаты",
				"номерчека",
				"amount",
				"payamt",
				"paymentmethod",
			],
			tables: [
				"oplata",
				"оплаты",
				"платежи",
				"payment",
				"payments",
				"kassa",
				"касса",
				"чеки",
			],
			title: "платежи",
		},
		{
			entityKind: "appointment",
			columns: [
				"времяначала",
				"началоприема",
				"окончание",
				"длительность",
				"кабинет",
				"кресло",
				"startsat",
				"aptdatetime",
				"duration",
			],
			tables: [
				"raspisanie",
				"расписание",
				"appointment",
				"appointments",
				"приемы",
				"запись",
				"записи",
			],
			title: "записи в расписании",
		},
		{
			entityKind: "service",
			columns: [
				"цена",
				"стоимость",
				"прайс",
				"кодуслуги",
				"услуга",
				"код804н",
				"кодпономенклатуре",
				"номенклатура",
				"кодминздрава",
				"price",
				"fee",
				"servicecode",
			],
			tables: [
				"услуги",
				"прайс",
				"прайслист",
				"прейскурант",
				"номенклатура",
				"service",
				"services",
				"pricelist",
			],
			title: "услуги",
		},
		{
			entityKind: "doctor",
			columns: [
				"специальность",
				"специализация",
				"должность",
				"specialty",
				"position",
			],
			tables: [
				"врачи",
				"сотрудники",
				"doctor",
				"doctors",
				"provider",
				"providers",
				"staff",
			],
			title: "врачи",
		},
		{
			entityKind: "tooth_state",
			columns: ["зуб", "номерзуба", "tooth", "toothnum", "состояниезуба"],
			tables: ["зубы", "формула", "tooth", "teeth", "odontogram"],
			title: "состояния зубов",
		},
		{
			entityKind: "patient",
			columns: [
				"фио",
				"датарождения",
				"пациент",
				"номеркарты",
				"birthdate",
				"lastname",
				"fullname",
				"patient",
			],
			tables: [
				"пациенты",
				"patient",
				"patients",
				"клиенты",
				"klient",
				"kart",
				"карты",
			],
			title: "пациенты",
		},
	];

	let best: {
		entityKind: MigrationEntityKind;
		score: number;
		title: string;
		matched: string[];
	} = {
		entityKind: "unknown",
		score: 0,
		title: "",
		matched: [],
	};

	for (const signal of signals) {
		const matched = signal.columns.filter((column) =>
			canonical.has(canonicalColumnName(column)),
		);
		const tableMatched = signal.tables.some((hint) =>
			table.includes(canonicalColumnName(hint)),
		);
		/**
		 * Имя таблицы весит как две ключевые колонки: файл «оплаты.xlsx» — сильный
		 * довод, но одной только колонки «Сумма» мало, она бывает и у услуг.
		 */
		const score = matched.length + (tableMatched ? 2 : 0);
		if (score > best.score)
			best = {
				entityKind: signal.entityKind,
				score,
				title: signal.title,
				matched,
			};
	}

	if (best.score === 0) {
		return {
			entityKind: "unknown",
			rationale:
				"По колонкам не удалось определить, что за сущность в источнике. Укажите её вручную.",
		};
	}

	return {
		entityKind: best.entityKind,
		rationale: `Определено как «${best.title}»${
			best.matched.length > 0
				? ` по колонкам: ${best.matched.slice(0, 4).join(", ")}`
				: " по имени таблицы"
		}.`,
	};
}
