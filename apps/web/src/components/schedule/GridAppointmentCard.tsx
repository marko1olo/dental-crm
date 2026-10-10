import { type Appointment, type Dashboard, type DentalSpecialty } from "@dental/shared";
import {
	AlertTriangle, CalendarCheck, Check, CheckCircle2, Clock, CreditCard,
	FileText, MoreVertical, Phone, PhoneCall, Stethoscope, User, UserCheck, UserX, Zap,
} from "lucide-react";
import React, { memo } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { specialtyLabels } from "../../workspaceUiLabels";
import { showToast } from "../GlobalToast";
import { playIntercomChime } from "../../lib/intercomSound";
import {
	formatPatientDisplayFio,
	formatDoctorShortName,
	isAppointmentInChair,
	getNormalizedAppointmentStatusLabel,
	getAppointmentStatusBadgeClasses,
	type DoctorSpecialtyTheme,
	getDoctorSpecialtyTheme,
	isAppointmentCito,
	resolvePatientBalance,
	getPatientAllergyAlert,
	getGridAppointmentCardContainerClasses,
	extractTeethList,
	resolveAppointmentClinicalBadges,
	resolveAppointmentLabStatus,
	calculateProportionalCardHeight,
	getAppointmentElapsedMinutes,
	sanitizeScheduleCardText,
	isRedundantScheduleComment,
	formatRussianAge,
	type ScheduleDensityMode,
} from "./appointmentCardHelpers";
import { GridAppointmentHoverHud } from "./GridAppointmentHoverHud";
import { GridAppointmentMenu } from "./GridAppointmentMenu";
import { GridAppointmentStatusPopover } from "./GridAppointmentStatusPopover";
import { DentalToothIcon } from "./DentalToothIcon";
import { GridAppointmentQuickActions } from "./GridAppointmentQuickActions";

export * from "./appointmentCardHelpers";

export interface GridAppointmentCardProps {
	densityMode?: ScheduleDensityMode;
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
	if (prev.densityMode !== next.densityMode) return false;
	return true;
}

