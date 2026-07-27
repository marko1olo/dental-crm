import assert from "node:assert";
import { describe, test } from "node:test";
import { issueGeneratedDocumentInDb, voidGeneratedDocumentInDb } from "./documentQuery.js";

/**
 * Регрессионный замок на подписанта юридически значимого документа.
 *
 * БЫЛО: documentQuery.ts писал в issued_by_user_id литерал "doctor", а в
 * voided_by_user_id — его же. Колонки объявлены как uuid с внешним ключом на
 * users.id (db/schema.ts:505 и :507), поэтому Postgres отвергал такое значение
 * с 22P02 invalid input syntax for type uuid: выдача документа падала целиком.
 *
 * Проверяется ровно то, что спроектировано: произвольная строка отвергается
 * ДО обращения к базе и с внятным объяснением, а не уходит в драйвер
 * непрозрачной ошибкой. Идентификаторы ниже намеренно несуществующие —
 * до запроса дело не доходит, guard срабатывает первым.
 */

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const DOC_ID = "00000000-0000-4000-8000-000000000002";

describe("issueGeneratedDocumentInDb — подписант выдачи", () => {
  test("литерал «doctor» отвергается до запроса в базу", async () => {
    await assert.rejects(
      () => issueGeneratedDocumentInDb(ORG_ID, DOC_ID, { issuedByUserId: "doctor" }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /issued_by_user_id/);
        assert.match(error.message, /UUID/);
        assert.match(error.message, /"doctor"/);
        return true;
      }
    );
  });

  test("любая не-UUID строка отвергается, а не только «doctor»", async () => {
    await assert.rejects(
      () => issueGeneratedDocumentInDb(ORG_ID, DOC_ID, { issuedByUserId: "  " }),
      /issued_by_user_id/
    );
    await assert.rejects(
      () => issueGeneratedDocumentInDb(ORG_ID, DOC_ID, { issuedByUserId: "Петров Иван" }),
      /issued_by_user_id/
    );
  });
});

describe("voidGeneratedDocumentInDb — подписант аннулирования", () => {
  test("литерал «doctor» отвергается до запроса в базу", async () => {
    await assert.rejects(
      () => voidGeneratedDocumentInDb(ORG_ID, DOC_ID, { voidedByUserId: "doctor" }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /voided_by_user_id/);
        assert.match(error.message, /UUID/);
        return true;
      }
    );
  });
});

describe("отсутствие авторизованного сотрудника моделируется как null", () => {
  /**
   * Колонка nullable по схеме, а маршрут выдачи требует токен кабинета, но не
   * вход сотрудника. null означает «подписант не установлен» — это честнее
   * выдуманного идентификатора. Guard обязан пропускать null дальше: документа
   * с таким id нет, поэтому функция штатно возвращает null, а не бросает.
   */
  test("null проходит guard и не считается ошибкой", async () => {
    const issued = await issueGeneratedDocumentInDb(ORG_ID, DOC_ID, { issuedByUserId: null });
    assert.strictEqual(issued, null);

    const voided = await voidGeneratedDocumentInDb(ORG_ID, DOC_ID, { voidedByUserId: null });
    assert.strictEqual(voided, null);
  });
});
