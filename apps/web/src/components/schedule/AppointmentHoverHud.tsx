import React, { type ReactElement } from "react";
import type { Appointment, DentalSpecialty } from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	MessageSquare,
	Phone,
	PhoneCall,
	Stethoscope,
	User,
	UserCheck,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";

export function extractTeethFromAppointment(appointment: Appointment): string[] {
	if (!appointment) return [];
	const explicitTeeth = (appointment as any)?.teeth;
	if (Array.isArray(explicitTeeth) && explicitTeeth.length > 0) {
		return explicitTeeth.map(String);
	}
	const singleTooth = (appointment as any)?.toothNumber || (appointment as any)?.tooth;
	if (singleTooth) {
		return [String(singleTooth)];
	}
	const text = `${appointment.reason || ""} ${appointment.comment || ""}`;
	if (!text.trim()) return [];
	const matches = text.match(/\b([1-4][1-8]|[5-8][1-5])\b/g);
	if (matches && matches.length > 0) {
		return Array.from(new Set(matches));
	}
	return [];
}

export interface AppointmentHoverHudProps {
	appointment: Appointment;
	appointmentPatient?: any;
	appointmentPatientName?: string;
	patientBalance: number | null;
	allergyAlert?: string | null;
	somaticAlert?: string | null;
	appointmentDoctor?: any;
	appointmentAssistant?: any;
	appointmentChair?: any;
	displayStatus: Appointment["status"];
	formatTime: (value: string) => string;
	clinicSettings?: any;
	teeth?: string[];
	onQuickStatusChange: (newStatus: Appointment["status"]) => void | Promise<void>;
	onClose: () => void;
	onMouseEnter?: () => void;
}

/**
 * macOS HIG Hover HUD & Progressive Disclosure (<120ms delay, CLS = 0).
 * Displays rich context on hover: FIO, 54-FZ fiscal balance, phone/WhatsApp,
 * somatic alerts, teeth, doctor/chair, and 1-click status transitions.
 */
