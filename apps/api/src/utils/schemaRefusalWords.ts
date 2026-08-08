/**
 * schemaRefusalWords.ts — ОДИН перевод слов разборщика схемы в слова человека.
 *
 * ЧТО БЫЛО СЛОМАНО, замерено прогоном `app.inject` в своём процессе
 * (`.agents/lead/recon-zod-words-reach-the-operator.md`):
 *
 *   POST /api/billing/payments, пустое тело
 *     → «Оплата не записана. пациент: Required; сумма: Required.»
 *   POST /api/billing/payments, сумма с запятой и способ оплаты по-русски
 *     → «… способ оплаты: Invalid enum value. Expected 'cash' | 'card' |
 *        'bank_transfer' | 'online' | 'insurance' | 'family_wallet' | 'other',
 *        received 'нал' …»
 *   POST /api/migration/analyze, пустое тело      → «sourceName: Required»
 *   POST /api/public/booking/<клиника>/book       → ["Required" × 5]
 *
 * `Required`, `Expected number, received string`, `Invalid enum value` — это
 * слова разборщика, а не клиники. Русская подпись поля рядом с ними стоит верно
 * и остаётся: без имени поля кассир не понимает, чего не хватает. Дефект в том,
 * что рядом с подписью стоит МАШИННОЕ слово вместо человеческого.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ, И ХУЖЕ, ЧЕМ ВЫГЛЯДИТ. Кассир не читает смесь двух
 * языков — он не читает НИЧЕГО. Клиент гасит фразу отказа ЦЕЛИКОМ, если в ней
 * есть латинское слово из шести и более знаков: `apps/web/src/AppHelpers.tsx`,
 * `technicalWorkflowFailurePattern`, правило `[A-Z][A-Z0-9_]{5,}` под флагом
 * `/i`. Под него попадают `Required` (8), `Expected` (8), `received` (8),
 * `string` (6), `number` (6), `Invalid` (7), `insurance` (9) — то есть почти
 * каждое слово разборщика. На экране остаётся общая подпись по коду ответа, и
 * человек у стойки с пациентом в очереди не знает, что нажать.
 *
 * ПОЧЕМУ ДОМ ОДИН, И ПОЧЕМУ РЯДОМ С clinicSessionRefusal.ts, А НЕ ВНУТРИ
 *
 * Соседний `clinicSessionRefusal.ts` — общий дом текстов ОДНОГО состояния
 * («запрос пришёл без рабочего кабинета клиники»), и его шапка прямо запрещает
 * складывать туда второй словарь сообщений. Запрет правильный, и он соблюдён:
 * здесь не тексты состояний, а ПЕРЕВОДЧИК — устройство, которое из кода
 * замечания разборщика и русской подписи поля собирает причину и действие. Два
 * разных предмета, два файла в одной папке, взаимные ссылки в шапках, чтобы
 * следующий инженер увидел оба дома сразу и не завёл третий.
 *
 * Третьего не будет, и это не пожелание. В этом дереве уже выросли ДЕВЯТЬ
 * расчётов долга пациента и ТРИ копии часового пояса клиники ровно так: каждый
 * раз заводили ещё одно место. Заплата этого же класса уже была написана по
 * месту — `routes/telegram.ts` держал свой список из девяти латинских слов и
 * вместо перевода ВЫБРАСЫВАЛ причину, отвечая «поле названо, причины нет,
 * действия нет». Список отстал от библиотеки на шесть кодов из шестнадцати.
 *
 * ПОЧЕМУ ПЕРЕВОД ПО КОДУ ЗАМЕЧАНИЯ, А НЕ ПО АНГЛИЙСКОМУ ТЕКСТУ
 *
 * Английский текст — это ОТОБРАЖЕНИЕ кода, и он меняется вместе с версией
 * библиотеки и с подключённой языковой картой. Код замечания — контракт.
 * Шестнадцать кодов и их шаблоны считаны из установленного `zod@3.25.76`
 * (`node_modules/zod/src/v3/locales/en.ts`), а не по памяти. Поиск подстроки
 * `/invalid|required|expected|…/i` неизбежно отстаёт от библиотеки — и уже
 * отстал в том единственном месте, где его написали.
 *
 * ПОЧЕМУ РУССКОЕ СООБЩЕНИЕ АВТОРА СХЕМЫ ПРОПУСКАЕТСЯ КАК ЕСТЬ
 *
 * Часть полей уже несёт написанный человеком текст: `routes/publicBooking.ts`
 * объявляет «Некорректный идентификатор врача» и «Неверный формат номера
 * телефона». Код замечания у такого сообщения тот же, что у машинного, поэтому
 * различить их по коду нельзя. Различаются они тем же признаком, по которому
 * решает клиент: есть ли кириллица и нет ли латинского слова из шести знаков.
 * Судить одним правилом с клиентом — единственный способ гарантировать, что
 * перевод и фильтр не разойдутся при следующей правке любого из двух.
 *
 * ПОЧЕМУ НИ ОДНОГО ЛАТИНСКОГО СЛОВА, ВКЛЮЧАЯ ИМЕНА ТИПОВ И ЗНАЧЕНИЯ
 *
 * Латиница возвращается не только именем поля. Она возвращается именем типа
 * (`string`, `number`), значением перечисления (`cash`, `bank_transfer`) и
 * именем проверки (`uuid`, `datetime`). Поэтому переведены и они, а список
 * допустимых значений в текст НЕ подставляется вовсе: значения перечислений —
 * это внутренние ключи колонки базы, человеку они не нужны, ему нужен список на
 * экране. Отсутствие подстановки здесь — решение, а не упущение.
 *
 * У КАЖДОЙ ФРАЗЫ ДВЕ ЧАСТИ: ПРИЧИНА И ДЕЙСТВИЕ. Отказ без действия — это код
 * ответа русскими словами, то есть тот же дефект.
 *
 * РОД, ПАДЕЖ И ЧИСЛО — ПОЧЕМУ ФРАЗЫ УСТРОЕНЫ ИМЕННО ТАК
 *
 * Подписи полей приходят из чужих словарей в именительном падеже и любого рода
 * («сумма оплаты», «пациент», «прием»). Согласовать с ними сказуемое нельзя, и
 * ни одна фраза здесь этого не делает: подпись всегда стоит в кавычках после
 * слова «поле», а согласуется всё со словом «поле». Имена типов хранятся сразу
 * в нужном падеже — иначе фразы читались бы как машинный перевод. Однотипные
 * замечания СЛИВАЮТСЯ в одну фразу со списком полей: «Поле „пациент“ не
 * заполнено и поле „сумма оплаты“ не заполнено» — это не русский язык.
 *
 * МАШИННЫЙ КОД В ОТВЕТЕ НЕ ТРОГАЕТСЯ. Поле `error` остаётся дословно, интерфейс
 * по нему ветвится. Здесь собирается только человеческий `message`.
 */

