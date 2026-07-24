import { smartBookingParser } from './lib/smartBookingParser';
import { parseVisitDictationLocal } from './lib/smartVisitParser';
import { parsePatientDictationLocal } from './lib/smartPatientParser';

const dashboardMock = {
  clinicSettings: {
    profile: { timezone: "Europe/Moscow" },
    staff: [
      { id: "doc1", fullName: "Иванов Петр Сергеевич", role: "doctor", active: true },
      { id: "ast1", fullName: "Сидорова Анна", role: "assistant", active: true }
    ],
    chairs: [
      { id: "chair1", name: "Кабинет 1", active: true },
      { id: "chair2", name: "Кабинет 2", active: true },
    ]
  },
  patients: [
    { id: "pat1", fullName: "Смирнов Алексей" }
  ]
};

const bookingPhrases = [
  "Запиши Смирнова к Иванову на завтра на 15:30 в первый кабинет, будет удаление восьмерки",
  "Перенеси Смирнова Алексея к Петру Сергеевичу на послезавтра на полтора часа",
  "Отмени запись Смирнова",
  "Смирнов Алексей удаление зуба в половину пятого на сорок пять минут",
  "Записать Смирнова к Иванову на послезавтра на пол-третьего",
  "Смирнов удаление на час"
];

console.log("=== BOOKING PARSER TESTS ===");
for (const phrase of bookingPhrases) {
  console.log("\nInput:", phrase);
  console.log("Parsed:", JSON.stringify(smartBookingParser(phrase, dashboardMock as any), null, 2));
}

const visitPhrases = [
  "Жалобы пациента на острую боль в области зуба 46, болит всю ночь. Анамнез: зуб ранее лечен по поводу кариеса. Объективно: глубокая кариозная полость, зондирование болезненно, перкуссия резко болезненна. Диагноз: острый пульпит. Лечение: анестезия, экстирпация пульпы, пломбировка каналов."
];

console.log("\n=== VISIT PARSER TESTS ===");
for (const phrase of visitPhrases) {
  console.log("\nInput:", phrase);
  console.log("Parsed:", JSON.stringify(parseVisitDictationLocal(phrase), null, 2));
}

const patientPhrases = [
  "Пациентка смирнова анна, телефон восемь девятьсот шестнадцать сто двадцать три сорок пять шестьдесят семь. Дата рождения пятнадцатое мая тысяча девятьсот восемьдесят пятого. Аллергия на лидокаин. Боится боли. Дмс альфастрахование."
];

console.log("\n=== PATIENT PARSER TESTS ===");
for (const phrase of patientPhrases) {
  console.log("\nInput:", phrase);
  console.log("Parsed:", JSON.stringify(parsePatientDictationLocal(phrase), null, 2));
}
