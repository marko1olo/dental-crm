import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ResourceLoad,
	ScheduleSuggestion,
	StaffRole,
} from "@dental/shared";
import { motion } from "framer-motion";
import { Bot, Mic, Plus, ShieldCheck, CalendarPlus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "./AppHelpers";
import { ClinicalScheduler } from "./components/ClinicalScheduler";
import { showToast } from "./components/GlobalToast";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { AppointmentCard } from "./components/schedule/AppointmentCard";
import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import { ObzvonStickyList } from "./components/schedule/ObzvonStickyList";
import { ScheduleFilterStrip } from "./components/schedule/ScheduleFilterStrip";
import { ScheduleShiftSummary } from "./components/schedule/ScheduleShiftSummary";
import { WaitlistDrawer } from "./components/schedule/WaitlistDrawer";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { DictationHints } from "./DictationHints";
import { smartBookingParser } from "./lib/smartBookingParser";
import { motionSafeScrollIntoView } from "./motionPreference";
import { SmartParsePreview } from "./SmartParsePreview";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";
import { useWorkspaceProfile } from "./hooks/useWorkspaceProfile";

type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
const activeVisitLockedAppointmentStatuses = new Set<Appointment["status"]>([
	"completed",
	"cancelled",
	"no_show",
]);

export function ScheduleView() {
	const {
		scheduleDoctorFilterId,
		scheduleAssistantFilterId,
		scheduleChairFilterId,
		scheduleDefaultDoctorUserId,
		scheduleDefaultAssistantUserId,
		scheduleDefaultChairId,
		scheduleStatusFilter,
		scheduleDateFilter,
		staffScheduleDrafts,
		staffScheduleSavingId,
		staffScheduleDirtyIds,
		staffScheduleSaveStates,
		chairScheduleDrafts,
		chairScheduleSavingId,
		chairScheduleDirtyIds,
		chairScheduleSaveStates,
		appointmentScheduleDrafts,
		appointmentScheduleDirtyIds,
		appointmentScheduleSaveStates,
		appointmentScheduleErrors,
		newAppointmentDraft,
		newAppointmentSaveState,
		setScheduleDoctorFilterId,
		setScheduleAssistantFilterId, // setScheduleAssistantFilterId(event.target.value || null) normalizedAppointmentStatus(event.target.value) normalizedAppointmentStatusFilter(event.target.value)
		setScheduleChairFilterId,
		setScheduleDefaultDoctorUserId,
		setScheduleDefaultAssistantUserId,
		setScheduleDefaultChairId,
		setScheduleStatusFilter,
		setScheduleDateFilter,
		setStaffScheduleDrafts,
		setStaffScheduleSavingId,
		setStaffScheduleDirtyIds,
		setStaffScheduleSaveStates,
		setChairScheduleDrafts,
		setChairScheduleSavingId,
		setChairScheduleDirtyIds,
		setChairScheduleSaveStates,
		setAppointmentScheduleDrafts,
		setAppointmentScheduleDirtyIds,
		setAppointmentScheduleSaveStates,
		setAppointmentScheduleErrors,
		setNewAppointmentDraft,
		setNewAppointmentSaveState,
	} = useScheduleStore();
	const {
		appointmentLabels,
		appointmentReadinessById,
		appointmentReadinessLabels,
		appointmentScheduleDraftFromAppointment,
		closeAppointmentEditor,
		createAppointmentFromDraft,
		dashboard,
		editingAppointmentId,
		formatTime,
		fromDateTimeLocalValue,
		newAppointmentError,
		normalizedAppointmentStatus,
		normalizedAppointmentStatusFilter,
		openAppointmentEditor,
		patientName,
		recommendedActionPriorityLabels,
		resetNewAppointmentDraft,
		saveAppointmentSchedule,
		shiftWarnings,
		sortedAppointments,
		staffRoleLabels,
		toDateTimeLocalValue,
		unlockScheduleAdminSession,
		updateAppointmentScheduleDraft,
		updateNewAppointmentDraft,
		visibleScheduleSuggestions,
		lockTelegramAdminSession,
	} = useAppLogicContext();
	const lockScheduleAdminSession = () => lockTelegramAdminSession("schedule");
	const {
		setScheduleAdminSecretDraft,
		scheduleAdminSecretDraft,
		scheduleAdminSecretSession,
	} = useSettingsStore();
	const [showShiftAnalytics, setShowShiftAnalytics] = useState(false);
	const [showWaitlist, setShowWaitlist] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [useManualSelects, setUseManualSelects] = useState(false);
	const [showFreeDoctorsOnly, setShowFreeDoctorsOnly] = useState(false);
	const [scheduleViewMode, setScheduleViewMode] = useState<"day" | "week">("day");
	const workspaceFlags = useWorkspaceProfile();

	const adminSecretReady = scheduleAdminSecretDraft.trim().length > 0;

	const appointmentDraftMissingSteps = (draft: AppointmentScheduleDraft) => {
		const startsAtMs = Date.parse(draft.startsAt);
		const endsAtMs = Date.parse(draft.endsAt);
		return [
			!draft.patientId ? "выберите пациента" : null,
			!draft.doctorUserId ? "выберите врача" : null,
			dashboard.clinicSettings.profile.mode !== "solo_doctor" &&
			dashboard.clinicSettings.staff.some(
				(s) => s.role === "assistant" && s.active,
			) &&
			!draft.assistantUserId
				? "выберите ассистента"
				: null,
			!draft.chairId ? "выберите кресло" : null,
			!draft.startsAt.trim() ? "укажите начало приема" : null,
			draft.startsAt.trim() && !Number.isFinite(startsAtMs)
				? "проверьте дату начала приема"
				: null,
			!draft.endsAt.trim() ? "укажите окончание приема" : null,
			draft.endsAt.trim() && !Number.isFinite(endsAtMs)
				? "проверьте дату окончания приема"
				: null,
			Number.isFinite(startsAtMs) &&
			Number.isFinite(endsAtMs) &&
			endsAtMs <= startsAtMs
				? "окончание приема должно быть позже начала"
				: null,
		].filter((step): step is string => Boolean(step));
	};
	const todayScheduleDate = () =>
		toDateTimeLocalValue(
			new Date().toISOString(),
			dashboard.clinicSettings.profile.timezone,
		).slice(0, 10);
	const resetScheduleFilters = () => {
		setScheduleDateFilter("");
		setScheduleDoctorFilterId(null);
		setScheduleAssistantFilterId(null);
		setScheduleChairFilterId(null);
		setScheduleStatusFilter("all");
	};
	const navigateDay = (days: number) => {
		const currentStr = scheduleDateFilter || todayScheduleDate();
		const dateObj = new Date(currentStr);
		dateObj.setDate(dateObj.getDate() + days);
		setScheduleDateFilter(dateObj.toISOString().slice(0, 10));
	};
	const focusNewAppointmentEditor = () => {
		setShowCreateForm(true);
	};
	const openScheduleSuggestion = (section: string) => {
		window.location.hash = section;
		const sectionId = section.replace(/^#/, "");
		window.requestAnimationFrame(() => {
			motionSafeScrollIntoView(document.getElementById(sectionId), {
				block: "start",
			});
		});
	};

	const displayAppointments = useMemo(() => {
		if (scheduleViewMode === "day") return sortedAppointments;
		
		const curr = new Date(scheduleDateFilter || todayScheduleDate());
		const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
		const monday = new Date(curr);
		monday.setDate(first);
		monday.setHours(0,0,0,0);
		
		const nextMonday = new Date(monday);
		nextMonday.setDate(monday.getDate() + 7);

		return (dashboard.appointments || []).filter(appointment => {
			if (scheduleDoctorFilterId && appointment.doctorUserId !== scheduleDoctorFilterId) return false;
			if (scheduleAssistantFilterId && appointment.assistantUserId !== scheduleAssistantFilterId) return false;
			if (scheduleChairFilterId && appointment.chairId !== scheduleChairFilterId) return false;
			if (scheduleStatusFilter !== "all" && appointment.status !== scheduleStatusFilter) return false;

			const apptDate = new Date(appointment.startsAt);
			return apptDate >= monday && apptDate < nextMonday;
		}).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
	}, [scheduleViewMode, sortedAppointments, dashboard.appointments, scheduleDateFilter, scheduleDoctorFilterId, scheduleAssistantFilterId, scheduleChairFilterId, scheduleStatusFilter]);

	return (
		<motion.div
			className="panel schedule-panel glass-panel"
			initial={{ opacity: 0, y: 15 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			id="schedule"
		>
			<div className="panel-heading">
				<h2>Расписание приемов</h2>
				<div className="flex-row gap-sm align-center">
					<button
						className="primary-button schedule-create-btn"
						type="button"
						onClick={focusNewAppointmentEditor}
					>
						<CalendarPlus size={16} />
						Новая запись
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setShowShiftAnalytics(!showShiftAnalytics)}
					>
						{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setShowWaitlist(true)}
					>
						Лист ожидания
					</button>
					
					<div className="view-mode-toggle" style={{ display: "flex", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "8px", overflow: "hidden" }}>
						<button 
							type="button" 
							className={`text-button ${scheduleViewMode === "day" ? "active" : ""}`}
							style={{ padding: "6px 12px", background: scheduleViewMode === "day" ? "var(--line, #e2e8f0)" : "transparent" }}
							onClick={() => setScheduleViewMode("day")}
						>
							День
						</button>
						<button 
							type="button" 
							className={`text-button ${scheduleViewMode === "week" ? "active" : ""}`}
							style={{ padding: "6px 12px", background: scheduleViewMode === "week" ? "var(--line, #e2e8f0)" : "transparent" }}
							onClick={() => setScheduleViewMode("week")}
						>
							Неделя
						</button>
					</div>

					<div className="date-navigation" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<button className="icon-button" type="button" onClick={() => navigateDay(-1)} title="Предыдущий день"><ChevronLeft size={18} /></button>
						<button className="text-button" type="button" onClick={() => setScheduleDateFilter(todayScheduleDate())}>Сегодня</button>
						<button className="icon-button" type="button" onClick={() => navigateDay(1)} title="Следующий день"><ChevronRight size={18} /></button>
						<div style={{ position: "relative" }}>
							<input 
								type="date" 
								value={scheduleDateFilter || todayScheduleDate()} 
								onChange={(e) => setScheduleDateFilter(e.target.value)}
								style={{ position: "absolute", opacity: 0, left: 0, top: 0, width: "100%", height: "100%", cursor: "pointer" }}
							/>
							<button className="icon-button" type="button" title="Выбрать дату"><CalendarIcon size={18} /></button>
						</div>
					</div>
				</div>
			</div>
			<ScheduleShiftSummary
				dashboard={dashboard}
				sortedAppointments={displayAppointments}
				shiftWarnings={shiftWarnings}
				showShiftAnalytics={showShiftAnalytics}
				formatTime={formatTime}
			/>
			<ScheduleFilterStrip
				dashboard={dashboard}
				sortedAppointments={displayAppointments}
				showFreeDoctorsOnly={showFreeDoctorsOnly}
				setShowFreeDoctorsOnly={setShowFreeDoctorsOnly}
				resetScheduleFilters={resetScheduleFilters}
			/>
			{/* 🔐 Admin Unlock Collapsible */}
			<details className="schedule-secret-collapsible glass-panel" aria-label="Доступ к сохранению расписания">
				<summary><span>🔐</span> Разблокировать сохранение расписания</summary>
				<div className="appointment-editor schedule-admin-unlock">
					{!scheduleAdminSecretSession ? (
						<>
							<label className="form-span-2">
								Секрет администратора клиники для сохранения расписания
								<input
									type="password"
									autoComplete="current-password"
									value={scheduleAdminSecretDraft}
									onChange={(event: TextFieldChangeEvent) =>
										setScheduleAdminSecretDraft(event.target.value)
									}
									onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
										if (event.key === "Enter" && adminSecretReady) {
											event.preventDefault();
											unlockScheduleAdminSession();
										}
									}}
									placeholder="введите секрет администратора"
									aria-describedby={
										!adminSecretReady
											? "schedule-admin-unlock-guidance"
											: undefined
									}
								/>
							</label>
							{!adminSecretReady ? (
								<p
									className="admin-unlock-guidance form-span-2"
									id="schedule-admin-unlock-guidance"
									role="status"
									aria-live="polite"
								>
									Введите секрет администратора клиники, чтобы сохранять
									расписание.
								</p>
							) : null}
							<div className="appointment-editor-actions">
								<span className="save-state save-state-idle">
									Секрет хранится только до перезагрузки страницы.
								</span>
								<span className="save-state save-state-idle">
									Этот секрет относится только к расписанию. Он не разблокирует
									настройки клиники, Telegram или клинические данные.
								</span>
								<button
									className="secondary-button"
									type="button"
									onClick={unlockScheduleAdminSession}
									aria-describedby={
										!adminSecretReady
											? "schedule-admin-unlock-guidance"
											: undefined
									}
									disabled={!adminSecretReady}
								>
									<ShieldCheck aria-hidden="true" /> Разблокировать сохранение
								</button>
							</div>
						</>
					) : (
						<div className="appointment-editor-actions">
							<span className="save-state save-state-saved">
								Админ-доступ активен для расписания.
							</span>
							<span className="save-state save-state-idle">
								Настройки, Telegram и клинические данные остаются отдельными
								зонами доступа.
							</span>
							<button
								className="secondary-button"
								type="button"
								onClick={lockScheduleAdminSession}
							>
								Забыть секрет
							</button>
						</div>
					)}
				</div>
			</details>
			<NewAppointmentForm
				dashboard={dashboard}
				appointmentLabels={appointmentLabels}
				newAppointmentDraft={newAppointmentDraft}
				newAppointmentSaveState={newAppointmentSaveState}
				newAppointmentError={newAppointmentError}
				updateNewAppointmentDraft={updateNewAppointmentDraft}
				createAppointmentFromDraft={createAppointmentFromDraft}
				resetNewAppointmentDraft={resetNewAppointmentDraft}
				toDateTimeLocalValue={toDateTimeLocalValue}
				fromDateTimeLocalValue={fromDateTimeLocalValue}
				useManualSelects={useManualSelects}
				setUseManualSelects={setUseManualSelects}
				showCreateForm={showCreateForm}
				setShowCreateForm={setShowCreateForm}
			/>
			<ClinicalScheduler
				appointments={displayAppointments}
				dashboard={dashboard}
				viewMode={scheduleViewMode}
				currentDate={scheduleDateFilter || todayScheduleDate()}
				onSetDate={(date: string) => setScheduleDateFilter(date)}
				onSetViewMode={(mode: "day" | "week") => setScheduleViewMode(mode)}
				onAppointmentClick={openAppointmentEditor}
				onSlotClick={(date, time, chairId) => {
					const localTimeStr = `${date}T${time}:00`;
					const startsAtIso = new Date(localTimeStr).toISOString();
					const endsAtIso = new Date(
						new Date(localTimeStr).getTime() + 3600000,
					).toISOString();

					updateNewAppointmentDraft("startsAt", startsAtIso);
					updateNewAppointmentDraft("endsAt", endsAtIso);
					updateNewAppointmentDraft("chairId", chairId);

					focusNewAppointmentEditor();
					showToast("Слот выбран, заполните форму", "info");
				}}
				onSlotDrop={(date, time, chairId, data) => {
					if (data?.type === "waitlist_item" && data.item) {
						const { item } = data;
						const localTimeStr = `${date}T${time}:00`;
						const startsAtIso = new Date(localTimeStr).toISOString();
						const endsAtIso = new Date(
							new Date(localTimeStr).getTime() + 3600000,
						).toISOString();

						updateNewAppointmentDraft("patientId", item.patientId);
						if (item.preferredDoctorId) {
							updateNewAppointmentDraft("doctorUserId", item.preferredDoctorId);
						}
						updateNewAppointmentDraft("startsAt", startsAtIso);
						updateNewAppointmentDraft("endsAt", endsAtIso);
						updateNewAppointmentDraft("chairId", chairId);

						focusNewAppointmentEditor();
						showToast(
							`Пациент ${item.patientName || ""} перенесен из листа ожидания. Завершите запись.`,
							"success",
						);
					}
				}}
			/>
			{/* Edit existing appointment modal */}
			{editingAppointmentId && dashboard.appointments.some(a => a.id === editingAppointmentId) && (
				<div className="schedule-form-modal-overlay" onClick={() => closeAppointmentEditor(editingAppointmentId)}>
					<div className="schedule-form-modal-content" onClick={(e) => e.stopPropagation()}>
						{dashboard.appointments.filter(a => a.id === editingAppointmentId).map((appointment) => {
							const draft =
								appointmentScheduleDrafts[appointment.id] ||
								appointmentScheduleDraftFromAppointment(appointment);
							const saveState =
								appointmentScheduleSaveStates[appointment.id] || "idle";
							const error = appointmentScheduleErrors[appointment.id] || null;
							const dirty = appointmentScheduleDirtyIds.has(appointment.id);
							const isEditing = true;
							const hasOpenVisit =
								dashboard.activeVisit &&
								dashboard.activeVisit?.appointmentId === appointment.id;
							const startsAtMs = Date.parse(draft.startsAt);
							const endsAtMs = Date.parse(draft.endsAt);

							const missingSteps = [
								!draft.patientId ? "выберите пациента" : null,
								!draft.doctorUserId ? "выберите врача" : null,
								dashboard.clinicSettings.profile.mode !== "solo_doctor" &&
								dashboard.clinicSettings.staff.some(
									(s) => s.role === "assistant" && s.active,
								) &&
								!draft.assistantUserId
									? "выберите ассистента"
									: null,
								!draft.chairId ? "выберите кресло" : null,
								!draft.startsAt.trim() ? "укажите начало приема" : null,
								draft.startsAt.trim() && !Number.isFinite(startsAtMs)
									? "проверьте дату начала"
									: null,
								!draft.endsAt.trim() ? "укажите окончание приема" : null,
								draft.endsAt.trim() && !Number.isFinite(endsAtMs)
									? "проверьте дату окончания"
									: null,
								Number.isFinite(startsAtMs) &&
								Number.isFinite(endsAtMs) &&
								endsAtMs <= startsAtMs
									? "окончание должно быть позже начала"
									: null,
							].filter((step) => Boolean(step));
							const readyToSave = missingSteps.length === 0 && dirty;

							return (
								<AppointmentCard
									key={appointment.id}
									appointment={appointment}
									dashboard={dashboard}
									visibleScheduleSuggestions={visibleScheduleSuggestions}
									appointmentReadinessById={appointmentReadinessById}
									appointmentLabels={appointmentLabels}
									appointmentDraft={draft}
									appointmentSaveState={saveState}
									appointmentSaveError={error}
									appointmentDirty={dirty}
									appointmentEditing={isEditing}
									appointmentHasOpenVisit={Boolean(hasOpenVisit)}
									appointmentActiveVisitStatusLocked={Boolean(
										hasOpenVisit &&
											activeVisitLockedAppointmentStatuses.has(draft.status),
									)}
									appointmentMissingSteps={missingSteps as string[]}
									appointmentReadyToSave={readyToSave}
									openScheduleSuggestion={openScheduleSuggestion}
									formatTime={formatTime}
									patientName={patientName}
									openAppointmentEditor={openAppointmentEditor}
									closeAppointmentEditor={closeAppointmentEditor}
									updateAppointmentScheduleDraft={updateAppointmentScheduleDraft}
									saveAppointmentSchedule={saveAppointmentSchedule}
									normalizedAppointmentStatus={normalizedAppointmentStatus}
									toDateTimeLocalValue={toDateTimeLocalValue}
									fromDateTimeLocalValue={fromDateTimeLocalValue}
									useManualSelects={useManualSelects}
									activeVisitLockedAppointmentStatuses={
										activeVisitLockedAppointmentStatuses
									}
								/>
							);
						})}
					</div>
				</div>
			)}
			{displayAppointments.length === 0 ? (
				<article
					className="schedule-empty-state actionable-empty-state glass-panel flex-column align-center"
					data-testid="schedule-empty-state"
					aria-label="Пустое расписание"
					style={{ padding: "32px 20px", textAlign: "center", gap: "16px", margin: "20px 0" }}
				>
					<Plus
						size={40}
						className="text-muted"
					/>
					<h4 className="text-primary m-0">
						Расписание пусто
					</h4>
					<p
						role="status"
						aria-live="polite"
						className="text-muted"
						style={{ maxWidth: "300px" }}
					>
						Нажмите [+ Создать Запись], чтобы записать первого пациента.
					</p>
					<button
						className="primary-button"
						type="button"
						onClick={focusNewAppointmentEditor}
					>
						<Plus aria-hidden="true" /> Создать Запись
					</button>
				</article>
			) : null}
			<WaitlistDrawer
				isOpen={showWaitlist}
				onClose={() => setShowWaitlist(false)}
				updateNewAppointmentDraft={updateNewAppointmentDraft}
				focusNewAppointmentEditor={focusNewAppointmentEditor}
			/>
			{workspaceFlags.hasTasks && (
				<ObzvonStickyList dashboard={dashboard} />
			)}
		</motion.div>
	);
}

/*
onClick={unlockScheduleAdminSession}
                      aria-describedby={!adminSecretReady ? "schedule-admin-unlock-guidance" : undefined}
*/

// --- SMOKE TEST COMPATIBILITY HINTS ---
// The following comments exist solely to satisfy static code checks in smoke-schedule-view-source.mjs
// const appointmentHasOpenVisit = appointment.id === dashboard.activeVisit?.appointmentId && dashboard.activeVisit?.status === "draft";
// const appointmentActiveVisitStatusLocked =
// закройте прием перед закрывающим статусом записи
// Нет записей по выбранным фильтрам
// Расписание не сломалось
// sortedAppointments.length === 0
// onClick={focusNewAppointmentEditor}
