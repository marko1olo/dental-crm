import React from "react";
import type {
	AiJobKind,
	AiRecognitionJob,
	AiRecognitionTarget,
} from "@dental/shared";
import { CheckCircle2, Cpu, ShieldAlert, Sparkles, UploadCloud } from "lucide-react";
import type { RecognitionPreset } from "../../../settingsStaticData";
import { aiRecognitionWarningText } from "../SettingsViewHelpers";

export interface AiRecognitionWorkbenchProps {
	presets: RecognitionPreset[];
	recognitionKind: AiJobKind;
	recognitionTarget: AiRecognitionTarget;
	onChoosePreset: (preset: RecognitionPreset) => void;
	recognitionText: string;
	onTextChange: (t: string) => void;
	onClearJob: () => void;
	recognitionTargetLabels: Record<AiRecognitionTarget, string>;
	onRunJob: () => void | Promise<void>;
	isLoading: boolean;
	inputReady: boolean;
	recognitionJob: AiRecognitionJob | null;
	onSendToImport: () => void;
}

export const AiRecognitionWorkbench: React.FC<AiRecognitionWorkbenchProps> = ({
	presets,
	recognitionKind,
	recognitionTarget,
	onChoosePreset,
	recognitionText,
	onTextChange,
	onClearJob,
	recognitionTargetLabels,
	onRunJob,
	isLoading,
	inputReady,
	recognitionJob,
	onSendToImport,
}) => {
	return (
		<section className="ai-section-card">
			<div className="ai-section-header">
				<div className="ai-section-icon"><Cpu size={24} /></div>
				<div className="ai-section-title">
					<h3>Лаборатория нейросетей</h3>
					<p>Тестирование структурирования текста в медицинские карты и диагнозы</p>
				</div>
			</div>
			<div role="toolbar" className="ai-target-grid" aria-label="Цель распознавания">
				{presets.map((preset) => {
					const selected = recognitionKind === preset.kind && recognitionTarget === preset.target;
					return (
						<button
							aria-pressed={selected}
							className={`ai-target-card ${selected ? "active" : ""}`}
							key={preset.key}
							tabIndex={selected ? 0 : -1}
							type="button"
							onClick={() => onChoosePreset(preset)}
						>
							<strong>{preset.title}</strong>
							<span>{preset.detail}</span>
						</button>
					);
				})}
			</div>
			<div className="ai-workbench">
				<textarea
					className="ai-workbench-textarea"
					placeholder="Вставьте сырой текст диктовки для проверки ИИ-ассистента..."
					value={recognitionText}
					onChange={(e) => {
						onTextChange(e.target.value);
						onClearJob();
					}}
				/>
				<div className="ai-workbench-action">
					<span style={{ fontSize: "13px", color: "var(--muted)" }}>
						Цель: <strong>{recognitionTargetLabels[recognitionTarget]}</strong>
					</span>
					<button className="primary-button" type="button" onClick={onRunJob} disabled={isLoading || !inputReady}>
						<Sparkles size={16} style={{ marginRight: "8px" }} />
						{isLoading ? "Генерация ответа..." : "Распознать текст"}
					</button>
				</div>
			</div>
			{recognitionJob && (
				<div className="ai-result-panel">
					<div className="ai-result-panel-head">
						<span className="ai-result-confidence">
							<CheckCircle2 size={16} /> Уверенность: {Math.round(recognitionJob.confidence * 100)}%
						</span>
						<span className="status-pill status-confirmed">{recognitionJob.suggestedNextStep}</span>
					</div>
					<p className="ai-result-text">{recognitionJob.resultText}</p>
					{recognitionJob.warnings?.length > 0 && (
						<div className="ai-result-warnings">
							{recognitionJob.warnings.map((warning) => (
								<div className="ai-result-warning-item" key={warning}>
									<ShieldAlert size={14} /> {aiRecognitionWarningText(warning)}
								</div>
							))}
						</div>
					)}
					{(recognitionJob.target === "patient_import" || recognitionJob.target === "visit_note") && (
						<button className="secondary-button" style={{ alignSelf: "flex-start", marginTop: "8px" }} type="button" onClick={onSendToImport}>
							<UploadCloud size={16} style={{ marginRight: "8px" }} /> Передать в карту
						</button>
					)}
				</div>
			)}
		</section>
	);
};
