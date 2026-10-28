import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";

export interface LabWorkOrderFieldsProps {
	renderClinicalToothRowsEditor?: (() => React.ReactNode) | undefined;
	inferredTreatmentArea?: string | undefined;
}

export const LabWorkOrderFields: React.FC<LabWorkOrderFieldsProps> = ({
	renderClinicalToothRowsEditor,
	inferredTreatmentArea,
}) => {
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
		<div className="document-payload-collapsed-content flex flex-col gap-3.5 mt-4">
			{typeof renderClinicalToothRowsEditor === "function" ? renderClinicalToothRowsEditor() : null}
			<label>
				Вид работы
				<input
					value={labWorkType}
					onChange={(e) => setLabWorkType(e.target.value)}
					placeholder="коронка / вкладка / каппа"
				/>
			</label>
			<label>
				Зубы или зона
				<input
					value={labTeethOrArea}
					onChange={(e) => setLabTeethOrArea(e.target.value)}
					placeholder={inferredTreatmentArea || "FDI / сегмент"}
				/>
			</label>
			<label>
				Материал
				<input value={labMaterial} onChange={(e) => setLabMaterial(e.target.value)} />
			</label>
			<label>
				Цвет
				<input value={labShade} onChange={(e) => setLabShade(e.target.value)} />
			</label>
			<label>
				Источник данных
				<input
					value={labSource}
					onChange={(e) => setLabSource(e.target.value)}
					placeholder="скан / слепок / фото"
				/>
			</label>
			<label>
				Срок
				<input value={labDeadline} onChange={(e) => setLabDeadline(e.target.value)} />
			</label>
			<label>
				Комментарий технику
				<textarea
					value={labTechnicianNotes}
					onChange={(e) => setLabTechnicianNotes(e.target.value)}
					rows={2}
				/>
			</label>
		</div>
	);
};
