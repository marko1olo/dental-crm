import { test, mock, afterEach, describe, after } from "node:test";
import assert from "node:assert";
import { triggerPostOpCare } from "../postOpCareTrigger.js";
import { db, pool } from "../../db/client.js";
import { outgoingNotifications } from "../../db/schema.js";

/**
 * Настоящий параметр db.insert(outgoingNotifications).values() — строка вставки
 * в outgoing_notifications.
 *
 * Без него mock.fn(async () => {}) объявлял подменённую функцию вообще без
 * параметров, тип arguments выводился как пустой кортеж [], обращение к
 * arguments[0] не компилировалось, а args дальше считался undefined. Тип взят из
 * самой таблицы, поэтому расходиться со схемой он не может.
 */
type OutgoingNotificationInsert = typeof outgoingNotifications.$inferInsert;

describe("postOpCareTrigger", () => {
    after(async () => {
        // Раньше здесь звали client.close() — метод PGlite, которого в
        // node-postgres нет, и файл не загружался целиком.
        await pool.end();
    });

    afterEach(() => {
        mock.restoreAll();
    });

    test("triggerPostOpCare inserts correct notification", async () => {
        const valuesMock = mock.fn(
            async (_values: OutgoingNotificationInsert) => {},
        );
        mock.method(db, "insert", (schema) => {
            assert.strictEqual(schema, outgoingNotifications);
            return { values: valuesMock };
        });

        await triggerPostOpCare("org-123", "pat-456", "Extraction");

        assert.strictEqual(valuesMock.mock.calls.length, 1);
        const insertCall = valuesMock.mock.calls[0];
        assert.ok(insertCall);
        const args = insertCall.arguments[0];

        assert.strictEqual(args.organizationId, "org-123");
        assert.strictEqual(args.patientId, "pat-456");
        assert.strictEqual(args.type, "PostOp_Care");
        assert.strictEqual(args.status, "pending");
        assert.deepStrictEqual(args.payload, {
            patientId: "pat-456",
            itemTitle: "Extraction",
            alertMessage: "Позвонить пациенту (ID: pat-456) - контроль самочувствия после: Extraction",
        });
    });
});
