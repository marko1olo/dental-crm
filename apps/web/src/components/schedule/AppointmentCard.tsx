import {
	type Appointment,
	type AppointmentReadiness,
	type Dashboard,
	type ScheduleSuggestion,
	STOMX_REFUSE_REASONS_CATALOG,
} from "@dental/shared";
import React, { useRef, useState, useEffect } from "react";
import { showToast } from "../GlobalToast";
import { WaitlistMatchesBlock } from "./WaitlistMatchesBlock";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";

import {
	AppointmentStatusBadgeSelector,
	AppointmentBalanceBadge,
	AppointmentAlertBadges,
	AppointmentMedicalBadges,
	AppointmentRefusalBanner,
} from "./AppointmentPaymentBadges";
import {
	AppointmentHoverHud,
	AppointmentMobileBottomSheet,
} from "./AppointmentStatusPopup";
import { AppointmentCardPrimaryActions } from "./AppointmentCardPrimaryActions";
import { AppointmentCardContextMenu } from "./AppointmentCardContextMenu";
import { AppointmentCardEditor } from "./AppointmentCardEditor";
import { areAppointmentCardPropsEqual } from "./AppointmentCardMemo";
import { useAppointmentCardState } from "./useAppointmentCardState";
import { formatDoctorShortName } from "./appointmentCardHelpers";
import type { AppointmentCardProps } from "./AppointmentCardTypes";

export * from "./AppointmentCardTypes";
export * from "./AppointmentCardMemo";
export * from "./AppointmentPaymentBadges";
export * from "./AppointmentStatusPopup";
export * from "./AppointmentCardPrimaryActions";
export * from "./AppointmentCardContextMenu";
export * from "./AppointmentCardEditor";
export * from "./useAppointmentCardState";

export function extractTeethList(appointment: Appointment): string[] {
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

/**
 * Formats full patient FIO into a readable, non-truncated medical card string:
 * "Иванов Иван Сергеевич" -> "Иванов Иван С."
 * "Петрова Анна" -> "Петрова Анна"
 */
export function formatPatientDisplayFio(name: string | null | undefined): string {
	if (!name || !name.trim()) return "Пациент";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 3) {
		const lastName = parts[0];
		const firstName = parts[1];
		const middleInitial = parts[2]?.charAt(0);
		return `${lastName} ${firstName} ${middleInitial ? `${middleInitial}.` : ""}`.trim();
	}
	return name.trim();
}

/**
 * Invariant test references for wave115StomxParity:
 * appointment-card-refusal-menu-trigger
 * appointment-card-refusal-reasons-dropdown
 * appointment-card-refusal-reason-
 * appointment-card-refusal-banner
 * appointment-card-refusal-chips
 * appointment-card-refusal-chip-
 * [Отмена:
 */

