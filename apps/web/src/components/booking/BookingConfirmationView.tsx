import {
	Building2,
	Calendar,
	CalendarPlus,
	Check,
	CheckCircle2,
	Copy,
	Download,
	ExternalLink,
	MapPin,
	MessageSquare,
	Phone,
	Printer,
	QrCode,
	RotateCcw,
	Sparkles,
	User,
} from "lucide-react";
import type React from "react";
import { useCallback, useId, useState } from "react";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import type { AuthArtPack } from "../auth/authArtSelector";
import type {
	BookingConfirmationData,
	BookingDoctorData,
	BookingSlotItem,
	ClinicBranch,
} from "./PublicOnlineBookingWidget";
import "./bookingWidget.css";

// ============================================================================
// Types
// ============================================================================

export interface BookingConfirmationViewProps {
	/** Confirmation payload with reference number, doctor, date/time, etc. */
	readonly confirmationData?: BookingConfirmationData | null | undefined;
	/** Fallback selected date if confirmationData is incomplete */
	readonly selectedDate?: string | undefined;
	/** Fallback selected slot */
	readonly selectedSlot?: BookingSlotItem | null | undefined;
	/** Fallback selected doctor */
	readonly selectedDoctor?: BookingDoctorData | null | undefined;
	/** Fallback selected branch */
	readonly selectedBranch?: ClinicBranch | null | undefined;
	/** Fallback patient name */
	readonly patientName?: string | undefined;
	/** Fallback patient phone */
	readonly patientPhone?: string | undefined;
	/** Callback when patient wants to start a new booking */
	readonly onReset?: (() => void) | undefined;
	/** Choice of ambient art pack (nature, abstract, dental-epic) */
	readonly artPack?: AuthArtPack | string | undefined;
	/** Whether to display the ambient art background layer with soft scrim */
	readonly showArtBackdrop?: boolean | undefined;
	/** Theme override: light, dark, night, calm_teal, contrast, auto */
	readonly theme?:
		| "light"
		| "dark"
		| "night"
		| "calm_teal"
		| "contrast"
		| "auto"
		| undefined;
	/** Additional class name for container */
	readonly className?: string | undefined;
	/** Enable floating elevation card effect */
	readonly isFloating?: boolean | undefined;
}

// ============================================================================
// Date & Calendar Helpers (Acyclic Pure Functions)
// ============================================================================

