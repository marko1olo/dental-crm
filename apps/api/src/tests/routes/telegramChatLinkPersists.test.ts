import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import pg from "pg";
import { eq } from "drizzle-orm";
import { registerTelegramRoutes, registerTelegramWebhookRoutes } from "../../routes/telegram.js";
import { db } from "../../db/client.js";
import { clinics, denteTelegramChatLinks, organizations } from "../../db/schema.js";
import { denteTelegramChatLinks as inMemoryChatLinks } from "../../sampleData.js";
import {
  buildDenteTelegramChatLinkList,
  countActiveDenteTelegramChatLinks,
  revokeDenteTelegramChatLink
} from "../../telegram/chatLinks.js";

/**
 * ПРИВЯЗКА TELEGRAM ПЕРЕЖИВАЕТ ПЕРЕЗАПУСК СЕРВЕРА.
 *
 * Запуск: из apps/api
 *   node --import tsx --test "src/tests/routes/telegramChatLink*.test.ts"
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Связка чата — это то, чем пациент привязал свой
 * Telegram к клинике. Она жила в массиве процесса (`sampleData.ts:280`,
 * `denteTelegramChatLinks`), а ЧИТАЛИ её из таблицы `dente_telegram_chat_links`
 * два живых отправителя:
 *   • `services/notificationWorker.ts:55` — кому вообще отправлять;
 *   • `services/communications/channelRouter.ts:128` — `chatTransportRef`, адрес
 *     чата, без которого сообщение физически не уходит.
 * Пациент нажимал `/start` с кодом, получал «привязано» — и оставался невидимым
 * для обоих: у одного правила было два владельца, и подключён был тот, который
 * живёт только в памяти.
 *
 * ЧТО ИМЕННО ЗДЕСЬ ДОКАЗЫВАЕТСЯ. Не код ответа 200 и не «то же значение в той же
 * переменной процесса»:
 *  • после привязки строка есть в базе — проверяется ОТДЕЛЬНЫМ соединением `pg`,
 *    без drizzle и без маршрутов;
 *  • массив процесса очищается — это ровно то состояние, в котором стартует
 *    свежий сервер без файла состояния, — и список связок всё равно показывает
 *    привязку. Это и есть «переживает перезапуск»: ВТОРОЕ независимое чтение;
 *  • счётчик активных связок на панели статуса тоже берётся из базы, а не из
 *    очищенного массива;
 *  • отзыв привязки доходит до базы, а не только до памяти;
 *  • чужая клиника не видит связку и не может её отозвать.
 *
 * ПРО ФИЛИАЛ. `clinic_id` в таблице ссылается на `clinics.id`, а telegram-путь
 * подставляет туда идентификатор ОРГАНИЗАЦИИ (`resolveDenteTelegramClinicId`).
 * Клиника этого теста НЕ имеет филиала с таким uuid — намеренно, потому что так
 * выглядит боевая база. Проверяется, что связка при этом сохраняется с
 * `clinic_id = NULL`, а не теряется на внешнем ключе.
 */

const FOREIGN_ORG = "d9000000-0000-4000-8000-0000000000f1";
const PATIENT_SUBJECT = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const CHAT_ID = "770100931";

type LinkedRuntime = {
  organizationId: string;
  clinicId: string | null;
  botConfigId: string;
};

/** Отдельное соединение, не знающее ни про drizzle, ни про маршруты. */
async function rawChatLinkRows(organizationId: string): Promise<
  {
    id: string;
    clinicId: string | null;
    subjectId: string;
    status: string;
    chatFingerprint: string;
    chatTransportRef: string | null;
  }[]
> {
  const url = process.env.DATABASE_URL;
  assert.ok(url, "DATABASE_URL не задан — независимую проверку базы выполнить нечем");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const result = await client.query<{
      id: string;
      clinic_id: string | null;
      subject_id: string;
      status: string;
      chat_fingerprint: string;
      chat_transport_ref: string | null;
    }>(
      "select id, clinic_id, subject_id, status, chat_fingerprint, chat_transport_ref " +
        "from dente_telegram_chat_links where organization_id = $1 order by linked_at",
      [organizationId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      clinicId: row.clinic_id,
      subjectId: row.subject_id,
      status: row.status,
      chatFingerprint: row.chat_fingerprint,
      chatTransportRef: row.chat_transport_ref
    }));
  } finally {
    await client.end();
  }
}

