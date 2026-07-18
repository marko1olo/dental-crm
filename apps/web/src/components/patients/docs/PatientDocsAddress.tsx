import { MapPin } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientDocsAddress() {
	const appLogic = useAppLogicContext();
	const { patientAdministrativeProfileDraft } = usePatientStore();
	const { updatePatientAdministrativeProfileDraft } = appLogic;

	return (
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
						value={patientAdministrativeProfileDraft.registrationAddress || ""}
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
	);
}
