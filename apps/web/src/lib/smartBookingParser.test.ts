import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Dashboard } from "@dental/shared";
import { smartBookingParser } from "./smartBookingParser";

/**
 * Разбор диктовки записи на приём — живой путь: NewAppointmentForm вызывает
 * его при вводе и при диктовке. Ошибка здесь означает приём не тому
 * пациенту или не в тот день.
 *
 * Проверок у разбора не было. В apps/web/tests лежал файл
 * smartParsers.test.ts, который только печатал результат в консоль: ни
 * одного утверждения, и каталог не попадал ни под один шаблон запуска.
 *
 * Парсер берёт текущее время через new Date(), поэтому здесь оно
 * фиксируется: иначе проверки дат зависели бы от дня прогона.
 */

const RealDate = Date;

function withFixedNow<T>(iso: string, fn: () => T): T {
	const fixed = new RealDate(iso).getTime();
	class FixedDate extends RealDate {
		constructor(...args: unknown[]) {
			if (args.length === 0) super(fixed);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			else super(...(args as [any]));
		}
		static now() {
			return fixed;
		}
	}
	(globalThis as unknown as { Date: typeof Date }).Date =
		FixedDate as unknown as typeof Date;
	try {
		return fn();
	} finally {
		(globalThis as unknown as { Date: typeof Date }).Date = RealDate;
	}
}

const dashboard = {
	patients: [
		{ id: "p1", fullName: "Иванов Иван Иванович", status: "active" },
		{ id: "p2", fullName: "Петров Петр Петрович", status: "active" },
	],
	clinicSettings: {
		staff: [
			{
				id: "s1",
				fullName: "Смирнов Олег Викторович",
				role: "doctor",
				active: true,
			},
			{ id: "s2", fullName: "Кузнецова Анна", role: "assistant", active: true },
		],
		chairs: [
			{ id: "c1", name: "Кресло 1", active: true },
			{ id: "c2", name: "Кресло 2", active: true },
		],
	},
	appointments: [],
} as unknown as Dashboard;

function localDay(iso: string | undefined): string {
	if (!iso) return "нет даты";
	const d = new RealDate(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function durationMinutes(parsed: {
	startsAt?: string;
	endsAt?: string;
}): number | null {
	if (!parsed.startsAt || !parsed.endsAt) return null;
	return (
		(new RealDate(parsed.endsAt).getTime() -
			new RealDate(parsed.startsAt).getTime()) /
		60000
	);
}

const NOW = "2026-07-27T12:00:00+04:00";

describe("smartBookingParser: даты", () => {
	it("«завтра», «сегодня», «послезавтра» считаются от текущего дня", () => {
		const parse = (text: string) =>
			withFixedNow(NOW, () => smartBookingParser(text, dashboard));
		assert.equal(
			localDay(parse("Иванов кариес сегодня в 15:30").startsAt),
			"2026-07-27",
		);
		assert.equal(
			localDay(parse("Иванов кариес завтра в 15:30").startsAt),
			"2026-07-28",
		);
		assert.equal(
			localDay(parse("Иванов кариес послезавтра в 15:30").startsAt),
			"2026-07-29",
		);
	});

	it("названное число, которое уже прошло, переносится на следующий месяц", () => {
		// БЫЛО: 27 июля «на 3 число» давало 3 июля — приём на 24 дня в
		// прошлое. Перенос вперёд требовал, чтобы номер месяца был меньше
		// текущего, а для «на 3 число» месяц остаётся текущим.
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов кариес на 3 число в 15:30", dashboard),
		);
		assert.equal(localDay(parsed.startsAt), "2026-08-03");
	});

	it("названное число этого месяца, которое ещё не прошло, остаётся в нём", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов кариес на 30 число в 15:30", dashboard),
		);
		assert.equal(localDay(parsed.startsAt), "2026-07-30");
	});

	it("название месяца не уезжает, когда сегодня 31-е", () => {
		// БЫЛО: setMonth выполнялся до setDate. 31 мая + setMonth(февраль) =
		// 3 марта, и последующий setDate(5) давал 5 марта вместо 5 февраля.
		const parse = (text: string) =>
			withFixedNow("2026-05-31T12:00:00+04:00", () =>
				smartBookingParser(text, dashboard),
			);
		assert.equal(
			localDay(parse("Иванов кариес на 5 февраля в 15:30").startsAt),
			"2027-02-05",
		);
		// Врач называет июнь — приём обязан попасть в июнь, а не в июль.
		assert.equal(
			localDay(parse("Иванов кариес на 20 июня в 15:30").startsAt),
			"2026-06-20",
		);
	});

	it("январь после декабря попадает в следующий год", () => {
		const parsed = withFixedNow("2026-12-20T12:00:00+04:00", () =>
			smartBookingParser("Иванов кариес на 5 января в 15:30", dashboard),
		);
		assert.equal(localDay(parsed.startsAt), "2027-01-05");
	});

	it("время начала берётся из диктовки", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов кариес завтра в 15:30", dashboard),
		);
		const start = new RealDate(parsed.startsAt as string);
		assert.equal(start.getHours(), 15);
		assert.equal(start.getMinutes(), 30);
	});
});

