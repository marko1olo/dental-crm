import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
} from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	CalendarPlus,
	CheckCircle2,
	ClipboardList,
	Clock,
	Copy,
	CreditCard,
	FastForward,
	FileText,
	HeartPulse,
	MessageSquare,
	Phone,
	PhoneCall,
	Stethoscope,
	User,
	UserCheck,
	UserMinus,
	UserX,
} from "lucide-react";
import React from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";
import {
	extractTeethList,
	isAppointmentInChair,
	getNormalizedAppointmentStatusLabel,
	type DoctorSpecialtyTheme,
} from "./appointmentCardHelpers";

export interface GridAppointmentHoverHudProps {
	appointment: Appointment;
	pName: string;
	pBalance: number | null;
	patObj?: any;
	docObj?: any;
	docTheme: DoctorSpecialtyTheme | null;
	pAllergyAlert: string | null;
	chair: { id: string; name: string };
	aStart: string;
	aEnd: string;
	appointmentLabels: Record<Appointment["status"], string>;
	isNearRightEdge: boolean;
	isNearBottom: boolean;
	dashboard: Dashboard;
	staffLookupMap: Map<string, any>;
	onKeepHovered: (apptId: string) => void;
	onMouseLeave: () => void;
	onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onFreeSlotToWaitlist?: ((appt: Appointment) => void) | undefined;
}

