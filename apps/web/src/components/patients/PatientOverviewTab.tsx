import { Dashboard } from "@dental/shared";
import { motion } from "framer-motion";
import { UserCheck } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../hooks/useWorkspaceProfile";
import { usePatientStore } from "../../store/patientStore";
import { formatPhoneNumber } from "../../utils/inputSanitation";
import { PatientJourneyTimeline } from "../PatientJourneyTimeline";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { OrthodonticProgressWidget } from "./OrthodonticProgressWidget";
import { PatientFamilyCard } from "./PatientFamilyCard";
import { PatientLoyaltyHeader } from "./PatientLoyaltyHeader";
import { PatientNoShowRisk } from "./PatientNoShowRisk";
import { PatientReclamationsWidget } from "./PatientReclamationsWidget";
import { PatientTaskTicketsWidget } from "./PatientTaskTicketsWidget";

type TextFieldChangeEvent = React.ChangeEvent<
	HTMLInputElement | HTMLTextAreaElement
>;

export function PatientOverviewTab() {
	const appLogic = useAppLogicContext();
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
	} = usePatientStore();
	const workspaceFlags = useWorkspaceProfile();
	const dashboard = appLogic.dashboard;
	const { savePatientCore, updatePatientCoreDraft, selectedPatient } = appLogic;

	const patientCoreReadyToSave =
		patientCoreDraft.fullName.trim().length > 0 && patientCoreDirty;
	const patientCoreSaveGuidance =
		patientCoreSaveState === "error"
			? "Ошибка сохранения"
			: patientCoreSaveState === "saved"
				? "Сохранено"
				: null;
	const patientCoreSaveGuidanceId = "patientCoreSaveGuidanceId";
	const [familyData, setFamilyData] = useState<any>(null);

	useEffect(() => {
		if (selectedPatientId) {
			fetch(`/api/finance/family/patient/${selectedPatientId}`, {
				headers: denteAdminSecretRequestHeaders(),
			})
				.then((res) => {
					if (!res.ok) throw new Error("No family");
					return res.json();
				})
				.then((data) => setFamilyData(data))
				.catch(() => setFamilyData(null));
		} else {
			setFamilyData(null);
		}
	}, [selectedPatientId]);

	return (
		<>
			<div className="panel-heading compact-heading patients-no-border-mb-8">
				<div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
					<span
						style={{
							fontSize: "14px",
							fontWeight: 600,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: "8px",
						}}
					>
						Карточка пациента
						{dashboard?.activeVisit?.patientId === selectedPatientId && (
							<span
								title="Пациент сейчас находится в клинике (Активный приём)"
								style={{
									width: "8px",
									height: "8px",
									borderRadius: "50%",
									backgroundColor: "var(--emerald)",
									display: "inline-block",
									boxShadow: "0 0 8px var(--emerald)",
								}}
							/>
						)}
					</span>
					{selectedPatientId && (
						<PatientLoyaltyHeader patientId={selectedPatientId} />
					)}
				</div>
				<span
					className={`status-pill status-${patientCoreSaveState === "error" || patientAdministrativeProfileSaveState === "error" ? "cancelled" : "confirmed"}`}
				>
					{patientCoreSaveState === "saving"
						? "сохранение"
						: patientAdministrativeProfileSaveState === "saving"
							? "сохранение"
							: patientCoreSaveState === "error" ||
									patientAdministrativeProfileSaveState === "error"
								? "ошибка"
								: patientCoreDirty || patientAdministrativeProfileDirty
									? "Ждет сохранения"
									: "сохранено"}
				</span>
			</div>
			<div
				className="clinic-profile-form-grid patient-core-form-grid"
				style={{
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
				}}
			>
				<label className="form-span-2">
					ФИО пациента
					<input
						autoComplete="name"
						value={patientCoreDraft.fullName}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft("fullName", event.target.value)
						}
						placeholder="Фамилия Имя Отчество"
					/>
				</label>
				<label>
					Дата рождения
					<input
						type="date"
						autoComplete="bday"
						value={patientCoreDraft.birthDate}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft("birthDate", event.target.value)
						}
					/>
				</label>
				<label>
					Телефон
					<input
						type="tel"
						inputMode="tel"
						autoComplete="tel"
						value={patientCoreDraft.phone}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft(
								"phone",
								formatPhoneNumber(event.target.value),
							)
						}
						placeholder="+7..."
					/>
				</label>
				<label>
					Email
					<input
						type="email"
						autoComplete="email"
						value={patientCoreDraft.email}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientCoreDraft("email", event.target.value)
						}
						placeholder="patient@example.ru"
					/>
				</label>
				<div className="form-span-2 patients-flex-col-gap-4">
					<div className="patients-flex-between">
						<span
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--muted)",
							}}
						>
							Заметки для команды
						</span>
						<SmartMicrophoneButton
							context="general"
							onResult={(t) => {
								const prev = patientCoreDraft.notes || "";
								updatePatientCoreDraft("notes", prev ? `${prev}, ${t}` : t);
							}}
						/>
					</div>
					<textarea
						value={patientCoreDraft.notes}
						onChange={(e) => updatePatientCoreDraft("notes", e.target.value)}
						placeholder="важное для связи, приема и документов"
						style={{
							width: "100%",
							padding: "8px 12px",
							borderRadius: "8px",
							border: "1px solid var(--line)",
							fontSize: "14px",
							resize: "vertical",
						}}
					/>
					<div className="patients-chips-row">
						{[
							"Очень тревожный",
							"Сложный пациент",
							"VIP",
							"Просит звонить заранее",
							"Часто отменяет",
							"Плохо переносит анестезию",
							"Должник",
							"Рвотный рефлекс",
						].map((chip) => (
							<button
								key={chip}
								type="button"
								onClick={() => {
									const currentVal = patientCoreDraft.notes.trim();
									const chipLower = chip.toLowerCase();
									if (currentVal.toLowerCase().includes(chipLower)) return;
									const newVal = currentVal
										? `${currentVal}, ${chipLower}`
										: chipLower;
									updatePatientCoreDraft("notes", newVal);
								}}
								style={{
									padding: "2px 8px",
									fontSize: "12px",
									background: "var(--paper-strong)",
									border: "1px solid var(--slate-200)",
									borderRadius: "12px",
									cursor: "pointer",
									color: "var(--slate-700)",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = "var(--slate-200)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = "var(--slate-100)";
								}}
							>
								+ {chip}
							</button>
						))}
					</div>
				</div>
			</div>
			<div className="patient-admin-actions patients-mt-16-flex">
				<button
					className="primary-button"
					type="button"
					onClick={savePatientCore}
					aria-busy={patientCoreSaveState === "saving" || undefined}
					aria-describedby={
						patientCoreSaveGuidance ? patientCoreSaveGuidanceId : undefined
					}
					disabled={!patientCoreReadyToSave}
				>
					<UserCheck aria-hidden="true" /> Сохранить карточку
				</button>
			</div>
			{patientCoreSaveGuidance ? (
				<p
					className="patient-save-guidance"
					id={patientCoreSaveGuidanceId}
					role="status"
					aria-live="polite"
				>
					{patientCoreSaveGuidance}
				</p>
			) : null}

			<div
				className="patient-clinical-grid patients-my-0"
				style={{ marginTop: "16px" }}
			>
				<div className="clinical-col-left" style={{ flex: 1 }}>
					<PatientFamilyCard
						patientId={selectedPatientId}
						patientName={selectedPatient?.fullName || null}
						familyData={familyData}
						onFamilyDataChanged={() => {
							if (selectedPatientId) {
								fetch(`/api/finance/family/patient/${selectedPatientId}`, {
									headers: denteAdminSecretRequestHeaders(),
								})
									.then((res) => {
										if (!res.ok) throw new Error("No family");
										return res.json();
									})
									.then((data) => setFamilyData(data))
									.catch(() => setFamilyData(null));
							}
						}}
					/>

					{selectedPatientId && (
						<PatientJourneyTimeline
							patientId={selectedPatientId}
							dashboard={dashboard}
						/>
					)}
				</div>
				<div className="clinical-col-right" style={{ flex: 1 }}>
					{selectedPatientId && (
						<PatientNoShowRisk patientId={selectedPatientId} />
					)}

					{selectedPatientId && workspaceFlags.hasOrthodontics && (
						<OrthodonticProgressWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && workspaceFlags.hasReclamations && (
						<PatientReclamationsWidget patientId={selectedPatientId} />
					)}

					{selectedPatientId && workspaceFlags.hasTasks && (
						<PatientTaskTicketsWidget patientId={selectedPatientId} />
					)}
				</div>
			</div>
		</>
	);
}
