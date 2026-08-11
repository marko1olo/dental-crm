import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function LabWorkOrderForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                renderClinicalToothRowsEditor,
                label,
                input,
                labWorkType,
                event,
                setLabWorkType,
                labTeethOrArea,
                setLabTeethOrArea,
                inferredTreatmentArea,
                labMaterial,
                setLabMaterial,
                labShade,
                setLabShade,
                labSource,
                setLabSource,
                labDeadline,
                setLabDeadline,
                textarea,
                labTechnicianNotes,
                setLabTechnicianNotes
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Заявка в лабораторию</h3>
    								<p>Работа, зона, материал, цвет, источник данных и срок.</p>
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
    									{renderClinicalToothRowsEditor()}
    									<label>
    										Вид работы
    										<input
    											value={labWorkType}
    											onChange={(event) => setLabWorkType(event.target.value)}
    											placeholder="коронка / вкладка / каппа"
    										/>
    									</label>
    									<label>
    										Зубы или зона
    										<input
    											value={labTeethOrArea}
    											onChange={(event) =>
    												setLabTeethOrArea(event.target.value)
    											}
    											placeholder={inferredTreatmentArea || "FDI / сегмент"}
    										/>
    									</label>
    									<label>
    										Материал
    										<input
    											value={labMaterial}
    											onChange={(event) => setLabMaterial(event.target.value)}
    										/>
    									</label>
    									<label>
    										Цвет
    										<input
    											value={labShade}
    											onChange={(event) => setLabShade(event.target.value)}
    										/>
    									</label>
    									<label>
    										Источник данных
    										<input
    											value={labSource}
    											onChange={(event) => setLabSource(event.target.value)}
    											placeholder="скан / слепок / фото"
    										/>
    									</label>
    									<label>
    										Срок
    										<input
    											value={labDeadline}
    											onChange={(event) => setLabDeadline(event.target.value)}
    										/>
    									</label>
    									<label>
    										Комментарий технику
    										<textarea
    											value={labTechnicianNotes}
    											onChange={(event) =>
    												setLabTechnicianNotes(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

