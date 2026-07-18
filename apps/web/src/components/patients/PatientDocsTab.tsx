import { Dashboard } from "@dental/shared";
import {
	Briefcase,
	Clock,
	MapPin,
	ShieldCheck,
	UserCircle,
} from "lucide-react";
import "./PatientDocsTab.css";
import type React from "react";
import { useId } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { formatPhoneNumber } from "../../utils/inputSanitation";

type TextFieldChangeEvent = React.ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;
type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;

export function PatientDocsTab() {
	const appLogic = useAppLogicContext();
	const workspaceFlags = useWorkspaceProfile();
	const {
		selectedPatientId,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
	} = usePatientStore();
	const {
		savePatientAdministrativeProfile,
		updatePatientAdministrativeProfileDraft,
		patientAdministrativeProfileValidationMessage,
		weekdayOptions,
		normalizeOptionalWorkingDaysDraft,
	} = appLogic;
	const patientAdministrativeProfileReadyToSave =
		patientAdministrativeProfileDirty;
	// Use contracts from dashboard (already fetched) to avoid duplicate API calls
	const insuranceContracts: any[] =
		appLogic.dashboard?.insuranceContracts ?? [];

	const togglePatientAdministrativeProfileWorkingDay = (day: number) => {
		const days = patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
		if (days.includes(day)) {
			updatePatientAdministrativeProfileDraft(
				"preferredAppointmentWeekdays",
				days.filter((d) => d !== day),
			);
		} else {
			updatePatientAdministrativeProfileDraft("preferredAppointmentWeekdays", [
				...days,
				day,
			]);
		}
	};

	const patientAdministrativeSaveGuidanceId = useId();
	const patientAdministrativeSaveGuidance =
		patientAdministrativeProfileSaveState === "error"
			? patientAdministrativeProfileValidationMessage
			: patientAdministrativeProfileSaveState === "saved"
				? "Сохранено"
				: null;

	return (
		<div className="patient-docs-container">
			{/* Save State / Validation Header */}
			<div className="docs-save-bar">
				<div className="docs-save-status">
					<span>Реквизиты и данные пациента</span>
					<span
						className={`status-pill status-${patientAdministrativeProfileSaveState === "error" || patientAdministrativeProfileValidationMessage ? "cancelled" : "confirmed"}`}
					>
						{patientAdministrativeProfileSaveState === "saving"
							? "Сохранение..."
							: patientAdministrativeProfileSaveState === "saved"
								? "Сохранено"
								: patientAdministrativeProfileSaveState === "error" ||
										patientAdministrativeProfileValidationMessage
									? "Ошибка"
									: patientAdministrativeProfileDirty
										? "Ждет сохранения"
										: "Синхронизировано"}
					</span>
					{patientAdministrativeProfileValidationMessage && (
						<span
							style={{
								color: "rgb(239, 68, 68)",
								fontSize: "13px",
								marginLeft: "8px",
							}}
						>
							{patientAdministrativeProfileValidationMessage}
						</span>
					)}
					{patientAdministrativeSaveGuidance && (
						<span
							id={patientAdministrativeSaveGuidanceId}
							role="status"
							aria-live="polite"
							style={{
								color: "var(--muted)",
								fontSize: "13px",
								marginLeft: "8px",
							}}
						>
							{patientAdministrativeSaveGuidance}
						</span>
					)}
				</div>
				<button
					className="primary-button"
					type="button"
					onClick={savePatientAdministrativeProfile}
					aria-busy={
						patientAdministrativeProfileSaveState === "saving" || undefined
					}
					aria-describedby={
						patientAdministrativeSaveGuidance
							? patientAdministrativeSaveGuidanceId
							: undefined
					}
					disabled={!patientAdministrativeProfileReadyToSave}
				>
					<ShieldCheck
						aria-hidden="true"
						size={16}
						style={{ marginRight: "8px" }}
					/>
					Сохранить данные
				</button>
			</div>

			{/* Identity & Legal */}
			<section className="docs-section-card">
				<div className="docs-section-header">
					<div className="docs-section-icon">
						<UserCircle size={24} />
					</div>
					<div className="docs-section-title">
						<h3>Личные документы</h3>
						<p>Паспорт, ИНН, СНИЛС и законный представитель</p>
					</div>
				</div>
				<div className="docs-form-grid">
					<div className="docs-form-group">
						<label>Документ пациента</label>
						<input
							autoComplete="off"
							value={patientAdministrativeProfileDraft.identityDocument || ""}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"identityDocument",
									event.target.value,
								)
							}
							placeholder="паспорт РФ 00 00 000000"
						/>
					</div>
					<div className="docs-form-group">
						<label>ИНН</label>
						<input
							inputMode="numeric"
							autoComplete="off"
							pattern="[0-9]*"
							value={patientAdministrativeProfileDraft.taxpayerInn || ""}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"taxpayerInn",
									event.target.value.replace(/[^\d]/g, "").slice(0, 12),
								)
							}
							placeholder="10 или 12 цифр"
						/>
					</div>
					<div className="docs-form-group">
						<label>СНИЛС</label>
						<input
							inputMode="numeric"
							autoComplete="off"
							pattern="[0-9 -]*"
							value={patientAdministrativeProfileDraft.snils || ""}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"snils",
									event.target.value,
								)
							}
							placeholder="000-000-000 00"
						/>
					</div>
					<details
						className="docs-advanced-details"
						style={{ gridColumn: "1 / -1", marginTop: "1rem" }}
					>
						<summary
							style={{
								cursor: "pointer",
								fontWeight: 500,
								color: "var(--brand-600)",
								padding: "0.5rem 0",
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
							}}
						>
							<UserCircle size={16} /> Расширенные данные (Представитель, выдача
							документов)
						</summary>
						<div className="docs-form-grid" style={{ marginTop: "1rem" }}>
							<div className="docs-form-group">
								<label>Законный представитель (ФИО)</label>
								<input
									autoComplete="off"
									value={
										patientAdministrativeProfileDraft.legalRepresentativeFullName ||
										""
									}
									onChange={(event: TextFieldChangeEvent) =>
										updatePatientAdministrativeProfileDraft(
											"legalRepresentativeFullName",
											event.target.value,
										)
									}
									placeholder="ФИО родителя или опекуна"
								/>
							</div>
							<div className="docs-form-group">
								<label>Документ представителя</label>
								<input
									autoComplete="off"
									value={
										patientAdministrativeProfileDraft.legalRepresentativeIdentityDocument ||
										""
									}
									onChange={(event: TextFieldChangeEvent) =>
										updatePatientAdministrativeProfileDraft(
											"legalRepresentativeIdentityDocument",
											event.target.value,
										)
									}
									placeholder="паспорт / доверенность"
								/>
							</div>
							<div className="docs-form-group">
								<label>Основание представительства</label>
								<input
									autoComplete="off"
									value={
										patientAdministrativeProfileDraft.legalRepresentativeRelationship ||
										""
									}
									onChange={(event: TextFieldChangeEvent) =>
										updatePatientAdministrativeProfileDraft(
											"legalRepresentativeRelationship",
											event.target.value,
										)
									}
									placeholder="родитель, доверенность"
								/>
							</div>
							<div className="docs-form-group">
								<label>Телефон представителя</label>
								<input
									type="tel"
									inputMode="tel"
									autoComplete="tel"
									value={
										patientAdministrativeProfileDraft.legalRepresentativePhone ||
										""
									}
									onChange={(event: TextFieldChangeEvent) =>
										updatePatientAdministrativeProfileDraft(
											"legalRepresentativePhone",
											formatPhoneNumber(event.target.value),
										)
									}
									placeholder="+7..."
								/>
							</div>
							<div className="docs-form-group">
								<label>Кому выдавать документы (Результаты, справки)</label>
								<input
									autoComplete="off"
									value={
										patientAdministrativeProfileDraft.preferredDocumentRecipient ||
										""
									}
									onChange={(event: TextFieldChangeEvent) =>
										updatePatientAdministrativeProfileDraft(
											"preferredDocumentRecipient",
											event.target.value,
										)
									}
									placeholder="лично, по почте, представителю"
								/>
							</div>
						</div>
					</details>
				</div>
			</section>

			{/* Insurance (DMS / VHI) */}
			{workspaceFlags.hasInsuranceCoPay && (
			<section className="docs-section-card">
				<div className="docs-section-header">
					<div className="docs-section-icon">
						<Briefcase size={24} />
					</div>
					<div className="docs-section-title">
						<h3>Страхование (ДМС)</h3>
						<p>Договор со страховой и номер полиса пациента</p>
					</div>
				</div>
				<div className="docs-form-grid">
					<div className="docs-form-group">
						<label>Страховая компания (Договор)</label>
						<select
							value={
								patientAdministrativeProfileDraft.insuranceContractId || ""
							}
							onChange={(event: SelectChangeEvent) => {
								updatePatientAdministrativeProfileDraft(
									"insuranceContractId",
									event.target.value,
								);
								if (!event.target.value) {
									updatePatientAdministrativeProfileDraft(
										"insurancePolicyNumber",
										"",
									);
								}
							}}
							style={{
								padding: "8px 12px",
								borderRadius: "8px",
								border: "1px solid var(--line)",
							}}
						>
							<option value="">-- Без страховки (Наличный расчет) --</option>
							{insuranceContracts
								.filter((c: any) => c.isActive)
								.map((c: any) => (
									<option key={c.id} value={c.id}>
										{c.insuranceCompanyName} (договор {c.contractNumber})
									</option>
								))}
						</select>
					</div>
					<div className="docs-form-group">
						<label>Номер полиса ДМС</label>
						<input
							autoComplete="off"
							value={
								patientAdministrativeProfileDraft.insurancePolicyNumber || ""
							}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"insurancePolicyNumber",
									event.target.value,
								)
							}
							placeholder="Например, номер с карточки ДМС"
							disabled={!patientAdministrativeProfileDraft.insuranceContractId}
						/>
					</div>
				</div>
			</section>
			)}

			{/* Address */}
			<section className="docs-section-card">
				<div className="docs-section-header">
					<div className="docs-section-icon">
						<MapPin size={24} />
					</div>
					<div className="docs-section-title">
						<h3>Адреса</h3>
						<p>Регистрация и фактическое место жительства</p>
					</div>
				</div>
				<div className="docs-form-grid">
					<div className="docs-form-group full-width">
						<label>Адрес регистрации</label>
						<input
							autoComplete="street-address"
							value={
								patientAdministrativeProfileDraft.registrationAddress || ""
							}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"registrationAddress",
									event.target.value,
								)
							}
							placeholder="индекс, город, улица, дом, квартира"
						/>
					</div>
					<div className="docs-form-group full-width">
						<label>Адрес проживания (если отличается)</label>
						<input
							autoComplete="street-address"
							value={patientAdministrativeProfileDraft.residentialAddress || ""}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"residentialAddress",
									event.target.value,
								)
							}
							placeholder="индекс, город, улица, дом, квартира"
						/>
					</div>
				</div>
			</section>

			{/* Personal Data & Consent (152-ФЗ) */}
			<section className="docs-section-card">
				<div className="docs-section-header">
					<div className="docs-section-icon">
						<ShieldCheck size={24} />
					</div>
					<div className="docs-section-title">
						<h3>Персональные данные и согласия</h3>
						<p>Основания обработки ПДн по 152-ФЗ</p>
					</div>
				</div>
				<div className="docs-form-grid">
					<div className="docs-form-group full-width">
						<label>Основание обработки ПДн</label>
						<input
							autoComplete="off"
							value={
								patientAdministrativeProfileDraft.dataProcessingBasisNote || ""
							}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"dataProcessingBasisNote",
									event.target.value,
								)
							}
							placeholder="согласие пациента, договор на мед. услуги, 323-ФЗ"
						/>
					</div>
				</div>
			</section>

			{/* Appointment Preferences */}
			<section className="docs-section-card">
				<div className="docs-section-header">
					<div className="docs-section-icon">
						<Clock size={24} />
					</div>
					<div className="docs-section-title">
						<h3>Предпочтения по записи</h3>
						<p>Когда пациенту удобно посещать клинику</p>
					</div>
				</div>
				<div className="docs-form-grid">
					<div className="docs-form-group full-width">
						<label>Удобные дни недели</label>
						<div
							className="weekday-toggle-row"
							role="group"
							aria-label="Удобные дни записи"
						>
							{weekdayOptions.map((day) => {
								const weekdaySelected =
									patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(
										day.value,
									);
								return (
									<button
										aria-pressed={weekdaySelected}
										className={weekdaySelected ? "active" : ""}
										key={`patient-weekday-${day.value}`}
										type="button"
										onClick={() => {
											const currentDays =
												patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
											const nextDays = weekdaySelected
												? currentDays.filter((item) => item !== day.value)
												: [...currentDays, day.value];
											updatePatientAdministrativeProfileDraft(
												"preferredAppointmentWeekdays",
												normalizeOptionalWorkingDaysDraft(nextDays),
											);
										}}
									>
										{day.label}
									</button>
								);
							})}
						</div>
					</div>
					<div className="docs-form-group">
						<label>Удобно с (время)</label>
						<input
							type="time"
							value={
								patientAdministrativeProfileDraft.preferredAppointmentStart ||
								""
							}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"preferredAppointmentStart",
									event.target.value,
								)
							}
						/>
					</div>
					<div className="docs-form-group">
						<label>Удобно до (время)</label>
						<input
							type="time"
							value={
								patientAdministrativeProfileDraft.preferredAppointmentEnd || ""
							}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"preferredAppointmentEnd",
									event.target.value,
								)
							}
						/>
					</div>
					<div className="docs-form-group full-width">
						<label>Комментарий к записи (пожелания)</label>
						<input
							autoComplete="off"
							value={
								patientAdministrativeProfileDraft.preferredAppointmentNote || ""
							}
							onChange={(event: TextFieldChangeEvent) =>
								updatePatientAdministrativeProfileDraft(
									"preferredAppointmentNote",
									event.target.value,
								)
							}
							placeholder="только утро, звонить после 19:00"
						/>
					</div>
				</div>
			</section>
		</div>
	);
}
