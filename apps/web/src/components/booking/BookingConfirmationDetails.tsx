import { Building2, Calendar, MapPin, Phone, User } from "lucide-react";
import type React from "react";
import { formatRussianDate } from "./engine/bookingCalendarUtils";

export interface BookingConfirmationDetailsProps {
	readonly dateStr: string;
	readonly timeStr: string;
	readonly cabinet: string;
	readonly doctorFullName: string;
	readonly branchName: string;
	readonly branchAddress: string;
	readonly patientDisplayName: string;
	readonly patientDisplayPhone?: string | undefined;
}

export const BookingConfirmationDetails: React.FC<BookingConfirmationDetailsProps> = ({
	dateStr,
	timeStr,
	cabinet,
	doctorFullName,
	branchName,
	branchAddress,
	patientDisplayName,
	patientDisplayPhone,
}) => {
	return (
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
					<div className="dbw-detail-value min-w-0 break-words">{cabinet}</div>
				</div>
			</div>

			<div className="dbw-detail-row">
				<User size={20} className="dbw-detail-icon" />
				<div className="min-w-0">
					<div className="dbw-detail-label">Лечащий специалист</div>
					<div className="dbw-detail-value min-w-0 break-words">{doctorFullName}</div>
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
	);
};