export function GridAppointmentHoverHud(props: GridAppointmentHoverHudProps) {
	const {
		appointment: a,
		pName,
		pBalance,
		patObj,
		docObj,
		docTheme,
		pAllergyAlert,
		chair,
		aStart,
		aEnd,
		appointmentLabels,
		isNearRightEdge,
		isNearBottom,
		dashboard,
		staffLookupMap,
		onKeepHovered,
		onMouseLeave,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onFreeSlotToWaitlist,
	} = props;

	return (
		<div
			className={`appointment-patient-hover-preview absolute ${isNearRightEdge ? "right-0 left-auto" : "left-0"} ${isNearBottom ? "bottom-full mb-1.5 top-auto" : "top-full mt-1.5"} w-[330px] max-w-[330px] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-[100] pointer-events-auto`}
			style={{ contain: "layout style" }}
			data-testid="schedule-grid-patient-hover-preview"
			onMouseEnter={() => {
				onKeepHovered(a.id);
			}}
			onMouseLeave={onMouseLeave}
		>
			{/* 1. Крупное ФИО пациента + Статус 54-ФЗ (Баланс / Долг / Аванс) */}
			<div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
				<span className="text-[17px] font-black text-[var(--ink)] flex items-center gap-1.5 truncate">
					<User className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
					{pName || "Пациент"}
				</span>
				{pBalance !== null ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (patObj?.id) {
								usePatientStore.getState().setSelectedPatientId(patObj.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Касса: расчёт ${pName}`, "info");
						}}
						className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono shrink-0 whitespace-nowrap cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1 ${
							pBalance > 0
								? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25"
								: pBalance < 0
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/25"
									: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 hover:bg-slate-500/20"
						}`}
						title={
							pBalance > 0
								? "Аванс / Депозит. Нажмите для расчёта на кассе"
								: pBalance < 0
									? "Задолженность. Нажмите для расчёта на кассе"
									: "Оплачено. Нажмите для расчёта на кассе"
						}
						data-testid={`appointment-grid-balance-btn-${a.id}`}
					>
						<CreditCard size={11} className="shrink-0" />
						<span>
							{pBalance > 0
								? `Депозит: +${pBalance.toLocaleString("ru-RU")} ₽`
								: pBalance < 0
									? `Долг: ${Math.abs(pBalance).toLocaleString("ru-RU")} ₽`
									: "Оплата: 0 ₽"}
						</span>
					</button>
				) : (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (patObj?.id) {
								usePatientStore.getState().setSelectedPatientId(patObj.id);
							}
							useAppStore.getState().setCurrentView("finance");
							showToast(`Касса: расчёт ${pName}`, "info");
						}}
						className="px-2 py-0.5 rounded-lg text-[11px] font-medium font-mono text-slate-500 bg-slate-500/10 border border-slate-500/20 shrink-0 whitespace-nowrap cursor-pointer hover:bg-slate-500/20 flex items-center gap-1"
						title="Открыть кассу для расчёта"
						data-testid={`appointment-grid-balance-btn-${a.id}`}
					>
						<CreditCard size={10} className="shrink-0" />
						<span>Баланс: 0 ₽</span>
					</button>
				)}
			</div>

			{/* 2. Номер телефона с кнопкой WhatsApp и копированием SMS */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--ink)]">
					<Phone className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>{patObj?.phone || "Телефон не указан"}</span>
				</div>
				{patObj?.phone && (
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								const text = generateAppointmentWhatsAppMessage({
									patientName: pName,
									doctorName: docObj?.fullName,
									doctorSpecialty: docObj?.role,
									appointmentStartsAt: a.startsAt,
									clinicName: dashboard.clinicSettings?.profile?.clinicName,
									clinicAddress: dashboard.clinicSettings?.profile?.address,
									clinicPhone: dashboard.clinicSettings?.profile?.phone,
									treatmentReason: a.reason,
								});
								openWhatsAppChat(patObj.phone!, text);
							}}
							className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
							title="Открыть чат в WhatsApp"
						>
							<MessageSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
							<span>WhatsApp</span>
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								const text = generateAppointmentWhatsAppMessage({
									patientName: pName,
									doctorName: docObj?.fullName,
									doctorSpecialty: docObj?.role,
									appointmentStartsAt: a.startsAt,
									clinicName: dashboard.clinicSettings?.profile?.clinicName,
									clinicAddress: dashboard.clinicSettings?.profile?.address,
									clinicPhone: dashboard.clinicSettings?.profile?.phone,
									treatmentReason: a.reason,
								});
								if (typeof navigator !== "undefined" && navigator.clipboard) {
									void navigator.clipboard.writeText(text);
									showToast(`Текст напоминания для ${pName} скопирован в буфер`, "success");
								}
							}}
							className="min-h-[44px] min-w-[44px] sm:min-h-[44px] sm:min-w-[44px] p-2 rounded-lg text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] cursor-pointer flex items-center justify-center"
							style={{ minHeight: "44px", minWidth: "44px" }}
							title="Скопировать SMS напоминание"
							aria-label="Скопировать SMS напоминание"
						>
							<Copy size={13} />
						</button>
					</div>
				)}
			</div>

			{/* 3. Яркий янтарный алерт аллергий / противопоказаний */}
			{pAllergyAlert && (
				<div className="p-2.5 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2 shadow-xs">
					<AlertTriangle size={15} className="text-amber-600 shrink-0 animate-bounce" />
					<span>{pAllergyAlert}</span>
				</div>
			)}

			{/* 4. Процедура и список зубов */}
			<div className="pt-2 border-t border-[var(--line)] space-y-1.5">
				<div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
					<Clock size={13} className="text-[var(--teal)] shrink-0" />
					<span className="font-semibold">
						<span className="text-[var(--muted)] font-medium">Услуги / жалоба: </span>
						{a?.reason || (a as Record<string, any>)?.notes || a?.comment || "Консультация стоматолога"}
					</span>
				</div>
				{(() => {
					const teeth = extractTeethList(a);
					if (teeth.length === 0) return null;
					return (
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
					);
				})()}
			</div>

			{/* 5. Врач, ассистент, кресло */}
			<div className="pt-2 border-t border-[var(--line)] space-y-1 text-[11px] text-[var(--muted)]">
				<div className="flex items-center justify-between gap-1">
					<span className="flex items-center gap-1 text-[var(--ink)] font-medium truncate">
						<Stethoscope size={12} className="text-[var(--teal)] shrink-0" />
						<span className="truncate">
							{docObj?.fullName || "Врач не назначен"}
						</span>
					</span>
					{docTheme ? (
						<span
							className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 truncate max-w-[120px] font-bold ${docTheme.badgeClass}`}
							title={`Специальность врача: ${docTheme.label}`}
						>
							{docTheme.label}
						</span>
					) : docObj?.specialties && docObj.specialties.length > 0 && (
						<span
							className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 truncate max-w-[120px]"
							title={docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
						>
							{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
						</span>
					)}
				</div>
				{/* Ассистент */}
				<div className="flex items-center gap-1 text-[var(--muted)]">
					<User size={12} className="shrink-0 opacity-70" />
					<span>
						Ассистент: {(() => {
							const asstObj = a.assistantUserId ? staffLookupMap.get(a.assistantUserId) : null;
							return asstObj?.fullName || "Не назначен";
						})()}
					</span>
				</div>
				{/* Кресло и время */}
				<div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
					<span>Кабинет: {chair.name}</span>
					<span className="font-bold text-[var(--ink)]">{aStart} – {aEnd}</span>
				</div>
			</div>

			{/* 6. Оперативная очередь StomX: 1-кликовое перемещение между этапами и главные действия */}
			{onQuickStatusChange && (
				<div className="pt-2 border-t border-[var(--line)]">
					<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center justify-between">
						<span>Очередь смены (StomX 3-Stage Queue)</span>
						<span className="text-[10px] font-semibold text-[var(--teal,var(--brand-primary))]">
							{getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}
						</span>
					</div>

					{/* 3-Stage Day Queue: 1-кликовое перемещение между этапами */}
					<div className="grid grid-cols-3 gap-1 mb-2" data-testid={`hover-queue-stages-${a.id}`}>
						<button
							type="button"
							data-testid={`hover-status-arrived-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onQuickStatusChange(a.id, "arrived");
								showToast(`Пациент ${pName}: статус «Ожидает приёма»`, "info");
								onMouseLeave();
							}}
							className={`min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
								a.status === "arrived"
									? "bg-amber-500 text-white border-amber-500 shadow-2xs"
									: "bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20"
							}`}
							title="Пациент в холле клиники — перевести в статус «Ожидает приёма» (1 клик)"
							aria-label="Ожидает приёма"
						>
							<UserCheck size={14} className="shrink-0" />
							<span className="truncate">Ожидает</span>
						</button>
						<button
							type="button"
							data-testid={`hover-status-in-treatment-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onQuickStatusChange(a.id, "in_treatment");
								showToast(`Пациент ${pName}: статус «На приёме»`, "info");
								onMouseLeave();
							}}
							className={`min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
								isAppointmentInChair(a.status)
									? "bg-[var(--teal,var(--brand-primary))] text-white border-[var(--teal)] shadow-2xs"
									: "bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border-[var(--teal)]/30 hover:bg-[var(--teal-surface)]"
							}`}
							title="Пациент в кабинете — статус «На приёме» (1 клик)"
							aria-label="На приёме"
						>
							<CalendarCheck size={14} className="shrink-0" />
							<span className="truncate">На приёме</span>
						</button>
						<button
							type="button"
							data-testid={`hover-status-completed-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onQuickStatusChange(a.id, "completed");
								showToast(`Пациент ${pName}: статус «Ожидает оплаты»`, "info");
								onMouseLeave();
							}}
							className={`min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
								a.status === "completed"
									? "bg-slate-700 dark:bg-slate-600 text-white border-slate-700 shadow-2xs"
									: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30 hover:bg-slate-500/20"
							}`}
							title="Приём завершён — перевести в статус «Ожидает оплаты» (1 клик)"
							aria-label="Ожидает оплаты"
						>
							<CheckCircle2 size={14} className="shrink-0" />
							<span className="truncate">На оплату</span>
						</button>
					</div>

					{/* Вторичные статусы: Подтвержден и Не явился */}
					<div className="grid grid-cols-2 gap-1 mb-2">
						<button
							type="button"
							data-testid={`hover-status-confirmed-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onQuickStatusChange(a.id, "confirmed");
								onMouseLeave();
							}}
							className={`min-h-[26px] px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
								a.status === "confirmed"
									? "bg-emerald-600 text-white border-emerald-600 font-bold"
									: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20"
							}`}
						>
							<PhoneCall size={11} className="shrink-0" />
							<span>Подтвержден</span>
						</button>
						<button
							type="button"
							data-testid={`hover-status-no-show-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onQuickStatusChange(a.id, "no_show");
								onMouseLeave();
							}}
							className={`min-h-[26px] px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
								a.status === "no_show"
									? "bg-rose-500 text-white border-rose-500 font-bold"
									: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 hover:bg-rose-500/20"
							}`}
						>
							<UserX size={11} className="shrink-0" />
							<span>Не явился</span>
						</button>
					</div>

					{/* DentalPRO expo26: 6-Action Clinical Micro-HUD */}
					<div className="pt-2 border-t border-[var(--line)] space-y-1.5" data-testid={`clinical-micro-hud-${a.id}`}>
						<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between">
							<span>Клинические действия (DentalPRO 6-Action HUD)</span>
						</div>
						<div className="grid grid-cols-3 gap-1">
							{/* 1. Амбулаторная карта 043/у */}
							<button
								type="button"
								data-testid={`hud-action-emr-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onMouseLeave();
									if (patObj?.id) {
										usePatientStore.getState().setSelectedPatientId(patObj.id);
									}
									useAppStore.getState().setCurrentView("visit");
									showToast(`Амбулаторная карта: ${pName}`, "info");
								}}
								className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Открыть амбулаторную карту 043/у"
							>
								<FileText size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
								<span className="truncate">Карта 043/у</span>
							</button>

							{/* 2. Запланировать посещение (Re-book) */}
							<button
								type="button"
								data-testid={`hud-action-rebook-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onMouseLeave();
									if (patObj?.id) {
										usePatientStore.getState().setSelectedPatientId(patObj.id);
									}
									useAppStore.getState().setCurrentView("schedule");
									showToast(`Запланировать визит для ${pName}`, "info");
								}}
								className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Запланировать следующее посещение (Re-book)"
							>
								<CalendarPlus size={12} className="text-[var(--teal)] shrink-0" />
								<span className="truncate">Запись +</span>
							</button>

							{/* 3. Заполнить анкету здоровья */}
							<button
								type="button"
								data-testid={`hud-action-health-questionnaire-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onMouseLeave();
									if (patObj?.id) {
										usePatientStore.getState().setSelectedPatientId(patObj.id);
									}
									useAppStore.getState().setCurrentView("patients");
									if (typeof window !== "undefined") {
										window.location.hash = "#health-anamnesis";
									}
									showToast(`Анкета здоровья: ${pName}`, "info");
								}}
								className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Заполнить анкету здоровья / соматический анамнез"
							>
								<HeartPulse size={12} className="text-rose-500 shrink-0" />
								<span className="truncate">Анкета</span>
							</button>

							{/* 4. План лечения */}
							<button
								type="button"
								data-testid={`hud-action-treatment-plan-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onMouseLeave();
									if (patObj?.id) {
										usePatientStore.getState().setSelectedPatientId(patObj.id);
									}
									useAppStore.getState().setCurrentView("patients");
									if (typeof window !== "undefined") {
										window.location.hash = "#treatment-plans";
									}
									showToast(`Планы лечения: ${pName}`, "info");
								}}
								className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Открыть планы лечения и сметы"
							>
								<ClipboardList size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
								<span className="truncate">План</span>
							</button>

							{/* 5. Результат посещения / Расчёт */}
							<button
								type="button"
								data-testid={`hud-action-checkout-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onMouseLeave();
									if (patObj?.id) {
										usePatientStore.getState().setSelectedPatientId(patObj.id);
									}
									useAppStore.getState().setCurrentView("finance");
									showToast(`Результат посещения и касса: ${pName}`, "info");
								}}
								className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Результат посещения и кассовый расчёт"
							>
								<CreditCard size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="truncate">Результат</span>
							</button>

							{/* 6. В лист ожидания */}
							<button
								type="button"
								data-testid={`hud-action-waitlist-${a.id}`}
								onClick={(e) => {
									e.stopPropagation();
									onMouseLeave();
									if (onFreeSlotToWaitlist) {
										onFreeSlotToWaitlist(a);
									} else {
										showToast(`Слот перенесён в лист ожидания`, "info");
									}
								}}
								className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
								title="Перенести запись в лист ожидания"
							>
								<UserMinus size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span className="truncate">В лист ож.</span>
							</button>
						</div>
					</div>

					{/* 1-кликовые главные действия приёма: «Начать приём» и «Быстрый чек 54-ФЗ» (Мандаты 8e, 8n) */}
					<div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[var(--line)]">
						<button
							type="button"
							data-testid={`hover-start-visit-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onMouseLeave();
								if (onQuickStatusChange) {
									onQuickStatusChange(a.id, "in_treatment");
								}
								if (patObj?.id) {
									usePatientStore.getState().setSelectedPatientId(patObj.id);
								}
								useAppStore.getState().setCurrentView("visit");
								showToast(`Приём начат: ${pName} в кресле`, "success");
							}}
							className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-[var(--on-teal,#ffffff)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
							title="Начать приём: перевести в статус «На приёме» и открыть карту приёма (1 клик)"
						>
							<Stethoscope size={14} className="shrink-0" />
							<span className="whitespace-nowrap">Начать приём</span>
						</button>

						<button
							type="button"
							data-testid={`hover-pay-54fz-${a.id}`}
							onClick={(e) => {
								e.stopPropagation();
								onMouseLeave();
								if (onQuickStatusChange && a.status === "in_treatment") {
									onQuickStatusChange(a.id, "completed");
								}
								if (patObj?.id) {
									usePatientStore.getState().setSelectedPatientId(patObj.id);
								}
								useAppStore.getState().setCurrentView("finance");
								showToast(`Быстрый расчёт: ${pName}`, "info");
							}}
							className="min-h-[44px] px-2.5 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
							title="Быстрый расчёт: перейти к кассовому расчёту (1 клик)"
						>
							<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
							<span className="whitespace-nowrap">Быстрый расчёт</span>
						</button>
					</div>
				</div>
			)}

			{/* 7. Быстрое изменение длительности и сдвиг при опоздании (Wave 58) */}
			<div className="pt-2 border-t border-[var(--line)]">
				<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1.5 flex items-center justify-between">
					<span>Длительность и сдвиг (1 клик)</span>
				</div>
				<div className="grid grid-cols-4 gap-1">
					<button
						type="button"
						data-testid={`hover-duration-plus-15-${a.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onAdjustDuration(a, 15);
						}}
						className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="Увеличить длительность на 15 минут"
					>
						<Clock size={11} className="text-[var(--teal)] shrink-0" />
						<span>+15 мин</span>
					</button>
					<button
						type="button"
						data-testid={`hover-duration-plus-30-${a.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onAdjustDuration(a, 30);
						}}
						className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="Увеличить длительность на 30 минут"
					>
						<Clock size={11} className="text-[var(--teal)] shrink-0" />
						<span>+30 мин</span>
					</button>
					<button
						type="button"
						data-testid={`hover-duration-minus-15-${a.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onAdjustDuration(a, -15);
						}}
						className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="Уменьшить длительность на 15 минут"
					>
						<Clock size={11} className="text-[var(--teal)] shrink-0" />
						<span>-15 мин</span>
					</button>
					<button
						type="button"
						data-testid={`hover-shift-late-15-${a.id}`}
						onClick={(e) => {
							e.stopPropagation();
							onShiftLateness(a, 15);
						}}
						className="min-h-[32px] px-1.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/40 flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="Сдвинуть прием на 15 минут вперед при опоздании"
					>
						<FastForward size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
						<span>Сдвиг +15 мин</span>
					</button>
				</div>
			</div>
		</div>
	);
}
