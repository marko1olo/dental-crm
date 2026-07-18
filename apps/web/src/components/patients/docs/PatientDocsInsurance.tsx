import { Briefcase } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { useWorkspaceProfile } from "../../../hooks/useWorkspaceProfile";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;

export function PatientDocsInsurance() {
	const appLogic = useAppLogicContext();
	const workspaceFlags = useWorkspaceProfile();
	const { patientAdministrativeProfileDraft } = usePatientStore();
	const { updatePatientAdministrativeProfileDraft } = appLogic;

	const insuranceContracts: any[] = appLogic.dashboard?.insuranceContracts ?? [];

	if (!workspaceFlags.hasInsuranceCoPay) {
		return null;
	}

	return (
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
						value={patientAdministrativeProfileDraft.insuranceContractId || ""}
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
						value={patientAdministrativeProfileDraft.insurancePolicyNumber || ""}
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
	);
}
