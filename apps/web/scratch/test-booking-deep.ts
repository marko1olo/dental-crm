import type { Dashboard } from "@dental/shared";
import { smartBookingParser } from "../src/lib/smartBookingParser";

const mockDashboard: any = {
	clinicSettings: {
		staff: [
			{
				id: "doc1",
				role: "doctor",
				fullName: "Иванов Иван Иванович",
				phone: "123",
				active: true,
				specialties: ["терапевт", "хирург"],
			},
			{
				id: "doc2",
				role: "doctor",
				fullName: "Смирнова Анна",
				phone: "123",
				active: true,
				specialties: ["ортодонт"],
			},
			{
				id: "as1",
				role: "assistant",
				fullName: "Ассистент Петр",
				phone: "123",
				active: true,
				specialties: [],
			},
		],
		chairs: [
			{
				id: "c1",
				name: "Кресло 1",
				active: true,
				branchId: "b1",
				settings: {},
			},
			{
				id: "c2",
				name: "Кресло 2",
				active: true,
				branchId: "b1",
				settings: {},
			},
		],
	},
	patients: [],
};

const tests = [
	"запиши сидорова завтра после обеда к хирургу на удаление",
	"отмени запись петрова на завтра",
	"перенеси анну на послезавтра к смирновой на 15 00",
	"запиши бабушку катю к ортодонту 5 сентября вечером на имплант",
	"новая запись: пац ильин 89001234567, врач иванов, время 10:30, жалоба: кариес",
	"запиши на кресло 2 марину завтра в 9 утра",
];

console.log("=== BOOKING PARSER DEEP TEST ===");
for (const t of tests) {
	console.log("\nINPUT:", t);
	console.log("OUTPUT:", smartBookingParser(t, mockDashboard));
}
