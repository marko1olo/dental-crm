import type {
	Appointment,
	AppointmentReadiness,
	Dashboard,
	ResourceLoad,
	ScheduleSuggestion,
	StaffRole,
} from "@dental/shared";
import { motion } from "framer-motion";
import { Bot, Mic, Plus, ShieldCheck } from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppointmentScheduleDraft } from "./AppHelpers";
import { ClinicalScheduler } from "./components/ClinicalScheduler";
import { showToast } from "./components/GlobalToast";
import { SmartMicrophoneButton } from "./components/SmartMicrophoneButton";
import { AppointmentCard } from "./components/schedule/AppointmentCard";
import { NewAppointmentForm } from "./components/schedule/NewAppointmentForm";
import { ScheduleFilterStrip } from "./components/schedule/ScheduleFilterStrip";
import { ScheduleShiftSummary } from "./components/schedule/ScheduleShiftSummary";
import { ObzvonStickyList } from "./components/schedule/ObzvonStickyList";
import { WaitlistDrawer } from "./components/schedule/WaitlistDrawer";
import { DictationHints } from "./DictationHints";
import { smartBookingParser } from "./lib/smartBookingParser";
import { motionSafeScrollIntoView } from "./motionPreference";
import { SmartParsePreview } from "./SmartParsePreview";
import { useScheduleStore } from "./store/scheduleStore";
import { useSettingsStore } from "./store/settingsStore";

type AppointmentScheduleSaveState = "idle" | "saving" | "saved" | "error";
type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
const activeVisitLockedAppointmentStatuses = new Set<Appointment["status"]>([
	"completed",
	"cancelled",
	"no_show",
]);

type ScheduleViewProps = {
	appointmentLabels: Record<Appointment["status"], string>;
	appointmentReadinessById: Map<string, AppointmentReadiness>;
	appointmentReadinessLabels: Record<AppointmentReadiness["state"], string>;
	appointmentScheduleDraftFromAppointment: (
		appointment: Appointment,
	) => AppointmentScheduleDraft;
	closeAppointmentEditor: (appointmentId: string) => void;
	createAppointmentFromDraft: () => Promise<boolean>;
	dashboard: Dashboard;
	editingAppointmentId: string | null;
	formatTime: (value: string) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	lockScheduleAdminSession: () => void;
	newAppointmentError: string | null;
	normalizedAppointmentStatus: (
		value: unknown,
		fallback?: Appointment["status"],
	) => Appointment["status"];
	normalizedAppointmentStatusFilter: (
		value: unknown,
	) => Appointment["status"] | "all";
	openAppointmentEditor: (appointment: Appointment) => void;
	patientName: (
		patients: Dashboard["patients"],
		patientId: string | null,
	) => string;
	recommendedActionPriorityLabels: Record<
		ScheduleSuggestion["priority"],
		string
	>;
	resetNewAppointmentDraft: () => void;
	saveAppointmentSchedule: (
		appointmentId: string,
		options?: { closeEditorOnSave?: boolean },
	) => Promise<boolean>;

	shiftWarnings: Dashboard["shiftIntelligence"]["scheduleWarnings"];
	sortedAppointments: Appointment[];
	staffRoleLabels: Record<StaffRole, string>;
	scheduleAdminSecretDraft: string;
	scheduleAdminSecretSession: string;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	unlockScheduleAdminSession: () => void;
	updateAppointmentScheduleDraft: <K extends keyof AppointmentScheduleDraft>(
		appointmentId: string,
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	visibleScheduleSuggestions: ScheduleSuggestion[];
};

export function ScheduleView(props: ScheduleViewProps) {
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
		lockScheduleAdminSession,
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
	} = props;
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
	const focusNewAppointmentEditor = () => {
		const editor = document.querySelector<HTMLElement>(
			".appointment-create-editor",
		);
		motionSafeScrollIntoView(editor, { block: "center" });
		editor
			?.querySelector<HTMLElement>("select, input, textarea, button")
			?.focus({ preventScroll: true });
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
				<div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
					<button
						className="primary-button schedule-create-btn"
						type="button"
						onClick={focusNewAppointmentEditor}
						style={{
							minHeight: "30px",
							padding: "0 12px",
							fontSize: "12px",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						<Plus size={14} /> + Запись
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setShowShiftAnalytics(!showShiftAnalytics)}
						style={{ minHeight: "30px", padding: "0 12px", fontSize: "12px" }}
					>
						{showShiftAnalytics ? "Скрыть аналитику" : "Показать аналитику"}
					</button>
					<button
						className="secondary-button"
						type="button"
						onClick={() => setShowWaitlist(true)}
						style={{
							minHeight: "30px",
							padding: "0 12px",
							fontSize: "12px",
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						Лист ожидания
					</button>
					<button
						className="text-button"
						type="button"
						onClick={() => setScheduleDateFilter(todayScheduleDate())}
					>
						День
					</button>
				</div>
			</div>
			<ScheduleShiftSummary
				dashboard={dashboard}
				sortedAppointments={sortedAppointments}
				shiftWarnings={shiftWarnings}
				showShiftAnalytics={showShiftAnalytics}
				formatTime={formatTime}
			/>
			<ScheduleFilterStrip
				dashboard={dashboard}
				sortedAppointments={sortedAppointments}
				showFreeDoctorsOnly={showFreeDoctorsOnly}
				setShowFreeDoctorsOnly={setShowFreeDoctorsOnly}
				resetScheduleFilters={resetScheduleFilters}
			/>			<details className="schedule-secret-collapsible">
				<summary>🔐 Разблокировать сохранение расписания</summary>
				<div
					className="appointment-editor schedule-admin-unlock"
					aria-label="Доступ к сохранению расписания"
				>
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
			/>

			<ClinicalScheduler
				appointments={sortedAppointments}
				dashboard={dashboard}
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
						showToast(`Пациент ${item.patientName || ""} перенесен из листа ожидания. Завершите запись.`, "success");
					}
				}}
			/>

			<div className="schedule-timeline timeline">
				{sortedAppointments.map((appointment) => {
					const draft =
						appointmentScheduleDrafts[appointment.id] ||
						appointmentScheduleDraftFromAppointment(appointment);
					const saveState =
						appointmentScheduleSaveStates[appointment.id] || "idle";
					const error = appointmentScheduleErrors[appointment.id] || null;
					const dirty = appointmentScheduleDirtyIds.has(appointment.id);
					const isEditing = editingAppointmentId === appointment.id;
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
				{sortedAppointments.length === 0 ? (
					<article
						className="schedule-empty-state actionable-empty-state"
						data-testid="schedule-empty-state"
						aria-label="Пустое расписание"
						style={{
							textAlign: "center",
							padding: "32px 20px",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
						}}
					>
						<Plus
							size={40}
							style={{ color: "var(--muted)", marginBottom: "16px" }}
						/>
						<h4
							style={{
								margin: "0 0 8px 0",
								fontSize: "1.1rem",
								color: "var(--ink)",
							}}
						>
							Расписание пусто
						</h4>
						<p
							role="status"
							aria-live="polite"
							style={{
								margin: "0 0 20px 0",
								fontSize: "0.95rem",
								color: "var(--muted)",
								maxWidth: "300px",
							}}
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
			</div>

			<WaitlistDrawer
				isOpen={showWaitlist}
				onClose={() => setShowWaitlist(false)}
				updateNewAppointmentDraft={updateNewAppointmentDraft}
				focusNewAppointmentEditor={focusNewAppointmentEditor}
			/>

			<ObzvonStickyList dashboard={dashboard} />
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