export function AppointmentHoverHud({
	appointment,
	appointmentPatient,
	appointmentPatientName,
	patientBalance,
	allergyAlert,
	somaticAlert,
	appointmentDoctor,
	appointmentAssistant,
	appointmentChair,
	displayStatus,
	formatTime,
	clinicSettings,
	teeth: propTeeth,
	onQuickStatusChange,
	onClose,
	onMouseEnter,
}: AppointmentHoverHudProps): ReactElement {
	const teeth = propTeeth ?? extractTeethFromAppointment(appointment);

	return (
		<div
			className="appointment-patient-hover-preview absolute left-0 top-full mt-1.5 w-[380px] sm:w-[400px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-100 text-xs text-[var(--ink)] z-50 pointer-events-auto"
			style={{ contain: "layout style", willChange: "transform, opacity" }}
			data-testid="appointment-patient-hover-preview"
			onMouseEnter={onMouseEnter}
			onMouseLeave={onClose}
		>
			{/* 1. Крупное ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<span className="text-[17px] font-black text-[var(--ink)] flex items-center gap-1.5 min-w-0 flex-1">
					<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span className="truncate min-w-0 leading-tight" title={appointmentPatientName || "Пациент"}>
						{appointmentPatientName || "Пациент"}
					</span>
				</span>
				{patientBalance !== null ? (
					<button
						type="button"
						data-testid="hud-patient-balance-btn"
						onClick={(e) => {
							e.stopPropagation();
							const pId = appointmentPatient?.id || appointment.patientId;
							if (pId) {
								usePatientStore.getState().setSelectedPatientId(pId);
							}
							useAppStore.getState().setCurrentView("finance");
							onClose();
							showToast(
								`Касса 54-ФЗ: расчёт ${appointmentPatientName || "пациента"}`,
								"info",
							);
						}}
						className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
							patientBalance > 0
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
								: patientBalance < 0
									? "bg-rose-500/20 text-rose-800 dark:text-rose-100 border border-rose-500 hover:bg-rose-500/30"
									: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
						}`}
						title={
							patientBalance > 0
								? "Аванс / Депозит (54-ФЗ). Нажмите для расчёта на кассе"
								: patientBalance < 0
									? "Задолженность по 54-ФЗ. Нажмите для расчёта на кассе"
									: "Оплачено по 54-ФЗ. Нажмите для расчёта на кассе"
						}
					>
						<CreditCard size={11} className="shrink-0" />
						<span>
							{patientBalance > 0
								? `Депозит: +${patientBalance.toLocaleString("ru-RU")} ₽`
								: patientBalance < 0
									? `Долг: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`
									: "Оплата: 54-ФЗ (0 ₽)"}
						</span>
					</button>
				) : (
					<button
						type="button"
						data-testid="hud-patient-balance-btn"
						onClick={(e) => {
							e.stopPropagation();
							const pId = appointmentPatient?.id || appointment.patientId;
							if (pId) {
								usePatientStore.getState().setSelectedPatientId(pId);
							}
							useAppStore.getState().setCurrentView("finance");
							onClose();
							showToast(
								`Касса 54-ФЗ: расчёт ${appointmentPatientName || "пациента"}`,
								"info",
							);
						}}
						className="px-2 py-0.5 rounded-lg text-[11px] font-medium font-mono text-slate-500 bg-slate-500/10 border border-slate-500/20 shrink-0 whitespace-nowrap cursor-pointer hover:bg-slate-500/20 flex items-center gap-1"
						title="Открыть кассу 54-ФЗ для расчёта"
					>
						<CreditCard size={10} className="shrink-0" />
						<span>54-ФЗ: Баланс 0 ₽</span>
					</button>
				)}
			</div>

			{/* 2. Номер телефона с кнопкой WhatsApp и копированием SMS */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
					<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>{appointmentPatient?.phone || "Телефон не указан"}</span>
				</div>
				{appointmentPatient?.phone && (
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								openWhatsAppChat(
									appointmentPatient.phone!,
									`Здравствуйте, ${appointmentPatientName}! Напоминаем о вашем визите в стоматологию.`,
								);
							}}
							className="min-h-[44px] min-w-[44px] px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 inline-flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
							title="Открыть чат в WhatsApp"
						>
							<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
							<span>WhatsApp</span>
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								const effectiveName = appointmentPatientName || "Пациент";
								const text = generateAppointmentWhatsAppMessage({
									patientName: effectiveName,
									doctorName: appointmentDoctor?.fullName,
									doctorSpecialty: appointmentDoctor?.role,
									appointmentStartsAt: appointment.startsAt,
									clinicName: clinicSettings?.profile?.clinicName,
									clinicAddress: clinicSettings?.profile?.address,
									clinicPhone: clinicSettings?.profile?.phone,
									treatmentReason: appointment.reason,
								});
								if (typeof navigator !== "undefined" && navigator.clipboard) {
									void navigator.clipboard.writeText(text);
									showToast(
										`Текст напоминания для ${effectiveName} скопирован в буфер`,
										"success",
									);
								}
							}}
							className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] p-1 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer flex items-center justify-center"
							title="Скопировать SMS напоминание"
						>
							<Copy size={13} />
						</button>
					</div>
				)}
			</div>

			{/* 3. Яркий янтарный алерт аллергий / противопоказаний */}
			{allergyAlert && (
				<div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs" data-testid="hud-allergy-alert">
					<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
					<span>{allergyAlert}</span>
				</div>
			)}

			{/* 3.1 Соматический статус (Мандаты 8e, 8n: норма в 1 клик или явный алерт рисков) */}
			{somaticAlert ? (
				<div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow-xs" data-testid="hud-somatic-alert">
					<Stethoscope size={14} className="text-purple-600 shrink-0" />
					<span>{somaticAlert}</span>
				</div>
			) : (
				<div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium flex items-center gap-1.5" data-testid="hud-somatic-norm">
					<Check size={12} className="text-emerald-600 shrink-0" />
					<span>Соматический статус: норма (1 клик)</span>
				</div>
			)}

			{/* 4. Процедура и список зубов */}
			<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
				<div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 min-w-0">
					<Clock size={13} className="text-[var(--teal)] shrink-0" />
					<span
						className="font-semibold truncate min-w-0"
						title={
							appointment?.reason ||
							(appointment as Record<string, any>)?.notes ||
							(appointment as Record<string, any>)?.comment ||
							"Консультация стоматолога"
						}
					>
						{appointment?.reason ||
							(appointment as Record<string, any>)?.notes ||
							(appointment as Record<string, any>)?.comment ||
							"Консультация стоматолога"}
					</span>
				</div>
				{teeth.length > 0 && (
					<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
						<span className="text-[11px] font-bold text-[var(--muted)]">Зубы:</span>
						{teeth.map((t) => (
							<span
								key={t}
								className="px-1.5 py-0.5 rounded-md bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 text-[11px] font-bold font-mono"
							>
								{t}
							</span>
						))}
					</div>
				)}
			</div>

			{/* 5. Врач, ассистент, кресло */}
			<div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
						<Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
						<span
							className="truncate"
							title={appointmentDoctor?.fullName || "Врач не назначен"}
						>
							{appointmentDoctor?.fullName || "Врач не назначен"}
						</span>
					</span>
					{appointmentDoctor?.specialties && appointmentDoctor.specialties.length > 0 && (
						<span className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0">
							{appointmentDoctor.specialties
								.map((s: string) => specialtyLabels[s as DentalSpecialty] || s)
								.join(", ")}
						</span>
					)}
				</div>
				{/* Ассистент */}
				<div className="flex items-center gap-1 text-[var(--muted)]">
					<User size={12} className="shrink-0 opacity-70" />
					<span>
						Ассистент: {appointmentAssistant?.fullName || "Не назначен"}
					</span>
				</div>
				{/* Кресло и время */}
				<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
					<span>Кабинет: {appointmentChair?.name || "Кабинет 1"}</span>
					<span className="font-bold text-[var(--ink)]">
						{formatTime(appointment.startsAt)} – {formatTime(appointment.endsAt)}
					</span>
				</div>
			</div>

			{/* 6. Быстрая смена статуса в Hover HUD */}
			<div className="pt-2 border-t border-[var(--line)]">
				<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5">
					Быстрый статус (Apple HIG)
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							void onQuickStatusChange("confirmed");
							onClose();
						}}
						className={`px-2 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
							displayStatus === "confirmed"
								? "bg-emerald-600 text-white border-emerald-600"
								: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
						}`}
						title="Статус «Подтвержден»"
					>
						<PhoneCall size={12} />
						<span className="truncate">Подтвержден</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							void onQuickStatusChange("arrived");
							onClose();
						}}
						className={`px-2 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
							displayStatus === "arrived"
								? "bg-amber-500 text-white border-amber-500"
								: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
						}`}
						title="Пациент в клинике — статус «Ожидает приёма»"
					>
						<UserCheck size={12} />
						<span className="truncate">Ожидает приёма</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							void onQuickStatusChange("in_treatment");
							onClose();
						}}
						className={`px-2 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
							displayStatus === "in_treatment"
								? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)]"
								: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
						}`}
						title="Пациент в кабинете врача — статус «На приёме»"
					>
						<CalendarCheck size={12} />
						<span className="truncate">На приёме</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							void onQuickStatusChange("completed");
							onClose();
						}}
						className={`px-2 py-1.5 min-h-[36px] rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
							displayStatus === "completed"
								? "bg-slate-600 text-white border-slate-600"
								: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
						}`}
						title="Приём завершён — перевести в статус «Ожидает оплаты»"
					>
						<CheckCircle2 size={12} />
						<span className="truncate">Ожидает оплаты</span>
					</button>
				</div>
				<button
					type="button"
					data-testid="hud-pay-54fz-btn"
					onClick={(e) => {
						e.stopPropagation();
						const pId = appointmentPatient?.id || appointment.patientId;
						if (pId) {
							usePatientStore.getState().setSelectedPatientId(pId);
						}
						useAppStore.getState().setCurrentView("finance");
						onClose();
						showToast(
							`Касса 54-ФЗ: расчёт ${appointmentPatientName || "пациента"}`,
							"info",
						);
					}}
					className="mt-2 w-full py-1.5 px-3 min-h-[36px] rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
					title="Быстрый переход в кассу 54-ФЗ для расчёта"
				>
					<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400" />
					<span>Касса 54-ФЗ: Оформить оплату (1 клик)</span>
				</button>
			</div>
		</div>
	);
}
