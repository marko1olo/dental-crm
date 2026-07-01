import { smartBookingParser } from './apps/web/src/lib/smartBookingParser';

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: "d1", fullName: "Иванов Иван Иванович", role: "doctor", active: true },
      { id: "d2", fullName: "Смирнова Анна Сергеевна", role: "doctor", active: true }
    ]
  },
  appointments: [], 
  patients: [
    { id: "p1", fullName: "Иванов Петр" },
    { id: "p2", fullName: "Удалов Алексей" }
  ]
};

const phrases = [
  "Иванов на кариес к иванову завтра в 14:00",
  "Смирнова пульпит удалов в среду в 10 утра",
  "Иванов удаление зуба мудрости иванов 15 мая 12:30",
  "записать иванова на осмотр завтра",
  "удалов чистка к смирновой в пятницу 18:00",
  "удалов к иванову на 10:00"
];

for (const phrase of phrases) {
  console.log(`\nPhrase: "${phrase}"`);
  const result = smartBookingParser(phrase, mockDashboard as any);
  console.log(result);
}