export const GridAppointmentCard = memo(function GridAppointmentCard(props: GridAppointmentCardProps) {
	const {
		densityMode,
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

	const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
	const resolveNameFn = getPatientName || patientNameFn || ((_patients: any, _id?: string | null) => "Пациент");
	const rawResolvedName =
		patObj?.fullName ||
		(a as any).patient?.fullName ||
		(a as any).patientName ||
		(resolveNameFn ? resolveNameFn(dashboard?.patients, a.patientId ?? null) : undefined);
	const pName =
		rawResolvedName && rawResolvedName.trim() && rawResolvedName.trim() !== "Пациент"
			? rawResolvedName.trim()
			: (patObj?.fullName || (a.patientId ? `Пациент (${a.patientId.slice(0, 6)})` : "Пациент"));
	const aStart = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
	const aEnd = toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16);

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
	const labStatusInfo = resolveAppointmentLabStatus(a);
	const clinicalBadges = resolveAppointmentClinicalBadges(a, patObj, pBalance, pAllergyAlert, labStatusInfo);

	const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
	const durationMin =
		(Number.isFinite(diffMs) && diffMs > 0 ? Math.round(diffMs / 60000) : 0) ||
		(a as any).durationMinutes ||
		30;
	const durationLabel =
		durationMin >= 60
			? `${(durationMin / 60).toFixed(durationMin % 60 === 0 ? 0 : 1)} ч`
			: `${durationMin} мин`;

	const proportionalHeight = calculateProportionalCardHeight(durationMin);

	let patientAgeLabel: string | null = null;
	if (patObj?.birthDate) {
		const bDate = new Date(patObj.birthDate);
		if (!Number.isNaN(bDate.getTime())) {
			const ageYears = Math.floor(
				(Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000),
			);
			if (ageYears > 0 && ageYears < 120) {
				patientAgeLabel = formatRussianAge(ageYears);
			}
		}
	}

	const teethList = extractTeethList(a);
	const rawProcedure = a.reason || (a as any).serviceTitle || "Приём";
	const procedureLabel = sanitizeScheduleCardText(rawProcedure) || "Приём";
	const cleanComment = sanitizeScheduleCardText(a.comment);
	const normalizedStatusLabel = getNormalizedAppointmentStatusLabel(a.status, appointmentLabels);
	const isCommentRedundant = isRedundantScheduleComment(cleanComment, procedureLabel, normalizedStatusLabel);

	const showRow2 =
		densityMode === "expanded" ||
		((!densityMode || densityMode === "informative") && durationMin >= 30);

	const showComment =
		Boolean(cleanComment) &&
		!isCommentRedundant &&
		(densityMode === "expanded" ||
			((!densityMode || densityMode === "informative") && durationMin >= 30));

	const showRow3 =
		densityMode === "expanded" ||
		((!densityMode || densityMode === "informative") && durationMin >= 30);

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
			style={
				isHovered
					? {
							zIndex: 50,
							position: "relative",
							contain: "none",
							contentVisibility: "auto",
							containIntrinsicSize: "1px 52px",
							minHeight: `${proportionalHeight}px`,
					  }
					: {
							contentVisibility: "auto",
							containIntrinsicSize: "1px 52px",
							minHeight: `${proportionalHeight}px`,
					  }
			}
			data-proportional-height={proportionalHeight}
			data-density={
				densityMode ||
				(durationMin <= 20 ? "micro" : durationMin <= 30 ? "compact" : "expanded")
			}
			data-hovered={isHovered ? "true" : undefined}
			className={`appointment-card m-0 mb-0 w-full h-full text-left rounded-xl border border-[var(--line)] text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col justify-between gap-1 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden ${
				densityMode === "compact" || (!densityMode && durationMin <= 20)
					? "p-1.5 px-2"
					: "p-2"
			} ${getGridAppointmentCardContainerClasses(
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
					onFreeSlotToWaitlist={onFreeSlotToWaitlist}
				/>
			)}

			{/* Clickable Area: Unified Monolithic Progressive-Height Architecture (Studio Clinical HIG) */}
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
				onDoubleClick={(e) => {
					e.stopPropagation();
					if (a.patientId) {
						usePatientStore.getState().setSelectedPatientId(a.patientId);
						if (typeof window !== "undefined") {
							window.location.hash = "#visit";
						}
						useAppStore.getState().setCurrentView("visit");
						showToast(`Открыта карта приёма: ${pName}`, "info");
					}
				}}
				className="cursor-pointer w-full h-full min-w-0 flex-1 flex flex-col justify-between gap-1"
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
				{/* Progressive Vertical Architecture (Studio Clinical HIG) */}
				<div
					className="appointment-card-grid-unified w-full h-full min-w-0 flex-1 flex flex-col justify-between gap-1 select-none"
					data-density={
						densityMode ||
						(durationMin <= 20 ? "micro" : durationMin <= 30 ? "compact" : "expanded")
					}
				>
					{/* ROW 1: HEADER (Always present on all cards: Time + Patient FIO on left, Status button + [⋮] on right) */}
					<div
						className="appointment-card-row-header flex items-center justify-between gap-1.5 w-full min-w-0"
						data-testid={
							densityMode === "compact" || (!densityMode && durationMin <= 20)
								? `appointment-card-grid-micro-${a.id}`
								: `appointment-card-header-${a.id}`
						}
					>
						{/* Left: Time + CITO badge + Patient FIO */}
						<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
							<span className="font-bold text-xs text-[var(--ink)] font-mono shrink-0" title={`Время приёма: ${aStart}–${aEnd}`}>
								{aStart}
							</span>
							{isCito && (
								<span
									className="text-[9px] px-1 py-0.2 rounded bg-rose-600 text-white font-black shrink-0 animate-pulse flex items-center gap-0.5"
									title="Срочный приём (острая боль)"
									data-testid="appointment-cito-overbooking-badge"
								>
									<Zap size={9} className="fill-white" />
									<span>СРОЧНО</span>
								</span>
							)}
							<div
								className="flex items-center gap-1 min-w-0 flex-1 truncate hover:underline cursor-pointer tracking-tight"
								title={`Пациент: ${pName}${patientAgeLabel ? ` (${patientAgeLabel})` : ""}. Нажмите для перехода в карточку`}
								onClick={(e) => {
									e.stopPropagation();
									if (a.patientId) {
										usePatientStore.getState().setSelectedPatientId(a.patientId);
										useAppStore.getState().setCurrentView("patients");
										showToast(`Карта пациента: ${pName}`, "info");
									}
								}}
							>
								<span className="font-bold text-[13px] text-[var(--ink)] truncate min-w-0">
									{formatPatientDisplayFio(pName)}
								</span>
								{patientAgeLabel && durationMin >= 60 && (
									<span className="text-[11px] text-[var(--muted)] font-normal shrink-0 whitespace-nowrap">
										· {patientAgeLabel}
									</span>
								)}
							</div>
							{/* Live Status Elapsed Badge */}
							{(a.status === "arrived" || (a.status as string) === "in_clinic" || (a.status as string) === "waiting") && (
								<span
									className={
										getAppointmentElapsedMinutes(a) <= 180
											? "text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 shrink-0 hidden sm:inline-flex items-center gap-0.5"
											: "sr-only"
									}
									title="Пациент в холле: время ожидания с момента записи"
									data-testid={`appointment-live-timer-arrived-${a.id}`}
								>
									<Clock size={10} className="shrink-0" />
									<span>{getAppointmentElapsedMinutes(a)}м</span>
								</span>
							)}
							{isAppointmentInChair(a.status) && (
								<span
									className={
										getAppointmentElapsedMinutes(a) <= 180
											? "text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 shrink-0 hidden sm:inline-flex items-center gap-1"
											: "sr-only"
									}
									title="Пациент у кресла: время текущего приёма"
									data-testid={`appointment-live-timer-chair-${a.id}`}
								>
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
									<span>{getAppointmentElapsedMinutes(a)}м</span>
								</span>
							)}
						</div>

						{/* Right: DentalPRO expo26 Realtime Schedule Bar + 1-Click Status Badge + Actions Menu Trigger */}
						<div className="flex items-center gap-1 shrink-0">
							{/* DentalPRO 1-Click Stage Transitions */}
							{onQuickStatusChange && (
								<GridAppointmentQuickActions
									appointment={a}
									pName={pName}
									patObj={patObj}
									isHovered={isHovered}
									onQuickStatusChange={onQuickStatusChange}
								/>
							)}

							<div className="relative shrink-0">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										if (onQuickStatusChange) {
											onToggleStatusPicker(a.id);
										}
									}}
									className={`h-[22px] min-h-[22px] text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 transition-all cursor-pointer hover:opacity-90 active:scale-95 ${getAppointmentStatusBadgeClasses(a.status)}`}
									title={`Статус: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}. Нажмите для смены`}
									aria-label={`Сменить статус визита, текущий: ${getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}`}
									data-testid={`appointment-card-status-badge-${a.id}`}
								>
									{isAppointmentInChair(a.status) && (
										<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
									)}
									{String(a.status).toLowerCase() === "completed" && (
										<Check size={10} className="shrink-0 text-current stroke-[2.5]" />
									)}
									<span className="whitespace-nowrap shrink-0">
										{getNormalizedAppointmentStatusLabel(a.status, appointmentLabels)}
									</span>
								</button>

								{/* Status Picker Popover */}
								{onQuickStatusChange && (
									<GridAppointmentStatusPopover
										appointmentId={a.id}
										currentStatus={a.status}
										patientId={a.patientId}
										patientName={pName}
										isOpen={isStatusPickerOpen}
										onClose={onCloseStatusPicker}
										onQuickStatusChange={onQuickStatusChange}
									/>
								)}
							</div>

							{/* Actions menu trigger */}
							<div className="relative shrink-0">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onToggleMenu(a.id);
									}}
									className="appointment-action-more h-[22px] w-[22px] min-h-[22px] min-w-[22px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer select-none shrink-0"
									title="Все действия визита"
									aria-label="Дополнительные действия визита"
									aria-expanded={isMenuOpen}
								>
									<MoreVertical size={11} />
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

					{/* ROW 2: PROCEDURE & TOOTH & SPECIALTY & ZTL */}
					{showRow2 && (
						<div
							className="appointment-card-row-procedure flex items-center gap-1.5 flex-wrap w-full min-w-0 text-xs text-[var(--ink)]"
							data-testid={`appointment-card-procedure-row-${a.id}`}
						>
							<div className="flex items-center gap-1.5 min-w-0 flex-1">
								<DentalToothIcon size={12} className="shrink-0 text-[var(--teal)] opacity-85" />
								<span
									className={`font-semibold text-xs text-[var(--ink)] ${
										durationMin >= 45 ? "line-clamp-2 leading-snug break-words" : "truncate"
									} min-w-0 flex-1`}
									title={procedureLabel}
								>
									{procedureLabel}
								</span>
							</div>

							<div className="flex items-center gap-1 shrink-0 flex-wrap">
								{teethList.map((tooth) => (
									<span
										key={tooth}
										className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[var(--teal)]/10 text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 shrink-0"
										title={`Зуб по формуле FDI: ${tooth}`}
									>
										Зуб {tooth}
									</span>
								))}

								{docTheme && (
									<span
										className={`text-[9px] px-1 py-0.2 rounded border shrink-0 font-bold ${docTheme.badgeClass}`}
										title={`Специализация врача: ${docTheme.label}`}
										data-testid={`card-specialty-badge-${a.id}`}
									>
										{docTheme.label}
									</span>
								)}

								{Boolean((a as any).treatmentPlanId || (a as any).planNumber) && (
									<span
										className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-bold shrink-0 flex items-center gap-0.5"
										title={`План лечения: ${(a as any).planNumber || (a as any).treatmentPlanId}`}
										data-testid={`appointment-treatment-plan-badge-${a.id}`}
									>
										<FileText size={9} className="shrink-0" />
										<span>План</span>
									</span>
								)}

								{/* STRICTLY ONE ZTL badge across the entire card */}
								{labStatusInfo && (
									<span
										className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 transition-transform hover:scale-105 cursor-pointer ${labStatusInfo.badgeClass}`}
										title={`Статус наряда ЗТЛ: ${labStatusInfo.labelRu}${labStatusInfo.workTypeRu ? ` (${labStatusInfo.workTypeRu})` : ""}${labStatusInfo.colorVita ? ` VITA ${labStatusInfo.colorVita}` : ""}. Нажмите для перехода в ЗТЛ`}
										onClick={(e) => {
											e.stopPropagation();
											useAppStore.getState().setCurrentView("lab");
											if (typeof window !== "undefined") {
												window.location.hash = "#lab";
											}
											showToast(`ЗТЛ: ${labStatusInfo.labelRu} (${labStatusInfo.orderNumber || "Наряд"})`, "info");
										}}
										data-testid={`appointment-lab-badge-${a.id}`}
									>
										{labStatusInfo.isOverdue ? (
											<AlertTriangle size={10} className="shrink-0" />
										) : labStatusInfo.state === "ready_in_clinic" ? (
											<Check size={10} className="shrink-0 stroke-[3]" />
										) : (
											<Clock size={10} className="shrink-0" />
										)}
										<span>
											{labStatusInfo.isOverdue
												? `ЗТЛ: +${labStatusInfo.daysOverdue}д!`
												: labStatusInfo.shortLabelRu}
										</span>
									</span>
								)}
							</div>
						</div>
					)}

					{/* Clinical Comment if present (Clean medical secondary line) */}
					{showComment && !isCommentRedundant && cleanComment && (
						<div
							className="text-[11px] text-[var(--muted)] font-normal line-clamp-1 min-w-0 opacity-80"
							title={cleanComment}
						>
							<span className="truncate">{cleanComment}</span>
						</div>
					)}

					{/* ROW 3: DOCTOR, PHONE & SMART ACTION [В приём →] / [К оплате 💳] */}
					{showRow3 && (
						<div
							className="appointment-card-row-footer flex items-center justify-between gap-1.5 w-full min-w-0 pt-1 border-t border-[var(--line)]/50 mt-auto"
							data-testid={`appointment-card-footer-${a.id}`}
						>
							{/* Left: Doctor name & Phone */}
							<div className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] font-medium min-w-0 flex-1 overflow-hidden">
								{docObj && (
									<span className="truncate flex items-center gap-1 text-[var(--ink)] opacity-90 shrink-0 max-w-[150px]" title={`Врач: ${docObj.fullName}`}>
										<UserCheck size={11} className="shrink-0 text-[var(--teal)] opacity-70" /><span className="truncate whitespace-nowrap">{formatDoctorShortName(docObj.fullName)}</span>
									</span>
								)}
								{patObj?.phone ? (
									<span className="hidden 2xl:inline-flex items-center gap-1 text-[var(--muted)] shrink-0 whitespace-nowrap" title={`Телефон: ${patObj.phone}`}>
										<Phone size={10} className="shrink-0 opacity-70" /><span className="whitespace-nowrap font-mono text-[10.5px]">{patObj.phone}</span>
									</span>
								) : null}
							</div>

							{/* Right: Smart Contextual Action Button [В приём →] vs [К оплате] */}
							{a.status === "completed" ? (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										if (patObj?.id || a.patientId) usePatientStore.getState().setSelectedPatientId(patObj?.id || a.patientId!);
										useAppStore.getState().setCurrentView("finance");
										if (typeof window !== "undefined") window.location.hash = "#finance";
										showToast(`Касса: оплата визита ${pName}`, "info");
									}}
									className="appointment-action-pay h-[24px] min-h-[24px] px-2.5 py-0.5 rounded-lg border border-violet-400/50 bg-violet-500/15 hover:bg-violet-500/25 text-violet-950 dark:text-violet-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 shadow-2xs active:scale-95"
									title={`К оплате на кассе: ${pName}`}
									aria-label={`К оплате на кассе ${pName}`}
									data-testid={`appointment-action-pay-${a.id}`}
								>
									<CreditCard size={11} className="shrink-0 text-violet-600 dark:text-violet-400" />
									<span className="appointment-action-label whitespace-nowrap">К оплате</span>
								</button>
							) : (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										if (a.patientId) usePatientStore.getState().setSelectedPatientId(a.patientId);
										useAppStore.getState().setCurrentView("visit");
										if (typeof window !== "undefined") window.location.hash = "#visit";
										showToast(`Открыт приём: ${pName}`, "info");
									}}
									className="appointment-action-visit h-[24px] min-h-[24px] px-2.5 py-0.5 rounded-lg border border-[var(--teal)]/40 bg-[var(--teal)]/15 hover:bg-[var(--teal)]/25 text-[var(--teal-dark,var(--teal))] dark:text-teal-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer select-none whitespace-nowrap shrink-0 shadow-2xs active:scale-95"
									title={`Открыть приём: ${pName}`}
									aria-label={`Открыть приём ${pName}`}
									data-testid={`appointment-action-start-${a.id}`}
								>
									<FileText size={11} className="shrink-0 text-[var(--teal)]" />
									<span className="appointment-action-label whitespace-nowrap">В приём →</span>
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Collision Alert Pill if overlapping */}
			{collision && (
				<div
					className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center gap-1 shadow-xs animate-pulse"
					data-testid="schedule-grid-collision-badge"
					title={
						collision.sameDoctor && !collision.sameChair
							? "Коллизия: врач записан в два кабинета одновременно"
							: collision.sameDoctor && collision.sameChair
								? "Коллизия: двойная запись у врача в одном кабинете"
								: collision.sameChair
									? "Коллизия: два пациента в одном кресле одновременно"
									: collision.sameAssistant
										? "Коллизия: ассистент занят в другом приеме"
										: "Коллизия: пациент записан на два приема одновременно"
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