/**
 * Замечание разборщика в том виде, в котором его отдаёт `zod`.
 *
 * Тип объявлен своим, а не взят из библиотеки, намеренно: у разных версий `zod`
 * разные объединения типов замечаний, и жёсткая привязка к одному из них
 * заставила бы приводить типы в каждом вызывающем маршруте. Все поля кроме
 * `path` и `message` необязательны — они есть только у части кодов.
 */
export type SchemaIssueLike = {
	code?: string | undefined;
	path: ReadonlyArray<string | number>;
	message: string;
	expected?: unknown;
	received?: unknown;
	type?: unknown;
	minimum?: unknown;
	maximum?: unknown;
	inclusive?: unknown;
	exact?: unknown;
	validation?: unknown;
	multipleOf?: unknown;
};

/**
 * Вид замечания на языке клиники, а не библиотеки.
 *
 * Нужен для слияния однотипных замечаний в одну фразу: шесть кодов `zod`
 * означают для человека одно и то же — «поле пустое», и шесть отдельных фраз об
 * этом читать невозможно.
 */
type SchemaIssueKind =
	| "empty"
	| "wrong_type"
	| "not_in_list"
	| "wrong_form"
	| "too_short"
	| "too_long"
	| "author_text"
	| "unexpected_fields"
	| "other";

