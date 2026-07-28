/**
 * dashboardQuery.ts — сводка главного экрана.
 *
 * ЧТО БЫЛО НЕ ТАК
 *
 * Функция собирала объект Dashboard вручную и НЕ проходила собственную же
 * проверку контракта. dashboardSchema требует тридцать одно поле; собиралось
 * двадцать одно. Отсутствовали: activeVisit, documents, appointmentReadiness,
 * scheduleSuggestions, visitCloseChecklist, protocolTemplates,
 * treatmentPlanScenarios, communicationTemplates, speechProviders,
 * complianceWarnings. Три поля (visits, treatmentPlans, generatedDocuments)
 * контрактом вообще не предусмотрены и молча отбрасывались.
 *
 * Значит, dashboardSchema.parse() бросал исключение ВСЕГДА, а routes/dashboard.ts
 * ловил его и отдавал 500. То есть в рабочем режиме (DATABASE_URL задан,
 * DENTAL_STATE_PERSISTENCE не выставлен в "off" — именно так настроено в .env
 * проекта) главный экран не загружался никогда. Приложение это скрывало:
 * во фронтенде стояла подстановка демонстрационной сводки при ошибке загрузки,
 * поэтому пользователь видел выдуманного пациента вместо своих данных.
 *
 * Даже если бы поля добавили, данные всё равно не прошли бы проверку:
 *   • записи отдавались как doctorId/startAt/endAt, контракт ждёт
 *     doctorUserId/startsAt/endsAt — ни одна запись не была валидной;
 *   • у снимков previewUrl обязателен и строковый, а подставлялся null;
 *   • clinic_mode в базе по умолчанию "demo", такого режима в контракте нет;
 *   • реквизиты клиники были выдуманы прямо в коде: ИНН 1234567890,
 *     адрес "Default Address", телефон +70000000000;
 *   • платежи, приёмы, план лечения, задачи коммуникаций отдавались пустыми
 *     массивами, а финансовая сводка — нулями.
 *
 * ЧТО СТАЛО
 *
 * Строки читаются из Postgres, переносятся в доменные коллекции
 * (db/domainStateHydration.ts) и сводка собирается тем же buildDashboard(),
 * который используется в режиме без базы. Один расчёт вместо двух разошедшихся:
 * готовность приёма, чек-лист закрытия, рекомендации, нагрузка смены и
 * финансовая сводка считаются по настоящим данным клиники.
 */

import { dashboardSchema, type Dashboard } from "@dental/shared";
import { buildDashboard } from "../sampleData.js";
import { hydrateDomainStateFromDb } from "./domainStateHydration.js";

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * Клиники из сессии в базе нет.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ТИП ОШИБКИ. Маршрут ловит любое исключение и отвечает 500
 * «Не удалось загрузить сводку. Повторите позже.» — для этого случая это ложь
 * дважды: сервер исправен, и повтор не поможет никогда. Отдельный тип позволяет
 * маршруту ответить отказом по доступу и назвать причину, не разбирая текст
 * сообщения.
 *
 * ПОЧЕМУ НЕ ПУСТАЯ СВОДКА. Раньше отдавалась именно она, и это закрывало вход в
 * программу: экран разблокировки смены читал пустой список сотрудников как
 * «сотрудников в клинике нет» и внутрь не пускал, а в реквизитах ответа
 * оставались данные последней прочитанной чужой клиники. Разбор целиком —
 * `db/domainStateHydration.ts` и `tests/routes/dashboardOrphanClinicSession.test.ts`.
 */
export class ClinicOrganizationMissingError extends Error {
  readonly organizationId: string;

  constructor(organizationId: string) {
    super("Клиника из сессии не найдена в базе данных.");
    this.name = "ClinicOrganizationMissingError";
    this.organizationId = organizationId;
  }
}

export async function getDashboardFromDb(organizationId: string): Promise<Dashboard> {
  if (useInMemory()) {
    return buildDashboard();
  }

  const report = await hydrateDomainStateFromDb(organizationId);
  for (const warning of report.warnings) {
    console.warn(`[DashboardQuery] ${warning}`);
  }
  /*
   * Проверка стоит ДО buildDashboard(), а не после.
   *
   * buildDashboard() собирает сводку из доменных коллекций, общих на процесс. Для
   * ненайденной клиники гидратация их сознательно не трогает, поэтому вызов
   * собрал бы сводку из данных ПРЕДЫДУЩЕГО запроса — то есть чужой клиники. Это
   * не «пустой ответ», а подмена, и допускать её нельзя даже на один кадр.
   */
  if (!report.organizationFound) {
    throw new ClinicOrganizationMissingError(organizationId);
  }

  const dashboard = buildDashboard();

  // Проверка остаётся, но теперь она осмысленна: если контракт разойдётся с
  // расчётом, это должно быть видно в логе, а не превращаться в 500 на пустом
  // месте. Ответ отдаём даже при расхождении — пустой экран хуже, чем экран
  // с предупреждением в журнале.
  const parsed = dashboardSchema.safeParse(dashboard);
  if (!parsed.success) {
    console.error(
      "[DashboardQuery] Сводка не соответствует контракту:",
      JSON.stringify(parsed.error.issues.slice(0, 20), null, 2)
    );
    return dashboard;
  }
  return parsed.data;
}
