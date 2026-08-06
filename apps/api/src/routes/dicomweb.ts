import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import dicomParser from "dicom-parser";
import { and, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
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
 *   3. Демонстрационный файл. Отдаётся только той организации, которой он
 *      назначен явно через DENTE_DICOM_SAMPLE_ORGANIZATION_ID, и только под
 *      теми UID, которые физически записаны в нём самом. Никакого списка
 *      «разрешённых» UID в коде нет: тождество файла берётся из файла.
 *      Переменная не задана — ветки образца нет ни для кого.
 * Если ни один источник не подтвердил все три UID — 404 с машиночитаемым
 * кодом. Просмотрщик, который не показал ничего, безопасен; просмотрщик,
 * показавший чужой снимок, — нет.
 *
 * ВТОРОЙ ДЕФЕКТ, ЗАКРЫТЫЙ ЗДЕСЬ (ветка 3 не смотрела на организацию вовсе):
 * подписанный токен другой клиники получал те же байты образца, и токен с
 * идентификатором организации, которого нет ни в одной строке organizations, —
 * тоже. Подпись токена доказывает лишь то, что токен выдал этот сервер; она не
 * доказывает, что организация существует. Теперь организация из токена сверяется
 * с таблицей organizations до любого обращения к диску, а образец привязан к
 * конкретному владельцу. Неизвестный арендатор не проходит на этом маршруте
 * никуда.
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

/**
 * Переменная окружения с организацией-владельцем демонстрационного файла.
 * Не задана — образец не отдаётся никому, включая единственную организацию
 * установки. Отказ по умолчанию: у файла на диске нет строки в базе, а значит
 * нет и владельца, которого можно вывести, — его обязан назвать оператор.
 */
const SAMPLE_DICOM_ORGANIZATION_ID_ENV = "DENTE_DICOM_SAMPLE_ORGANIZATION_ID";

/**
 * Форма UUID без привязки к версии. Нужна ровно для одного: не отправлять в
 * PostgreSQL строку, которая не приводится к типу uuid (organizations.id —
 * колонка uuid, ошибка 22P02 превратила бы честный отказ в 500). Нулевой UUID
 * 00000000-0000-0000-0000-000000000000 форму проходит намеренно: существует
 * организация или нет — решает база, а не регулярное выражение.
 */
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

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
 * Организация-владелец демонстрационного файла либо null.
 *
 * БЫЛО: у файла не было владельца, и ветка образца не спрашивала организацию —
 * то есть владельцем была любая организация с подписанным токеном, включая ту,
 * которой нет в базе. Комментарий на этом месте честно описывал границу, но
 * границей она от этого не становилась: код её не проверял.
 *
 * СТАЛО: владельца называет оператор. Значение не задано или не UUID — ветки
 * образца нет. Это дороже для разработчика (без переменной локальный
 * просмотрщик образца не покажет) и правильнее для пациента: если
 * DENTE_DICOM_SAMPLE_PATH направить на настоящий снимок, безвладельческий файл
 * стал бы читаемым для всех клиник установки.
 */
function sampleDicomOwnerOrganizationId(): string | null {
  const configured = process.env[SAMPLE_DICOM_ORGANIZATION_ID_ENV]?.trim();
  if (!configured || !UUID_SHAPE.test(configured)) return null;
  return configured;
}

/**
 * Существует ли организация с таким идентификатором.
 *
 * ЗАЧЕМ ЭТО ЗДЕСЬ, А НЕ В ОБЩЕМ ГЕЙТЕ: requireOrganizationId
 * (security/identity.ts) возвращает organizationId прямо из проверенной подписи
 * и в базу не смотрит. Подпись доказывает авторство сервера, а не существование
 * арендатора: токен с любым UUID, подписанный этим секретом, проходил как
 * действительный. Это свойство общего гейта, оно касается всех маршрутов и
 * правится отдельно — но данный маршрут отдаёт медицинские байты, поэтому он
 * проверяет арендатора сам и сейчас.
 *
 * Бросает исключение, если база недоступна: вызывающий обязан различать «такой
 * организации нет» и «проверить не удалось». Подставить false во втором случае
 * значило бы выдать выдуманный ответ за проверенный.
 */
async function organizationExists(organizationId: string): Promise<boolean> {
  if (!UUID_SHAPE.test(organizationId)) return false;
  const [row] = await db
    .select({ id: schema.organizations.id })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, organizationId))
    .limit(1);
  return typeof row?.id === "string";
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

  // Ветка образца проходит тот же арендный гейт, что и настоящее исследование:
  // спрашивающая организация обязана быть той, которой образец назначен. Раньше
  // здесь не было ни одного упоминания organizationId — и это была единственная
  // ветка маршрута, отдававшая байты кому угодно.
  const sampleOwnerOrganizationId = sampleDicomOwnerOrganizationId();
  if (sampleOwnerOrganizationId !== null && sampleOwnerOrganizationId === organizationId) {
    const samplePath = sampleDicomPath();
    if (await fileCarriesRequestedUids(samplePath, studyUid, seriesUid, instanceUid)) {
      return samplePath;
    }
  }

  return null;
}

