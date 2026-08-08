import { type Dashboard, dashboardSchema } from "@dental/shared";
import { buildDashboard } from "../sampleData.js";
import {
	assertCriticalSlicesAvailable,
	hydrateDomainStateFromDb,
} from "./domainStateHydration.js";

export class ClinicOrganizationMissingError extends Error {
	readonly organizationId: string;

	constructor(organizationId: string) {
		super("Клиника из сессии не найдена в базе данных.");
		this.name = "ClinicOrganizationMissingError";
		this.organizationId = organizationId;
	}
}

/**
 * Собрать сводку клиники из базы.
 *
 * БЫЛО: вызывала buildDashboard() БЕЗ АРГУМЕНТА — это давало дефолтный
 * inMemoryDomainState, organizationId игнорировался, а ClinicOrganizationMissingError
 * не бросалась никогда. Сводка была ВЫДУМАННОЙ для любой клиники, включая
 * несуществующую.
 *
 * СТАЛО: читает срез клиники из базы, передаёт его в buildDashboard(state),
 * бросает ClinicOrganizationMissingError когда организации нет, и отказывает
 * громко когда сорвался критический срез (payments, treatmentItems, visits,
 * clinicalRules, patients) — по ним принимают денежное или клиническое решение.
 */
export async function getDashboardFromDb(
	organizationId: string,
): Promise<Dashboard> {
	const { state, report } = await hydrateDomainStateFromDb(organizationId);

	// Организации из сессии в базе нет — это 404/401, а не 5xx.
	if (!report.organizationFound) {
		throw new ClinicOrganizationMissingError(organizationId);
	}

	// Критический срез сорвался — отказываем громко (5xx), чтобы не отдать
	// нулевую выручку или пустой список противопоказаний как будто это факт.
	assertCriticalSlicesAvailable(report);

	// Печатаем предупреждения о пропущенных строках и деградировавших срезах.
	if (report.warnings.length > 0) {
		console.warn(
			`[DashboardQuery] Клиника ${organizationId}: ${report.warnings.length} предупреждений гидратации:`,
			report.warnings,
		);
	}

	const dashboard = buildDashboard(state);

	// Проверка контракта остаётся, но теперь она ДИАГНОСТИРУЕТ, а не молчит.
	const parsed = dashboardSchema.safeParse(dashboard);
	if (!parsed.success) {
		console.error(
			`[DashboardQuery] Клиника ${organizationId}: сводка НЕ соответствует контракту dashboardSchema.`,
			"Ошибки валидации:",
			JSON.stringify(parsed.error.errors, null, 2),
			"Счётчики гидратации:",
			report.counts,
			"Пропущено строк:",
			report.skipped,
		);
		// БЫЛО: возвращала невалидное всё равно. СТАЛО: бросаем — невалидную
		// сводку отдавать нельзя, клиент получит несходящиеся расчёты.
		throw new Error(
			`Сводка клиники ${organizationId} не прошла проверку контракта: ${parsed.error.errors.length} нарушений. ` +
				"Первое: " +
				(parsed.error.errors[0]
					? `${parsed.error.errors[0].path.join(".")} — ${parsed.error.errors[0].message}`
					: "см. журнал сервера"),
		);
	}

	return parsed.data;
}
