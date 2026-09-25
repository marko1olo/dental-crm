/**
 * patientCabinetAppointments.ts
 *
 * Утилиты приемов и клинические кейсы для личного кабинета пациента:
 * - Экспорт приемов в формате iCalendar (.ics, RFC 5545) для Apple/Google/Outlook календарей
 * - Навигация и построение маршрута в Яндекс.Картах
 * - Каталог клинических кейсов «До / После» (виниры, отбеливание, имплантация)
 */

import type { PatientAppointment } from "./patientCabinetEngine.js";

// ============================================================================
// MOBILE APPOINTMENT UTILITIES (iCALENDAR .ICS & YANDEX MAPS ROUTING)
// ============================================================================

/**
 * Генерирует файл формата iCalendar (.ics) по стандарту RFC 5545 для добавления записи в Apple/Google/Outlook календарь.
 */
export function generateIcsCalendarFile(
	appointment: PatientAppointment,
	clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140",
): { fileName: string; icsContent: string } {
	const dateParts = (appointment.dateIso || "2026-08-28").split("-");
	const timeParts = (appointment.timeRu || "14:30").split(":");
	const year = parseInt(dateParts[0] || "2026", 10);
	const month = parseInt(dateParts[1] || "08", 10);
	const day = parseInt(dateParts[2] || "28", 10);
	const hour = parseInt(timeParts[0] || "14", 10);
	const minute = parseInt(timeParts[1] || "30", 10);

	const pad = (n: number) => n.toString().padStart(2, "0");
	const dtStart = `${year}${pad(month)}${pad(day)}T${pad(hour)}${pad(minute)}00`;

	const endHour = hour + Math.floor((minute + 60) / 60);
	const endMinute = (minute + 60) % 60;
	const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;
	const dtStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
	const uid = `dente-appt-${appointment.id}-${year}${pad(month)}${pad(day)}@dente.ru`;

	const summary = `Прием в клинике DENTE: ${appointment.titleRu}`;
	const location = appointment.clinicAddressRu || clinicAddress;
	const description = `Врач: ${appointment.doctorName} (${appointment.doctorSpecialtyRu || "Стоматолог"})\\nКабинет: ${appointment.roomNumber || "Кабинет № 4"}\\nАдрес: ${location}\\nТелефон: +7 (812) 400-20-20`;

	const icsContent = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//DENTE Dental CRM//Patient Portal//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${dtStamp}`,
		`DTSTART:${dtStart}`,
		`DTEND:${dtEnd}`,
		`SUMMARY:${summary}`,
		`DESCRIPTION:${description}`,
		`LOCATION:${location}`,
		"STATUS:CONFIRMED",
		"BEGIN:VALARM",
		"TRIGGER:-PT2H",
		"ACTION:DISPLAY",
		"DESCRIPTION:Напоминание о приеме в клинике DENTE через 2 часа",
		"END:VALARM",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");

	const fileName = `DENTE_Priyom_${appointment.dateIso}_${appointment.timeRu.replace(":", "-")}.ics`;
	return { fileName, icsContent };
}

/**
 * Скачивает .ics файл на мобильное устройство или компьютер пациента.
 */
export function downloadIcsCalendarFile(
	appointment: PatientAppointment,
	clinicAddress?: string,
): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	try {
		const { fileName, icsContent } = generateIcsCalendarFile(appointment, clinicAddress);
		const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	} catch (e) {
		console.error("Failed to download .ics calendar file:", e);
	}
}

/**
 * Формирует прямую ссылку для построения маршрута в приложении Яндекс.Карты / веб-навигаторе.
 */
export function getYandexMapsRouteUrl(clinicAddress: string): string {
	return `https://yandex.ru/maps/?rtext=~${encodeURIComponent(clinicAddress)}&rtt=auto`;
}

// ============================================================================
// BEFORE / AFTER CLINICAL PHOTO CASES & COMPARISON GALLERY
// ============================================================================

export interface PatientBeforeAfterCase {
	readonly id: string;
	readonly categoryRu: "Виниры и эстетика" | "Отбеливание зубов" | "Имплантация и коронки" | "Ортодонтия (элайнеры)";
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly toothFdi?: string | undefined;
	readonly doctorName: string;
	readonly durationRu: string;
	readonly beforeImageUrl: string;
	readonly afterImageUrl: string;
	readonly beforeLabelRu: string;
	readonly afterLabelRu: string;
	readonly clinicalDetailsRu: string;
}

export const PATIENT_PORTAL_BEFORE_AFTER_CASES: readonly PatientBeforeAfterCase[] = [
	{
		id: "case-veneers-emax",
		categoryRu: "Виниры и эстетика",
		titleRu: "Эстетическая реставрация зоны улыбки: 4 винира IPS e.max",
		descriptionRu: "Устранение дисколорита, сколов режущего края и диастемы резцов 11, 12, 21, 22 с подбором естественного оттенка Bleach 4 / A1.",
		toothFdi: "11, 12, 21, 22",
		doctorName: "Д-р Смирнов А. В.",
		durationRu: "2 визита (10 дней)",
		beforeImageUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
		afterImageUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
		beforeLabelRu: "До лечения (Сколы и дисколорит)",
		afterLabelRu: "После (Керамика IPS e.max)",
		clinicalDetailsRu: "Микропрепарирование 0.3 мм, адгезивная фиксация Variolink Esthetic, идеальное краевое прилегание к десне.",
	},
	{
		id: "case-whitening-zoom",
		categoryRu: "Отбеливание зубов",
		titleRu: "Клиническое фотоотбеливание Philips ZOOM! 4 WhiteSpeed",
		descriptionRu: "Осветление эмали на 8 тонов по шкале VITA за 1 сеанс (4 сета по 15 минут) с нанесением защитного геля Relief ACP.",
		doctorName: "Д-р Кузнецова О. И.",
		durationRu: "1 сеанс (60 минут)",
		beforeImageUrl: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=600&q=80",
		afterImageUrl: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&q=80",
		beforeLabelRu: "До отбеливания (Оттенок A3.5)",
		afterLabelRu: "После ZOOM 4 (Оттенок B1)",
		clinicalDetailsRu: "Холодный LED-свет, нулевой риск перегрева пульпы, максимальный комфорт и долговременный результат.",
	},
	{
		id: "case-implant-katana",
		categoryRu: "Имплантация и коронки",
		titleRu: "Навигационная имплантация Osstem TS III + цирконий Katana ML",
		descriptionRu: "Одномоментная установка дентального имплантата с индивидуальным титановым абатментом и циркониевой коронкой с винтовой фиксацией.",
		toothFdi: "16, 26",
		doctorName: "Д-р Смирнов А. В.",
		durationRu: "3 месяца остеоинтеграции",
		beforeImageUrl: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80",
		afterImageUrl: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80",
		beforeLabelRu: "До (Отсутствие моляра)",
		afterLabelRu: "После (Цирконий Katana ML)",
		clinicalDetailsRu: "3D-хирургический шаблон, пожизненная гарантия на имплантат Osstem, естественная анатомия жевательных бугров.",
	},
];
