import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseWhatsappStatuses, ParsedReceipt } from "./deliveryReceipts.js";

describe("parseWhatsappStatuses", () => {
	it("returns empty array for non-array input", () => {
		assert.deepEqual(parseWhatsappStatuses(null), []);
		assert.deepEqual(parseWhatsappStatuses(undefined), []);
		assert.deepEqual(parseWhatsappStatuses({}), []);
		assert.deepEqual(parseWhatsappStatuses("some string"), []);
	});

	it("skips invalid entries in the array", () => {
		assert.deepEqual(parseWhatsappStatuses([null, undefined, 123, "string"]), []);
	});

	it("skips entries without a valid providerMessageId", () => {
		assert.deepEqual(
			parseWhatsappStatuses([
				{ status: "delivered" },
				{ id: "", status: "delivered" },
				{ id: 123, status: "delivered" } // id must be string
			]),
			[]
		);
	});

	it("parses delivered status correctly", () => {
		const result = parseWhatsappStatuses([{ id: "msg-123", status: "delivered" }]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-123",
				state: "delivered",
				detail: "WhatsApp: доставлено"
			}
		]);
	});

	it("maps read status to delivered", () => {
		const result = parseWhatsappStatuses([{ id: "msg-124", status: "read" }]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-124",
				state: "delivered",
				detail: "WhatsApp: прочитано"
			}
		]);
	});

	it("maps sent status to in_transit", () => {
		const result = parseWhatsappStatuses([{ id: "msg-125", status: "sent" }]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-125",
				state: "in_transit",
				detail: "WhatsApp: передано в сеть"
			}
		]);
	});

	it("handles failed status with a known error code", () => {
		const result = parseWhatsappStatuses([
			{
				id: "msg-fail-1",
				status: "failed",
				errors: [{ code: 131026 }]
			}
		]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-fail-1",
				state: "failed",
				detail: "WhatsApp: не доставлено — у получателя нет WhatsApp или он не может принять сообщение — нужен другой канал (код 131026)"
			}
		]);
	});

	it("handles failed status with an unknown error code but a title", () => {
		const result = parseWhatsappStatuses([
			{
				id: "msg-fail-2",
				status: "failed",
				errors: [{ code: 999999, title: "Some unknown error" }]
			}
		]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-fail-2",
				state: "failed",
				detail: "WhatsApp: не доставлено — Some unknown error (код 999999)"
			}
		]);
	});

	it("handles failed status without a code or title", () => {
		const result = parseWhatsappStatuses([
			{
				id: "msg-fail-3",
				status: "failed",
				errors: [{}] // Empty error object
			}
		]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-fail-3",
				state: "failed",
				detail: "WhatsApp: не доставлено — причина не указана"
			}
		]);
	});

	it("handles unknown status", () => {
		const result = parseWhatsappStatuses([{ id: "msg-unknown", status: "some_weird_status" }]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-unknown",
				state: "unknown",
				detail: "WhatsApp: состояние «some_weird_status» не распознано"
			}
		]);
	});

	it("handles status missing or empty string", () => {
		const result = parseWhatsappStatuses([{ id: "msg-empty-status" }]);
		assert.deepEqual(result, [
			{
				providerMessageId: "msg-empty-status",
				state: "unknown",
				detail: "WhatsApp: состояние «не указано» не распознано"
			}
		]);
	});
});
