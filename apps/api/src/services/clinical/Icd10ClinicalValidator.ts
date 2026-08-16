/**
 * Icd10ClinicalValidator.ts — Сервис клинической валидации кодов МКБ-10 (ICD-10)
 * и привязки к номерам зубов FDI перед подписанием карты 043/у.
 *
 * ГАРАНТИИ И КЛИНИЧЕСКИЕ ИНВАРИАНТЫ:
 * 1. Проверка принадлежности кода МКБ-10 стоматологическому разделу (K00–K14).
 * 2. Нормализация кодов (устранение опечаток с русской «К»/«к», пробелов, точек и регистра).
 * 3. Обязательность привязки к конкретному зубу по двухцифровой формуле FDI (ISO 3950)
 *    для зубоспецифичных диагнозов:
 *    - K02.* (Кариес зубов)
 *    - K04.* (Болезни пульпы и периапикальных тканей: пульпит, периодонтит, периапикальный абсцесс, корневая киста)
 *    - K05.* (Гингивит и болезни пародонта: острый/хронический гингивит, пародонтит, пародонтоз)
 * 4. Строгая валидация номеров зубов FDI:
 *    - Постоянный прикус: 11–18, 21–28, 31–38, 41–48
 *    - Временный (молочный) прикус: 51–55, 61–65, 71–75, 81–85
 * 5. Формирование детализированных клинических сообщений об ошибках на русском языке.
 */

export interface DentalIcd10Category {
	readonly code: string;
	readonly titleRu: string;
	readonly requiresTooth: boolean;
	readonly description?: string;
}

export type Icd10ValidationErrorCode =
	| "Icd10Required"
	| "Icd10Invalid"
	| "ToothRequired"
	| "ToothInvalid";

export interface Icd10ValidationSuccess {
	readonly isValid: true;
	readonly normalizedCode: string;
	readonly baseRubric: string;
	readonly categoryTitle: string;
	readonly isToothSpecific: boolean;
	readonly parsedTeeth: number[];
}

export interface Icd10ValidationFailure {
	readonly isValid: false;
	readonly errorCode: Icd10ValidationErrorCode;
	readonly errorMessage: string;
	readonly normalizedCode?: string;
	readonly rawCode?: string;
	readonly rawTooth?: string;
}

export type Icd10ValidationResult =
	| Icd10ValidationSuccess
	| Icd10ValidationFailure;

/**
 * Валидные номера зубов по двухцифровой системе FDI (ISO 3950).
 * Постоянные зубы: квадранты 1-4, зубы 1-8.
 * Молочные зубы: квадранты 5-8, зубы 1-5.
 */
export const VALID_FDI_PERMANENT_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export const VALID_FDI_PRIMARY_TEETH = new Set<number>([
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
]);

export const ALL_VALID_FDI_TEETH = new Set<number>([
	...VALID_FDI_PERMANENT_TEETH,
	...VALID_FDI_PRIMARY_TEETH,
]);

/**
 * Базовые рубрики стоматологического раздела МКБ-10 (K00–K14).
 */
export const DENTAL_ICD10_RUBRICS: Readonly<Record<string, DentalIcd10Category>> = {
	K00: {
		code: "K00",
		titleRu: "Нарушения развития и прорезывания зубов (адентия, гиподонтия, сверхкомплектные зубы)",
		requiresTooth: false,
	},
	K01: {
		code: "K01",
		titleRu: "Вкрапленные и ретенированные зубы",
		requiresTooth: false,
	},
	K02: {
		code: "K02",
		titleRu: "Кариес зубов (эмали, дентина, цемента, приостановившийся)",
		requiresTooth: true,
		description: "Кариозное поражение твердых тканей конкретного зуба",
	},
	K03: {
		code: "K03",
		titleRu: "Другие болезни твердых тканей зубов (стирание, сошлифовывание, эрозия, клиновидный дефект)",
		requiresTooth: false,
	},
	K04: {
		code: "K04",
		titleRu: "Болезни пульпы и периапикальных тканей (пульпит, некроз, периодонтит, периапикальный абсцесс, корневая киста)",
		requiresTooth: true,
		description: "Эндодонтическое поражение пульпы и верхушечного периодонта конкретного зуба",
	},
	K05: {
		code: "K05",
		titleRu: "Гингивит и болезни пародонта (острый/хронический гингивит, пародонтит, пародонтоз)",
		requiresTooth: true,
		description: "Воспалительное или деструктивное поражение тканей пародонта в области зуба/сегмента",
	},
	K06: {
		code: "K06",
		titleRu: "Другие изменения десны и беззубого альвеолярного края (рецессия десны, гипертрофия)",
		requiresTooth: false,
	},
	K07: {
		code: "K07",
		titleRu: "Челюстно-лицевые аномалии (включая аномалии прикуса и ВНЧС)",
		requiresTooth: false,
	},
	K08: {
		code: "K08",
		titleRu: "Другие изменения зубов и их опорного аппарата (потеря зубов / адентия, атрофия альвеолярного края)",
		requiresTooth: false,
	},
	K09: {
		code: "K09",
		titleRu: "Кисты области рта, не классифицированные в других рубриках (одонтогенные/неодонтогенные)",
		requiresTooth: false,
	},
	K10: {
		code: "K10",
		titleRu: "Другие болезни челюстей (остеомиелит, альвеолит, периостит)",
		requiresTooth: false,
	},
	K11: {
		code: "K11",
		titleRu: "Болезни слюнных желез (сиаладенит, сиалолитиаз, мукоцеле)",
		requiresTooth: false,
	},
	K12: {
		code: "K12",
		titleRu: "Стоматит и родственные поражения (афтозный стоматит, язвенный стоматит)",
		requiresTooth: false,
	},
	K13: {
		code: "K13",
		titleRu: "Другие болезни губ и слизистой оболочки полости рта (хейлит, лейкоплакия)",
		requiresTooth: false,
	},
	K14: {
		code: "K14",
		titleRu: "Болезни языка (глоссит, географический язык, глоссодиния)",
		requiresTooth: false,
	},
};

