import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { journalDirectionLabel, journalEntryNotice } from "./journalDigest.js";

describe("журнал связи: направление и подписи событий", () => {
	it("отличает ответ пациента от отправки клиники", () => {
		assert.equal(journalDirectionLabel("inbound"), "Пациент написал");
		assert.equal(journalDirectionLabel("outbound"), "Клиника отправила");
		assert.equal(journalDirectionLabel(undefined), "Направление не указано");
	});

	it("у упавшей отправки подпись говорит, что делать дальше", () => {
		const notice = journalEntryNotice({ direction: "outbound", status: "failed" });
		assert.ok(notice);
		assert.match(notice, /Пациент это не получил/);
		assert.match(notice, /Журнал отправки/);
	});

	it("упавшее входящее не превращается в «пациент не получил»", () => {
		const notice = journalEntryNotice({ direction: "inbound", status: "failed" });
		assert.ok(notice);
		assert.match(notice, /Входящее сообщение не принято/);
	});

	it("«отправлено» не выдаётся за доставку", () => {
		assert.equal(
			journalEntryNotice({ direction: "outbound", status: "sent" }),
			"Передано шлюзу, подтверждения доставки нет.",
		);
	});

	it("у доставленного события лишней строки нет", () => {
		assert.equal(journalEntryNotice({ direction: "outbound", status: "delivered" }), null);
		assert.equal(journalEntryNotice({ direction: "inbound", status: "completed" }), null);
	});
});
