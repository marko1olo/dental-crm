import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function WarrantyServiceMemoForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                textarea,
                warrantyServiceOrWorkName,
                event,
                setWarrantyServiceOrWorkName,
                warrantyServiceOrWorkNameValue,
                input,
                warrantyCompletedAt,
                setWarrantyCompletedAt,
                warrantyTeethOrArea,
                setWarrantyTeethOrArea,
                warrantyTeethOrAreaValue,
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
                warrantyLinkedActOrContractValue,
                warrantyDoctorFullName,
                setWarrantyDoctorFullName,
                activeDoctor,
                warrantyIssuedAt,
                setWarrantyIssuedAt,
                warrantyPolicyApplied,
                setWarrantyPolicyApplied,
                warrantyAftercareReceived,
                setWarrantyAftercareReceived,
                warrantyControlVisitsUnderstood,
                setWarrantyControlVisitsUnderstood
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Гарантийная памятка</h3>
    								<p>
    									Условия контроля, гарантийный срок, обязанности пациента и
    									признаки для срочной связи.
    								</p>
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
    									}}
    								>
    									✏️ Ручная корректировка полей (развернуть)
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
    												onChange={(event) =>
    													setWarrantyCompletedAt(event.target.value)
    												}
    												placeholder="дата финального этапа"
    											/>
    										</label>
    										<label>
    											Зубы или область
    											<input
    												value={warrantyTeethOrArea}
    												onChange={(event) =>
    													setWarrantyTeethOrArea(event.target.value)
    												}
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
    											onChange={(event) =>
    												setWarrantyPeriod(event.target.value)
    											}
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
    												onChange={(event) =>
    													setWarrantyIssuedAt(event.target.value)
    												}
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
