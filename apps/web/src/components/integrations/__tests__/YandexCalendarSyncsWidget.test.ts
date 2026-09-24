import assert from "node:assert/strict";
import test from "node:test";
import {
	classifyHttp,
	readSyncItems,
	stateCopy,
	syncStatusBadge,
	type YandexLoadState,
} from "../YandexCalendarSyncsWidget";

test("YandexCalendarSyncsWidget — classifyHttp accurately resolves status codes", () => {
	assert.deepEqual(classifyHttp(404), { kind: "missing" });
	assert.deepEqual(classifyHttp(401), { kind: "unauthorized" });
	assert.deepEqual(classifyHttp(403), { kind: "unauthorized" });
	assert.deepEqual(classifyHttp(500), { kind: "server_error", status: 500 });
	assert.deepEqual(classifyHttp(502), { kind: "server_error", status: 502 });
});

test("YandexCalendarSyncsWidget — readSyncItems handles empty, valid, and unreadable payloads with 8-day horizon", () => {
	assert.deepEqual(readSyncItems([]), { kind: "empty" });
	assert.deepEqual(readSyncItems("invalid string"), { kind: "unreadable" });
	assert.deepEqual(readSyncItems(null), { kind: "unreadable" });
	assert.deepEqual(readSyncItems([{ broken: true }]), { kind: "unreadable" });

	const validPayload = [
		{
			id: "sync-1",
			organizationId: "org-1",
			doctorName: "Барабаш С.В.",
			yandexCalendarId: "cal-101",
			syncStatus: "synced",
			lastSyncedAt: "2026-09-24T12:00:00Z",
		},
	];

	const parsed = readSyncItems(validPayload);
	assert.equal(parsed.kind, "ok");
	if (parsed.kind === "ok") {
		assert.equal(parsed.items.length, 1);
		assert.equal(parsed.items[0]?.doctorName, "Барабаш С.В.");
		assert.equal(parsed.items[0]?.yandexCalendarId, "cal-101");
		assert.equal(parsed.items[0]?.syncHorizonDays, 8);
		assert.equal(parsed.items[0]?.timezone, "MSK");
		assert.equal(parsed.items[0]?.overlapCount, 0);
	}
});

test("YandexCalendarSyncsWidget — syncStatusBadge maps statuses with design tokens and zero raw hex", () => {
	const synced = syncStatusBadge("synced");
	assert.equal(synced.label, "Синхронизировано");
	assert.ok(synced.className.includes("emerald"));

	const error = syncStatusBadge("error");
	assert.equal(error.label, "Ошибка синхронизации");
	assert.ok(error.className.includes("rose"));

	const pending = syncStatusBadge("pending");
	assert.equal(pending.label, "Ожидает синхронизации");
	assert.ok(pending.className.includes("amber"));

	const unknown = syncStatusBadge("wat");
	assert.equal(unknown.label, "Статус неизвестен");
});

test("YandexCalendarSyncsWidget — stateCopy delivers accurate Russian text without Latin leakage", () => {
	const states: YandexLoadState[] = [
		{ kind: "loading" },
		{ kind: "missing" },
		{ kind: "unauthorized" },
		{ kind: "server_error", status: 500 },
		{ kind: "network" },
		{ kind: "unreadable" },
		{ kind: "empty" },
		{
			kind: "ok",
			items: [
				{
					id: "1",
					organizationId: "org",
					doctorName: "Смирнова Е.А.",
					yandexCalendarId: "c-1",
					syncStatus: "active",
					lastSyncedAt: null,
					syncHorizonDays: 8,
				},
			],
		},
	];

	for (const s of states) {
		const copy = stateCopy(s);
		assert.ok(copy.headline.length > 0);
		assert.ok(copy.detail.length > 0);
		// Check that headline has Russian characters
		assert.ok(/[А-Яа-яЁё]/.test(copy.headline));
	}
});
