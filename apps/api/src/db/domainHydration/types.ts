import type { DomainState } from "../../types/domainState.js";

export type { DomainState };

/**
 * Отчёт о том, что удалось перенести. Строки, не прошедшие проверку контракта,
 * пропускаются поимённо, а не роняют весь ответ: одна кривая запись в базе не
 * должна гасить рабочий день всей клиники.
 */
export interface DomainStateHydrationReport {
	organizationId: string;
	mode: "in_memory" | "database";
	/**
	 * Нашлась ли организация сессии в базе.
	 *
	 * ЗАЧЕМ ОТДЕЛЬНОЕ ПОЛЕ, А НЕ СТРОКА В `warnings`. Раньше об этом сообщала
	 * только строка предупреждения, и единственный её читатель печатал её в
	 * журнал сервера, после чего отдавал клиенту ответ как при успехе. Отказ,
	 * доступный лишь как текст в списке текстов, читать никто не станет: решение
	 * «отдавать данные или отказать» должно приниматься по значению, а не по
	 * совпадению подстроки.
	 *
	 * В режиме без базы всегда `true`: там источник истины — сами доменные
	 * массивы, и искать организацию негде.
	 */
	organizationFound: boolean;
	counts: Record<string, number>;
	skipped: Record<string, number>;
	warnings: string[];
	/**
	 * Срезы, которые прочитать НЕ УДАЛОСЬ, и причина по каждому.
	 *
	 * Отдельно от `warnings`, по той же причине, по которой `organizationFound`
	 * отделён от них: решение «отдавать данные или отказать» принимается по
	 * значению, а не по совпадению подстроки в списке текстов.
	 */
	unavailable: Array<{ slice: string; message: string }>;
}

/** Срез клиники вместе с отчётом о том, что удалось прочитать. */
export interface HydratedDomainState {
	state: DomainState;
	report: DomainStateHydrationReport;
}

/** Опции гидратации доменного состояния. */
export interface HydrationOptions {
	isInMemory?: boolean;
}
