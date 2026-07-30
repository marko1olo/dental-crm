/**
 * Выгрузка настоящей сводки главного экрана для демо-клиники снимков.
 *
 * ЗАЧЕМ. Общий dev-сервер на 4100 подписывает токены ЭФЕМЕРНЫМ секретом (файла
 * .data/dev-auth-secret он не читает — проверено: токен, подписанный обоими
 * файлами на диске, получает 401), поэтому войти в клинику с данными снаружи
 * нельзя, а демо-вход doctor@clinic.com ведёт в организацию без пациентов.
 * Перезапускать чужой сервер — не моя зона.
 *
 * Поэтому сводка считается ЗДЕСЬ, той же цепочкой, что у сервера
 * (db/dashboardQuery.ts -> hydrateDomainStateFromDb -> buildDashboard), и
 * подставляется в браузер вместо ответа /api/dashboard. Подменяется только
 * доставка данных: сами данные — из живой PostgreSQL, а вёрстка, CSS и React
 * в браузере настоящие.
 *
 * ЗАПУСК (cwd apps/api):
 *   cd apps/api && node --import tsx ../../scratch/recon-dump-dashboard.ts
 * Кладёт scratch/recon-dashboard-d001.json. Только чтение.
 */

import { writeFile } from "node:fs/promises";
import { pool } from "../apps/api/src/db/client.js";
import { getDashboardFromDb } from "../apps/api/src/db/dashboardQuery.js";

const ORG_ID = "d0000000-0000-4000-8000-00000000d001";
const OUT = "C:/Clinic_MVP/dental-crm/scratch/recon-dashboard-d001.json";

const dashboard = await getDashboardFromDb(ORG_ID);
await writeFile(OUT, JSON.stringify(dashboard), "utf8");
console.log(
	`записано ${OUT}: пациентов ${dashboard.patients?.length ?? 0}, ` +
		`patientInsights ${dashboard.patientInsights?.length ?? 0}`,
);
await pool.end();
