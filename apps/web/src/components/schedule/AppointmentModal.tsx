import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
} from "@dental/shared";
import {
	AlertTriangle,
	Calendar,
	Check,
	Clock,
	Copy,
	Repeat,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { checkAppointmentResourceCollision } from "../../utils/scheduleCollisionUtils";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";

export interface AppointmentModalProps {
	isOpen: boolean;
	appointment: Appointment | null;
	dashboard: Dashboard;
	onClose: () => void;
	onSave: (
		appointmentId: string,
		draft: {
			startsAt: string;
			endsAt: string;
			doctorUserId: string;
			assistantUserId: string | null;
			chairId: string;
			patientId: string;
			status: Appointment["status"];
			reason: string;
			comment: string;
		},
	) => Promise<boolean>;
	repeatAppointment?: (appointment: Appointment) => void;
	copyAppointmentToBuffer?: (appointment: Appointment) => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	formatTime: (iso: string) => string;
	toDateTimeLocalValue: (iso: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	appointmentReadinessById?: Map<string, AppointmentReadiness>;
}

export function AppointmentModal(props: AppointmentModalProps) {
	const {
		isOpen,
		appointment,
		dashboard,
		onClose,
		onSave,
		repeatAppointment,
		copyAppointmentToBuffer,
		patientName,
		formatTime,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		appointmentLabels,
		activeVisitLockedAppointmentStatuses,
		appointmentReadinessById,
	} = props;

	const timezone = dashboard?.clinicSettings?.profile?.timezone ?? "Europe/Moscow";

	const [patientId, setPatientId] = useState("");
	const [doctorUserId, setDoctorUserId] = useState("");
	const [assistantUserId, setAssistantUserId] = useState<string | null>(null);
	const [chairId, setChairId] = useState("");
	const [startsAtLocal, setStartsAtLocal] = useState("");
	const [endsAtLocal, setEndsAtLocal] = useState("");
	const [status, setStatus] = useState<Appointment["status"]>("planned");
	const [reason, setReason] = useState("");
	const [comment, setComment] = useState("");

	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!appointment || !isOpen) return;
		setPatientId(appointment.patientId ?? "");
		setDoctorUserId(appointment.doctorUserId ?? "");
		setAssistantUserId(appointment.assistantUserId ?? null);
		setChairId(appointment.chairId ?? "");
		setStartsAtLocal(toDateTimeLocalValue(appointment.startsAt, timezone));
		setEndsAtLocal(toDateTimeLocalValue(appointment.endsAt, timezone));
		setStatus(appointment.status);
		setReason(appointment.reason ?? "");
		setComment(appointment.comment ?? "");
		setError(null);
		setIsSaving(false);
	}, [appointment, isOpen, toDateTimeLocalValue, timezone]);

	const staff = dashboard?.clinicSettings?.staff ?? [];
	const doctors = useMemo(
		() => staff.filter((m) => m.active && (m.role === "doctor" || m.role === "owner")),
		[staff],
	);
	const assistants = useMemo(
		() => staff.filter((m) => m.active && m.role === "assistant"),
		[staff],
	);
	const chairs = useMemo(
		() => (dashboard?.clinicSettings?.chairs ?? []).filter((c) => c.active),
		[dashboard?.clinicSettings?.chairs],
	);
	const isSoloDoctor = dashboard?.clinicSettings?.profile?.mode === "solo_doctor";
	const activePatients = useMemo(
		() => (dashboard?.patients ?? []).filter((p) => p.status === "active"),
		[dashboard?.patients],
	);

	const hasOpenVisit =
		dashboard.activeVisit &&
		appointment &&
		dashboard.activeVisit.appointmentId === appointment.id;

	const collision = useMemo(() => {
		if (!appointment || !startsAtLocal || !endsAtLocal) {
			return { hasCollision: false, message: null };
		}
		return checkAppointmentResourceCollision(
			{
				startsAt: fromDateTimeLocalValue(startsAtLocal, timezone),
				endsAt: fromDateTimeLocalValue(endsAtLocal, timezone),
				doctorUserId: doctorUserId || null,
				chairId: chairId || null,
				assistantUserId: assistantUserId || null,
				patientId: patientId || null,
			},
			dashboard?.appointments,
			{
				excludeAppointmentId: appointment.id,
				staff: dashboard?.clinicSettings?.staff,
				chairs: dashboard?.clinicSettings?.chairs,
				patients: dashboard?.patients,
				formatTimeFn: (iso) => toDateTimeLocalValue(iso, timezone).slice(11, 16),
			},
		);
	}, [
		appointment,
		startsAtLocal,
		endsAtLocal,
		doctorUserId,
		chairId,
		assistantUserId,
		patientId,
		status,
		reason,
		comment,
		fromDateTimeLocalValue,
		toDateTimeLocalValue,
		timezone,
		dashboard?.appointments,
		dashboard?.clinicSettings?.staff,
		dashboard?.clinicSettings?.chairs,
		dashboard?.patients,
	]);

	const readiness =
		(appointment && appointmentReadinessById instanceof Map
			? appointmentReadinessById.get(appointment.id)
			: undefined) ?? null;

	const handleSave = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!appointment || isSaving) return;

		if (!patientId || !doctorUserId || !chairId || !startsAtLocal || !endsAtLocal) {
			setError("Заполните все обязательные поля");
			return;
		}

		const startsAtIso = fromDateTimeLocalValue(startsAtLocal, timezone);
		const endsAtIso = fromDateTimeLocalValue(endsAtLocal, timezone);

		if (Date.parse(endsAtIso) <= Date.parse(startsAtIso)) {
			setError("Время окончания должно быть позже времени начала");
			return;
		}

		setIsSaving(true);
		setError(null);

		const success = await onSave(appointment.id, {
			patientId,
			doctorUserId,
			assistantUserId: isSoloDoctor ? null : assistantUserId,
			chairId,
			startsAt: startsAtIso,
			endsAt: endsAtIso,
			status,
			reason,
			comment,
		});

		setIsSaving(false);
		if (success) {
			onClose();
		}
	};

	if (!isOpen || !appointment) return null;

	const currentPatientName = patientName(dashboard.patients, patientId);
	const isNewAppointment = Boolean(appointment?.id?.startsWith("new"));

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			data-testid="appointment-modal"
			role="dialog"
			aria-modal="true"
			aria-label={`Детали приема: ${currentPatientName}`}
		>
			<button
				type="button"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				aria-label="Закрыть модальное окно"
			/>

			<div className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line-strong)] rounded-2xl shadow-2xl z-10 text-[var(--ink)] flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
				{/* Header */}
				<div className="p-5 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20">
							<Calendar size={20} />
						</div>
						<div>
							<h3 className="text-base font-bold text-[var(--ink)] m-0">
								{isNewAppointment ? `Запись на следующий этап: ${currentPatientName}` : `Детали записи: ${currentPatientName}`}
							</h3>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
								{startsAtLocal ? `${startsAtLocal.slice(0, 10)} ${startsAtLocal.slice(11, 16)} - ${endsAtLocal.slice(11, 16)}` : ""}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{repeatAppointment && !isNewAppointment && (
						<button
							type="button"
							onClick={() => repeatAppointment(appointment)}
							className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Повторить прием"
						>
							<Repeat size={15} />
							<span className="hidden sm:inline">Повторить</span>
						</button>
						)}
						{copyAppointmentToBuffer && !isNewAppointment && (
							<button
								type="button"
								onClick={() => copyAppointmentToBuffer(appointment)}
								className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
								title="Скопировать в буфер"
							>
								<Copy size={15} />
								<span className="hidden sm:inline">В буфер</span>
							</button>
						)}
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Body Form */}
				<div className="flex-1 overflow-y-auto p-6 space-y-5">
					{/* Collision warning */}
					{collision.hasCollision && (
						<div
							className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2"
							role="alert"
						>
							<AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
							<span>⛔ {collision.message}</span>
						</div>
					)}

					{/* Readiness score bar */}
					{readiness && (
						<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className={`w-2.5 h-2.5 rounded-full ${readiness.state === "ready" ? "bg-emerald-500" : readiness.state === "needs_attention" ? "bg-amber-500" : "bg-rose-500"}`} />
								<span className="text-xs font-semibold text-[var(--ink)]">
									Готовность: {readiness.nextAction}
								</span>
							</div>
							<span className="text-xs font-bold text-[var(--teal)]">
								{readiness.score}%
							</span>
						</div>
					)}

					{/* Free slot waitlist matches for cancelled appointments */}
					{(appointment.status === "cancelled" || appointment.status === "no_show") && (
						<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
							<WaitlistMatchesBlock appointmentId={appointment.id} compact />
						</div>
					)}

					{/* Form Fields */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{/* Patient */}
						<div className="sm:col-span-2">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1.5">
								<User size={14} className="text-[var(--teal)]" />
								<span>Пациент *</span>
							</label>
							<select
								value={patientId}
								onChange={(e) => setPatientId(e.target.value)}
								disabled={Boolean(hasOpenVisit)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							>
								<option value="">-- Выберите пациента --</option>
								{activePatients.map((p) => (
									<option key={p.id} value={p.id}>
										{p.fullName} {p.phone ? `(${p.phone})` : ""}
									</option>
								))}
							</select>
							{hasOpenVisit && (
								<p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
									Пациент закреплен: по этому приему открыт активный визит.
								</p>
							)}
						</div>

						{/* Time */}
						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1.5">
								<Clock size={14} className="text-[var(--teal)]" />
								<span>Начало *</span>
							</label>
							<input
								type="datetime-local"
								value={startsAtLocal}
								onChange={(e) => setStartsAtLocal(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1.5">
								<Clock size={14} className="text-[var(--teal)]" />
								<span>Окончание *</span>
							</label>
							<input
								type="datetime-local"
								value={endsAtLocal}
								onChange={(e) => setEndsAtLocal(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>

						{/* Doctor & Chair */}
						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Врач *
							</label>
							<select
								value={doctorUserId}
								onChange={(e) => setDoctorUserId(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							>
								<option value="">-- Выберите врача --</option>
								{doctors.map((d) => (
									<option key={d.id} value={d.id}>
										{d.fullName}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Кресло *
							</label>
							<select
								value={chairId}
								onChange={(e) => setChairId(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							>
								<option value="">-- Выберите кресло --</option>
								{chairs.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						{!isSoloDoctor && (
							<div>
								<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
									Ассистент
								</label>
								<select
									value={assistantUserId ?? ""}
									onChange={(e) => setAssistantUserId(e.target.value || null)}
									className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
								>
									<option value="">-- Без ассистента --</option>
									{assistants.map((a) => (
										<option key={a.id} value={a.id}>
											{a.fullName}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Status */}
						<div className={isSoloDoctor ? "sm:col-span-2" : ""}>
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Статус приема
							</label>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value as Appointment["status"])}
								disabled={
									Boolean(hasOpenVisit) &&
									activeVisitLockedAppointmentStatuses.has(status)
								}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							>
								{(Object.keys(appointmentLabels) as Appointment["status"][]).map(
									(st) => (
										<option key={st} value={st}>
											{appointmentLabels[st]}
										</option>
									),
								)}
							</select>
						</div>

						{/* Reason */}
						<div className="sm:col-span-2">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Повод обращения / Услуга
							</label>
							<input
								type="text"
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>

						{/* Comment */}
						<div className="sm:col-span-2">
							<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
								Комментарий
							</label>
							<textarea
								value={comment}
								onChange={(e) => setComment(e.target.value)}
								rows={2}
								className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
							/>
						</div>
					</div>

					{error && (
						<div
							className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold"
							role="alert"
						>
							⚠ {error}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={onClose}
						disabled={isSaving}
						className="min-h-[48px] px-5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-bold transition-colors cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => void handleSave()}
						disabled={isSaving || collision.hasCollision}
						className="flex-1 min-h-[48px] px-6 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-extrabold rounded-xl text-sm sm:text-base transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
					>
						<Check size={18} />
						<span>{isSaving ? "Сохраняю…" : isNewAppointment ? "Записать на приём" : "Сохранить изменения"}</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
}
