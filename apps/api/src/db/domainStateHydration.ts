/**
 * domainStateHydration.ts — канонический фасад наполнения доменного состояния клиники из PostgreSQL.
 * Архитектурно декомпозирован в директорию `./domainHydration/` (Types, Extractors, Validators, Pipeline).
 */
import {
	type DomainState,
	type DomainStateHydrationReport,
	type HydratedDomainState,
	assertCriticalSlicesAvailable,
	hydrateDomainStateFromDb as hydrateDomainStateInternal,
} from "./domainHydration/index.js";

export type { DomainState, DomainStateHydrationReport, HydratedDomainState };
export { assertCriticalSlicesAvailable };

/** В режиме "off" источник истины — сами доменные массивы, синхронизировать нечего. */
function inMemoryMode(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * Собрать срез клиники из базы данных PostgreSQL.
 * Сохраняет 100% обратной совместимости вызова.
 */
export async function hydrateDomainStateFromDb(
	organizationId: string,
): Promise<HydratedDomainState> {
	return hydrateDomainStateInternal(organizationId, {
		isInMemory: inMemoryMode(),
	});
}