/**
 * Детализированные подрубрики часто встречающихся стоматологических диагнозов МКБ-10.
 */
export const DETAILED_DENTAL_ICD10_TITLES: Readonly<Record<string, string>> = {
	// K00
	"K00.0": "Адентия (полная или частичная гиподонтия)",
	"K00.1": "Сверхкомплектные зубы",
	"K00.2": "Аномалии величины и формы зубов",
	"K00.3": "Крапчатые зубы (флюороз эмали)",
	"K00.4": "Нарушения формирования зубов (гипоплазия эмали)",
	"K00.5": "Наследственные нарушения структуры зуба (несовершенный амелогенез/дентиногенез)",
	"K00.6": "Нарушения прорезывания зубов",
	// K01
	"K01.0": "Вкрапленные зубы",
	"K01.1": "Ретенированные зубы",
	// K02
	"K02.0": "Кариес эмали (стадия белого пятна / начальный)",
	"K02.1": "Кариес дентина (средний / глубокий)",
	"K02.2": "Кариес цемента",
	"K02.3": "Приостановившийся кариес зубов",
	"K02.4": "Одонтоклазия",
	"K02.5": "Кариес с обнажением пульпы",
	"K02.8": "Другой кариес зубов",
	"K02.9": "Кариес зубов неуточненный",
	// K03
	"K03.0": "Повышенное стирание зубов",
	"K03.1": "Сошлифовывание зубов (клиновидный дефект)",
	"K03.2": "Эрозия зубов",
	"K03.3": "Патологическая резорбция зубов",
	"K03.4": "Гиперцементоз",
	"K03.5": "Анкилоз зубов",
	"K03.6": "Отложения на зубах (зубной камень, налет)",
	"K03.7": "Изменение цвета твердых тканей зубов после прорезывания",
	// K04
	"K04.0": "Пульпит",
	"K04.00": "Начальный пульпит (гиперемия пульпы)",
	"K04.01": "Острый пульпит",
	"K04.02": "Гнойный пульпит (пульпарный абсцесс)",
	"K04.03": "Хронический пульпит",
	"K04.04": "Хронический язвенный пульпит",
	"K04.05": "Хронический гиперпластический пульпит (пульпарный полип)",
	"K04.1": "Некроз пульпы (гангрена пульпы)",
	"K04.2": "Дегенерация пульпы (дентиклы, кальцификаты)",
	"K04.3": "Неправильное формирование твердых тканей в пульпе",
	"K04.4": "Острый апикальный периодонтит пульпарного происхождения",
	"K04.5": "Хронический апикальный периодонтит (апикальная гранулема)",
	"K04.6": "Периапикальный абсцесс со свищом",
	"K04.7": "Периапикальный абсцесс без свища",
	"K04.8": "Корневая киста (радикулярная киста)",
	"K04.9": "Другие и неуточненные болезни пульпы и периапикальных тканей",
	// K05
	"K05.0": "Острый гингивит",
	"K05.1": "Хронический гингивит",
	"K05.2": "Острый пародонтит (пародонтальный абсцесс)",
	"K05.3": "Хронический пародонтит",
	"K05.4": "Пародонтоз",
	"K05.5": "Другие болезни пародонта",
	"K05.6": "Болезнь пародонта неуточненная",
	// K06
	"K06.0": "Рецессия десны",
	"K06.1": "Гипертрофия десны",
	// K07
	"K07.0": "Основные аномалии размеров челюстей",
	"K07.1": "Аномалии челюстно-черепных соотношений",
	"K07.2": "Аномалии соотношений зубных дуг (дистальный/мезиальный/глубокий прикус)",
	"K07.3": "Аномалии положения зубов (скученность, диастема)",
	"K07.4": "Аномалия прикуса неуточненная",
	"K07.6": "Болезни височно-нижнечелюстного сустава (синдром Костена, щелканье ВНЧС)",
	// K08
	"K08.0": "Эксфолиация зубов вследствие системных нарушений",
	"K08.1": "Потеря зубов вследствие несчастного случая, удаления или болезни пародонта (адентия)",
	"K08.2": "Атрофия беззубого альвеолярного края",
	"K08.3": "Укоренившийся зубной корень",
	// K10
	"K10.2": "Воспалительные заболевания челюстей (остеомиелит, периостит)",
	"K10.3": "Альвеолит челюстей (сухая лунка после удаления зуба)",
	// K11
	"K11.2": "Сиаладенит",
	"K11.5": "Сиалолитиаз (слюннокаменная болезнь)",
	"K11.6": "Мукоцеле слюнной железы (ретенционная киста)",
	// K12
	"K12.0": "Рецидивирующие афты полости рта (афтозный стоматит)",
	"K12.1": "Другие формы стоматита",
	// K13
	"K13.0": "Болезни губ (хейлит)",
	"K13.2": "Лейкоплакия полости рта",
	// K14
	"K14.0": "Глоссит",
	"K14.1": "Географический язык (десквамативный глоссит)",
	"K14.6": "Глоссодиния",
};

