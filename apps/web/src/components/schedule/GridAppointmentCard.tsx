import { type Appointment } from "@dental/shared";
import { AlertTriangle } from "lucide-react";
import React, { memo } from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import {
	formatDoctorShortName,
	getDoctorSpecialtyTheme,
	isAppointmentCito,
	resolvePatientBalance,
	getPatientAllergyAlert,
	getGridAppointmentCardContainerClasses,
	extractTeethList,
	resolveAppointmentLabStatus,
	calculateProportionalCardHeight,
	sanitizeScheduleCardText,
	isRedundantScheduleComment,
	formatRussianAge,
	getNormalizedAppointmentStatusLabel,
} from "./appointmentCardHelpers";
import { GridAppointmentHoverHud } from "./GridAppointmentHoverHud";
import { dragGhostManager, setEmptyDragImage } from "./grid/DecoupledDragGhost";
import type { GridAppointmentCardProps } from "./appointmentCardModules/appointmentCardTypes";
import { areGridAppointmentCardPropsEqual } from "./appointmentCardModules/appointmentCardTypes";
import { AppointmentStatusMarker } from "./appointmentCardModules/AppointmentStatusMarker";
import { AppointmentPatientSummary } from "./appointmentCardModules/AppointmentPatientSummary";
import { AppointmentProcedureBadge } from "./appointmentCardModules/AppointmentProcedureBadge";
import { AppointmentQuickActionsMenu } from "./appointmentCardModules/AppointmentQuickActionsMenu";
import { AppointmentCardWaitlistRecovery } from "./appointmentCardModules/AppointmentCardWaitlistRecovery";

export * from "./appointmentCardHelpers";
export * from "./appointmentCardModules/appointmentCardTypes";