/** Причина и следующий шаг — обе части обязательны. */
export type SchemaRefusalWords = {
	/** Что не так: «поле „сумма оплаты“ не заполнено». */
	cause: string;
	/** Что сделать: «заполните поле „сумма оплаты“». */
	action: string;
	/** Вид замечания — по нему однотипные фразы сливаются. */
	kind: SchemaIssueKind;
	/** Русская подпись поля, если она известна участку. */
	label: string | null;
};

/**
 * Живой фильтр клиента, повторённый здесь ДОСЛОВНО.
 *
 * Источник: `apps/web/src/AppHelpers.tsx`, `technicalWorkflowFailurePattern`.
 * Копия нужна потому, что сервер не импортирует код интерфейса, а решение
 * «пропустить сообщение автора схемы или перевести его» обязано совпадать с
 * решением клиента «показать или погасить». Расхождение этих двух правил дало бы
 * ровно тот дефект, который здесь чинится: текст, который сервер считает
 * человеческим, а экран гасит.
 *
 * Тест-замок сверяет эту копию с живым исходником интерфейса, чтобы копия не
 * разъехалась молча.
 */
const operatorTextRejectionPattern =
	/\b(TypeError|DOMException|SyntaxError|ReferenceError|Failed to fetch|NetworkError|Load failed|fetch|JSON|ENOENT|EACCES|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|stack|undefined|null|NaN|[A-Z][A-Z0-9_]{5,})\b|\/api\/|https?:\/\/|[A-Za-z]:\\|\\\\[^\\]+\\|\/(Users|home|var|tmp)\//i;

/**
 * Дойдёт ли текст до человека, или экран погасит его целиком.
 *
 * Экспортируется, чтобы тесты и другие места сервера могли задать тот же вопрос
 * тем же правилом, а не завести десятый его вариант.
 */
export function textReachesOperator(text: string | null | undefined): boolean {
	const message = text?.trim() ?? "";
	if (!message) return false;
	if (!/[А-Яа-яЁё]/.test(message)) return false;
	return !operatorTextRejectionPattern.test(message);
}

/**
 * Имена типов разборщика в творительном падеже: «поле заполнено ТЕКСТОМ».
 *
 * «Текст», а не «строка»: «строка» — слово программиста. Падеж выбран один раз
 * здесь, а не подгоняется в каждой фразе, иначе тот же словарь пришлось бы
 * держать в трёх падежах и они разъехались бы.
 */
const parsedTypeInstrumental: Record<string, string> = {
	string: "текстом",
	number: "числом",
	nan: "значением, которое не является числом",
	integer: "целым числом",
	float: "числом с дробной частью",
	bigint: "целым числом",
	boolean: "признаком «да» или «нет»",
	date: "датой",
	symbol: "служебной меткой",
	function: "действием",
	array: "списком",
	object: "набором полей",
	unknown: "значением неизвестного вида",
	promise: "отложенным значением",
	never: "недопустимым значением",
	map: "таблицей соответствий",
	set: "набором значений",
};

/**
 * Те же имена в винительном падеже: «здесь нужно вписать ЧИСЛО».
 *
 * Рамка именно «нужно ВПИСАТЬ», а не «нужно» с прямым дополнением: «нужно число»
 * (средний род) и «нужен текст» (мужской) требуют разного сказуемого, а род
 * приходит из этого словаря и заранее неизвестен. Инфинитив рода не имеет, и
 * фраза остаётся грамотной при любом слове. Замерено на живом ответе: без
 * инфинитива получалось «а здесь нужно текст».
 */
const parsedTypeAccusative: Record<string, string> = {
	string: "текст",
	number: "число",
	integer: "целое число",
	float: "число с дробной частью",
	bigint: "целое число",
	boolean: "признак «да» или «нет»",
	date: "дату",
	array: "список",
	object: "набор полей",
	set: "набор значений",
	map: "таблицу соответствий",
};

