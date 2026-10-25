import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	DEFAULT_BILLBOARD_QUEUE_ITEMS,
	mapShiftAppointmentsToBillboard,
	QueueBillboardView,
} from "../QueueBillboardView";
import { playCallingChime } from "../../lounge/loungeChimeAudio";

describe("QueueBillboardView 152-FZ & Clinical Calling Invariants", () => {
	it("verifies reliable 152-FZ patient name masking with zero leaks in DOM", () => {
		const rawAppointments = [
			{
				id: "apt-1",
				patientName: "Константинопольский Константин Константинович",
				doctorName: "Д-р Смирнов А. В.",
				chairName: "Кабинет 1",
				status: "arrived",
				startsAt: new Date().toISOString(),
			},
		];
		const mapped = mapShiftAppointmentsToBillboard(rawAppointments as any);
		assert.equal(mapped.length, 1);
		assert.equal(mapped[0]?.patientInitials, "Константинопольский К. К.");

		const html = renderToStaticMarkup(createElement(QueueBillboardView, { items: mapped }));
		assert.ok(html.includes("Константинопольский К. К."));
		assert.ok(!html.includes("Константинопольский Константин Константинович"), "Zero full name leaks in public DOM");
		assert.ok(!html.includes("Талон №"), "Zero bank slip cargo-cult tickets");
	});

	it("reflects doctor call transition and highlights active cabinet", () => {
		const html = renderToStaticMarkup(
			createElement(QueueBillboardView, { items: DEFAULT_BILLBOARD_QUEUE_ITEMS }),
		);
		assert.ok(html.includes("Приглашаются в кабинет"));
		assert.ok(html.includes("Ожидают вызова"));
		assert.ok(html.includes("Приглашается в кабинет"));
		assert.ok(html.includes("Кабинет 3"));
	});

	it("synchronizes shift appointments to billboard without modal barriers", () => {
		const todayIso = new Date().toISOString();
		const appts = [
			{ id: "a1", patientName: "Иванов Иван", chairName: "Кабинет 2", doctorName: "Врач 1", status: "arrived", startsAt: todayIso },
			{ id: "a2", patientName: "Петрова Анна", chairName: "Кабинет 3", doctorName: "Врач 2", status: "in_chair", startsAt: todayIso },
		];
		const items = mapShiftAppointmentsToBillboard(appts as any);
		assert.equal(items.length, 2);
		assert.equal(items[0]?.cabinetName, "Кабинет 3");
		assert.equal(items[1]?.cabinetName, "Кабинет 2");
		assert.equal(items[1]?.patientInitials, "Иванов И.");
	});

	it("plays audio chime without throwing or leaking context", () => {
		assert.doesNotThrow(() => playCallingChime());
	});

	it("strictly contains zero cartoon emojis and adheres to design tokens", () => {
		const html = renderToStaticMarkup(createElement(QueueBillboardView));
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(html), false, "Must contain strictly zero cartoon emojis");
		assert.ok(html.includes("queue-billboard-container"));
	});
});
