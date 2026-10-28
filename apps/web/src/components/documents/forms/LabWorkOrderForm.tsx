import React from "react";
import { Edit3 } from "lucide-react";
import { LabWorkOrderFields, type LabWorkOrderFieldsProps } from "./labWorkOrder/LabWorkOrderFields";

export type LabWorkOrderFormProps = LabWorkOrderFieldsProps;

export const LabWorkOrderForm: React.FC<LabWorkOrderFormProps> = React.memo(
	function LabWorkOrderForm(props) {
		const { renderClinicalToothRowsEditor, inferredTreatmentArea } = props;

		return (
			<article className="document-payload-card">
				<div>
					<h3>Заявка в лабораторию</h3>
					<p>Работа, зона, материал, цвет, источник данных и срок.</p>
				</div>
				<details className="document-manual-override">
					<summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--brand-700)", userSelect: "none" }}>
						<span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
							<Edit3 size={13} aria-hidden="true" />
							Ручная корректировка полей (развернуть)
						</span>
					</summary>
					<LabWorkOrderFields
						renderClinicalToothRowsEditor={renderClinicalToothRowsEditor}
						inferredTreatmentArea={inferredTreatmentArea}
					/>
				</details>
			</article>
		);
	},
);
