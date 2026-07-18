import { ShieldCheck } from "lucide-react";
import "./PatientDocsTab.css";
import { useId } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { usePatientStore } from "../../store/patientStore";
import { PatientDocsIdentity } from "./docs/PatientDocsIdentity";
import { PatientDocsRepresentative } from "./docs/PatientDocsRepresentative";
import { PatientDocsAddress } from "./docs/PatientDocsAddress";
import { PatientDocsInsurance } from "./docs/PatientDocsInsurance";
import { PatientDocsPersonalDataConsent } from "./docs/PatientDocsPersonalDataConsent";
import { PatientDocsAppointmentPreferences } from "./docs/PatientDocsAppointmentPreferences";
import { PatientGeneratedDocumentsList } from "./docs/PatientGeneratedDocumentsList";

export function PatientDocsTab() {
	const appLogic = useAppLogicContext();
	const {
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
	} = usePatientStore();
	const {
		savePatientAdministrativeProfile,
		patientAdministrativeProfileValidationMessage,
	} = appLogic;
	const patientAdministrativeProfileReadyToSave =
		patientAdministrativeProfileDirty;

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

			<PatientDocsIdentity />
			<PatientDocsRepresentative />
			<PatientDocsInsurance />
			<PatientDocsAddress />
			<PatientDocsPersonalDataConsent />
			<PatientDocsAppointmentPreferences />

			<PatientGeneratedDocumentsList />
		</div>
	);
}
