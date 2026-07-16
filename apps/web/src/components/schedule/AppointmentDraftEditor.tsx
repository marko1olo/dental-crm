import type { Appointment, Dashboard } from "@dental/shared";
import { Bot, Plus } from "lucide-react";
import type { ChangeEvent } from "react";
import { SmartMicrophoneButton } from "../../components/SmartMicrophoneButton";
import { DictationHints } from "../../DictationHints";
import { smartBookingParser } from "../../lib/smartBookingParser";
import { SmartParsePreview } from "../../SmartParsePreview";

type AppointmentScheduleDraft = {
	patientId: string;
	doctorUserId: string;
	assistantUserId: string;
	chairId: string;
	status: Appointment["status"];
	startsAt: string;
	endsAt: string;
	reason: string;
	comment: string;
};

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type AppointmentDraftEditorProps = {
	dashboard: Dashboard;
	newAppointmentDraft: AppointmentScheduleDraft;
	newAppointmentSaveState: "idle" | "saving" | "saved" | "error";
	newAppointmentReadyToCreate: boolean;
	newAppointmentMissingSteps: string[];
	newAppointmentError: string | null;
	smartInputText: string;
	showSmartPreview: boolean;
	smartParsedData: Partial<AppointmentScheduleDraft> | null;
	showHints: boolean;
	showCreateForm: boolean;
	appointmentLabels: Record<Appointment["status"], string>;
	setSmartInputText: (text: string) => void;
	setShowSmartPreview: (show: boolean) => void;
	setSmartParsedData: (data: Partial<AppointmentScheduleDraft> | null) => void;
	setShowHints: (show: boolean) => void;
	setShowCreateForm: (show: boolean | ((prev: boolean) => boolean)) => void;
	updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	createAppointmentFromDraft: () => Promise<boolean>;
	resetNewAppointmentDraft: () => void;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
};