/** Имена строковых проверок в винительном падеже. */
const stringValidationAccusative: Record<string, string> = {
	email: "адрес электронной почты",
	url: "ссылку целиком, вместе с началом адреса",
	uuid: "опознавательный номер записи",
	nanoid: "опознавательный номер записи",
	guid: "опознавательный номер записи",
	cuid: "опознавательный номер записи",
	cuid2: "опознавательный номер записи",
	ulid: "опознавательный номер записи",
	datetime: "дату вместе со временем",
	date: "дату",
	time: "время",
	duration: "длительность",
	ip: "сетевой адрес",
	cidr: "сетевой адрес с маской",
	base64: "вложение в закодированном виде",
	base64url: "вложение в закодированном виде",
	jwt: "подписанный пропуск",
	emoji: "значок",
};

function readWord(
	dictionary: Record<string, string>,
	key: unknown,
): string | null {
	return typeof key === "string" && key in dictionary
		? (dictionary[key] as string)
		: null;
}

function readNumberWord(value: unknown): string | null {
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	if (typeof value === "bigint") return value.toString();
	return null;
}

/**
 * Русская подпись поля из словаря вызывающего участка.
 *
 * Если подписи нет, поле НЕ называется латинским ключом схемы: латинский ключ из
 * шести знаков погасил бы фразу целиком, то есть «назвали поле» превратилось бы в
 * «не сказали ничего». Возвращается null, и фраза строится без имени поля.
 */
function fieldLabelFrom(
	issue: SchemaIssueLike,
	fieldLabels: Readonly<Record<string, string>>,
): string | null {
	/*
	 * Поиск идёт от САМОГО ТОЧНОГО ключа к самому общему, и это не мелочь. Путь
	 * `mappingOverrides.0.sourceColumn` при обходе с начала дал бы подпись
	 * «поправки карты соответствия», хотя человеку нужна «колонка источника».
	 * Сначала пробуется путь целиком через точку — часть словарей в дереве
	 * ключуется именно так (`visualCardUrls.review` в настройках телеграма), —
	 * затем отрезки с конца.
	 */
	const stringParts = issue.path.filter(
		(part): part is string => typeof part === "string",
	);
	const candidates = [
		issue.path.join("."),
		stringParts.join("."),
		...[...stringParts].reverse(),
	];
	for (const candidate of candidates) {
		if (!candidate) continue;
		const label = fieldLabels[candidate];
		if (label && textReachesOperator(label)) return label;
	}
	return null;
}

/** «поле «сумма оплаты»» — именительный. */
function nominative(label: string | null): string {
	return label ? `поле «${label}»` : "одно из полей формы";
}

/** «поля «сумма оплаты»» — родительный, для «значение ПОЛЯ …». */
function genitive(label: string | null): string {
	return label ? `поля «${label}»` : "одного из полей формы";
}

/** «поле «сумма оплаты»» — винительный, для «заполните ПОЛЕ …». */
function accusative(label: string | null): string {
	return label ? `поле «${label}»` : "выделенное поле формы";
}

/**
 * «поле «сумма оплаты»» — предложный, для «В ПОЛЕ … не выбрано».
 *
 * У слова «поле» предложный совпадает с именительным, но у безымянного варианта
 * НЕТ: «в одно из полей формы» — не по-русски, нужно «в одном из полей формы».
 * Замерено на живом ответе: без этой формы получалось «дата в поля „X“ раньше
 * допустимой».
 */
function prepositional(label: string | null): string {
	return label ? `поле «${label}»` : "одном из полей формы";
}

/**
 * Перевод одного замечания в причину, действие и вид.
 *
 * Порядок ветвей повторяет `switch` по коду в языковой карте `zod`, чтобы
 * сверять их глазами построчно при обновлении библиотеки.
 */