export async function registerDicomwebRoutes(app: FastifyInstance) {
  app.get<{ Params: { studyUid: string; seriesUid: string; instanceUid: string } }>(
    "/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid",
    /*
     * ТРАНЗАКЦИЯ НЕ ДЕРЖИТСЯ НА ВРЕМЯ ПЕРЕДАЧИ СНИМКА.
     *
     * Тело ответа — поток файла DICOM. Один кадр это мегабайты, том КЛКТ —
     * сотни мегабайт и тысячи объектов, и время передачи задаёт клиент.
     * Автоматическая обёртка server.ts держала бы транзакцию и соединение из
     * пула (их 10) всё это время: десяти одновременных выгрузок хватало, чтобы
     * API перестал получать соединения вовсе, а бэкенды висели
     * `idle in transaction` и держали VACUUM. Развёрнутое объяснение механизма —
     * в server.ts у хука onRoute.
     *
     * Флаг снимает только автоматику. Обе проверки, которые смотрят в базу —
     * существование организации и разрешение трёх UID в конкретный файл — идут
     * ниже внутри одного явного withTenantCtx и заканчиваются ДО первого байта
     * тела. Обхода RLS здесь нет и быть не может: без контекста арендатора
     * политики закрыты, и маршрут вернул бы 403/404, а не чужой снимок.
     */
    { config: { tenantTxSelfManaged: true } },
    async (request, reply) => {
      if (!(await requireClinicalReadAccess(request, reply, "dicom instance read"))) return;
      const organizationId = requireOrganizationId(request, reply);
      if (!organizationId) return;

      const studyUid = normalizeUid(request.params.studyUid);
      const seriesUid = normalizeUid(request.params.seriesUid);
      const instanceUid = normalizeUid(request.params.instanceUid);

      // Идентификатор организации не в формате UUID отсекается ДО открытия
      // транзакции: соединение из пула на заведомо неверного арендатора не
      // тратится, и в базу такой запрос не уходит вовсе. Тот же ответ дал бы
      // organizationExists ниже — он тоже начинается с проверки формы.
      if (!UUID_SHAPE.test(organizationId)) {
        request.log.warn(
          { organizationId },
          "[dicomweb] Идентификатор организации не в формате UUID — снимок не выдан"
        );
        return reply.code(403).send({
          error: "OrganizationUnknown",
          message: "Снимок не выдан: организация из токена не существует."
        });
      }

      // Организация обязана существовать. Проверка стоит до разбора адреса:
      // неизвестному арендатору не сообщается даже то, правильно ли он составил
      // запрос. Отказ по причине недоступной базы отделён от отказа по причине
      // отсутствующей организации — иначе авария хранилища выглядела бы как
      // проверенный вывод «такой клиники нет». Различие сохранено и внутри
      // транзакции: сбой проверки организации даёт 503 ниже, а сбой разрешения
      // UID по-прежнему уходит в общий обработчик ошибок как 500.
      //
      // Оба обращения к базе выполняются в одной транзакции арендатора и
      // закрывают её до того, как начнётся передача файла.
      const resolution = await withTenantCtx(organizationId, async () => {
        let organizationKnown: boolean;
        try {
          organizationKnown = await organizationExists(organizationId);
        } catch (lookupError) {
          return { organizationCheckFailed: true as const, lookupError, organizationKnown: false, filePath: null };
        }
        if (!organizationKnown || !studyUid || !seriesUid || !instanceUid) {
          return { organizationCheckFailed: false as const, lookupError: null, organizationKnown, filePath: null };
        }
        return {
          organizationCheckFailed: false as const,
          lookupError: null,
          organizationKnown,
          filePath: await resolveInstanceFilePath(organizationId, studyUid, seriesUid, instanceUid)
        };
      });

      if (resolution.organizationCheckFailed) {
        request.log.error(
          { err: resolution.lookupError, organizationId },
          "[dicomweb] Не удалось проверить организацию запроса — снимок не выдан"
        );
        return reply.code(503).send({
          error: "OrganizationCheckUnavailable",
          message:
            "Снимок не выдан: не удалось проверить организацию запроса. Повторите позже — выдача без проверки клиники запрещена."
        });
      }
      if (!resolution.organizationKnown) {
        request.log.warn(
          { organizationId },
          "[dicomweb] Токен подписан, но организации с таким идентификатором нет — снимок не выдан"
        );
        return reply.code(403).send({
          error: "OrganizationUnknown",
          message: "Снимок не выдан: организация из токена не существует."
        });
      }

      if (!studyUid || !seriesUid || !instanceUid) {
        return reply.code(400).send({
          error: "DicomInstanceUidMissing",
          message: "Снимок не выдан: в адресе должны быть указаны UID исследования, серии и объекта."
        });
      }

      const filePath = resolution.filePath;
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