describe("smartBookingParser: участники", () => {
	it("находит пациента по фамилии", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов кариес завтра в 15:30", dashboard),
		);
		assert.equal(parsed.patientId, "p1");
	});

	it("различает пациента и врача по предлогу «к»", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser(
				"Петров на чистку завтра в 10:00 к Смирнову",
				dashboard,
			),
		);
		assert.equal(parsed.patientId, "p2");
		assert.equal(parsed.doctorUserId, "s1");
	});

	it("находит кресло по названию", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов завтра в 15:30 кресло 2", dashboard),
		);
		assert.equal(parsed.chairId, "c2");
	});

	it("не выдумывает пациента, которого нет в списке", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Сидоров завтра в 15:30", dashboard),
		);
		assert.equal(parsed.patientId, undefined);
	});
});

describe("smartBookingParser: причина и длительность", () => {
	it("сопоставляет причину и её типовую длительность", () => {
		const parse = (text: string) =>
			withFixedNow(NOW, () => smartBookingParser(text, dashboard));

		const cleaning = parse("Петров на чистку завтра в 10:00");
		assert.equal(cleaning.reason, "Профгигиена");
		assert.equal(durationMinutes(cleaning), 45);

		const implant = parse("запиши Иванова на имплантацию завтра в 11:00");
		assert.equal(implant.reason, "Имплантация");
		assert.equal(durationMinutes(implant), 120);

		const wisdom = parse("Иванов удаление восьмерки завтра в 9 утра");
		assert.equal(wisdom.reason, "Удаление зуба мудрости");
	});

	it("явная длительность важнее типовой", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов кариес завтра в 12:00 на 90 минут", dashboard),
		);
		assert.equal(durationMinutes(parsed), 90);
	});

	it("интервал «с ... до ...» задаёт и начало, и длительность", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов завтра с 14:00 до 15:30", dashboard),
		);
		const start = new RealDate(parsed.startsAt as string);
		assert.equal(start.getHours(), 14);
		assert.equal(start.getMinutes(), 0);
		assert.equal(durationMinutes(parsed), 90);
	});
});

describe("smartBookingParser: действия", () => {
	it("отмена помечает действие и статус", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("отмени запись Петрова", dashboard),
		);
		assert.equal(parsed.action, "cancel");
		assert.equal(parsed.status, "cancelled");
		assert.equal(parsed.patientId, "p2");
	});

	it("перенос помечает действие и сохраняет новое время", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("перенеси Иванова на завтра в 16:00", dashboard),
		);
		assert.equal(parsed.action, "reschedule");
		assert.equal(parsed.patientId, "p1");
		assert.equal(localDay(parsed.startsAt), "2026-07-28");
	});

	it("по умолчанию действие — создание записи", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser("Иванов кариес завтра в 15:30", dashboard),
		);
		assert.equal(parsed.action, "create");
	});

	it("остаток текста попадает в примечание, а не теряется", () => {
		const parsed = withFixedNow(NOW, () =>
			smartBookingParser(
				"Иванов завтра в 15:30 просил позвонить заранее",
				dashboard,
			),
		);
		assert.match(String(parsed.comment), /позвонить заранее/i);
	});
});
