import React, { useState } from "react";
import { showToast } from "../../GlobalToast";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { AppointmentRefusalBanner } from "../AppointmentPaymentBadges";
import { AppointmentCardEditor } from "../AppointmentCardEditor";
import { useAppointmentCardState } from "../useAppointmentCardState";
import { calculateProportionalCardHeight } from "../appointmentCardHelpers";
import type { AppointmentCardProps } from "../AppointmentCardTypes";
import { AppointmentCardVisualBody } from "./AppointmentCardVisualBody";
import { AppointmentCardWaitlistRecovery } from "./AppointmentCardWaitlistRecovery";
import {
	AppointmentCardHoverOverlay,
	AppointmentCardBottomPopups,
} from "./AppointmentCardPopups";

export function AppointmentCardContainer(props: AppointmentCardProps) {
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

	const [isSmartRecoveryOpen, setIsSmartRecoveryOpen] = useState(false);

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

	const densityMode = props.densityMode;
	const isMicroDensity =
		densityMode === "compact" ||
		(!densityMode && durationMinutes <= 20) ||
		(densityMode === "informative" && durationMinutes <= 20);
	const isTwoLineMode =
		(!densityMode && durationMinutes > 20 && durationMinutes < 60) ||
		(densityMode === "informative" && durationMinutes > 20 && durationMinutes < 60);

	const proportionalHeight = calculateProportionalCardHeight(durationMinutes);

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
					data-proportional-height={proportionalHeight}
					data-multi-hour-block={isMultiHour ? "true" : "false"}
					data-slot-span={slotSpan}
					tabIndex={0}
					onKeyDown={handleCardKeyDown}
					onDoubleClick={(e) => {
						e.stopPropagation();
						const pid = appointmentPatient?.id || appointment.patientId;
						if (pid) {
							usePatientStore.getState().setSelectedPatientId(pid);
							if (typeof window !== "undefined") {
								window.location.hash = "#visit";
							}
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
						minHeight: `${proportionalHeight}px`,
						boxSizing: "border-box",
						contentVisibility: "auto",
						containIntrinsicSize: isMicroDensity ? "1px 32px" : "1px 48px",
					}}
				>
					{/* Контекстный Hover HUD карточки визита */}
					<AppointmentCardHoverOverlay
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
						handleCardMouseLeave={handleCardMouseLeave}
						hoverTimeoutRef={hoverTimeoutRef}
						isHoverPreviewOpen={isHoverPreviewOpen}
						setIsHoverPreviewOpen={setIsHoverPreviewOpen}
						onOpenVisit={onOpenVisit}
					/>

					<AppointmentCardVisualBody
						props={props}
						state={state}
						isMicroDensity={isMicroDensity}
						isTwoLineMode={isTwoLineMode}
						appointmentSuggestions={appointmentSuggestions}
						onOpenVisit={onOpenVisit}
						openAppointmentEditor={openAppointmentEditor}
						setIsMobileSheetOpen={setIsMobileSheetOpen}
					/>

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

					<AppointmentCardWaitlistRecovery
						appointment={appointment}
						onOpenSmartRecovery={() => setIsSmartRecoveryOpen(true)}
					/>

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

				<AppointmentCardBottomPopups
					appointment={appointment}
					dashboard={dashboard}
					isMobileSheetOpen={isMobileSheetOpen}
					setIsMobileSheetOpen={setIsMobileSheetOpen}
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
					openAppointmentEditor={openAppointmentEditor}
					isSmartRecoveryOpen={isSmartRecoveryOpen}
					setIsSmartRecoveryOpen={setIsSmartRecoveryOpen}
				/>
			</div>
		</div>
	);
}
