import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function WarrantyServiceMemoForm({
	activeDoctor,
	warrantyLinkedActOrContractValue,
	warrantyServiceOrWorkNameValue,
	warrantyTeethOrAreaValue,
}: any) {
	const {
		warrantyServiceOrWorkName,
		setWarrantyServiceOrWorkName,
		warrantyCompletedAt,
		setWarrantyCompletedAt,
		warrantyTeethOrArea,
		setWarrantyTeethOrArea,
		warrantyMaterialsOrSystems,
		setWarrantyMaterialsOrSystems,
		warrantyPeriod,
		setWarrantyPeriod,
		warrantyControlVisitSchedule,
		setWarrantyControlVisitSchedule,
		warrantyPatientObligations,
		setWarrantyPatientObligations,
		warrantyExcludedRiskFactors,
		setWarrantyExcludedRiskFactors,
		warrantyUrgentContactReasons,
		setWarrantyUrgentContactReasons,
		warrantyLinkedActOrContract,
		setWarrantyLinkedActOrContract,
		warrantyDoctorFullName,
		setWarrantyDoctorFullName,
		warrantyIssuedAt,
		setWarrantyIssuedAt,
		warrantyPolicyApplied,
		setWarrantyPolicyApplied,
		warrantyAftercareReceived,
		setWarrantyAftercareReceived,
		warrantyControlVisitsUnderstood,
		setWarrantyControlVisitsUnderstood,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Гарантийная памятка</h3>
				<p>
					Условия контроля, гарантийный срок, обязанности пациента и признаки
					для срочной связи.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Работа или услуга
						<textarea
							value={warrantyServiceOrWorkName}
							onChange={(event) =>
								setWarrantyServiceOrWorkName(event.target.value)
							}
							placeholder={warrantyServiceOrWorkNameValue()}
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Дата завершения
							<input
								value={warrantyCompletedAt}
								onChange={(event) => setWarrantyCompletedAt(event.target.value)}
								placeholder="дата финального этапа"
							/>
						</label>
						<label>
							Зубы или область
							<input
								value={warrantyTeethOrArea}
								onChange={(event) => setWarrantyTeethOrArea(event.target.value)}
								placeholder={warrantyTeethOrAreaValue()}
							/>
						</label>
					</div>
					<label>
						Материалы или системы
						<textarea
							value={warrantyMaterialsOrSystems}
							onChange={(event) =>
								setWarrantyMaterialsOrSystems(event.target.value)
							}
							placeholder="материал реставрации, конструкция, имплант-система"
							rows={2}
						/>
					</label>
					<label>
						Гарантийный срок и условия
						<textarea
							value={warrantyPeriod}
							onChange={(event) => setWarrantyPeriod(event.target.value)}
							rows={2}
						/>
					</label>
					<label>
						Контрольные визиты
						<textarea
							value={warrantyControlVisitSchedule}
							onChange={(event) =>
								setWarrantyControlVisitSchedule(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Обязанности пациента
						<textarea
							value={warrantyPatientObligations}
							onChange={(event) =>
								setWarrantyPatientObligations(event.target.value)
							}
							rows={4}
						/>
					</label>
					<label>
						Требует отдельной оценки
						<textarea
							value={warrantyExcludedRiskFactors}
							onChange={(event) =>
								setWarrantyExcludedRiskFactors(event.target.value)
							}
							rows={4}
						/>
					</label>
					<label>
						Срочно связаться с клиникой
						<textarea
							value={warrantyUrgentContactReasons}
							onChange={(event) =>
								setWarrantyUrgentContactReasons(event.target.value)
							}
							rows={4}
						/>
					</label>
					<label>
						Связанный акт или договор
						<input
							value={warrantyLinkedActOrContract}
							onChange={(event) =>
								setWarrantyLinkedActOrContract(event.target.value)
							}
							placeholder={warrantyLinkedActOrContractValue()}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Врач
							<input
								value={warrantyDoctorFullName}
								onChange={(event) =>
									setWarrantyDoctorFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "лечащий врач"}
							/>
						</label>
						<label>
							Выдано
							<input
								value={warrantyIssuedAt}
								onChange={(event) => setWarrantyIssuedAt(event.target.value)}
							/>
						</label>
					</div>
					<label className="document-payload-checkbox">
						<input
							checked={warrantyPolicyApplied}
							type="checkbox"
							onChange={(event) =>
								setWarrantyPolicyApplied(event.target.checked)
							}
						/>
						Применено локальное гарантийное положение клиники
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={warrantyAftercareReceived}
							type="checkbox"
							onChange={(event) =>
								setWarrantyAftercareReceived(event.target.checked)
							}
						/>
						Пациент получил рекомендации после лечения
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={warrantyControlVisitsUnderstood}
							type="checkbox"
							onChange={(event) =>
								setWarrantyControlVisitsUnderstood(event.target.checked)
							}
						/>
						Пациент понимает обязательность контрольных визитов
					</label>
				</div>
			</details>
		</article>
	);
}
