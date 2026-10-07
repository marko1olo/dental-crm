import React from "react";
import {
	Calendar,
	CalendarPlus,
	ClipboardCheck,
	Image as ImageIcon,
	Phone,
} from "lucide-react";
import { PatientAvatar } from "../PatientAvatar";
import { ShiftCallout } from "./ShiftCallout";

export interface DoctorShiftHeroCardProps {
	// biome-ignore lint/suspicious/noExplicitAny: patient entity
	readonly currentPatient: any | null | undefined;
	readonly currentPatientHasCallablePhone: boolean;
	readonly currentPatientCallablePhone: string;
	readonly currentAppointmentReason: string;
	// biome-ignore lint/suspicious/noExplicitAny: appointment entity
	readonly nextAppointment: any | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: patient entity
	readonly nextAppointmentPatient: any | null | undefined;
	readonly todayAppointmentsCount: number;
	readonly formatClockTime: (value: unknown) => string;
	readonly onOpenVisit: (patientId: string) => void;
	readonly onOpenImaging: (patientId: string) => void;
	readonly onCallPatientError?: ((msg: string) => void) | undefined;
	readonly onStartNextAppointment: (patientId: string) => void;
	readonly onOpenSchedule: () => void;
}

/**
 * DoctorShiftHeroCard — Центральная карточка текущего состояния смены:
 * «Сейчас в кресле» / «Ближайший прием» / «Сейчас никого нет в кресле».
 * Mandate 8e: 1-click действия («Открыть карту / Прием», «Снимки», «Позвонить»).
 */
export const DoctorShiftHeroCard: React.FC<DoctorShiftHeroCardProps> = ({
	currentPatient,
	currentPatientHasCallablePhone,
	currentPatientCallablePhone,
	currentAppointmentReason,
	nextAppointment,
	nextAppointmentPatient,
	todayAppointmentsCount,
	formatClockTime,
	onOpenVisit,
	onOpenImaging,
	onCallPatientError,
	onStartNextAppointment,
	onOpenSchedule,
}) => {
	return (
		<div className="now-card" data-testid="doctor-shift-hero-card">
			<div className="row-between">
				<p className="eyebrow" style={{ color: "var(--ink-2)" }}>
					{currentPatient ? "Сейчас в кресле" : "Сейчас в работе"}
				</p>
				{currentPatient ? (
					<span className="status-pill status-in_treatment">
						<span className="pulse-dot" aria-hidden="true" />
						В кресле
					</span>
				) : null}
			</div>

			{currentPatient ? (
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
							className="primary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={() => onOpenVisit(currentPatient.id)}
						>
							<ClipboardCheck aria-hidden="true" /> Открыть приём / ЭМК
						</button>
						<button
							className="secondary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={() => onOpenImaging(currentPatient.id)}
						>
							<ImageIcon aria-hidden="true" /> Снимки
						</button>
						<button
							className="secondary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							aria-label="Позвонить пациенту"
							aria-describedby={
								!currentPatientHasCallablePhone
									? "shift-call-guidance"
									: undefined
							}
							aria-disabled={!currentPatientHasCallablePhone}
							title={
								currentPatientHasCallablePhone
									? "Позвонить пациенту"
									: "В карточке пациента нет телефона"
							}
							style={{ opacity: !currentPatientHasCallablePhone ? 0.6 : 1 }}
							onClick={() => {
								if (!currentPatientHasCallablePhone) {
									if (onCallPatientError) {
										onCallPatientError(
											"В карточке пациента нет телефона. Добавьте номер в разделе «Пациенты», чтобы позвонить.",
										);
									}
									return;
								}
								window.location.href = `tel:${currentPatientCallablePhone}`;
							}}
						>
							<Phone aria-hidden="true" /> Позвонить
						</button>
					</div>

					<div className="status-flow min-w-0">
						<span className="status-flow-label shrink-0">Статус:</span>
						<div className="status-flow-steps flex flex-wrap items-center min-w-0">
							<span className="status-flow-step done">1. Запись</span>
							<span className="status-flow-arrow" aria-hidden="true">→</span>
							<span className="status-flow-step done">2. ЭМК</span>
							<span className="status-flow-arrow" aria-hidden="true">→</span>
							<span className="status-flow-step">3. Оплата</span>
						</div>
					</div>

					{!currentPatientHasCallablePhone ? (
						<ShiftCallout
							id="shift-call-guidance"
							role="status"
							aria-live="polite"
						>
							В карточке пациента нет телефона. Откройте «Пациенты» и
							добавьте номер, чтобы кнопка звонка стала активной.
						</ShiftCallout>
					) : null}
				</>
			) : nextAppointment ? (
				<>
					<div className="patient-hero">
						<PatientAvatar
							fullName={nextAppointmentPatient?.fullName ?? "?"}
							size={44}
						/>
						<div className="hero-info min-w-0">
							<h2 className="break-words leading-tight" style={{ color: "var(--ink)" }}>
								{nextAppointmentPatient?.fullName ?? "Пациент не найден"}
							</h2>
							<p className="hero-phone break-words leading-tight" style={{ color: "var(--muted)" }}>
								Ближайший прием сегодня в{" "}
								{formatClockTime(nextAppointment.startsAt)}
								{nextAppointment.reason
									? ` · ${nextAppointment.reason}`
									: ""}
							</p>
						</div>
					</div>
					<div className="hero-actions">
						<button
							className="primary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={() => {
								if (nextAppointmentPatient) {
									onStartNextAppointment(nextAppointmentPatient.id);
								}
							}}
						>
							<ClipboardCheck aria-hidden="true" /> Начать прием
						</button>
						<button
							className="secondary-button min-h-[44px] px-3 py-2 focus:ring-2 focus:ring-teal-600 focus:outline-none transition-colors"
							type="button"
							onClick={onOpenSchedule}
						>
							<Calendar aria-hidden="true" /> Все записи дня
						</button>
					</div>
					<ShiftCallout role="status">
						Приём ещё не открыт. Нажмите «Начать прием», когда пациент сядет в кресло.
					</ShiftCallout>
				</>
			) : (
				<div
					className="compact-shift-empty-card"
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "12px",
						padding: "16px 14px",
						borderRadius: "12px",
						background: "var(--paper-soft, rgba(0,0,0,0.02))",
						border: "1px solid var(--line)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
						<div
							style={{
								width: "36px",
								height: "36px",
								borderRadius: "10px",
								background: "var(--teal-surface)",
								color: "var(--teal-dark)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							<ClipboardCheck size={18} aria-hidden="true" />
						</div>
						<div style={{ minWidth: 0 }}>
							<h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
								Кресло свободно
							</h3>
							<p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)", lineHeight: 1.35 }}>
								{todayAppointmentsCount > 0
									? "Все приемы на сегодня уже прошли. Откройте расписание, чтобы записать пациента на другой день."
									: "На сегодня запланированных приёмов нет. Можно записать пациента или открыть расписание."}
							</p>
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "2px" }}>
						<button
							type="button"
							className="primary-button"
							style={{ fontSize: "12px", padding: "5px 12px", minHeight: "32px", display: "inline-flex", alignItems: "center", gap: "6px" }}
							onClick={onOpenSchedule}
						>
							<CalendarPlus size={14} />
							<span>+ Записать</span>
						</button>
						<button
							type="button"
							className="secondary-button"
							style={{ fontSize: "12px", padding: "5px 12px", minHeight: "32px", display: "inline-flex", alignItems: "center", gap: "6px" }}
							onClick={onOpenSchedule}
						>
							<Calendar size={14} />
							<span>Расписание</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
