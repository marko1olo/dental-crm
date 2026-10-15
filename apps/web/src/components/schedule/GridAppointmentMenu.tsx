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
import {
	createSmartSequentialAppointment,
	detectRecommendedProtocol,
} from "./smartSequentialVisitsEngine";

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
			className={`${isMenuOpen ? "block" : "hidden"} absolute right-0 top-full mt-1 z-50 p-1.5 rounded-2xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[220px] max-w-[270px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100`}
			style={{
				top: "100%",
				right: 0,
				marginTop: "6px",
				zIndex: 100,
				background: "var(--paper)",
				border: "1.5px solid var(--teal, #0d9488)",
				borderRadius: "14px",
				boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
				padding: "8px",
			}}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Clinical Actions Section */}
			<div className="space-y-0.5 pb-1 border-b border-[var(--line)]" data-testid={`menu-clinical-hud-${a.id}`}>
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Клинические действия
				</div>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("visit");
						if (typeof window !== "undefined") {
							window.location.hash = "#visit";
						}
						showToast(`Медицинская карта: ${pName}`, "info");
					}}
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-semibold transition-colors cursor-pointer"
					title="Открыть медицинскую карту пациента"
					data-testid={`menu-emr-btn-${a.id}`}
				>
					<FileText size={14} className="text-[var(--teal)] shrink-0" />
					<span>Медицинская карта</span>
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
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium transition-colors cursor-pointer"
					title="Заполнить анкету здоровья / соматический анамнез"
					data-testid={`menu-anamnesis-btn-${a.id}`}
				>
					<HeartPulse size={14} className="text-[var(--muted)] shrink-0" />
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
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium transition-colors cursor-pointer"
					title="Открыть планы лечения"
					data-testid={`menu-plans-btn-${a.id}`}
				>
					<ClipboardList size={14} className="text-[var(--muted)] shrink-0" />
					<span>Планы лечения</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onCloseMenu();
						const recKey = detectRecommendedProtocol({
							diagnosisMkb10: a.diagnosisMkb10 ?? null,
							reason: a.reason ?? null,
							clinicalStage: a.clinicalStage ?? null,
							toothNumber: a.toothNumber ?? null,
						});
						const allAppts = dashboard?.appointments || [];
						createSmartSequentialAppointment({
							parentAppointment: a as any,
							protocolKey: recKey,
							existingAppointments: allAppts,
						});
					}}
					className="w-full text-left min-h-[36px] px-2.5 py-1 rounded-lg flex items-center justify-between gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal)] font-bold transition-colors cursor-pointer"
					style={{
						background: "rgba(13, 148, 136, 0.08)",
						border: "1px solid rgba(13, 148, 136, 0.28)",
						borderRadius: "8px",
						marginTop: "2px",
					}}
					title="Запланировать следующий этап лечения в 1 клик (с авто-подбором даты и Rollback Toast)"
					data-testid={`menu-next-stage-btn-${a.id}`}
				>
					<div className="flex items-center gap-2">
						<FastForward size={14} className="text-[var(--teal)] shrink-0" />
						<span>+ След. этап лечения</span>
					</div>
					<span
						className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
						style={{
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							borderRadius: "6px",
							padding: "1px 6px",
							fontSize: "10px",
						}}
					>
						1 клик
					</span>
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
					{[
						{ status: "confirmed", title: "Подтвержден", icon: PhoneCall, activeClass: "bg-violet-500 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-violet-700 dark:text-violet-300", active: a.status === "confirmed" },
						{ status: "arrived", title: "Пришел", icon: UserCheck, activeClass: "bg-emerald-500 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300", active: a.status === "arrived" },
						{ status: "in_treatment", title: "В кресле", icon: CalendarCheck, activeClass: "bg-[var(--teal,var(--brand-primary))] text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]", active: isAppointmentInChair(a.status) },
						{ status: "completed", title: "Завершен", icon: CheckCircle2, activeClass: "bg-slate-600 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300", active: a.status === "completed" },
						{ status: "no_show", title: "Не явился", icon: UserX, activeClass: "bg-rose-500 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300", active: a.status === "no_show" },
					].map((item) => {
						const Icon = item.icon;
						return (
							<button
								key={item.status}
								type="button"
								title={item.title}
								onClick={() => {
									onQuickStatusChange(a.id, item.status);
									onCloseMenu();
								}}
								className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
									item.active ? item.activeClass : item.inactiveClass
								}`}
							>
								<Icon size={14} />
								<span>{item.title}</span>
							</button>
						);
					})}
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

			{/* Блок «Длительность» */}
			<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
				<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
					Длительность
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

			{/* Сменить кресло */}
			{effectiveChairs.length > 1 && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
						Сменить кресло
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

			{/* Сменить врача */}
			{doctors.length > 1 && (
				<div className="border-t border-[var(--line)] pt-1 space-y-0.5">
					<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
						Сменить врача
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
