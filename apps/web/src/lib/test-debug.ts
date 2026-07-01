import { smartBookingParser } from "./smartBookingParser";

const mockDashboard = { 
  clinicSettings: { staff: [ { id: "d1", active: true, role: "doctor", fullName: "Иванов Иван" }, { id: "d2", active: true, role: "doctor", fullName: "Смирнов Сергей" }, { id: "d3", active: true, role: "doctor", fullName: "Петров Петр" }, { id: "d4", active: true, role: "doctor", fullName: "Удальцов Олег" } ] }, 
  patients: [ { id: "p1", fullName: "Иванов Петр" }, { id: "p2", fullName: "Сидоров Алексей" }, { id: "p3", fullName: "Удалов Максим" }, { id: "p4", fullName: "Иванова Мария" } ] 
} as any; 

console.log(smartBookingParser("Пациент Удалов придет на чистку к Петрову", mockDashboard));
