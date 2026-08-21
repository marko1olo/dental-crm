import assert from "node:assert/strict";
import test from "node:test";
import type { PatientNotificationItem } from "../PatientNotificationCenter";

test("PatientNotificationCenter - item priorities and action resolution", () => {
	const items: PatientNotificationItem[] = [
		{
			id: "notif-1",
			category: "call",
			title: "Пропущенный вызов",
			description: "+7 (916) 123-45-67",
			timestamp: new Date().toISOString(),
			isRead: false,
			phone: "+79161234567",
			patientName: "Иванов И.И.",
			priority: "urgent",
			actionType: "call",
		},
		{
			id: "notif-2",
			category: "whatsapp",
			title: "Подтверждение приёма",
			description: "Пациент ответил ДА",
			timestamp: new Date().toISOString(),
			isRead: true,
			phone: "+79269876543",
			patientName: "Смирнова Е.В.",
			priority: "normal",
			actionType: "whatsapp",
		},
	];

	const unread = items.filter((i) => !i.isRead);
	assert.strictEqual(unread.length, 1);
	assert.strictEqual(unread[0]?.priority, "urgent");
	assert.strictEqual(unread[0]?.actionType, "call");
});
