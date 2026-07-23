import { smartBookingParser } from '../src/lib/smartBookingParser.js';
import { parseScheduleDictationLocal } from '../src/lib/smartScheduleParser.js';
import { parsePatientDictationLocal } from '../src/lib/smartPatientParser.js';
import { parseVisitDictationLocal } from '../src/lib/smartVisitParser.js';
import { parseDictation as parseSemanticDictation } from '../src/lib/semanticParser.js';

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: "d1", fullName: "Иванов Иван", role: "doctor", active: true },
      { id: "d2", fullName: "Петров Петр", role: "doctor", active: true }
    ]
  },
  patients: [
    { id: "p1", fullName: "Сидоров Алексей" },
    { id: "p2", fullName: "Смирнова Анна" }
  ]
};

const phrases = [
  "Запиши Сидорова к Иванову на завтра в 14:30 на пульпит",
  "Отмени запись Смирновой",
  "Перенеси Сидорова на послезавтра в 12 часов",
  "Новый пациент Козлов Игорь 89001234567 15 мая 1990",
  "У пациента болит 36 зуб, кариес, надо сделать чистку",
  "Запиши пациента на понедельник в 10 утра на имплантацию",
  "Срочно отмени прием на сегодня в 15:00",
  "Пациент Петров отмена",
  "Передвинь запись Иванова на 18:00"
];

console.log("=== TESTING SMART BOOKING PARSER ===");
phrases.forEach(p => console.log(`"${p}" ->`, smartBookingParser(p, mockDashboard as any)));

console.log("\\n=== TESTING SMART SCHEDULE PARSER ===");
phrases.forEach(p => console.log(`"${p}" ->`, parseScheduleDictationLocal(p)));

console.log("\\n=== TESTING SMART PATIENT PARSER ===");
phrases.forEach(p => console.log(`"${p}" ->`, parsePatientDictationLocal(p)));

console.log("\\n=== TESTING SMART VISIT PARSER ===");
phrases.forEach(p => console.log(`"${p}" ->`, parseVisitDictationLocal(p)));

console.log("\\n=== TESTING SEMANTIC PARSER ===");
phrases.forEach(p => console.log(`"${p}" ->`, parseSemanticDictation(p)));
