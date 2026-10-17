import {
	AlertTriangle,
	CalendarCheck,
	Check,
	MessageSquare,
	UserPlus,
	Zap,
} from "lucide-react";
import React, { useState } from "react";
import type { PatientUpcomingAppointment, SomaticAlertItem } from "../../../../store/telephonyStore";

export interface TelephonyCardClinicalDetailsProps {
	allergyAlerts: SomaticAlertItem[];
	acutePainAlerts: SomaticAlertItem[];
	upcomingAppointment: PatientUpcomingAppointment | null;
	whatsappSent: boolean;
	onSendWhatsApp: () => void;
	isKnownPatient: boolean;
	isCreatingPatient: boolean;
	onQuickCreatePatient: (name?: string) => void;
}

export function TelephonyCardClinicalDetails({
	allergyAlerts,
	acutePainAlerts,
	upcomingAppointment,
	whatsappSent,
	onSendWhatsApp,
	isKnownPatient,
	isCreatingPatient,
	onQuickCreatePatient,
}: TelephonyCardClinicalDetailsProps): React.JSX.Element {
	const [customPatientName, setCustomPatientName] = useState("");
	const [showNameInput, setShowNameInput] = useState(false);

	return (
		<>
			{(allergyAlerts.length > 0 || acutePainAlerts.length > 0) && (
				<div className="flex flex-wrap gap-1.5 pt-1">
					{allergyAlerts.map((alert) => (
						<span key={alert.id} className="dnt-alert-pill dnt-alert-pill--allergy" data-testid="telephony-widget-allergy-alert">
							<AlertTriangle size={12} />
							<span>{alert.label.toLowerCase().startsWith("аллерги") ? alert.label : `Аллергия: ${alert.label}`}</span>
						</span>
					))}
					{acutePainAlerts.map((alert) => (
						<span key={alert.id} className="dnt-alert-pill dnt-alert-pill--pain" data-testid="telephony-widget-acute-pain-alert">
							<Zap size={12} />
							<span>{alert.label.toLowerCase().startsWith("острая боль") ? alert.label : `Острая боль: ${alert.label}`}</span>
						</span>
					))}
				</div>
			)}

			{upcomingAppointment && (
				<div className="dnt-upcoming-box">
					<div className="flex items-center justify-between gap-2 text-xs">
						<div className="flex items-center gap-1.5 font-bold text-[var(--teal)]">
							<CalendarCheck size={14} />
							<span>
								{upcomingAppointment.isToday ? "Запись сегодня" : upcomingAppointment.isTomorrow ? "Запись завтра" : upcomingAppointment.formattedDate}
								{" в "}
								{upcomingAppointment.formattedTime}
							</span>
						</div>
						{upcomingAppointment.doctorName && (
							<span className="text-[11px] font-semibold text-[var(--ink,#0f172a)]">
								{upcomingAppointment.doctorName}
							</span>
						)}
					</div>
					<button type="button" onClick={onSendWhatsApp} className="dnt-whatsapp-btn">
						{whatsappSent ? <Check size={13} /> : <MessageSquare size={13} />}
						<span>{whatsappSent ? "Подтверждение отправлено" : "Написать в WhatsApp"}</span>
					</button>
				</div>
			)}

			{!isKnownPatient && (
				<div className="pt-1">
					{!showNameInput ? (
						<button type="button" onClick={() => setShowNameInput(true)} className="secondary-button dnt-cta-secondary w-full">
							<UserPlus size={14} />
							<span>Зарегистрировать нового пациента</span>
						</button>
					) : (
						<div className="flex items-center gap-1.5">
							<input
								type="text"
								value={customPatientName}
								onChange={(e) => setCustomPatientName(e.target.value)}
								placeholder="ФИО пациента"
								className="dnt-text-input flex-1"
							/>
							<button
								type="button"
								onClick={() => {
									if (isCreatingPatient) return;
									onQuickCreatePatient(customPatientName);
									setShowNameInput(false);
								}}
								className="primary-button dnt-cta-primary"
							>
								<Check size={13} />
								<span>Сохранить</span>
							</button>
						</div>
					)}
				</div>
			)}
		</>
	);
}
