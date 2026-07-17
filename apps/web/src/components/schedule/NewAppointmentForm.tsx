import type { Appointment, Dashboard } from "@dental/shared";
import { Bot, Plus } from "lucide-react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import type { AppointmentScheduleDraft } from "../../AppHelpers";
import { DictationHints } from "../../DictationHints";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { smartBookingParser } from "../../lib/smartBookingParser";
import { SmartParsePreview } from "../../SmartParsePreview";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type NewAppointmentFormProps = {
	dashboard: Dashboard;
	appointmentLabels: Record<Appointment["status"], string>;
	newAppointmentDraft: AppointmentScheduleDraft;
	newAppointmentSaveState: string;
	newAppointmentError: string | null;
	updateNewAppointmentDraft: <K extends keyof AppointmentScheduleDraft>(
		key: K,
		value: AppointmentScheduleDraft[K],
	) => void;
	createAppointmentFromDraft: () => Promise<boolean>;
	resetNewAppointmentDraft: () => void;
	toDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	fromDateTimeLocalValue: (value: string, timeZone?: string | null) => string;
	useManualSelects: boolean;
	setUseManualSelects: (val: boolean) => void;
};

export function NewAppointmentForm(props: NewAppointmentFormProps) {
	const {
		dashboard,
		appointmentLabels,
		newAppointmentDraft,
		newAppointmentSaveState,
		newAppointmentError,
		updateNewAppointmentDraft,
		createAppointmentFromDraft,
		resetNewAppointmentDraft,
		toDateTimeLocalValue,
		fromDateTimeLocalValue,
		useManualSelects,
		setUseManualSelects,
	} = props;

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [smartInputText, setSmartInputText] = useState("");
	const [showSmartPreview, setShowSmartPreview] = useState(false);
	const [smartParsedData, setSmartParsedData] = useState<any>(null);
	const [showHints, setShowHints] = useState(false);

	const workspaceFlags = useWorkspaceProfile();

	const newAppointmentStartsAtMs = Date.parse(newAppointmentDraft.startsAt);
	const newAppointmentEndsAtMs = Date.parse(newAppointmentDraft.endsAt);
	const newAppointmentMissingSteps = [
		!newAppointmentDraft.patientId ? "выберите пациента" : null,
		!newAppointmentDraft.doctorUserId ? "выберите врача" : null,
		dashboard.clinicSettings.profile.mode !== "solo_doctor" &&
		workspaceFlags.hasAssistants &&
		dashboard.clinicSettings.staff.some(
			(s) => s.role === "assistant" && s.active,
		) &&
		!newAppointmentDraft.assistantUserId
			? "выберите ассистента"
			: null,
		workspaceFlags.hasMultipleChairs && !newAppointmentDraft.chairId
			? "выберите кресло"
			: null,
		!newAppointmentDraft.startsAt.trim() ? "укажите начало приема" : null,
		newAppointmentDraft.startsAt.trim() &&
		!Number.isFinite(newAppointmentStartsAtMs)
			? "проверьте дату начала"
			: null,
		!newAppointmentDraft.endsAt.trim() ? "укажите окончание приема" : null,
		newAppointmentDraft.endsAt.trim() &&
		!Number.isFinite(newAppointmentEndsAtMs)
			? "проверьте дату окончания"
			: null,
		Number.isFinite(newAppointmentStartsAtMs) &&
		Number.isFinite(newAppointmentEndsAtMs) &&
		newAppointmentEndsAtMs <= newAppointmentStartsAtMs
			? "окончание должно быть позже начала"
			: null,
	].filter((step): step is string => Boolean(step));
	const newAppointmentReadyToCreate = newAppointmentMissingSteps.length === 0;

	return (
		<div className="appointment-create-wrapper" aria-label="Создание записи">
			<div
				className="appointment-create-editor"
				style={{
					position: "absolute",
					opacity: 0,
					pointerEvents: "none",
					width: 0,
					height: 0,
					overflow: "hidden",
				}}
			>
				<input
					type="datetime-local"
					value={toDateTimeLocalValue(
						newAppointmentDraft.startsAt,
						dashboard.clinicSettings.profile.timezone,
					)}
					onChange={(event) =>
						updateNewAppointmentDraft(
							"startsAt",
							fromDateTimeLocalValue(
								event.target.value,
								dashboard.clinicSettings.profile.timezone,
							),
						)
					}
				/>
				<input
					type="datetime-local"
					value={toDateTimeLocalValue(
						newAppointmentDraft.endsAt,
						dashboard.clinicSettings.profile.timezone,
					)}
					onChange={(event) =>
						updateNewAppointmentDraft(
							"endsAt",
							fromDateTimeLocalValue(
								event.target.value,
								dashboard.clinicSettings.profile.timezone,
							),
						)
					}
				/>
				<select
					value={newAppointmentDraft.patientId || ""}
					onChange={(e) =>
						updateNewAppointmentDraft("patientId", e.target.value)
					}
				>
					<option value="">-- Выберите пациента --</option>
					{dashboard.patients.map((p) => (
						<option key={p.id} value={p.id}>
							{p.fullName}
						</option>
					))}
				</select>
				<select
					value={newAppointmentDraft.doctorUserId || ""}
					onChange={(e) =>
						updateNewAppointmentDraft("doctorUserId", e.target.value)
					}
				>
					<option value="">-- Выберите врача --</option>
					{dashboard.clinicSettings.staff.map((m) => (
						<option key={m.id} value={m.id}>
							{m.fullName}
						</option>
					))}
				</select>
				{workspaceFlags.hasAssistants && (
					<select
						value={newAppointmentDraft.assistantUserId || ""}
						onChange={(e) =>
							updateNewAppointmentDraft("assistantUserId", e.target.value)
						}
					>
						<option value="">-- выбрать ассистента --</option>
						<option value="">-- без ассистента --</option>
						{dashboard.clinicSettings.staff.map(
							(m) =>
								m.role === "assistant" &&
								m.active && (
									<option key={m.id} value={m.id}>
										{m.fullName}
									</option>
								),
						)}
					</select>
				)}
				<select
					value={newAppointmentDraft.chairId || ""}
					onChange={(e) => updateNewAppointmentDraft("chairId", e.target.value)}
				>
					<option value="">-- Выберите кресло --</option>
					{dashboard.clinicSettings.chairs.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</select>
				<select
					value={newAppointmentDraft.status || ""}
					onChange={(e) =>
						updateNewAppointmentDraft("status", e.target.value as any)
					}
				>
					{Object.keys(appointmentLabels).map((status) => (
						<option key={status} value={status}>
							{appointmentLabels[status as Appointment["status"]]}
						</option>
					))}
				</select>
				<div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
					<input
						type="text"
						placeholder="Услуга / Причина (например: Кариес, Осмотр)"
						value={newAppointmentDraft.reason}
						onChange={(event) =>
							updateNewAppointmentDraft("reason", event.target.value)
						}
					/>
					<div className="chip-templates-row">
						{[
							"Осмотр",
							"Кариес",
							"Пульпит",
							"Профгигиена",
							"Удаление",
							"Консультация",
							"Снятие швов",
						].map((t) => (
							<button
								key={t}
								type="button"
								className="chip-template-button"
								onClick={() => updateNewAppointmentDraft("reason", t)}
							>
								{t}
							</button>
						))}
					</div>
				</div>
				<textarea
					placeholder="Комментарий (опционально)"
					value={newAppointmentDraft.comment}
					onChange={(event) =>
						updateNewAppointmentDraft("comment", event.target.value)
					}
				/>
				<div className="appointment-editor-actions">
					<button
						className="primary-button"
						type="button"
						onClick={() => void createAppointmentFromDraft()}
					>
						Сохранить новую запись
					</button>
				</div>
			</div>

			<div className="smart-ai-booking">
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						width: "100%",
					}}
				>
					<Bot size={18} color="var(--brand-600)" style={{ flexShrink: 0 }} />
					<div
						style={{ position: "relative", flex: 1 }}
						onBlur={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget as Node)) {
								setShowHints(false);
							}
						}}
					>
						<input
							type="text"
							value={smartInputText}
							placeholder="Например: Петров на чистку завтра в 12:30 (Нажмите Enter)"
							onFocus={() => setShowHints(true)}
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
								setShowCreateForm(true); // Open form to review
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
						width: "100%",
						flexWrap: "wrap",
						gap: "8px",
					}}
				>
					<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
						<button
							className="text-button"
							type="button"
							onClick={() => setShowCreateForm((v) => !v)}
							style={{
								fontSize: "13px",
								color: "var(--muted)",
								textDecoration: "underline",
							}}
						>
							{showCreateForm
								? "Скрыть ручной ввод"
								: "Показать все поля / Ручной ввод"}
						</button>
						{showCreateForm && (
							<label
								style={{
									fontSize: "13px",
									color: "var(--muted)",
									display: "flex",
									alignItems: "center",
									gap: "4px",
									cursor: "pointer",
								}}
							>
								<input
									type="checkbox"
									checked={useManualSelects}
									onChange={(e) => setUseManualSelects(e.target.checked)}
								/>
								Классические списки
							</label>
						)}
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
							style={{
								padding: "6px 16px",
								minHeight: "32px",
								whiteSpace: "nowrap",
							}}
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
				<div className="appointment-editor">
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
							gap: "16px",
							marginBottom: "16px",
						}}
					>
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

					<div className="appointment-editor-grid">
						<div>
							<span className="appointment-editor-label">Пациент</span>
							{useManualSelects || dashboard.patients.length > 20 ? (
								<select
									value={newAppointmentDraft.patientId || ""}
									onChange={(e) =>
										updateNewAppointmentDraft("patientId", e.target.value)
									}
									className="appointment-editor-select"
								>
									<option value="">-- Выберите пациента --</option>
									{dashboard.patients
										.filter((p) => p.status === "active")
										.map((p) => (
											<option key={p.id} value={p.id}>
												{p.fullName}
											</option>
										))}
								</select>
							) : (
								<div className="appointment-editor-chips">
									{dashboard.patients
										.filter((patient) => patient.status === "active")
										.map((patient) => (
											<button
												key={patient.id}
												type="button"
												className={`quick-chip ${newAppointmentDraft.patientId === patient.id ? "active" : ""}`}
												onClick={() =>
													updateNewAppointmentDraft("patientId", patient.id)
												}
											>
												{patient.fullName}
											</button>
										))}
								</div>
							)}
						</div>

						<div>
							<span className="appointment-editor-label">Врач</span>
							{useManualSelects ? (
								<select
									value={newAppointmentDraft.doctorUserId || ""}
									onChange={(e) =>
										updateNewAppointmentDraft("doctorUserId", e.target.value)
									}
									className="appointment-editor-select"
								>
									<option value="">-- Выберите врача --</option>
									{dashboard.clinicSettings.staff
										.filter(
											(m) =>
												m.active && (m.role === "doctor" || m.role === "owner"),
										)
										.map((m) => (
											<option key={m.id} value={m.id}>
												{m.fullName}
											</option>
										))}
								</select>
							) : (
								<div className="appointment-editor-chips">
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
							)}
						</div>

						{workspaceFlags.hasAssistants &&
							dashboard.clinicSettings.staff.some(
								(m) => m.role === "assistant" && m.active,
							) && (
								<div className="form-field">
									<span className="appointment-editor-label">Ассистент</span>
									<div className="appointment-editor-chips">
										<button
											type="button"
											className={`quick-chip ${!newAppointmentDraft.assistantUserId ? "active" : ""}`}
											onClick={() =>
												updateNewAppointmentDraft("assistantUserId", "")
											}
										>
											Без ассистента
										</button>
										{dashboard.clinicSettings.staff
											.filter((m) => m.role === "assistant" && m.active)
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

						{workspaceFlags.hasMultipleChairs && (
							<div>
								<span className="appointment-editor-label">Кресло</span>
								<div className="appointment-editor-chips">
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
						)}

						<div>
							<span className="appointment-editor-label">Статус</span>
							<div className="appointment-editor-chips">
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
							className="appointment-editor-chips"
							style={{ marginTop: "8px" }}
						>
							{[
								"Кариес",
								"Пульпит",
								"Удаление",
								"Осмотр",
								"Профгигиена",
								"Консультация",
								workspaceFlags.hasOrthodontics && "Брекеты",
								workspaceFlags.hasDentalLab && "Коронка",
								"КЛКТ",
								"Имплантация",
							]
								.filter((chip): chip is string => Boolean(chip))
								.map((chip) => (
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
							className="appointment-editor-chips"
							style={{ marginTop: "8px" }}
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
							<strong>Чтобы создать запись, осталось:</strong>
							<ul>
								{newAppointmentMissingSteps.map((step) => (
									<li key={step}>{step}</li>
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
							Сбросить
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
