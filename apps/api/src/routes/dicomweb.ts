import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import dicomParser from "dicom-parser";
import { and, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { requireOrganizationId } from "../security/identity.js";

/**
 * WADO-RS-образная выдача одного DICOM-объекта.
 *
 * БЫЛО (и это дефект безопасности пациента, а не косметика): обработчик
 * разбирал :studyUid/:seriesUid/:instanceUid и не использовал НИ ОДИН из них.
 * Любой UID — существующий, чужой, выдуманный — приводил к отдаче одного и
 * того же файла .data/dicom/test.dcm с заголовком application/dicom и кодом
 * 200. Просмотрщик не мог отличить настоящее исследование от заглушки: он
 * получал корректные байты DICOM на любой запрос. В стоматологии это значит,
 * что врач планирует удаление или имплантацию по анатомии другого человека.
 * Ни организации, ни авторизации маршрут не проверял вовсе — снимки отдавались
 * кому угодно, включая соседнюю клинику в той же установке.
 *
 * СТАЛО: UID обязан разрешиться в конкретный файл, и разрешение идёт только
 * внутри организации из подписанного токена. Порядок источников:
 *   1. imaging_instances -> imaging_series -> imaging_studies. Совпасть должны
 *      все три UID сразу, и все три строки должны принадлежать этой клинике.
 *      Это единственный путь, пригодный для многокадровых исследований (в КЛКТ
 *      сотни объектов, у исследования в целом один storage_path на них не
 *      хватает). Здесь база — индекс истины, повторно разбирать байты незачем.
 *   2. imaging_studies.storage_path — то, что реально заполняется сегодня через
 *      POST /api/imaging/studies и читается в imaging.ts при анализе. Строка
 *      подтверждает ТОЛЬКО UID исследования, поэтому серию и объект обязаны
 *      подтвердить сами байты файла: иначе тот же обман вернулся бы уровнем
 *      выше — один файл на любую серию внутри исследования.
 *   3. Демонстрационный файл. Отдаётся исключительно под теми UID, которые
 *      физически записаны в нём самом. Никакого списка «разрешённых» UID в
 *      коде нет: тождество файла берётся из файла.
 * Если ни один источник не подтвердил все три UID — 404 с машиночитаемым
 * кодом. Просмотрщик, который не показал ничего, безопасен; просмотрщик,
 * показавший чужой снимок, — нет.
 *
 * ЧЕГО ЗДЕСЬ НЕТ: QIDO-RS (поиск исследований/серий), /metadata, /frames,
 * /bulkdata, multipart/related. Зарегистрирован ровно один ресурс — объект.
 */

/** Теги DICOM — часть протокола, а не настройка приложения. */
const TAG_SOP_INSTANCE_UID = "x00080018";
const TAG_STUDY_INSTANCE_UID = "x0020000d";
const TAG_SERIES_INSTANCE_UID = "x0020000e";

/**
 * Сколько байт от начала файла читать, чтобы достать три UID. Идентификаторы
 * лежат в группах 0008 и 0020, то есть в самом начале набора данных: полный
 * том КЛКТ на гигабайты ради них читать нельзя. Разбор останавливается на
 * теге серии (0020,000E), дальше пиксельные данные не трогаются.
 */
const DICOM_HEADER_PROBE_BYTES = 1024 * 1024;

/** Переменная окружения с путём к демонстрационному файлу. */
const SAMPLE_DICOM_PATH_ENV = "DENTE_DICOM_SAMPLE_PATH";

interface DicomFileIdentity {
  studyUid: string | null;
  seriesUid: string | null;
  sopInstanceUid: string | null;
}

/**
 * UID в DICOM выравнивается до чётной длины хвостовым NUL, а некоторые
 * записывающие устройства добавляют пробел. Сравнивать нужно очищенные
 * значения, иначе верный файл будет отвергнут из-за одного байта набивки.
 */
function normalizeUid(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\0+$/u, "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Читает три UID из заголовка файла. Возвращает null, если файл не читается,
 * не является файлом, не разбирается как DICOM или его синтаксис передачи
 * требует распаковки (сжатый deflate-набор данных без inflater). Во всех этих
 * случаях байты не подтверждают запрошенный UID — значит, отдавать их нельзя.
 */
async function readDicomIdentity(filePath: string): Promise<DicomFileIdentity | null> {
  let handle: FileHandle | null = null;
  try {
    handle = await fs.open(filePath, "r");
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size === 0) return null;
    const length = Math.min(stat.size, DICOM_HEADER_PROBE_BYTES);
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    const dataSet = dicomParser.parseDicom(new Uint8Array(buffer.subarray(0, bytesRead)), {
      untilTag: TAG_SERIES_INSTANCE_UID
    });
    return {
      studyUid: normalizeUid(dataSet.string(TAG_STUDY_INSTANCE_UID)),
      seriesUid: normalizeUid(dataSet.string(TAG_SERIES_INSTANCE_UID)),
      sopInstanceUid: normalizeUid(dataSet.string(TAG_SOP_INSTANCE_UID))
    };
  } catch {
    return null;
  } finally {
    // Дескриптор закрывается всегда: при отказе разбора файл иначе остаётся
    // открытым до сборки мусора, а маршрут вызывается на каждый кадр.
    if (handle) {
      await handle.close().catch(() => undefined);
    }
  }
}

/** Подтверждают ли сами байты файла, что это именно запрошенный объект. */
async function fileCarriesRequestedUids(
  filePath: string,
  studyUid: string,
  seriesUid: string,
  instanceUid: string
): Promise<boolean> {
  const identity = await readDicomIdentity(filePath);
  if (!identity) return false;
  return (
    identity.studyUid === studyUid &&
    identity.seriesUid === seriesUid &&
    identity.sopInstanceUid === instanceUid
  );
}

/**
 * Путь к демонстрационному файлу. Настраивается через окружение; значение по
 * умолчанию сохраняет прежнее размещение в репозитории (.data/dicom/test.dcm
 * относительно корня монорепозитория, сервер запускается из apps/api).
 */
function sampleDicomPath(): string {
  const configured = process.env[SAMPLE_DICOM_PATH_ENV]?.trim();
  if (configured) return path.resolve(configured);
  return path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
}

/**
 * Ищет файл, который действительно является запрошенным объектом в пределах
 * организации. Возвращает абсолютный путь либо null. Ответ «не найдено»
 * одинаков и для несуществующего UID, и для UID чужой клиники — иначе по
 * коду ответа можно было бы перебором выяснить, какие исследования есть у
 * соседней организации.
 */
async function resolveInstanceFilePath(
  organizationId: string,
  studyUid: string,
  seriesUid: string,
  instanceUid: string
): Promise<string | null> {
  const [instanceRow] = await db
    .select({ storagePath: schema.imagingInstances.storagePath })
    .from(schema.imagingInstances)
    .innerJoin(schema.imagingSeries, eq(schema.imagingSeries.id, schema.imagingInstances.seriesId))
    .innerJoin(schema.imagingStudies, eq(schema.imagingStudies.id, schema.imagingSeries.studyId))
    .where(
      and(
        // Организация проверяется на каждом уровне соединения: одной строки с
        // неверной ссылкой достаточно, чтобы снимок ушёл в другую клинику.
        eq(schema.imagingInstances.organizationId, organizationId),
        eq(schema.imagingSeries.organizationId, organizationId),
        eq(schema.imagingStudies.organizationId, organizationId),
        eq(schema.imagingStudies.dicomStudyUid, studyUid),
        eq(schema.imagingSeries.dicomSeriesUid, seriesUid),
        eq(schema.imagingInstances.dicomSopInstanceUid, instanceUid)
      )
    )
    .limit(1);

  if (instanceRow?.storagePath) return path.resolve(instanceRow.storagePath);

  const [studyRow] = await db
    .select({ storagePath: schema.imagingStudies.storagePath })
    .from(schema.imagingStudies)
    .where(
      and(
        eq(schema.imagingStudies.organizationId, organizationId),
        eq(schema.imagingStudies.dicomStudyUid, studyUid),
        isNotNull(schema.imagingStudies.storagePath)
      )
    )
    .limit(1);

  if (studyRow?.storagePath) {
    const studyFilePath = path.resolve(studyRow.storagePath);
    if (await fileCarriesRequestedUids(studyFilePath, studyUid, seriesUid, instanceUid)) {
      return studyFilePath;
    }
  }

  const samplePath = sampleDicomPath();
  if (await fileCarriesRequestedUids(samplePath, studyUid, seriesUid, instanceUid)) {
    return samplePath;
  }

  return null;
}

export async function registerDicomwebRoutes(app: FastifyInstance) {
  app.get<{ Params: { studyUid: string; seriesUid: string; instanceUid: string } }>(
    "/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid",
    async (request, reply) => {
      if (!(await requireClinicalReadAccess(request, reply, "dicom instance read"))) return;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) return;

      const studyUid = normalizeUid(request.params.studyUid);
      const seriesUid = normalizeUid(request.params.seriesUid);
      const instanceUid = normalizeUid(request.params.instanceUid);
      if (!studyUid || !seriesUid || !instanceUid) {
        return reply.code(400).send({
          error: "DicomInstanceUidMissing",
          message: "Снимок не выдан: в адресе должны быть указаны UID исследования, серии и объекта."
        });
      }

      const filePath = await resolveInstanceFilePath(organizationId, studyUid, seriesUid, instanceUid);
      if (!filePath) {
        request.log.warn(
          { organizationId, studyUid, seriesUid, instanceUid },
          "[dicomweb] Запрошенный DICOM-объект не найден в этой клинике — байты не выданы"
        );
        return reply.code(404).send({
          error: "DicomInstanceNotFound",
          message: "Снимок с таким UID в этой клинике не найден. Показ чужого исследования вместо него исключён.",
          studyUid,
          seriesUid,
          instanceUid
        });
      }

      let size: number;
      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) throw new Error("not a regular file");
        size = stat.size;
      } catch (statError) {
        request.log.error(
          { err: statError, organizationId, studyUid, seriesUid, instanceUid },
          "[dicomweb] Файл объекта числится в базе, но не читается с диска"
        );
        return reply.code(404).send({
          error: "DicomInstanceFileUnreadable",
          message: "Файл снимка не читается с диска: проверьте подключение хранилища. Другой снимок вместо него не выдаётся.",
          studyUid,
          seriesUid,
          instanceUid
        });
      }

      reply.header("Content-Type", "application/dicom");
      reply.header("Content-Length", size);
      // БЫЛО: reply.header("Access-Control-Allow-Origin", "*") — маршрут сам
      // выставлял разрешение для любого источника и тем самым перебивал общую
      // политику CORS приложения (server.ts регистрирует @fastify/cors со
      // списком webOrigins). Речь о выдаче DICOM-снимков, то есть медицинских
      // данных: со звёздочкой их мог вычитать любой сторонний сайт. Заголовок
      // убран — источник определяет общая политика.
      return reply.send(createReadStream(filePath));
    }
  );
}