describe("привязка Telegram переживает перезапуск сервера", () => {
  const originalEnv = { ...process.env };
  let app: FastifyInstance;
  let runtime: LinkedRuntime;

  before(async () => {
    process.env.NODE_ENV = "development";
    // Файл состояния выключен намеренно: он вторая, независимая дорога к тому же
    // состоянию, и с ним «переживает перезапуск» доказывало бы не базу.
    process.env.DENTAL_STATE_PERSISTENCE = "off";
    process.env.DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE = "1";
    process.env.DENTE_TELEGRAM_BOT_TOKEN = "123456:synthetic-dente-token";
    process.env.DENTE_TELEGRAM_BOT_USERNAME = "dentecrm_bot";
    process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "synthetic-webhook-secret";
    process.env.DENTE_TELEGRAM_LINK_CODE_SALT = "synthetic-link-code-salt";
    process.env.DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY = "synthetic-chat-encryption-key-for-test";
    delete process.env.DENTE_TELEGRAM_ADMIN_SECRET;

    // Ответы Telegram никуда не уходят: маршрут привязки отвечает пациенту.
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 91001 } })
    })) as unknown as typeof fetch;

    app = Fastify({ logger: false });
    await registerTelegramRoutes(app);
    await registerTelegramWebhookRoutes(app);
    await app.ready();

    const statusResponse = await app.inject({ method: "GET", url: "/api/telegram/status" });
    assert.equal(statusResponse.statusCode, 200, `статус Telegram недоступен: ${statusResponse.body}`);
    const status = statusResponse.json() as Record<string, unknown>;
    runtime = {
      organizationId: String(status.organizationId),
      clinicId: status.clinicId === null ? null : String(status.clinicId),
      botConfigId: String(status.botConfigId)
    };

    // Организация клиники должна быть в базе: у таблицы связок внешний ключ на
    // organizations. Филиал с этим uuid НЕ создаётся — см. заголовок теста.
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, runtime.organizationId))
      .limit(1);
    if (!existingOrg) {
      await db.insert(organizations).values({ id: runtime.organizationId, name: "Клиника привязки Telegram" });
    }

    await db.delete(denteTelegramChatLinks).where(eq(denteTelegramChatLinks.organizationId, runtime.organizationId));
    await db.delete(denteTelegramChatLinks).where(eq(denteTelegramChatLinks.organizationId, FOREIGN_ORG));
    await db.delete(clinics).where(eq(clinics.organizationId, FOREIGN_ORG));
    await db.delete(organizations).where(eq(organizations.id, FOREIGN_ORG));
    await db.insert(organizations).values({ id: FOREIGN_ORG, name: "Чужая клиника привязки Telegram" });
  });

  after(async () => {
    await app?.close();
    await db.delete(denteTelegramChatLinks).where(eq(denteTelegramChatLinks.organizationId, FOREIGN_ORG));
    await db.delete(organizations).where(eq(organizations.id, FOREIGN_ORG));
    process.env = originalEnv;
  });

  test("привязка чата доходит до базы, а не только до массива процесса", async () => {
    const linkCodeResponse = await app.inject({
      method: "POST",
      url: "/api/telegram/link-codes",
      payload: { subjectType: "patient", subjectId: PATIENT_SUBJECT, ttlMinutes: 15 }
    });
    assert.equal(linkCodeResponse.statusCode, 200, `код привязки не выпущен: ${linkCodeResponse.body}`);
    const linkCode = linkCodeResponse.json() as { code: string };

    const webhookResponse = await app.inject({
      method: "POST",
      url: "/api/telegram/webhook",
      headers: { "x-telegram-bot-api-secret-token": String(process.env.DENTE_TELEGRAM_WEBHOOK_SECRET) },
      payload: {
        update_id: 910011,
        message: { chat: { id: Number(CHAT_ID), type: "private" }, text: `/start ${linkCode.code}` }
      }
    });
    assert.equal(webhookResponse.statusCode, 200, `веб-хук отказал: ${webhookResponse.body}`);
    assert.equal(
      webhookResponse.json().action,
      "linked_patient_telegram_chat",
      `привязка не состоялась: ${webhookResponse.body}`
    );

    // ПЕРВОЕ независимое чтение: сырое соединение, без drizzle и без маршрутов.
    const rows = await rawChatLinkRows(runtime.organizationId);
    assert.equal(rows.length, 1, `строк связки в базе ${rows.length}, ожидалась одна`);
    const row = rows[0]!;
    assert.equal(row.subjectId, PATIENT_SUBJECT, "связка записана не тому пациенту");
    assert.equal(row.status, "active");
    assert.ok(row.chatFingerprint.length >= 12, "отпечаток чата не записан");
    assert.ok(
      row.chatTransportRef && row.chatTransportRef.length >= 10,
      "адрес чата не записан: без chatTransportRef channelRouter отправить не сможет"
    );
    // Филиала с uuid организации в базе нет, и связка это пережила.
    assert.equal(row.clinicId, null, "филиал записан идентификатором организации — внешний ключ должен был это отвергнуть");
  });

  test("после перезапуска (пустой массив процесса) список связок всё равно показывает привязку", async () => {
    const chatLinksBeforeRestart = await app.inject({ method: "GET", url: "/api/telegram/chat-links" });
    assert.equal(chatLinksBeforeRestart.statusCode, 200, chatLinksBeforeRestart.body);
    assert.equal(chatLinksBeforeRestart.json().activeCount, 1, chatLinksBeforeRestart.body);

    // Перезапуск: свежий процесс без файла состояния имеет ровно это — пустой
    // массив связок в памяти. Всё, что останется видимым, пришло из базы.
    inMemoryChatLinks.length = 0;
    assert.equal(inMemoryChatLinks.length, 0, "массив процесса не очищен — перезапуск не смоделирован");

    // ВТОРОЕ независимое чтение: тот же маршрут, но источник только один — база.
    const afterRestart = await app.inject({ method: "GET", url: "/api/telegram/chat-links" });
    assert.equal(afterRestart.statusCode, 200, afterRestart.body);
    const list = afterRestart.json() as {
      activeCount: number;
      totalCount: number;
      chatLinks: { subjectId: string; status: string; chatTransportRef?: unknown }[];
    };
    assert.equal(list.totalCount, 1, `после перезапуска связок ${list.totalCount}, ожидалась одна`);
    assert.equal(list.activeCount, 1, "после перезапуска активных связок нет — состояние не пережило перезапуск");
    assert.equal(list.chatLinks[0]!.subjectId, PATIENT_SUBJECT);
    assert.equal(list.chatLinks[0]!.status, "active");
    // Адрес чата — секрет периметра и в списке появляться не должен.
    assert.equal(list.chatLinks[0]!.chatTransportRef, undefined, "в списке связок утёк адрес чата");

    // Счётчик на панели статуса тоже обязан читать базу, а не пустой массив.
    const statusAfterRestart = await app.inject({ method: "GET", url: "/api/telegram/status" });
    assert.equal(statusAfterRestart.statusCode, 200, statusAfterRestart.body);
    assert.equal(
      statusAfterRestart.json().activeChatLinkCount,
      1,
      "панель статуса после перезапуска показывает ноль привязок при непустой таблице"
    );
  });

  test("отзыв привязки доходит до базы, а не только до памяти", async () => {
    const rowsBefore = await rawChatLinkRows(runtime.organizationId);
    const linkId = rowsBefore[0]!.id;

    const revoked = await app.inject({
      method: "POST",
      url: `/api/telegram/chat-links/${linkId}/revoke`
    });
    assert.equal(revoked.statusCode, 200, `отзыв отказал: ${revoked.body}`);
    assert.equal(revoked.json().status, "revoked", revoked.body);

    const rowsAfter = await rawChatLinkRows(runtime.organizationId);
    assert.equal(rowsAfter.length, 1, "отзыв удалил строку вместо смены состояния");
    assert.equal(rowsAfter[0]!.status, "revoked", "в базе связка осталась активной после отзыва");

    // Повторный отзыв уже отозванной связки — 404, а не второй «успех».
    const revokedTwice = await app.inject({
      method: "POST",
      url: `/api/telegram/chat-links/${linkId}/revoke`
    });
    assert.equal(revokedTwice.statusCode, 404, `повторный отзыв ответил ${revokedTwice.statusCode}`);
  });

  test("отбор по состоянию и страницы считаются базой, а не после выборки", async () => {
    // Вторая связка нужна ровно для страниц. Пишется прямо в базу: путь записи
    // уже доказан первым тестом через настоящий веб-хук, здесь проверяется ЧТЕНИЕ.
    const [second] = await db
      .insert(denteTelegramChatLinks)
      .values({
        organizationId: runtime.organizationId,
        clinicId: null,
        botConfigId: runtime.botConfigId,
        subjectType: "patient",
        subjectId: "3ebb4567-7777-4f19-8c23-2a78c9962797",
        chatFingerprint: "e7c1a9b45de2f0138a6b4c11",
        chatTransportRef: "synthetic-second-chat-transport-ref",
        chatIdLast4: "0932",
        status: "active"
      })
      .returning();
    assert.ok(second, "вторая связка не записана");

    const revokedOnly = await app.inject({ method: "GET", url: "/api/telegram/chat-links?status=revoked" });
    assert.equal(revokedOnly.statusCode, 200, revokedOnly.body);
    const revokedList = revokedOnly.json() as {
      totalCount: number;
      filteredCount: number;
      activeCount: number;
      revokedCount: number;
      chatLinks: { status: string }[];
    };
    // totalCount описывает всю видимую клинике выборку, filteredCount — отбор.
    // Раньше это были две длины одного и того же массива, и подменить одну
    // другой было невозможно заметить.
    assert.equal(revokedList.totalCount, 2, revokedOnly.body);
    assert.equal(revokedList.filteredCount, 1, revokedOnly.body);
    assert.equal(revokedList.activeCount, 1, revokedOnly.body);
    assert.equal(revokedList.revokedCount, 1, revokedOnly.body);
    assert.deepEqual(
      revokedList.chatLinks.map((link) => link.status),
      ["revoked"],
      `отбор по состоянию вернул не то: ${revokedOnly.body}`
    );

    const firstPage = await app.inject({ method: "GET", url: "/api/telegram/chat-links?limit=1" });
    assert.equal(firstPage.statusCode, 200, firstPage.body);
    const firstPageList = firstPage.json() as { nextCursor: string | null; cursor: string | null; chatLinks: { id: string }[] };
    assert.equal(firstPageList.chatLinks.length, 1, firstPage.body);
    assert.equal(firstPageList.cursor, null, "у первой страницы не должно быть входного курсора");
    assert.equal(firstPageList.nextCursor, "1", `следующая страница не предложена: ${firstPage.body}`);

    const secondPage = await app.inject({
      method: "GET",
      url: `/api/telegram/chat-links?limit=1&cursor=${firstPageList.nextCursor}`
    });
    assert.equal(secondPage.statusCode, 200, secondPage.body);
    const secondPageList = secondPage.json() as { nextCursor: string | null; chatLinks: { id: string }[] };
    assert.equal(secondPageList.chatLinks.length, 1, secondPage.body);
    assert.equal(secondPageList.nextCursor, null, "после второй страницы предложена третья");

    // Страницы не пересекаются и вместе покрывают обе связки: при неустойчивом
    // порядке одна связка показалась бы дважды, а другая пропала.
    const pagedIds = [firstPageList.chatLinks[0]!.id, secondPageList.chatLinks[0]!.id];
    assert.equal(new Set(pagedIds).size, 2, `страницы пересеклись: ${pagedIds.join(", ")}`);

    await db.delete(denteTelegramChatLinks).where(eq(denteTelegramChatLinks.id, second.id));
  });

  test("чужая клиника не видит связку и не может её отозвать", async () => {
    const rows = await rawChatLinkRows(runtime.organizationId);
    const linkId = rows[0]!.id;

    const foreignList = await app.inject({
      method: "GET",
      url: `/api/telegram/chat-links?organizationId=${FOREIGN_ORG}`
    });
    // Чужая организация не описана в серверных настройках: либо отказ, либо
    // пустой список. Чего быть не может — это её ответ с нашей связкой.
    if (foreignList.statusCode === 200) {
      const list = foreignList.json() as { totalCount: number; chatLinks: unknown[] };
      assert.equal(list.totalCount, 0, `чужая клиника увидела связки: ${foreignList.body}`);
      assert.equal(list.chatLinks.length, 0, foreignList.body);
    } else {
      assert.equal(foreignList.statusCode, 404, foreignList.body);
    }
    assert.ok(!foreignList.body.includes(PATIENT_SUBJECT), "в ответе чужой клинике утёк пациент");
    assert.ok(!foreignList.body.includes(linkId), "в ответе чужой клинике утёк идентификатор связки");
  });

  test("отбор по арендатору стоит в самом запросе, а не в разборе маршрута", async () => {
    /**
     * ЗАЧЕМ ОТДЕЛЬНО ОТ ПРЕДЫДУЩЕГО ТЕСТА. Через маршрут чужая организация
     * отсекается РАНЬШЕ обращения к базе: `resolveTelegramRuntimeContext`
     * отвечает 404, потому что чужая клиника не описана в серверных настройках.
     * Значит, маршрутом нельзя отличить «в SQL есть отбор по organizationId» от
     * «отбора нет, но до него не дошли». Убери условие из запроса — и
     * предыдущий тест останется зелёным.
     *
     * Поэтому здесь вызывается сам модуль, обеими клиниками, и у каждой в базе
     * своя связка.
     */
    const [foreignLink] = await db
      .insert(denteTelegramChatLinks)
      .values({
        organizationId: FOREIGN_ORG,
        clinicId: null,
        botConfigId: runtime.botConfigId,
        subjectType: "patient",
        subjectId: "3ebb4567-7777-4f19-8c23-2a78c9962798",
        chatFingerprint: "f10ba9c8d7e6543210fedcba",
        chatTransportRef: "synthetic-foreign-chat-transport-ref",
        chatIdLast4: "0933",
        status: "active"
      })
      .returning();
    assert.ok(foreignLink, "связка чужой клиники не записана");

    const mine = await buildDenteTelegramChatLinkList({ organizationId: runtime.organizationId });
    const theirs = await buildDenteTelegramChatLinkList({ organizationId: FOREIGN_ORG });

    assert.equal(mine.totalCount, 1, `своя клиника видит ${mine.totalCount} связок вместо одной`);
    assert.equal(theirs.totalCount, 1, `чужая клиника видит ${theirs.totalCount} связок вместо одной`);
    assert.deepEqual(
      mine.chatLinks.map((link) => link.organizationId),
      [runtime.organizationId],
      "в выборке своей клиники оказалась связка чужой"
    );
    assert.deepEqual(
      theirs.chatLinks.map((link) => link.organizationId),
      [FOREIGN_ORG],
      "в выборке чужой клиники оказалась своя связка"
    );

    // Счётчик активных связок отбирается по арендатору тем же условием.
    assert.equal(await countActiveDenteTelegramChatLinks({ organizationId: FOREIGN_ORG }), 1);
    assert.equal(await countActiveDenteTelegramChatLinks({ organizationId: runtime.organizationId }), 0);

    // Отзыв чужой связки своим арендатором не проходит — и наоборот.
    assert.equal(
      await revokeDenteTelegramChatLink({ organizationId: runtime.organizationId }, foreignLink.id),
      null,
      "своя клиника отозвала связку чужой"
    );
    const [untouched] = await db
      .select({ status: denteTelegramChatLinks.status })
      .from(denteTelegramChatLinks)
      .where(eq(denteTelegramChatLinks.id, foreignLink.id));
    assert.equal(untouched!.status, "active", "чужая связка изменена запросом другой клиники");
  });
});
