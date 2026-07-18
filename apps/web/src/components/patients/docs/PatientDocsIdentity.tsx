import { UserCircle } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientDocsIdentity() {
	const appLogic = useAppLogicContext();
	const { patientAdministrativeProfileDraft } = usePatientStore();
	const { updatePatientAdministrativeProfileDraft } = appLogic;

	return (
		<section className="docs-section-card">
			<div className="docs-section-header">
				<div className="docs-section-icon">
					<UserCircle size={24} />
				</div>
				<div className="docs-section-title">
					<h3>Личные документы</h3>
					<p>Паспорт, ИНН, СНИЛС</p>
				</div>
			</div>
			<div className="docs-form-grid">
				<div className="docs-form-group">
					<label>Документ пациента</label>
					<input
						autoComplete="off"
						className="dente-input"
						placeholder="паспорт РФ 00 00 000000"
						value={patientAdministrativeProfileDraft.identityDocument || ""}
						onChange={(e: TextFieldChangeEvent) =>
							updatePatientAdministrativeProfileDraft(
								"identityDocument",
								e.target.value,
							)
						}
					/>
				</div>
				<div className="docs-form-group">
					<label>ИНН</label>
					<input
						inputMode="numeric"
						autoComplete="off"
						pattern="[0-9]*"
						className="dente-input"
						placeholder="10 или 12 цифр"
						value={patientAdministrativeProfileDraft.taxpayerInn || ""}
						onChange={(e: TextFieldChangeEvent) =>
							updatePatientAdministrativeProfileDraft(
								"taxpayerInn",
								e.target.value.replace(/[^\d]/g, "").slice(0, 12),
							)
						}
					/>
				</div>
				<div className="docs-form-group">
					<label>СНИЛС</label>
					<input
						inputMode="numeric"
						autoComplete="off"
						pattern="[0-9 -]*"
						className="dente-input"
						placeholder="000-000-000 00"
						value={patientAdministrativeProfileDraft.snils || ""}
						onChange={(e: TextFieldChangeEvent) =>
							updatePatientAdministrativeProfileDraft("snils", e.target.value)
						}
					/>
				</div>
			</div>
		</section>
	);
}