export const GridAppointmentCard = memo(function GridAppointmentCard(props: GridAppointmentCardProps) {
	const {
		densityMode, appointment: a, chair, effectiveChairs, doctors, patientLookupMap,
		staffLookupMap, collisionMap, patientNameFn, getPatientName, dashboard, timezone,
		toDateTimeLocalValue, appointmentLabels, isHovered, isStatusPickerOpen, isMenuOpen,
		isNearBottom, isNearRightEdge, onAppointmentClick, onSelectMobileAppt, onQuickStatusChange,
		onAdjustDuration, onShiftLateness, onReassignChair, onReassignDoctor, onFreeSlotToWaitlist,
		onMouseEnter, onMouseLeave, onKeepHovered, onToggleStatusPicker, onToggleMenu,
		onCloseStatusPicker, onCloseMenu,
	} = props;

	const patObj = a.patientId ? patientLookupMap.get(a.patientId) : undefined;
	const resolveNameFn = getPatientName || patientNameFn || ((_patients: any, _id?: string | null) => "Пациент");
	const rawResolvedName = patObj?.fullName || (a as any).patient?.fullName || (a as any).patientName ||
		(resolveNameFn ? resolveNameFn(dashboard?.patients, a.patientId ?? null) : undefined);
	const pName = rawResolvedName && rawResolvedName.trim() && rawResolvedName.trim() !== "Пациент"
		? rawResolvedName.trim() : (patObj?.fullName || (a.patientId ? `Пациент (${a.patientId.slice(0, 6)})` : "Пациент"));
	const aStart = toDateTimeLocalValue(a.startsAt, timezone).slice(11, 16);
	const aEnd = toDateTimeLocalValue(a.endsAt, timezone).slice(11, 16);

	const docObj = a.doctorUserId ? staffLookupMap.get(a.doctorUserId) : undefined;
	const doctorSpecialty = docObj?.specialty || (Array.isArray(docObj?.specialties) ? docObj?.specialties[0] : undefined) || docObj?.role;
	const docTheme = getDoctorSpecialtyTheme(doctorSpecialty);
	const collision = collisionMap.get(a.id);
	const isCito = isAppointmentCito(a);
	const pBalance = resolvePatientBalance(patObj);
	const pAllergyAlert = getPatientAllergyAlert(patObj, a?.reason);
	const matchedLabOrder = Array.isArray((dashboard as any)?.labOrders)
		? (dashboard as any).labOrders.find(
				(o: any) =>
					(o?.appointmentId && o.appointmentId === a.id) ||
					((a as any)?.labOrderId && o?.id === (a as any).labOrderId) ||
					(a.patientId && o?.patientId === a.patientId),
			)
		: undefined;
	const labStatusInfo = resolveAppointmentLabStatus(a, matchedLabOrder);

	const diffMs = Date.parse(a.endsAt) - Date.parse(a.startsAt);
	const durationMin = (Number.isFinite(diffMs) && diffMs > 0 ? Math.round(diffMs / 60000) : 0) || (a as any).durationMinutes || 30;
	const proportionalHeight = calculateProportionalCardHeight(durationMin);

	let patientAgeLabel: string | null = null;
	if (patObj?.birthDate) {
		const bDate = new Date(patObj.birthDate);
		if (!Number.isNaN(bDate.getTime())) {
			const ageYears = Math.floor((Date.now() - bDate.getTime()) / (365.25 * 24 * 3600 * 1000));
			if (ageYears > 0 && ageYears < 120) patientAgeLabel = formatRussianAge(ageYears);
		}
	}

	const teethList = extractTeethList(a);
	const procedureLabel = sanitizeScheduleCardText(a.reason || (a as any).serviceTitle || "Приём") || "Приём";
	const cleanComment = sanitizeScheduleCardText(a.comment);
	const normalizedStatusLabel = getNormalizedAppointmentStatusLabel(a.status, appointmentLabels);
	const isCommentRedundant = isRedundantScheduleComment(cleanComment, procedureLabel, normalizedStatusLabel);

	const isCancelledOrNoShow = (a.status === "cancelled" || a.status === "no_show") &&
		Boolean(a.startsAt) && new Date(a.startsAt).getTime() > Date.now();

	const showRow2 = densityMode === "expanded" || ((!densityMode || densityMode === "informative") && durationMin >= 30);
	const showComment = Boolean(cleanComment) && !isCommentRedundant && showRow2;
	const showRow3 = showRow2;

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
				const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
				dragGhostManager.startDrag(
					{
						appointmentId: a.id, patientName: pName, procedure: procedureLabel,
						doctorName: formatDoctorShortName(docObj?.fullName || a.doctorUserId),
						timeRange: `${aStart} – ${aEnd}`, durationMinutes: durationMin,
						status: a.status, chairName: chair?.name, isCito,
					},
					{ offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top, startX: e.clientX, startY: e.clientY },
				);
				setEmptyDragImage(e.dataTransfer);
				e.dataTransfer.setData("application/json", JSON.stringify({
					type: "appointment", appointmentId: a.id, doctorUserId: a.doctorUserId, durationMinutes: durationMin,
				}));
				e.dataTransfer.effectAllowed = "move";
			}}
			onDragEnd={() => dragGhostManager.endDrag()}
			style={{
				containIntrinsicSize: "1px 52px",
				minHeight: isCancelledOrNoShow ? "auto" : `${proportionalHeight}px`,
				willChange: "transform",
				...(isHovered || isMenuOpen || isStatusPickerOpen || isCancelledOrNoShow
					? { zIndex: 60, position: "relative", contain: "none", contentVisibility: "visible", overflow: "visible" }
					: { contentVisibility: "auto" }),
			}}
			data-proportional-height={proportionalHeight}
			data-density={densityMode || (durationMin <= 20 ? "micro" : durationMin <= 30 ? "compact" : "expanded")}
			data-hovered={isHovered || isMenuOpen || isStatusPickerOpen ? "true" : undefined}
			className={`appointment-card m-0 mb-0 w-full h-full text-left rounded-xl border border-[var(--line)] text-xs font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col justify-between gap-1 transition-all cursor-grab active:cursor-grabbing relative transform-gpu ${
				isMenuOpen || isStatusPickerOpen || isCancelledOrNoShow ? "overflow-visible z-50" : "overflow-hidden"
			} ${densityMode === "compact" || (!densityMode && durationMin <= 20) ? "p-1.5 px-2" : "p-2"} ${getGridAppointmentCardContainerClasses(
				a.status, { collision: Boolean(collision), isCito, docTheme },
			)}`}
		>
			{isHovered && !isMenuOpen && !isStatusPickerOpen && (
				<GridAppointmentHoverHud
					appointment={a} pName={pName} pBalance={pBalance} patObj={patObj} docObj={docObj}
					docTheme={docTheme} pAllergyAlert={pAllergyAlert} chair={chair} aStart={aStart} aEnd={aEnd}
					appointmentLabels={appointmentLabels} isNearRightEdge={isNearRightEdge} isNearBottom={isNearBottom}
					dashboard={dashboard} staffLookupMap={staffLookupMap} onKeepHovered={onKeepHovered}
					onMouseLeave={onMouseLeave} onQuickStatusChange={onQuickStatusChange} onAdjustDuration={onAdjustDuration}
					onShiftLateness={onShiftLateness} onFreeSlotToWaitlist={onFreeSlotToWaitlist}
				/>
			)}

			<div
				data-testid={`appointment-card-clickable-${a.id}`}
				onClick={() => {
					if (typeof window !== "undefined" && window.innerWidth < 768) {
						onSelectMobileAppt(a);
					} else {
						if (a.patientId) usePatientStore.getState().setSelectedPatientId(a.patientId);
						onAppointmentClick(a);
					}
				}}
				onDoubleClick={(e) => {
					e.stopPropagation();
					if (a.patientId) {
						usePatientStore.getState().setSelectedPatientId(a.patientId);
						if (typeof window !== "undefined") window.location.hash = "#visit";
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
						if (a.patientId) usePatientStore.getState().setSelectedPatientId(a.patientId);
						onAppointmentClick(a);
					}
				}}
			>
				<div
					className="appointment-card-grid-unified w-full h-full min-w-0 flex-1 flex flex-col justify-between gap-1 select-none"
					data-density={densityMode || (durationMin <= 20 ? "micro" : durationMin <= 30 ? "compact" : "expanded")}
				>
					{/* ROW 1: HEADER (Time + Patient FIO + Status Badge + Actions Menu) */}
					<div
						className="appointment-card-row-header flex items-center justify-between gap-1.5 w-full min-w-0"
						data-testid={densityMode === "compact" || (!densityMode && durationMin <= 20)
							? `appointment-card-grid-micro-${a.id}` : `appointment-card-header-${a.id}`}
					>
						<AppointmentPatientSummary
							appointment={a} pName={pName} aStart={aStart} aEnd={aEnd}
							isCito={isCito} durationMin={durationMin} patientAgeLabel={patientAgeLabel} patObj={patObj}
						/>
						<AppointmentStatusMarker
							appointment={a} appointmentLabels={appointmentLabels} isStatusPickerOpen={isStatusPickerOpen}
							pName={pName} onToggleStatusPicker={onToggleStatusPicker} onCloseStatusPicker={onCloseStatusPicker}
							onQuickStatusChange={onQuickStatusChange}
						/>
						<AppointmentQuickActionsMenu
							variant="header" appointment={a} pName={pName} patObj={patObj} docObj={docObj}
							effectiveChairs={effectiveChairs} doctors={doctors} dashboard={dashboard}
							isHovered={isHovered} isMenuOpen={isMenuOpen} onAppointmentClick={onAppointmentClick}
							onToggleMenu={onToggleMenu} onCloseMenu={onCloseMenu} onQuickStatusChange={onQuickStatusChange}
							onAdjustDuration={onAdjustDuration} onShiftLateness={onShiftLateness} onReassignChair={onReassignChair}
							onReassignDoctor={onReassignDoctor} onFreeSlotToWaitlist={onFreeSlotToWaitlist}
						/>
					</div>

					{isCancelledOrNoShow ? (
						<AppointmentCardWaitlistRecovery
							appointment={a}
							onOpenSmartRecovery={() => onFreeSlotToWaitlist(a)}
						/>
					) : (
						<>
							{/* ROW 2: PROCEDURE & CLINICAL BADGES */}
							{showRow2 && (
								<AppointmentProcedureBadge
									appointment={a} procedureLabel={procedureLabel} teethList={teethList}
									docTheme={docTheme} durationMin={durationMin} labStatusInfo={labStatusInfo}
								/>
							)}

							{/* Clinical Comment if present */}
							{showComment && cleanComment && (
								<div className="text-[11px] text-[var(--muted)] font-normal line-clamp-1 min-w-0 opacity-80" title={cleanComment}>
									<span className="truncate">{cleanComment}</span>
								</div>
							)}

							{/* ROW 3: DOCTOR, PHONE & SMART ACTION */}
							{showRow3 && (
								<AppointmentQuickActionsMenu
									variant="footer" appointment={a} pName={pName} patObj={patObj} docObj={docObj}
									effectiveChairs={effectiveChairs} doctors={doctors} dashboard={dashboard}
									isHovered={isHovered} isMenuOpen={isMenuOpen} onAppointmentClick={onAppointmentClick}
									onToggleMenu={onToggleMenu} onCloseMenu={onCloseMenu} onQuickStatusChange={onQuickStatusChange}
									onAdjustDuration={onAdjustDuration} onShiftLateness={onShiftLateness} onReassignChair={onReassignChair}
									onReassignDoctor={onReassignDoctor} onFreeSlotToWaitlist={onFreeSlotToWaitlist}
								/>
							)}
						</>
					)}
				</div>
			</div>

			{/* Collision Alert Pill if overlapping */}
			{collision && (
				<div
					className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-900 dark:text-amber-200 text-xs font-extrabold flex items-center gap-1 shadow-xs animate-pulse"
					data-testid="schedule-grid-collision-badge"
					title={collision.sameDoctor && !collision.sameChair ? "Коллизия: врач записан в два кабинета одновременно" : collision.sameDoctor && collision.sameChair ? "Коллизия: двойная запись у врача в одном кабинете" : collision.sameChair ? "Коллизия: два пациента в одном кресле одновременно" : collision.sameAssistant ? "Коллизия: ассистент занят в другом приеме" : "Коллизия: пациент записан на два приема одновременно"}
				>
					<AlertTriangle size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
					<span className="truncate">
						{collision.sameDoctor && !collision.sameChair ? "Коллизия: врач записан в два кабинета одновременно" : collision.sameDoctor && collision.sameChair ? "Коллизия: врач и кабинет" : collision.sameChair ? "Коллизия: кабинет занят" : collision.sameAssistant ? "Коллизия: ассистент" : "Коллизия: пациент"}
					</span>
				</div>
			)}
		</div>
	);
}, areGridAppointmentCardPropsEqual);

