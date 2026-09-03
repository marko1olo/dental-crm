import React from "react";
import { FileEdit, ShieldCheck, Zap } from "lucide-react";
import { AnamnesisField } from "../AnamnesisField";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";

interface PatientIntakeQuestionnaireFormProps {
	activeVisitComplaint?: string | null;
}

export const PatientIntakeQuestionnaireForm: React.FC<
	PatientIntakeQuestionnaireFormProps
> = React.memo(({ activeVisitComplaint }) => {
	const intakeChiefComplaint = useDocumentStore(
		(state) => state.intakeChiefComplaint,
	);
	const setIntakeChiefComplaint = useDocumentStore(
		(state) => state.setIntakeChiefComplaint,
	);
	const intakeAllergyStatus = useDocumentStore(
		(state) => state.intakeAllergyStatus,
	);
	const setIntakeAllergyStatus = useDocumentStore(
		(state) => state.setIntakeAllergyStatus,
	);
	const intakeCurrentMedications = useDocumentStore(
		(state) => state.intakeCurrentMedications,
	);
	const setIntakeCurrentMedications = useDocumentStore(
		(state) => state.setIntakeCurrentMedications,
	);
	const intakeChronicConditions = useDocumentStore(
		(state) => state.intakeChronicConditions,
	);
	const setIntakeChronicConditions = useDocumentStore(
		(state) => state.setIntakeChronicConditions,
	);
	const intakePregnancyStatus = useDocumentStore(
		(state) => state.intakePregnancyStatus,
	);
	const setIntakePregnancyStatus = useDocumentStore(
		(state) => state.setIntakePregnancyStatus,
	);
	const intakeEmergencyContact = useDocumentStore(
		(state) => state.intakeEmergencyContact,
	);
	const setIntakeEmergencyContact = useDocumentStore(
		(state) => state.setIntakeEmergencyContact,
	);
	const intakeAnticoagulants = useDocumentStore(
		(state) => state.intakeAnticoagulants,
	);
	const setIntakeAnticoagulants = useDocumentStore(
		(state) => state.setIntakeAnticoagulants,
	);
	const intakeInfectiousRiskNotes = useDocumentStore(
		(state) => state.intakeInfectiousRiskNotes,
	);
	const setIntakeInfectiousRiskNotes = useDocumentStore(
		(state) => state.setIntakeInfectiousRiskNotes,
	);
	const intakeCardioEndocrineNotes = useDocumentStore(
		(state) => state.intakeCardioEndocrineNotes,
	);
	const setIntakeCardioEndocrineNotes = useDocumentStore(
		(state) => state.setIntakeCardioEndocrineNotes,
	);
	const intakeAdditionalNotes = useDocumentStore(
		(state) => state.intakeAdditionalNotes,
	);
	const setIntakeAdditionalNotes = useDocumentStore(
		(state) => state.setIntakeAdditionalNotes,
	);
	const intakeAccuracyConfirmed = useDocumentStore(
		(state) => state.intakeAccuracyConfirmed,
	);
	const setIntakeAccuracyConfirmed = useDocumentStore(
		(state) => state.setIntakeAccuracyConfirmed,
	);

	const handleFillNormInOneClick = () => {
		if (!intakeChiefComplaint.trim()) {
			setIntakeChiefComplaint(activeVisitComplaint || "Плановый осмотр (жалоб нет)");
		}
		setIntakeAllergyStatus("Аллергии и нежелательные реакции со слов пациента не отмечены.");
		setIntakeCurrentMedications("Постоянные препараты со слов пациента не принимает.");
		setIntakeChronicConditions("Хронические заболевания со слов пациента отрицает.");
		setIntakeAnticoagulants("Антикоагулянты и дезагреганты со слов пациента не принимает.");
		setIntakeInfectiousRiskNotes("Инфекционные риски (гепатиты B/C, ВИЧ, туберкулез) не заявлены.");
		setIntakeCardioEndocrineNotes("Сердечно-сосудистые и эндокринные патологии со слов пациента отрицает.");
		setIntakePregnancyStatus("not_applicable");
		setIntakeAccuracyConfirmed(true);
		showToast("Анкета заполнена нормой: соматически здоров, противопоказаний нет", "success", 3500);
	};

	return (
		<article className="document-payload-card">
			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<h3>Анкета о состоянии здоровья</h3>
					<p>
						Жалобы, аллергии, соматический статус, хронические диагнозы, постоянная
						фармакотерапия и специфические риски перед вмешательством.
					</p>
				</div>
				<button
					type="button"
					onClick={handleFillNormInOneClick}
					className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
					data-testid="btn-intake-fill-norm"
					title="1 клик: заполнить все поля анкеты физиологической нормой (соматически здоров)"
				>
					<Zap size={16} />
					<span>Пациент соматически здоров / Противопоказаний нет (1 клик)</span>
				</button>
			</div>
			<details
				className="document-manual-override"
				style={{
					background: "var(--surface-100)",
					padding: "12px 16px",
					borderRadius: "8px",
					border: "1px solid var(--line)",
					marginTop: "16px",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 600,
						color: "var(--brand-700)",
						userSelect: "none",
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
					}}
				>
					<FileEdit size={14} className="text-slate-500 shrink-0" aria-hidden="true" />
					<span>Ручная корректировка полей (развернуть)</span>
				</summary>
				<div
					className="document-payload-collapsed-content"
					style={{
						marginTop: "16px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<label>
						Жалоба или цель визита
						<textarea
							value={intakeChiefComplaint}
							onChange={(event) =>
								setIntakeChiefComplaint(event.target.value)
							}
							placeholder={activeVisitComplaint ?? "со слов пациента"}
							rows={2}
						/>
					</label>
					<AnamnesisField
						label="Аллергии и нежелательные реакции"
						value={intakeAllergyStatus}
						onChange={setIntakeAllergyStatus}
						placeholder="на что бывала реакция: препараты, латекс, металлы, анестетики"
						denialText="Аллергии и нежелательные реакции со слов пациента не отмечены."
					/>
					<AnamnesisField
						label="Постоянные препараты"
						value={intakeCurrentMedications}
						onChange={setIntakeCurrentMedications}
						placeholder="что пациент принимает постоянно и в какой дозе"
						denialText="Постоянные препараты со слов пациента не принимает."
						denialLabel="Со слов пациента — не принимает"
					/>
					<AnamnesisField
						label="Хронические заболевания"
						value={intakeChronicConditions}
						onChange={setIntakeChronicConditions}
						placeholder="диабет, гипертония, гепатит, эпилепсия и другое"
						denialText="Хронические заболевания со слов пациента отрицает."
						denialLabel="Со слов пациента — отрицает"
					/>
					<div className="document-payload-row">
						<label>
							Беременность/лактация
							<select
								value={intakePregnancyStatus}
								onChange={(event) =>
									setIntakePregnancyStatus(
										event.target.value as any,
									)
								}
							>
								<option value="not_applicable">Не применимо / отрицает</option>
								<option value="pregnant_first_trimester">Беременность 1 триместр</option>
								<option value="pregnant_second_trimester">Беременность 2 триместр</option>
								<option value="pregnant_third_trimester">Беременность 3 триместр</option>
								<option value="lactating">Период грудного вскармливания</option>
							</select>
						</label>
						<label>
							Экстренный контакт
							<input
								value={intakeEmergencyContact}
								onChange={(event) =>
									setIntakeEmergencyContact(event.target.value)
								}
								placeholder="ФИО и телефон, если пациент сообщил"
							/>
						</label>
					</div>
					<AnamnesisField
						label="Антикоагулянты и кровотечения"
						value={intakeAnticoagulants}
						onChange={setIntakeAnticoagulants}
						placeholder="варфарин, ксарелто, аспирин; были ли долгие кровотечения"
						denialText="Антикоагулянты и препараты, влияющие на кровотечение, со слов пациента не принимает."
						denialLabel="Со слов пациента — не принимает"
					/>
					<AnamnesisField
						label="Инфекционные риски"
						value={intakeInfectiousRiskNotes}
						onChange={setIntakeInfectiousRiskNotes}
						placeholder="гепатит, ВИЧ, туберкулёз и другое, о чём сообщил пациент"
						denialText="Инфекционные риски со слов пациента не заявлены."
						denialLabel="Со слов пациента — не заявлены"
					/>
					<label>
						Сердце, давление, диабет и системные риски
						<textarea
							value={intakeCardioEndocrineNotes}
							onChange={(event) =>
								setIntakeCardioEndocrineNotes(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Дополнительно
						<textarea
							value={intakeAdditionalNotes}
							onChange={(event) =>
								setIntakeAdditionalNotes(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={intakeAccuracyConfirmed}
							type="checkbox"
							onChange={(event) =>
								setIntakeAccuracyConfirmed(event.target.checked)
							}
						/>
						Пациент подтвердил достоверность сведений
					</label>
				</div>
			</details>
		</article>
	);
});

PatientIntakeQuestionnaireForm.displayName = "PatientIntakeQuestionnaireForm";