export function schemaIssueWords(
	issue: SchemaIssueLike,
	fieldLabels: Readonly<Record<string, string>> = {},
): SchemaRefusalWords {
	const label = fieldLabelFrom(issue, fieldLabels);
	const named = nominative(label);
	const namedGenitive = genitive(label);
	const namedAccusative = accusative(label);
	const namedPrepositional = prepositional(label);

	/*
	 * Сообщение, написанное автором схемы по-русски, пропускается как есть:
	 * причину поля знает только та проверка, что его объявила. Действие ей всё
	 * равно дописывается — своего у неё нет, а отказ без действия и есть дефект.
	 */
	if (textReachesOperator(issue.message)) {
		const authorText = issue.message.trim().replace(/[.!]+$/, "");
		return {
			kind: "author_text",
			label,
			cause: label ? `${named} не принято — ${authorText}` : authorText,
			action: `перезаполните ${namedAccusative}`,
		};
	}

	switch (issue.code) {
		case "invalid_type": {
			if (issue.received === "undefined" || issue.received === "null") {
				return {
					kind: "empty",
					label,
					cause: `${named} не заполнено`,
					action: `заполните ${namedAccusative}`,
				};
			}
			const came = readWord(parsedTypeInstrumental, issue.received);
			const needed = readWord(parsedTypeAccusative, issue.expected);
			if (came && needed) {
				return {
					kind: "wrong_type",
					label,
					cause: `${named} заполнено ${came}, а здесь нужно вписать ${needed}`,
					action: `перезаполните ${namedAccusative}`,
				};
			}
			return {
				kind: "wrong_type",
				label,
				cause: needed
					? `${named} заполнено не тем видом значения, а здесь нужно вписать ${needed}`
					: `${named} заполнено не тем видом значения`,
				action: `перезаполните ${namedAccusative}`,
			};
		}

		case "invalid_literal":
			return {
				kind: "not_in_list",
				label,
				cause: `${named} принимает только одно определённое значение, а пришло другое`,
				action: `подтвердите ${namedAccusative} на экране`,
			};

		case "unrecognized_keys":
			return {
				kind: "unexpected_fields",
				label: null,
				cause: "в запросе пришли поля, которых клиника здесь не ждёт",
				action: "обновите страницу, чтобы форма пересобралась",
			};

		case "invalid_union":
		case "invalid_intersection_types":
			return {
				kind: "wrong_form",
				label,
				cause: `${named} заполнено значением, которое не подходит ни под одну из допустимых здесь форм записи`,
				action: `перезаполните ${namedAccusative} по образцу рядом с ним`,
			};

		/*
		 * Список допустимых значений В ТЕКСТ НЕ ПОДСТАВЛЯЕТСЯ. Это внутренние
		 * ключи колонки базы (cash, bank_transfer, family_wallet): латиница из них
		 * погасила бы фразу целиком, а человеку нужен не ключ, а список на экране.
		 */
		case "invalid_enum_value":
		case "invalid_union_discriminator":
			return {
				kind: "not_in_list",
				label,
				cause: `значение ${namedGenitive} не входит в список допустимых`,
				action: `выберите значение ${namedGenitive} из списка на экране`,
			};

		case "invalid_arguments":
		case "invalid_return_type":
			return {
				kind: "wrong_type",
				label,
				cause: `${named} заполнено значением, которое клиника здесь не принимает`,
				action: `перезаполните ${namedAccusative}`,
			};

		case "invalid_date":
			return {
				kind: "wrong_form",
				label,
				cause: `${named} заполнено не датой`,
				action: `выберите дату в ${namedAccusative}`,
			};

		case "invalid_string": {
			const validation = issue.validation;
			/*
			 * Проверки `includes` / `startsWith` / `endsWith` приходят объектом, и
			 * подставлять из него образец нельзя: образец задаёт схема, он бывает
			 * латинским и погасил бы фразу.
			 */
			if (typeof validation === "object" && validation !== null) {
				return {
					kind: "wrong_form",
					label,
					cause: `${named} заполнено не по образцу, который принимает клиника`,
					action: `перепишите ${namedAccusative} по образцу рядом с ним`,
				};
			}
			const needed = readWord(stringValidationAccusative, validation);
			if (needed) {
				return {
					kind: "wrong_form",
					label,
					cause: `${named} заполнено не так, как записывают ${needed}`,
					action: `впишите в ${namedAccusative} ${needed}`,
				};
			}
			return {
				kind: "wrong_form",
				label,
				cause: `${named} заполнено не по образцу, который принимает клиника`,
				action: `перепишите ${namedAccusative} по образцу рядом с ним`,
			};
		}

		case "too_small": {
			const bound = readNumberWord(issue.minimum);
			if (issue.type === "string") {
				/*
				 * Пустая строка при `min(1)` — для человека ровно то же, что
				 * незаполненное поле, поэтому и вид замечания тот же: две разные
				 * фразы об одном состоянии читались бы как два разных дефекта.
				 */
				return bound === "1"
					? {
							kind: "empty",
							label,
							cause: `${named} не заполнено`,
							action: `заполните ${namedAccusative}`,
						}
					: {
							kind: "too_short",
							/*
							 * «не короче 5 знаков», а НЕ «короче, чем 5 знаков»: после
							 * сравнительной степени существительное всегда идёт в
							 * родительном, и фраза остаётся грамотной при ЛЮБОМ числе.
							 * Замерено на живом ответе: прежняя рамка давала «длиннее,
							 * чем 2 знаков».
							 */
							label,
							cause: bound
								? `${named} короче ${bound} знаков`
								: `${named} слишком короткое`,
							action: `допишите ${namedAccusative}`,
						};
			}
			if (issue.type === "array" || issue.type === "set") {
				return bound === "1"
					? {
							kind: "empty",
							label,
							cause: `в ${namedPrepositional} не выбрано ни одного значения`,
							action: `выберите хотя бы одно значение в ${namedPrepositional}`,
						}
					: {
							kind: "too_short",
							label,
							/*
							 * Число стоит В КОНЦЕ и без существительного после него: «нужно
							 * не меньше 3» грамотно при любом числе, а «3 значения» /
							 * «21 значение» требуют разных форм.
							 */
							cause: bound
								? `в ${namedPrepositional} выбрано слишком мало значений, нужно не меньше ${bound}`
								: `в ${namedPrepositional} выбрано меньше значений, чем нужно`,
							action: `добавьте значения в ${namedPrepositional}`,
						};
			}
			if (issue.type === "date") {
				return {
					kind: "too_short",
					label,
					cause: `дата в ${namedPrepositional} раньше допустимой`,
					action: `выберите более позднюю дату в ${namedPrepositional}`,
				};
			}
			return {
				kind: "too_short",
				label,
				cause: bound
					? `значение ${namedGenitive} меньше ${bound}`
					: `значение ${namedGenitive} слишком мало`,
				action: `увеличьте значение ${namedGenitive}`,
			};
		}

		case "too_big": {
			const bound = readNumberWord(issue.maximum);
			if (issue.type === "string") {
				return {
					kind: "too_long",
					label,
					cause: bound
						? `${named} длиннее ${bound} знаков`
						: `${named} слишком длинное`,
					action: `сократите ${namedAccusative}`,
				};
			}
			if (issue.type === "array" || issue.type === "set") {
				return {
					kind: "too_long",
					label,
					cause: bound
						? `в ${namedPrepositional} выбрано слишком много значений, допустимо не больше ${bound}`
						: `в ${namedPrepositional} выбрано больше значений, чем допустимо`,
					action: `уберите лишние значения из ${namedGenitive}`,
				};
			}
			if (issue.type === "date") {
				return {
					kind: "too_long",
					label,
					cause: `дата в ${namedPrepositional} позже допустимой`,
					action: `выберите более раннюю дату в ${namedPrepositional}`,
				};
			}
			return {
				kind: "too_long",
				label,
				cause: bound
					? `значение ${namedGenitive} больше ${bound}`
					: `значение ${namedGenitive} слишком велико`,
				action: `уменьшите значение ${namedGenitive}`,
			};
		}

		case "not_multiple_of": {
			const step = readNumberWord(issue.multipleOf);
			return {
				kind: "wrong_form",
				label,
				cause: step
					? `значение ${namedGenitive} не делится на ${step} без остатка`
					: `значение ${namedGenitive} не кратно допустимому шагу`,
				action: step
					? `впишите в ${namedAccusative} значение, кратное ${step}`
					: `впишите в ${namedAccusative} значение допустимого шага`,
			};
		}

		case "not_finite":
			return {
				kind: "wrong_form",
				label,
				cause: `значение ${namedGenitive} не является конечным числом`,
				action: `впишите в ${namedAccusative} обычное число`,
			};

		/*
		 * `custom` и НЕИЗВЕСТНЫЙ код сходятся в одну ветвь намеренно. Новый код
		 * замечания в следующей версии библиотеки попадёт сюда и получит текст с
		 * причиной и действием, а не английское слово: направление отказа выбрано
		 * в сторону человека, а не в сторону разборщика.
		 */
		default:
			return {
				kind: "other",
				label,
				cause: `${named} заполнено значением, которое клиника здесь не принимает`,
				action: `проверьте ${namedAccusative} и перезаполните его`,
			};
	}
}

