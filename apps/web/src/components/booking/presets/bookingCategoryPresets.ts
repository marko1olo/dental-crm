import type { BookingCategoryOption, ClinicBranch, ServiceCategory, BookingDoctorData } from "../contracts/bookingContracts";

export const CANONICAL_BOOKING_CATEGORIES: BookingCategoryOption[] = [
	{
		id: "therapy",
		title: "Лечение кариеса",
		subtitle: "Терапия, пломбы, эстетическая реставрация, лечение каналов",
		durationMinutes: 45,
		priceLabel: "от 3 500 ₽",
		iconName: "Stethoscope",
		isPopular: true,
		badge: "Популярно",
	},
	{
		id: "hygiene",
		title: "Чистка зубов",
		subtitle: "Комплексная гигиена, снятие налёта, ультразвук и AirFlow",
		durationMinutes: 60,
		priceLabel: "от 4 500 ₽",
		iconName: "Sparkles",
		isPopular: true,
	},
	{
		id: "emergency",
		title: "⚡ Срочный приём / Острая боль",
		subtitle: "Экстренная помощь день-в-день, снятие болевого синдрома",
		durationMinutes: 30,
		priceLabel: "от 2 500 ₽",
		iconName: "Activity",
		badge: "Срочно",
	},
	{
		id: "consultation",
		title: "Консультация и осмотр",
		subtitle: "Первичный приём, диагностика и составление комплексного плана",
		durationMinutes: 30,
		priceLabel: "Бесплатно",
		iconName: "Smile",
		badge: "0 ₽",
	},
	{
		id: "orthodontics",
		title: "Брекеты и элайнеры",
		subtitle: "Консультация ортодонта, диагностика прикуса и выравнивание зубов",
		durationMinutes: 45,
		priceLabel: "от 3 000 ₽",
		iconName: "Smile",
	},
	{
		id: "surgery",
		title: "Имплантация и хирургия",
		subtitle: "Удаление зубов, дентальная имплантация, консультация хирурга",
		durationMinutes: 45,
		priceLabel: "от 5 000 ₽",
		iconName: "Scissors",
	},
];

export const DEFAULT_BRANCHES: ClinicBranch[] = [];
export const DEFAULT_SERVICE_CATEGORIES: ServiceCategory[] = [];
export const DEFAULT_DOCTORS: BookingDoctorData[] = [];
