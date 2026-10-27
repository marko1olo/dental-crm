import type { BookingConfirmationData } from "../../PublicOnlineBookingWidget";

export const mockConfirmationData: BookingConfirmationData = {
	referenceNumber: "DNT-7788-9900",
	date: "2026-10-15",
	time: "14:30",
	startsAt: "2026-10-15T14:30:00.000Z",
	endsAt: "2026-10-15T15:00:00.000Z",
	cabinetNumber: "Кабинет №5 (Хирургическое отделение)",
	patientName: "Алексей Смирнов",
	patientPhone: "+7 (999) 111-22-33",
	doctor: {
		id: "doc-1",
		fullName: "Д-р Смирнова Анна Павловна",
		specialties: ["Стоматолог-терапевт"],
		categoryIds: ["cat-1"],
		experienceYears: 12,
		rating: 4.95,
		reviewsCount: 142,
	},
	branch: {
		id: "b-1",
		name: "DENTE Центр",
		address: "г. Москва, ул. Тверская, д. 12",
		phone: "+7 (495) 100-20-30",
		workHours: "09:00 - 21:00",
	},
	createdAt: "2026-09-24T12:00:00.000Z",
};
