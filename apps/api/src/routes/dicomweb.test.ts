import { test } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerDicomwebRoutes } from "./dicomweb.js";

/**
 * Тест ничего не пишет на диск.
 *
 * Раньше он создавал ".data/dicom/test.dcm" по пути
 * path.resolve(process.cwd(), "../../.data/dicom") и затирал этим файл,
 * который лежит в репозитории под контролем версий: вместо снимка на 121 КБ
 * оставалось 19 байт "dummy dicom content". Прогон тестов портил рабочее
 * дерево.
 *
 * Для проверки заголовка файл не нужен: @fastify/cors выставляет
 * Access-Control-Allow-Origin на уровне хука, то есть и на 200, и на 404.
 * Проверяется главное — что обработчик не подменяет политику звёздочкой.
 */
test("DICOM route does not return wildcard CORS", async () => {
  const app = Fastify();
  await app.register(cors, { origin: "http://example.com" });
  await registerDicomwebRoutes(app);

  const response = await app.inject({
    method: "GET",
    url: "/api/dicomweb/studies/1/series/1/instances/1",
    headers: {
      origin: "http://example.com"
    }
  });

  assert.strictEqual(response.headers["access-control-allow-origin"], "http://example.com");
  assert.notStrictEqual(response.headers["access-control-allow-origin"], "*");

  await app.close();
});