/**
 * Одно замечание — одна самостоятельная фраза с причиной и действием.
 *
 * Нужна там, где отказ отдаётся списком строк (`details`, `issues`) либо где
 * замечание одно по своей природе (строка прайса, шаблон протокола, документ).
 */
export function schemaIssuePhrase(
	issue: SchemaIssueLike,
	fieldLabels: Readonly<Record<string, string>> = {},
): string {
	const words = schemaIssueWords(issue, fieldLabels);
	return `${capitalizeFirst(words.cause)} — ${words.action}.`;
}

function capitalizeFirst(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function uniqueInOrder(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const unique: string[] = [];
	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		unique.push(value);
	}
	return unique;
}

function joinWithAnd(parts: readonly string[]): string {
	if (parts.length <= 1) return parts[0] ?? "";
	return `${parts.slice(0, -1).join(", ")} и ${parts[parts.length - 1]}`;
}

/** «„пациент“, „сумма оплаты“ и „прием“» — только подписи, без слова «поле». */
function quotedLabels(labels: readonly string[]): string {
	return joinWithAnd(labels.map((label) => `«${label}»`));
}

/**
 * Слияние однотипных замечаний в одну фразу со списком полей.
 *
 * Нужно только там, где несколько полей в одном состоянии — обычное дело:
 * пустая форма даёт `empty` по каждому полю, и пять фраз «поле „X“ не заполнено»
 * подряд человек не читает.
 *
 * СЛИВАЮТСЯ ТОЛЬКО ТЕ ВИДЫ, У КОТОРЫХ ПРИ СЛИЯНИИ НЕ ТЕРЯЕТСЯ НИ СЛОВА. `empty`
 * и `not_in_list` несут в фразе только имя поля, поэтому список полей передаёт
 * ровно столько же. А вот `wrong_type` несёт ПАРУ значений — «заполнено текстом,
 * а здесь нужно число», — и это самое ценное, что кассир, набравший 1500,50,
 * может прочитать. Слияние стирало эту пару: сначала оно здесь было, замер на
 * живом ответе показал потерю, и оно убрано. Множественное число там, где оно
 * стоит информации, — это экономия за счёт человека.
 */
