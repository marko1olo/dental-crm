import { smartBookingParser } from "./src/lib/smartBookingParser.js";

// Mock Dashboard
const dashboard = {
	clinicSettings: {
		staff: [
			{
				id: "doc1",
				fullName: "Иванов Иван Иванович",
				role: "doctor",
				active: true,
			},
			{ id: "doc2", fullName: "Смирнов Алексей", role: "doctor", active: true },
		],
		chairs: [{ id: "chair1" }],
	},
	patients: [{ id: "pat1", fullName: "Петров Петр Петрович" }],
	appointments: [
		{
			doctorUserId: "doc1",
			startsAt: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
			endsAt: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
			status: "scheduled",
		},
	],
};

const tests = [
	"Запиши Петрова к Иванову на удаление завтра в 15:00",
	"Петров на чистку в среду 12:30",
	"Смирнов, Петров имплантация 15 мая",
	"записать петрова на осмотр завтра в 8",
	"петров на консультацию в 14:00 к иванову",
];

for (const t of tests) {
	console.log(`\nText: "${t}"`);
	console.log(smartBookingParser(t, dashboard));
}
