import { UserCircle } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { formatPhoneNumber } from "../../../utils/inputSanitation";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientDocsRepresentative() {
	const appLogic = useAppLogicContext();
	const { patientAdministrativeProfileDraft } = usePatientStore();
	const { updatePatientAdministrativeProfileDraft } = appLogic;

	return (
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
							patientAdministrativeProfileDraft.legalRepresentativePhone || ""
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
							patientAdministrativeProfileDraft.preferredDocumentRecipient || ""
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
	);
}