/**
 * Рубрики МКБ-10, для которых клиника строго требует указание зуба FDI.
 */
export const TOOTH_SPECIFIC_RUBRICS = new Set<string>(["K02", "K04", "K05"]);

export class Icd10ClinicalValidator {
	/**
	 * Нормализует строку кода МКБ-10:
	 * - заменяет кириллическую 'К'/'к' (U+041A, U+043A) на латинскую 'K'
	 * - обрезает пробельные символы
	 * - переводит в верхний регистр
	 * - форматирует код без точки, если передано 4-5 символов (например, "K021" -> "K02.1")
	 */
	public static normalizeCode(raw: unknown): string {
		if (typeof raw !== "string" && typeof raw !== "number") {
			return "";
		}
		let str = String(raw).trim();
		if (!str) return "";

		// Замена русских К/к на латинскую K
		str = str.replace(/^[Кк]/u, "K").toUpperCase();

		// Удаляем лишние спецсимволы по краям
		str = str.replace(/^[^\w]+|[^\w]+$/g, "");

		// Если код вида K021 или K0402 -> вставляем точку после первых 3 символов
		if (/^K\d{3,4}$/i.test(str)) {
			str = `${str.slice(0, 3)}.${str.slice(3)}`;
		}

		return str;
	}

	/**
	 * Извлекает 3-значную базовую рубрику МКБ-10 (например, "K02" из "K02.1").
	 */
	public static getBaseRubric(normalizedCode: string): string {
		const match = normalizedCode.match(/^([A-Z]\d{2})/);
		return match?.[1] ?? "";
	}

	/**
	 * Проверяет, принадлежит ли код стоматологическому разделу МКБ-10 (K00–K14).
	 */
	public static isDentalIcd10(code: unknown): boolean {
		const normalized = Icd10ClinicalValidator.normalizeCode(code);
		if (!normalized) return false;
		return /^K(0[0-9]|1[0-4])(\.\d{1,4})?$/i.test(normalized);
	}

	/**
	 * Проверяет, является ли диагноз строго зубоспецифичным (K02, K04, K05).
	 */
	public static isToothSpecificDiagnosis(code: unknown): boolean {
		const normalized = Icd10ClinicalValidator.normalizeCode(code);
		if (!normalized) return false;
		const rubric = Icd10ClinicalValidator.getBaseRubric(normalized);
		return TOOTH_SPECIFIC_RUBRICS.has(rubric);
	}