const pluralMerge: Partial<
	Record<
		SchemaIssueKind,
		(labels: readonly string[]) => { cause: string; action: string }
	>
> = {
	empty: (labels) => ({
		cause: `не заполнены поля ${quotedLabels(labels)}`,
		action: "заполните их",
	}),
	not_in_list: (labels) => ({
		cause: `значения полей ${quotedLabels(labels)} не входят в списки допустимых`,
		action: "выберите их из списков на экране",
	}),
};

/**
 * Слияние ТОЛЬКО действий, когда причины остаются раздельными.
 *
 * Для видов, где причина у каждого поля своя и ценна, повторять один и тот же
 * глагол по разу на поле нельзя: «перезаполните поле „сумма оплаты“,
 * перезаполните поле „номер фискального чека“» — замерено на живом ответе,
 * читается как сбой программы. Причины при этом сохраняются полностью, а
 * действие называется один раз и ссылается на них словом «названные».
 */
const actionMerge: Partial<Record<SchemaIssueKind, string>> = {
	wrong_type: "перезаполните названные поля",
	wrong_form: "перепишите названные поля по образцам рядом с ними",
	too_short: "допишите названные поля",
	too_long: "сократите названные поля",
	author_text: "перезаполните названные поля",
	other: "проверьте названные поля и перезаполните их",
};

