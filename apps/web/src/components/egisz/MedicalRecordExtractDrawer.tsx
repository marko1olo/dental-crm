import React, { useState } from "react";
import { Download, FileText, Printer, ShieldCheck } from "lucide-react";
import type { MedicalRecordExtractPayload } from "./egiszRemdPrintTemplates";

export interface MedicalRecordExtractDrawerProps {
	readonly patientName: string;
	readonly doctorName?: string;
	readonly clinicName?: string;
	readonly onPrintExtract?: (payload: MedicalRecordExtractPayload) => void;
	readonly onDownloadPdf?: (payload: MedicalRecordExtractPayload) => void;
}

export const MedicalRecordExtractDrawer: React.FC<MedicalRecordExtractDrawerProps> = ({
	patientName,
	doctorName = "Иванов И.И.",
	clinicName = "ООО «ДЕНТЕ КЛИНИК»",
	onPrintExtract,
	onDownloadPdf,
}) => {
	const [extractType, setExtractType] = useState<"sanitation" | "sanatorium" | "clinical_extract">("sanitation");
	const [conclusion, setConclusion] = useState<string>(
		"Полость рта санирована. Очагов хронической одонтогенной инфекции не выявлено. Противопоказаний к санаторно-курортному лечению нет.",
	);

	const extractOptions = [
		{ id: "sanitation", title: "Справка о санации", desc: "Для работы, бассейна, школы и плановой госпитализации" },
		{ id: "sanatorium", title: "Санаторно-курортная карта", desc: "Форма 072/у: стоматологический раздел и допуск" },
		{ id: "clinical_extract", title: "Выписка из карты 043/у", desc: "Полная выписка диагнозов и оказанных услуг" },
	] as const;

	const handleExtractTypeChange = (type: "sanitation" | "sanatorium" | "clinical_extract") => {
		setExtractType(type);
		if (type === "sanitation") {
			setConclusion("Полость рта санирована. Зубные ряды интактны, дефектов пломб нет. В лечении не нуждается.");
		} else if (type === "sanatorium") {
			setConclusion("Полость рта санирована. Очагов хронической одонтогенной инфекции не выявлено. Санаторно-курортное лечение показано.");
		} else {
			setConclusion("Клинический диагноз: К02.1 Кариес дентина (пролечен). Рекомендован плановый осмотр через 6 месяцев.");
		}
	};

	const currentPayload: MedicalRecordExtractPayload = {
		clinicName,
		patientFullName: patientName,
		extractType,
		doctorFullName: doctorName,
		conclusionText: conclusion,
	};

	return (
		<div className="egisz-extract-drawer" data-testid="medical-extract-drawer">
			<div className="egisz-extract-header">
				<h3 className="egisz-extract-title">Выписки и медицинские справки</h3>
				<p className="egisz-extract-sub">Формирование официальных справок в 1 клик на основе медкарты</p>
			</div>

			{/* Выбор типа выписки */}
			<div className="egisz-extract-types">
				{extractOptions.map((opt) => (
					<button
						key={opt.id}
						type="button"
						className={`egisz-extract-opt ${extractType === opt.id ? "active" : ""}`}
						onClick={() => handleExtractTypeChange(opt.id)}
					>
						<div className="font-semibold text-xs">{opt.title}</div>
						<div className="text-xs text-muted mt-0.5">{opt.desc}</div>
					</button>
				))}
			</div>

			{/* Заключение врача */}
			<div className="egisz-extract-field">
				<label className="egisz-extract-label">Клиническое заключение</label>
				<textarea
					rows={3}
					className="egisz-extract-textarea"
					value={conclusion}
					onChange={(e) => setConclusion(e.target.value)}
					placeholder="Введите заключение..."
				/>
			</div>

			{/* Блок врача и реквизитов */}
			<div className="egisz-extract-doctor-box">
				<ShieldCheck size={18} className="text-teal" />
				<div>
					<div className="text-xs font-bold">{doctorName}</div>
					<div className="text-xs text-muted">{clinicName} • Без криптографических блокировок</div>
				</div>
			</div>

			{/* Зона большого пальца (CTA кнопки) */}
			<div className="egisz-extract-cta-row">
				<button
					type="button"
					onClick={() => onPrintExtract?.(currentPayload)}
					className="egisz-btn egisz-btn-primary full-width"
					data-testid="print-extract-btn"
				>
					<Printer size={18} /> Распечатать официальный бланк
				</button>
				{onDownloadPdf && (
					<button
						type="button"
						onClick={() => onDownloadPdf?.(currentPayload)}
						className="egisz-btn sm secondary full-width"
					>
						<Download size={15} /> Сформировать и отправить в PDF
					</button>
				)}
			</div>
		</div>
	);
};