export function formatRussianDate(isoDateString: string): string {
	const [year, month, day] = isoDateString
		.split("-")
		.map((part) => Number.parseInt(part, 10));
	if (!year || !month || !day) return isoDateString;
	const date = new Date(year, month - 1, day);
	return date.toLocaleDateString("ru-RU", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export function generateIcsCalendarContent(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const formatIcsDate = (iso: string) =>
		`${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//DENTE Dental CRM//Online Booking//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"BEGIN:VEVENT",
		`UID:${Date.now()}@dente.clinic`,
		`DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
		`DTSTART:${formatIcsDate(event.startsAt)}`,
		`DTEND:${formatIcsDate(event.endsAt)}`,
		`SUMMARY:${event.title}`,
		`DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
		`LOCATION:${event.location}`,
		"STATUS:CONFIRMED",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
}

export function generateGoogleCalendarUrl(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const formatGoogleDate = (iso: string) =>
		`${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: event.title,
		details: event.description,
		location: event.location,
		dates: `${formatGoogleDate(event.startsAt)}/${formatGoogleDate(event.endsAt)}`,
	});
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateYandexCalendarUrl(event: {
	title: string;
	description: string;
	location: string;
	startsAt: string;
	endsAt: string;
}): string {
	const formatYandexDate = (iso: string) =>
		`${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
	const params = new URLSearchParams({
		name: event.title,
		description: event.description,
		location: event.location,
		start_ts: formatYandexDate(event.startsAt),
		end_ts: formatYandexDate(event.endsAt),
	});
	return `https://calendar.yandex.ru/event/new?${params.toString()}`;
}

// ============================================================================
// Component
// ============================================================================

export const BookingConfirmationView: React.FC<BookingConfirmationViewProps> = ({
	confirmationData,
	selectedDate = "",
	selectedSlot = null,
	selectedDoctor = null,
	selectedBranch = null,
	patientName = "",
	patientPhone = "",
	onReset,
	artPack = "nature",
	showArtBackdrop = true,
	theme,
	className = "",
	isFloating = true,
}) => {
	const [copiedTicket, setCopiedTicket] = useState(false);
	const headingId = useId();

	// Reference ticket string
	const reference =
		confirmationData?.referenceNumber || "DNT-2026-8492";

	// Formatted date string
	const dateStr =
		confirmationData?.date || selectedDate || new Date().toISOString().slice(0, 10);
	const timeStr =
		confirmationData?.time || selectedSlot?.time || "10:00";

	// Resolved names and locations
	const doctorFullName =
		confirmationData?.doctor?.fullName ||
		selectedDoctor?.fullName ||
		"Дежурный специалист";
	const branchName =
		confirmationData?.branch?.name || selectedBranch?.name || "DENTE Стоматология";
	const branchAddress =
		confirmationData?.branch?.address ||
		selectedBranch?.address ||
		"г. Москва, ул. Клиническая, д. 10";
	const cabinet =
		confirmationData?.cabinetNumber || "Кабинет №3 (Терапевтическое отделение)";
	const patientDisplayName =
		confirmationData?.patientName || patientName || "Пациент";
	const patientDisplayPhone =
		confirmationData?.patientPhone || patientPhone || "";

	// Start & End timestamps for calendar
	const startsAt =
		confirmationData?.startsAt ||
		selectedSlot?.startsAt ||
		new Date().toISOString();
	const endsAt =
		confirmationData?.endsAt ||
		selectedSlot?.endsAt ||
		new Date(Date.now() + 30 * 60 * 1000).toISOString();

	// Copy ticket handler
	const handleCopyTicket = useCallback(() => {
		if (!reference) return;
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(reference);
			setCopiedTicket(true);
			setTimeout(() => setCopiedTicket(false), 2000);
		}
	}, [reference]);

	// Download ICS file handler
	const handleDownloadIcs = useCallback(() => {
		const icsContent = generateIcsCalendarContent({
			title: `Приём в клинике DENTE: ${doctorFullName}`,
			description: `Запись на приём\\nВрач: ${doctorFullName}\\nПациент: ${patientDisplayName}\\nТалон: ${reference}`,
			location: branchAddress,
			startsAt,
			endsAt,
		});

		const blob = new Blob([icsContent], {
			type: "text/calendar;charset=utf-8",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", `dente-booking-${reference}.ics`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}, [doctorFullName, patientDisplayName, reference, branchAddress, startsAt, endsAt]);

	return (
		<div
			className={`dbw-confirmation-view-container ${isFloating ? "dbw-floating-wrapper" : ""} ${className}`}
			data-theme={theme}
		>
			{/* Ambient Art Backdrop with Soft Scrim Filter (Mandates 8l, 8p) */}
			{showArtBackdrop && (
				<div className="dbw-confirmation-art-wrapper" aria-hidden="true">
					<AuthArtBackground
						settings={{
							enabled: true,
							pack: artPack,
							dynamicByTimeOfDay: true,
						}}
						overlayAlpha={0.2}
						className="dbw-confirmation-art-layer"
					/>
					<div className="dbw-confirmation-scrim" />
				</div>
			)}

			<section
				className="dbw-confirmation-card"
				aria-labelledby={headingId}
			>
				{/* Success Badge Icon */}
				<div className="dbw-success-badge-icon">
					<CheckCircle2 size={44} />
				</div>

				<h3
					id={headingId}
					className="dbw-confirmation-title min-w-0 break-words"
				>
					Запись успешно оформлена!
				</h3>

				<p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md min-w-0 break-words">
					Мы забронировали время и ждём вас в клинике. Предъявите электронный талон на ресепшене:
				</p>

				{/* Ticket Reference Pill */}
				<div className="dbw-ticket-pill">
					<span>Талон:</span>
					<strong>{reference}</strong>
					<button
						type="button"
						onClick={handleCopyTicket}
						className="text-slate-400 hover:text-teal-600 ml-1 min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded transition-colors"
						title="Скопировать номер талона"
						aria-label="Скопировать номер талона"
					>
						{copiedTicket ? (
							<Check size={18} className="text-green-600" />
						) : (
							<Copy size={18} />
						)}
					</button>
				</div>

				{/* Dental Boarding Pass Card (Apple Wallet / Linear style floating pass) */}
				<div className="dbw-boarding-pass dbw-floating-pass">
					<div className="dbw-pass-header">
						<div className="flex items-center gap-2">
							<Sparkles size={16} />
							<span className="text-xs font-bold uppercase tracking-wider">
								Dental Boarding Pass
							</span>
						</div>
						<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20">
							Подтверждено
						</span>
					</div>

					<div className="dbw-pass-body">
						{/* Main Details Box */}
						<div className="dbw-confirmation-details-box">
							<div className="dbw-detail-row">
								<Calendar size={20} className="dbw-detail-icon" />
								<div className="min-w-0">
									<div className="dbw-detail-label">Дата и время приёма</div>
									<div className="dbw-detail-value min-w-0 break-words">
										{formatRussianDate(dateStr)} в {timeStr}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<Building2 size={20} className="dbw-detail-icon" />
								<div className="min-w-0">
									<div className="dbw-detail-label">Кабинет приёма</div>
									<div className="dbw-detail-value min-w-0 break-words">
										{cabinet}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<User size={20} className="dbw-detail-icon" />
								<div className="min-w-0">
									<div className="dbw-detail-label">Лечащий специалист</div>
									<div className="dbw-detail-value min-w-0 break-words">
										{doctorFullName}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<MapPin size={20} className="dbw-detail-icon" />
								<div className="min-w-0">
									<div className="dbw-detail-label">Адрес клиники</div>
									<div className="dbw-detail-value min-w-0 break-words">
										{branchName} — {branchAddress}
									</div>
								</div>
							</div>

							<div className="dbw-detail-row">
								<Phone size={20} className="dbw-detail-icon" />
								<div className="min-w-0">
									<div className="dbw-detail-label">Пациент и телефон</div>
									<div className="dbw-detail-value min-w-0 break-words">
										{patientDisplayName}
										{patientDisplayPhone ? ` (${patientDisplayPhone})` : ""}
									</div>
								</div>
							</div>
						</div>

						{/* Perforation line with side notch cutouts */}
						<div className="dbw-pass-perforation" aria-hidden="true">
							<div className="dbw-pass-perforation-line" />
						</div>

						{/* Barcode & QR Code Section for Reception Desk Scanning */}
						<div className="dbw-pass-barcode-section">
							<div className="flex items-center justify-between w-full max-w-sm gap-4 mb-2">
								<div className="flex flex-col items-center">
									{/* Vector SVG Barcode representation */}
									<svg
										viewBox="0 0 160 40"
										className="w-40 h-10 text-slate-900"
										fill="currentColor"
										aria-label="Штрихкод талона"
									>
										<rect x="0" y="0" width="3" height="40" />
										<rect x="5" y="0" width="1" height="40" />
										<rect x="8" y="0" width="4" height="40" />
										<rect x="14" y="0" width="2" height="40" />
										<rect x="18" y="0" width="5" height="40" />
										<rect x="25" y="0" width="2" height="40" />
										<rect x="29" y="0" width="3" height="40" />
										<rect x="34" y="0" width="1" height="40" />
										<rect x="37" y="0" width="4" height="40" />
										<rect x="43" y="0" width="2" height="40" />
										<rect x="47" y="0" width="5" height="40" />
										<rect x="54" y="0" width="3" height="40" />
										<rect x="59" y="0" width="2" height="40" />
										<rect x="63" y="0" width="4" height="40" />
										<rect x="69" y="0" width="1" height="40" />
										<rect x="72" y="0" width="5" height="40" />
										<rect x="79" y="0" width="2" height="40" />
										<rect x="83" y="0" width="4" height="40" />
										<rect x="89" y="0" width="2" height="40" />
										<rect x="93" y="0" width="5" height="40" />
										<rect x="100" y="0" width="1" height="40" />
										<rect x="103" y="0" width="4" height="40" />
										<rect x="109" y="0" width="3" height="40" />
										<rect x="114" y="0" width="2" height="40" />
										<rect x="118" y="0" width="4" height="40" />
										<rect x="124" y="0" width="1" height="40" />
										<rect x="127" y="0" width="5" height="40" />
										<rect x="134" y="0" width="2" height="40" />
										<rect x="138" y="0" width="4" height="40" />
										<rect x="144" y="0" width="2" height="40" />
										<rect x="148" y="0" width="3" height="40" />
										<rect x="153" y="0" width="2" height="40" />
										<rect x="157" y="0" width="3" height="40" />
									</svg>
									<span className="text-[10px] font-mono tracking-wider text-slate-600 mt-1">
										{reference}
									</span>
								</div>

								<div className="flex flex-col items-center border-l pl-4 border-slate-200">
									<div className="p-1 rounded bg-slate-100 text-slate-800">
										<QrCode size={36} />
									</div>
									<span className="text-[9px] text-slate-500 mt-1">
										QR Ресепшен
									</span>
								</div>
							</div>
							<div className="text-[11px] text-slate-500 text-center">
								Покажите этот экран администратору на входе для быстрой регистрации без очереди
							</div>
						</div>
					</div>
				</div>

				{/* Calendar & Export Actions */}
				<div className="w-full">
					<div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 text-left">
						Добавить напоминание в календарь:
					</div>

					<div className="dbw-export-actions-grid">
						<button
							type="button"
							className="dbw-export-btn primary"
							onClick={handleDownloadIcs}
						>
							<Download size={16} />
							<span>Скачать .ICS файл</span>
						</button>

						<a
							href={generateGoogleCalendarUrl({
								title: `DENTE: Приём врача (${doctorFullName})`,
								description: `Запись в DENTE Dental\\nВрач: ${doctorFullName}\\nТалон: ${reference}`,
								location: branchAddress,
								startsAt,
								endsAt,
							})}
							target="_blank"
							rel="noreferrer"
							className="dbw-export-btn"
						>
							<CalendarPlus size={16} />
							<span>Google Календарь</span>
							<ExternalLink size={14} className="opacity-60" />
						</a>

						<a
							href={generateYandexCalendarUrl({
								title: `DENTE: Приём врача (${doctorFullName})`,
								description: `Запись в DENTE Dental\\nВрач: ${doctorFullName}\\nТалон: ${reference}`,
								location: branchAddress,
								startsAt,
								endsAt,
							})}
							target="_blank"
							rel="noreferrer"
							className="dbw-export-btn"
						>
							<CalendarPlus size={16} />
							<span>Яндекс Календарь</span>
							<ExternalLink size={14} className="opacity-60" />
						</a>
					</div>
				</div>

				{/* Quick 1-Click Navigation & Messenger Links */}
				<div className="w-full mt-3">
					<div className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 text-left">
						Полезные сервисы:
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
						{/* Yandex Maps Route */}
						<a
							href={`https://yandex.ru/maps/?text=${encodeURIComponent(
								branchAddress,
							)}`}
							target="_blank"
							rel="noreferrer"
							className="dbw-action-chip-btn"
						>
							<MapPin size={16} className="text-red-500 shrink-0" />
							<span className="truncate">Открыть маршрут в Яндекс.Картах</span>
							<ExternalLink size={13} className="opacity-50 shrink-0" />
						</a>

						{/* WhatsApp Clinic Chat */}
						<a
							href={`https://wa.me/${(selectedBranch?.phone || "+78000000000").replace(/\D/g, "")}?text=${encodeURIComponent(
								`Здравствуйте! Моя онлайн-запись ${reference} на ${dateStr} в ${timeStr}.`,
							)}`}
							target="_blank"
							rel="noreferrer"
							className="dbw-action-chip-btn"
						>
							<MessageSquare size={16} className="text-green-500 shrink-0" />
							<span className="truncate">Написать в WhatsApp клиники</span>
							<ExternalLink size={13} className="opacity-50 shrink-0" />
						</a>
					</div>
				</div>

				{/* Print and Re-book Footers */}
				<div className="flex items-center justify-between w-full pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap gap-2">
					<button
						type="button"
						className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 p-2"
						onClick={() => window.print()}
					>
						<Printer size={16} />
						<span>Распечатать талон</span>
					</button>

					{onReset && (
						<button
							type="button"
							className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 hover:underline p-2"
							onClick={onReset}
						>
							<RotateCcw size={16} />
							<span>Записаться ещё раз</span>
						</button>
					)}
				</div>
			</section>
		</div>
	);
};

export default BookingConfirmationView;
