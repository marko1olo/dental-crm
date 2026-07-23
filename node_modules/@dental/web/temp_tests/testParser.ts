import { smartBookingParser } from "../src/lib/smartBookingParser";

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: "doc_1", fullName: "Иванов Иван", role: "doctor", active: true },
      { id: "doc_2", fullName: "Садыкова Анна", role: "doctor", active: true }
    ],
    chairs: [{ id: "chair_1" }, { id: "chair_2" }]
  },
  patients: [
    { id: "pat_1", fullName: "Петров Петр" },
    { id: "pat_2", fullName: "Смирнова Мария" }
  ],
  appointments: [
    // Conflict at 14:00 today for doc_1
    { doctorUserId: "doc_1", startsAt: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(), endsAt: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(), status: "scheduled" }
  ]
} as any;

const testCases = [
  "Запиши Петрова к Иванову сегодня на 14:00, кариес",
  "Смирнова к Садыковой завтра на 15:30, пульпит",
  "Удаление для Петрова сегодня на 16:00",
  "Смирнова чистка послезавтра в 10",
  "Запиши Петрова на сегодня 14:00 пульпит" // Should conflict with Ivanov's 14:00 and push to 15:00 (if doc matched, but no doc here, so no conflict)
];

console.log("=== RUNNING SMART BOOKING PARSER TESTS ===");
for (const tc of testCases) {
  const result = smartBookingParser(tc, mockDashboard);
  console.log(`\nText: "${tc}"`);
  console.log(`- Doctor ID: ${result.doctorUserId || 'Not found'}`);
  console.log(`- Patient ID: ${result.patientId || 'Not found'}`);
  console.log(`- Reason: ${result.reason || 'Not found'}`);
  console.log(`- Starts At: ${result.startsAt ? new Date(result.startsAt).toLocaleString() : 'Not found'}`);
  console.log(`- Ends At:   ${result.endsAt ? new Date(result.endsAt).toLocaleString() : 'Not found'}`);
}
console.log("\n=== TESTS FINISHED ===");
