import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { requestLoggingPlugin } from "../observability/index.js";
import { cacheHeadersPlugin } from "../plugins/cacheHeaders.js";
import { idempotencyPlugin } from "../plugins/idempotencyPlugin.js";
import { registerMedicalSecrecyPayloadStripping } from "../security/medicalSecrecyWarden.js";
import { registerRateLimiting } from "../security/rateLimit.js";
import { registerRouteNotFoundHandler } from "../utils/routeNotFound.js";

/**
 * Регистрация базовых Fastify плагинов безопасности, логирования и кэширования.
 * Порядок регистрации сохраняется со 100% точностью (Zero Logic Mutation).
 */
export async function registerCorePlugins(app: FastifyInstance): Promise<void> {
	// Сквозное структурированное логирование, Correlation ID и замер латентности
	await app.register(requestLoggingPlugin);

	// Потоковый multipart-парсер (1 файл за раз, жёсткий лимит под 4 ГБ ОЗУ — без буферизации в RAM)
	await app.register(multipart, {
		limits: {
			files: 1,
			fields: 20,
			fieldSize: 64 * 1024,
			fileSize: Number(process.env.DICOM_BODY_LIMIT_BYTES ?? 256 * 1024 * 1024),
		},
	});

	// HTTP кэширование справочников (ETag, Cache-Control, 304 Not Modified) для медленных HDD
	await app.register(cacheHeadersPlugin);

	// Защита от двойного списания, повторных транзакций и дедупликация (X-Idempotency-Key)
	await app.register(idempotencyPlugin);

	// Ограничение частоты запросов для аутентификации и публичных маршрутов.
	// Раньше в routes/auth.ts стоял config.rateLimit, но плагин @fastify/rate-limit
	// не установлен — конфигурация игнорировалась, и пароль кабинета можно было
	// перебирать без ограничений.
	registerRateLimiting(app);

	// 152-ФЗ / 323-ФЗ ст. 13: Глобальное аппаратное усечение полезной нагрузки (Payload Stripping)
	// Данные врачебной тайны (диагнозы, одонтограмма, ЭМК, клинические заметки) физически вырезаются
	// из JSON-ответов сервера ДО отправки на клиент для ролей marketer, receptionist, admin (без клинической роли).
	registerMedicalSecrecyPayloadStripping(app);

	// Несуществующий адрес: канонический русский ответ.
	// Несуществующий адрес отвечал штатным английским текстом Fastify с методом и
	// путём внутри; фильтр клиента строку без русских букв отбрасывает целиком,
	// поэтому человек не получал ни причины, ни шага. Текст и причина — в
	// utils/routeNotFound.ts.
	registerRouteNotFoundHandler(app);
}