	/**
	 * Возвращает клиническое наименование диагноза на русском языке.
	 */
	public static getDiagnosisTitleRu(normalizedCode: string): string {
		const detailed = DETAILED_DENTAL_ICD10_TITLES[normalizedCode];
		if (detailed) {
			return detailed;
		}
		const rubric = Icd10ClinicalValidator.getBaseRubric(normalizedCode);
		const rubricInfo = DENTAL_ICD10_RUBRICS[rubric];
		if (rubricInfo) {
			return rubricInfo.titleRu;
		}
		return `Стоматологический диагноз (${normalizedCode})`;
	}

	/**
	 * Проверяет, является ли число валидным номером зуба FDI (ISO 3950: 11-48, 51-85).
	 */
	public static isValidFdiTooth(toothNumber: number): boolean {
		return (
			Number.isInteger(toothNumber) && ALL_VALID_FDI_TEETH.has(toothNumber)
		);
	}

	/**
	 * Извлекает и валидирует список номеров зубов FDI из произвольной строки ввода
	 * (например: "16", 16, "16, 17", "11-13", "зуб 36", "1.6", " 46 ").
	 */
	public static parseAndValidateTeeth(rawTooth: unknown): {
		isValid: boolean;
		teeth: number[];
		invalidTokens: string[];
	} {
		if (rawTooth == null) {
			return { isValid: true, teeth: [], invalidTokens: [] };
		}

		if (typeof rawTooth === "number") {
			if (Icd10ClinicalValidator.isValidFdiTooth(rawTooth)) {
				return { isValid: true, teeth: [rawTooth], invalidTokens: [] };
			}
			return {
				isValid: false,
				teeth: [],
				invalidTokens: [String(rawTooth)],
			};
		}

		const str = String(rawTooth).trim();
		if (!str) {
			return { isValid: true, teeth: [], invalidTokens: [] };
		}

		// Очистка от клинических текстовых префиксов с поддержкой Unicode
		const cleanedStr = str
			.replace(/(?:^|[^\p{L}\p{N}])(зубы?|зуба|зубов|teeth|tooth|dentes|dens)(?=[^\p{L}\p{N}]|$)/giu, " ")
			.replace(/[№#]/g, " ");

		// Разбиваем по запятым, пробелам, точкам с запятой, слешам
		const tokens = cleanedStr
			.split(/[,;\s/]+/)
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		if (tokens.length === 0) {
			return { isValid: true, teeth: [], invalidTokens: [] };
		}

		const teeth: number[] = [];
		const invalidTokens: string[] = [];

		for (const rawToken of tokens) {
			let token = rawToken
				.replace(/^(?:зуб[ыа]?|зубов|teeth|tooth|dentes|dens|[dD]|№|#|\.)+/iu, "")
				.trim();

			if (!token) {
				// Токен был чисто префиксом (например, "зуб") — пропускаем
				continue;
			}

			// Если формат с точкой типа "1.6" -> "16"
			if (/^[1-8]\.[1-8]$/.test(token)) {
				token = token.replace(".", "");
			}

			// Проверка диапазона зубов типа "11-13" (в одном квадранте)
			if (/^[1-8][1-8]-[1-8][1-8]$/.test(token)) {
				const [startStr, endStr] = token.split("-");
				const start = Number(startStr);
				const end = Number(endStr);
				const quadStart = Math.floor(start / 10);
				const quadEnd = Math.floor(end / 10);

				if (
					quadStart === quadEnd &&
					Icd10ClinicalValidator.isValidFdiTooth(start) &&
					Icd10ClinicalValidator.isValidFdiTooth(end)
				) {
					const minTooth = Math.min(start, end);
					const maxTooth = Math.max(start, end);
					let rangeValid = true;
					for (let t = minTooth; t <= maxTooth; t++) {
						if (Icd10ClinicalValidator.isValidFdiTooth(t)) {
							teeth.push(t);
						} else {
							rangeValid = false;
						}
					}
					if (!rangeValid) {
						invalidTokens.push(rawToken);
					}
					continue;
				} else {
					invalidTokens.push(rawToken);
					continue;
				}
			}

			const num = Number(token);
			if (Number.isInteger(num) && Icd10ClinicalValidator.isValidFdiTooth(num)) {
				teeth.push(num);
			} else {
				invalidTokens.push(rawToken);
			}
		}

		// Дедупликация и сортировка зубов
		const uniqueTeeth = Array.from(new Set(teeth)).sort((a, b) => a - b);

		return {
			isValid: invalidTokens.length === 0 && uniqueTeeth.length > 0,
			teeth: uniqueTeeth,
			invalidTokens,
		};
	}

	/**
	 * Комплексная клиническая валидация диагноза МКБ-10 и привязки к зубам перед подписанием 043/у.
	 *
	 * @param diagnosisIcd10 Код МКБ-10 (например, "K02.1", "K04.0", "K08.1")
	 * @param diagnosisTooth Номер(а) зубов FDI (например, "36", 36, "16, 17")
	 */
	public static validate(
		diagnosisIcd10: unknown,
		diagnosisTooth?: unknown,
	): Icd10ValidationResult {
		const rawCodeStr =
			typeof diagnosisIcd10 === "string"
				? diagnosisIcd10.trim()
				: diagnosisIcd10 != null
					? String(diagnosisIcd10).trim()
					: "";

		// 1. Проверка наличия кода МКБ-10
		if (!rawCodeStr) {
			return {
				isValid: false,
				errorCode: "Icd10Required",
				errorMessage:
					"Перед подписью дневника 043/у укажите код диагноза по МКБ-10. Сохраните черновик с кодом и повторите подписание.",
				rawCode: rawCodeStr,
			};
		}

		// 2. Нормализация и проверка стоматологического раздела K00-K14
		const normalizedCode = Icd10ClinicalValidator.normalizeCode(rawCodeStr);
		if (!Icd10ClinicalValidator.isDentalIcd10(normalizedCode)) {
			return {
				isValid: false,
				errorCode: "Icd10Invalid",
				errorMessage: `Код диагноза «${rawCodeStr}» не входит в стоматологический раздел МКБ-10 (K00–K14) или имеет неверный формат. Укажите корректный код (например, K02.1 для кариеса дентина, K04.0 для пульпита, K05.1 для гингивита, K08.1 для адентии).`,
				normalizedCode,
				rawCode: rawCodeStr,
			};
		}

		const baseRubric = Icd10ClinicalValidator.getBaseRubric(normalizedCode);
		const categoryTitle = Icd10ClinicalValidator.getDiagnosisTitleRu(normalizedCode);
		const isToothSpecific = TOOTH_SPECIFIC_RUBRICS.has(baseRubric);

		const rawToothStr =
			typeof diagnosisTooth === "string"
				? diagnosisTooth.trim()
				: diagnosisTooth != null
					? String(diagnosisTooth).trim()
					: "";

		// 3. Проверка зубоспецифичных диагнозов (K02, K04, K05)
		if (isToothSpecific) {
			if (!rawToothStr) {
				return {
					isValid: false,
					errorCode: "ToothRequired",
					errorMessage: `Для диагноза «${normalizedCode}: ${categoryTitle}» обязательно укажите номер зуба по системе FDI (11–48 для постоянных, 51–85 для молочных зубов).`,
					normalizedCode,
					rawCode: rawCodeStr,
					rawTooth: rawToothStr,
				};
			}

			const toothValidation = Icd10ClinicalValidator.parseAndValidateTeeth(rawToothStr);
			if (!toothValidation.isValid) {
				const badTokenStr = toothValidation.invalidTokens.join(", ") || rawToothStr;
				return {
					isValid: false,
					errorCode: "ToothInvalid",
					errorMessage: `Указан недопустимый номер зуба «${badTokenStr}». Номер зуба должен соответствовать системе FDI: 11–48 (постоянный прикус) или 51–85 (молочный прикус).`,
					normalizedCode,
					rawCode: rawCodeStr,
					rawTooth: rawToothStr,
				};
			}

			return {
				isValid: true,
				normalizedCode,
				baseRubric,
				categoryTitle,
				isToothSpecific: true,
				parsedTeeth: toothValidation.teeth,
			};
		}

		// 4. Для не-зубоспецифичных диагнозов (например, K08.1, K00, K07, K12):
		// если номер зуба передан, он должен быть корректным номером FDI
		if (rawToothStr) {
			const toothValidation = Icd10ClinicalValidator.parseAndValidateTeeth(rawToothStr);
			if (!toothValidation.isValid) {
				const badTokenStr = toothValidation.invalidTokens.join(", ") || rawToothStr;
				return {
					isValid: false,
					errorCode: "ToothInvalid",
					errorMessage: `Указан недопустимый номер зуба «${badTokenStr}». Номер зуба должен соответствовать системе FDI: 11–48 (постоянный прикус) или 51–85 (молочный прикус).`,
					normalizedCode,
					rawCode: rawCodeStr,
					rawTooth: rawToothStr,
				};
			}

			return {
				isValid: true,
				normalizedCode,
				baseRubric,
				categoryTitle,
				isToothSpecific: false,
				parsedTeeth: toothValidation.teeth,
			};
		}

		return {
			isValid: true,
			normalizedCode,
			baseRubric,
			categoryTitle,
			isToothSpecific: false,
			parsedTeeth: [],
		};
	}
}
