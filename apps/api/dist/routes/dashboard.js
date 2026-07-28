import { getDashboardFromDb } from "../db/dashboardQuery.js";
import { requireOrganizationId } from "../security/identity.js";
export async function registerDashboardRoutes(app) {
    app.get("/api/dashboard", async (request, reply) => {
        // БЫЛО: без токена orgId молча становился "00000000-...-0001", и любой
        // анонимный запрос получал финансовую сводку демо-организации. Плюс секрет
        // подписи имел публичный фолбэк "dente_jwt_secret_demo" — токен можно было
        // подделать для любой клиники.
        // СТАЛО: организация только из подписанного токена, иначе 401.
        const orgId = requireOrganizationId(request, reply);
        if (!orgId)
            return;
        try {
            return await getDashboardFromDb(orgId);
        }
        catch (error) {
            // Раньше текст ошибки БД уходил клиенту (details: e.message) — это
            // раскрывало структуру базы и пути на сервере.
            request.log.error({ err: error }, "[Dashboard] Ошибка получения данных из БД");
            return reply.code(500).send({
                error: "DatabaseError",
                message: "Не удалось загрузить сводку. Повторите позже."
            });
        }
    });
}
