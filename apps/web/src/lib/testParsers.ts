
import { smartBookingParser } from "./smartBookingParser";
import { parseVisitDictationLocal } from "./smartVisitParser";
import { parsePatientDictationLocal } from "./smartPatientParser";
import * as fs from "fs";

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: "d1", fullName: "Иванов Иван", role: "doctor", specialties: ["хирург", "имплантолог"], active: true },
      { id: "d2", fullName: "Петрова Анна", role: "doctor", specialties: ["терапевт"], active: true },
      { id: "a1", fullName: "Сидорова Елена", role: "assistant", active: true }
    ],
    chairs: [
      { id: "c1", name: "Кресло 1 (Хирургия)" },
      { id: "c2", name: "Кресло 2" }
    ]
  },
  patients: [
    { id: "p1", fullName: "Смирнов Алексей Иванович", phone: "79991234567" },
    { id: "p2", fullName: "Козлова Мария", phone: "79997654321" }
  ]
};

const results: any = {
  schedule: [],
  visit: [],
  patient: []
};

const scheduleCases = [
  "Запиши Смирнова на завтра на 10 утра к Иванову на удаление восьмерки",
  "Перенеси пациента Козлова на 15:30 в четверг к Петровой, а то она не успевает",
  "Отмени запись Смирнова Алексея на сегодня, он заболел",
  "Запиши нового пациента номер 89991112233 на имплантацию к Иванову в кресло 1 на 12 часов дня, будет полтора часа",
];

scheduleCases.forEach(c => {
  results.schedule.push({ input: c, output: smartBookingParser(c, mockDashboard as any) });
});

const visitCases = [
  "жалобы на боль в 48 зубе при накусывании. объективно 48 зуб кариес дентина глубокий. лечение: анестезия, препарирование, пломба. зуб 48 вылечен.",
  "осмотр. 11, 12, 21 зубы кариес. 47 зуб отсутствует. планируется имплантация на место 47.",
  "пациент жалуется на выпадение пломбы. зуб 36 кариес маргинальный. диагноз вторичный кариес. лечение проведено."
];

visitCases.forEach(c => {
  results.visit.push({ input: c, output: parseVisitDictationLocal(c) });
});

const patientCases = [
  "Новый пациент Зайцев Игорь Петрович телефон плюс 7 900 111 22 33 дата рождения 15 мая 1985 года. Аллергия на лидокаин.",
  "Сидоров Андрей, номер 8 999 555 44 33, почта sidorov собака mail.ru, вип пациент, беременность 5 месяц"
];

patientCases.forEach(c => {
  results.patient.push({ input: c, output: parsePatientDictationLocal(c) });
});

fs.writeFileSync("testResults.json", JSON.stringify(results, null, 2), "utf-8");
console.log("Done");

