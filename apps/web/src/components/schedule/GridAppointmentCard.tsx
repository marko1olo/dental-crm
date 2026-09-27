import {
	type Appointment,
	type Dashboard,
	type DentalSpecialty,
} from "@dental/shared";
import {
	AlertTriangle,
	CalendarCheck,
	Check,
	CheckCircle2,
	CreditCard,
	FileText,
	MoreVertical,
	Phone,
	PhoneCall,
	Stethoscope,
	User,
	UserCheck,
	UserX,
	Zap,
} from "lucide-react";
import React, { memo } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";
import {
	formatPatientDisplayFio,
	formatDoctorShortName,
	isAppointmentInChair,
	getNormalizedAppointmentStatusLabel,
	type DoctorSpecialtyTheme,
	getDoctorSpecialtyTheme,
	isAppointmentCito,
	resolvePatientBalance,
	getPatientAllergyAlert,
	getGridAppointmentCardContainerClasses,
	extractTeethList,
} from "./appointmentCardHelpers";
import { GridAppointmentHoverHud } from "./GridAppointmentHoverHud";
import { GridAppointmentMenu } from "./GridAppointmentMenu";

export * from "./appointmentCardHelpers";

export interface GridAppointmentCardProps {
	appointment: Appointment;
	chair: { id: string; name: string };
	effectiveChairs: Array<{ id: string; name: string; color?: string; colorId?: string | number }>;
	doctors: Array<{ id: string; fullName: string; specialties?: string[]; role?: string }>;
	patientLookupMap: Map<string, any>;
	staffLookupMap: Map<string, any>;
	collisionMap: Map<string, any>;
	patientNameFn?: ((patients: any, patientId: string | null) => string) | undefined;
	getPatientName?: ((patients: any, patientId: string | null) => string) | undefined;
	dashboard: Dashboard;
	timezone?: string | null;
	toDateTimeLocalValue: (iso: string, timezone?: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	isHovered: boolean;
	isStatusPickerOpen: boolean;
	isMenuOpen: boolean;
	isNearBottom: boolean;
	isNearRightEdge: boolean;
	onAppointmentClick: (appt: Appointment) => void;
	onSelectMobileAppt: (appt: Appointment) => void;
	onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
	onAdjustDuration: (appt: Appointment, deltaMinutes: number) => void;
	onShiftLateness: (appt: Appointment, deltaMinutes: number) => void;
	onReassignChair: (appt: Appointment, chairId: string) => void;
	onReassignDoctor: (appt: Appointment, doctorId: string) => void;
	onFreeSlotToWaitlist: (appt: Appointment) => void;
	onMouseEnter: (apptId: string) => void;
	onMouseLeave: () => void;
	onKeepHovered: (apptId: string) => void;
	onToggleStatusPicker: (apptId: string) => void;
	onToggleMenu: (apptId: string) => void;
	onCloseStatusPicker: () => void;
	onCloseMenu: () => void;
}

function areGridAppointmentCardPropsEqual(
	prev: GridAppointmentCardProps,
	next: GridAppointmentCardProps,
): boolean {
	if (prev.appointment !== next.appointment) return false;
	if (prev.isHovered !== next.isHovered) return false;
	if (prev.isStatusPickerOpen !== next.isStatusPickerOpen) return false;
	if (prev.isMenuOpen !== next.isMenuOpen) return false;
	if (prev.isNearBottom !== next.isNearBottom) return false;
	if (prev.isNearRightEdge !== next.isNearRightEdge) return false;
	if (prev.chair.id !== next.chair.id || prev.chair.name !== next.chair.name) return false;
	if (prev.effectiveChairs !== next.effectiveChairs) return false;
	if (prev.doctors !== next.doctors) return false;
	if (prev.patientLookupMap !== next.patientLookupMap) return false;
	if (prev.staffLookupMap !== next.staffLookupMap) return false;
	if (prev.collisionMap !== next.collisionMap) return false;
	if (prev.appointmentLabels !== next.appointmentLabels) return false;
	if (prev.timezone !== next.timezone) return false;
	if (prev.dashboard.clinicSettings !== next.dashboard.clinicSettings) return false;
	return true;
}

export const GridAppointmentCard = memo(function GridAppointmentCard(props: GridAppointmentCardProps) {
	const {
		appointment: a,
		chair,
		effectiveChairs,
		doctors,
		patientLookupMap,
		staffLookupMap,
		collisionMap,
		patientNameFn,
		getPatientName,
		dashboard,
		timezone,
		toDateTimeLocalValue,
		appointmentLabels,
		isHovered,
		isStatusPickerOpen,
		isMenuOpen,
		isNearBottom,
		isNearRightEdge,
		onAppointmentClick,
		onSelectMobileAppt,
		onQuickStatusChange,
		onAdjustDuration,
		onShiftLateness,
		onReassignChair,
		onReassignDoctor,
		onFreeSlotToWaitlist,
		onMouseEnter,
		onMouseLeave,
		onKeepHovered,
		onToggleStatusPicker,
		onToggleMenu,
		onCloseStatusPicker,
		onCloseMenu,
	} = props;

	const resolveNameFn = getPatientName || patientNameFn || ((_patients: any, _id?: string | null) => "Пациент");
	const pName = resolveNameFn(dashboard.patients, a.patientId ?? null);
	const aStart = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
	const aEnd = toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16);

	const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
	const docObj = a.doctorUserId ? staffLookupMap.get(a.doctorUserId) : undefined;
	const doctorSpecialty =
		docObj?.specialty ||
		(Array.isArray(docObj?.specialties) ? docObj?.specialties[0] : undefined) ||
		docObj?.role;
	const docTheme = getDoctorSpecialtyTheme(doctorSpecialty);
	const collision = collisionMap.get(a.id);
	const isCito = isAppointmentCito(a);
	const pBalance = resolvePatientBalance(patObj);
	const pAllergyAlert = getPatientAllergyAlert(patObj, a?.reason);

	const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
	const durationMin =
		(Number.isFinite(diffMs) && diffMs > 0 ? Math.round(diffMs / 60000) : 0) ||
		(a as any).durationMinutes ||
		30;
	const durationLabel =
		durationMin >= 60
			? `${(durationMin / 60).toFixed(durationMin % 60 === 0 ? 0 : 1)} ч`
			: `${durationMin} мин`;

	let patientAgeLabel: string | null = null;
	if (patObj?.birthDate) {
		const bDate = new Date(patObj.birthDate);
		if (!Number.isNaN(bDate.getTime())) {
			const ageYears = Math.floor(
				(Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000),
			);
			if (ageYears > 0 && ageYears < 120) {
				patientAgeLabel = `${ageYears} лет`;
			}
		}
	}

	const teethList = extractTeethList(a);
	const procedureLabel = a.reason || (a as any).serviceTitle || "Приём";

	return (
		<div
			key={a.id}
			data-testid={`appointment-card-${a.id}`}
			data-appointment-id={a.id}
			draggable
			onMouseEnter={() => onMouseEnter(a.id)}
			onMouseLeave={onMouseLeave}
			onFocus={() => onMouseEnter(a.id)}
			onBlur={onMouseLeave}
			onDragStart={(e) => {
				e.dataTransfer.setData(
					"application/json",
					JSON.stringify({
						type: "appointment",
						appointmentId: a.id,
						doctorUserId: a.doctorUserId,
						durationMinutes: Math.round((Date.parse(a.endsAt) - Date.parse(a.startsAt)) / 60000) || 30,
					}),
				);
				e.dataTransfer.effectAllowed = "move";
			}}
			style={{ contentVisibility: "auto", containIntrinsicSize: "1px 60px" }}
			className={`appointment-card m-0 mb-0 w-full h-full text-left p-2 rounded-xl border text-xs font-semibold shadow-2xs flex flex-col justify-between gap-1.5 transition-all min-h-[44px] cursor-grab active:cursor-grabbing relative ${getGridAppointmentCardContainerClasses(
				a.status,
				{ collision: Boolean(collision), isCito, docTheme },
			)}`}
		>
			{/* macOS Hover HUD с задержкой 150ms без сдвига сетки расписания (Apple HIG Progressive Disclosure) */}
			{isHovered && (
				<GridAppointmentHoverHud
					appointment={a}
					pName={pName}
					pBalance={pBalance}
					patObj={patObj}
					docObj={docObj}
					docTheme={docTheme}
					pAllergyAlert={pAllergyAlert}
					chair={chair}
					aStart={aStart}
					aEnd={aEnd}
					appointmentLabels={appointmentLabels}
					isNearRightEdge={isNearRightEdge}
					isNearBottom={isNearBottom}
					dashboard={dashboard}
					staffLookupMap={staffLookupMap}
					onKeepHovered={onKeepHovered}
					onMouseLeave={onMouseLeave}
					onQuickStatusChange={onQuickStatusChange}
					onAdjustDuration={onAdjustDuration}
					onShiftLateness={onShiftLateness}
				/>
			)}

			{/* 2-Column Balanced Internal Layout: Left (Patient Identity & Time) / Right (Procedure, Teeth & Actions) */}
			<div
				data-testid={`appointment-card-clickable-${a.id}`}
				onClick={() => {
					if (typeof window !== "undefined" && window.innerWidth < 768) {
						onSelectMobileAppt(a);
					} else {
						if (a.patientId) {
							usePatientStore.getState().setSelectedPatientId(a.patientId);
						}
						onAppointmentClick(a);
					}
				}}
				className="cursor-pointer w-full min-w-0"
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						if (a.patientId) {
							usePatientStore.getState().setSelectedPatientId(a.patientId);
						}
						onAppointmentClick(a);
					}
				}}
			>
				<div className="appointment-card-grid-2col w-full min-w-0">
					{/* LEFT COLUMN: Patient Name, Phone, Age, Time Badge, 1-Click Status */}
					<div className="appointment-card-left-col flex flex-col justify-between gap-1 min-w-0">
						{/* Row 1: FIO & CITO */}
						<div className="flex items-center gap-1.5 min-w-0">
							<User size={12} className="shrink-0 text-[var(--teal)]" />
							<span
								className="font-bold text-xs text-[var(--ink)] truncate min-w-0 hover:underline"
								title={`Пациент: ${pName}. Нажмите для перехода в карточку`}
								onClick={(e) => {
									e.stopPropagation();
									if (a.patientId) {
										usePatientStore.getState().setSelectedPatientId(a.patientId);
										useAppStore.getState().setCurrentView("patients");
										showToast(`Карта пациента: ${pName}`, "info");
									}
								}}
							>
								{formatPatientDisplayFio(pName)}
							</span>
							{isCito && (
								<span
									className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-600 text-white font-extrabold flex items-center gap-0.5 animate-pulse shrink-0"
									title="CITO! Прием по острой боли (овербукинг)"
									data-testid="appointment-cito-overbooking-badge"
								>
									<Zap size={10} className="fill-white" />
									<span>CITO</span>
								</span>
							)}
						</div>

						{/* Row 2: Phone & Age */}
						<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-medium truncate min-w-0">
							{patObj?.phone ? (
								<span className="truncate flex items-center gap-1">
									<Phone size={10} className="shrink-0 opacity-70" />
									<span className="truncate">{patObj.phone}</span>
								</span>
							) : (
								<span className="text-[10px] opacity-60">Тел. не указан</span>
							)}
							{patientAgeLabel && (
								<>
									<span className="opacity-30">·</span>
									<span className="shrink-0">{patientAgeLabel}</span>
								</>
							)}
						</div>

						{/* Row 3: Time Badge & 1-Click Status */}
						<div className="flex items-center gap-1.5 flex-wrap min-w-0 mt-0.5">
							<span className="text-[11px] font-semibold text-[var(--ink)] opacity-90 shrink-0 bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line)]/70">
								{aStart} – {aEnd} · {durationLabel}
							</span>

							{/* Status Button (1-Click) */}
							<div className="relative">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										if (onQuickStatusChange) {
											onToggleStatusPicker(a.id);
										}
									}}
									className={`h-[24px] min-h-[24px] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1 transition-all cursor-pointer hover:opacity-90 active:scale-95 truncate ${
										isAppointmentInChair(a.status)
											? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs ring-1 ring-teal-400/50"
											: a.status === "arrived"
												? "bg-amber-500 text-white shadow-xs"
												: a.status === "confirmed"
													? "bg-emerald-600 text-white shadow-xs"
													: a.status === "completed"
														? "bg-slate-200/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
														: "bg-[var(--paper)]/80 text-[var(--ink)]"
									}`}
									title={`Статус: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}. Нажмите для смены в 1 клик`}
									aria-label={`Сменить статус визита, текущий: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}`}
									data-testid={`appointment-card-status-badge-${a.id}`}
								>
									{isAppointmentInChair(a.status) && (
										<span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
									)}
									{String(a.status).toLowerCase() === "completed" && (
										<Check size={10} className="shrink-0 text-current" />
									)}
									{String(a.status).toLowerCase() === "confirmed" && (
										<PhoneCall size={10} className="shrink-0 text-current" />
									)}
									<span className="truncate">{getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}</span>
								</button>

								{/* Status Picker Popover */}
								{isStatusPickerOpen && onQuickStatusChange && (
									<div
										className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-50 p-1.5 rounded-xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[190px] max-w-[calc(100vw-32px)] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
										onClick={(e) => e.stopPropagation()}
										data-testid={`appointment-status-picker-popover-${a.id}`}
									>
										<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
											Статус визита (1 клик)
										</div>
										<button
											type="button"
											onClick={() => {
												onQuickStatusChange(a.id, "confirmed");
												onCloseStatusPicker();
											}}
											className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
												a.status === "confirmed"
													? "bg-emerald-600 text-white font-bold"
													: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
											}`}
											data-testid={`quick-status-picker-confirmed-${a.id}`}
										>
											<PhoneCall size={13} />
											<span>Подтвержден</span>
										</button>
										<button
											type="button"
											onClick={() => {
												onQuickStatusChange(a.id, "arrived");
												onCloseStatusPicker();
											}}
											className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
												a.status === "arrived"
													? "bg-amber-500 text-white font-bold"
													: "hover:bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300"
											}`}
											data-testid={`quick-status-picker-arrived-${a.id}`}
										>
											<UserCheck size={13} />
											<span>Ожидает приёма</span>
										</button>
										<button
											type="button"
											onClick={() => {
												onQuickStatusChange(a.id, "in_treatment");
												onCloseStatusPicker();
											}}
											className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
												isAppointmentInChair(a.status)
													? "bg-[var(--teal,var(--brand-primary))] text-white font-bold"
													: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]"
											}`}
											data-testid={`quick-status-picker-in-treatment-${a.id}`}
										>
											<CalendarCheck size={13} />
											<span>На приёме</span>
										</button>
										<button
											type="button"
											onClick={() => {
												onQuickStatusChange(a.id, "completed");
												onCloseStatusPicker();
											}}
											className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
												a.status === "completed"
													? "bg-slate-600 text-white font-bold"
													: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
											}`}
											data-testid={`quick-status-picker-completed-${a.id}`}
										>
											<CheckCircle2 size={13} />
											<span>Ожидает оплаты</span>
										</button>
										<button
											type="button"
											onClick={() => {
												onQuickStatusChange(a.id, "no_show");
												onCloseStatusPicker();
											}}
											className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
												a.status === "no_show"
													? "bg-rose-500 text-white font-bold"
													: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
											}`}
											data-testid={`quick-status-picker-no-show-${a.id}`}
										>
											<UserX size={13} />
											<span>Не явился</span>
										</button>
										<button
											type="button"
											onClick={() => {
												onCloseStatusPicker();
												if (patObj?.id) {
													usePatientStore.getState().setSelectedPatientId(patObj.id);
												}
												useAppStore.getState().setCurrentView("finance");
												showToast(`Касса 54-ФЗ: расчёт ${pName}`, "info");
											}}
											className="w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-bold transition-colors cursor-pointer border-t border-[var(--line)] pt-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
											data-testid={`quick-status-picker-pay-${a.id}`}
											title="Перейти к приёму оплаты на кассе (54-ФЗ)"
										>
											<CreditCard size={13} className="text-emerald-600 dark:text-emerald-400" />
											<span>Оплата 54-ФЗ</span>
										</button>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* RIGHT COLUMN: Clinical Procedure, Teeth, Doctor & Actions */}
					<div className="appointment-card-right-col flex flex-col justify-between gap-1 min-w-0">
						{/* Procedure, Teeth, Doctor */}
						<div className="min-w-0">
							<div className="flex items-center gap-1.5 flex-wrap min-w-0">
								<span
									className="font-bold text-xs text-[var(--ink)] truncate max-w-[220px]"
									title={procedureLabel}
								>
									{procedureLabel}
								</span>
								{teethList.map((tooth) => (
									<span
										key={tooth}
										className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[var(--teal)]/10 text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 shrink-0"
										title={`Зуб по формуле FDI: ${tooth}`}
									>
										Зуб {tooth}
									</span>
								))}
							</div>

							{docObj && (
								<div className="text-[11px] opacity-80 font-medium truncate flex items-center gap-1 mt-0.5 min-w-0">
									<Stethoscope size={11} className="shrink-0 text-[var(--teal)]" />
									<span className="truncate">
										{docObj.fullName
											?.split(" ")
											.map((part: string, index: number) => (index === 0 ? part : `${part[0]}.`))
											.join(" ") || docObj.fullName}
									</span>
									{docTheme ? (
										<span
											className={`text-[9px] px-1 py-0.2 rounded border shrink-0 font-bold ${docTheme.badgeClass}`}
											title={`Специализация врача: ${docTheme.label}`}
											data-testid={`card-specialty-badge-${a.id}`}
										>
											{docTheme.label}
										</span>
									) : docObj.specialties && docObj.specialties.length > 0 && (
										<span
											className="text-[9px] px-1 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] shrink-0 max-w-[100px] truncate"
											title={docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
										>
											{docObj.specialties.map((s: string) => specialtyLabels[s as DentalSpecialty] || s).join(", ")}
										</span>
									)}
								</div>
							)}
						</div>

						{/* Quick Actions (28px height) */}
						<div className="appointment-card-actions flex items-center gap-1 pt-1 border-t border-[var(--line)]/40 mt-auto min-w-0 max-w-full overflow-hidden">
							{/* 1. В приём */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									if (a.patientId) {
										usePatientStore.getState().setSelectedPatientId(a.patientId);
									}
									useAppStore.getState().setCurrentView("visit");
									showToast(`Открыт приём: ${pName} (043/у)`, "info");
								}}
								className="appointment-action-visit h-7 min-h-[28px] max-h-[28px] px-2 py-0 rounded-md border border-[var(--teal)]/40 bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 text-[var(--teal-dark,var(--teal))] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
								title={`Открыть приём и карту 043/у: ${pName}`}
								aria-label={`Открыть приём ${pName}`}
								data-testid={`appointment-action-start-${a.id}`}
							>
								<FileText size={12} className="shrink-0 text-[var(--teal)]" />
								<span className="whitespace-nowrap">В приём</span>
							</button>

							{/* 2. Оплата */}
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									if (a.patientId) {
										usePatientStore.getState().setSelectedPatientId(a.patientId);
									}
									useAppStore.getState().setCurrentView("finance");
									showToast(`Касса 54-ФЗ: расчёт ${pName}`, "info");
								}}
								className="appointment-action-pay h-7 min-h-[28px] max-h-[28px] px-2 py-0 rounded-md border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
								title={`Оплата визита (касса 54-ФЗ): ${pName}`}
								aria-label={`Оплата визита ${pName}`}
								data-testid={`appointment-action-pay-${a.id}`}
							>
								<CreditCard size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span className="appointment-action-label whitespace-nowrap">Оплата</span>
							</button>

							{/* 3. Позвонить */}
							{patObj?.phone ? (
								<a
									href={`tel:${patObj.phone}`}
									onClick={(e) => e.stopPropagation()}
									className="appointment-action-call h-7 min-h-[28px] max-h-[28px] px-2 py-0 rounded-md border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-800 dark:text-sky-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
									title={`Позвонить ${pName}: ${patObj.phone}`}
									aria-label={`Позвонить ${pName}`}
									data-testid={`appointment-action-call-${a.id}`}
								>
									<Phone size={12} className="shrink-0 text-sky-600 dark:text-sky-400" />
									<span className="appointment-action-label whitespace-nowrap">Позвонить</span>
								</a>
							) : (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										showToast(`Телефон не указан для ${pName}`, "warning");
									}}
									className="appointment-action-call h-7 min-h-[28px] max-h-[28px] px-2 py-0 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0"
									title={`Телефон не указан для ${pName}`}
									aria-label={`Телефон не указан для ${pName}`}
									data-testid={`appointment-action-call-${a.id}`}
								>
									<Phone size={12} className="shrink-0 opacity-40" />
									<span className="appointment-action-label whitespace-nowrap">Позвонить</span>
								</button>
							)}

							{/* Overflow Menu Button */}
							<div className="relative ml-auto shrink-0">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onToggleMenu(a.id);
									}}
									className="appointment-action-more h-7 w-7 min-h-[28px] min-w-[28px] p-0 rounded-md border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none shrink-0"
									title="Все действия и статусы визита"
									aria-label="Дополнительные действия визита"
									aria-expanded={isMenuOpen}
								>
									<MoreVertical size={13} />
								</button>

								<GridAppointmentMenu
									appointment={a}
									pName={pName}
									patObj={patObj}
									docObj={docObj}
									effectiveChairs={effectiveChairs}
									doctors={doctors}
									dashboard={dashboard}
									isMenuOpen={isMenuOpen}
									onAppointmentClick={onAppointmentClick}
									onCloseMenu={onCloseMenu}
									onQuickStatusChange={onQuickStatusChange}
									onAdjustDuration={onAdjustDuration}
									onShiftLateness={onShiftLateness}
									onReassignChair={onReassignChair}
									onReassignDoctor={onReassignDoctor}
									onFreeSlotToWaitlist={onFreeSlotToWaitlist}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Collision Alert Pill if overlapping */}
			{collision && (
				<div
					className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center gap-1 shadow-xs animate-pulse"
					data-testid="schedule-grid-collision-badge"
					title={
						collision.sameDoctor && !collision.sameChair
							? "Коллизия: врач записан в два кабинета одновременно!"
							: collision.sameDoctor && collision.sameChair
								? "Коллизия: двойная запись у врача в одном кабинете!"
								: collision.sameChair
									? "Коллизия: два пациента в одном кресле одновременно!"
									: collision.sameAssistant
										? "Коллизия: ассистент занят в другом приеме!"
										: "Коллизия: пациент записан на два приема одновременно!"
					}
				>
					<AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
					<span className="truncate">
						{collision.sameDoctor && !collision.sameChair
							? "Коллизия: врач записан в два кабинета одновременно"
							: collision.sameDoctor && collision.sameChair
								? "Коллизия: врач и кабинет"
								: collision.sameChair
									? "Коллизия: кабинет занят"
									: collision.sameAssistant
										? "Коллизия: ассистент"
										: "Коллизия: пациент"}
					</span>
				</div>
			)}
		</div>
	);
}, areGridAppointmentCardPropsEqual);
