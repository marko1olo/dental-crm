import { ShieldCheck } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientDocsPersonalDataConsent() {
	const appLogic = useAppLogicContext();
	const { patientAdministrativeProfileDraft } = usePatientStore();
	const { updatePatientAdministrativeProfileDraft } = appLogic;

	return (
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
	);
}
