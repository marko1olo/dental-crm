import type { ClinicProfileDraft } from "../../../AppHelpers";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";

/**
 * Оператор персональных данных: реквизиты клиники, которые форма только
 * показывает. Поля заполняются в настройках клиники, здесь они read-only — как
 * и было в DocumentsView.tsx.
 *
 * Тип НЕ объявляется здесь заново. Раньше рядом стоял свой `DocumentClinicOperator`
 * с теми же четырьмя строками — вторая копия реквизитов клиники, которая молча
 * разошлась бы с настоящим черновиком профиля при первом же переименовании поля.
 * `Pick` от `ClinicProfileDraft` (AppHelpers.tsx) даёт ровно те же четыре
 * обязательных строки и ломает сборку здесь, если поле переименуют там.
 */
export type DocumentClinicOperator = Pick<ClinicProfileDraft, "legalName" | "clinicName" | "inn" | "address">;

export interface PersonalDataProcessingConsentFormProps {
	/** Черновик профиля клиники: оператор, ИНН и адрес для согласия на ПДн. */
	clinicProfileDraft: DocumentClinicOperator;
}

/**
 * Согласие на обработку персональных данных: цели, категории, передачи, отзыв.
 * Вынесено из DocumentsView.tsx дословно.
 */
export function PersonalDataProcessingConsentForm({ clinicProfileDraft }: PersonalDataProcessingConsentFormProps) {
	const {
		personalDataActions,
		personalDataAutomatedDecisionAllowed,
		personalDataCategories,
		personalDataConsentGivenAt,
		personalDataCrossBorderAllowed,
		personalDataMedicalProcessingAcknowledged,
		personalDataPurposes,
		personalDataRetentionPeriod,
		personalDataRevocationChannel,
		personalDataTransferRules,
		personalDataVoluntaryConsentConfirmed,
		setPersonalDataActions,
		setPersonalDataAutomatedDecisionAllowed,
		setPersonalDataCategories,
		setPersonalDataConsentGivenAt,
		setPersonalDataCrossBorderAllowed,
		setPersonalDataMedicalProcessingAcknowledged,
		setPersonalDataPurposes,
		setPersonalDataRetentionPeriod,
		setPersonalDataRevocationChannel,
		setPersonalDataTransferRules,
		setPersonalDataVoluntaryConsentConfirmed,
	} = useDocumentStore();

	return (
		<DocumentPayloadCard
			title="Согласие на ПДн"
			description="Оператор, цели, категории данных, передачи и отзыв согласия без пустого шаблона."
		>
			<div className="document-payload-row">
				<label>
					Оператор
					<input
						value={clinicProfileDraft.legalName || clinicProfileDraft.clinicName}
						readOnly
						placeholder="заполните юридический профиль клиники"
					/>
				</label>
				<label>
					ИНН оператора
					<input value={clinicProfileDraft.inn} readOnly placeholder="из настроек клиники" />
				</label>
			</div>
			<label>
				Адрес оператора
				<input value={clinicProfileDraft.address} readOnly placeholder="из настроек клиники" />
			</label>
			<label>
				Цели обработки
				<textarea value={personalDataPurposes} onChange={(event) => setPersonalDataPurposes(event.target.value)} rows={4} />
			</label>
			<label>
				Категории данных
				<textarea value={personalDataCategories} onChange={(event) => setPersonalDataCategories(event.target.value)} rows={4} />
			</label>
			<label>
				Действия с данными
				<textarea value={personalDataActions} onChange={(event) => setPersonalDataActions(event.target.value)} rows={4} />
			</label>
			<label>
				Передача третьим лицам
				<textarea value={personalDataTransferRules} onChange={(event) => setPersonalDataTransferRules(event.target.value)} rows={3} />
			</label>
			<div className="document-payload-row">
				<label className="document-payload-checkbox">
					<input
						checked={personalDataCrossBorderAllowed}
						type="checkbox"
						onChange={(event) => setPersonalDataCrossBorderAllowed(event.target.checked)}
					/>
					Разрешена трансграничная передача
				</label>
				<label className="document-payload-checkbox">
					<input
						checked={personalDataAutomatedDecisionAllowed}
						type="checkbox"
						onChange={(event) => setPersonalDataAutomatedDecisionAllowed(event.target.checked)}
					/>
					Разрешены автоматизированные решения
				</label>
			</div>
			<label>
				Срок хранения
				<textarea
					value={personalDataRetentionPeriod}
					onChange={(event) => setPersonalDataRetentionPeriod(event.target.value)}
					rows={2}
				/>
			</label>
			<div className="document-payload-row">
				<label>
					Порядок отзыва
					<textarea
						value={personalDataRevocationChannel}
						onChange={(event) => setPersonalDataRevocationChannel(event.target.value)}
						rows={2}
					/>
				</label>
				<label>
					Дата согласия
					<input value={personalDataConsentGivenAt} onChange={(event) => setPersonalDataConsentGivenAt(event.target.value)} />
				</label>
			</div>
			<label className="document-payload-checkbox">
				<input
					checked={personalDataVoluntaryConsentConfirmed}
					type="checkbox"
					onChange={(event) => setPersonalDataVoluntaryConsentConfirmed(event.target.checked)}
				/>
				Пациент добровольно согласен на обработку персональных данных
			</label>
			<label className="document-payload-checkbox">
				<input
					checked={personalDataMedicalProcessingAcknowledged}
					type="checkbox"
					onChange={(event) => setPersonalDataMedicalProcessingAcknowledged(event.target.checked)}
				/>
				Пациент понимает обработку медицинских данных
			</label>
		</DocumentPayloadCard>
	);
}
