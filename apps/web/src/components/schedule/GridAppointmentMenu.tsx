import {
	type Appointment,
	type Dashboard,
	getStomxWorkplacePalette,
} from "@dental/shared";
import {
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
	User,
	UserCheck,
	UserMinus,
	UserX,
} from "lucide-react";
import React from "react";
import { generateAppointmentWhatsAppMessage } from "./generateAppointmentWhatsAppMessage";
import { openWhatsAppChat } from "../../store/telephonyStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import {
	formatDoctorShortName,
	isAppointmentInChair,
} from "./appointmentCardHelpers";

export interface GridAppointmentMenuProps {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	docObj?: any;
	effectiveChairs: Array<{ id: string; name: string; color?: string; colorId?: string | number }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	dashboard: Dashboard;
	isMenuOpen: boolean;
	onAppointmentClick: (appt: Appointment) => void;
	onCloseMenu: () => void;
	onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
}

export function GridAppointmentMenu(props: GridAppointmentMenuProps) {
	const {
		appointment: a,
		pName,
		patObj,
		docObj,
		effectiveChairs,
		doctors,
		dashboard,
		isMenuOpen,
		onAppointmentClick,
		onCloseMenu,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onReassignChair,
		onReassignDoctor,
		onFreeSlotToWaitlist,
	} = props;

	return (
		<div
			className={`${isMenuOpen ? "block" : "hidden"} absolute right-0 bottom-full mb-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[210px] max-w-[260px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100`}
			onClick={(e) => e.stopPropagation()}
		>
			{/* DentalPRO expo26: Clinical Actions Section */}
			<div className="space-y-0.5 pb-1 border-b border-[var(--line)]" data-testid={`menu-clinical-hud-${a.id}`}>
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Клинические действия (DentalPRO)
				</div>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("visit");
						showToast(`Амбулаторная карта: ${pName}`, "info");
					}}
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-cyan-700 dark:text-cyan-300 font-bold transition-colors cursor-pointer"
					title="Открыть амбулаторную карту 043/у"
					data-testid={`menu-emr-btn-${a.id}`}
				>
					<FileText size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
					<span>Амбулаторная карта 043/у</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("patients");
						if (typeof window !== "undefined") {
							window.location.hash = "#health-anamnesis";
						}
						showToast(`Анкета здоровья: ${pName}`, "info");
					}}
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300 font-medium transition-colors cursor-pointer"
					title="Заполнить анкету здоровья / соматический анамнез"
					data-testid={`menu-anamnesis-btn-${a.id}`}
				>
					<HeartPulse size={14} className="text-rose-500 shrink-0" />
					<span>Анкета здоровья</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("patients");
						if (typeof window !== "undefined") {
							window.location.hash = "#treatment-plans";
						}
						showToast(`Планы лечения: ${pName}`, "info");
					}}
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-indigo-700 dark:text-indigo-300 font-medium transition-colors cursor-pointer"
					title="Открыть планы лечения"
					data-testid={`menu-plans-btn-${a.id}`}
				>
					<ClipboardList size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					<span>Планы лечения</span>
				</button>
			</div>

			{/* Быстрые переходы: Карточка приема и Профиль пациента */}
			<div className="space-y-0.5 pb-1 border-b border-[var(--line)]">
				<button
					type="button"
					onClick={() => {
						onAppointmentClick(a);
						onCloseMenu();
					}}
					className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))] font-bold transition-colors cursor-pointer"
					title={`Открыть профиль ${pName}`}
					aria-label={`Открыть профиль ${pName}`}
					data-testid={`menu-profile-btn-${a.id}`}
				>
					<User size={14} className="text-[var(--teal)] shrink-0" />
					<span>Профиль пациента</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onAppointmentClick(a);
						onCloseMenu();
					}}
					className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium transition-colors cursor-pointer"
					title={`Открыть прием ${pName}`}
					aria-label={`Открыть прием ${pName}`}
					data-testid={`menu-treatment-btn-${a.id}`}
				>
					<CalendarCheck size={14} className="text-[var(--teal)] shrink-0" />
					<span>Прием (детали)</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("finance");
						showToast(`Касса: расчёт ${pName}`, "info");
					}}
					className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold transition-colors cursor-pointer"
					title={`Оплата визита (касса): ${pName}`}
					aria-label={`Оплата визита ${pName}`}
					data-testid={`menu-pay-btn-${a.id}`}
				>
					<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Оплата на кассе</span>
				</button>
				{patObj?.phone && (
					<a
						href={`tel:${patObj.phone}`}
						onClick={() => onCloseMenu()}
						className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold transition-colors cursor-pointer"
						title={`Позвонить ${pName}: ${patObj.phone}`}
						aria-label={`Позвонить ${pName}`}
						data-testid={`menu-call-btn-${a.id}`}
					>
						<Phone size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
						<span className="truncate">Позвонить ({patObj.phone})</span>
					</a>
				)}
			</div>

			<div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
				Статус визита
			</div>
			{onQuickStatusChange && (
				<div className="space-y-0.5">
					<button
						type="button"
						title="Подтвержден"
						onClick={() => {
							onQuickStatusChange(a.id, "confirmed");
							onCloseMenu();
						}}
						className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							a.status === "confirmed"
								? "bg-violet-500 text-white font-bold"
								: "hover:bg-[var(--paper-soft)] text-violet-700 dark:text-violet-300"
						}`}
					>
						<PhoneCall size={14} />
						<span>Подтвержден</span>
					</button>
					<button
						type="button"
						title="Пришел"
						onClick={() => {
							onQuickStatusChange(a.id, "arrived");
							onCloseMenu();
						}}
						className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							a.status === "arrived"
								? "bg-emerald-500 text-white font-bold"
								: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
						}`}
					>
						<UserCheck size={14} />
						<span>Пришел</span>
					</button>
					<button
						type="button"
						title="В кресле"
						onClick={() => {
							onQuickStatusChange(a.id, "in_treatment");
							onCloseMenu();
						}}
						className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							isAppointmentInChair(a.status)
								? "bg-[var(--teal,var(--brand-primary))] text-white font-bold"
								: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]"
						}`}
					>
						<CalendarCheck size={14} />
						<span>В кресле</span>
					</button>
					<button
						type="button"
						title="Завершен"
						onClick={() => {
							onQuickStatusChange(a.id, "completed");
							onCloseMenu();
						}}
						className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							a.status === "completed"
								? "bg-slate-600 text-white font-bold"
								: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
						}`}
					>
						<CheckCircle2 size={14} />
						<span>Завершен</span>
					</button>
					<button
						type="button"
						title="Не явился"
						onClick={() => {
							onQuickStatusChange(a.id, "no_show");
							onCloseMenu();
						}}
						className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							a.status === "no_show"
								? "bg-rose-500 text-white font-bold"
								: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
						}`}
					>
						<UserX size={14} />
						<span>Не явился</span>
					</button>
				</div>
			)}

			{patObj?.phone && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
						Связь
					</div>
					<button
						type="button"
						onClick={() => {
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
							onCloseMenu();
						}}
						className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 font-bold transition-colors cursor-pointer"
					>
						<MessageSquare size={14} className="text-emerald-600 dark:text-emerald-400" />
						<span>WhatsApp напоминание</span>
					</button>

					<button
						type="button"
						onClick={() => {
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
							onCloseMenu();
						}}
						className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-[var(--ink)] hover:bg-[var(--paper-soft)] font-medium transition-colors cursor-pointer"
					>
						<Copy size={14} className="text-[var(--teal)]" />
						<span>Скопировать SMS</span>
					</button>
				</div>
			)}

			{/* Блок «Длительность (1 клик)» */}
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Длительность (1 клик)
				</div>
				<div className="grid grid-cols-3 gap-1 px-1">
					<button
						type="button"
						data-testid={`menu-duration-plus-15-${a.id}`}
						onClick={() => {
							onAdjustDuration(a, 15);
							onCloseMenu();
						}}
						className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="+15 минут"
					>
						<Clock size={12} className="text-[var(--teal)] shrink-0" />
						<span>+15 мин</span>
					</button>
					<button
						type="button"
						data-testid={`menu-duration-plus-30-${a.id}`}
						onClick={() => {
							onAdjustDuration(a, 30);
							onCloseMenu();
						}}
						className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="+30 минут"
					>
						<Clock size={12} className="text-[var(--teal)] shrink-0" />
						<span>+30 мин</span>
					</button>
					<button
						type="button"
						data-testid={`menu-duration-minus-15-${a.id}`}
						onClick={() => {
							onAdjustDuration(a, -15);
							onCloseMenu();
						}}
						className="min-h-[44px] px-1.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
						title="-15 минут"
					>
						<Clock size={12} className="text-[var(--teal)] shrink-0" />
						<span>-15 мин</span>
					</button>
				</div>
			</div>

			{/* Блок «Опоздание» */}
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Опоздание
				</div>
				<button
					type="button"
					data-testid={`menu-shift-late-15-${a.id}`}
					onClick={() => {
						onShiftLateness(a, 15);
						onCloseMenu();
					}}
					className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 font-bold transition-colors cursor-pointer"
					title="Сдвинуть на +15 мин (опоздание)"
				>
					<FastForward size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Сдвинуть на +15 мин (опоздание)</span>
				</button>
			</div>

			{/* Сменить кресло (1 клик без модального ада) */}
			{effectiveChairs.length > 1 && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
						Сменить кресло (1 клик)
					</div>
					<div className="flex items-center gap-1 px-1 flex-wrap">
						{effectiveChairs.map((ch, chIdx) => {
							const chPalette = getStomxWorkplacePalette((ch as any).colorId ?? ch.id ?? chIdx);
							const chAccent = ch.color || chPalette.bright_code;
							const isCurrent = a.chairId === ch.id;
							return (
								<button
									key={ch.id}
									type="button"
									data-testid={`menu-reassign-chair-${a.id}-${ch.id}`}
									onClick={() => onReassignChair(a, ch.id)}
									className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
										isCurrent
											? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
											: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
									title={`Переместить прием на кресло «${ch.name}» (${chPalette.nameRu})`}
								>
									<span
										className="w-2 h-2 rounded-full shrink-0"
										style={{ backgroundColor: chAccent }}
									/>
									<span className="truncate">{ch.name}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Сменить врача (1 клик без модального ада) */}
			{doctors.length > 1 && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
						Сменить врача (1 клик)
					</div>
					<div className="flex items-center gap-1 px-1 flex-wrap">
						{doctors.slice(0, 4).map((doc) => {
							const isCurrent = a.doctorUserId === doc.id;
							return (
								<button
									key={doc.id}
									type="button"
									data-testid={`menu-reassign-doctor-${a.id}-${doc.id}`}
									onClick={() => onReassignDoctor(a, doc.id)}
									className={`min-h-[36px] px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer truncate max-w-[140px] flex items-center gap-1 ${
										isCurrent
											? "bg-[var(--teal)] text-white border-[var(--teal)] font-bold shadow-2xs"
											: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
									}`}
									title={`Передать прием врачу ${doc.fullName}`}
								>
									<span className="truncate">{formatDoctorShortName(doc.fullName)}</span>
								</button>
							);
						})}
						{doctors.length > 4 && (
							<select
								value={a.doctorUserId || ""}
								onChange={(e) => {
									if (e.target.value) {
										onReassignDoctor(a, e.target.value);
									}
								}}
								className="min-h-[36px] text-xs font-semibold border border-[var(--line)] rounded-lg px-2 bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer max-w-[130px] truncate"
								title="Выбрать другого врача"
								data-testid={`menu-reassign-doctor-select-${a.id}`}
							>
								<option value="" disabled>Все врачи...</option>
								{doctors.map((d) => (
									<option key={d.id} value={d.id}>
										{formatDoctorShortName(d.fullName)}
									</option>
								))}
							</select>
						)}
					</div>
				</div>
			)}

			{/* Освободить слот -> в лист ожидания */}
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<button
					type="button"
					data-testid={`menu-free-slot-waitlist-${a.id}`}
					onClick={() => {
						onFreeSlotToWaitlist(a);
					}}
					className="w-full text-left min-h-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 font-bold transition-colors cursor-pointer"
					title="Освободить слот -> в лист ожидания"
				>
					<UserMinus size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<span>Освободить слот -&gt; в лист ожидания</span>
				</button>
			</div>
		</div>
	);
}
