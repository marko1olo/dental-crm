import {
	type DentalMaterialKind,
	type DentalRestorationType,
	type DentalSpecialty,
	type ServiceCategory,
} from "@dental/shared";

export type KeywordRule<T extends string> = {
	value: T;
	label?: string;
	patterns: RegExp[];
};

export type Classification = {
	category: ServiceCategory;
	specialty: DentalSpecialty;
	treatmentKind: string;
};

export type MaterialClassification = {
	materialKind: DentalMaterialKind;
	restorationType: DentalRestorationType;
	crownType: string | null;
	brand: string | null;
	unit: string;
	toothScope: string | null;
};

export type GroqChatPayload = {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type?: string; text?: string }>;
		};
	}>;
	error?: {
		message?: string;
	};
};

/*
 * Версия промпта — v2: в системный промпт добавлено перечисление допустимых
 * значений crownType (их не было, при четырёх перечисленных соседях). Номер
 * уходит клиенту как groqJsonPromptVersion, поэтому текст промпта нельзя менять,
 * оставляя прежний номер: тогда номер перестаёт что-либо идентифицировать.
 */
export const groqPromptVersion = "pricelist-json-v2";
export const maxGroqImagesPerRequest = 1;
export const groqProviderId = "groq_whisper" as const;

/*
 * Верхняя граница длительности услуги в минутах — десять часов.
 *
 * Число стояло вписанным прямо в durationFromLine и БОЛЬШЕ НИГДЕ, поэтому
 * нейро-ветка разбора не проверяла длительность вообще: модель могла вернуть
 * durationMinutes: 99999, и запись на приём растянулась бы на 69 суток.
 * Одна граница на оба режима разбора, а не два разных представления о том,
 * сколько может длиться приём.
 */
export const maxServiceDurationMinutes = 600;

/**
 * Отрезок исходной строки, из которого РЕАЛЬНО прочитана цена.
 *
 * Название услуги теряет ровно этот отрезок и ничего больше — см.
 * stripPriceFromTitle.
 */
export type PriceSpan = { start: number; end: number };

export type PriceCandidate = PriceSpan & {
	priceRub: number;
	priceMaxRub: number | null;
	explicit: boolean;
	/** Число приклеено к букве слева — см. gluedToWordPattern. */
	glued: boolean;
};

/**
 * КАЛЕНДАРНАЯ ОПОРА РАЗБОРА: год, который для ЭТОГО разбора считается
 * сегодняшним.
 *
 * ЗАЧЕМ ВХОД, А НЕ ЧТЕНИЕ ЧАСОВ НА МЕСТЕ. Окно года редакции обязано считаться
 * от сегодняшней даты — это сказано выше и остаётся верным. Но пока
 * `new Date().getFullYear()` стоял ВНУТРИ looksLikeEditionYear, у результата
 * разбора не было опоры, кроме даты прогона:
 *   • один и тот же прайс разбирался по-разному в разные годы, и никто этого не
 *     выбирал. Измерено подменой Date.prototype.getFullYear (зонд, истинный код
 *     выхода 0): «Отбеливание 2025» отдаёт priceRub: null при часах 2026-2031 и
 *     2025 ₽ при часах 2032-2033 — заголовок раздела прайса становится услугой
 *     за 2025 ₽ сам собой, от смены года на машине;
 *   • разбор нельзя воспроизвести: чтобы объяснить клинике, почему в её прайсе
 *     цена не прочитана, надо знать не только текст, но и день прогона;
 *   • проверка, закрепляющая поведение на конкретном годе, молча перестаёт
 *     проверять дефект, когда окно с этого года уезжает, — и остаётся зелёной.
 *     Такая проверка хуже отсутствующей: она создаёт уверенность.
 * Часы читаются РОВНО ОДИН РАЗ на разбор — в calendarFromClock, у входа, — а год
 * едет вниз входом. Заодно это закрывает вторую, более редкую беду: чтение часов
 * стояло в цикле по кандидатам цены, и разбор, начавшийся 31 декабря, мог
 * применить к разным строкам ОДНОГО прайса разные окна.
 *
 * Календарь — отдельный тип, а не голое число, УМЫШЛЕННО: он едет пятым
 * аргументом рядом с номером строки и индексом записи, и два числа в такой
 * цепочке рано или поздно меняются местами молча. Тип делает подмену ошибкой
 * компиляции, а на месте вызова видно, что передаётся именно год.
 *
 * `generatedAt` в ответе часы читает по-прежнему и законно: там время генерации
 * ответа, а не вход разбора.
 */
export type PricelistCalendar = { currentYear: number };

/** Единственное место разбора прайса, где читаются часы машины. */
export function calendarFromClock(): PricelistCalendar {
	return { currentYear: new Date().getFullYear() };
}