export type SchemaRefusalOptions = {
	/** Замечания разборщика в том порядке, в котором он их вернул. */
	issues: ReadonlyArray<SchemaIssueLike>;
	/** Русские подписи полей участка: ключ схемы → подпись с экрана. */
	fieldLabels?: Readonly<Record<string, string>>;
	/**
	 * Что человек повторит, исправив поля: «запись оплаты», «выгрузку»,
	 * «сохранение шаблона». Этим заканчивается фраза, поэтому винительный падеж.
	 */
	retryAction: string;
	/** Текст на случай, когда замечаний не пришло вовсе. Причина И действие. */
	fallbackMessage: string;
	/** Сколько замечаний называть по имени. Больше трёх человек не читает. */
	namedLimit?: number;
};

/**
 * Полный человеческий отказ разбора: причины, затем действия, затем что
 * повторить.
 *
 * ЗАГОЛОВКА ЗДЕСЬ НЕТ НАМЕРЕННО. Экран приписывает свой:
 * `responseErrorMessage(response, "Оплата не записана")` в
 * `apps/web/src/useAppLogic.tsx` ставит «Оплата не записана: » перед серверным
 * текстом. Заголовок в серверной фразе давал бы кассиру «Оплата не записана:
 * Оплата не записана. …» — замерено на старом тексте.
 *
 * Двоеточий внутри фразы нет по той же причине, что и в
 * `clinicSessionRefusal.ts`: второе двоеточие в одном предложении читается как
 * обрывок.
 */
export function schemaRefusalMessage(options: SchemaRefusalOptions): string {
	const labels = options.fieldLabels ?? {};
	const limit = options.namedLimit ?? 3;
	const named = options.issues
		.slice(0, limit)
		.map((issue) => schemaIssueWords(issue, labels));
	if (named.length === 0) return options.fallbackMessage;

	/*
	 * Однотипные замечания собираются в один блок, порядок первого появления
	 * сохраняется: первым человек должен прочитать про то поле, которое разборщик
	 * назвал первым.
	 */
	const blocks: Array<{ kind: SchemaIssueKind; words: SchemaRefusalWords[] }> =
		[];
	for (const words of named) {
		const existing = blocks.find((block) => block.kind === words.kind);
		if (existing) existing.words.push(words);
		else blocks.push({ kind: words.kind, words: [words] });
	}

	const causes: string[] = [];
	const actions: string[] = [];
	for (const block of blocks) {
		const merge = pluralMerge[block.kind];
		const mergeableLabels = block.words.map((words) => words.label);
		if (
			merge &&
			block.words.length > 1 &&
			mergeableLabels.every((label) => label !== null)
		) {
			const merged = merge(mergeableLabels as string[]);
			causes.push(merged.cause);
			actions.push(merged.action);
			continue;
		}
		for (const words of block.words) causes.push(words.cause);
		const mergedAction = actionMerge[block.kind];
		if (mergedAction && block.words.length > 1) {
			actions.push(mergedAction);
			continue;
		}
		for (const words of block.words) actions.push(words.action);
	}

	const rest = options.issues.length - named.length;
	/* «Ещё замечаний: N» дало бы второе двоеточие в одном предложении. */
	const tail = rest > 0 ? ` Кроме названного, замечаний ещё ${rest}.` : "";
	const causeText = capitalizeFirst(uniqueInOrder(causes).join("; "));
	const actionText = capitalizeFirst(joinWithAnd(uniqueInOrder(actions)));

	return `${causeText}. ${actionText}, затем повторите ${options.retryAction}.${tail}`;
}
