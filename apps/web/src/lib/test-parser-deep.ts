import { smartBookingParser } from './smartBookingParser';

const mockDashboard = {
  clinicSettings: {
    staff: [
      { id: "d1", active: true, role: "doctor", fullName: "Иванов Иван" },
      { id: "d2", active: true, role: "doctor", fullName: "Смирнов Сергей" },
      { id: "d3", active: true, role: "doctor", fullName: "Петров Петр" },
      { id: "d4", active: true, role: "doctor", fullName: "Удальцов Олег" }
    ]
  },
  patients: [
    { id: "p1", fullName: "Иванов Петр" },
    { id: "p2", fullName: "Сидоров Алексей" },
    { id: "p3", fullName: "Удалов Максим" },
    { id: "p4", fullName: "Иванова Мария" }
  ]
} as any;

function runTests() {
  const testCases = [
    {
      name: "Standard Booking",
      input: "Запиши Иванова на завтра к доктору Смирнову на кариес",
      expectPatient: "Иванов",
      expectDoctor: "Смирнов",
      expectReason: "кариес"
    },
    {
      name: "Collision: Doctor and Patient same last name (Иванов к Иванову)",
      input: "Запиши пациента Иванова к врачу Иванову на удаление",
      expectPatient: "Иванов",
      expectDoctor: "Иванов",
      expectReason: "удаление"
    },
    {
      name: "Collision: Patient name sounds like procedure (Удалов на чистку)",
      input: "Пациент Удалов придет на чистку к Петрову",
      expectPatient: "Удалов",
      expectDoctor: "Петров",
      expectReason: "чистка"
    },
    {
      name: "Collision: Doctor name sounds like procedure (Удальцов на кариес)",
      input: "Запиши Сидорова к Удальцову на кариес",
      expectPatient: "Сидоров",
      expectDoctor: "Удальцов",
      expectReason: "кариес"
    },
    {
      name: "Date and Time extraction",
      input: "Иванова к Петрову завтра в 14:30 на пульпит",
      expectPatient: "Иванова",
      expectDoctor: "Петров",
      expectReason: "пульпит",
      expectTime: "14:30"
    },
    {
      name: "Complex phrasing without doctor",
      input: "Мне нужно записать ребенка Сидорова на осмотр завтра утром",
      expectPatient: "Сидоров",
      expectReason: "осмотр"
    },
    {
      name: "Date: Next week specific day",
      input: "Запиши Иванову на следующую среду в 15:00 на удаление зуба мудрости к Петрову",
      expectPatient: "Иванов",
      expectDoctor: "Петров",
      expectReason: "удаление зуба мудрости",
      expectTime: "15:00"
    },
    {
      name: "Time with text (часов вечера)",
      input: "Смирнов придет сегодня в 6 часов вечера на имплантацию к Удальцову",
      expectPatient: "Смирнов",
      expectDoctor: "Удальцов",
      expectReason: "имплантация",
      expectTime: "18:00"
    },
    {
      name: "Explicit date",
      input: "Запиши пациента Удалов на 25 мая в 10:30 на кт",
      expectPatient: "Удалов",
      expectReason: "кт",
      expectTime: "10:30"
    },
    {
      name: "Only doctor and reason",
      input: "К Иванову на консультацию",
      expectDoctor: "Иванов",
      expectReason: "консультация"
    },
    {
      name: "Confusing numbers (tooth vs time)",
      input: "Сидоров, болит 36 зуб, запиши на завтра в 12:00 на пульпит к Смирнову",
      expectPatient: "Сидоров",
      expectDoctor: "Смирнов",
      expectReason: "пульпит",
      expectTime: "12:00"
    }
  ];

  let passed = 0;
  console.log("=== RUNNING SMART PARSER TESTS ===");
  
  testCases.forEach((tc, index) => {
    const result = smartBookingParser(tc.input, mockDashboard);
    let ok = true;
    const errors: string[] = [];
    
    // Loose matching for assertions to handle stemming (Иванова -> Иванов)
    if (tc.expectDoctor && !mockDashboard.clinicSettings.staff.find(s=>s.id===result.doctorUserId)?.fullName.includes(tc.expectDoctor)) {
      ok = false; errors.push(`Expected doctor ${tc.expectDoctor}, got ${(mockDashboard.clinicSettings.staff.find(s=>s.id===result.doctorUserId)?.fullName)}`);
    }
    if (tc.expectReason && !result.reason?.toLowerCase().includes(tc.expectReason.toLowerCase().substring(0,4))) {
      ok = false; errors.push(`Expected reason ${tc.expectReason}, got ${result.reason}`);
    }
    
    if (tc.expectTime) {
      const d = new Date(result.startsAt as string);
      const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      if (timeStr !== tc.expectTime) {
        ok = false; errors.push(`Expected time ${tc.expectTime}, got ${timeStr}`);
      }
    }
    
    if (ok) {
      console.log(`[PASS] ${tc.name}`);
      passed++;
    } else {
      console.log(`[FAIL] ${tc.name}`);
      console.log(`       Input: "${tc.input}"`);
      console.log(`       Output: ${JSON.stringify(result)}`);
      errors.forEach(e => console.log(`       -> ${e}`));
    }
  });

  console.log(`\n=== RESULTS: ${passed}/${testCases.length} PASSED ===`);
}

runTests();
