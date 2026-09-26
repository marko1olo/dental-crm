import React from "react";
import { Edit3 } from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";

export interface LabWorkOrderFormProps {
	renderClinicalToothRowsEditor?: (() => React.ReactNode) | undefined;
	inferredTreatmentArea?: string | undefined;
}

export const LabWorkOrderForm: React.FC<LabWorkOrderFormProps> = React.memo(
	function LabWorkOrderForm(props) {
		const { renderClinicalToothRowsEditor, inferredTreatmentArea } = props;

		const {
			labWorkType,
			setLabWorkType,
			labTeethOrArea,
			setLabTeethOrArea,
			labMaterial,
			setLabMaterial,
			labShade,
			setLabShade,
			labSource,
			setLabSource,
			labDeadline,
			setLabDeadline,
			labTechnicianNotes,
			setLabTechnicianNotes,
		} = useDocumentStore();

		return (
			<article className="document-payload-card">
				<div>
					<h3>Заявка в лабораторию</h3>
					<p>Работа, зона, материал, цвет, источник данных и срок.</p>
				</div>
				<details className="document-manual-override">
					<summary
						style={{
							cursor: "pointer",
							fontWeight: 600,
							color: "var(--brand-700)",
							userSelect: "none",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Edit3 size={13} aria-hidden="true" />
							Ручная корректировка полей (развернуть)
						</span>
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
						{typeof renderClinicalToothRowsEditor === "function"
							? renderClinicalToothRowsEditor()
							: null}
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
								onChange={(event) => setLabTeethOrArea(event.target.value)}
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
								onChange={(event) => setLabTechnicianNotes(event.target.value)}
								rows={2}
							/>
						</label>
					</div>
				</details>
			</article>
		);
	},
);
