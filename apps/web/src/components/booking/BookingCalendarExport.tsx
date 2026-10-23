import { CalendarPlus, Download, ExternalLink, MapPin, MessageSquare } from "lucide-react";
import type React from "react";
import { useCallback } from "react";
import {
	generateGoogleCalendarUrl,
	generateIcsCalendarContent,
	generateYandexCalendarUrl,
} from "./engine/bookingCalendarExportUtils";

export interface BookingCalendarExportProps {
	readonly doctorFullName: string;
	readonly patientDisplayName: string;
	readonly reference: string;
	readonly branchAddress: string;
	readonly branchPhone?: string | undefined;
	readonly dateStr: string;
	readonly timeStr: string;
	readonly startsAt: string;
	readonly endsAt: string;
}

export const BookingCalendarExport: React.FC<BookingCalendarExportProps> = ({
	doctorFullName,
	patientDisplayName,
	reference,
	branchAddress,
	branchPhone = "+78000000000",
	dateStr,
	timeStr,
	startsAt,
	endsAt,
}) => {
	const handleDownloadIcs = useCallback(() => {
		const icsContent = generateIcsCalendarContent({
			title: `Приём в клинике DENTE: ${doctorFullName}`,
			description: `Запись на приём\\nВрач: ${doctorFullName}\\nПациент: ${patientDisplayName}\\nТалон: ${reference}`,
			location: branchAddress,
			startsAt,
			endsAt,
		});
		const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `dente-booking-${reference}.ics`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, [doctorFullName, patientDisplayName, reference, branchAddress, startsAt, endsAt]);

	const googleUrl = generateGoogleCalendarUrl({
		title: `DENTE: Приём врача (${doctorFullName})`,
		description: `Запись в DENTE Dental\\nВрач: ${doctorFullName}\\nТалон: ${reference}`,
		location: branchAddress,
		startsAt,
		endsAt,
	});

	const yandexUrl = generateYandexCalendarUrl({
		title: `DENTE: Приём врача (${doctorFullName})`,
		description: `Запись в DENTE Dental\\nВрач: ${doctorFullName}\\nТалон: ${reference}`,
		location: branchAddress,
		startsAt,
		endsAt,
	});

	const mapsUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(branchAddress)}`;
	const waUrl = `https://wa.me/${branchPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Здравствуйте! Моя онлайн-запись ${reference} на ${dateStr} в ${timeStr}.`)}`;

	return (
		<div className="w-full space-y-3">
			<div>
				<div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 text-left">
					Добавить напоминание в календарь:
				</div>
				<div className="dbw-export-actions-grid">
					<button type="button" className="dbw-export-btn primary-button primary" onClick={handleDownloadIcs}>
						<Download size={16} />
						<span>Скачать .ICS файл</span>
					</button>
					<a href={googleUrl} target="_blank" rel="noreferrer" className="dbw-export-btn secondary-button">
						<CalendarPlus size={16} />
						<span>Google Календарь</span>
						<ExternalLink size={14} className="opacity-60" />
					</a>
					<a href={yandexUrl} target="_blank" rel="noreferrer" className="dbw-export-btn secondary-button">
						<CalendarPlus size={16} />
						<span>Яндекс Календарь</span>
						<ExternalLink size={14} className="opacity-60" />
					</a>
				</div>
			</div>

			<div>
				<div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 text-left">
					Полезные сервисы:
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
					<a href={mapsUrl} target="_blank" rel="noreferrer" className="dbw-action-chip-btn secondary-button">
						<MapPin size={16} className="text-red-500 shrink-0" />
						<span className="truncate">Открыть маршрут в Яндекс.Картах</span>
						<ExternalLink size={13} className="opacity-50 shrink-0" />
					</a>
					<a href={waUrl} target="_blank" rel="noreferrer" className="dbw-action-chip-btn secondary-button">
						<MessageSquare size={16} className="text-green-500 shrink-0" />
						<span className="truncate">Написать в WhatsApp клиники</span>
						<ExternalLink size={13} className="opacity-50 shrink-0" />
					</a>
				</div>
			</div>
		</div>
	);
};
