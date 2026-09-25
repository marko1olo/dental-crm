import {
	type Appointment,
	type Dashboard,
} from "@dental/shared";
import React, { type ChangeEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { specialtyLabels } from "../../workspaceUiLabels";
import { AppointmentQuickActions } from "./AppointmentQuickActions";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export interface AppointmentCardEditorProps {
	appointment: Appointment;
	dashboard: Dashboard;
	appointmentDraft: Record<string, string | number | boolean | null | undefined>;
	appointmentSaveState: string;
	appointmentSaveError: string | null;
	appointmentDirty: boolean;
	appointmentPatientName: string;
	appointmentDoctor: any;
	appointmentAssistant: any;
	appointmentChair: any;
	activePatients: any[];
	activeDoctors: any[];
	activeAssistants: any[];
	activeChairs: any[];
	useManualSelects: boolean;
	appointmentHasOpenVisit: boolean;
	activeVisitLockedAppointmentStatuses: Set<Appointment["status"]>;
	appointmentMissingSteps: string[];
	appointmentReadyToSave: boolean;
	collision: { hasCollision: boolean; message: string | null };
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	updateAppointmentScheduleDraft: (
		appointmentId: string,
		key: string,
		value: string | number | boolean | null | undefined,
	) => void;
	closeAppointmentEditor: (appointmentId: string) => void;
	saveAppointmentSchedule: (appointmentId: string) => Promise<boolean>;
	normalizedAppointmentStatus: (value: unknown) => Appointment["status"];
	appointmentLabels: Record<Appointment["status"], string>;
}

export function AppointmentCardEditor(props: AppointmentCardEditorProps) {
	const {
		appointment,
		dashboard,
		appointmentDraft,
		appointmentSaveState,
		appointmentSaveError,
		appointmentDirty,
		appointmentPatientName,
		appointmentDoctor,
		appointmentAssistant,
		appointmentChair,
		activePatients,
		activeDoctors,
		activeAssistants,
		activeChairs,
		useManualSelects,
		appointmentHasOpenVisit,
		activeVisitLockedAppointmentStatuses,
		appointmentMissingSteps,
		appointmentReadyToSave,
		collision,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		updateAppointmentScheduleDraft,
		closeAppointmentEditor,
		saveAppointmentSchedule,
		normalizedAppointmentStatus,
		appointmentLabels,
	} = props;

	const appointmentEditorId = `appointment-editor-${appointment?.id ?? ""}`;
	const appointmentHandoffNoteId = `appointment-handoff-note-${appointment?.id ?? ""}`;
	const appointmentSaveMissingId = `appointment-save-missing-${appointment?.id ?? ""}`;

	return (
		<section
			className="appointment-editor form-span-2"
			id={appointmentEditorId}
			aria-label={`Редактирование записи: ${appointmentPatientName}`}
		>
			<label>
				Начало
				<input
					type="datetime-local"
					value={toDateTimeLocalValue(
						appointmentDraft?.startsAt as string,
						dashboard?.clinicSettings?.profile?.timezone,
					)}
					onChange={(event: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(
							appointment.id,
							"startsAt",
							fromDateTimeLocalValue(
								event.target.value,
								dashboard?.clinicSettings?.profile?.timezone,
							),
						)
					}
				/>
			</label>
			<label>
				Окончание
				<input
					type="datetime-local"
					value={toDateTimeLocalValue(
						appointmentDraft?.endsAt as string,
						dashboard?.clinicSettings?.profile?.timezone,
					)}
					onChange={(event: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(
							appointment.id,
							"endsAt",
							fromDateTimeLocalValue(
								event.target.value,
								dashboard?.clinicSettings?.profile?.timezone,
							),
						)
					}
				/>
			</label>
			{/* min(300px, 100%): иначе колонка держит 300px в более узком
			контейнере и содержимое карточки уезжает за правый край. */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns:
						"repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
					gap: "24px",
					marginBottom: "16px",
					gridColumn: "1 / -1",
				}}
			>
				<div className="min-w-0">
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
						Пациент
					</span>
					{useManualSelects ||
					(dashboard?.patients ?? []).length > 20 ? (
						<select
							value={String(appointmentDraft.patientId ?? "")}
							onChange={(e) =>
								updateAppointmentScheduleDraft(
									appointment.id,
									"patientId",
									e.target.value,
								)
							}
							disabled={
								appointment.id === dashboard?.activeVisit?.appointmentId
							}
							className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
							aria-describedby={
								appointmentHasOpenVisit
									? appointmentHandoffNoteId
									: undefined
							}
						>
							<option value="">-- Выберите пациента --</option>
							{activePatients.map((p) => (
								<option key={p.id} value={p.id}>
									{p.fullName}
								</option>
							))}
						</select>
					) : (
						<div className="flex flex-wrap gap-1.5 min-w-0">
							{activePatients.map((patient) => (
								<button
									key={patient.id}
									type="button"
									className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.patientId === patient.id ? "active" : ""}`}
									title={patient.fullName}
									onClick={() =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"patientId",
											patient.id,
										)
									}
									disabled={
										appointment.id ===
										dashboard?.activeVisit?.appointmentId
									}
								>
									<span className="truncate">{patient.fullName}</span>
								</button>
							))}
						</div>
					)}
				</div>

				<div className="min-w-0">
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
						Врач
					</span>
					{useManualSelects ? (
						<select
							value={String(appointmentDraft.doctorUserId ?? "")}
							onChange={(e) => {
								const newDocId = e.target.value;
								updateAppointmentScheduleDraft(
									appointment.id,
									"doctorUserId",
									newDocId,
								);
								const doc = (
									dashboard?.clinicSettings?.staff ?? []
								).find((m) => m.id === newDocId);
								if (doc?.specialties?.length) {
									const matchingChair = (
										dashboard?.clinicSettings?.chairs ?? []
									).find(
										(c) =>
											c.active &&
											c.specialization &&
											doc.specialties.includes(c.specialization),
									);
									if (matchingChair) {
										if (
											matchingChair.id !==
											appointmentDraft.chairId
										) {
											updateAppointmentScheduleDraft(
												appointment.id,
												"chairId",
												matchingChair.id,
											);
										}
									}
								}
							}}
							className="w-full min-h-[44px] p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
						>
							<option value="">-- Выберите врача --</option>
							{activeDoctors.map((m) => (
								<option key={m.id} value={m.id}>
									{m.fullName}
								</option>
							))}
						</select>
					) : (
						<div className="flex flex-wrap gap-1.5 min-w-0">
							{activeDoctors.map((member) => (
								<button
									key={member.id}
									type="button"
									className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.doctorUserId === member.id ? "active" : ""}`}
									title={member.fullName}
									onClick={() => {
										updateAppointmentScheduleDraft(
											appointment.id,
											"doctorUserId",
											member.id,
										);
										if (member.specialties?.length) {
											const matchingChair = (dashboard?.clinicSettings?.chairs ?? []).find(
												(c) =>
													c.active &&
													c.specialization &&
													member.specialties.includes(c.specialization),
											);
											if (matchingChair && matchingChair.id !== appointmentDraft.chairId) {
												updateAppointmentScheduleDraft(
													appointment.id,
													"chairId",
													matchingChair.id,
												);
											}
										}
									}}
								>
									<span className="truncate">{member.fullName}</span>
								</button>
							))}
						</div>
					)}
				</div>

				{dashboard?.clinicSettings?.profile?.mode !== "one_chair" &&
					activeAssistants.length > 0 && (
					<div className="min-w-0">
						<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
							Ассистент
						</span>
						<div className="flex flex-wrap gap-1.5 min-w-0">
							{activeAssistants.map((member) => (
								<button
									key={member.id}
									type="button"
									className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.assistantUserId === member.id ? "active" : ""}`}
									title={member.fullName}
									onClick={() =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"assistantUserId",
											appointmentDraft.assistantUserId === member.id
												? ""
												: member.id,
										)
									}
								>
									<span className="truncate">{member.fullName}</span>
								</button>
							))}
						</div>
					</div>
				)}

				<div className="min-w-0">
					<span className="text-xs font-semibold text-[var(--muted)] block mb-2">
						Кресло
					</span>
					<div className="flex flex-wrap gap-1.5 min-w-0">
						{activeChairs.map((chair) => (
								<button
									key={chair.id}
									type="button"
									className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.chairId === chair.id ? "active" : ""}`}
									title={chair.name}
									onClick={() =>
										updateAppointmentScheduleDraft(
											appointment.id,
											"chairId",
											chair.id,
										)
									}
								>
									<span className="truncate">{chair.name}</span>
								</button>
							))}
					</div>
				</div>

				<div className="min-w-0">
					<span className="text-xs font-semibold text-[var(--muted)] block mb-1.5">
						Статус приема
					</span>
					<select
						className="appointment-status-select w-full max-w-xs min-h-[44px] px-2.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none hover:border-[var(--teal,var(--brand-primary))] transition-colors"
						value={String(appointmentDraft?.status || appointment.status)}
						onChange={(e) => {
							updateAppointmentScheduleDraft(
								appointment.id,
								"status",
								normalizedAppointmentStatus(e.target.value as Appointment["status"]),
							);
						}}
						disabled={
							appointmentHasOpenVisit &&
							Boolean(
								activeVisitLockedAppointmentStatuses?.has?.(
									(appointmentDraft?.status || appointment.status) as any,
								),
							)
						}
						aria-label="Статус приема"
					>
						{Object.keys(appointmentLabels ?? {}).map((key) => {
							const statusKey = key as Appointment["status"];
							return (
								<option
									key={statusKey}
									value={statusKey}
									disabled={Boolean(
										appointmentHasOpenVisit &&
											activeVisitLockedAppointmentStatuses?.has?.(statusKey),
									)}
								>
									{appointmentLabels?.[statusKey] ?? statusKey}
								</option>
							);
						})}
					</select>
					<div className="mt-2">
						<AppointmentQuickActions
							appointmentId={appointment.id}
							currentStatus={(appointmentDraft?.status || appointment.status) as Appointment["status"]}
							patientName={appointmentPatientName || "Пациент"}
							patientPhone={appointmentPatient?.phone}
							doctorName={appointmentDoctor?.fullName}
							doctorSpecialty={
								appointmentDoctor?.specialties?.[0]
									? specialtyLabels[appointmentDoctor.specialties[0]]
									: undefined
							}
							startsAt={appointment.startsAt}
							treatmentReason={appointment.reason}
							cabinetName={appointmentChair?.name}
							appointmentHasOpenVisit={appointmentHasOpenVisit}
							activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
							onStatusChange={(newStatus, noteAppend) => {
								updateAppointmentScheduleDraft(
									appointment.id,
									"status",
									normalizedAppointmentStatus(newStatus),
								);
								if (noteAppend) {
									const existingComment =
										appointmentDraft?.comment ?? appointment.comment ?? "";
									const updatedComment = existingComment
										? `${existingComment}\n[${noteAppend}]`
										: `[${noteAppend}]`;
									updateAppointmentScheduleDraft(
										appointment.id,
										"comment",
										updatedComment,
									);
								}
							}}
							disabled={appointmentSaveState === "saving"}
						/>
					</div>
					{appointmentHasOpenVisit && (
						<div
							id={appointmentHandoffNoteId}
							className="status-blocker-note appointment-handoff-note text-xs mt-1 font-medium p-2 rounded break-words"
						>
							Статус приема заблокирован: по этому приему открыт
							активный визит. Завершите или отмените визит в рабочем
							месте врача (закройте прием перед закрывающим статусом
							записи).
						</div>
					)}
				</div>
			</div>
			<label className="form-span-2 min-w-0">
				Причина
				<input
					className="w-full"
					value={String(appointmentDraft.reason || "")}
					onChange={(event: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(
							appointment.id,
							"reason",
							event.target.value,
						)
					}
				/>
				<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
					{[
						"Кариес",
						"Пульпит",
						"Удаление",
						"Осмотр",
						"Профгигиена",
						"Консультация",
						"Брекеты",
						"Коронка",
						"КЛКТ",
						"Имплантация",
					].map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => {
								const currentVal = String(
									appointmentDraft.reason || "",
								).trim();
								const newVal = currentVal
									? `${currentVal}, ${chip.toLowerCase()}`
									: chip;
								updateAppointmentScheduleDraft(
									appointment.id,
									"reason",
									newVal,
								);
							}}
							className="quick-chip quick-chip--sm max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center"
						>
							+ {chip}
						</button>
					))}
				</div>
			</label>
			<label className="form-span-2 min-w-0">
				Комментарий
				<textarea
					className="w-full"
					value={String(appointmentDraft.comment || "")}
					onChange={(event: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(
							appointment.id,
							"comment",
							event.target.value,
						)
					}
					rows={2}
				/>
				<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
					{[
						"Первичный",
						"Боль",
						"Осмотр",
						"Консультация",
						"Снимки",
					].map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => {
								const currentVal = String(
									appointmentDraft.comment || "",
								).trim();
								const newVal = currentVal
									? `${currentVal}, ${chip.toLowerCase()}`
									: chip;
								updateAppointmentScheduleDraft(
									appointment.id,
									"comment",
									newVal,
								);
							}}
							className="quick-chip quick-chip--sm max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center"
						>
							+ {chip}
						</button>
					))}
				</div>
			</label>
			<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
				<div
					className="min-h-reserved-error min-w-0"
					style={{ flex: 1, flexDirection: "column" }}
				>
					{appointmentSaveError ? (
						<span className="save-error break-words">{appointmentSaveError}</span>
					) : null}
					{collision.hasCollision ? (
						<div
							className="schedule-create-missing schedule-save-missing min-w-0 break-words"
							id={`appointment-collision-${appointment?.id ?? ""}`}
							role="alert"
						>
							<strong style={{ color: "var(--bad-fg)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
								<AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
								<span>{collision.message}</span>
							</strong>
						</div>
					) : null}
					{(appointmentMissingSteps ?? []).length ? (
						<div
							className="schedule-create-missing schedule-save-missing min-w-0 break-words"
							id={appointmentSaveMissingId}
							role="status"
							aria-live="polite"
						>
							<strong>Чтобы сохранить запись, исправьте:</strong>
							<ul>
								{(appointmentMissingSteps ?? []).map((step) => (
									<li key={step} className="break-words">{step}</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
				<div className="flex items-center gap-2 flex-wrap shrink-0">
					<span
						className={`save-state save-state-${appointmentSaveState} break-words`}
					>
						{appointmentSaveState === "saving"
							? "Сохраняю"
							: appointmentSaveState === "saved"
								? "Сохранено"
								: appointmentSaveState === "error"
									? "Ошибка сохранения"
									: appointmentDirty
										? "Изменения не сохранены"
										: "Изменений нет"}
					</span>
					<button
						className="secondary-button min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold cursor-pointer shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors inline-flex items-center justify-center"
						type="button"
						disabled={appointmentSaveState === "saving"}
						aria-busy={appointmentSaveState === "saving" || undefined}
						onClick={() => {
							closeAppointmentEditor(appointment.id);
						}}
					>
						Закрыть
					</button>
					<button
						className="primary-button min-h-[44px] min-w-[44px] px-4.5 py-2 text-xs font-bold cursor-pointer shrink-0 rounded-lg bg-[var(--teal-dark)] text-white hover:brightness-110 active:scale-95 transition-all shadow-2xs border border-transparent inline-flex items-center justify-center"
						type="button"
						onClick={() => void saveAppointmentSchedule(appointment.id)}
						disabled={appointmentSaveState === "saving"}
						aria-busy={appointmentSaveState === "saving" || undefined}
						aria-describedby={
							collision.hasCollision
								? `appointment-collision-${appointment?.id ?? ""}`
								: !appointmentReadyToSave &&
										(appointmentMissingSteps ?? []).length
									? appointmentSaveMissingId
									: undefined
						}
					>
						Сохранить запись
					</button>
				</div>
			</div>
		</section>
	);
}
