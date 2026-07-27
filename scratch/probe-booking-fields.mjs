/** Что smartBookingParser выдаёт по остальным полям при фиксированном «сейчас». */
const RealDate = Date;
function withFixedNow(iso, fn) {
	const fixed = new RealDate(iso).getTime();
	class FixedDate extends RealDate {
		constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
		static now() { return fixed; }
	}
	globalThis.Date = FixedDate;
	try { return fn(); } finally { globalThis.Date = RealDate; }
}
const { smartBookingParser } = await import("../apps/web/src/lib/smartBookingParser.ts");
const dashboard = {
	patients: [
		{ id: "p1", fullName: "Иванов Иван Иванович", status: "active" },
		{ id: "p2", fullName: "Петров Петр Петрович", status: "active" },
	],
	clinicSettings: {
		staff: [
			{ id: "s1", fullName: "Смирнов Олег Викторович", role: "doctor", active: true },
			{ id: "s2", fullName: "Кузнецова Анна", role: "assistant", active: true },
		],
		chairs: [{ id: "c1", name: "Кресло 1", active: true }, { id: "c2", name: "Кресло 2", active: true }],
	},
	appointments: [],
};
const NOW = "2026-07-27T12:00:00+04:00";
const TEXTS = [
	"Иванов кариес завтра в 15:30",
	"Петров на чистку завтра в 10:00 к Смирнову",
	"запиши Иванова на имплантацию завтра в 11:00",
	"отмени запись Петрова",
	"перенеси Иванова на завтра в 16:00",
	"Иванов завтра в 12:00 на 90 минут",
	"Иванов завтра с 14:00 до 15:30",
	"Иванов завтра в 15:30 кресло 2",
	"Иванов удаление восьмерки завтра в 9 утра",
	"Иванов завтра в 15:30 просил позвонить заранее",
];
for (const t of TEXTS) {
	const p = withFixedNow(NOW, () => smartBookingParser(t, dashboard));
	const dur = p.startsAt && p.endsAt ? (new RealDate(p.endsAt) - new RealDate(p.startsAt)) / 60000 : null;
	const start = p.startsAt ? new RealDate(p.startsAt) : null;
	console.log(`\n«${t}»`);
	console.log(`   action=${p.action} patientId=${p.patientId ?? "-"} doctorUserId=${p.doctorUserId ?? "-"} chairId=${p.chairId ?? "-"}`);
	console.log(`   reason=${p.reason ?? "-"} длительность=${dur ?? "-"} мин  начало=${start ? start.toLocaleString("ru-RU") : "-"}`);
	console.log(`   comment=${p.comment ?? "-"}  status=${p.status ?? "-"}`);
}
