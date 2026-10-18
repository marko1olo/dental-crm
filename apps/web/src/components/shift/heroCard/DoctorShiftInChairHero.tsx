import React from "react";
import { Check, ClipboardCheck, Image as ImageIcon, Phone } from "lucide-react";
import { PatientAvatar } from "../../PatientAvatar";
import { ShiftCallout } from "../ShiftCallout";

export interface DoctorShiftInChairHeroProps {
	readonly currentPatient: any;
	readonly currentPatientHasCallablePhone: boolean;
	readonly currentPatientCallablePhone: string;
	readonly currentAppointmentReason: string;
	readonly onOpenVisit: (patientId: string) => void;
	readonly onOpenImaging: (patientId: string) => void;
	readonly onCallPatientError?: (msg: string) => void;
}

export const DoctorShiftInChairHero: React.FC<DoctorShiftInChairHeroProps> = ({
	currentPatient,
	currentPatientHasCallablePhone,
	currentPatientCallablePhone,
	currentAppointmentReason,
	onOpenVisit,
	onOpenImaging,
	onCallPatientError,
}) => (
	<>
		<div className="patient-hero">
			<PatientAvatar fullName={currentPatient.fullName} size={44} />
			<div className="hero-info min-w-0">
				<h2 className="break-words leading-tight" style={{ color: "var(--ink)" }}>
					{currentPatient.fullName}
				</h2>
				<p className="hero-phone break-words" style={{ color: "var(--muted)" }}>
					{currentPatient.phone ?? "телефон не указан"}
					{currentAppointmentReason ? ` · ${currentAppointmentReason}` : ""}
				</p>
			</div>
		</div>
		<div className="hero-actions">
			<button
				className="primary-button min-h-[36px] h-9 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors inline-flex items-center gap-1.5"
				type="button"
				onClick={() => onOpenVisit(currentPatient.id)}
			>
				<ClipboardCheck size={16} aria-hidden="true" /> Открыть приём / ЭМК
			</button>
			<button
				className="secondary-button min-h-[36px] h-9 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors inline-flex items-center gap-1.5"
				type="button"
				onClick={() => onOpenImaging(currentPatient.id)}
			>
				<ImageIcon size={16} aria-hidden="true" /> Снимки
			</button>
			<button
				className="secondary-button min-h-[36px] h-9 px-4 py-1.5 rounded-lg text-xs md:text-sm font-semibold focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors inline-flex items-center gap-1.5"
				type="button"
				aria-label="Позвонить пациенту"
				aria-describedby={!currentPatientHasCallablePhone ? "shift-call-guidance" : undefined}
				aria-disabled={!currentPatientHasCallablePhone}
				title={currentPatientHasCallablePhone ? "Позвонить пациенту" : "В карточке пациента нет телефона"}
				style={{ opacity: !currentPatientHasCallablePhone ? 0.6 : 1 }}
				onClick={() => {
					if (!currentPatientHasCallablePhone) {
						onCallPatientError?.("В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.");
						return;
					}
					window.location.href = `tel:${currentPatientCallablePhone}`;
				}}
			>
				<Phone size={16} aria-hidden="true" /> Позвонить
			</button>
		</div>

		<div className="status-flow min-w-0" aria-label="Этапы текущего приёма">
			<span className="status-flow-label shrink-0">Статус:</span>
			<div className="status-flow-steps flex flex-wrap items-center min-w-0">
				<span className="status-flow-step done inline-flex items-center gap-1">
					<Check size={12} aria-hidden="true" /> 1. Запись
				</span>
				<span className="status-flow-arrow" aria-hidden="true">→</span>
				<span className="status-flow-step done inline-flex items-center gap-1">
					<Check size={12} aria-hidden="true" /> 2. ЭМК
				</span>
				<span className="status-flow-arrow" aria-hidden="true">→</span>
				<span className="status-flow-step">3. Оплата</span>
			</div>
		</div>

		{!currentPatientHasCallablePhone && (
			<ShiftCallout id="shift-call-guidance" role="status" aria-live="polite">
				В карточке пациента нет телефона. Откройте «Пациенты» и добавьте номер, чтобы кнопка звонка стала активной.
			</ShiftCallout>
		)}
	</>
);
