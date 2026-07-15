import { smartBookingParser } from "../src/lib/smartBookingParser";
import { parseVisitDictationLocal } from "../src/lib/smartVisitParser";

console.log("--- TEST SMART BOOKING PARSER ---");
const mockDashboard = {
	patients: [
		{ id: "p1", fullName: "Иванов Иван Иванович", status: "active" },
		{ id: "p2", fullName: "Петров Петр", status: "active" },
	],
	clinicSettings: {
		staff: [
			{ id: "s1", fullName: "Смирнов Врач", role: "doctor", active: true },
		],
		chairs: [{ id: "c1", name: "Кресло 1", active: true }],
	},
	appointments: [],
};

const bookingInputs = [
	"Иванов кариес завтра в 15:30",
	"Петров на чистку в понедельник в 10:00 к Смирнову",
];

bookingInputs.forEach((input) => {
	console.log(`Input: "${input}"`);
	console.log(
		JSON.stringify(smartBookingParser(input, mockDashboard as any), null, 2),
	);
});

console.log("\n--- TEST SMART VISIT PARSER ---");
const visitInputs = [
	"жалобы на боли при накусывании. 45 зуб периодонтит, сделали рентген.",
	"Иванов пришел, жалуется на выпавшую пломбу. 11 зуб кариес, поставил коффердам и сделал.",
	"удалил 38 зуб. экстракция прошла успешно. анестезия",
	"пациент хочет имплант на место 24. хирург",
	"жалобы: кровоточит десна. гигиена airflow",
];

visitInputs.forEach((input) => {
	console.log(`Input: "${input}"`);
	console.log(JSON.stringify(parseVisitDictationLocal(input), null, 2));
});
