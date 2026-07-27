/**
 * Проверяет разбор дат в smartBookingParser при фиксированном «сейчас».
 *
 * Парсер вызывает new Date() внутри, поэтому подменяем глобальный Date:
 * без этого проверки зависели бы от дня прогона.
 *
 * Что подозрительно в коде:
 *  1. Перенос на следующий год делается только если у разобранной даты
 *     номер месяца меньше текущего. Для «на 3 число» месяц остаётся
 *     текущим, поэтому условие не срабатывает и приём назначается на
 *     число, которое уже прошло.
 *  2. Сначала выставляется месяц, потом число. Если сегодня 31-е, то
 *     setMonth(февраль) даёт 3 марта, и последующий setDate уже не
 *     возвращает февраль.
 */
const RealDate = Date;

function withFixedNow(iso, fn) {
	const fixed = new RealDate(iso).getTime();
	class FixedDate extends RealDate {
		constructor(...args) {
			if (args.length === 0) super(fixed);
			else super(...args);
		}
		static now() {
			return fixed;
		}
	}
	globalThis.Date = FixedDate;
	try {
		return fn();
	} finally {
		globalThis.Date = RealDate;
	}
}

const { smartBookingParser } = await import("../apps/web/src/lib/smartBookingParser.ts");

const dashboard = {
	patients: [{ id: "p1", fullName: "Иванов Иван Иванович", status: "active" }],
	clinicSettings: {
		staff: [{ id: "s1", fullName: "Смирнов Врач", role: "doctor", active: true }],
		chairs: [{ id: "c1", name: "Кресло 1", active: true }],
	},
	appointments: [],
};

const CASES = [
	// [когда сейчас, что надиктовали, что ожидаем от даты начала]
	["2026-07-27T12:00:00+04:00", "Иванов кариес завтра в 15:30", "2026-07-28"],
	["2026-07-27T12:00:00+04:00", "Иванов кариес сегодня в 15:30", "2026-07-27"],
	["2026-07-27T12:00:00+04:00", "Иванов кариес послезавтра в 15:30", "2026-07-29"],
	// «на 3 число» 27 июля — третье число уже прошло, значит следующий месяц
	["2026-07-27T12:00:00+04:00", "Иванов кариес на 3 число в 15:30", "2026-08-03"],
	["2026-07-27T12:00:00+04:00", "Иванов кариес на 30 число в 15:30", "2026-07-30"],
	// «на 5 февраля», когда сегодня 31 мая: месяц не должен уехать в март
	["2026-05-31T12:00:00+04:00", "Иванов кариес на 5 февраля в 15:30", "2027-02-05"],
	["2026-05-31T12:00:00+04:00", "Иванов кариес на 20 июня в 15:30", "2026-06-20"],
	// декабрь -> январь следующего года
	["2026-12-20T12:00:00+04:00", "Иванов кариес на 5 января в 15:30", "2027-01-05"],
];

let bad = 0;
for (const [nowIso, text, expectedDay] of CASES) {
	const parsed = withFixedNow(nowIso, () => smartBookingParser(text, dashboard));
	const startsAt = parsed.startsAt ? new RealDate(parsed.startsAt) : null;
	// Сравниваем календарную дату в местном поясе, а не в UTC.
	const actualDay = startsAt
		? `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`
		: "нет даты";
	const ok = actualDay === expectedDay;
	if (!ok) bad += 1;
	console.log(`  ${ok ? "OK  " : "СБОЙ"} сейчас ${nowIso.slice(0, 10)}  «${text}»`);
	console.log(`         дата приёма ${actualDay}, ожидалось ${expectedDay}`);
}
console.log(`\nпроверок: ${CASES.length}, сбоев ${bad}`);
