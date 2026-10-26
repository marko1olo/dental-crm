import React from "react";
import { CalendarPlus, ExternalLink } from "lucide-react";
import type { PatientAppointmentItem } from "../../patientCabinetEngine";
import { getAppointmentCalendarDates } from "./overviewDates";

export interface OverviewCalendarButtonsProps {
	readonly appt: PatientAppointmentItem;
}

export const OverviewCalendarButtons: React.FC<OverviewCalendarButtonsProps> = ({ appt }) => {
	const handleAppleCal = () => {
		const calDates = getAppointmentCalendarDates(appt.dateIso, appt.timeRu);
		const ics = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//DENTE Dental CRM//Patient Cabinet//RU\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nBEGIN:VEVENT\r\nUID:dente-appt-${Date.now()}@dente.ru\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z\r\nDTSTART:${calDates.startCompact}\r\nDTEND:${calDates.endCompact}\r\nSUMMARY:Прием в DENTE: ${appt.doctorName || "Врач"}\r\nDESCRIPTION:Прием: ${appt.titleRu || "Консультация"}\\nАдрес: ${appt.clinicName || "Клиника DENTE"}, ${appt.roomNumber || ""}\r\nLOCATION:${appt.clinicName || "Клиника DENTE"}, ${appt.roomNumber || ""}\r\nSTATUS:CONFIRMED\r\nBEGIN:VALARM\r\nTRIGGER:-PT2H\r\nACTION:DISPLAY\r\nDESCRIPTION:Напоминание о приеме в клинике DENTE через 2 часа\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;
		const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Dente_Appointment_${(appt.dateIso || "2026-09-01").slice(0, 10)}.ics`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleGoogleCal = () => {
		const calDates = getAppointmentCalendarDates(appt.dateIso, appt.timeRu);
		const title = encodeURIComponent(`Прием в DENTE: ${appt.doctorName || "Врач"}`);
		const details = encodeURIComponent(`Прием: ${appt.titleRu || "Консультация"}\nАдрес: ${appt.clinicName || "Клиника DENTE"}, ${appt.roomNumber || ""}`);
		const location = encodeURIComponent(`${appt.clinicName || "Клиника DENTE"}, ${appt.roomNumber || ""}`);
		window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${calDates.startCompact}/${calDates.endCompact}&details=${details}&location=${location}`, "_blank");
	};

	const handleYandexCal = () => {
		const calDates = getAppointmentCalendarDates(appt.dateIso, appt.timeRu);
		const name = encodeURIComponent(`Прием в DENTE: ${appt.doctorName || "Врач"}`);
		const desc = encodeURIComponent(`Прием: ${appt.titleRu || "Консультация"}\nАдрес: ${appt.clinicName || "Клиника DENTE"}, ${appt.roomNumber || ""}`);
		const location = encodeURIComponent(`${appt.clinicName || "Клиника DENTE"}, ${appt.roomNumber || ""}`);
		window.open(`https://calendar.yandex.ru/event/new?name=${name}&start_ts=${calDates.startYandex}&end_ts=${calDates.endYandex}&description=${desc}&location=${location}`, "_blank");
	};

	return (
		<div className="pc-calendar-export-strip">
			<span className="pc-cal-label">Добавить в календарь:</span>
			<div className="pc-cal-buttons">
				<button type="button" className="pc-cal-btn" onClick={handleAppleCal} data-testid="next-appt-apple-cal-btn">
					<CalendarPlus size={14} />
					<span>Apple iCal</span>
				</button>
				<button type="button" className="pc-cal-btn" onClick={handleGoogleCal} data-testid="next-appt-google-cal-btn">
					<ExternalLink size={14} />
					<span>Google</span>
				</button>
				<button type="button" className="pc-cal-btn" onClick={handleYandexCal} data-testid="next-appt-yandex-cal-btn">
					<ExternalLink size={14} />
					<span>Яндекс</span>
				</button>
			</div>
		</div>
	);
};
