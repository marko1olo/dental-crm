import { test, mock, afterEach, describe, after } from "node:test";
import assert from "node:assert";
import { triggerPostOpCare } from "../postOpCareTrigger.js";
import { db, client } from "../../db/client.js";
import { outgoingNotifications } from "../../db/schema.js";

describe("postOpCareTrigger", () => {
    after(async () => {
        await client.close();
    });

    afterEach(() => {
        mock.restoreAll();
    });

    test("triggerPostOpCare inserts correct notification", async () => {
        const valuesMock = mock.fn(async () => {});
        mock.method(db, "insert", (schema) => {
            assert.strictEqual(schema, outgoingNotifications);
            return { values: valuesMock };
        });

        await triggerPostOpCare("org-123", "pat-456", "Extraction");

        assert.strictEqual(valuesMock.mock.calls.length, 1);
        const args = valuesMock.mock.calls[0].arguments[0];

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
