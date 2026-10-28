import React from "react";
import type { XrayCbctReferralPregnancyStatus, XrayCbctReferralStudyType } from "@dental/shared";
import { useDocumentStore } from "../../../../store/documentStore";

export interface XrayReferralFieldsProps {
	renderClinicalToothRowsEditor?: (() => React.ReactNode) | undefined;
	inferredTreatmentArea?: string | null | undefined;
	normalizedXrayStudyType?: ((val: string) => XrayCbctReferralStudyType) | undefined;
	typedXrayStudyTypeOptions?: Array<{ value: XrayCbctReferralStudyType; label: string }> | undefined;
	normalizedXrayPriority?: ((val: string) => any) | undefined;
	normalizedXrayPregnancyStatus?: ((val: string) => XrayCbctReferralPregnancyStatus) | undefined;
	typedXrayPregnancyStatusOptions?: Array<{ value: XrayCbctReferralPregnancyStatus; label: string }> | undefined;
	activeDoctorFullName?: string | null | undefined;
}

export const XrayReferralFields: React.FC<XrayReferralFieldsProps> = React.memo(
	function XrayReferralFields({
		renderClinicalToothRowsEditor,
		inferredTreatmentArea,
		normalizedXrayStudyType = (v) => v as XrayCbctReferralStudyType,
		typedXrayStudyTypeOptions = [],
		normalizedXrayPriority = (v) => v,
		normalizedXrayPregnancyStatus = (v) => v as XrayCbctReferralPregnancyStatus,
		typedXrayPregnancyStatusOptions = [],
		activeDoctorFullName,
	}) {
		const {
			xrayStudyType, setXrayStudyType,
			xrayArea, setXrayArea,
			xrayClinicalQuestion, setXrayClinicalQuestion,
			xrayIndication, setXrayIndication,
			xrayPriority, setXrayPriority,
			xrayPregnancyStatus, setXrayPregnancyStatus,
			xraySafetyNotes, setXraySafetyNotes,
			xrayIncludeDicomExport, setXrayIncludeDicomExport,
			xrayIncludeRadiologistReport, setXrayIncludeRadiologistReport,
			xrayRequestedBy, setXrayRequestedBy,
			xrayRecipientClinic, setXrayRecipientClinic,
			xrayDueDate, setXrayDueDate,
		} = useDocumentStore();

		return (
			<div className="document-payload-collapsed-content" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
				{typeof renderClinicalToothRowsEditor === "function" ? renderClinicalToothRowsEditor() : null}
				<label>
					Вид исследования
					<select value={xrayStudyType} onChange={(e) => setXrayStudyType(normalizedXrayStudyType(e.target.value))}>
						{typedXrayStudyTypeOptions.map((o) => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))}
					</select>
				</label>
				<label>
					Область
					<input value={xrayArea} onChange={(e) => setXrayArea(e.target.value)} placeholder={inferredTreatmentArea || "зуб / сегмент / челюсть"} />
				</label>
				<label>
					Клинический вопрос
					<textarea value={xrayClinicalQuestion} onChange={(e) => setXrayClinicalQuestion(e.target.value)} placeholder="что нужно подтвердить или исключить" rows={2} />
				</label>
				<label>
					Показание
					<textarea value={xrayIndication} onChange={(e) => setXrayIndication(e.target.value)} placeholder="эндодонтия / имплантация / хирургия / ортодонтия / контроль" rows={2} />
				</label>
				<div className="document-payload-row">
					<label>
						Срочность
						<select value={xrayPriority} onChange={(e) => setXrayPriority(normalizedXrayPriority(e.target.value))}>
							<option value="routine">Планово</option>
							<option value="urgent">Срочно</option>
						</select>
					</label>
					<label>
						Беременность
						<select value={xrayPregnancyStatus} onChange={(e) => setXrayPregnancyStatus(normalizedXrayPregnancyStatus(e.target.value))}>
							{typedXrayPregnancyStatusOptions.map((o) => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
					</label>
				</div>
				<label>
					Ограничения и защита
					<textarea value={xraySafetyNotes} onChange={(e) => setXraySafetyNotes(e.target.value)} rows={2} />
				</label>
				<div className="document-payload-row">
					<label className="document-payload-checkbox">
						<input checked={xrayIncludeDicomExport} type="checkbox" onChange={(e) => setXrayIncludeDicomExport(e.target.checked)} />
						Нужны исходные файлы снимков
					</label>
					<label className="document-payload-checkbox">
						<input checked={xrayIncludeRadiologistReport} type="checkbox" onChange={(e) => setXrayIncludeRadiologistReport(e.target.checked)} />
						Нужен отчет рентгенолога
					</label>
				</div>
				<label>
					Назначил
					<input value={xrayRequestedBy} onChange={(e) => setXrayRequestedBy(e.target.value)} placeholder={activeDoctorFullName ?? "лечащий врач"} />
				</label>
				<div className="document-payload-row">
					<label>
						Куда направить
						<input value={xrayRecipientClinic} onChange={(e) => setXrayRecipientClinic(e.target.value)} placeholder="свой кабинет / партнерский центр" />
					</label>
					<label>
						Срок
						<input value={xrayDueDate} onChange={(e) => setXrayDueDate(e.target.value)} placeholder="например: до имплантации" />
					</label>
				</div>
			</div>
		);
	},
);
