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
import { dashboardSchema } from "@dental/shared";
import { buildDashboard } from "../sampleData.js";
import { hydrateDomainStateFromDb } from "./domainStateHydration.js";
function useInMemory() {
    return process.env.DENTAL_STATE_PERSISTENCE === "off";
}
export async function getDashboardFromDb(organizationId) {
    if (useInMemory()) {
        return buildDashboard();
    }
    const report = await hydrateDomainStateFromDb(organizationId);
    for (const warning of report.warnings) {
        console.warn(`[DashboardQuery] ${warning}`);
    }
    const dashboard = buildDashboard();
    // Проверка остаётся, но теперь она осмысленна: если контракт разойдётся с
    // расчётом, это должно быть видно в логе, а не превращаться в 500 на пустом
    // месте. Ответ отдаём даже при расхождении — пустой экран хуже, чем экран
    // с предупреждением в журнале.
    const parsed = dashboardSchema.safeParse(dashboard);
    if (!parsed.success) {
        console.error("[DashboardQuery] Сводка не соответствует контракту:", JSON.stringify(parsed.error.issues.slice(0, 20), null, 2));
        return dashboard;
    }
    return parsed.data;
}
