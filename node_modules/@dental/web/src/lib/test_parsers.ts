import { parsePatientDictationLocal } from "./smartPatientParser";
import { parseScheduleDictationLocal } from "./smartScheduleParser";
import { smartBookingParser } from "./smartBookingParser";
import { parseVisitDictationLocal } from "./smartVisitParser";

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: "d1", fullName: "Иванов Иван Иванович", role: "doctor", active: true },
      { id: "d2", fullName: "Смирнова Мария", role: "doctor", active: true },
    ]
  },
  patients: [
    { id: "p1", fullName: "Петров Петр Петрович", status: "active" },
    { id: "p2", fullName: "Сидорова Анна", status: "active" },
  ]
} as any;

function testPatientParsing() {
  console.log("--- PATIENT PARSING TESTS ---");
  const cases = [
    "Создай пациента Иванов Иван Иванович 12.05.1990 +79001234567",
    "Иванова Мария 12 мая 90 8(999)123-45-67",
    "Запиши Смирнов Алексей 12/05/85 79001112233",
    "Новый пациент Петров Петр 8 900 123 45 67 заметка: аллергия на лидокаин, боится боли",
    "Пациентка Ковалева Анна Викторовна 12.12.2001 телефон 8(916) 123 45 67 пометка придет с мамой",
    "Запиши пациента номер 89991234567 Смирнов Алексей 12 мая 1985",
  ];

  for (const c of cases) {
    console.log(`Input: "${c}"`);
    console.log(`Result:`, parsePatientDictationLocal(c));
    console.log("-");
  }
}

function testScheduleParsing() {
  console.log("--- SCHEDULE PARSING TESTS ---");
  const cases = [
    "запиши петрова ивана завтра в 14:30 на чистку",
    "сегодня в 12 часов смирнова мария на удаление",
    "пациента иванова на 16:00 кариес",
    "удали запись петрова на завтра",
    "сними смирнову с 15:00",
    "отмена записи на 12 часов",
    "запиши петрова на снимок зуба",
    "пациент петров на удаление зуба 15 в пятницу",
  ];

  for (const c of cases) {
    console.log(`Input: "${c}"`);
    console.log(`Result:`, parseScheduleDictationLocal(c));
    console.log("-");
  }
}

function testBookingParsing() {
  console.log("--- BOOKING PARSING TESTS ---");
  const cases = [
    "запиши петрова петра к иванову ивану завтра в 14:30 на чистку зубов",
    "удали запись петрова к иванову",
    "запиши анну сидорову к марии на имплантацию послезавтра в 12:00, пациентка очень боится",
    "сегодня в 16:00 петров на осмотр к иванову",
    "запиши на снимок к марии завтра в 10 утра",
  ];

  for (const c of cases) {
    console.log(`Input: "${c}"`);
    console.log(`Result:`, smartBookingParser(c, mockDashboard));
    console.log("-");
  }
}

function testVisitParsing() {
  console.log("--- VISIT PARSING TESTS ---");
  const cases = [
    "кариес 45 зуба. жалобы на боли от сладкого. лечение: анестезия, пломба.",
    "Пациент жалуется на сильную боль в 46 зубе, ноет по ночам. Объективно: глубокая полость. Диагноз: острый пульпит.",
    "ВЧ удаление зуба мудрости. Жалуется на боль. Сделали анестезию, удалили зуб.",
    "Пришел на профосмотр. Сделали чистку Air Flow и ультразвук. Рекомендована замена щетки.",
  ];

  for (const c of cases) {
    console.log(`Input: "${c}"`);
    console.log(`Result:`, parseVisitDictationLocal(c));
    console.log("-");
  }
}

testPatientParsing();
testScheduleParsing();
testBookingParsing();
testVisitParsing();
