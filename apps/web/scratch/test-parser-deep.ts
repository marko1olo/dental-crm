import { parseBookingDictationLocal } from "../src/lib/smartBookingParser";
import { parsePatientDictationLocal } from "../src/lib/smartPatientParser";
import { parseVisitDictationLocal } from "../src/lib/smartVisitParser";

const patientTests = [
	"Запиши нового: Иванов Иван Иваныч, тел 89991234567, днюха 12 мая 1980, аллергия на лидокаин, пометка: очень нервный",
	"пац смирнова анна, 01.01.1990, +7 (900) 555-55-55. Желтуха в анамнезе.",
	"Новый поц: Сидоров Петр, номер 8-912-345-67-89", // Edge case: поц
	"Запиши тел 999 888 77 66, зовут Марина, 5 октября 2000 года",
	"василий иванов 89000000000 12.12.12", // minimal
];

const visitTests = [
	"жалобы на острую боль в 46 зубе пульпит лечили каналы анестезия",
	"кариес 21 зуба пломба харизма",
	"удаление 8ки снизу слева сложное, жалоба на отек",
	"периодонтит 35 зуб мышьяк поставили",
	"зуб 1.1 и 1.2 скол эмали реставрация",
	"гигиена полости рта, жалоб нет",
	"жалоба: болит десна около 47 зуба. Диагноз: гингивит. Лечение: вектор.",
];

console.log("=== PATIENT PARSER DEEP TEST ===");
for (const t of patientTests) {
	console.log("\nINPUT:", t);
	console.log("OUTPUT:", parsePatientDictationLocal(t));
}

console.log("\n=== VISIT PARSER DEEP TEST ===");
for (const t of visitTests) {
	console.log("\nINPUT:", t);
	console.log("OUTPUT:", parseVisitDictationLocal(t));
}