export function AppointmentDraftEditor(props: AppointmentDraftEditorProps) {
	const {
		dashboard,
		newAppointmentDraft,
		newAppointmentSaveState,
		newAppointmentReadyToCreate,
		newAppointmentMissingSteps,
		newAppointmentError,
		smartInputText,
		showSmartPreview,
		smartParsedData,
		showHints,
		showCreateForm,
		appointmentLabels,
		setSmartInputText,
		setShowSmartPreview,
		setSmartParsedData,
		setShowHints,
		setShowCreateForm,
		updateNewAppointmentDraft,
		createAppointmentFromDraft,
		resetNewAppointmentDraft,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
	} = props;

	return (
		<div className="appointment-create-wrapper" aria-label="Создание записи">
			<div className="smart-ai-booking">
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Bot size={18} color="var(--brand-600)" />
					<div style={{ position: "relative", flex: 1 }}>
						<input
							type="text"
							value={smartInputText}
							placeholder="Например: Петров на чистку завтра в 12:30 (Нажмите Enter)"
							onFocus={() => setShowHints(true)}
							onBlur={(e) => {
								if (!e.currentTarget.contains(e.relatedTarget)) {
									setShowHints(false);
								}
							}}
							onChange={(e) => setSmartInputText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && smartInputText.trim()) {
									e.preventDefault();
									const parsed = smartBookingParser(smartInputText, dashboard);
									setSmartParsedData(parsed);
									setShowSmartPreview(true);
									setShowHints(false);
								}
							}}
							style={{
								width: "100%",
								padding: "12px 48px 12px 16px",
								borderRadius: "8px",
								border: "1px solid var(--slate-300)",
								fontSize: "15px",
								outline: "none",
							}}
						/>
						<SmartMicrophoneButton
							context="schedule"
							onResult={(text) => {
								setSmartInputText(text);
								const parsed = smartBookingParser(text, dashboard);
								setSmartParsedData(parsed);
								setShowSmartPreview(true);
								setShowHints(false);
							}}
							style={{
								position: "absolute",
								right: "8px",
								top: "50%",
								transform: "translateY(-50%)",
							}}
						/>
						<DictationHints isVisible={showHints} type="schedule" />
						<SmartParsePreview
							isVisible={showSmartPreview}
							parsedData={smartParsedData}
							rawText={smartInputText}
							type="schedule"
							onApply={(data: Record<string, string> | null) => {
								if (data) {
									if (data.patientId)
										updateNewAppointmentDraft("patientId", data.patientId);
									if (data.doctorUserId)
										updateNewAppointmentDraft(
											"doctorUserId",
											data.doctorUserId,
										);
									if (data.startsAt)
										updateNewAppointmentDraft("startsAt", data.startsAt);
									if (data.endsAt)
										updateNewAppointmentDraft("endsAt", data.endsAt);
									if (data.reason || data.service)
										updateNewAppointmentDraft(
											"reason",
											(data.reason || data.service) ?? "",
										);
									if (data.chairId)
										updateNewAppointmentDraft("chairId", data.chairId);
									if (data.comment || data.note)
										updateNewAppointmentDraft(
											"comment",
											(data.comment || data.note) ?? "",
										);
								}
								setShowSmartPreview(false);
								setSmartInputText("");
								setShowCreateForm(true);
							}}
							onManual={() => {
								setShowSmartPreview(false);
								setShowCreateForm(true);
							}}
							onClose={() => setShowSmartPreview(false)}
						/>
					</div>
				</div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
						<button
							className="text-button"
							type="button"
							onClick={() => setShowCreateForm((v: boolean) => !v)}
							style={{
								fontSize: "13px",
								color: "var(--slate-500)",
								textDecoration: "underline",
							}}
						>
							{showCreateForm
								? "Скрыть ручной ввод"
								: "Показать все поля / Ручной ввод"}
						</button>
					</div>
					<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
						{newAppointmentReadyToCreate ? (
							<span
								className="save-state save-state-idle"
								style={{ color: "var(--teal)" }}
							>
								✓ Готово к созданию
							</span>
						) : (
							<span
								className="save-state save-state-idle"
								style={{ color: "var(--amber)" }}
							>
								Заполните поля
							</span>
						)}
						<button
							className="primary-button"
							type="button"
							onClick={() => void createAppointmentFromDraft()}
							disabled={
								newAppointmentSaveState === "saving" ||
								!newAppointmentReadyToCreate
							}
							aria-busy={newAppointmentSaveState === "saving" || undefined}
							aria-describedby={
								!newAppointmentReadyToCreate
									? "new-appointment-create-missing"
									: undefined
							}
							style={{ padding: "6px 16px", minHeight: "32px" }}
						>
							<Plus
								size={16}
								aria-hidden="true"
								style={{ marginRight: "6px" }}
							/>{" "}
							Создать запись
						</button>
					</div>
				</div>
			</div>

			{showCreateForm && (
				<div className="appointment-editor schedule-create-form">
					<div className="schedule-create-form-grid">
						<label>
							Начало
							<input
								type="datetime-local"
								value={toDateTimeLocalValue(
									newAppointmentDraft.startsAt,
									dashboard.clinicSettings.profile.timezone,
								)}
								onChange={(event: TextFieldChangeEvent) =>
									updateNewAppointmentDraft(
										"startsAt",
										fromDateTimeLocalValue(
											event.target.value,
											dashboard.clinicSettings.profile.timezone,
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
									newAppointmentDraft.endsAt,
									dashboard.clinicSettings.profile.timezone,
								)}
								onChange={(event: TextFieldChangeEvent) =>
									updateNewAppointmentDraft(
										"endsAt",
										fromDateTimeLocalValue(
											event.target.value,
											dashboard.clinicSettings.profile.timezone,
										),
									)
								}
							/>
						</label>
					</div>

					<div className="schedule-entity-grid">
						<div>
							<span className="schedule-entity-label">Пациент</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
								<select
									value={newAppointmentDraft.patientId || ""}
									onChange={(e) =>
										updateNewAppointmentDraft("patientId", e.target.value)
									}
									style={{
										width: "100%",
										padding: "8px",
										borderRadius: "8px",
										border: "1px solid var(--slate-300)",
										fontSize: "14px",
										background: "var(--paper-soft)",
									}}
								>
									<option value="">-- Выберите пациента --</option>
									{dashboard.patients
										.filter((patient) => patient.status === "active")
										.map((patient) => (
											<option key={patient.id} value={patient.id}>
												{patient.fullName}
											</option>
										))}
								</select>
							</div>
						</div>

						<div>
							<span className="schedule-entity-label">Врач</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
								{dashboard.clinicSettings.staff
									.filter(
										(member) =>
											member.active &&
											(member.role === "doctor" || member.role === "owner"),
									)
									.map((member) => (
										<button
											key={member.id}
											type="button"
											className={`quick-chip ${newAppointmentDraft.doctorUserId === member.id ? "active" : ""}`}
											onClick={() =>
												updateNewAppointmentDraft("doctorUserId", member.id)
											}
										>
											{member.fullName}
										</button>
									))}
							</div>
						</div>

						{dashboard.clinicSettings.profile.mode !== "solo_doctor" && (
							<div>
								<span className="schedule-entity-label">Ассистент</span>
								<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
									{dashboard.clinicSettings.staff
										.filter(
											(member) => member.active && member.role === "assistant",
										)
										.map((member) => (
											<button
												key={member.id}
												type="button"
												className={`quick-chip ${newAppointmentDraft.assistantUserId === member.id ? "active" : ""}`}
												onClick={() =>
													updateNewAppointmentDraft(
														"assistantUserId",
														newAppointmentDraft.assistantUserId === member.id
															? ""
															: member.id,
													)
												}
											>
												{member.fullName}
											</button>
										))}
								</div>
							</div>
						)}

						<div>
							<span className="schedule-entity-label">Кресло</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
								{dashboard.clinicSettings.chairs
									.filter((chair) => chair.active)
									.map((chair) => (
										<button
											key={chair.id}
											type="button"
											className={`quick-chip ${newAppointmentDraft.chairId === chair.id ? "active" : ""}`}
											onClick={() =>
												updateNewAppointmentDraft("chairId", chair.id)
											}
										>
											{chair.name}
										</button>
									))}
							</div>
						</div>

						<div>
							<span className="schedule-entity-label">Статус</span>
							<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
								{(
									Object.keys(appointmentLabels) as Appointment["status"][]
								).map((status) => (
									<button
										key={status}
										type="button"
										className={`quick-chip ${newAppointmentDraft.status === status ? "active" : ""}`}
										onClick={() => updateNewAppointmentDraft("status", status)}
									>
										{appointmentLabels[status]}
									</button>
								))}
							</div>
						</div>
					</div>

					<label className="form-span-2">
						Причина записи
						<input
							value={newAppointmentDraft.reason}
							onChange={(event: TextFieldChangeEvent) =>
								updateNewAppointmentDraft("reason", event.target.value)
							}
						/>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								marginTop: "6px",
							}}
						>
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
										const currentVal = newAppointmentDraft.reason.trim();
										const newVal = currentVal
											? `${currentVal}, ${chip.toLowerCase()}`
											: chip;
										updateNewAppointmentDraft("reason", newVal);
									}}
									className="quick-chip quick-chip--sm"
								>
									+ {chip}
								</button>
							))}
						</div>
					</label>

					<label className="form-span-2">
						Комментарий
						<textarea
							value={newAppointmentDraft.comment}
							onChange={(event: TextFieldChangeEvent) =>
								updateNewAppointmentDraft("comment", event.target.value)
							}
							rows={2}
						/>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "6px",
								marginTop: "6px",
							}}
						>
							{[
								"Первичный",
								"Острая боль",
								"По ДМС",
								"Повторный",
								"Снимок с собой",
								"Требуется КТ",
							].map((chip) => (
								<button
									key={chip}
									type="button"
									onClick={() => {
										const currentVal = newAppointmentDraft.comment.trim();
										const newVal = currentVal
											? `${currentVal}, ${chip.toLowerCase()}`
											: chip;
										updateNewAppointmentDraft("comment", newVal);
									}}
									className="quick-chip quick-chip--sm"
								>
									+ {chip}
								</button>
							))}
						</div>
					</label>

					{!newAppointmentReadyToCreate ? (
						<div
							className="schedule-create-missing"
							id="new-appointment-create-missing"
							role="status"
							aria-live="polite"
						>
							<strong>Чтобы создать запись, укажите:</strong>
							<ul>
								{newAppointmentMissingSteps.map((step, i) => (
									<li key={i}>{step}</li>
								))}
							</ul>
						</div>
					) : null}
					<div className="appointment-editor-actions">
						{newAppointmentError ? (
							<span className="save-error">{newAppointmentError}</span>
						) : null}
						<button
							className="secondary-button"
							type="button"
							onClick={resetNewAppointmentDraft}
							disabled={newAppointmentSaveState === "saving"}
							aria-busy={newAppointmentSaveState === "saving" || undefined}
						>
							Отменить
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