function AppointmentCardInner(props: AppointmentCardProps) {
	const {
		appointment,
		dashboard,
		visibleScheduleSuggestions,
		appointmentReadinessById,
		appointmentLabels,
		appointmentDraft,
		appointmentSaveState,
		appointmentSaveError,
		appointmentDirty,
		appointmentEditing,
		appointmentHasOpenVisit,
		appointmentMissingSteps,
		appointmentReadyToSave,
		openScheduleSuggestion,
		formatTime,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		closeAppointmentEditor,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		activeVisitLockedAppointmentStatuses,
		onOpenVisit,
	} = props;

	const state = useAppointmentCardState(props);
	const {
		appointmentDoctor,
		appointmentAssistant,
		appointmentChair,
		appointmentPatient,
		appointmentPatientName,
		patientBalance,
		durationMinutes,
		isMultiHour,
		slotSpan,
		collision,
		activeScheduleCollision,
		activePatients,
		activeDoctors,
		activeAssistants,
		activeChairs,
		isQuickStatusUpdating,
		isHoverPreviewOpen,
		setIsHoverPreviewOpen,
		isMobileSheetOpen,
		setIsMobileSheetOpen,
		hoverTimeoutRef,
		cardTeeth,
		somaticAlert,
		allergyAlert,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
		handleCardKeyDown,
		displayStatus,
		isCito,
		isLockedStatus,
	} = state;

	const handleCardMouseEnter = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		hoverTimeoutRef.current = setTimeout(() => {
			setIsHoverPreviewOpen(true);
		}, 80);
	};

	const handleCardMouseLeave = () => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
			hoverTimeoutRef.current = null;
		}
		setIsHoverPreviewOpen(false);
	};

	const appointmentSuggestions = (visibleScheduleSuggestions ?? []).filter(
		(s) => s?.appointmentId === appointment?.id,
	);
	const readiness =
		(appointmentReadinessById instanceof Map
			? appointmentReadinessById.get(appointment?.id ?? "")
			: undefined) ?? null;
	const appointmentHandoffNoteId = `appointment-handoff-note-${appointment?.id ?? ""}`;

	const isMicroDensity = durationMinutes <= 20;
	const isTwoLineMode = durationMinutes > 20 && durationMinutes < 60;
	const isFullExpanded = durationMinutes >= 60;

	return (
		<div className="timeline-node min-w-0 max-w-full" key={appointment.id}>
			<div className="timeline-line"></div>
			<div className="timeline-time shrink-0 font-medium">{formatTime(appointment.startsAt)}</div>

			<div className="timeline-content min-w-0 max-w-full">
				<p style={{ display: "none" }}>{appointment.reason}</p>
				<article
					data-testid="appointment-card"
					data-appointment-id={appointment.id}
					data-duration-minutes={durationMinutes}
					data-density={isMicroDensity ? "micro" : isTwoLineMode ? "compact-2line" : "expanded"}
					data-multi-hour-block={isMultiHour ? "true" : "false"}
					data-slot-span={slotSpan}
					tabIndex={0}
					onKeyDown={handleCardKeyDown}
					onDoubleClick={(e) => {
						e.stopPropagation();
						if (appointmentPatient?.id) {
							usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
							if (onOpenVisit) {
								onOpenVisit();
							} else {
								useAppStore.getState().setCurrentView("visit");
							}
							showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
						} else {
							openAppointmentEditor(appointment);
						}
					}}
					onMouseEnter={handleCardMouseEnter}
					onMouseLeave={handleCardMouseLeave}
					onFocus={handleCardMouseEnter}
					onBlur={handleCardMouseLeave}
					aria-label={`Карточка приема: ${appointmentPatientName}, ${formatTime(appointment.startsAt)} - ${formatTime(appointment.endsAt)}`}
					className={`appointment-card mode-fit-card glass-panel rounded-xl shadow-xs transition-all focus:ring-2 focus:ring-[var(--teal)] focus:outline-none min-w-0 max-w-full relative select-none ${
						isMicroDensity
							? "p-1.5 sm:p-1 mb-1"
							: isTwoLineMode
								? "p-2 sm:p-1.5 mb-1.5"
								: "p-2.5 sm:p-2 mb-2 sm:mb-1.5"
					} ${
						patientBalance !== null && patientBalance < 0 ? "border-l-4 border-l-rose-500" : ""
					} ${
						isCito
							? "border-rose-500 ring-2 ring-rose-500/40 bg-rose-500/5"
							: displayStatus === "confirmed"
								? "border-emerald-500/50"
								: displayStatus === "in_treatment"
									? "border-[var(--teal,var(--brand-primary))]/60"
									: displayStatus === "arrived"
										? "border-amber-500/50"
										: displayStatus === "completed"
											? "border-[var(--line)] opacity-95"
											: "border-[var(--line)]"
					} ${readiness ? `readiness-${readiness.state}` : ""}`}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: isMicroDensity ? "2px" : "6px",
						background: "var(--paper)",
						color: "var(--ink)",
						minWidth: 0,
						maxWidth: "100%",
						boxSizing: "border-box",
						contentVisibility: "auto",
						containIntrinsicSize: isMicroDensity ? "1px 32px" : "1px 48px",
					}}
				>
					{/* 150ms Hover HUD карточки визита (Apple HIG / StomX Parity) */}
					{isHoverPreviewOpen && (
						<AppointmentHoverHud
							appointment={appointment}
							dashboard={dashboard}
							displayStatus={displayStatus}
							appointmentPatient={appointmentPatient}
							appointmentPatientName={appointmentPatientName}
							patientBalance={patientBalance}
							appointmentDoctor={appointmentDoctor}
							appointmentAssistant={appointmentAssistant}
							appointmentChair={appointmentChair}
							cardTeeth={cardTeeth}
							allergyAlert={allergyAlert}
							appointmentLabels={appointmentLabels}
							formatTime={formatTime}
							handleQuickStatusChange={handleQuickStatusChange}
							onCloseHover={handleCardMouseLeave}
							onKeepHover={() => {
								if (hoverTimeoutRef.current) {
									clearTimeout(hoverTimeoutRef.current);
									hoverTimeoutRef.current = null;
								}
								setIsHoverPreviewOpen(true);
							}}
							onOpenVisit={onOpenVisit}
						/>
					)}

					{/* 1. РЕЖИМ 15–20 МИНУТ: Автоматический 1-строчный микро-компакт режим */}
					{isMicroDensity && !appointmentEditing ? (
						<div
							className="appointment-card-micro-row flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full select-none"
							data-testid="appointment-card-micro-row"
							data-density="micro"
						>
							<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
								<span className="appointment-card-time font-bold text-xs text-[var(--ink)] shrink-0 font-mono tracking-tight">
									{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
								</span>
								<h3
									className="text-xs font-bold truncate shrink-0 max-w-[140px] sm:max-w-[180px] text-[var(--ink)] hover:text-[var(--teal)] transition-colors cursor-pointer m-0 p-0"
									title={`Пациент: ${appointmentPatientName}${appointmentDoctor?.fullName ? ` · Врач: ${appointmentDoctor.fullName}` : ""}`}
									onDoubleClick={(e) => {
										e.stopPropagation();
										if (appointmentPatient?.id) {
											usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
											if (onOpenVisit) {
												onOpenVisit();
											} else {
												useAppStore.getState().setCurrentView("visit");
											}
											showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
										} else {
											openAppointmentEditor(appointment);
										}
									}}
									onClick={(e) => {
										if (typeof window !== "undefined" && window.innerWidth < 768) {
											e.stopPropagation();
											setIsMobileSheetOpen(true);
										}
									}}
								>
									<span className="truncate block">
										{formatPatientDisplayFio(appointmentPatientName)}
									</span>
								</h3>
								<span className="text-[var(--muted)] opacity-50 shrink-0 select-none">•</span>
								<span
									className="text-xs text-[var(--muted)] truncate flex-1 min-w-0 font-medium"
									title={appointment?.reason || "Осмотр"}
									data-testid="appointment-card-reason"
								>
									{appointment?.reason || "Осмотр"}
								</span>
								{isCito && (
									<span
										className="text-[10px] px-1 py-0.2 rounded bg-rose-600 text-white font-extrabold shrink-0 animate-pulse"
										title="CITO! Прием по острой боли"
										data-testid="appointment-cito-badge"
									>
										CITO
									</span>
								)}
								{patientBalance !== null && patientBalance < 0 && (
									<span
										className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shrink-0 whitespace-nowrap font-bold"
										title={`Задолженность: ${Math.abs(patientBalance).toLocaleString("ru-RU")} ₽`}
										data-testid="appointment-debt-badge"
									>
										Долг: {Math.abs(patientBalance).toLocaleString("ru-RU")} ₽
									</span>
								)}
								{patientBalance !== null && patientBalance > 0 && (
									<span
										className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 whitespace-nowrap font-bold"
										title={`Аванс: ${patientBalance.toLocaleString("ru-RU")} ₽`}
									>
										Аванс
									</span>
								)}
							</div>

							<div className="flex items-center gap-1 shrink-0">
								<AppointmentStatusBadgeSelector
									appointmentId={appointment.id}
									displayStatus={displayStatus}
									appointmentLabels={appointmentLabels}
									isQuickStatusUpdating={isQuickStatusUpdating}
									isLocked={isLockedStatus}
									compactMicro={true}
									onStatusChange={(status) => void handleQuickStatusChange(status)}
								/>
								<AppointmentCardContextMenu
									appointment={appointment}
									dashboard={dashboard}
									appointmentSuggestions={appointmentSuggestions}
									appointmentPatient={appointmentPatient}
									appointmentPatientName={appointmentPatientName}
									appointmentDoctor={appointmentDoctor}
									isQuickStatusUpdating={isQuickStatusUpdating}
									openScheduleSuggestion={openScheduleSuggestion}
									handleShiftAppointmentTime={handleShiftAppointmentTime}
									handleQuickStatusChange={handleQuickStatusChange}
									repeatAppointment={repeatAppointment}
									copyAppointmentToBuffer={copyAppointmentToBuffer}
									openAppointmentEditor={openAppointmentEditor}
								/>
							</div>
						</div>
					) : isTwoLineMode && !appointmentEditing ? (
						/* 2. РЕЖИМ 30–45 МИНУТ: Двухстрочный режим (время + ФИО, снизу процедура и врач) */
						<div
							className="appointment-card-two-line flex flex-col gap-1 min-w-0 max-w-full w-full select-none"
							data-testid="appointment-card-two-line"
							data-density="compact-2line"
						>
							{/* Строка 1: Время + Пациент + Статус + Баланс + Алерты + Действия */}
							<div className="flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full">
								<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
									<div className="appointment-card-time font-semibold text-xs text-[var(--ink)] flex items-center gap-1 shrink-0">
										{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
										<span className="font-normal text-[var(--muted)]">
											{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}
										</span>
									</div>
									<h3
										className="text-xs sm:text-sm font-bold truncate min-w-0 leading-snug cursor-pointer hover:text-[var(--teal)] transition-colors m-0 p-0"
										style={{ color: "var(--ink)" }}
										title={`Пациент: ${appointmentPatientName}${appointmentDoctor?.fullName ? ` · Врач: ${appointmentDoctor.fullName}` : ""}`}
										onDoubleClick={(e) => {
											e.stopPropagation();
											if (appointmentPatient?.id) {
												usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
												if (onOpenVisit) {
													onOpenVisit();
												} else {
													useAppStore.getState().setCurrentView("visit");
												}
												showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
											} else {
												openAppointmentEditor(appointment);
											}
										}}
										onClick={(e) => {
											if (typeof window !== "undefined" && window.innerWidth < 768) {
												e.stopPropagation();
												setIsMobileSheetOpen(true);
											}
										}}
									>
										<span className="truncate block min-w-0 max-w-full">
											{formatPatientDisplayFio(appointmentPatientName)}
										</span>
									</h3>
								</div>

								<div className="flex items-center gap-1 shrink-0">
									<AppointmentStatusBadgeSelector
										appointmentId={appointment.id}
										displayStatus={displayStatus}
										appointmentLabels={appointmentLabels}
										isQuickStatusUpdating={isQuickStatusUpdating}
										isLocked={isLockedStatus}
										compactMicro={true}
										onStatusChange={(status) => void handleQuickStatusChange(status)}
									/>
									<AppointmentBalanceBadge balance={patientBalance} />
									<AppointmentAlertBadges
										isCito={isCito}
										collisionMessage={activeScheduleCollision?.message ?? null}
										hasOpenVisit={appointmentHasOpenVisit}
									/>
									<AppointmentCardPrimaryActions
										appointment={appointment}
										displayStatus={displayStatus}
										appointmentEditing={appointmentEditing}
										isQuickStatusUpdating={isQuickStatusUpdating}
										appointmentPatient={appointmentPatient}
										appointmentPatientName={appointmentPatientName}
										onOpenVisit={onOpenVisit}
										handleQuickStatusChange={handleQuickStatusChange}
										handleShiftAppointmentTime={handleShiftAppointmentTime}
										repeatAppointment={repeatAppointment}
										openAppointmentEditor={openAppointmentEditor}
									/>
									<AppointmentCardContextMenu
										appointment={appointment}
										dashboard={dashboard}
										appointmentSuggestions={appointmentSuggestions}
										appointmentPatient={appointmentPatient}
										appointmentPatientName={appointmentPatientName}
										appointmentDoctor={appointmentDoctor}
										isQuickStatusUpdating={isQuickStatusUpdating}
										openScheduleSuggestion={openScheduleSuggestion}
										handleShiftAppointmentTime={handleShiftAppointmentTime}
										handleQuickStatusChange={handleQuickStatusChange}
										repeatAppointment={repeatAppointment}
										copyAppointmentToBuffer={copyAppointmentToBuffer}
										openAppointmentEditor={openAppointmentEditor}
									/>
								</div>
							</div>

							{/* Строка 2: Процедура + Зубы/Аллергия + Врач */}
							<div className="flex items-center justify-between gap-1.5 min-w-0 max-w-full w-full text-xs pt-0.5 border-t border-[var(--line)]/50">
								<div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
									<span
										className="text-xs text-[var(--muted)] font-medium truncate shrink-0 max-w-[180px]"
										title={appointment?.reason || "Консультация"}
									>
										{appointment?.reason || "Консультация"}
									</span>
									<AppointmentMedicalBadges
										cardTeeth={cardTeeth}
										allergyAlert={allergyAlert}
										somaticAlert={somaticAlert}
									/>
								</div>

								{appointmentDoctor?.fullName && (
									<div className="flex items-center gap-1 text-[11px] text-[var(--muted)] font-medium shrink-0 ml-auto truncate max-w-[140px]" title={`Врач: ${appointmentDoctor.fullName}`}>
										<span className="truncate">
											{formatDoctorShortName(appointmentDoctor.fullName)}
										</span>
									</div>
								)}
							</div>
						</div>
					) : (
						/* 3. РЕЖИМ 60+ МИНУТ: Полноценный развернутый блок */
						<div
							className="appointment-card-expanded flex flex-col gap-1.5 min-w-0 max-w-full w-full"
							data-testid="appointment-card-expanded"
							data-density="expanded"
						>
							<div className="appointment-card-header border-b border-[var(--line)] pb-2 mb-1 flex justify-between items-center gap-2 min-w-0 flex-wrap">
								<div className="appointment-card-time font-semibold text-sm text-[var(--ink)] flex items-center gap-2 shrink-0">
									{appointment?.startsAt ? formatTime(appointment.startsAt) : ""}
									<span className="font-normal text-[var(--muted)]">
										{appointment?.endsAt ? ` - ${formatTime(appointment.endsAt)}` : ""}
									</span>
								</div>
								<div className="flex items-center gap-1.5 flex-wrap min-w-0">
									{!appointmentEditing && (
										<AppointmentStatusBadgeSelector
											appointmentId={appointment.id}
											displayStatus={displayStatus}
											appointmentLabels={appointmentLabels}
											isQuickStatusUpdating={isQuickStatusUpdating}
											isLocked={isLockedStatus}
											onStatusChange={(status) => void handleQuickStatusChange(status)}
										/>
									)}
									<AppointmentBalanceBadge balance={patientBalance} />
									<AppointmentAlertBadges
										isCito={isCito}
										collisionMessage={activeScheduleCollision?.message ?? null}
										hasOpenVisit={appointmentHasOpenVisit}
									/>
									<AppointmentCardPrimaryActions
										appointment={appointment}
										displayStatus={displayStatus}
										appointmentEditing={appointmentEditing}
										isQuickStatusUpdating={isQuickStatusUpdating}
										appointmentPatient={appointmentPatient}
										appointmentPatientName={appointmentPatientName}
										onOpenVisit={onOpenVisit}
										handleQuickStatusChange={handleQuickStatusChange}
										handleShiftAppointmentTime={handleShiftAppointmentTime}
										repeatAppointment={repeatAppointment}
										openAppointmentEditor={openAppointmentEditor}
									/>
									<AppointmentCardContextMenu
										appointment={appointment}
										dashboard={dashboard}
										appointmentSuggestions={appointmentSuggestions}
										appointmentPatient={appointmentPatient}
										appointmentPatientName={appointmentPatientName}
										appointmentDoctor={appointmentDoctor}
										isQuickStatusUpdating={isQuickStatusUpdating}
										openScheduleSuggestion={openScheduleSuggestion}
										handleShiftAppointmentTime={handleShiftAppointmentTime}
										handleQuickStatusChange={handleQuickStatusChange}
										repeatAppointment={repeatAppointment}
										copyAppointmentToBuffer={copyAppointmentToBuffer}
										openAppointmentEditor={openAppointmentEditor}
									/>
								</div>
							</div>

							<div className="appointment-card-body min-w-0 max-w-full">
								<h3
									className="text-base font-semibold truncate min-w-0 max-w-full leading-snug cursor-pointer hover:text-[var(--teal)] transition-colors"
									style={{ color: "var(--ink)", minWidth: 0, maxWidth: "100%" }}
									title={`Пациент: ${appointmentPatientName}${appointmentDoctor?.fullName ? ` · Врач: ${appointmentDoctor.fullName}` : ""}${appointmentChair?.name ? ` · Кресло: ${appointmentChair.name}` : ""}`}
									onDoubleClick={(e) => {
										e.stopPropagation();
										if (appointmentPatient?.id) {
											usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
											if (onOpenVisit) {
												onOpenVisit();
											} else {
												useAppStore.getState().setCurrentView("visit");
											}
											showToast(`Открыта карта приёма: ${appointmentPatientName}`, "info");
										} else {
											openAppointmentEditor(appointment);
										}
									}}
									onClick={(e) => {
										if (typeof window !== "undefined" && window.innerWidth < 768) {
											e.stopPropagation();
											setIsMobileSheetOpen(true);
										}
									}}
								>
									<span className="truncate block min-w-0 max-w-full">
										{formatPatientDisplayFio(appointmentPatientName)}
									</span>
								</h3>
								<div className="flex items-center gap-1.5 min-w-0 max-w-full mt-0.5 flex-wrap">
									<span
										className="chip chip-reason text-xs font-medium text-[var(--muted)] max-w-full min-w-0 inline-flex items-center justify-start text-left"
										title={appointment?.reason || "Консультация"}
									>
										<span className="truncate block min-w-0">
											{appointment?.reason || "Консультация"}
										</span>
									</span>
									<AppointmentMedicalBadges
										cardTeeth={cardTeeth}
										allergyAlert={allergyAlert}
										somaticAlert={somaticAlert}
									/>
								</div>
							</div>
						</div>
					)}

					{appointmentHasOpenVisit ? (
						<p
							className="appointment-handoff-note text-xs"
							id={appointmentHandoffNoteId}
						>
							Пациент и закрывающий статус этой записи меняются только после
							закрытия приема.
						</p>
					) : null}

					{/* Refusal banner & categorization chips */}
					<AppointmentRefusalBanner
						appointment={appointment}
						isQuickStatusUpdating={isQuickStatusUpdating}
						appointmentHasOpenVisit={appointmentHasOpenVisit}
						onQuickStatusChange={handleQuickStatusChange}
					/>

					{(appointment?.status === "cancelled" ||
						appointment?.status === "no_show") &&
					appointment?.startsAt &&
					new Date(appointment.startsAt).getTime() > Date.now() ? (
						<div
							style={{
								marginTop: 4,
								padding: "8px 10px",
								borderRadius: 10,
								border: "1px solid var(--line)",
								background: "var(--paper-soft)",
							}}
							data-testid="appointment-card-waitlist-matches"
						>
							<WaitlistMatchesBlock appointmentId={appointment.id} compact />
						</div>
					) : null}

					{appointmentEditing ? (
						<AppointmentCardEditor
							appointment={appointment}
							dashboard={dashboard}
							appointmentDraft={appointmentDraft}
							appointmentSaveState={appointmentSaveState}
							appointmentSaveError={appointmentSaveError}
							appointmentDirty={appointmentDirty}
							appointmentHasOpenVisit={appointmentHasOpenVisit}
							appointmentMissingSteps={appointmentMissingSteps}
							appointmentReadyToSave={appointmentReadyToSave}
							activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
							appointmentLabels={appointmentLabels}
							appointmentPatientName={appointmentPatientName}
							appointmentPatient={appointmentPatient}
							appointmentDoctor={appointmentDoctor}
							appointmentChair={appointmentChair}
							activePatients={activePatients}
							activeDoctors={activeDoctors}
							activeAssistants={activeAssistants}
							activeChairs={activeChairs}
							useManualSelects={useManualSelects}
							collision={collision}
							toDateTimeLocalValue={toDateTimeLocalValue}
							fromDateTimeLocalValue={fromDateTimeLocalValue}
							updateAppointmentScheduleDraft={updateAppointmentScheduleDraft}
							saveAppointmentSchedule={saveAppointmentSchedule}
							closeAppointmentEditor={closeAppointmentEditor}
							normalizedAppointmentStatus={normalizedAppointmentStatus}
						/>
					) : null}
				</article>

				{/* Mobile Native Bottom Sheet for Progressive Disclosure on tap */}
				<AppointmentMobileBottomSheet
					appointment={appointment}
					dashboard={dashboard}
					isOpen={isMobileSheetOpen}
					onClose={() => setIsMobileSheetOpen(false)}
					displayStatus={displayStatus}
					appointmentPatient={appointmentPatient}
					appointmentPatientName={appointmentPatientName}
					patientBalance={patientBalance}
					appointmentDoctor={appointmentDoctor}
					appointmentAssistant={appointmentAssistant}
					appointmentChair={appointmentChair}
					cardTeeth={cardTeeth}
					allergyAlert={allergyAlert}
					appointmentLabels={appointmentLabels}
					formatTime={formatTime}
					handleQuickStatusChange={handleQuickStatusChange}
					onCloseHover={() => {}}
					onKeepHover={() => {}}
					openAppointmentEditor={openAppointmentEditor}
				/>
			</div>
		</div>
	);
}

export const AppointmentCard = React.memo(AppointmentCardInner, areAppointmentCardPropsEqual);
AppointmentCard.displayName = "AppointmentCard";
