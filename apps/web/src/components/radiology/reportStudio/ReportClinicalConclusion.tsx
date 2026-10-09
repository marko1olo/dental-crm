/**
 * DENTE CRM — Radiology Report Clinical Conclusion Block (Layer 2)
 * Standards: Macro templates & doctor findings editor.
 */

import React from "react";
import { FileText } from "lucide-react";

export interface ReportClinicalConclusionProps {
	conclusionText: string;
	onChangeConclusionText: (text: string) => void;
}

export const ReportClinicalConclusion: React.FC<ReportClinicalConclusionProps> = ({
	conclusionText,
	onChangeConclusionText,
}) => {
	return (
		<section className="radiology-conclusion-card">
			<div className="radiology-conclusion-header">
				<div className="radiology-conclusion-title">
					<FileText className="w-3.5 h-3.5" />
					<span>Клиническое заключение / Описание снимка</span>
				</div>

				<div className="radiology-macros-pills">
					<button
						type="button"
						onClick={() =>
							onChangeConclusionText(
								"Зуб 16: Корневые каналы обтурированы до физиологического апекса, деструкции костной ткани не выявлено. Периодонтальная щель равномерная.",
							)
						}
						className="radiology-macro-pill"
						title="Вставить шаблон: Эндодонтия в норме"
					>
						Каналы до апекса
					</button>
					<button
						type="button"
						onClick={() =>
							onChangeConclusionText(
								"Периапикальных изменений не выявлено. Кортикальная пластинка альвеолы сохранена на всем протяжении.",
							)
						}
						className="radiology-macro-pill"
						title="Вставить шаблон: Без патологии"
					>
						Норма (без деструкции)
					</button>
					<button
						type="button"
						onClick={() =>
							onChangeConclusionText(
								"Выявлен дефект твердых тканей коронковой части в пределах средних слоев дентина. Периапикальные ткани без патологических изменений.",
							)
						}
						className="radiology-macro-pill"
						title="Вставить шаблон: Кариозный дефект"
					>
						Кариозная полость
					</button>
				</div>
			</div>

			<textarea
				value={conclusionText}
				onChange={(e) => onChangeConclusionText(e.target.value)}
				className="radiology-conclusion-textarea"
				placeholder="Введите рентгенологическое описание и заключение врача..."
				rows={2}
			/>
		</section>
	);
};
