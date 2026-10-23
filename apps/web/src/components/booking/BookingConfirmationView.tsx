import { Check, CheckCircle2, Copy, Phone, Printer, RotateCcw } from "lucide-react";
import type React from "react";
import { useCallback, useId, useState } from "react";
import { AuthArtBackground } from "../auth/AuthArtBackground";
import type { AuthArtPack } from "../auth/authArtSelector";
import type { BookingConfirmationData, BookingDoctorData, BookingSlotItem, ClinicBranch } from "./contracts/bookingContracts";
import { BookingBoardingPass } from "./BookingBoardingPass";
import { BookingCalendarExport } from "./BookingCalendarExport";
import { formatRussianDate } from "./engine/bookingCalendarUtils";
import { generateGoogleCalendarUrl, generateIcsCalendarContent, generateYandexCalendarUrl } from "./engine/bookingCalendarExportUtils";
import "./bookingWidget.css";

export { formatRussianDate, generateGoogleCalendarUrl, generateIcsCalendarContent, generateYandexCalendarUrl };

export interface BookingConfirmationViewProps {
	readonly confirmationData?: BookingConfirmationData | null | undefined;
	readonly selectedDate?: string | undefined;
	readonly selectedSlot?: BookingSlotItem | null | undefined;
	readonly selectedDoctor?: BookingDoctorData | null | undefined;
	readonly selectedBranch?: ClinicBranch | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly onReset?: (() => void) | undefined;
	readonly artPack?: AuthArtPack | string | undefined;
	readonly showArtBackdrop?: boolean | undefined;
	readonly theme?: "light" | "dark" | "night" | "calm_teal" | "contrast" | "auto" | undefined;
	readonly className?: string | undefined;
	readonly isFloating?: boolean | undefined;
}

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

	const reference = confirmationData?.referenceNumber || "DNT-2026-8492";
	const dateStr = confirmationData?.date || selectedDate || new Date().toISOString().slice(0, 10);
	const timeStr = confirmationData?.time || selectedSlot?.time || "10:00";
	const doctorFullName = confirmationData?.doctor?.fullName || selectedDoctor?.fullName || "Дежурный специалист";
	const branchName = confirmationData?.branch?.name || selectedBranch?.name || "DENTE Стоматология";
	const branchAddress = confirmationData?.branch?.address || selectedBranch?.address || "г. Москва, ул. Клиническая, д. 10";
	const cabinet = confirmationData?.cabinetNumber || "Кабинет №3 (Терапевтическое отделение)";
	const patientDisplayName = confirmationData?.patientName || patientName || "Пациент";
	const patientDisplayPhone = confirmationData?.patientPhone || patientPhone || "";
	const isUnconfirmed = Boolean(confirmationData?.status === "unconfirmed" || confirmationData?.isPreBooking || confirmationData?.comment?.includes("Предварительная бронь"));
	const startsAt = confirmationData?.startsAt || selectedSlot?.startsAt || new Date().toISOString();
	const endsAt = confirmationData?.endsAt || selectedSlot?.endsAt || new Date(Date.now() + 30 * 60 * 1000).toISOString();

	const handleCopyTicket = useCallback(() => {
		if (reference && typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(reference);
			setCopiedTicket(true);
			setTimeout(() => setCopiedTicket(false), 2000);
		}
	}, [reference]);

	return (
		<div className={`dbw-confirmation-view-container ${isFloating ? "dbw-floating-wrapper" : ""} ${className}`} data-theme={theme}>
			{showArtBackdrop && (
				<div className="dbw-confirmation-art-wrapper" aria-hidden="true">
					<AuthArtBackground settings={{ enabled: true, pack: artPack, dynamicByTimeOfDay: true }} overlayAlpha={0.2} className="dbw-confirmation-art-layer" />
					<div className="dbw-confirmation-scrim" />
				</div>
			)}
			<section className="dbw-confirmation-card" aria-labelledby={headingId}>
				<div className="dbw-success-badge-icon"><CheckCircle2 size={44} /></div>
				<h3 id={headingId} className="dbw-confirmation-title min-w-0 break-words">Запись успешно оформлена!</h3>
				{isUnconfirmed ? (
					<div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl p-3.5 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-3 my-2 max-w-md text-left w-full" data-testid="prebooking-banner">
						<Phone size={18} className="shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
						<div className="min-w-0 flex-1"><div className="font-bold text-sm text-teal-950 dark:text-teal-100">Предварительная бронь принята!</div><div className="mt-1 leading-relaxed">Администратор клиники перезвонит вам по номеру <strong>{patientDisplayPhone || "телефона"}</strong> для согласования деталей визита.</div></div>
					</div>
				) : (
					<p className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-md min-w-0 break-words">Мы забронировали время и ждём вас в клинике. Предъявите электронный талон на ресепшене:</p>
				)}
				<div className="dbw-ticket-pill">
					<span>Талон:</span><strong>{reference}</strong>
					<button type="button" onClick={handleCopyTicket} className="text-slate-400 hover:text-teal-600 ml-1 min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded transition-colors" title="Скопировать номер талона" aria-label="Скопировать номер талона">
						{copiedTicket ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
					</button>
				</div>
				<BookingBoardingPass reference={reference} isUnconfirmed={isUnconfirmed} dateStr={dateStr} timeStr={timeStr} cabinet={cabinet} doctorFullName={doctorFullName} branchName={branchName} branchAddress={branchAddress} patientDisplayName={patientDisplayName} patientDisplayPhone={patientDisplayPhone} />
				<BookingCalendarExport doctorFullName={doctorFullName} patientDisplayName={patientDisplayName} reference={reference} branchAddress={branchAddress} branchPhone={selectedBranch?.phone} dateStr={dateStr} timeStr={timeStr} startsAt={startsAt} endsAt={endsAt} />
				<div className="flex items-center justify-between w-full pt-4 border-t border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 flex-wrap gap-2">
					<button type="button" className="secondary-button flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-100 p-2 min-h-[44px]" onClick={() => window.print()}><Printer size={16} /><span>Распечатать талон</span></button>
					{onReset && (<button type="button" className="secondary-button flex items-center gap-1.5 text-teal-600 dark:text-teal-400 hover:underline p-2 min-h-[44px]" onClick={onReset}><RotateCcw size={16} /><span>Записаться ещё раз</span></button>)}
				</div>
			</section>
		</div>
	);
};

export default BookingConfirmationView;
